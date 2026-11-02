/**
 * HAMSTER.IO - Dual Landscape Controls System
 * - Left Screen: Virtual dynamic joystick for directional movement
 * - Right Screen: Big Slap button & Sprint button (plus touch anywhere on right side to slap)
 * - Desktop: Keyboard (WASD / Arrows), Mouse aim, Space / Clic to slap
 */

class InputController {
  constructor() {
    // Movement Vector
    this.moveAngle = 0;
    this.isMoving = false;
    this.moveIntensity = 0; // 0 to 1

    // Action Triggers
    this.slapRequested = false;
    this.sprintRequested = false;

    // Joystick Touch Tracking
    this.joystickTouchId = null;
    this.joystickBaseX = 0;
    this.joystickBaseY = 0;
    this.joystickMaxDist = 50;

    // Keyboard state
    this.keys = {
      up: false,
      down: false,
      left: false,
      right: false,
      space: false,
      shift: false
    };

    // Mouse Aim state (desktop)
    this.mouseAngle = 0;
    this.isMouseDown = false;
    this.useMouseAim = false;

    this.initElements();
    this.bindEvents();
  }

  initElements() {
    this.joystickZone = document.getElementById('joystick-zone');
    this.joystickBase = document.getElementById('joystick-base');
    this.joystickStick = document.getElementById('joystick-stick');
    this.btnSlap = document.getElementById('btn-slap');
    this.btnDash = document.getElementById('btn-dash');
  }

  bindEvents() {
    // ----------------------------------------------------
    // 1. LEFT ZONE: VIRTUAL TOUCH JOYSTICK
    // ----------------------------------------------------
    if (this.joystickZone) {
      this.joystickZone.addEventListener('touchstart', (e) => this.handleJoystickStart(e), { passive: false });
      this.joystickZone.addEventListener('touchmove', (e) => this.handleJoystickMove(e), { passive: false });
      this.joystickZone.addEventListener('touchend', (e) => this.handleJoystickEnd(e), { passive: false });
      this.joystickZone.addEventListener('touchcancel', (e) => this.handleJoystickEnd(e), { passive: false });
    }

    // ----------------------------------------------------
    // 2. RIGHT ZONE BUTTONS: SLAP & DASH
    // ----------------------------------------------------
    if (this.btnSlap) {
      // Touch
      this.btnSlap.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.slapRequested = true;
        this.btnSlap.classList.add('active-touch');
      }, { passive: false });

      this.btnSlap.addEventListener('touchend', (e) => {
        e.preventDefault();
        this.btnSlap.classList.remove('active-touch');
      }, { passive: false });

