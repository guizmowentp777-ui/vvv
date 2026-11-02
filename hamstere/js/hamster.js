/**
 * HAMSTER.IO - Hamster Entity Class (Roborovski Dwarf Hamster)
 * Features:
 * - Authentic Roborovski dwarf markings (agouti coat, white eye spots, white tummy)
 * - Realistic scurrying back paws animation when advancing
 * - Comical bizarre "rubber paw slap" attack animation
 * - Hitbox, damage, stun/dizzy status, stamina sprint
 */

class Hamster {
  constructor(id, name, isPlayer = false, furColor = '#d49b5b') {
    this.id = id;
    this.name = name || 'Robo-Hammy';
    this.isPlayer = isPlayer;
    this.furColor = furColor;

    // Transform
    this.x = 0;
    this.y = 0;
    this.vx = 0;
    this.vy = 0;
    this.angle = 0;
    this.targetAngle = 0;
    this.turnSpeed = 8.5; // radians/sec

    // Base Dimensions & Growth
    this.baseRadius = 24;
    this.radius = 24;
    this.score = 0;
    this.kos = 0;

    // Movement Speeds
    this.baseSpeed = 230;
    this.sprintSpeed = 380;
    this.currentSpeed = 0;
    this.isSprinting = false;
    this.stamina = 100;
    this.maxStamina = 100;

    // Combat Stats
    this.maxHp = 100;
    this.hp = 100;
    this.isDead = false;

    // Attack State (Bizarre Elastic Paw Slap)
    this.isAttacking = false;
    this.attackProgress = 0; // 0 to 1
    this.attackDuration = 0.32; // seconds
    this.attackCooldown = 0;
    this.attackCooldownTime = 0.42;
    this.attackHitChecked = false;

    // Stun / Dizzy State
    this.isDizzy = false;
    this.dizzyTimer = 0;
    this.dizzyStarsAngle = 0;

    // Realistic Paws Animation Cycle
    this.walkCycle = 0; // 0 to 2*PI
    this.wobble = 0;
    this.whiskerTwitch = 0;
    this.sniffTimer = 0;
  }

  // Update physics and animations
  update(dt, arenaRadius) {
    if (this.isDead) return;

    // 1. Update Dizzy State
    if (this.isDizzy) {
      this.dizzyTimer -= dt;
      this.dizzyStarsAngle += dt * 7;
      if (this.dizzyTimer <= 0) {
        this.isDizzy = false;
      }
      // Damped velocity when stunned
      this.vx *= Math.pow(0.1, dt);
      this.vy *= Math.pow(0.1, dt);
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.clampToArena(arenaRadius);
      return; // Cannot move or attack while stunned
    }

    // 2. Sprint & Stamina
    let speed = this.baseSpeed;
    if (this.isSprinting && this.stamina > 5) {
      speed = this.sprintSpeed;
      this.stamina = Math.max(0, this.stamina - dt * 35);
      // Spawn dust puff particles from running back paws
      if (Math.random() < 0.35 && window.particleSystem) {
        const offsetBack = -this.radius * 0.9;
        const sideOffset = (Math.random() > 0.5 ? 1 : -1) * this.radius * 0.7;
        const dustX = this.x + Math.cos(this.angle) * offsetBack - Math.sin(this.angle) * sideOffset;
        const dustY = this.y + Math.sin(this.angle) * offsetBack + Math.cos(this.angle) * sideOffset;
        window.particleSystem.spawnPawDust(dustX, dustY, this.angle, speed);
      }
    } else {
      this.isSprinting = false;
      this.stamina = Math.min(this.maxStamina, this.stamina + dt * 20);
    }

    // 3. Smooth Rotation toward targetAngle
    let angleDiff = this.targetAngle - this.angle;
    // Normalize to [-PI, PI]
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    this.angle += angleDiff * Math.min(1, this.turnSpeed * dt);

    // 4. Movement Physics
    const targetVx = Math.cos(this.angle) * (this.currentSpeed > 0 ? speed : 0);
    const targetVy = Math.sin(this.angle) * (this.currentSpeed > 0 ? speed : 0);

    // Inertia & recoil decay
    const accel = 12;
    this.vx += (targetVx - this.vx) * Math.min(1, accel * dt);
    this.vy += (targetVy - this.vy) * Math.min(1, accel * dt);

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    this.clampToArena(arenaRadius);

    // 5. Paw Running Gait Animation (Back and front legs cycle)
    const actualVel = Math.hypot(this.vx, this.vy);
    if (actualVel > 15) {
      const cycleSpeed = (actualVel / 20) * 1.5;
      this.walkCycle = (this.walkCycle + cycleSpeed * dt) % (Math.PI * 2);
      this.wobble = Math.sin(this.walkCycle * 2) * 0.08; // Cute body waddle
    } else {
      // Idle breathing / sniffing
      this.walkCycle *= 0.85;
      this.wobble = 0;
    }

    this.whiskerTwitch += dt * 14;
    this.sniffTimer += dt * 4;

    // 6. Attack Progress & Cooldown
    if (this.attackCooldown > 0) {
      this.attackCooldown -= dt;
    }

    if (this.isAttacking) {
      this.attackProgress += dt / this.attackDuration;
      if (this.attackProgress >= 1) {
        this.isAttacking = false;
        this.attackProgress = 0;
        this.attackHitChecked = false;
      }
    }

    // Dynamic scale based on score (grows slightly like slither.io)
    const targetRadius = this.baseRadius + Math.min(18, Math.sqrt(this.score) * 0.8);
    this.radius += (targetRadius - this.radius) * dt * 2;
  }

