/**
 * HAMSTER.IO - Main Game Loop & Slither.io World Engine
 * - Slither.io Hexagonal Map & Glowing Arena Boundary
 * - Camera Follow with Smooth Lerp & Dynamic Zoom
 * - Combat & Slap Collision Detection
 * - Real-time Leaderboard & Minimap
 * - Mobile Landscape UI Management
 */

class GameEngine {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');

    this.minimapCanvas = document.getElementById('minimap-canvas');
    this.minimapCtx = this.minimapCanvas.getContext('2d');

    this.previewCanvas = document.getElementById('preview-canvas');
    this.previewCtx = this.previewCanvas ? this.previewCanvas.getContext('2d') : null;

    // Arena Constants (Slither.io circular arena)
    this.arenaRadius = 2400;
    this.gridSize = 75; // Hexagon cell size

    // Game Objects
    this.player = null;
    this.foodManager = new FoodManager(this.arenaRadius, 300); // 300 graines pour fluidité max sur mobile
    this.botManager = new BotManager(2, this.arenaRadius); // Seulement 2 bots d'entraînement
    this.inputController = new InputController();

    // Initialiser le multijoueur Firebase en toute sécurité
    try {
      this.multiplayer = new MultiplayerManager(this);
    } catch (err) {
      console.warn("Multijoueur initialisé en mode secours (local avec bots):", err);
      this.multiplayer = {
        isConnected: false,
        remotePlayers: new Map(),
        getPlayersList: () => [],
        update: () => {},
        draw: () => {},
        joinRoom: () => {},
        leaveRoom: () => {},
        broadcastPlayerState: () => {},
        broadcastHit: () => {},
        getConfig: () => null,
        saveConfig: () => false,
        initFirebase: () => false
      };
    }

    // Camera - Vue ultra-large de la map Slither.io (0.40 au lieu de 0.58)
    this.camera = {
      x: 0,
      y: 0,
      zoom: 0.40,
      targetZoom: 0.40
    };

    // State
    this.isRunning = false;
    this.lastTime = 0;
    this.totalKills = 0;

    // Cache pre-rendered hexagon pattern
    this.hexPattern = null;