      // Mouse click
      this.btnSlap.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.slapRequested = true;
      });
    }

    if (this.btnDash) {
      // Touch
      this.btnDash.addEventListener('touchstart', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.sprintRequested = true;
        this.btnDash.classList.add('active-touch');
      }, { passive: false });

      const stopDash = (e) => {
        e.preventDefault();
        this.sprintRequested = false;
        this.btnDash.classList.remove('active-touch');
      };
      this.btnDash.addEventListener('touchend', stopDash, { passive: false });
      this.btnDash.addEventListener('touchcancel', stopDash, { passive: false });

      // Mouse
      this.btnDash.addEventListener('mousedown', (e) => {
        e.preventDefault();
        this.sprintRequested = true;
      });
      window.addEventListener('mouseup', () => {
        this.sprintRequested = false;
      });
    }

    // Touch anywhere on right half of canvas to also slap!
    const canvas = document.getElementById('game-canvas');
    if (canvas) {
      canvas.addEventListener('touchstart', (e) => {
        const touch = e.changedTouches[0];
        if (touch.clientX > window.innerWidth * 0.5) {
          this.slapRequested = true;
        }
      }, { passive: true });
    }

    // ----------------------------------------------------
    // 3. DESKTOP KEYBOARD CONTROLS (WASD / Arrows / Space / Shift)
    // ----------------------------------------------------
    window.addEventListener('keydown', (e) => {
      // If typing in input, ignore
      if (document.activeElement && document.activeElement.tagName === 'INPUT') return;

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.up = true;
          this.useMouseAim = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.down = true;
          this.useMouseAim = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = true;
          this.useMouseAim = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = true;
          this.useMouseAim = false;
          break;
        case 'Space':
        case 'KeyF':
        case 'KeyE':
          this.slapRequested = true;
          e.preventDefault();
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.sprintRequested = true;
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.up = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.down = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = false;
          break;
        case 'ShiftLeft':
        case 'ShiftRight':
          this.sprintRequested = false;
          break;
      }
    });

    // Desktop Mouse Aiming
    window.addEventListener('mousemove', (e) => {
      // Relative to screen center
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      this.mouseAngle = Math.atan2(dy, dx);
      // If user moves mouse significantly, enable mouse steering
      if (Math.hypot(dx, dy) > 25) {
        this.useMouseAim = true;
      }
    });

    window.addEventListener('mousedown', (e) => {
      if (e.target.closest('#ui-overlay') || e.target.closest('.modal-backdrop')) return;
      if (e.button === 0) {
        this.slapRequested = true; // Left click slap
      } else if (e.button === 2) {
        this.sprintRequested = true; // Right click sprint
      }
    });

    window.addEventListener('contextmenu', (e) => {
      e.preventDefault(); // Prevent context menu on right click
    });
  }

  // --- TOUCH JOYSTICK HANDLERS ---
  handleJoystickStart(e) {
    e.preventDefault();
    if (this.joystickTouchId !== null) return;

    const touch = e.changedTouches[0];
    this.joystickTouchId = touch.identifier;

    // Anchor base to touch start location
    const rect = this.joystickZone.getBoundingClientRect();
    this.joystickBaseX = touch.clientX - rect.left;
    this.joystickBaseY = touch.clientY - rect.top;

    if (this.joystickBase) {
      this.joystickBase.style.position = 'absolute';
      this.joystickBase.style.left = `${this.joystickBaseX - 60}px`;
      this.joystickBase.style.top = `${this.joystickBaseY - 60}px`;
    }

    this.updateJoystickPosition(touch.clientX, touch.clientY);
  }

  handleJoystickMove(e) {
    e.preventDefault();
    if (this.joystickTouchId === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === this.joystickTouchId) {
        this.updateJoystickPosition(touch.clientX, touch.clientY);
        break;
      }
    }
  }

  handleJoystickEnd(e) {
    if (this.joystickTouchId === null) return;

    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === this.joystickTouchId) {
        this.joystickTouchId = null;
        this.isMoving = false;
        this.moveIntensity = 0;

        // Reset stick to center
        if (this.joystickStick) {
          this.joystickStick.style.transform = `translate(0px, 0px)`;
        }
        // Reset base style
        if (this.joystickBase) {
          this.joystickBase.style.position = 'relative';
          this.joystickBase.style.left = 'auto';
          this.joystickBase.style.top = 'auto';
        }
        break;
      }
    }
  }

  updateJoystickPosition(clientX, clientY) {
    const rect = this.joystickZone.getBoundingClientRect();
    const currentX = clientX - rect.left;
    const currentY = clientY - rect.top;

    const dx = currentX - this.joystickBaseX;
    const dy = currentY - this.joystickBaseY;
    const dist = Math.hypot(dx, dy);

    this.moveAngle = Math.atan2(dy, dx);
    this.isMoving = dist > 6;
    this.moveIntensity = Math.min(1, dist / this.joystickMaxDist);

    // Clamp visually
    const clampDist = Math.min(dist, this.joystickMaxDist);
    const clampedX = Math.cos(this.moveAngle) * clampDist;
    const clampedY = Math.sin(this.moveAngle) * clampDist;

    if (this.joystickStick) {
      this.joystickStick.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
    }
  }

  // Poll current frame input and apply to player hamster
  applyToPlayer(player) {
    if (!player || player.isDead) return;

    // 1. Process Paw Slap Attack
    if (this.slapRequested) {
      player.triggerAttack();
      this.slapRequested = false;
    }

    // 2. Sprint
    player.isSprinting = this.sprintRequested;

    // 3. Movement Direction
    if (this.isMoving) {
      // Touch Joystick
      player.targetAngle = this.moveAngle;
      player.currentSpeed = player.baseSpeed * this.moveIntensity;
    } else {
      // Keyboard input check
      let kx = 0;
      let ky = 0;
      if (this.keys.up) ky -= 1;
      if (this.keys.down) ky += 1;
      if (this.keys.left) kx -= 1;
      if (this.keys.right) kx += 1;

      if (kx !== 0 || ky !== 0) {
        player.targetAngle = Math.atan2(ky, kx);
        player.currentSpeed = player.baseSpeed;
      } else if (this.useMouseAim) {
        // Desktop mouse aim: hamster smoothly moves toward mouse
        player.targetAngle = this.mouseAngle;
        player.currentSpeed = player.baseSpeed;
      } else {
        player.currentSpeed = 0;
      }
    }
  }
}