  // Constrain inside circular arena
  clampToArena(arenaRadius) {
    const dist = Math.hypot(this.x, this.y);
    const maxDist = arenaRadius - this.radius;
    if (dist > maxDist) {
      const angle = Math.atan2(this.y, this.x);
      this.x = Math.cos(angle) * maxDist;
      this.y = Math.sin(angle) * maxDist;
      // Bounce back slightly
      this.vx = -Math.cos(angle) * 80;
      this.vy = -Math.sin(angle) * 80;
    }
  }

  // Trigger Bizarre Paw Slap Attack
  triggerAttack() {
    if (this.isAttacking || this.attackCooldown > 0 || this.isDizzy || this.isDead) return false;
    this.isAttacking = true;
    this.attackProgress = 0;
    this.attackHitChecked = false;
    this.attackCooldown = this.attackCooldownTime;

    if (window.soundSystem) {
      window.soundSystem.playSlap();
    }
    return true;
  }

  // Get current position of the extended slap paw hitbox
  getSlapHitbox() {
    if (!this.isAttacking || this.attackProgress > 0.85) return null;

    // Arc of the bizarre slap punch:
    // Reach stretches out up to 3.2x body radius with crazy curve
    const swingT = Math.sin(this.attackProgress * Math.PI);
    const reach = this.radius * (1.2 + swingT * 2.2);
    // Paw sweeps from right side forward
    const pawAngle = this.angle + (0.5 - this.attackProgress * 1.3);

    return {
      x: this.x + Math.cos(pawAngle) * reach,
      y: this.y + Math.sin(pawAngle) * reach,
      radius: this.radius * (0.6 + swingT * 0.4) // Paw swells hilariously
    };
  }

  // Take damage and knockback from a slap
  takeHit(damage, fromX, fromY, attacker) {
    if (this.isDead) return;

    this.hp -= damage;
    this.isDizzy = true;
    this.dizzyTimer = 1.2; // 1.2s stunned

    // Knockback impulse away from attacker
    const knockAngle = Math.atan2(this.y - fromY, this.x - fromX);
    const knockForce = 340;
    this.vx = Math.cos(knockAngle) * knockForce;
    this.vy = Math.sin(knockAngle) * knockForce;

    if (window.soundSystem) {
      window.soundSystem.playSqueak();
      window.soundSystem.playDizzy();
    }

    if (this.hp <= 0) {
      this.hp = 0;
      this.die(attacker);
    }
  }

  // Hamster K.O.
  die(attacker) {
    this.isDead = true;
    if (window.soundSystem) {
      window.soundSystem.playKO();
    }
    if (window.particleSystem) {
      window.particleSystem.spawnSlapImpact(this.x, this.y);
      window.particleSystem.spawnFloatingText(this.x, this.y - 30, 'K.O. !', '#ff4757', 28);
    }
  }

  // Eat food
  eat(food) {
    this.score += food.value;
    this.hp = Math.min(this.maxHp, this.hp + (food.isSunflower ? 4 : 1));
    if (window.soundSystem && this.isPlayer) {
      window.soundSystem.playMunch();
    }
    if (window.particleSystem) {
      window.particleSystem.spawnFoodCrumbs(food.x, food.y, food.color);
    }
  }

  // ========================================================
  // PROCEDURAL RENDERING OF ROBOROVSKI DWARF HAMSTER
  // Detailed top-down cute anatomy + realistic back paws gait
  // + bizarre stretch-paw attack
  // ========================================================
  draw(ctx) {
    if (this.isDead) return;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle + this.wobble);

    const r = this.radius;

