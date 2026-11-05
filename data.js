// =====================================================================
//  Données du planning. C'est le seul fichier à modifier pour changer
//  les dates : le reste de l'appli se met à jour tout seul.
//  Dates au format AAAA-MM-JJ.
// =====================================================================

const CATEGORIES = {
  jeu:      { label: "Projet bachelor (jeu)", color: "jeu" },
  memoire:  { label: "Mémoire",               color: "memoire" },
  groupe:   { label: "Projet de groupe",      color: "groupe" },
  perso:    { label: "Projets perso",         color: "perso" },
  cours:    { label: "Cours",                 color: "cours" },
  tampon:   { label: "Tampon imprévus",       color: "tampon" },
  vie:      { label: "Vie perso",             color: "vie" },
  repos:    { label: "Repos",                 color: "repos" },
};

// ---------------------------------------------------------------------
//  Semaine type. 1 = lundi ... 6 = samedi, 0 = dimanche.
//  "focus" sur le mercredi matin = la priorité de la semaine (voir SEMAINES).
// ---------------------------------------------------------------------
const SEMAINE_TYPE = {
  1: [
    { debut: "09:30", fin: "12:00", cat: "jeu",     titre: "Projet bachelor (jeu)" },
    { debut: "14:00", fin: "16:30", cat: "jeu",     titre: "Projet bachelor (jeu)" },
  ],
  2: [
    { debut: "09:30", fin: "12:00", cat: "memoire", titre: "Mémoire" },
    { debut: "14:00", fin: "16:30", cat: "memoire", titre: "Mémoire" },
  ],
  3: [
    { debut: "09:30", fin: "12:00", cat: "focus",   titre: "Priorité de la semaine" },
    { debut: "14:00", fin: "16:30", cat: "tampon",  titre: "Tampon imprévus, sinon projets perso (2h)" },
  ],
  4: [
    { debut: "09:30", fin: "12:00", cat: "groupe",  titre: "Journée avec le groupe" },
    { debut: "14:00", fin: "16:30", cat: "groupe",  titre: "Journée avec le groupe" },
  ],
  5: [
    { debut: "09:30", fin: "11:30", cat: "perso",   titre: "Projets perso (2h)" },
  ],
  6: [
    { debut: "matin",   cat: "vie", titre: "Courses" },
    { debut: "après-midi", cat: "vie", titre: "Tâches ménagères" },
  ],
  0: [
    { debut: "libre", cat: "repos", titre: "Journée libre (2h de perso en option)" },
  ],
};

// Vendredis avec cours de Spé : la journée devient "Cours" et, pour garder
// les 4h de perso sans ajouter d'heures, le mardi après-midi passe en perso.
const VENDREDIS_SPE = [
  ["2026-11-06", "Cours de Spé 1/9"],
  ["2026-11-13", "Cours de Spé 2/9"],
  ["2026-11-20", "Cours de Spé 3/9"],
  ["2026-11-27", "Cours de Spé 4/9"],
  ["2026-12-04", "Cours de Spé 5/9"],
  ["2026-12-11", "Cours de Spé 6/9"],
  ["2027-02-05", "Cours de Spé 7/9"],
  ["2027-02-12", "Cours de Spé 8/9"],
  ["2027-02-19", "Cours de Spé 9/9"],
];

// Périodes de repos complet (aucun travail affiché).
const REPOS = [
  { du: "2026-12-24", au: "2027-01-02", titre: "Vacances : repos complet" },
];

// Fermeture de l'école (on peut travailler, mais pas de cours).
const FERMETURES = [
  { du: "2026-12-24", au: "2027-01-08", titre: "École fermée (hiver)" },
];

