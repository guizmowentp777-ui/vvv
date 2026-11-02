/**
 * HAMSTER.IO - Food & Collectibles
 * Sunflower seeds & glowing slither-style pellets scattered across the arena.
 */

class FoodManager {
  constructor(arenaRadius, targetCount = 450) {
    this.arenaRadius = arenaRadius;
    this.targetCount = targetCount;
    this.foods = [];
    this.init();
  }

  init() {
    this.foods = [];
    for (let i = 0; i < this.targetCount; i++) {
      this.spawnRandomFood();
    }
  }

  spawnRandomFood(isRare = false) {
    // Generate within circular arena
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.sqrt(Math.random()) * (this.arenaRadius - 100);
    const x = Math.cos(angle) * dist;
    const y = Math.sin(angle) * dist;

    const isSunflower = Math.random() > 0.35 || isRare;
    const colors = [
      '#ffbe76', '#ff7979', '#badc58', '#7ed6df',
      '#e056fd', '#f6e58d', '#ff9ff3', '#54a0ff'
    ];

    this.foods.push({
      x,
      y,
      isSunflower,
      color: isSunflower ? '#f1c40f' : colors[Math.floor(Math.random() * colors.length)],
      radius: isSunflower ? 8 : (Math.random() * 3 + 4),
      value: isSunflower ? 5 : 2,
      rotation: Math.random() * Math.PI * 2,
      pulse: Math.random() * Math.PI * 2
    });
  }

  // Spawn cluster of sunflower seeds when a hamster is hit or defeated
  spawnBurst(x, y, count = 12) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * 70 + 20;
      this.foods.push({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        isSunflower: true,
        color: '#f39c12',
        radius: 9,
        value: 10,
        rotation: Math.random() * Math.PI * 2,
        pulse: Math.random() * Math.PI * 2
      });
    }
  }

  update(dt) {
    // Pulse animation
    for (const f of this.foods) {
      f.pulse += dt * 3;
    }

    // Maintain population
    if (this.foods.length < this.targetCount) {
      const diff = this.targetCount - this.foods.length;
      for (let i = 0; i < Math.min(diff, 5); i++) {
        this.spawnRandomFood();
      }
    }
  }

  // Draw visible food within camera viewport
  draw(ctx, viewX, viewY, viewW, viewH) {
    const margin = 50;
    const left = viewX - margin;
    const right = viewX + viewW + margin;
    const top = viewY - margin;
    const bottom = viewY + viewH + margin;

    for (const f of this.foods) {
      if (f.x < left || f.x > right || f.y < top || f.y > bottom) continue;

      const pulseScale = 1 + Math.sin(f.pulse) * 0.12;

      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.rotation);
      ctx.scale(pulseScale, pulseScale);

      if (f.isSunflower) {
        // Draw Authentic Sunflower Seed (Graine de tournesol) - Fast & Crisp
        // Seed Body Teardrop
        ctx.beginPath();
        ctx.moveTo(0, -f.radius * 1.5); // Pointy tip
        ctx.bezierCurveTo(
          f.radius * 1.1, -f.radius * 0.4,
          f.radius * 1.1, f.radius * 1.1,
          0, f.radius * 1.2
        );
        ctx.bezierCurveTo(
          -f.radius * 1.1, f.radius * 1.1,
          -f.radius * 1.1, -f.radius * 0.4,
          0, -f.radius * 1.5
        );
        ctx.closePath();
        ctx.fillStyle = '#22272a';
        ctx.fill();
        ctx.strokeStyle = '#576574';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // White/cream stripes like real sunflower seeds
        ctx.strokeStyle = '#f1f2f6';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(-f.radius * 0.35, -f.radius * 0.8);
        ctx.lineTo(-f.radius * 0.35, f.radius * 0.8);
        ctx.moveTo(f.radius * 0.35, -f.radius * 0.8);
        ctx.lineTo(f.radius * 0.35, f.radius * 0.8);
        ctx.stroke();

        // Golden center dot
        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.arc(0, 0, 2.2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Glowing Slither-style Neon Orb - Fast zero-blur glow
        ctx.fillStyle = f.color;
        ctx.globalAlpha = 0.28;
        ctx.beginPath();
        ctx.arc(0, 0, f.radius * 1.7, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 1.0;
        ctx.beginPath();
        ctx.arc(0, 0, f.radius, 0, Math.PI * 2);
        ctx.fill();

        // Inner glowing white core
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-f.radius * 0.25, -f.radius * 0.25, f.radius * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }
}