    // ----------------------------------------------------
    // 1. REALISTIC RUNNING BACK PAWS (PATTES ARRIÈRE)
    // Little pink paws kicking backward in rapid alternation!
    // ----------------------------------------------------
    const backPawOffsetBack = -r * 0.72;
    const backPawSpread = r * 0.78;
    const backPawStroke = Math.sin(this.walkCycle) * (r * 0.45);

    // Left Back Paw
    this.drawHamsterPaw(
      ctx,
      backPawOffsetBack - backPawStroke,
      -backPawSpread,
      r * 0.32,
      -0.2 - (backPawStroke / r) * 0.4
    );

    // Right Back Paw
    this.drawHamsterPaw(
      ctx,
      backPawOffsetBack + backPawStroke,
      backPawSpread,
      r * 0.32,
      0.2 + (backPawStroke / r) * 0.4
    );

    // ----------------------------------------------------
    // 2. FRONT PAWS (PATTES AVANT)
    // Front left paw moves in opposition; right paw attacks!
    // ----------------------------------------------------
    const frontPawOffsetFwd = r * 0.52;
    const frontPawSpread = r * 0.62;
    const frontPawStroke = Math.sin(this.walkCycle + Math.PI) * (r * 0.35);

    // Left Front Paw (scurrying)
    this.drawHamsterPaw(
      ctx,
      frontPawOffsetFwd + frontPawStroke,
      -frontPawSpread,
      r * 0.28,
      -0.3
    );

    // Right Front Paw (normal scurry OR BIZARRE ELASTIC ATTACK!)
    if (!this.isAttacking) {
      this.drawHamsterPaw(
        ctx,
        frontPawOffsetFwd - frontPawStroke,
        frontPawSpread,
        r * 0.28,
        0.3
      );
    }

    // ----------------------------------------------------
    // 3. STUBBY LITTLE HAMSTER TAIL
    // Tiny pink puff at the back with fur
    // ----------------------------------------------------
    const tailWiggle = Math.sin(this.walkCycle * 2) * (r * 0.15);
    ctx.fillStyle = '#ffb8b8';
    ctx.beginPath();
    ctx.arc(-r * 1.05, tailWiggle, r * 0.16, 0, Math.PI * 2);
    ctx.fill();

    // ----------------------------------------------------
    // 4. CHUBBY BEAN BODY (ROBOROVSKI FUR & PATTERNS)
    // Sandy agouti upper coat with soft white belly flanks
    // ----------------------------------------------------
    // Fast drop shadow ellipse under body (zero blur overhead)
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
    ctx.beginPath();
    ctx.ellipse(0, 5, r * 1.12, r * 0.92, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body shape (plump potato / pear shape)
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.08, r * 0.88, 0, 0, Math.PI * 2);
    ctx.fillStyle = this.furColor; // Agouti or custom color
    ctx.fill();

    // White Flanks (Roborovski signature side belly coat)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(-r * 0.1, -r * 0.65, r * 0.65, r * 0.26, 0.1, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(-r * 0.1, r * 0.65, r * 0.65, r * 0.26, -0.1, 0, Math.PI * 2);
    ctx.fill();

