# Floussi — passer la validation de l'App Store et de Google Play

Cette fiche complète `NOTICE.md` (qui explique comment fabriquer l'appli). Ici : tout ce que les deux magasins vérifient, ce qui est déjà réglé dans le code, et les textes à copier-coller dans les formulaires.

Avant tout envoi, lancez depuis le dossier principal :

```
node outils/verifier-stores.mjs
```

Tant qu'il affiche « ✗ À corriger », n'envoyez rien.

---

## 1. Ce qui est déjà réglé dans l'appli

| Motif de refus fréquent | Ce que fait Floussi |
|---|---|
| Appli qui n'est qu'un site web emballé (Apple 4.2) | Fonctionne sans Internet, Face ID natif, copie quotidienne dans Fichiers, achats natifs |
| Achat intégré incomplet (Apple 3.1.2) | Prix et durée affichés, renouvellement expliqué, « Restaurer mes achats », liens Conditions et Confidentialité |
| Nom d'une plateforme concurrente dans l'appli (Apple 2.3.10) | Aucun « Android » ni « Google Play » affiché sur iPhone ; aucun lien Apple sur Android |
| Renvoi vers un moyen de payer ou d'avoir Pro ailleurs (Apple 3.1.1) | L'appli ne dit nulle part que le site web est gratuit |
| Autorisations sans explication | Appareil photo, photos, Face ID : texte d'explication en anglais et en français |
| Plantage ou mauvais affichage sur iPad | Appli limitée à l'iPhone, en portrait (donc pas de captures iPad à fournir) |
| Niveau d'API Android trop ancien | Le script porte la cible à Android 16 (API 36) |
| Déclaration de confidentialité Apple | `PrivacyInfo.xcprivacy` fourni : aucune donnée collectée, aucun suivi |
| Compte obligatoire sans suppression possible | Pas de compte ; Réglages › Sauvegarde › « Tout effacer » |
| Relecteur bloqué par un écran vide | Mode « Exemple » avec des données de démonstration dès l'ouverture |

## 2. Ce qu'il vous reste à faire (dans l'ordre)

1. **Remplir votre nom et votre e-mail** dans `confidentialite.html`, `support.html`, `conditions.html` (les textes entre crochets) et `SUPPORT_MAIL` dans `js/pro.js`. Utilisez une adresse que vous lisez : Apple et Google y écrivent.
2. **Mettre le site à jour sur GitHub** et vérifier que ces trois adresses s'ouvrent :
   - https://simojelloun.github.io/floussi/confidentialite.html
   - https://simojelloun.github.io/floussi/support.html
   - https://simojelloun.github.io/floussi/conditions.html
3. **Fabriquer l'appli** (`NOTICE.md`), puis **la tester sur un vrai téléphone** : saisir une opération, fermer et rouvrir, Face ID, photo d'un ticket, sauvegarde, achat de test, « Restaurer mes achats ». Un plantage au premier lancement est le premier motif de refus.
4. **iPhone, une seule fois dans Xcode** : glisser `ios/App/App/PrivacyInfo.xcprivacy` sur le dossier « App » (cocher la cible App) ; ajouter la capacité **In-App Purchase** ; vérifier que « iPad » est décoché dans General › Supported Destinations.
5. Créer les produits Floussi Pro (`NOTICE.md`, section 7) et **les joindre à la première version** : chez Apple, un achat intégré n'est examiné que s'il est envoyé avec une version de l'appli.
6. Remplir les fiches (sections 3 à 6 ci-dessous), puis envoyer.

## 3. Google Play : les étapes propres à Google

**Test fermé obligatoire.** Si votre compte développeur est un compte personnel créé après le 13 novembre 2023, Google exige un test fermé avec **au moins 12 testeurs inscrits pendant 14 jours d'affilée** avant d'autoriser la publication.
- Trouvez 14 ou 15 personnes (famille, collègues, étudiants) : si un testeur se désinscrit et que vous passez sous 12, le compteur repart.
- Demandez-leur d'ouvrir l'appli plusieurs fois pendant les 14 jours.
- Ne changez pas de version pendant le test, sauf bogue grave.
- Au moment de demander la production, Google pose des questions sur le test : notez les retours reçus et ce que vous avez corrigé.

**Formulaires de Play Console (Contenu de l'application)**

| Formulaire | Réponse |
|---|---|
| Règles de confidentialité | https://simojelloun.github.io/floussi/confidentialite.html |
| Accès à l'application | « Toutes les fonctionnalités sont disponibles sans accès spécial » |
| Annonces | Non, l'appli ne contient pas d'annonces |
| Classification du contenu | Questionnaire : catégorie « Utilitaire, productivité… » ; « Non » à toutes les questions (violence, jeux d'argent, etc.) |
| Public cible | **18 ans et plus** uniquement (évite les règles « Familles ») |
| Sécurité des données | « Non » à « Votre appli collecte-t-elle ou partage-t-elle des données utilisateur ? ». Les achats sont traités par Google Play, pas par vous. |
| Fonctionnalités financières | « Mon appli ne propose aucune fonctionnalité financière » : Floussi ne prête pas, ne détient pas d'argent, ne fait pas de paiement, ne conseille pas de placement. C'est un carnet de suivi. |
| Applications gouvernementales, santé, actualités | Non |
| Catégorie | Finance |

## 4. App Store : les étapes propres à Apple

| Champ d'App Store Connect | Réponse |
|---|---|
| Catégorie | Finance (secondaire : Productivité) |
| URL de la politique de confidentialité | https://simojelloun.github.io/floussi/confidentialite.html |
| URL d'assistance | https://simojelloun.github.io/floussi/support.html |
| Confidentialité de l'app | « Aucune donnée collectée » |
| Classification par âge | « Non » ou « Aucun » partout → 4+ |
| Droits sur le contenu | Ne contient pas de contenu tiers |
| Chiffrement (conformité à l'exportation) | Aucun chiffrement propre (déjà déclaré dans l'appli) |
| Connexion requise pour la vérification | Décocher : aucun compte |
| Contrat de licence | Laisser le contrat standard d'Apple |
| Captures d'écran | iPhone 6,9 pouces : 1320 × 2868 pixels, 3 à 6 images |
| Capture pour chaque achat intégré | Une capture de l'écran Floussi Pro |

**Notes pour l'équipe de vérification (à coller en anglais dans « App Review Information › Notes »)**

```
Floussi is a personal expense tracker. All data stays on the device: there is no account, no server, no ads, no analytics. No login is needed.

HOW TO TEST
- On first launch the app opens in "Exemple" (demo) mode with sample data, so every screen has content. Tap "Commencer avec mes comptes" on the Home banner to start with your own data.
- Language: gear icon (top right) > Apparence > Langue: French, English, Spanish, Arabic.

WHAT THE APP DOES NOT DO
- It does not connect to any bank and does not move, hold or lend money.
- "Prêts" (Loans) and "Daret" (a savings circle among family and friends) are only notebooks where the user records amounts lent, borrowed or contributed. No money is transferred by the app and no credit is offered.
- "Zakat" is a simple calculator based on amounts the user types in.

IN-APP PURCHASES
- "Floussi Pro" unlocks advanced tools: floussi_pro_annuel (auto-renewable, 1 year, with a 2-week free trial) and floussi_pro_a_vie (non-consumable, lifetime).
- Paywall: Settings > Floussi Pro. It shows price, period, auto-renewal terms, "Restaurer mes achats" (Restore purchases), Terms of Use (Apple standard EULA) and Privacy Policy links.
- The free version stays fully usable (unlimited transactions, 3 accounts, 2 currencies, 1 budget).

PERMISSIONS
- Camera / Photos: only to attach a receipt photo to a transaction (new transaction > "Plus d'options").
- Face ID: optional app lock (Settings > Verrouillage).
```

## 5. Textes de la fiche — français

**Nom** : `Floussi : budget et dépenses`

**Sous-titre (Apple, 30 caractères max)** : `Dépenses, budgets, épargne`

**Description courte (Google, 80 caractères max)** : `Suivez dépenses, budgets et prêts entre proches. Vos données restent chez vous.`

**Mots-clés (Apple, 100 caractères max)** : `budget,dépenses,comptes,épargne,dirham,euro,daret,zakat,prêt,finances,carnet,argent,revenus`

**Description**

```
Floussi est un carnet de comptes simple et complet pour suivre votre argent au quotidien, en dirhams, en euros ou dans la devise de votre choix.

VOS DONNÉES RESTENT SUR VOTRE TÉLÉPHONE
Pas de compte à créer, pas de publicité, pas de connexion à votre banque. Floussi fonctionne sans Internet. Vous pouvez le verrouiller par code ou par reconnaissance du visage.

SUIVEZ TOUT, SIMPLEMENT
• Dépenses, revenus et virements en quelques secondes
• Plusieurs comptes et plusieurs devises
• Catégories et sous-catégories à votre façon
• Opérations récurrentes : loyer, salaire, abonnements
• Rappel des échéances à payer

COMPRENEZ OÙ PART VOTRE ARGENT
• Statistiques par catégorie avec pourcentages
• Budgets mensuels avec alerte avant dépassement
• Sauvegarde et restauration en un fichier

PENSÉ POUR LA VIE DE TOUS LES JOURS
• Prêts et emprunts entre proches : notez qui doit quoi
• Daret : suivez les tours et les cotisations de votre groupe
• Zakat : une aide au calcul à partir de vos montants
• Français, anglais, espagnol et arabe

FLOUSSI PRO (FACULTATIF)
Floussi est gratuit. Floussi Pro ajoute les statistiques avancées, l'analyse détaillée, les bilans imprimables, les prévisions, les comptes et budgets illimités, les étiquettes, les photos de tickets et la personnalisation. Abonnement annuel renouvelé automatiquement, ou achat unique à vie. Le paiement est débité sur votre compte à la confirmation de l'achat. L'abonnement se renouvelle automatiquement sauf résiliation au moins 24 heures avant la fin de la période. Vous le gérez et le résiliez dans les réglages de votre compte.

Floussi est un outil de suivi personnel. Ce n'est ni une banque, ni un service de prêt, ni un conseil financier : l'appli ne détient pas d'argent et ne fait aucun paiement.

Conditions d'utilisation : https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Confidentialité : https://simojelloun.github.io/floussi/confidentialite.html
```

Sur Google Play, remplacez la ligne « Conditions d'utilisation » par : `https://simojelloun.github.io/floussi/conditions.html`

## 6. Textes de la fiche — anglais

**Name** : `Floussi: Budget & Expenses`

**Subtitle (30)** : `Expenses, budgets, savings`

**Short description (80)** : `Track expenses, budgets and loans among friends. Your data stays on your phone.`

**Keywords (100)** : `budget,expense,tracker,money,savings,dirham,euro,daret,zakat,loan,finance,income,ledger`

**Description**

```
Floussi is a simple yet complete account book to follow your money day to day, in dirhams, euros or any currency you choose.

YOUR DATA STAYS ON YOUR PHONE
No account to create, no ads, no bank connection. Floussi works offline. You can lock it with a passcode or face recognition.

TRACK EVERYTHING, SIMPLY
• Expenses, income and transfers in seconds
• Several accounts and several currencies
• Categories and subcategories your way
• Recurring items: rent, salary, subscriptions
• Reminders for payments that are due

UNDERSTAND WHERE YOUR MONEY GOES
• Statistics by category with percentages
• Monthly budgets with a warning before you go over
• Backup and restore in a single file

MADE FOR EVERYDAY LIFE
• Loans among family and friends: note who owes what
• Daret: follow the turns and contributions of your savings circle
• Zakat: a calculation aid based on your own amounts
• French, English, Spanish and Arabic

FLOUSSI PRO (OPTIONAL)
Floussi is free. Floussi Pro adds advanced statistics, detailed analysis, printable reports, forecasts, unlimited accounts and budgets, tags, receipt photos and personalization. Auto-renewing annual subscription, or one-time lifetime purchase. Payment is charged to your account at confirmation of purchase. The subscription renews automatically unless cancelled at least 24 hours before the end of the period. You manage and cancel it in your account settings.

Floussi is a personal tracking tool. It is not a bank, a lending service or financial advice: the app holds no money and makes no payments.

Terms of Use: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/
Privacy: https://simojelloun.github.io/floussi/confidentialite.html
```

## 7. Pièges à éviter dans les fiches

- Ne citez jamais l'autre magasin ni l'autre système (« aussi sur Android », « disponible sur iPhone ») dans une fiche, une capture ou une vidéo.
- N'écrivez nulle part que la version web est gratuite ou que Pro peut s'obtenir ailleurs.
- Pas de prix dans les captures d'écran ni dans le nom : les prix changent selon les pays.
- Pas de « n° 1 », « la meilleure appli », « gratuit » dans le nom ou le sous-titre.
- Les captures doivent montrer la vraie appli. Utilisez le mode Exemple, sans données personnelles.
- Sur Google Play, n'utilisez pas de cadre d'iPhone autour des captures ; sur l'App Store, pas de cadre de téléphone Android.
- Les vidéos promotionnelles existantes montrent toutes les fonctions comme disponibles : c'est la version Pro. Si vous les utilisez sur une fiche, ajoutez la mention « Certaines fonctions nécessitent Floussi Pro ».
- Répondez vite si Apple ou Google pose une question (messagerie de la console) : un refus n'est pas définitif, on corrige et on renvoie.

## 8. Si l'appli est refusée

Envoyez-moi le message exact du magasin (numéro de règle compris). Les refus les plus probables pour Floussi et leur réponse :

| Message | Réponse |
|---|---|
| Apple 2.1 : achat intégré introuvable | Les produits n'étaient pas joints à la version, ou l'accord « Applications payantes » n'est pas signé |
| Apple 3.1.2 : informations d'abonnement manquantes | Ajouter les liens Conditions et Confidentialité dans la description de la fiche (section 5) |
| Apple 4.2 : fonctionnalité minimale | Répondre en listant : hors connexion, Face ID, Fichiers, achats natifs, sauvegarde |
| Apple 5.1.1 : explication d'autorisation insuffisante | Préciser le texte dans `mobile/scripts/configurer-natif.mjs` |
| Google : prêts personnels | Expliquer que l'écran « Prêts » est un carnet entre proches, sans offre de crédit (déjà dit dans la description) |
| Google : test fermé insuffisant | Relancer 14 jours avec des testeurs réellement actifs |