// ---------------------------------------------------------------------
//  Échéances et rendez-vous. a_confirmer: true = date pas encore sûre.
// ---------------------------------------------------------------------
const ECHEANCES = [
  { date: "2026-11-26", heure: "13:30", cat: "perso",   titre: "Présentation des projets perso (Solo Rhyme + jeu de cartes)", lieu: "Salle Leman" },
  { date: "2026-12-17", heure: "09:30", cat: "jeu",     titre: "F3 Présentation Advanced Specialised Project (le jeu)" },
  { date: "2026-12-18", heure: "09:30", cat: "memoire", titre: "Présentation notée de l'état de l'art", a_confirmer: true, note: "Le prof l'indique le 18 déc, le calendrier école le 8 janv." },
  { date: "2026-12-18", heure: "23:59", cat: "jeu",     titre: "F3 Rendu Advanced Specialised Project (le jeu)" },
  { date: "2027-01-08", heure: "09:30", cat: "memoire", titre: "F1.2 Présentation orale : état de l'art", a_confirmer: true, note: "Tombe pendant la fermeture de l'école : probablement remplacé par le 18 déc." },
  { date: "2027-01-14", heure: "11:10", cat: "groupe",  titre: "Milestone groupe : suivi Project Commun" },
  { date: "2027-01-15", heure: "09:30", cat: "memoire", titre: "Rendu du Major Project Proposal (Portfolio Creative Studio 3)" },
  { date: "2027-01-29", heure: "09:30", cat: "memoire", titre: "F1.3 Présentation orale : méthodologie" },
  { date: "2027-02-18", heure: "23:59", cat: "memoire", titre: "F2.1 Présentation orale : sondages et interviews" },
  { date: "2027-02-26", heure: "23:59", cat: "jeu",     titre: "Rendu final Advanced Specialised Project (le jeu)" },
  { date: "2027-03-12", heure: "09:30", cat: "cours",   titre: "Cours 6 : soutenance" },
  { date: "2027-04-23", heure: "09:30", cat: "memoire", titre: "F2.2 Présentation orale : résultats, analyse et conclusion" },
  { date: "2027-04-30", heure: "09:30", cat: "memoire", titre: "F4 Simulation de la soutenance" },
];

// ---------------------------------------------------------------------
//  Semaines : la priorité et un conseil. Clé = date du lundi.
// ---------------------------------------------------------------------
const SEMAINES = {
  "2026-11-02": { focus: "jeu",     conseil: "Reprise en douceur. Commence à rassembler les sources de l'état de l'art." },
  "2026-11-09": { focus: "memoire", conseil: "État de l'art : sources principales et inspirations." },
  "2026-11-16": { focus: "perso",   conseil: "Prépare la présentation perso du 26 novembre, sans y passer plus que tes heures perso." },
  "2026-11-23": { focus: "jeu",     conseil: "Présentation perso jeudi 13h30. Le reste de la semaine reste normal." },
  "2026-11-30": { focus: "memoire", conseil: "Vise un premier jet complet de l'état de l'art." },
  "2026-12-07": { focus: "jeu",     conseil: "Prépare la présentation du jeu du 17. Termine l'état de l'art si c'est bien le 18." },
  "2026-12-14": { focus: "jeu",     conseil: "Grosse semaine : présentation du jeu jeudi, état de l'art et rendu vendredi. Projets perso au strict minimum, rien de nouveau dans le groupe." },
  "2026-12-21": { focus: "jeu",     conseil: "Trois jours calmes pour ranger, puis repos complet dès le 24." },
  "2026-12-28": { focus: "repos",   conseil: "Repos. Rien à faire." },
  "2027-01-04": { focus: "groupe",  conseil: "École fermée mais tu peux travailler : stabilisation du groupe et Major Project Proposal." },
  "2027-01-11": { focus: "memoire", conseil: "Milestone groupe jeudi 11h10, Proposal vendredi 9h30. Rien d'autre de lourd." },
};

