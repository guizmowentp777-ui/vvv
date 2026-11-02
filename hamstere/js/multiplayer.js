/**
 * HAMSTER.IO - Firebase Realtime Multiplayer Engine
 * - Ultra-low latency synchronization via Firebase Realtime Database
 * - Client-side predictive interpolation (lerp) for silky-smooth 60fps movement
 * - Automatic room presence (onDisconnect)
 * - Remote attack & damage event synchronization
 */

class RemoteHamster extends Hamster {
  constructor(id, name, furColor) {
    super(id, name, false, furColor);
    this.targetX = 0;
    this.targetY = 0;
    this.targetAngle = 0;
    this.lastPacketTime = performance.now();
  }

  // Smooth client-side interpolation for remote players
  interpolate(dt, arenaRadius) {
    if (this.isDead) return;

    // Smooth position lerp
    const lerpFactor = Math.min(1, 14 * dt);
    this.x += (this.targetX - this.x) * lerpFactor;
    this.y += (this.targetY - this.y) * lerpFactor;

    // Smooth angle lerp with circular wrapping
    let diff = this.targetAngle - this.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.angle += diff * Math.min(1, 12 * dt);

    // Update back paws animation if moving
    if (this.currentSpeed > 10) {
      const cycleSpeed = (this.currentSpeed / 20) * 1.5;
      this.walkCycle = (this.walkCycle + cycleSpeed * dt) % (Math.PI * 2);
      this.wobble = Math.sin(this.walkCycle * 2) * 0.08;
    } else {
      this.walkCycle *= 0.85;
      this.wobble = 0;
    }

    this.whiskerTwitch += dt * 14;
    this.sniffTimer += dt * 4;

    if (this.isDizzy) {
      this.dizzyStarsAngle += dt * 7;
    }

    this.clampToArena(arenaRadius);
  }
}

class MultiplayerManager {
  constructor(gameEngine) {
    this.game = gameEngine;
    this.isConnected = false;
    this.remotePlayers = new Map(); // id -> RemoteHamster
    this.db = null;
    this.playerRef = null;
    this.playersRef = null;
    this.hitsRef = null;

    // Throttling for network sync (send ~25 times per second)
    this.lastBroadcast = 0;
    this.broadcastInterval = 40; // ms

    this.localId = 'player_' + Math.random().toString(36).substring(2, 9);

    this.initFirebase();
  }

  // Retrieve Firebase configuration (localStorage or firebase-config.js)
  getConfig() {
    try {
      const stored = localStorage.getItem('hamster_firebase_config');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (window.isFirebaseConfigValid(parsed)) {
          return parsed;
        }
      }
    } catch (e) {
      console.warn("Could not read stored Firebase config:", e);
    }

