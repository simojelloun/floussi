# Floussi

Application de comptabilité personnelle, pensée pour le téléphone : dépenses, revenus, budgets, prêts et emprunts, en dirhams, en euros ou dans toute autre devise.

« Floussi » vient de *flouss*, l'argent en darija : *mon argent*.

Floussi est une application web sans serveur ni compte à créer : les données restent sur l'appareil. Elle existe aussi en version installable (Google Play, App Store), dans le dossier `mobile/`.

**Pour modifier ou ajouter une fonctionnalité, lisez d'abord [DEVELOPPEMENT.md](DEVELOPPEMENT.md).**

## Fonctionnalités

- **Opérations** : dépenses, revenus et virements entre comptes, avec recherche et filtres par mois et par type.
- **Plusieurs comptes et devises** : chaque compte a sa devise et sa couleur. Les cours de change sont modifiables, une devise de référence sert aux totaux, et les virements entre devises sont convertis.
- **Catégories et sous-catégories** : icônes, images personnelles et couleurs. Supprimer une catégorie utilisée la fusionne avec une autre.
- **Opérations récurrentes** : loyer, salaire, factures… Chaque échéance apparaît « À payer » et n'est comptée qu'une fois marquée payée (ou automatiquement pour un prélèvement).
- **Calendrier** des opérations et des échéances, avec filtre par compte.
- **Budgets mensuels** par catégorie, avec une alerte à 80 % et en cas de dépassement.
- **Prêts et emprunts** : montant prêté ou emprunté, remboursements partiels, reste dû et échéance.
- **Statistiques** : période libre et choix des comptes, catégories en barres ou en camembert, évolution du solde, revenus et dépenses par mois. Les graphiques s'agrandissent en pinçant.
- **Import CSV** (relevés bancaires, Excel), avec correspondance des colonnes et détection des doublons.
- **Export CSV** pour Excel.
- **Sauvegarde et restauration** complètes dans un fichier `.json`.
- **Trois langues** : français, anglais et arabe, avec mise en page de droite à gauche pour l'arabe (Réglages › Apparence › Langue).
- **Apparence** : thème clair, sombre ou automatique, style classique ou verre liquide, six jeux de couleurs.
- **Accessibilité** : la navigation est pensée pour les lecteurs d'écran (NVDA, TalkBack, VoiceOver). Les gestes (balayer, glisser) ont tous une alternative par bouton. L'appli est structurée en titres et en listes, chaque élément porte une description parlée, les annonces sont vocales, les fenêtres retiennent le focus et chaque graphique a un équivalent textuel.
- **Hors connexion** : une fois ouverte, l'appli fonctionne sans réseau et s'installe sur l'écran d'accueil.

## Mettre l'application en ligne avec GitHub Pages

1. Créez un dépôt sur GitHub, par exemple `flousi`.
2. Déposez-y tous les fichiers de ce dossier, à la racine du dépôt.
3. Dans le dépôt, ouvrez **Settings › Pages**.
4. Sous **Build and deployment**, choisissez **Deploy from a branch**, puis la branche `main` et le dossier `/ (root)`. Enregistrez.
5. Après une minute environ, l'appli est disponible à l'adresse `https://<votre-nom>.github.io/flousi/`.

En ligne de commande :

```bash
git init
git add .
git commit -m "Première version de Floussi"
git branch -M main
git remote add origin https://github.com/<votre-nom>/<votre-depot>.git
git push -u origin main
```

## Installer Floussi sur un téléphone

- **Android (Chrome)** : ouvrez l'adresse de l'appli, puis menu ⋮ › **Installer l'application** (ou **Ajouter à l'écran d'accueil**).
- **iPhone (Safari)** : ouvrez l'adresse, puis bouton Partager › **Sur l'écran d'accueil**.

L'appli s'ouvre alors en plein écran, avec son icône, comme une application classique.

Sur iPhone, ajoutez l'appli depuis l'adresse GitHub Pages dans Safari, et non depuis un autre lien : l'icône est intégrée à la page.

**Attention :** supprimer l'icône de l'écran d'accueil ou effacer les données de Safari **efface aussi les données de Floussi**. Faites d'abord une sauvegarde (Réglages › Sauvegarde) si vous devez le faire.

## Où sont mes données ?

Les données sont enregistrées **dans le navigateur de l'appareil** (`localStorage`). Elles ne sont envoyées nulle part. En conséquence :

- deux appareils n'ont pas les mêmes données. Pour passer de l'un à l'autre, utilisez **Comptes › Sauvegarde et import › Enregistrer une sauvegarde**, puis **Restaurer** sur l'autre appareil ;
- effacer les données du navigateur efface aussi celles de Floussi. **Faites des sauvegardes régulières.**

Au premier lancement, l'appli affiche des données d'exemple. Touchez **Commencer avec mes comptes** pour repartir à zéro.

## Mettre à jour l'appli

Avec le fichier `.github/workflows/verifier-et-publier.yml`, chaque envoi sur la branche `main` lance les tests automatiques ; le site n'est mis en ligne que s'ils réussissent (réglage à faire une fois : *Settings › Pages › Source : GitHub Actions*). Les téléphones reçoivent la nouvelle version à la prochaine ouverture avec Internet. Détails dans [DEVELOPPEMENT.md](DEVELOPPEMENT.md).

## Structure

```
index.html             squelette de la page et liste des fichiers chargés
css/                   styles et polices
js/                    le code, découpé par thème (voir DEVELOPPEMENT.md)
fonts/                 polices intégrées (licence SIL OFL)
sw.js                  fonctionnement hors connexion
manifest.webmanifest   nom, couleurs et icônes pour l'installation
confidentialite.html   politique de confidentialité
*.png, icon.svg        icônes
tests/, outils/        tests automatiques et vérifications (npm test)
mobile/                version installable Android / iPhone (voir mobile/NOTICE.md)
```

## Licence

Aucune licence n'est encore choisie. Si vous souhaitez que d'autres puissent réutiliser le code, ajoutez un fichier `LICENSE` (par exemple MIT) depuis GitHub : **Add file › Create new file**, nommez-le `LICENSE`, puis choisissez un modèle.