// ---------------------------------------------------------------------
//  Journées particulières (remplacent la semaine type ce jour-là).
// ---------------------------------------------------------------------
const JOURS = {
  "2026-11-05": [
    { debut: "09:30", fin: "12:00", cat: "groupe", titre: "Journée avec le groupe" },
    { debut: "14:00", fin: "16:30", cat: "repos",  titre: "Pas de groupe cet après-midi : repos, ou un peu de sources pour l'état de l'art si tu en as envie" },
  ],
  "2026-11-26": [
    { debut: "09:30", fin: "12:00", cat: "groupe", titre: "Journée avec le groupe" },
    { debut: "13:30", fin: "",      cat: "perso",  titre: "Présentation des projets perso", lieu: "Salle Leman" },
  ],
  "2026-12-17": [
    { debut: "09:30", fin: "16:30", cat: "jeu", titre: "Présentation du jeu (Advanced Specialised Project)" },
  ],
  "2026-12-18": [
    { debut: "09:30", fin: "",      cat: "memoire", titre: "Présentation de l'état de l'art (à confirmer)" },
    { debut: "",      fin: "23:59", cat: "jeu",     titre: "Rendu du jeu avant 23h59" },
  ],
  "2027-01-14": [
    { debut: "09:30", fin: "11:10", cat: "groupe", titre: "Derniers réglages" },
    { debut: "11:10", fin: "",      cat: "groupe", titre: "Milestone : suivi Project Commun" },
    { debut: "14:00", fin: "16:30", cat: "repos",  titre: "Après-midi léger" },
  ],
  "2027-01-15": [
    { debut: "09:30", fin: "",      cat: "memoire", titre: "Rendu du Major Project Proposal" },
  ],
};

// ---------------------------------------------------------------------
//  Tâches concrètes à cocher. "pour" = date visée (avec de la marge),
//  "echeance" = la vraie date limite. L'id ne doit jamais changer
//  (c'est lui qui garde la coche sur le téléphone).
// ---------------------------------------------------------------------
const TACHES = [
  { id: "mem-sources",     cat: "memoire", pour: "2026-11-13", echeance: "2026-12-18", titre: "État de l'art : liste des sources principales" },
  { id: "jeu-demo-17",     cat: "jeu",     pour: "2026-11-23", echeance: "2026-12-17", titre: "Jeu : décider ce que tu montres le 17 décembre" },
  { id: "perso-pres",      cat: "perso",   pour: "2026-11-25", echeance: "2026-11-26", titre: "Préparer la présentation perso (Solo Rhyme + jeu de cartes)" },
  { id: "mem-inspi",       cat: "memoire", pour: "2026-11-27", echeance: "2026-12-18", titre: "État de l'art : inspirations et modèles d'analyse" },
  { id: "mem-jet",         cat: "memoire", pour: "2026-12-04", echeance: "2026-12-18", titre: "État de l'art : premier jet complet" },
  { id: "jeu-version",     cat: "jeu",     pour: "2026-12-09", echeance: "2026-12-17", titre: "Jeu : version présentable" },
  { id: "mem-support",     cat: "memoire", pour: "2026-12-11", echeance: "2026-12-18", titre: "État de l'art : support de présentation" },
  { id: "jeu-support",     cat: "jeu",     pour: "2026-12-15", echeance: "2026-12-17", titre: "Jeu : support de présentation" },
  { id: "jeu-rendu-f3",    cat: "jeu",     pour: "2026-12-18", echeance: "2026-12-18", titre: "Jeu : déposer le rendu F3" },
  { id: "prop-plan",       cat: "memoire", pour: "2027-01-06", echeance: "2027-01-15", titre: "Major Project Proposal : plan" },
  { id: "grp-stab",        cat: "groupe",  pour: "2027-01-13", echeance: "2027-01-14", titre: "Groupe : stabilisation avant la milestone" },
  { id: "prop-redac",      cat: "memoire", pour: "2027-01-12", echeance: "2027-01-15", titre: "Major Project Proposal : rédaction" },
  { id: "prop-rendu",      cat: "memoire", pour: "2027-01-14", echeance: "2027-01-15", titre: "Major Project Proposal : relecture et rendu" },
];

// Petit rappel, affiché sur les jeudis.
const INFO_JEUDI = "Permanence mémoires 10h-18h (rendez-vous avec le prof possible)";

window.PLANNING = {
  CATEGORIES, SEMAINE_TYPE, VENDREDIS_SPE, REPOS, FERMETURES,
  ECHEANCES, SEMAINES, JOURS, INFO_JEUDI, TACHES,
};
