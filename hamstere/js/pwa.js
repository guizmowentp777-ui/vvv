/**
 * HAMSTER.IO - PWA Installation Manager
 * Handles Service Worker registration & native App installation prompt.
 */

class PwaManager {
  constructor() {
    this.deferredPrompt = null;
    this.isInstalled = false;
    this.init();
  }

  init() {
    this.checkIfInstalled();
    this.registerServiceWorker();
    this.bindInstallEvents();
  }

  checkIfInstalled() {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         window.navigator.standalone === true;
    this.isInstalled = isStandalone;
    if (this.isInstalled) {
      this.updateUIForInstalled();
    }
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator && (window.location.protocol.startsWith('http') || window.location.hostname === 'localhost')) {
      const doRegister = () => {
        navigator.serviceWorker.register('./sw.js', { scope: './' })
          .then((reg) => console.log('📱 Service Worker PWA enregistré avec succès !', reg))
          .catch((err) => console.warn('Échec enregistrement Service Worker:', err));
      };
      if (document.readyState === 'complete' || document.readyState === 'interactive') {
        doRegister();
      } else {
        window.addEventListener('load', doRegister);
      }
    }
  }

  bindInstallEvents() {
    const btnInstallStart = document.getElementById('btn-install-app');
    const btnInstallHud = document.getElementById('btn-install-hud');
    const iosModal = document.getElementById('ios-install-modal');
    const btnCloseIos = document.getElementById('btn-close-ios-modal');

    // Android / Chrome / Edge BeforeInstallPrompt
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent automatic mini-infobar
      e.preventDefault();
      this.deferredPrompt = e;

      // Show install buttons
      if (btnInstallStart) btnInstallStart.style.display = 'flex';
      if (btnInstallHud) btnInstallHud.style.display = 'flex';
    });

    const triggerInstall = () => {
      // If native prompt is available
      if (this.deferredPrompt) {
        this.deferredPrompt.prompt();
        this.deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('L\'utilisateur a installé l\'application !');
            this.updateUIForInstalled();
          }
          this.deferredPrompt = null;
        });
      } else {
        // Detect iOS (Safari)
        const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        if (isIos && iosModal) {
          iosModal.classList.remove('hidden');
        } else {
          // Desktop / other browsers: instructions
          alert("Pour installer l'application :\n- Sur Chrome/Edge : cliquez sur l'icône d'installation dans la barre d'adresse (en haut à droite ⤓).\n- Sur mobile : appuyez sur le menu (⋮) puis 'Installer l'application' ou 'Ajouter à l'écran d'accueil'.");
        }
      }
    };

    if (btnInstallStart) btnInstallStart.addEventListener('click', triggerInstall);
    if (btnInstallHud) btnInstallHud.addEventListener('click', triggerInstall);
    if (btnCloseIos && iosModal) {
      btnCloseIos.addEventListener('click', () => iosModal.classList.add('hidden'));
    }

    // App installed event
    window.addEventListener('appinstalled', () => {
      console.log('✅ Application installée avec succès !');
      this.updateUIForInstalled();
      this.deferredPrompt = null;
    });
  }

  updateUIForInstalled() {
    const btnInstallStart = document.getElementById('btn-install-app');
    const btnInstallHud = document.getElementById('btn-install-hud');
    if (btnInstallStart) {
      btnInstallStart.innerHTML = '✓ App Installée';
      btnInstallStart.style.opacity = '0.7';
      btnInstallStart.style.pointerEvents = 'none';
    }
    if (btnInstallHud) {
      btnInstallHud.style.display = 'none';
    }
  }
}

window.pwaManager = new PwaManager();

