# Flousi

Application de comptabilité personnelle, pensée pour le téléphone : dépenses, revenus, budgets, prêts et emprunts, en dirhams, en euros ou dans toute autre devise.

« Flousi » vient de *flouss*, l'argent en darija : *mon argent*.

Flousi tient dans une seule page web, sans serveur ni compte à créer. Les données restent dans le navigateur de l'appareil.

## Fonctionnalités

- **Opérations** : dépenses, revenus et virements entre comptes, avec recherche et filtres par mois et par type.
- **Plusieurs comptes et devises** : chaque compte a sa devise et sa couleur. Les cours de change sont modifiables, une devise de référence sert aux totaux, et les virements entre devises sont convertis.
- **Catégories et sous-catégories** : icônes, images personnelles et couleurs. Supprimer une catégorie utilisée la fusionne avec une autre.
- **Opérations récurrentes** : loyer, salaire, factures… Chaque échéance est ajoutée automatiquement ou attend votre validation sur l'Accueil.
- **Budgets mensuels** par catégorie, avec une alerte à 80 % et en cas de dépassement.
- **Prêts et emprunts** : montant prêté ou emprunté, remboursements partiels, reste dû et échéance.
- **Statistiques** : période libre et choix des comptes, catégories en barres ou en camembert, évolution du solde, revenus et dépenses par mois. Les graphiques s'agrandissent en pinçant.
- **Import CSV** (relevés bancaires, Excel), avec correspondance des colonnes et détection des doublons.
- **Export CSV** pour Excel.
- **Sauvegarde et restauration** complètes dans un fichier `.json`.
- **Apparence** : thème clair, sombre ou automatique, six jeux de couleurs.
- **Accessibilité** : la navigation est pensée pour les lecteurs d'écran (NVDA, TalkBack, VoiceOver). L'appli est structurée en titres et en listes, chaque élément porte une description parlée, les annonces sont vocales, les fenêtres retiennent le focus et chaque graphique a un équivalent textuel.
- **Hors connexion** : une fois ouverte, l'appli fonctionne sans réseau et s'installe sur l'écran d'accueil.

## Mettre l'application en ligne avec GitHub Pages

1. Créez un dépôt sur GitHub, par exemple `flousi`.
2. Déposez-y tous les fichiers de ce dossier, en gardant le dossier `icons/`.
3. Dans le dépôt, ouvrez **Settings › Pages**.
4. Sous **Build and deployment**, choisissez **Deploy from a branch**, puis la branche `main` et le dossier `/ (root)`. Enregistrez.
5. Après une minute environ, l'appli est disponible à l'adresse `https://<votre-nom>.github.io/flousi/`.

En ligne de commande :

```bash
git init
git add .
git commit -m "Première version de Flousi"
git branch -M main
git remote add origin https://github.com/<votre-nom>/flousi.git
git push -u origin main
```

## Installer Flousi sur un téléphone

- **Android (Chrome)** : ouvrez l'adresse de l'appli, puis menu ⋮ › **Installer l'application** (ou **Ajouter à l'écran d'accueil**).
- **iPhone (Safari)** : ouvrez l'adresse, puis bouton Partager › **Sur l'écran d'accueil**.

L'appli s'ouvre alors en plein écran, avec son icône, comme une application classique.

## Où sont mes données ?

Les données sont enregistrées **dans le navigateur de l'appareil** (`localStorage`). Elles ne sont envoyées nulle part. En conséquence :

- deux appareils n'ont pas les mêmes données. Pour passer de l'un à l'autre, utilisez **Comptes › Sauvegarde et import › Enregistrer une sauvegarde**, puis **Restaurer** sur l'autre appareil ;
- effacer les données du navigateur efface aussi celles de Flousi. **Faites des sauvegardes régulières.**

Au premier lancement, l'appli affiche des données d'exemple. Touchez **Commencer avec mes comptes** pour repartir à zéro.

## Tester sur son ordinateur

Le fonctionnement hors connexion demande que la page soit servie par un serveur web, pas ouverte en double-cliquant sur le fichier :

```bash
python3 -m http.server 8000
```

Ouvrez ensuite <http://localhost:8000>.

## Mettre à jour l'appli

Après une modification de `index.html`, changez le nom du cache dans `sw.js` (par exemple `flousi-v1` → `flousi-v2`). Les téléphones où l'appli est installée chargeront ainsi la nouvelle version.

## Structure

```
index.html             l'application complète (HTML, CSS et JavaScript)
manifest.webmanifest   nom, couleurs et icônes pour l'installation
sw.js                  service worker : fonctionnement hors connexion
icons/                 icône vectorielle et versions PNG (192, 512, masquable, Apple)
```

## Licence

Aucune licence n'est encore choisie. Si vous souhaitez que d'autres puissent réutiliser le code, ajoutez un fichier `LICENSE` (par exemple MIT) depuis GitHub : **Add file › Create new file**, nommez-le `LICENSE`, puis choisissez un modèle.
