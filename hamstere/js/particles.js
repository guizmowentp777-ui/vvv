/**
 * HAMSTER.IO - Particle System
 * Slap impacts, dust trails from running back paws, food crumbs, and dizzy stars.
 */

class ParticleSystem {
  constructor() {
    this.particles = [];
    this.floatingTexts = [];
  }

  // Dust puff from hamster paws
  spawnPawDust(x, y, angle, speed) {
    const spread = (Math.random() - 0.5) * 0.6;
    const oppAngle = angle + Math.PI + spread;
    this.particles.push({
      x,
      y,
      vx: Math.cos(oppAngle) * (Math.random() * 20 + 10),
      vy: Math.sin(oppAngle) * (Math.random() * 20 + 10),
      size: Math.random() * 4 + 3,
      alpha: 0.6,
      decay: 0.03,
      color: 'rgba(230, 220, 200, ',
      type: 'dust'
    });
  }

  // Comical Slap Impact Effect (Comic burst, stars, rings)
  spawnSlapImpact(x, y) {
    // 1. Shockwave expand ring
    this.particles.push({
      x,
      y,
      radius: 5,
      maxRadius: 65,
      growth: 320,
      alpha: 0.9,
      decay: 0.05,
      lineWidth: 5,
      color: '#ff4757',
      type: 'shockwave'
    });

    // 2. Flying comic impact stars
    const starCount = 8;
    for (let i = 0; i < starCount; i++) {
      const a = (i / starCount) * Math.PI * 2 + Math.random() * 0.4;
      const spd = Math.random() * 140 + 80;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: Math.random() * 8 + 6,
        alpha: 1,
        decay: 0.04,
        rotation: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 15,
        color: ['#ffd32a', '#ff3838', '#ff9f1a', '#ffffff'][Math.floor(Math.random() * 4)],
        type: 'star'
      });
    }

    // 3. Comic floating text (e.g. "PAF !", "BAM !", "SLAM !", "COUIC !")
    const texts = ['PAF !', 'BIM !', 'BAFFE !', 'POW !', 'COUIC !', 'K.O. !'];
    const chosen = texts[Math.floor(Math.random() * texts.length)];
    this.spawnFloatingText(x, y - 20, chosen, '#ff3838', 22);
  }

  // Food munch crumb burst
  spawnFoodCrumbs(x, y, color) {
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2;
      const spd = Math.random() * 60 + 20;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * spd,
        vy: Math.sin(a) * spd,
        size: Math.random() * 3 + 2,
        alpha: 1,
        decay: 0.035,
        color: color || '#ffd32a',
        type: 'crumb'
      });
    }
  }

  // Floating comic popup text
  spawnFloatingText(x, y, text, color = '#fffa65', size = 18) {
    this.floatingTexts.push({
      x,
      y,
      text,
      color,
      size,
      alpha: 1,
      vy: -60,
      scale: 1.4,
      life: 0.8
    });
  }

  update(dt) {
    // Update particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];

      if (p.type === 'shockwave') {
        p.radius += p.growth * dt;
        p.alpha -= p.decay * (dt * 60);
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.92;
        p.vy *= 0.92;
        p.alpha -= p.decay * (dt * 60);

        if (p.type === 'star') {
          p.rotation += p.rotSpeed * dt;
        }
      }

      if (p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }

    // Update floating texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y += ft.vy * dt;
      ft.life -= dt;
      if (ft.scale > 1.0) {
        ft.scale -= dt * 2;
      }
      if (ft.life <= 0.3) {
        ft.alpha = ft.life / 0.3;
      }
      if (ft.life <= 0) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  draw(ctx) {
    // Draw all particles
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);

      if (p.type === 'shockwave') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.lineWidth;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (p.type === 'star') {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        // 5-point comic star
        const spikes = 5;
        const outer = p.size;
        const inner = p.size * 0.45;
        for (let j = 0; j < spikes * 2; j++) {
          const r = j % 2 === 0 ? outer : inner;
          const a = (j * Math.PI) / spikes;
          if (j === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
          else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
      } else if (p.type === 'crumb') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'dust') {
        ctx.fillStyle = p.color + p.alpha + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }

    // Draw floating comic text
    for (const ft of this.floatingTexts) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, ft.alpha);
      ctx.translate(ft.x, ft.y);
      ctx.scale(ft.scale, ft.scale);

      ctx.font = `bold ${ft.size}px 'Fredoka', 'Bungee', cursive, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Thick black cartoon stroke
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 4;
      ctx.strokeText(ft.text, 0, 0);

      // Bright fill
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, 0, 0);

      ctx.restore();
    }
  }
}

window.particleSystem = new ParticleSystem();

