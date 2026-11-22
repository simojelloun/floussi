"use strict";
/* ================= devises ================= */
const DEF_CURS = [
  {code: "MAD", name: L("Dirham"), plural: "dirhams", sym: "DH", rate: 1},
  {code: "EUR", name: L("Euro"), plural: "euros", sym: "€", rate: 10.8},
  {code: "USD", name: L("Dollar américain"), plural: "dollars", sym: "$", rate: 9.3}
];
const curOf = c => (S && S.meta.currencies.find(x => x.code === c)) || {code: c, name: c, plural: c, sym: c, rate: 1};
const sym = c => curOf(c).sym;
const plural = c => L(curOf(c).plural);
const base = () => S.meta.base;
const conv = (v, from, to) => from === to ? v : Math.round(v * curOf(from).rate / curOf(to).rate);
const fmt = (c, cur) => NF.format(c / 100) + " " + sym(cur);
const say = (c, cur) => NF.format(c / 100) + " " + plural(cur);

/* ================= catégories : couleurs et icônes ================= */
const COLORS = [["#2a78d6", L("Bleu")], ["#eb6834", L("Orange")], ["#1baf7a", L("Vert d'eau")], ["#eda100", L("Jaune")], ["#e87ba4", L("Rose")],
  ["#008300", L("Vert")], ["#6250d6", L("Violet")], ["#e34948", L("Rouge")], ["#8a6a4a", L("Brun")], ["#6b7a86", L("Gris")]];
/* icônes au trait : Lucide (lucide.dev), licence ISC. L'émoji reste la clé enregistrée dans les données. */
const svgIcon = e => ICON_SVG[e] ? `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON_SVG[e]}</svg>` : "";
const ICON_GROUPS = [["Courses et repas",[["🛒","Chariot"],["🍽️","Repas"],["☕","Café"],["🥖","Boulangerie"],["🍎","Fruits"],["🥦","Légumes"],["🥩","Viande"],["🐟","Poisson"],["🧀","Fromage"],["🥛","Lait"],["🥚","Œufs"],["🍕","Pizza"],["🍔","Burger"],["🥗","Salade"],["🍰","Pâtisserie"],["🍫","Chocolat"],["🍵","Thé"],["🥤","Boisson"],["🍯","Miel"],["🫒","Olives"]]],["Maison",[["🏠","Maison"],["🔑","Clé"],["🛋️","Meuble"],["🛏️","Lit"],["🚿","Douche"],["🧹","Ménage"],["🧺","Lessive"],["🧴","Produits d'entretien"],["🪴","Plante"],["🔨","Bricolage"],["🔧","Réparations"],["🚪","Porte"],["📺","Télévision"],["❄️","Climatisation"],["🔥","Chauffage"],["🏗️","Travaux"]]],["Factures",[["💡","Électricité"],["💧","Eau"],["📱","Téléphone"],["🌐","Internet"],["📡","Satellite"],["🔌","Énergie"],["🗑️","Ordures"],["📮","Courrier"],["🧾","Impôts"],["🛡️","Assurance"],["📄","Documents"],["⚖️","Juridique"],["🔔","Abonnement"],["☁️","Services en ligne"]]],["Transport",[["🚗","Voiture"],["⛽","Carburant"],["🚌","Bus"],["🚆","Train"],["✈️","Avion"],["🚕","Taxi"],["🚇","Métro"],["🚲","Vélo"],["🏍️","Moto"],["🛴","Trottinette"],["🚢","Bateau"],["🅿️","Parking"],["🛣️","Péage"],["🛞","Pneus"],["🚙","Location de voiture"],["🧳","Bagages"]]],["Santé",[["💊","Médicament"],["🩺","Médecin"],["🦷","Dentiste"],["👓","Lunettes"],["🏥","Hôpital"],["💉","Vaccin"],["🩹","Soins"],["🧠","Bien-être"],["🧘","Yoga"],["💆","Massage"]]],["Loisirs",[["🎬","Cinéma"],["🎮","Jeux"],["🎵","Musique"],["⚽","Sport"],["🏋️","Salle de sport"],["🏊","Natation"],["🎨","Art"],["📷","Photo"],["🎭","Théâtre"],["🎤","Concert"],["🎲","Jeux de société"],["🎣","Pêche"],["⛰️","Randonnée"],["🏖️","Plage"],["🏕️","Camping"],["🎪","Sorties"],["🎧","Écouteurs"],["📖","Lecture"],["🧩","Puzzle"],["🎟️","Billets d'entrée"]]],["Achats",[["🛍️","Shopping"],["👗","Vêtements"],["👟","Chaussures"],["👜","Sac"],["💍","Bijoux"],["⌚","Montre"],["💄","Maquillage"],["💇","Beauté"],["💈","Coiffeur"],["🎁","Cadeau"],["💻","Ordinateur"],["🖨️","Imprimante"],["🧸","Jouets"]]],["Famille et études",[["📚","Livres"],["🎓","Études"],["🧒","Enfants"],["👶","Bébé"],["🍼","Biberon"],["🏫","École"],["✏️","Fournitures"],["🎒","Cartable"],["👪","Famille"],["👵","Parents"],["🐾","Animaux"],["🐈","Chat"],["🐕","Chien"],["💒","Mariage"],["🎂","Anniversaire"],["🎉","Fête"]]],["Argent et travail",[["🏦","Banque"],["💼","Travail"],["💰","Argent"],["📈","Placement"],["💳","Carte bancaire"],["🪙","Pièces"],["💵","Billets"],["🏧","Retrait"],["🤝","Prêt"],["📊","Suivi du budget"],["🏢","Entreprise"],["🧑‍💻","Travail indépendant"],["🧑‍🏫","Enseignement"],["🏘️","Loyers perçus"],["💹","Bourse"],["🏆","Récompense"]]],["Voyage et autres",[["🌍","Voyage"],["🏨","Hôtel"],["🗺️","Tourisme"],["🛂","Visa"],["🕌","Religion"],["🕋","Pèlerinage"],["🌙","Ramadan"],["🐑","Aïd"],["❤️","Dons"],["🌱","Jardin"],["⭐","Favori"],["❓","Autre"],["📦","Divers"]]]];
const ICONS = ICON_GROUPS.flatMap(g => g[1]);
const ICON_DEF = {"c-alim":["🛒",0],"c-log":["🏠",6],"c-trans":["🚗",1],"c-fact":["💡",3],"c-sante":["💊",7],"c-lois":["🎬",4],"c-shop":["🛍️",2],
  "c-educ":["📚",5],"c-voy":["✈️",8],"c-div":["📦",9],"r-sal":["💼",5],"r-prime":["🎁",2],"r-autre":["💰",3]};
