"use strict";
/* Table des écrans : nom dans l'adresse (#accueil, #operations…) -> fonction qui dessine l'écran.
   Ce fichier est chargé après tous les fichiers qui définissent des écrans. Pour ajouter un écran :
   écrire sa fonction vXxx(), puis l'ajouter ici et dans TITLES (js/vues.js). */
const VIEWS = {daret: vDaret, zakat: vZakat, verrouillage: vVerrouillage, accueil: vAccueil, operations: vOperations, recurrentes: vRecurrentes, prets: vPrets, budgets: vBudgets, stats: vStats, comptes: vComptes, reglages: vReglages, devises: vDevises, categories: vCategories, apparence: vApparence, donnees: vDonnees, transfert: vTransfert, bilan: vBilan, modeles: vModeles};
