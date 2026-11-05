# Règles pour Claude

## Le projet
Planning de l'année 2026-2027 d'un étudiant en 3e année de bachelor Game Programming,
sous forme de PWA publiée sur https://trijeux.github.io/Calendrier-de-Vie/ (GitHub Pages, branche `main`, racine).

## Comment travailler
- Réponds en français, simplement et concrètement.
- **Pousse directement sur `main`, sans pull request** (demande explicite de l'utilisateur, 05/11/2026).
- Avant de pousser, vérifie l'appli dans un navigateur à la taille d'un téléphone (aucune erreur console).
- Les dates et le contenu du planning sont tous dans `data.js`. Le reste (`app.js`, `style.css`) ne change que pour une nouvelle fonctionnalité.
- Quand tu changes des fichiers mis en cache, augmente la version `CACHE` dans `sw.js`.
- Les choses sans date (en attente, à ne pas oublier) vont dans `RAPPELS` de `data.js` : elles s'affichent tous les jours sur l'écran Aujourd'hui. Ajoute-en ou retire-en quand l'utilisateur le demande ou quand l'info arrive.
- Deux choses prévues en même temps vont dans `CONFLITS` de `data.js` (section Conflits de l'écran Aujourd'hui). Signale chaque nouveau conflit à l'utilisateur et retire-le une fois réglé.
- `coches.json` est écrit par l'appli (coches de l'utilisateur, via son jeton GitHub) : ne le modifie pas à la main, et fais toujours `git pull` avant de pousser. Le journal des imprévus reste sur le téléphone : l'utilisateur l'envoie dans la conversation.
- Ne change jamais l'`id` d'une tâche existante dans `TACHES` (sinon la coche est perdue sur le téléphone).

## Priorités de l'utilisateur
- Il est déjà à la limite : le repos et la marge pour les imprévus passent avant tout.
- Si une semaine est trop chargée, propose d'alléger, jamais d'ajouter des heures. Pas de travail le soir.
- Rappelle les échéances proches quand c'est utile.
- Il envoie des résumés « Calendrier de Vie : point du … » depuis l'onglet Journal : imprévus, nouvelles infos, tâches faites, retards. Mets `data.js` à jour en conséquence.

## Projets
- Priorité 1 (à égalité) : projet bachelor = jeu façon Pokémon Snap (« Advanced Specialised Project ») + mémoire (« Major Project »), et projet de groupe (« Project Commun », sprints de 2 semaines + 1 semaine de stabilisation avant chaque milestone, rendus jeudi ou vendredi).
- Priorité 2 : projets perso (Solo Rhyme + jeu de cartes), présentés chaque mois, minimum 4h par semaine.
- Rendez-vous avec le prof du mémoire : uniquement le jeudi (permanence 10h-18h, visio ou Octagone).

## Semaine type
- Lun-mer : 9h30-12h et 14h-16h30, avec stand-up du groupe à 9h30 (~15 min). Mer : playtest avec les artistes après le stand-up. Mar après-midi : build du groupe (l'important du sprint doit être fini avant, surtout avant une MS review). Mer après-midi : tampon imprévus + 2h de perso.
- Jeu : journée avec le groupe. Ven : cours à l'Octagone (Spé), sinon 2h de perso.
  Les semaines avec cours le vendredi, les 2h de perso passent au mardi après-midi.
- Sam : courses le matin, ménage l'après-midi. Dim : libre (2h de perso en option).
- Imprévus fréquents (famille, grand-mère).

## Projet de groupe (planning reçu le 05/11/2026)
- Reviews le jeudi (sauf exceptions) : MS1 05/11, SP3 ven 20/11 (distance), SP4 03/12 (distance), SP5 17/12 (distance), MS2 mer 23/12, SP6 14/01, SP7 04/02, MS3 11/02, SP8 25/02, SP9 11/03, SP10 25/03, SP11 08/04, MS4 15/04, SP12 29/04, SP13 13/05, SP14 27/05, SP15 10/06, MS5 17/06.
- Semaine STAB avant chaque MS. SP6 (24/12 au 14/01) = sprint vacances, léger.

## Infos en attente (au 05/11/2026)
- Date de la présentation de l'état de l'art : ven 18 déc 2026 (agenda du prof) ou ven 8 janv 2027 (calendrier école, mais école fermée).
- Indisponible du 24 déc 2026 au 2 janv 2027. École fermée jusqu'au 8 janv.
