/**
 * HAMSTER.IO - Bot AI System
 * Autonomous hamster bots that wander, forage for sunflower seeds,
 * chase players and unleash bizarre paw slap attacks!
 */

const BOT_NAMES = [
  'Capitaine Poil',
  'Speedy Hammy',
  'Boule de Poil',
  'Nugget',
  'Pistache',
  'Don Hamstero',
  'Tournesol',
  'Cacahuète',
  'Chonky King',
  'Robo-Ninja',
  'Tornade Naine',
  'Patte de Velours',
  'Gros Joufflu',
  'Kung-Fu Hammy'
];

const BOT_COLORS = [
  '#d49b5b', // Classic Agouti
  '#e8c89b', // Sand Roborovski
  '#f5efe6', // Pure White
  '#8c6a48', // Chocolate
  '#e58e3c', // Golden Orange
  '#7a7f8a', // Pearl Grey
  '#cca072'  // Caramel
];

class BotHamster extends Hamster {
  constructor(id, name, furColor) {
    super(id, name, false, furColor);

    // AI State
    this.state = 'FORAGE'; // 'FORAGE', 'CHASE', 'FLEE'
    this.target = null;
    this.decisionTimer = 0;
    this.attackDecisionTimer = 0;
    this.sprintTimer = 0;

    // AI Personality variations
    this.aggressiveness = 0.4 + Math.random() * 0.5; // 0.4 to 0.9
    this.detectionRadius = 280 + Math.random() * 140;
    this.attackReach = 85;
  }

  updateAI(dt, allHamsters, foodManager, arenaRadius) {
    if (this.isDead || this.isDizzy) return;

    this.decisionTimer -= dt;
    this.attackDecisionTimer -= dt;
    this.sprintTimer -= dt;

    // Periodic decision making
    if (this.decisionTimer <= 0) {
      this.decisionTimer = 0.25 + Math.random() * 0.2; // 4 times per second

      // 1. Evaluate health: if very low, prioritize fleeing
      if (this.hp < 25) {
        this.state = 'FLEE';
      } else {
        // Find nearest opponent
        let nearestHamster = null;
        let minDist = Infinity;

        for (const other of allHamsters) {
          if (other.id === this.id || other.isDead) continue;
          const d = Math.hypot(other.x - this.x, other.y - this.y);
          if (d < minDist) {
            minDist = d;
            nearestHamster = other;
          }
        }

        if (nearestHamster && minDist < this.detectionRadius && Math.random() < this.aggressiveness) {
          this.state = 'CHASE';
          this.target = nearestHamster;
        } else {
          this.state = 'FORAGE';
          this.target = null;
        }
      }
    }

    // Execute state behavior
    if (this.state === 'CHASE' && this.target && !this.target.isDead) {
      const dx = this.target.x - this.x;
      const dy = this.target.y - this.y;
      const dist = Math.hypot(dx, dy);

      this.targetAngle = Math.atan2(dy, dx);
      this.currentSpeed = this.baseSpeed;

      // Close gap sprint
      if (dist > 120 && dist < 250 && this.stamina > 30 && Math.random() < 0.03) {
        this.isSprinting = true;
      }

      // Attack if close enough!
      if (dist <= this.attackReach && this.attackDecisionTimer <= 0) {
        this.triggerAttack();
        this.attackDecisionTimer = 0.6 + Math.random() * 0.4;
      }

      // If target escaped
      if (dist > this.detectionRadius * 1.3) {
        this.state = 'FORAGE';
      }
    } else if (this.state === 'FLEE') {
      // Find nearest threat and run opposite
      let nearestThreat = null;
      let minD = Infinity;
      for (const other of allHamsters) {
        if (other.id === this.id || other.isDead) continue;
        const d = Math.hypot(other.x - this.x, other.y - this.y);
        if (d < minD) {
          minD = d;
          nearestThreat = other;
        }
      }

      if (nearestThreat && minD < 300) {
        const awayAngle = Math.atan2(this.y - nearestThreat.y, this.x - nearestThreat.x);
        this.targetAngle = awayAngle;
        this.currentSpeed = this.baseSpeed;
        if (this.stamina > 20) this.isSprinting = true;
      } else {
        this.state = 'FORAGE';
      }
    } else {
      // FORAGE: Seek nearest sunflower seeds / food pellets
      this.currentSpeed = this.baseSpeed * 0.85;
      this.isSprinting = false;

      let nearestFood = null;
      let minFoodDist = 350;

      // Scan subset of food
      if (foodManager && foodManager.foods) {
        for (let i = 0; i < Math.min(foodManager.foods.length, 60); i++) {
          const f = foodManager.foods[i];
          const d = Math.hypot(f.x - this.x, f.y - this.y);
          if (d < minFoodDist) {
            minFoodDist = d;
            nearestFood = f;
          }
        }
      }

      if (nearestFood) {
        this.targetAngle = Math.atan2(nearestFood.y - this.y, nearestFood.x - this.x);
      } else {
        // Random wandering inside arena
        const centerDist = Math.hypot(this.x, this.y);
        if (centerDist > arenaRadius * 0.75) {
          // Turn back toward center
          this.targetAngle = Math.atan2(-this.y, -this.x);
        } else if (Math.random() < 0.02) {
          this.targetAngle += (Math.random() - 0.5) * 1.5;
        }
      }
    }

    // Call base class physics & animation update
    super.update(dt, arenaRadius);
  }
}

// Bot Manager to handle bot roster and respawns
class BotManager {
  constructor(botCount = 10, arenaRadius = 2000) {
    this.targetCount = botCount;
    this.arenaRadius = arenaRadius;
    this.bots = [];
    this.botIdCounter = 1;
  }

  init() {
    this.bots = [];
    for (let i = 0; i < this.targetCount; i++) {
      this.spawnBot();
    }
  }

  spawnBot() {
    const id = 'bot_' + (this.botIdCounter++);
    const name = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    const color = BOT_COLORS[Math.floor(Math.random() * BOT_COLORS.length)];

    const bot = new BotHamster(id, name, color);

    // Random initial position inside arena
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.sqrt(Math.random()) * (this.arenaRadius - 200);
    bot.x = Math.cos(angle) * dist;
    bot.y = Math.sin(angle) * dist;
    bot.angle = Math.random() * Math.PI * 2;
    bot.targetAngle = bot.angle;
    bot.score = Math.floor(Math.random() * 40 + 10);

    this.bots.push(bot);
    return bot;
  }

  update(dt, allHamsters, foodManager) {
    // Update existing bots
    for (let i = this.bots.length - 1; i >= 0; i--) {
      const bot = this.bots[i];

      if (bot.isDead) {
        // Scatter seeds where bot died
        if (foodManager) {
          foodManager.spawnBurst(bot.x, bot.y, 14);
        }
        // Remove dead bot
        this.bots.splice(i, 1);
        continue;
      }

      bot.updateAI(dt, allHamsters, foodManager, this.arenaRadius);
    }

    // Respawn bots to keep arena lively
    while (this.bots.length < this.targetCount) {
      this.spawnBot();
    }
  }
}