    this.init();
  }

  init() {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.createHexagonPattern();
    this.bindUI();

    // Start preview animation in start modal
    this.startPreviewLoop();

    // Begin main animation frame
    requestAnimationFrame((t) => this.gameLoop(t));
  }

  resizeCanvas() {
    // Brider DPR à 1.5 max pour 60-120 FPS ultra-fluide sur smartphone
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    this.canvas.width = Math.round(window.innerWidth * dpr);
    this.canvas.height = Math.round(window.innerHeight * dpr);
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
  }

  // Pre-render a seamless Slither.io hexagonal pattern
  createHexagonPattern() {
    const s = 60;
    const w = s * 2;
    const h = Math.sqrt(3) * s;

    const patternCanvas = document.createElement('canvas');
    patternCanvas.width = w * 1.5;
    patternCanvas.height = h;
    const pCtx = patternCanvas.getContext('2d');

    pCtx.strokeStyle = 'rgba(35, 55, 95, 0.45)';
    pCtx.lineWidth = 1.5;

    // Helper to draw single hexagon
    const drawHex = (cx, cy) => {
      pCtx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3;
        const x = cx + s * Math.cos(a);
        const y = cy + s * Math.sin(a);
        if (i === 0) pCtx.moveTo(x, y);
        else pCtx.lineTo(x, y);
      }
      pCtx.closePath();
      pCtx.stroke();
    };

    drawHex(s, h / 2);
    drawHex(w * 1.5 - s / 2, 0);
    drawHex(w * 1.5 - s / 2, h);

    this.hexPattern = this.ctx.createPattern(patternCanvas, 'repeat');
  }

  bindUI() {
    // Play button
    const btnPlay = document.getElementById('btn-play');
    if (btnPlay) {
      const handlePlay = (e) => {
        if (e) {
          e.preventDefault();
        }
        this.startGame();
      };
      btnPlay.addEventListener('click', handlePlay);
      btnPlay.addEventListener('touchend', handlePlay);
    }

    // Respawn button
    const btnRespawn = document.getElementById('btn-respawn');
    if (btnRespawn) {
      const handleRespawn = (e) => {
        if (e) {
          e.preventDefault();
        }
        this.respawnPlayer();
      };
      btnRespawn.addEventListener('click', handleRespawn);
      btnRespawn.addEventListener('touchend', handleRespawn);
    }

    // Sound toggle
    const btnSound = document.getElementById('btn-sound');
    if (btnSound) {
      btnSound.addEventListener('click', () => {
        window.soundSystem.init();
        const enabled = window.soundSystem.toggle();
        btnSound.textContent = enabled ? '🔊' : '🔇';
      });
    }

    // Fullscreen toggle
    const btnFullscreen = document.getElementById('btn-fullscreen');
    if (btnFullscreen) {
      btnFullscreen.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        } else {
          document.exitFullscreen().catch(() => {});
        }
      });
    }

    // Help toggle
    const btnHelp = document.getElementById('btn-help');
    if (btnHelp) {
      btnHelp.addEventListener('click', () => {
        const modal = document.getElementById('start-modal');
        if (modal) {
          modal.classList.toggle('hidden');
          if (modal.classList.contains('hidden')) {
            modal.style.display = 'none';
          } else {
            modal.style.display = 'flex';
          }
        }
      });
    }

    // Dismiss portrait warning button
    const btnDismissPortrait = document.getElementById('btn-dismiss-portrait');
    if (btnDismissPortrait) {
      btnDismissPortrait.addEventListener('click', () => {
        const pw = document.getElementById('portrait-warning');
        if (pw) pw.style.display = 'none';
      });
    }

    // Firebase Modal Handlers
    const fbModal = document.getElementById('firebase-modal');
    const btnOpenFb = document.getElementById('btn-open-firebase');
    const btnOnlineHud = document.getElementById('btn-online-hud');
    const btnCloseFb = document.getElementById('btn-close-fb');
    const btnSaveFb = document.getElementById('btn-save-fb');
    const fbInput = document.getElementById('fb-config-input');
    const fbFeedback = document.getElementById('fb-status-feedback');

    const openFirebaseModal = () => {
      if (!fbModal) return;
      fbModal.classList.remove('hidden');
      const currentCfg = this.multiplayer.getConfig();
      if (currentCfg && fbInput) {
        fbInput.value = JSON.stringify(currentCfg, null, 2);
      }
      if (fbFeedback) {
        fbFeedback.innerHTML = this.multiplayer.isConnected
          ? '<span style="color:#2ecc71;">🟢 Actuellement connecté à Firebase !</span>'
          : '<span style="color:#f39c12;">🟡 Non connecté (Mode bots)</span>';
      }
    };

    if (btnOpenFb) btnOpenFb.addEventListener('click', openFirebaseModal);
    if (btnOnlineHud) btnOnlineHud.addEventListener('click', openFirebaseModal);
    if (btnCloseFb && fbModal) {
      btnCloseFb.addEventListener('click', () => fbModal.classList.add('hidden'));
    }

    if (btnSaveFb && fbInput) {
      btnSaveFb.addEventListener('click', () => {
        const raw = fbInput.value.trim();
        let cfg = null;

        try {
          // If JSON
          if (raw.startsWith('{')) {
            cfg = JSON.parse(raw);
          } else {
            // Extract fields with regex from JS object string
            const dbUrlMatch = raw.match(/databaseURL\s*:\s*["']([^"']+)["']/);
            const apiKeyMatch = raw.match(/apiKey\s*:\s*["']([^"']+)["']/);
            const projIdMatch = raw.match(/projectId\s*:\s*["']([^"']+)["']/);

            if (dbUrlMatch) {
              cfg = {
                databaseURL: dbUrlMatch[1],
                apiKey: apiKeyMatch ? apiKeyMatch[1] : "",
                projectId: projIdMatch ? projIdMatch[1] : ""
              };
            }
          }
        } catch (e) {
          if (fbFeedback) fbFeedback.innerHTML = '<span style="color:#ff4757;">❌ Erreur: Format JSON invalide</span>';
          return;
        }

        if (cfg && window.isFirebaseConfigValid(cfg)) {
          this.multiplayer.saveConfig(cfg);
          const ok = this.multiplayer.initFirebase();
          if (ok) {
            if (fbFeedback) fbFeedback.innerHTML = '<span style="color:#2ecc71;">✅ Connecté avec succès !</span>';
            setTimeout(() => {
              if (fbModal) fbModal.classList.add('hidden');
            }, 1000);
            if (this.player && this.isRunning) {
              this.multiplayer.joinRoom(this.player);
            }
          } else {
            if (fbFeedback) fbFeedback.innerHTML = '<span style="color:#ff4757;">❌ Échec d\'initialisation Firebase</span>';
          }
        } else {
          if (fbFeedback) fbFeedback.innerHTML = '<span style="color:#ff4757;">❌ databaseURL manquante ou invalide</span>';
        }
      });
    }

    // Color selectors
    const colorOpts = document.querySelectorAll('.color-opt');
    colorOpts.forEach(btn => {
      btn.addEventListener('click', () => {
        colorOpts.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (this.previewHamster) {
          this.previewHamster.furColor = btn.dataset.color;
        }
      });
    });

    // Nickname & Color memory + Touche Entrée pour lancer directement
    const nickInput = document.getElementById('input-nickname');
    try {
      const savedNick = localStorage.getItem('hamster_nickname');
      if (savedNick && nickInput) nickInput.value = savedNick;
      const savedColor = localStorage.getItem('hamster_fur_color');
      if (savedColor) {
        colorOpts.forEach(btn => {
          if (btn.dataset.color === savedColor) {
            colorOpts.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (this.previewHamster) this.previewHamster.furColor = savedColor;
          }
        });
      }
    } catch (e) {}

    if (nickInput) {
      nickInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.startGame();
        }
      });
    }

    // Audio init on first user interaction
    const unlockAudio = () => {
      window.soundSystem.init();
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('mousedown', unlockAudio);
    };
    window.addEventListener('touchstart', unlockAudio, { passive: true });
    window.addEventListener('mousedown', unlockAudio, { passive: true });
  }

  // Preview Hamster Loop on Start Screen
  startPreviewLoop() {
    this.previewHamster = new Hamster('preview', 'Hammy', true, '#d49b5b');
    this.previewHamster.x = 90;
    this.previewHamster.y = 90;
    this.previewHamster.baseRadius = 34;
    this.previewHamster.radius = 34;

    let previewTime = 0;
    const animatePreview = (t) => {
      if (!this.isRunning && this.previewCtx) {
        const dt = 0.016;
        previewTime += dt;

        this.previewCtx.clearRect(0, 0, 180, 180);

        // Gentle turning and running paws animation
        this.previewHamster.walkCycle = (previewTime * 8) % (Math.PI * 2);
        this.previewHamster.currentSpeed = 150;
        this.previewHamster.whiskerTwitch += dt * 10;
        this.previewHamster.sniffTimer += dt * 5;

        // Occasional funny slap in preview!
        if (Math.sin(previewTime * 2) > 0.88 && !this.previewHamster.isAttacking) {
          this.previewHamster.triggerAttack();
        }
        if (this.previewHamster.isAttacking) {
          this.previewHamster.attackProgress += dt / this.previewHamster.attackDuration;
          if (this.previewHamster.attackProgress >= 1) {
            this.previewHamster.isAttacking = false;
            this.previewHamster.attackProgress = 0;
          }
        }

        this.previewHamster.draw(this.previewCtx);
      }
      requestAnimationFrame(animatePreview);
    };
    requestAnimationFrame(animatePreview);
  }

  startGame() {
    window.soundSystem.init();

    const nickInput = document.getElementById('input-nickname');
    const nickname = (nickInput && nickInput.value.trim()) || 'Robo-Champion';

    const activeColorBtn = document.querySelector('.color-opt.active');
    const color = activeColorBtn ? activeColorBtn.dataset.color : '#d49b5b';

    try {
      localStorage.setItem('hamster_nickname', nickname);
      localStorage.setItem('hamster_fur_color', color);
    } catch (e) {}

    // Hide Start Modal
    const modal = document.getElementById('start-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.setProperty('display', 'none', 'important');
    }

    if (this.player && this.isRunning) {
      this.player.name = nickname;
      this.player.furColor = color;
      document.getElementById('hud-player-name').textContent = nickname;
      return;
    }

    // Create Player Hamster
    this.player = new Hamster('player_local', nickname, true, color);
    this.player.x = 0;
    this.player.y = 0;

    // Reset Food & Bots
    this.foodManager.init();
    this.botManager.init();

    this.isRunning = true;
    this.totalKills = 0;

    // Join Firebase Online Room
    try {
      this.multiplayer.joinRoom(this.player);
    } catch (e) {
      console.warn("Could not join Firebase room:", e);
    }

    document.getElementById('hud-player-name').textContent = nickname;
    this.updateHUD();
  }

  respawnPlayer() {
    const modal = document.getElementById('gameover-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.style.setProperty('display', 'none', 'important');
    }

    const activeColorBtn = document.querySelector('.color-opt.active');
    const color = activeColorBtn ? activeColorBtn.dataset.color : '#d49b5b';

    this.player = new Hamster('player_local', this.player ? this.player.name : 'Robo-Champion', true, color);
    this.player.x = (Math.random() - 0.5) * 800;
    this.player.y = (Math.random() - 0.5) * 800;

    this.isRunning = true;
    this.multiplayer.joinRoom(this.player);
    this.updateHUD();
  }

  onPlayerKO(killer) {
    this.isRunning = false;
    this.multiplayer.leaveRoom();

    // Show Game Over Modal
    const modal = document.getElementById('gameover-modal');
    if (modal) {
      modal.classList.remove('hidden');
      document.getElementById('ko-killer-text').textContent = killer
        ? `Tu as reçu une baffe légendaire de ${killer.name} !`
        : 'Tu as été assommé par une baffe mémorable !';
      document.getElementById('go-score').textContent = this.player.score;
      document.getElementById('go-kos').textContent = this.player.kos;
    }
  }

  // ========================================================
  // MAIN GAME LOOP
  // ========================================================
  gameLoop(currentTime) {
    if (!this.lastTime) this.lastTime = currentTime;
    const dt = Math.min(0.1, (currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;

    this.update(dt);
    this.render();

    requestAnimationFrame((t) => this.gameLoop(t));
  }

  // ========================================================
  // UPDATE SIMULATION (Ultra-fluide & Multiplayer Sync)
  // ========================================================
  update(dt) {
    if (!this.player) return;

    // 1. Process Player Input
    this.inputController.applyToPlayer(this.player);

    // 2. Update Local Player
    this.player.update(dt, this.arenaRadius);

    // 3. Broadcast local state to Firebase
    this.multiplayer.broadcastPlayerState(this.player);

    // 4. Update Remote Online Players (Interpolation)
    this.multiplayer.update(dt, this.arenaRadius);

    // 5. Update Bots AI (Only 2 bots)
    const remoteList = this.multiplayer.getPlayersList();
    const allHamsters = [this.player, ...remoteList, ...this.botManager.bots];
    this.botManager.update(dt, allHamsters, this.foodManager);

    // 6. Update Food Items
    this.foodManager.update(dt);

    // 7. Update Particle System
    window.particleSystem.update(dt);

    // 8. Food Collisions (Hamsters eating seeds)
    this.checkFoodCollisions(allHamsters);

    // 9. Combat Collisions (Slap Paw vs Hamster bodies)
    this.checkSlapCombatCollisions(allHamsters);

    // 10. Hamster vs Hamster Soft Push Collision
    this.checkHamsterBodyCollisions(allHamsters);

    // 11. Camera Lerp (Smoothly center on player)
    this.camera.x += (this.player.x - this.camera.x) * Math.min(1, 10 * dt);
    this.camera.y += (this.player.y - this.camera.y) * Math.min(1, 10 * dt);

    // Dynamic zoom based on sprint (Vue tactique ultra-large Slither.io : 0.40 base, 0.35 sprint)
    this.camera.targetZoom = this.player.isSprinting ? 0.35 : 0.40;
    this.camera.zoom += (this.camera.targetZoom - this.camera.zoom) * Math.min(1, 4 * dt);

    // Check if player died this frame
    if (this.player.isDead && this.isRunning) {
      this.onPlayerKO(this.player.lastKiller);
    }

    // 12. Update HUD elements
    this.updateHUD();
  }

  // Check hamsters eating seeds
  checkFoodCollisions(allHamsters) {
    for (const h of allHamsters) {
      if (h.isDead) continue;
      const reach = h.radius + 6;

      for (let i = this.foodManager.foods.length - 1; i >= 0; i--) {
        const f = this.foodManager.foods[i];
        const dist = Math.hypot(f.x - h.x, f.y - h.y);
        if (dist < reach) {
          h.eat(f);
          this.foodManager.foods.splice(i, 1);
        }
      }
    }
  }

  // Check bizarre slap attacks hitting opponent hamsters!
  checkSlapCombatCollisions(allHamsters) {
    for (const attacker of allHamsters) {
      if (attacker.isDead || !attacker.isAttacking || attacker.attackHitChecked) continue;

      const hitbox = attacker.getSlapHitbox();
      if (!hitbox) continue;

      // Check against all other hamsters
      for (const victim of allHamsters) {
        if (victim.id === attacker.id || victim.isDead) continue;

        const dist = Math.hypot(victim.x - hitbox.x, victim.y - hitbox.y);
        if (dist < hitbox.radius + victim.radius) {
          // HIT CONNECTED!
          attacker.attackHitChecked = true;

          const damage = 35; // 3 slaps = KO
          victim.takeHit(damage, attacker.x, attacker.y, attacker);

          // If local player slapped a remote player, broadcast hit to Firebase!
          if (attacker.isPlayer && this.multiplayer.remotePlayers.has(victim.id)) {
            this.multiplayer.broadcastHit(victim.id, attacker);
          }

          // Impact visual effect
          window.particleSystem.spawnSlapImpact(hitbox.x, hitbox.y);

          // Attacker gets bonus seeds / score
          attacker.score += 25;

          // If victim was killed
          if (victim.isDead) {
            attacker.kos++;
            victim.lastKiller = attacker;
            this.announceKill(attacker.name, victim.name);

            // Attacker gains big seed burst
            this.foodManager.spawnBurst(victim.x, victim.y, 16);
          }

          break; // One victim hit per slap swing
        }
      }
    }
  }

  // Prevent hamsters from clipping directly through one another
  checkHamsterBodyCollisions(allHamsters) {
    for (let i = 0; i < allHamsters.length; i++) {
      const h1 = allHamsters[i];
      if (h1.isDead) continue;

      for (let j = i + 1; j < allHamsters.length; j++) {
        const h2 = allHamsters[j];
        if (h2.isDead) continue;

        const dx = h2.x - h1.x;
        const dy = h2.y - h1.y;
        const dist = Math.hypot(dx, dy);
        const minDist = h1.radius + h2.radius;

        if (dist < minDist && dist > 0) {
          const overlap = (minDist - dist) * 0.5;
          const nx = dx / dist;
          const ny = dy / dist;

          h1.x -= nx * overlap;
          h1.y -= ny * overlap;
          h2.x += nx * overlap;
          h2.y += ny * overlap;
        }
      }
    }
  }

  // Display kill announcement in kill feed
  announceKill(killerName, victimName) {
    const feed = document.getElementById('kill-feed');
    if (!feed) return;

    const item = document.createElement('div');
    item.className = 'kill-feed-item';
    item.innerHTML = `🐾 <strong>${killerName}</strong> a baffé <strong>${victimName}</strong> !`;
    feed.appendChild(item);

    setTimeout(() => {
      if (item.parentNode) item.parentNode.removeChild(item);
    }, 4000);
  }

  // ========================================================
  // RENDER WORLD (Ultra-fluide, zéro-blur)
  // ========================================================
  render() {
    const ctx = this.ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Clear background
    ctx.fillStyle = '#0a0e17';
    ctx.fillRect(0, 0, w, h);

    if (!this.player) return;

    ctx.save();

    // 1. Center camera on player with zoom
    ctx.translate(w / 2, h / 2);
    ctx.scale(this.camera.zoom, this.camera.zoom);
    ctx.translate(-this.camera.x, -this.camera.y);

    const viewW = w / this.camera.zoom;
    const viewH = h / this.camera.zoom;
    const viewX = this.camera.x - viewW / 2;
    const viewY = this.camera.y - viewH / 2;

    // 2. Draw Slither.io Hexagonal Grid Pattern
    this.drawHexGrid(ctx, viewX, viewY, viewW, viewH);

    // 3. Draw Slither.io Glowing Arena Boundary (Fast multi-pass)
    this.drawArenaBoundary(ctx);

    // 4. Draw Sunflower Seeds & Pellets
    this.foodManager.draw(ctx, viewX, viewY, viewW, viewH);

    // 5. Draw Remote Online Players
    this.multiplayer.draw(ctx);

    // 6. Draw Bots
    for (const bot of this.botManager.bots) {
      bot.draw(ctx);
    }

    // 7. Draw Player Hamster
    this.player.draw(ctx);

    // 8. Draw Particle Effects (Slap bursts, stars, dust)
    window.particleSystem.draw(ctx);

    ctx.restore();

    // 9. Render Radar Minimap
    this.renderMinimap();
  }

  // Draw Slither.io Hexagonal Background Grid
  drawHexGrid(ctx, viewX, viewY, viewW, viewH) {
    if (!this.hexPattern) return;
    ctx.save();
    ctx.fillStyle = this.hexPattern;
    ctx.fillRect(viewX - 60, viewY - 60, viewW + 120, viewH + 120);
    ctx.restore();
  }

  // Draw Slither.io Glowing Circular Barrier - Ultra fluide sans shadowBlur
  drawArenaBoundary(ctx) {
    ctx.save();

    // Out-of-bounds dark vignetting ring
    ctx.strokeStyle = 'rgba(255, 60, 60, 0.25)';
    ctx.lineWidth = 18;
    ctx.beginPath();
    ctx.arc(0, 0, this.arenaRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Soft outer neon glow line
    ctx.strokeStyle = 'rgba(255, 71, 87, 0.35)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(0, 0, this.arenaRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Bright core neon line
    ctx.strokeStyle = '#ff6b81';
    ctx.lineWidth = 3.5;
    ctx.beginPath();
    ctx.arc(0, 0, this.arenaRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }

  // Render Slither.io Circular Radar Minimap
  renderMinimap() {
    const mCtx = this.minimapCtx;
    const w = this.minimapCanvas.width;
    const h = this.minimapCanvas.height;
    const center = w / 2;
    const scale = (center - 6) / this.arenaRadius;

    mCtx.clearRect(0, 0, w, h);

    // Minimap boundary ring
    mCtx.strokeStyle = 'rgba(0, 220, 255, 0.6)';
    mCtx.lineWidth = 2;
    mCtx.beginPath();
    mCtx.arc(center, center, center - 6, 0, Math.PI * 2);
    mCtx.stroke();

    // Draw bots on minimap (small colored dots)
    for (const bot of this.botManager.bots) {
      if (bot.isDead) continue;
      const bx = center + bot.x * scale;
      const by = center + bot.y * scale;

      mCtx.fillStyle = '#ff7675';
      mCtx.beginPath();
      mCtx.arc(bx, by, 2.5, 0, Math.PI * 2);
      mCtx.fill();
    }

    // Draw remote online players on minimap (cyan/green dots)
    for (const remote of this.multiplayer.getPlayersList()) {
      if (remote.isDead) continue;
      const rx = center + remote.x * scale;
      const ry = center + remote.y * scale;

      mCtx.fillStyle = '#00cec9';
      mCtx.beginPath();
      mCtx.arc(rx, ry, 3.2, 0, Math.PI * 2);
      mCtx.fill();
    }

    // Draw local player on minimap (white marker)
    if (this.player && !this.player.isDead) {
      const px = center + this.player.x * scale;
      const py = center + this.player.y * scale;

      mCtx.fillStyle = '#ffffff';
      mCtx.beginPath();
      mCtx.arc(px, py, 4.5, 0, Math.PI * 2);
      mCtx.fill();
    }
  }

  // Update HUD text & Leaderboard
  updateHUD() {
    if (!this.player) return;

    // HP Bar
    const hpPercent = Math.max(0, (this.player.hp / this.player.maxHp) * 100);
    const hpFill = document.getElementById('hud-health-fill');
    const hpText = document.getElementById('hud-health-text');
    if (hpFill) hpFill.style.width = `${hpPercent}%`;
    if (hpText) hpText.textContent = `${Math.round(this.player.hp)} / ${this.player.maxHp} HP`;

    // Seeds & KOs
    const seedsLabel = document.getElementById('hud-seeds');
    const kosLabel = document.getElementById('hud-kos');
    if (seedsLabel) seedsLabel.textContent = this.player.score;
    if (kosLabel) kosLabel.textContent = `${this.player.kos} KO`;

    // Slap Attack Cooldown Overlay
    const cooldownOverlay = document.getElementById('slap-cooldown');
    if (cooldownOverlay) {
      if (this.player.attackCooldown > 0) {
        cooldownOverlay.style.display = 'block';
        const pct = (this.player.attackCooldown / this.player.attackCooldownTime) * 100;
        cooldownOverlay.style.height = `${pct}%`;
      } else {
        cooldownOverlay.style.display = 'none';
      }
    }

    // Stamina ring indicator on dash button
    const staminaRing = document.getElementById('stamina-ring');
    if (staminaRing) {
      staminaRing.style.opacity = this.player.stamina < 30 ? '0.4' : '1.0';
    }

    // Leaderboard update every ~0.4s
    if (!this.lastLbUpdate || Date.now() - this.lastLbUpdate > 400) {
      this.lastLbUpdate = Date.now();
      this.updateLeaderboard();
    }
  }

  updateLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    if (!list || !this.player) return;

    // Rank local player, remote online players, and bots together
    const all = [this.player, ...this.multiplayer.getPlayersList(), ...this.botManager.bots]
      .filter(h => !h.isDead)
      .sort((a, b) => b.score - a.score)
      .slice(0, 7);

    list.innerHTML = '';
    all.forEach((h, idx) => {
      const li = document.createElement('li');
      if (h.isPlayer) li.classList.add('is-player');
      li.innerHTML = `
        <span class="lb-rank">#${idx + 1}</span>
        <span class="lb-name">${h.name}</span>
        <span class="lb-score">${h.score}</span>
      `;
      list.appendChild(li);
    });
  }
}

// Instantiate game engine safely whether DOM is loading or already ready
function initHamsterEngine() {
  if (!window.gameEngine) {
    try {
      window.gameEngine = new GameEngine();
      console.log('🐹 Hamster.io GameEngine pret !');
    } catch (e) {
      console.error('Erreur lancement GameEngine:', e);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initHamsterEngine);
} else {
  initHamsterEngine();
}