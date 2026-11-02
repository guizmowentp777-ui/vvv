# 🐹 HAMSTER.IO - Roborovski Slap Arena

Jeu mobile multijoueur en mode paysage inspiré de **Slither.io**, mettant en scène d'adorables **hamsters Roborovski nains** armés de baffes bizarres et loufoques !

---

## 🌟 Fonctionnalités Implémentées

### 1. Arène style Slither.io (Vue Large & Ultra Fluide)
- **Vue beaucoup plus large :** Zoom caméra réglé à `0.58` (et `0.52` en sprint), permettant de voir environ 3 fois plus de terrain pour anticiper les ennemis et repérer les graines de loin comme sur Slither.io !
- **Ultra-fluidité (60-120 FPS) :** Élimination de tous les flous gaussiens coûteux au profit de rendus par cercles alpha ultralégers et de tracés néon multicouches.
- **Grille hexagonale & limites néon :** Ambiance arcade avec bordure circulaire luminescente.
- **Minimap radar circulaire :** Affiche votre position (blanc), les autres vrais joueurs en ligne (cyan) et les bots (rouge).
- **Graines de tournesol authentiques & orbes :** À ramasser pour grossir, marquer des points et regagner de la vie.
- **Classement dynamique en direct :** Affiche les meilleurs scores en temps réel.

### 2. Le Hamster Roborovski Nain & Ses Animations Réalistes
- **Morphologie Roborovski :** Silhouette toute ronde, pelage agouti avec ventre blanc, taches blanches au-dessus des yeux ("sourcils de Roborovski"), petite truffe rose qui renifle et moustaches frémissantes.
- **Animation réaliste des pattes arrière :** Lorsque le hamster avance ou sprinte, ses petites pattes arrière roses s'agitent à toute vitesse en alternance pour reproduire le trot frénétique typique des vrais hamsters nains !
- **Effets de course :** Poussière soulevée par les pattes arrière et dandinement mignon du popotin (*waddle*).

### 3. La Baffe Bizarre & Hilarante (Attaque Spéciale)
- **Le coup de patte élastique :** En appuyant sur **BAFFE 🐾** (à droite), la patte du hamster s'étire comme un bras en caoutchouc avec une patte géante disproportionnée !
- **Effets cartoonesques :** Ondes de choc, étoiles d'impact ("PAF !", "BAM !", "COUIC !"), sons de claques et couinements.
- **Conséquence du coup :** L'adversaire touché est projeté en arrière et devient **sonné (*dizzy*)** avec des étoiles qui tournoient au-dessus de sa tête pendant 1.2s !
- **K.O. :** 3 baffes bien placées mettent l'adversaire K.O., qui explose en un gros trésor de graines de tournesol !

### 4. Bots Hamsters Équilibrés
- Nombre de bots réduit à **2 bots d'entraînement** pour garder l'arène propre et laisser la place aux vrais joueurs.

### 5. Contrôles Double Écran (Mobile Paysage & PC)
- **Côté Gauche :** Joystick tactile dynamique à 360° pour diriger le hamster.
- **Côté Droit :**
  - Gros bouton **BAFFE ! 🐾** pour asséner le coup de patte bizarre (toucher n'importe où sur la moitié droite déclenche aussi la baffe).
  - Bouton **SPRINT ⚡** pour accélérer.
- **Sur PC / Bureau :**
  - Clavier : **ZQSD** ou **Touches Fléchées**
  - Souris : Déplacement fluide vers le curseur
  - Baffe : **Touche Espace** ou **Clic Gauche**
  - Sprint : **Shift** ou **Clic Droit**

---

## 📱 Installation en tant qu'Application (PWA)

Le jeu est désormais une véritable **Progressive Web App (PWA)** avec icônes haute résolution et Service Worker :
- **Sur Android (Chrome) :**
  - Cliquez sur le bouton **"📲 Installer l'application"** dans le menu du jeu ou via le menu du navigateur (⋮) ➔ **"Installer l'application"** / **"Ajouter à l'écran d'accueil"**.
- **Sur iPhone / iPad (Safari) :**
  - Touchez le bouton **Partager** (⎋) en bas de l'écran ➔ **"Sur l'écran d'accueil"** (➕) ➔ **Ajouter**.
- **Sur PC / Mac (Chrome / Edge / Brave) :**
  - Cliquez sur le bouton **📲** dans la barre supérieure ou sur l'icône d'installation dans la barre d'adresse du navigateur.
  - Le jeu s'ouvre dans sa propre fenêtre autonome en plein écran sans barre d'adresse !

---

## 🌐 Multijoueur En Ligne (Firebase Realtime Database)

Projet configuré : `hamstere-5344d`
- Synchronisation continue via WebSockets
- Prise en compte immédiate des règles de test (`.read: true, .write: true`)
