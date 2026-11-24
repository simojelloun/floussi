# Floussi — guide de développement

Ce guide explique comment le code est organisé et comment ajouter une fonctionnalité sans rien casser.
L'appli reste **sans serveur et sans compilation** : les fichiers sont servis tels quels (GitHub Pages).

## 1. Organisation des fichiers

```
index.html            squelette de la page + liste des fichiers chargés (dans l'ordre)
css/app.css           tous les styles
css/polices.css       polices intégrées (dossier fonts/)
js/                   le code, découpé par thème (voir tableau)
sw.js                 fonctionnement hors connexion
confidentialite.html  politique de confidentialité
manifest.webmanifest  installation sur l'écran d'accueil
tests/                tests automatiques (navigateur)
outils/               vérifications et petit serveur local
mobile/               version installable Android / iPhone (Capacitor), voir mobile/NOTICE.md
.github/workflows/    tests et mise en ligne automatiques sur GitHub
```

Les fichiers `js/` sont chargés **dans l'ordre de `index.html`** et partagent les mêmes noms (pas de modules) :

| Fichier | Contenu |
|---|---|
| `traductions.js` | textes anglais, espagnol et arabe, indexés par le texte français (données) |
| `langues.js` | langue choisie, fonction `L("texte")` |
| `utilitaires.js` | dates, montants, petites fonctions communes |
| `preferences.js` | réglages de l'appareil (`P`, clé `carnet-prefs`) : thème, langue, couleurs |
| `icones.js` | icônes au trait des catégories (données) |
| `devises-categories.js` | couleurs et groupes d'icônes |
| `donnees.js` | **structure des données `S`, migration, enregistrement** (localStorage, IndexedDB, fichier natif) |
| `calculs.js` | soldes, flux, budgets, prêts |
| `recurrentes.js` | échéances, payée / impayée |
| `vues.js` | écrans : Accueil, Opérations, Calendrier, Comptes, Budgets, Prêts, Statistiques, Bilan, Réglages… |
| `rendu.js` | affichage de l'écran courant, titres, focus |
| `calendrier.js` | calendrier de choix de date |
| `verrouillage.js` | code et Face ID |
| `previsions.js` | solde prévisionnel |
| `listes.js` | listes déroulantes de l'appli et annonces vocales |
| `saisie.js` | fenêtres de saisie (opération, compte, catégorie, prêt, budget…) |
| `import-csv.js` | import de relevés |
| `sauvegarde.js` | sauvegarde, restauration, export |
| `zoom.js` | zoom des graphiques |
| `plein-ecran.js` | graphiques en plein écran |
| `routes.js` | table des écrans (`#accueil` → `vAccueil`) |
| `evenements.js` | clics, saisies, clavier (`data-act="…"`) |
| `gestes.js` | balayer pour supprimer, glisser pour trier |
| `demarrage.js` | lancement de l'appli |

## 2. Les règles d'or

1. **Ne jamais changer l'emplacement des données** : `localStorage` `carnet-comptes-v1` et `carnet-prefs`, base IndexedDB `flousi`, fichier natif `floussi/donnees.json`. Sinon les données des utilisateurs ne sont plus retrouvées. (Vérifié par `npm test`.)
2. **Ajouter des champs aux données, ne jamais en retirer ni en renommer.** Toute nouvelle donnée doit avoir une valeur par défaut dans `migrate()` (`js/donnees.js`), pour que les anciennes sauvegardes s'ouvrent.
3. **Tout texte visible s'écrit `L("texte en français")`** et reçoit sa traduction anglaise, espagnole et arabe dans `js/traductions.js`. (Vérifié par `npm test`.)
4. **Un nouveau fichier `js/` s'ajoute dans `index.html` ET dans `FILES` de `sw.js`.** Le code exécuté au chargement d'un fichier ne doit utiliser que ce qui est défini avant lui. (Vérifié par `npm test`.)
5. **Toute action passe par `data-act="…"`** et se traite dans `js/evenements.js` : pas de `onclick` dans le HTML.
6. **Accessibilité** : chaque bouton a un texte ou un `aria-label`, chaque geste a un équivalent par bouton, les messages importants passent par `announce()`.
7. **Lancer `npm test` avant chaque mise en ligne.** Sur GitHub, c'est automatique, et le site n'est pas mis en ligne si un test échoue.

## 3. Ajouter une fonctionnalité, pas à pas

1. Repérer le fichier concerné dans le tableau ci-dessus (un nouvel écran : une fonction `vMonEcran()` dans `vues.js`, puis une ligne dans `routes.js` et dans `TITLES`).
2. Écrire le code et les styles (`css/app.css`).
3. Ajouter les textes dans `js/traductions.js`.
4. Si de nouvelles données sont enregistrées : valeur par défaut dans `migrate()`.
5. Ajouter un test dans `tests/` (copier un test existant).
6. `npm test`, puis envoyer sur GitHub.
7. Facultatif : augmenter `VERSION` dans `sw.js` pour nettoyer les anciens caches.

## 4. Tester sur son ordinateur

Une seule fois : installer [Node.js](https://nodejs.org) (version 22 ou plus), puis dans ce dossier :

```
npm install
npx playwright install chromium
```

Ensuite :

- `npm test` : toutes les vérifications (une trentaine de secondes).
- `npm run test:rapide` : seulement les vérifications sans navigateur (traductions, ordre des fichiers, emplacements des données).
- `npm run serveur` : ouvre l'appli sur http://localhost:8080 pour l'essayer.

Ce que les tests vérifient : chaque écran s'affiche sans erreur en français, anglais, espagnol et arabe ; saisie d'opérations (sous-catégories, virement entre devises, répartition, modèles, étiquettes, photo, alerte de budget) ; récurrentes payées / impayées et calendrier ; enregistrement, reprise depuis la copie de secours, sauvegarde / restauration, ouverture d'anciennes données ; version installée simulée ; recherche, statistiques, bilan.

## 5. Mise en ligne

- **GitHub** : envoyer les fichiers sur la branche `main`. Le fichier `.github/workflows/verifier-et-publier.yml` lance les tests puis met le site en ligne s'ils réussissent. À régler une fois : *Settings › Pages › Source : GitHub Actions*. L'onglet **Actions** du dépôt montre le résultat (✓ vert ou ✗ rouge, avec le détail).
- **Téléphones** : voir `mobile/NOTICE.md` (`npm run mettre-a-jour` dans `mobile/`).

## 6. Format des données (résumé)

`S = {meta, months}`. `meta` : devises, comptes, catégories, budgets, prêts, récurrences, modèles. `months["AAAA-MM"].items` : opérations du mois.
Une opération : `{id, t: "dep"|"rev"|"vir"|"pret", amt (centimes), acc, cat, date, note, …}`. Une échéance récurrente payée est l'opération d'identifiant `r-<récurrence>-<date>`.