    if (window.isFirebaseConfigValid(window.FIREBASE_CONFIG)) {
      return window.FIREBASE_CONFIG;
    }
    return null;
  }

  // Save new Firebase configuration
  saveConfig(config) {
    try {
      localStorage.setItem('hamster_firebase_config', JSON.stringify(config));
      return true;
    } catch (e) {
      console.error("Could not save Firebase config:", e);
      return false;
    }
  }

  initFirebase() {
    if (typeof firebase === 'undefined') {
      console.warn("Firebase SDK non chargé. Le jeu tourne en mode local.");
      this.updateStatusBadge(false, 0);
      return false;
    }

    const config = this.getConfig();
    if (!config) {
      console.log("Configuration Firebase absente. Mode local avec bots.");
      this.updateStatusBadge(false, 0);
      return false;
    }

    try {
      // 1. Initialiser l'application Firebase si pas encore fait
      if (!firebase.apps || !firebase.apps.length) {
        firebase.initializeApp(config);
      }

      // 2. Obtenir l'instance Realtime Database en toute sécurité
      try {
        this.db = firebase.database();
      } catch (dbErr) {
        if (config.databaseURL && firebase.app) {
          this.db = firebase.app().database(config.databaseURL);
        } else {
          throw dbErr;
        }
      }

      // 3. Suivi de la connexion WebSocket en direct
      this.db.ref('.info/connected').on('value', (snap) => {
        const isOnline = snap.val() === true;
        this.isConnected = isOnline;
        this.updateStatusBadge(isOnline, this.remotePlayers.size + 1);
        if (isOnline) {
          console.log("🟢 WebSocket Firebase connecté !");
          const feedback = document.getElementById('fb-status-feedback');
          if (feedback) {
            feedback.innerHTML = '<span style="color:#2ecc71;">🟢 Connecté en temps réel au serveur Firebase !</span>';
          }
          if (this.localPlayer || this.pendingJoin) {
            this.joinRoom(this.localPlayer || (this.game && this.game.player));
          }
        } else {
          console.log("🟡 En attente de connexion Firebase...");
        }
      });

      this.playersRef = this.db.ref('rooms/arena_1/players');
      this.hitsRef = this.db.ref('rooms/arena_1/hits');

      // Écouter les erreurs de permission si la base n'est pas encore en mode test
      this.playersRef.on('value', () => {}, (error) => {
        if (error) {
          console.warn("Notice Firebase Realtime Database:", error);
          const feedback = document.getElementById('fb-status-feedback');
          if (feedback) {
            feedback.innerHTML = `<span style="color:#ff6b81;">⚠️ Pensez à activer la Realtime Database dans la console Firebase (Règles: .read: true, .write: true)</span>`;
          }
        }
      });

      this.isConnected = true;
      this.setupListeners();
      this.updateStatusBadge(true, 1);
      console.log("🔥 Connecté avec succès à Firebase Realtime Database !");
      return true;
    } catch (err) {
      console.warn("Erreur d'initialisation Firebase (le jeu continue normalement avec les bots) :", err);
      this.isConnected = false;
      this.updateStatusBadge(false, 0);
      return false;
    }
  }

  // Setup listeners for other players joining, moving, attacking, leaving
  setupListeners() {
    if (!this.playersRef) return;

    // 1. Remote player joined
    this.playersRef.on('child_added', (snapshot) => {
      const pid = snapshot.key;
      if (pid === this.localId) return;

      const data = snapshot.val();
      if (!data) return;

      const remote = new RemoteHamster(pid, data.name || 'Adversaire', data.furColor || '#d49b5b');
      remote.x = data.x || 0;
      remote.y = data.y || 0;
      remote.targetX = remote.x;
      remote.targetY = remote.y;
      remote.angle = data.angle || 0;
      remote.targetAngle = remote.angle;
      remote.hp = data.hp || 100;
      remote.score = data.score || 0;
      remote.kos = data.kos || 0;

      this.remotePlayers.set(pid, remote);
      this.updateStatusBadge(true, this.remotePlayers.size + 1);

      if (window.particleSystem) {
        window.particleSystem.spawnFloatingText(remote.x, remote.y - 25, `${remote.name} a rejoint !`, '#55efc4', 16);
      }
    });

    // 2. Remote player moved / updated
    this.playersRef.on('child_changed', (snapshot) => {
      const pid = snapshot.key;
      if (pid === this.localId) return;

      const data = snapshot.val();
      const remote = this.remotePlayers.get(pid);
      if (!remote || !data) return;

      // Set target for smooth interpolation
      remote.targetX = data.x;
      remote.targetY = data.y;
      remote.targetAngle = data.angle;
      remote.currentSpeed = data.currentSpeed || 0;
      remote.isSprinting = data.isSprinting || false;
      remote.hp = data.hp;
      remote.score = data.score;
      remote.kos = data.kos;
      remote.isDizzy = data.isDizzy || false;

      // Remote attack sync
      if (data.isAttacking && !remote.isAttacking) {
        remote.triggerAttack();
      }
      if (data.attackProgress !== undefined) {
        remote.attackProgress = data.attackProgress;
      }
      remote.lastPacketTime = Date.now();
    });

    // 3. Remote player disconnected / left
    this.playersRef.on('child_removed', (snapshot) => {
      const pid = snapshot.key;
      const remote = this.remotePlayers.get(pid);
      if (remote) {
        if (window.particleSystem) {
          window.particleSystem.spawnPawDust(remote.x, remote.y, 0, 80);
          window.particleSystem.spawnFloatingText(remote.x, remote.y - 25, `${remote.name} est parti`, '#a4b0be', 14);
        }
        this.remotePlayers.delete(pid);
        this.updateStatusBadge(this.isConnected, this.remotePlayers.size + 1);
      }
    });

    // Auto-nettoyage des fantômes (joueurs inactifs depuis +8 secondes)
    if (!this.cleanupTimer) {
      this.cleanupTimer = setInterval(() => {
        const now = Date.now();
        let changed = false;
        for (const [pid, remote] of this.remotePlayers.entries()) {
          if (remote.lastPacketTime && (now - remote.lastPacketTime > 8000)) {
            this.remotePlayers.delete(pid);
            changed = true;
          }
        }
        if (changed) {
          this.updateStatusBadge(this.isConnected, this.remotePlayers.size + 1);
        }
      }, 3000);
    }

    // 4. Hit detection sync
    if (this.hitsRef) {
      this.hitsRef.on('child_added', (snapshot) => {
        const hit = snapshot.val();
        if (!hit) return;

        // If I was hit by someone
        if (hit.victimId === this.localId && this.game.player && !this.game.player.isDead) {
          this.game.player.takeHit(hit.damage || 35, hit.fromX, hit.fromY, { name: hit.attackerName });
          // Remove hit record
          snapshot.ref.remove().catch(() => {});
        }
      });
    }
  }

  // Register local player in Firebase room
  joinRoom(player) {
    if (!player) return;
    this.localPlayer = player;

    if (!this.db) {
      console.log("Firebase DB en cours d'initialisation, inscription différée...");
      this.pendingJoin = true;
      return;
    }

    try {
      this.playerRef = this.db.ref(`rooms/arena_1/players/${this.localId}`);

      const initialData = {
        id: this.localId,
        name: player.name || 'Robo-Guerrier',
        furColor: player.furColor || '#d49b5b',
        x: Math.round(player.x),
        y: Math.round(player.y),
        angle: Number(player.angle.toFixed(2)),
        currentSpeed: Math.round(player.currentSpeed),
        isSprinting: !!player.isSprinting,
        isAttacking: !!player.isAttacking,
        attackProgress: 0,
        isDizzy: !!player.isDizzy,
        hp: player.hp,
        score: player.score,
        kos: player.kos,
        lastSeen: Date.now()
      };

      this.playerRef.set(initialData).then(() => {
        console.log("🐹 Joueur enregistré dans Firebase Realtime Database !");
      }).catch((err) => {
        console.warn("Écriture Firebase:", err);
        if (err && err.message && (err.message.includes('permission') || err.message.includes('Permission'))) {
          const feedback = document.getElementById('fb-status-feedback');
          if (feedback) {
            feedback.innerHTML = '<span style="color:#ff4757;">⚠️ Accès refusé : Règles Firebase à passer en .read: true, .write: true !</span>';
          }
          if (window.particleSystem) {
            window.particleSystem.spawnFloatingText(player.x, player.y - 30, 'RÈGLES FIREBASE BLOQUÉES !', '#ff4757', 18);
          }
        }
      });

      this.playerRef.onDisconnect().remove();
      this.pendingJoin = false;
    } catch (e) {
      console.warn("Notice joinRoom:", e);
    }
  }

  // Broadcast local player state to Firebase (throttled ~25/sec)
  broadcastPlayerState(player) {
    if (!this.playerRef || !player || player.isDead) return;

    const now = performance.now();
    if (now - this.lastBroadcast < this.broadcastInterval) return;
    this.lastBroadcast = now;

    try {
      this.playerRef.update({
        x: Math.round(player.x),
        y: Math.round(player.y),
        angle: Number(player.angle.toFixed(2)),
        currentSpeed: Math.round(player.currentSpeed),
        isSprinting: !!player.isSprinting,
        isAttacking: !!player.isAttacking,
        attackProgress: Number(player.attackProgress.toFixed(2)),
        isDizzy: !!player.isDizzy,
        hp: Math.round(player.hp),
        score: player.score,
        kos: player.kos,
        lastSeen: Date.now()
      }).catch(() => {});
    } catch (e) {}
  }

  // Broadcast a slap hit on an online opponent
  broadcastHit(victimId, attacker) {
    if (!this.isConnected || !this.hitsRef) return;

    try {
      this.hitsRef.push({
        attackerId: this.localId,
        attackerName: attacker.name,
        victimId: victimId,
        damage: 35,
        fromX: attacker.x,
        fromY: attacker.y,
        timestamp: Date.now()
      }).catch(() => {});
    } catch (e) {}
  }
  // Leave room cleanly
  leaveRoom() {
    if (this.playerRef) {
      this.playerRef.remove().catch(() => {});
      this.playerRef = null;
    }
  }

  // Update online badge in UI
  updateStatusBadge(isOnline, playerCount = 1) {
    const statusDot = document.getElementById('online-status-dot');
    const statusText = document.getElementById('online-status-text');
    const startBadge = document.getElementById('start-online-badge');

    if (statusDot) {
      statusDot.className = `status-dot ${isOnline ? 'online' : 'offline'}`;
    }
    if (statusText) {
      statusText.textContent = isOnline ? `En Ligne (${playerCount} 🐹)` : 'Local / Bots';
    }
    if (startBadge) {
      startBadge.innerHTML = isOnline 
        ? `<span class="status-dot online"></span> <strong>Multijoueur En Ligne Actif</strong> (${playerCount} joueur${playerCount > 1 ? 's' : ''})`
        : `<span class="status-dot offline"></span> Mode Hors-Ligne (Cliquez pour configurer Firebase)`;
    }
  }

  // Interpolate and render all remote players
  update(dt, arenaRadius) {
    for (const remote of this.remotePlayers.values()) {
      remote.interpolate(dt, arenaRadius);
    }
  }

  draw(ctx) {
    for (const remote of this.remotePlayers.values()) {
      remote.draw(ctx);
    }
  }

  getPlayersList() {
    return Array.from(this.remotePlayers.values());
  }
}