    // Dark Dorsal Spine Shade (natural Roborovski agouti stripe)
    const spineGrad = ctx.createLinearGradient(0, -r * 0.3, 0, r * 0.3);
    spineGrad.addColorStop(0, 'rgba(0,0,0,0)');
    spineGrad.addColorStop(0.5, 'rgba(60, 35, 15, 0.25)');
    spineGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = spineGrad;
    ctx.beginPath();
    ctx.ellipse(-r * 0.1, 0, r * 0.8, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // ----------------------------------------------------
    // 5. CUTE ROUND EARS
    // Pink inner ears, dark fur outline, fold back with speed
    // ----------------------------------------------------
    const earFold = (this.currentSpeed / this.sprintSpeed) * 0.15;
    this.drawHamsterEar(ctx, r * 0.25 - earFold * r, -r * 0.72, r * 0.3, -0.4);
    this.drawHamsterEar(ctx, r * 0.25 - earFold * r, r * 0.72, r * 0.3, 0.4);

    // ----------------------------------------------------
    // 6. CUTE NOSE, SNOUT & SNIFFING
    // ----------------------------------------------------
    const sniff = Math.sin(this.sniffTimer) * 1.5;
    const snoutX = r * 0.98 + sniff;

    // Soft pink snout
    ctx.fillStyle = '#ffa8a8';
    ctx.beginPath();
    ctx.ellipse(snoutX, 0, r * 0.16, r * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();

    // ----------------------------------------------------
    // 7. VIBRATING REALISTIC WHISKERS
    // 3 long sensitive whiskers on each cheek
    // ----------------------------------------------------
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1.2;
    const whiskerWiggle = Math.sin(this.whiskerTwitch) * 0.08;

    for (let i = -1; i <= 1; i++) {
      const angleLeft = -0.55 + i * 0.22 + whiskerWiggle;
      const angleRight = 0.55 + i * 0.22 - whiskerWiggle;
      const whiskerLen = r * 1.1;

      // Left whiskers
      ctx.beginPath();
      ctx.moveTo(r * 0.85, -r * 0.25);
      ctx.lineTo(r * 0.85 + Math.cos(angleLeft) * whiskerLen, -r * 0.25 + Math.sin(angleLeft) * whiskerLen);
      ctx.stroke();

      // Right whiskers
      ctx.beginPath();
      ctx.moveTo(r * 0.85, r * 0.25);
      ctx.lineTo(r * 0.85 + Math.cos(angleRight) * whiskerLen, r * 0.25 + Math.sin(angleRight) * whiskerLen);
      ctx.stroke();
    }

    // ----------------------------------------------------
    // 8. DISTINCTIVE ROBOROVSKI WHITE EYE-SPOTS & BEADY EYES
    // The signature hallmark of Roborovski dwarf hamsters!
    // ----------------------------------------------------
    // White eye spots ("Sourcils blancs de Roborovski")
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(r * 0.62, -r * 0.45, r * 0.22, r * 0.14, -0.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(r * 0.62, r * 0.45, r * 0.22, r * 0.14, 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Black glossy beady eyes
    ctx.fillStyle = '#111111';
    ctx.beginPath();
    ctx.arc(r * 0.64, -r * 0.42, r * 0.13, 0, Math.PI * 2);
    ctx.arc(r * 0.64, r * 0.42, r * 0.13, 0, Math.PI * 2);
    ctx.fill();

    // White eye reflections / glints
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(r * 0.67, -r * 0.45, r * 0.045, 0, Math.PI * 2);
    ctx.arc(r * 0.67, r * 0.39, r * 0.045, 0, Math.PI * 2);
    ctx.fill();

    // ----------------------------------------------------
    // 9. BIZARRE COMIC "RUBBER PAW SLAP" ATTACK ANIMATION
    // Hilariously stretches out into an oversized slap arm!
    // ----------------------------------------------------
    if (this.isAttacking) {
      this.drawBizarreSlapAttack(ctx, r);
    }

    // ----------------------------------------------------
    // 10. DIZZY ORBITING STARS (when hit/stunned)
    // ----------------------------------------------------
    if (this.isDizzy) {
      this.drawDizzyStars(ctx, r);
    }

    ctx.restore();

    // Health Bar & Name above hamster (slither.io style)
    this.drawOverheadHUD(ctx);
  }

  // Draw cute little pink hamster paw with tiny toe beans
  drawHamsterPaw(ctx, x, y, pawSize, pawRot) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(pawRot);

    // Paw base
    ctx.fillStyle = '#ffb8b8';
    ctx.beginPath();
    ctx.ellipse(0, 0, pawSize * 1.1, pawSize * 0.75, 0, 0, Math.PI * 2);
    ctx.fill();

    // Tiny pink toe beans
    ctx.fillStyle = '#ff8f8f';
    for (let t = -1; t <= 1; t++) {
      ctx.beginPath();
      ctx.arc(pawSize * 0.8, t * (pawSize * 0.42), pawSize * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // Draw cute rounded ear
  drawHamsterEar(ctx, x, y, earSize, earAngle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(earAngle);

    // Outer fur
    ctx.fillStyle = this.furColor;
    ctx.beginPath();
    ctx.arc(0, 0, earSize, 0, Math.PI * 2);
    ctx.fill();

    // Inner pink ear
    ctx.fillStyle = '#ffa4a4';
    ctx.beginPath();
    ctx.arc(0, 0, earSize * 0.65, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // ========================================================
  // BIZARRE COMICAL RUBBER-PAW SLAP ATTACK
  // Wild cartoon noodle arm stretching with huge oversized slap paw
  // ========================================================
  drawBizarreSlapAttack(ctx, r) {
    const p = this.attackProgress;
    // Elastic stretch wave
    const stretchT = Math.sin(p * Math.PI);
    const armLength = r * (1.1 + stretchT * 2.3); // Stretches ridiculously far!
    const sweepAngle = 0.5 - p * 1.3; // Curving roundhouse slap arc

    const startX = r * 0.5;
    const startY = r * 0.6;
    const endX = Math.cos(sweepAngle) * armLength;
    const endY = Math.sin(sweepAngle) * armLength;

    // Curved wacky cartoon noodle arm (Bezier)
    const midX = (startX + endX) * 0.5 + Math.sin(p * Math.PI * 2) * (r * 0.6);
    const midY = (startY + endY) * 0.5 + (r * 0.4);

    ctx.strokeStyle = '#ffb8b8';
    ctx.lineWidth = r * (0.35 + stretchT * 0.15);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(midX, midY, endX, endY);
    ctx.stroke();

    // COMICAL GIANT OVERSIZED SLAP PAW ("BAFFE GÉANTE")
    ctx.save();
    ctx.translate(endX, endY);
    ctx.rotate(sweepAngle + Math.PI * 0.4);

    const slapPawSize = r * (0.65 + stretchT * 0.55); // Swells up huge!

    // Paw Palm
    ctx.fillStyle = '#ff8080';
    ctx.strokeStyle = '#d63031';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, slapPawSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Big central paw pad
    ctx.fillStyle = '#ff4757';
    ctx.beginPath();
    ctx.ellipse(0, slapPawSize * 0.1, slapPawSize * 0.55, slapPawSize * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();

    // 4 Cartoon Slap Toes / Claws
    for (let t = -1.5; t <= 1.5; t += 1.0) {
      const toeX = t * (slapPawSize * 0.45);
      const toeY = -slapPawSize * 0.85;
      ctx.beginPath();
      ctx.arc(toeX, toeY, slapPawSize * 0.28, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    // Comic motion speed streaks
    ctx.strokeStyle = 'rgba(255, 234, 167, 0.75)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, slapPawSize * 1.5, -Math.PI * 0.4, Math.PI * 0.3);
    ctx.stroke();

    ctx.restore();
  }

  // Draw dizzy orbiting stars when stunned
  drawDizzyStars(ctx, r) {
    const starCount = 3;
    const orbitRadius = r * 1.15;
    for (let i = 0; i < starCount; i++) {
      const a = this.dizzyStarsAngle + (i * (Math.PI * 2 / starCount));
      const starX = r * 0.4 + Math.cos(a) * orbitRadius;
      const starY = Math.sin(a) * (orbitRadius * 0.5); // Flattened 3D orbit

      ctx.save();
      ctx.translate(starX, starY);
      ctx.rotate(a * 2);
      ctx.fillStyle = '#ffd32a';
      ctx.beginPath();
      for (let s = 0; s < 5 * 2; s++) {
        const rad = s % 2 === 0 ? 6 : 2.5;
        const sa = (s * Math.PI) / 5;
        if (s === 0) ctx.moveTo(Math.cos(sa) * rad, Math.sin(sa) * rad);
        else ctx.lineTo(Math.cos(sa) * rad, Math.sin(sa) * rad);
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  // Draw name tag & mini health bar
  drawOverheadHUD(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    const hudY = -this.radius * 1.35 - 12;

    // Nickname
    ctx.font = `bold 13px 'Fredoka', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';

    // Black outline
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
    ctx.lineWidth = 3.5;
    ctx.strokeText(this.name, 0, hudY);

    // Color fill (Gold for player, bright white for bots)
    ctx.fillStyle = this.isPlayer ? '#fffa65' : '#ffffff';
    ctx.fillText(this.name, 0, hudY);

    // Mini Health Bar
    const barW = 46;
    const barH = 5;
    const barX = -barW / 2;
    const barY = hudY + 3;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(barX, barY, barW, barH);

    const hpRatio = Math.max(0, this.hp / this.maxHp);
    ctx.fillStyle = hpRatio > 0.5 ? '#2ecc71' : (hpRatio > 0.25 ? '#f39c12' : '#e74c3c');
    ctx.fillRect(barX, barY, barW * hpRatio, barH);

    ctx.restore();
  }

  // State serialization for future online multiplayer (Firebase / WebSockets)
  serialize() {
    return {
      id: this.id,
      name: this.name,
      x: Math.round(this.x),
      y: Math.round(this.y),
      angle: Number(this.angle.toFixed(2)),
      speed: Math.round(this.currentSpeed),
      hp: Math.round(this.hp),
      score: this.score,
      kos: this.kos,
      isAttacking: this.isAttacking,
      isDizzy: this.isDizzy,
      color: this.furColor
    };
  }

  applyState(data) {
    if (!data) return;
    this.x = data.x;
    this.y = data.y;
    this.angle = data.angle;
    this.currentSpeed = data.speed;
    this.hp = data.hp;
    this.score = data.score;
    this.kos = data.kos;
    this.isAttacking = data.isAttacking;
    this.isDizzy = data.isDizzy;
  }
}

