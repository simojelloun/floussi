# Floussi — version à installer (Google Play et App Store)

Ce dossier `mobile/` transforme l'application web Floussi (le dossier parent) en une vraie application Android et iPhone, grâce à l'outil gratuit **Capacitor**. Les écrans sont exactement les mêmes que ceux de la version web : le code est copié automatiquement du dossier parent dans `mobile/www/` à chaque préparation ou mise à jour.

## Ce qui change dans la version installée

| | Version web (GitHub) | Version installée |
|---|---|---|
| Enregistrement des données | mémoire du navigateur | mémoire de l'appli **+ un fichier privé** (`floussi/donnees.json`) que le système n'efface jamais |
| Copies de sécurité | 1 par jour, 10 jours, dans le navigateur | idem, **en fichiers** dans l'appli |
| Sauvegarde automatique visible | non (il faut confirmer chaque jour) | **oui, chaque jour, sans rien faire** : iPhone › Fichiers › Sur mon iPhone › Floussi ; Android › Documents › Floussi (14 derniers jours) |
| « Enregistrer la sauvegarde » et « Exporter CSV » | téléchargement | feuille de partage du téléphone (Drive, iCloud, e-mail, WhatsApp…) |
| Photos des tickets | mémoire du navigateur | mémoire de l'appli + fichiers privés, et incluses dans les sauvegardes |
| Fonctionnement hors connexion | oui | oui, aucune connexion Internet utilisée |

Si la mémoire de l'appli est perdue, Floussi relit automatiquement son fichier privé au démarrage. « Tout effacer » (code oublié) supprime aussi ce fichier.

**Important :** la version installée ne voit pas les données de la version web (ce sont deux applications séparées). Pour passer de l'une à l'autre : dans la version web, Réglages › Sauvegarde › Enregistrer une sauvegarde ; dans la version installée, Réglages › Sauvegarde › Restaurer une sauvegarde.

Face ID, Touch ID et l'empreinte digitale fonctionnent dans la version installée grâce au module `@capgo/capacitor-native-biometric` (licence MPL-2.0, utilisé sans modification). Le téléphone fait lui-même la vérification : Floussi ne reçoit que « reconnu » ou « non reconnu ». Les autorisations nécessaires (texte Face ID sur iPhone, permission « biométrie » sur Android) sont ajoutées automatiquement par `scripts/configurer-natif.mjs`.

## Avant tout : deux choix définitifs

Ouvrez `capacitor.config.json` :
- `"appId": "io.github.simojelloun.floussi"` est l'identifiant unique de l'appli sur les stores (App Store : « Bundle ID » ; Google Play : « nom du package »). Il est construit à partir de votre adresse GitHub (simojelloun.github.io), qui vous appartient : aucune autre appli ne peut l'avoir. **Il ne pourra plus changer après la première publication.** Utilisez exactement le même dans App Store Connect et dans la Google Play Console.
- `"appName": "Floussi"` est le nom affiché sous l'icône.

## 1. Installer les outils (une seule fois)

1. **Node.js** version 22 ou plus récente : https://nodejs.org (version « LTS »).
2. **Android Studio** (gratuit) : https://developer.android.com/studio. Au premier lancement, acceptez l'installation des composants proposés.
3. Pour l'iPhone uniquement : un **Mac** avec **Xcode** (gratuit sur le Mac App Store).

## 2. Préparer l'appli Android

Ouvrez un terminal dans ce dossier (`mobile`), puis tapez :

```
npm install
npm run preparer-android
npm run ouvrir-android
```

Android Studio s'ouvre sur le projet. La première fois, il télécharge des éléments pendant quelques minutes (barre en bas de la fenêtre).

## 3. Essayer sur votre téléphone Android

1. Sur le téléphone : Paramètres › À propos › touchez 7 fois « Numéro de build » ; puis Options pour les développeurs › activez « Débogage USB ».
2. Branchez le téléphone en USB et acceptez l'autorisation qui s'affiche.
3. Dans Android Studio, choisissez votre téléphone en haut, puis cliquez sur le bouton ▶ (Run).

## 4. Créer le fichier à envoyer sur Google Play

1. Android Studio › menu **Build › Generate Signed App Bundle or APK…** › **Android App Bundle**.
2. **Create new…** pour créer votre clé de signature (fichier `.jks`). Choisissez un mot de passe solide.
   **Gardez ce fichier et son mot de passe en lieu sûr (et en double)** : sans eux, vous ne pourrez plus publier de mise à jour.
3. Choisissez **release**, puis **Create**. Le fichier `.aab` est créé dans `android/app/release/`.
4. Dans la Play Console : créez l'appli, gardez la « signature d'application Play » proposée par défaut, et déposez le `.aab` dans un **test fermé** (12 testeurs pendant 14 jours avant la publication).
5. Pour la fiche : politique de confidentialité = l'adresse de `confidentialite.html` sur votre site GitHub.

## 5. Publier une mise à jour plus tard

1. Modifiez l'appli dans le dossier parent et vérifiez-la (`npm test` dans le dossier parent).
2. Dans le terminal, dans `mobile` : `npm run mettre-a-jour` (recopie le code et met à jour Android et iPhone).
3. Dans `android/app/build.gradle`, augmentez `versionCode` de 1 (2, 3, 4…) et changez `versionName` (par ex. "1.1").
4. Recréez le fichier `.aab` (étape 4, avec la **même clé**) et déposez-le dans la Play Console.

## 6. iPhone (sur un Mac)

```
npm install
npm run preparer-ios
npm run ouvrir-ios
```

Dans Xcode : cliquez sur **App** › onglet **Signing & Capabilities** › choisissez votre équipe (compte Apple Developer, 99 USD/an). Branchez l'iPhone et cliquez ▶ pour l'essayer. Pour l'App Store : **Product › Archive**, puis **Distribute App**.

Les réglages nécessaires (dossier visible dans Fichiers, autorisation de l'appareil photo pour les tickets) sont ajoutés automatiquement par `scripts/configurer-natif.mjs`.

## Contenu du dossier

- `www/` : copie de l'application web, créée par `npm run copier-web` (ne pas modifier à la main).
- `assets/` : icône et écran de démarrage, déclinés automatiquement dans toutes les tailles.
- `scripts/configurer-natif.mjs` : réglages Android et iPhone ajoutés après la création des projets.
- `scripts/copier-web.mjs` : copie de l'appli web dans `www/`.
- `capacitor.config.json`, `package.json` : configuration.
- Les dossiers `android/`, `ios/` et `node_modules/` sont créés sur votre ordinateur par les commandes ci-dessus.
