(() => {
  const P = window.PLANNING;
  const JOURS_NOMS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
  const MOIS_NOMS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

  // ---------- Dates ----------
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const parse = (s) => { const [y, m, j] = s.split("-").map(Number); return new Date(y, m - 1, j); };
  const ajoute = (d, n) => { const r = new Date(d); r.setDate(r.getDate() + n); return r; };
  const lundi = (d) => ajoute(d, -((d.getDay() + 6) % 7));
  const aujourdhui = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
  const ecart = (a, b) => Math.round((b - a) / 86400000);
  const dans = (s, p) => s >= p.du && s <= p.au;
  const majuscule = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const dateLongue = (d) => majuscule(`${JOURS_NOMS[d.getDay()]} ${d.getDate()} ${MOIS_NOMS[d.getMonth()]}`);
  const MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];
  const dateCourte = (s) => { const d = parse(s); return `${JOURS_NOMS[d.getDay()].slice(0, 3)}. ${d.getDate()} ${MOIS_COURTS[d.getMonth()]}`; };
  // "09:30" -> "9h30", "12:00" -> "12h"
  const heure = (h) => {
    if (!h || !/^\d\d:\d\d$/.test(h)) return h || "";
    const [a, b] = h.split(":");
    return `${Number(a)}h${b === "00" ? "" : b}`;
  };

  const speSet = new Map(P.VENDREDIS_SPE);
  const TACHES = P.TACHES || [];
  const ECHEANCES = P.ECHEANCES.map((e) => ({ ...e, id: `ech-${e.date}-${e.heure || ""}` }));
  const echeancesDu = (s) => ECHEANCES.filter((e) => e.date === s);
  const semaineDe = (d) => P.SEMAINES[iso(lundi(d))];
  const labelCat = (c) => (P.CATEGORIES[c] ? P.CATEGORIES[c].label : c);

  // ---------- État enregistré sur le téléphone ----------
  const CLE = "cdv-etat-v1";
  let etat = { faits: {}, journal: [] };
  try { etat = { ...etat, ...JSON.parse(localStorage.getItem(CLE) || "{}") }; } catch (e) { /* stockage indisponible */ }
  const ecrireLocal = () => { try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch (e) { /* rien */ } };
  const sauver = () => { ecrireLocal(); };
  const sauverCoches = () => { etat.maj = Date.now(); ecrireLocal(); planifierSync(); };

  // ---------- Sauvegarde sur GitHub ----------
  // Le jeton reste sur le téléphone. Seules les coches sont enregistrées
  // (coches.json dans le repo de l'appli), quelques secondes après le dernier
  // changement. Le journal des imprévus reste uniquement sur le téléphone.
  const CLE_SYNC = "cdv-sync-v1";
  let sync = { repo: "Trijeux/Calendrier-de-Vie", jeton: "" };
  try { sync = { ...sync, ...JSON.parse(localStorage.getItem(CLE_SYNC) || "{}") }; } catch (e) { /* rien */ }
  let statutSync = "";
  let minuterie = null;
  let shaDistant = null;
  const syncActive = () => !!(sync.jeton && sync.repo);
  const b64 = (t) => { const o = new TextEncoder().encode(t); let s2 = ""; o.forEach((c) => { s2 += String.fromCharCode(c); }); return btoa(s2); };
  const deb64 = (b) => new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\n/g, "")), (c) => c.charCodeAt(0)));
  const api = (chemin, opts = {}) => fetch(`https://api.github.com/repos/${sync.repo}/contents/${chemin}`, {
    ...opts,
    cache: "no-store",
    headers: { Authorization: `Bearer ${sync.jeton}`, Accept: "application/vnd.github+json", ...(opts.headers || {}) },
  });
  const majStatut = (t) => { statutSync = t; const e = document.getElementById("statut-sync"); if (e) e.textContent = t; };

  async function lireDistant() {
    const r = await api("coches.json");
    if (r.status === 404) { shaDistant = null; return null; }
    if (!r.ok) throw new Error(`GitHub a répondu ${r.status}`);
    const j = await r.json();
    shaDistant = j.sha;
    return JSON.parse(deb64(j.content));
  }

  async function envoyerDistant() {
    const corps = { message: `Mise à jour depuis l'appli (${new Date().toLocaleString("fr-CH")})`, content: b64(JSON.stringify({ maj: etat.maj, faits: etat.faits }, null, 2)) };
    if (shaDistant) corps.sha = shaDistant;
    let r = await api("coches.json", { method: "PUT", body: JSON.stringify(corps) });
    if (r.status === 409 || r.status === 422) { // version changée entre-temps : on relit et on réessaie
      await lireDistant();
      if (shaDistant) corps.sha = shaDistant;
      r = await api("coches.json", { method: "PUT", body: JSON.stringify(corps) });
    }
    if (!r.ok) throw new Error(`GitHub a répondu ${r.status}`);
    shaDistant = (await r.json()).content.sha;
  }

  async function synchroniser() {
    if (!syncActive()) return;
    majStatut("Synchronisation…");
    try {
      const distant = await lireDistant();
      if (distant && (distant.maj || 0) > (etat.maj || 0)) {
        etat = { ...etat, faits: distant.faits || {}, maj: distant.maj };
        ecrireLocal();
        rendre();
      } else if (!distant || (etat.maj || 0) > (distant.maj || 0)) {
        await envoyerDistant();
      }
      majStatut(`Sauvegardé sur GitHub à ${new Date().toLocaleTimeString("fr-CH", { hour: "2-digit", minute: "2-digit" })}`);
    } catch (e) {
      majStatut(`Pas sauvegardé : ${e.message}. Nouvel essai au prochain changement.`);
    }
  }

  function planifierSync() {
    if (!syncActive()) return;
    majStatut("Changement à sauvegarder…");
    clearTimeout(minuterie);
    minuterie = setTimeout(synchroniser, 4000);
  }
  const fait = (id) => !!etat.faits[id];
  const basculer = (id) => { if (etat.faits[id]) delete etat.faits[id]; else etat.faits[id] = iso(aujourdhui()); sauverCoches(); rendre(); };

  const TYPES = {
    famille: "Imprévu : famille",
    sante:   "Imprévu : santé / fatigue",
    autre:   "Imprévu : autre",
    info:    "Nouvelle info pour le planning",
  };
  const DUREES = { heures: "1 à 2 heures", demi: "Une demi-journée", journee: "Toute la journée" };
  const POIDS_DUREE = { heures: 1, demi: 2, journee: 3 };
  const estImprevu = (j) => j.type !== "info";
  const journalDu = (s) => etat.journal.filter((j) => j.date === s);

  // ---------- Contenu d'une journée ----------
  function journee(d) {
    const s = iso(d);
    const repos = P.REPOS.find((p) => dans(s, p));
    if (repos) return { blocs: [{ debut: "", cat: "repos", titre: repos.titre }], notes: [], repos: true };

    const notes = [];
    const fermeture = P.FERMETURES.find((p) => dans(s, p));
    if (fermeture) notes.push(fermeture.titre);

    let blocs;
    if (P.JOURS[s]) {
      blocs = P.JOURS[s].map((b) => ({ ...b }));
    } else if (speSet.has(s)) {
      blocs = (P.HORAIRES_ECOLE || [["09:30", "16:30"]]).map(([debut, fin]) => ({ debut, fin, cat: "cours", titre: speSet.get(s), lieu: "Octagone" }));
    } else {
      blocs = (P.SEMAINE_TYPE[d.getDay()] || []).map((b) => ({ ...b }));
      // Mardi d'une semaine avec cours de Spé le vendredi : l'après-midi passe en perso.
      if (d.getDay() === 2 && speSet.has(iso(ajoute(d, 3)))) {
        blocs = blocs.map((b) => (b.debut === "14:00"
          ? { debut: "14:00", fin: "16:00", cat: "perso", titre: "Projets perso (2h, vendredi pris par les cours)" }
          : b));
      }
    }

    // Jour de review du groupe (sprint ou milestone) : horaires de l'école, avec les profs.
    const review = !P.JOURS[s] && ECHEANCES.find((e) => e.date === s && e.cat === "groupe" && /review/i.test(e.titre));
    if (review && !speSet.has(s)) {
      const [[a1, f1], [a2, f2]] = P.HORAIRES_ECOLE || [["09:30", "12:30"], ["13:30", "16:30"]];
      blocs = [
        { debut: a1, fin: f1, cat: "groupe", titre: `${review.titre.replace(" (groupe)", "").replace("(groupe, ", "(")} · avec les profs` },
        { debut: a2, fin: f2, cat: "groupe", titre: "Projet commun (avec les profs)" },
      ];
    }

    const sem = semaineDe(d);
    blocs = blocs.map((b) => {
      if (b.cat !== "focus") return b;
      const f = sem && sem.focus && sem.focus !== "repos" ? sem.focus : "jeu";
      return { ...b, cat: f, titre: `Priorité de la semaine : ${labelCat(f)}` };
    });

    if (d.getDay() === 2 && !fermeture && P.INFO_MARDI) notes.push(P.INFO_MARDI);
    if (d.getDay() === 4 && !fermeture) notes.push(P.INFO_JEUDI);
    return { blocs, notes, repos: false };
  }

  // ---------- Jauge de charge ----------
  // Échéance = 2 points (1 si à confirmer), tâche prévue non faite = 1,
  // imprévu = 1 à 3 selon la durée. Une valeur "charge" dans SEMAINES force le niveau.
  function charge(debutSemaine) {
    const a = iso(debutSemaine), z = iso(ajoute(debutSemaine, 6));
    const dansSem = (s) => s >= a && s <= z;
    if (P.REPOS.some((p) => p.du <= a && p.au >= z)) return { niveau: "repos", label: "Repos", score: 0 };
    let score = 0;
    ECHEANCES.filter((e) => dansSem(e.date)).forEach((e) => { score += e.a_confirmer ? 1 : 2; });
    TACHES.filter((t) => dansSem(t.pour) && !fait(t.id)).forEach(() => { score += 1; });
    etat.journal.filter((j) => estImprevu(j) && dansSem(j.date)).forEach((j) => { score += POIDS_DUREE[j.duree] || 1; });
    const force = (P.SEMAINES[a] || {}).charge;
    const niveau = force || (score <= 3 ? "leger" : score <= 6 ? "charge" : "trop");
    const label = { leger: "Semaine légère", charge: "Semaine chargée", trop: "Semaine trop chargée", repos: "Repos" }[niveau];
    return { niveau, label, score };
  }
  const CONSEIL_ROUGE = "Pour alléger : projets perso au minimum (4h), pas de nouvelle feature dans le groupe, ne commence rien de nouveau. On rattrape sur le tampon du mercredi, jamais le soir.";

  function jaugeEl(c) {
    const box = el("div", `jauge jauge-${c.niveau}`);
    const ligne = el("div", "jauge-ligne");
    ligne.append(el("span", "jauge-label", c.label));
    const barre = el("span", "jauge-barre");
    const plein = el("span", "jauge-plein");
    plein.style.width = `${Math.min(100, Math.round((c.score / 9) * 100))}%`;
    barre.append(plein);
    ligne.append(barre);
    box.append(ligne);
    if (c.niveau === "trop") box.append(el("p", "jauge-conseil", CONSEIL_ROUGE));
    return box;
  }

  // ---------- Le plus urgent ----------
  function urgentes(ref) {
    const r = iso(ref), horizon = iso(ajoute(ref, 7));
    return TACHES
      .filter((t) => !fait(t.id) && t.pour <= horizon && t.echeance >= r)
      .sort((x, y) => {
        const rx = x.pour < r ? 0 : 1, ry = y.pour < r ? 0 : 1;
        return rx - ry || x.echeance.localeCompare(y.echeance) || x.pour.localeCompare(y.pour);
      });
  }

  // ---------- Conseils après un imprévu ----------
  function conseilsImprevu(j) {
    const d = parse(j.date);
    const out = [];
    if (j.type === "sante") out.push("Repose-toi d'abord. Une journée de repos maintenant coûte moins cher qu'un épuisement.");
    const finSemaine = iso(ajoute(lundi(d), 6));
    const mercredi = ajoute(lundi(d), 2);
    const aProteger = TACHES.filter((t) => !fait(t.id) && t.echeance >= j.date && t.pour <= iso(ajoute(d, 7)))
      .sort((x, y) => x.echeance.localeCompare(y.echeance) || x.pour.localeCompare(y.pour));
    const semaineTaches = TACHES.filter((t) => !fait(t.id) && t.pour >= j.date && t.pour <= finSemaine)
      .sort((x, y) => y.echeance.localeCompare(x.echeance));

    if (j.duree === "heures") {
      out.push("Pas besoin de rattraper : c'est à ça que sert la marge.");
    } else if (iso(mercredi) > j.date) {
      out.push("Rattrape seulement ce qui compte sur le tampon de mercredi après-midi. Pas le soir, pas le week-end.");
    } else if (semaineTaches.length > 1) {
      out.push(`Ne rattrape pas le soir ni le week-end. Décale plutôt la tâche la moins urgente : « ${semaineTaches[0].titre} ».`);
    } else {
      out.push("Ne rattrape pas le soir ni le week-end. Reprends normalement le prochain jour de travail.");
    }
    if (aProteger.length) out.push(`À protéger en priorité : « ${aProteger[0].titre} » (pour le ${dateCourte(aProteger[0].echeance)}).`);
    if (charge(lundi(d)).niveau === "trop") out.push(CONSEIL_ROUGE);
    return out;
  }

  // ---------- Petits outils d'affichage ----------
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const minutes = (h) => { if (!/^\d\d:\d\d$/.test(h || "")) return null; const [a, b] = h.split(":").map(Number); return a * 60 + b; };

  function caseEl(id, label) {
    const b = el("button", `case${fait(id) ? " cochee" : ""}`);
    b.setAttribute("role", "checkbox");
    b.setAttribute("aria-checked", fait(id) ? "true" : "false");
    b.setAttribute("aria-label", label);
    b.textContent = fait(id) ? "✓" : "";
    b.onclick = (ev) => { ev.stopPropagation(); basculer(id); };
    return b;
  }

  function blocEl(b, enCours) {
    const li = el("li", `bloc cat-${b.cat}${enCours ? " en-cours" : ""}`);
    const h = b.debut && b.fin ? `${heure(b.debut)}–${heure(b.fin)}` : b.fin ? `avant ${heure(b.fin)}` : heure(b.debut);
    li.append(el("span", "bloc-heure", h));
    const corps = el("span", "bloc-corps");
    corps.append(el("span", "bloc-titre", b.titre));
    if (b.lieu) corps.append(el("span", "bloc-lieu", b.lieu));
    if (enCours) corps.append(el("span", "badge", "maintenant"));
    li.append(corps);
    return li;
  }

  function echeanceEl(e, ref) {
    const passee = e.date < iso(ref);
    const li = el("li", `echeance cat-${e.cat}${passee || fait(e.id) ? " passee" : ""}`);
    const n = ecart(ref, parse(e.date));
    const compte = fait(e.id) ? "fait" : n === 0 ? "aujourd'hui" : n === 1 ? "demain" : n > 0 ? `dans ${n} j` : "passé";
    li.append(caseEl(e.id, e.titre));
    const g = el("div", "ech-gauche");
    g.append(el("span", "ech-date", `${dateLongue(parse(e.date))}${e.heure ? " · " + heure(e.heure) : ""}`));
    g.append(el("span", "ech-titre", e.titre));
    if (e.lieu) g.append(el("span", "bloc-lieu", e.lieu));
    if (e.a_confirmer) g.append(el("span", "badge badge-confirmer", "à confirmer"));
    if (e.note) g.append(el("span", "ech-note", e.note));
    li.append(g, el("span", `ech-compte${!fait(e.id) && n >= 0 && n <= 7 ? " proche" : ""}`, compte));
    return li;
  }

  function tacheEl(t, ref) {
    const r = iso(ref);
    const retard = !fait(t.id) && t.pour < r;
    const li = el("li", `echeance tache cat-${t.cat}${fait(t.id) ? " passee" : ""}`);
    li.append(caseEl(t.id, t.titre));
    const g = el("div", "ech-gauche");
    g.append(el("span", "ech-titre", t.titre));
    g.append(el("span", "ech-date", `Visé : ${dateCourte(t.pour)} · limite : ${dateCourte(t.echeance)}`));
    if (retard) g.append(el("span", "badge badge-confirmer", "à rattraper"));
    li.append(g);
    const n = ecart(ref, parse(t.echeance));
    li.append(el("span", `ech-compte${!fait(t.id) && n <= 7 ? " proche" : ""}`, fait(t.id) ? "fait" : n <= 0 ? "aujourd'hui" : `${n} j`));
    return li;
  }

  function journalEl(j) {
    const li = el("li", `journal-item${estImprevu(j) ? " imprevu" : " info"}`);
    const tete = el("div", "journal-tete");
    tete.append(el("span", "ech-date", `${dateLongue(parse(j.date))}${estImprevu(j) && j.duree ? " · " + DUREES[j.duree].toLowerCase() : ""}`));
    if (j.envoye) tete.append(el("span", "badge", "envoyé"));
    li.append(tete);
    li.append(el("span", "ech-titre", TYPES[j.type] || j.type));
    if (j.note) li.append(el("p", "journal-note", j.note));
    if (estImprevu(j)) {
      const ul = el("ul", "conseils");
      conseilsImprevu(j).forEach((c) => ul.append(el("li", null, c)));
      li.append(ul);
    }
    const suppr = el("button", "lien lien-doux", "supprimer");
    suppr.onclick = () => {
      if (!confirm("Supprimer cette note ?")) return;
      etat.journal = etat.journal.filter((x) => x.id !== j.id);
      sauver(); rendre();
    };
    li.append(suppr);
    return li;
  }

  function boutonImprevu(dateDefaut, texte) {
    const b = el("button", "btn-imprevu", texte || "＋ Noter un imprévu ou une info");
    b.onclick = () => ouvrirFormulaire(dateDefaut);
    return b;
  }

  // ---------- Vues ----------
  function vueAujourdhui() {
    const ref = aujourdhui();
    const now = new Date();
    const m = now.getHours() * 60 + now.getMinutes();
    const root = el("section", "vue");

    const tete = el("header", "jour-tete");
    tete.append(el("p", "jour-sur", "Aujourd'hui"));
    tete.append(el("h1", "jour-titre", dateLongue(ref)));
    root.append(tete);

    const j = journee(ref);
    const carte = el("div", "carte");
    const ul = el("ul", "blocs");
    j.blocs.forEach((b) => {
      const a = minutes(b.debut), z = minutes(b.fin);
      ul.append(blocEl(b, a != null && z != null && m >= a && m < z));
    });
    carte.append(ul);
    j.notes.forEach((n) => carte.append(el("p", "note", n)));
    journalDu(iso(ref)).filter(estImprevu).forEach((x) => carte.append(el("p", "note note-imprevu", `Imprévu noté${x.note ? " : " + x.note : ""}`)));
    root.append(carte);
    root.append(boutonImprevu(iso(ref), "＋ Imprévu aujourd'hui ?"));

    const conflits = (P.CONFLITS || []).filter((x) => x.date >= iso(ref)).sort((a, b) => a.date.localeCompare(b.date));
    if (conflits.length) {
      const k = el("div", "carte conflits");
      k.append(el("p", "conseil-sur", `Conflits à régler (${conflits.length})`));
      const ul = el("ul", "rappels-liste");
      conflits.forEach((x) => {
        const n = ecart(ref, parse(x.date));
        const li = el("li");
        li.append(el("span", "ech-date", `${dateLongue(parse(x.date))} · ${n === 0 ? "aujourd'hui" : n === 1 ? "demain" : "dans " + n + " j"}`));
        li.append(el("span", "ech-titre", x.titre));
        if (x.detail) li.append(el("span", "ech-note", x.detail));
        ul.append(li);
      });
      k.append(ul);
      root.append(k);
    }

    const rappels = P.RAPPELS || [];
    if (rappels.length) {
      const r = el("div", "carte rappels");
      r.append(el("p", "conseil-sur", "En attente, à ne pas oublier"));
      const ul = el("ul", "rappels-liste");
      rappels.forEach((x) => {
        const li = el("li");
        li.append(el("span", "ech-titre", x.titre));
        if (x.note) li.append(el("span", "ech-note", x.note));
        ul.append(li);
      });
      r.append(ul);
      root.append(r);
    }

    const duJour = echeancesDu(iso(ref));
    if (duJour.length) {
      root.append(el("h2", "sous-titre", "À rendre aujourd'hui"));
      const l = el("ul", "echeances");
      duJour.forEach((e) => l.append(echeanceEl(e, ref)));
      root.append(l);
    }

    const urg = urgentes(ref);
    root.append(el("h2", "sous-titre", "Le plus urgent"));
    if (urg.length) {
      const l = el("ul", "echeances");
      urg.slice(0, 3).forEach((t) => l.append(tacheEl(t, ref)));
      root.append(l);
      if (urg.length > 3) root.append(el("p", "note", `Et ${urg.length - 3} autre(s) dans l'onglet À faire.`));
    } else {
      root.append(el("p", "note", "Rien d'urgent dans les 7 prochains jours. Profites-en pour souffler."));
    }

    const prochaines = ECHEANCES.filter((e) => e.date > iso(ref) && !fait(e.id)).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
    if (prochaines.length) {
      root.append(el("h2", "sous-titre", "Prochaines échéances"));
      const l = el("ul", "echeances");
      prochaines.forEach((e) => l.append(echeanceEl(e, ref)));
      root.append(l);
    }

    const sem = semaineDe(ref);
    const c = el("div", "carte conseil");
    c.append(el("p", "conseil-sur", "Cette semaine"));
    c.append(jaugeEl(charge(lundi(ref))));
    if (sem && sem.conseil) c.append(el("p", "conseil-texte", sem.conseil));
    root.append(c);
    return root;
  }

  let decalageSemaine = 0;
  function vueSemaine() {
    const ref = aujourdhui();
    const debut = ajoute(lundi(ref), 7 * decalageSemaine);
    const fin = ajoute(debut, 6);
    const root = el("section", "vue");

    const nav = el("div", "nav-semaine");
    const prec = el("button", "btn", "‹");
    prec.setAttribute("aria-label", "Semaine précédente");
    prec.onclick = () => { decalageSemaine--; rendre(); };
    const suiv = el("button", "btn", "›");
    suiv.setAttribute("aria-label", "Semaine suivante");
    suiv.onclick = () => { decalageSemaine++; rendre(); };
    const titre = el("div", "nav-titre");
    titre.append(el("span", "nav-dates", `${debut.getDate()} ${MOIS_NOMS[debut.getMonth()]} – ${fin.getDate()} ${MOIS_NOMS[fin.getMonth()]}`));
    if (decalageSemaine !== 0) {
      const r = el("button", "lien", "revenir à cette semaine");
      r.onclick = () => { decalageSemaine = 0; rendre(); };
      titre.append(r);
    } else titre.append(el("span", "nav-sous", "cette semaine"));
    nav.append(prec, titre, suiv);
    root.append(nav);

    const sem = P.SEMAINES[iso(debut)];
    const c = el("div", "carte conseil");
    if (sem && sem.focus && sem.focus !== "repos") c.append(el("p", "conseil-sur", `Priorité : ${labelCat(sem.focus)}`));
    c.append(jaugeEl(charge(debut)));
    if (sem && sem.conseil) c.append(el("p", "conseil-texte", sem.conseil));
    root.append(c);

    for (let i = 0; i < 7; i++) {
      const d = ajoute(debut, i);
      const s = iso(d);
      const j = journee(d);
      const estAuj = s === iso(ref);
      const carte = el("div", `carte jour${estAuj ? " aujourdhui" : ""}${d < ref ? " passe" : ""}${j.repos ? " jour-repos" : ""}`);
      const t = el("div", "jour-ligne");
      t.append(el("span", "jour-nom", dateLongue(d)));
      if (estAuj) t.append(el("span", "badge", "aujourd'hui"));
      carte.append(t);
      const ul = el("ul", "blocs compact");
      j.blocs.forEach((b) => ul.append(blocEl(b, false)));
      carte.append(ul);
      // Les journées particulières affichent déjà leurs échéances dans les blocs.
      if (!P.JOURS[s]) echeancesDu(s).forEach((e) => {
        carte.append(el("p", `echeance-mini cat-${e.cat}`, `⚑ ${e.heure ? heure(e.heure) + " · " : ""}${e.titre}${e.a_confirmer ? " (à confirmer)" : ""}`));
      });
      TACHES.filter((x) => x.pour === s).forEach((x) => {
        carte.append(el("p", `tache-mini cat-${x.cat}${fait(x.id) ? " faite" : ""}`, `${fait(x.id) ? "✓" : "○"} ${x.titre}`));
      });
      (P.CONFLITS || []).filter((x) => x.date === s).forEach((x) => carte.append(el("p", "note note-conflit", `⚠ Conflit : ${x.titre}`)));
      journalDu(s).forEach((x) => carte.append(el("p", "note note-imprevu", `${estImprevu(x) ? "Imprévu" : "Info"}${x.note ? " : " + x.note : ""}`)));
      j.notes.forEach((n) => carte.append(el("p", "note", n)));
      root.append(carte);
    }
    return root;
  }

  let voirPassees = false;
  function vueAFaire() {
    const ref = aujourdhui();
    const r = iso(ref);
    const root = el("section", "vue");
    root.append(el("h1", "jour-titre", "À faire"));
    const b = el("button", "lien", voirPassees ? "masquer ce qui est fait ou passé" : "voir aussi ce qui est fait ou passé");
    b.onclick = () => { voirPassees = !voirPassees; rendre(); };
    root.append(b);

    const taches = TACHES.filter((t) => voirPassees || (!fait(t.id) && t.echeance >= r))
      .sort((x, y) => x.pour.localeCompare(y.pour));
    root.append(el("h2", "sous-titre", "Tâches"));
    if (taches.length) {
      const ul = el("ul", "echeances");
      taches.forEach((t) => ul.append(tacheEl(t, ref)));
      root.append(ul);
    } else root.append(el("p", "note", "Tout est fait. Bravo."));

    const toutes = [...ECHEANCES].sort((a, b2) => (a.date + (a.heure || "")).localeCompare(b2.date + (b2.heure || "")));
    const liste = toutes.filter((e) => voirPassees || (e.date >= r && !fait(e.id)));
    let moisCourant = "";
    let ul = null;
    liste.forEach((e) => {
      const d = parse(e.date);
      const m = `Échéances · ${MOIS_NOMS[d.getMonth()]} ${d.getFullYear()}`;
      if (m !== moisCourant) {
        moisCourant = m;
        root.append(el("h2", "sous-titre", m));
        ul = el("ul", "echeances");
        root.append(ul);
      }
      ul.append(echeanceEl(e, ref));
    });
    return root;
  }

  function texteResume() {
    const ref = aujourdhui();
    const r = iso(ref);
    const lignes = [`Calendrier de Vie : point du ${dateLongue(ref)}`, ""];
    const aEnvoyer = etat.journal.filter((j) => !j.envoye).sort((a, b) => a.date.localeCompare(b.date));
    if (aEnvoyer.length) {
      lignes.push("Notes :");
      aEnvoyer.forEach((j) => lignes.push(`- ${dateCourte(j.date)} · ${TYPES[j.type]}${estImprevu(j) && j.duree ? " (" + DUREES[j.duree].toLowerCase() + ")" : ""}${j.note ? " : " + j.note : ""}`));
      lignes.push("");
    }
    const faites = TACHES.filter((t) => fait(t.id));
    if (faites.length) { lignes.push("Tâches faites :"); faites.forEach((t) => lignes.push(`- ${t.titre}`)); lignes.push(""); }
    const retard = TACHES.filter((t) => !fait(t.id) && t.pour < r && t.echeance >= r);
    if (retard.length) { lignes.push("En retard :"); retard.forEach((t) => lignes.push(`- ${t.titre} (limite ${dateCourte(t.echeance)})`)); lignes.push(""); }
    lignes.push(`Charge de la semaine : ${charge(lundi(ref)).label.toLowerCase()}.`);
    lignes.push("", "Peux-tu mettre à jour le planning ?");
    return lignes.join("\n");
  }

  async function envoyer() {
    const texte = texteResume();
    let ok = false;
    try {
      if (navigator.share) { await navigator.share({ title: "Calendrier de Vie", text: texte }); ok = true; }
    } catch (e) { if (e && e.name === "AbortError") return; }
    if (!ok) {
      try { await navigator.clipboard.writeText(texte); ok = true; alert("Résumé copié. Colle-le dans ta conversation avec Claude."); } catch (e) {
        prompt("Copie ce texte et colle-le dans ta conversation avec Claude :", texte);
        ok = true;
      }
    }
    if (ok) {
      etat.journal.forEach((j) => { j.envoye = true; });
      sauver(); rendre();
    }
  }

  function vueJournal() {
    const root = el("section", "vue");
    root.append(el("h1", "jour-titre", "Journal"));
    root.append(el("p", "note", "Note ici les imprévus et les nouvelles infos (dates, documents). Quand tu veux que je mette à jour le planning, appuie sur « Envoyer à Claude » et colle le résumé dans notre conversation."));
    root.append(boutonImprevu(iso(aujourdhui())));
    const env = el("button", "btn-principal", "Envoyer à Claude");
    env.onclick = envoyer;
    const nonEnvoyes = etat.journal.filter((j) => !j.envoye).length;
    root.append(env);
    if (nonEnvoyes) root.append(el("p", "note", `${nonEnvoyes} note(s) pas encore envoyée(s).`));

    const liste = [...etat.journal].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
    if (liste.length) {
      const ul = el("ul", "echeances");
      liste.forEach((j) => ul.append(journalEl(j)));
      root.append(ul);
    } else root.append(el("p", "note", "Aucune note pour l'instant."));
    root.append(reglagesSync());
    return root;
  }

  function reglagesSync() {
    const box = el("details", "carte reglages");
    if (!syncActive()) box.open = false;
    box.append(el("summary", "reglages-titre", syncActive() ? "Sauvegarde GitHub : activée" : "Sauvegarde GitHub : désactivée"));
    box.append(el("p", "note", "Tes coches sont enregistrées automatiquement dans coches.json du repo ci-dessous (le journal reste sur ce téléphone). Le jeton reste sur ce téléphone."));
    const f = el("form", "reglages-form");
    const lRepo = el("label", null, "Repo");
    const iRepo = el("input"); iRepo.value = sync.repo; iRepo.placeholder = "Trijeux/Calendrier-de-Vie"; iRepo.autocapitalize = "off";
    lRepo.append(iRepo);
    const lJeton = el("label", null, "Jeton GitHub");
    const iJeton = el("input"); iJeton.type = "password"; iJeton.value = sync.jeton; iJeton.placeholder = "github_pat_…"; iJeton.autocomplete = "off";
    lJeton.append(iJeton);
    const ok = el("button", "btn-principal", "Enregistrer et synchroniser");
    ok.type = "submit";
    f.append(lRepo, lJeton, ok);
    f.onsubmit = (ev) => {
      ev.preventDefault();
      sync = { repo: iRepo.value.trim(), jeton: iJeton.value.trim() };
      try { localStorage.setItem(CLE_SYNC, JSON.stringify(sync)); } catch (e) { /* rien */ }
      shaDistant = null;
      synchroniser().then(rendre);
    };
    box.append(f);
    const st = el("p", "note", statutSync || (syncActive() ? "" : "Pas encore configurée."));
    st.id = "statut-sync";
    box.append(st);
    if (syncActive()) {
      const off = el("button", "lien lien-doux", "désactiver la sauvegarde sur ce téléphone");
      off.onclick = () => { sync = { ...sync, jeton: "" }; try { localStorage.setItem(CLE_SYNC, JSON.stringify(sync)); } catch (e) { /* rien */ } statutSync = ""; rendre(); };
      box.append(off);
    }
    return box;
  }

  // ---------- Formulaire ----------
  function ouvrirFormulaire(dateDefaut) {
    const dlg = document.getElementById("formulaire");
    const f = dlg.querySelector("form");
    f.reset();
    f.date.value = dateDefaut || iso(aujourdhui());
    const majDuree = () => { f.querySelector(".champ-duree").hidden = f.type.value === "info"; };
    f.type.onchange = majDuree;
    majDuree();
    dlg.showModal();
  }

  function initFormulaire() {
    const dlg = document.getElementById("formulaire");
    const f = dlg.querySelector("form");
    dlg.querySelector(".annuler").onclick = () => dlg.close();
    f.onsubmit = (ev) => {
      ev.preventDefault();
      const entree = {
        id: `${Date.now()}`,
        date: f.date.value || iso(aujourdhui()),
        type: f.type.value,
        duree: f.type.value === "info" ? null : f.duree.value,
        note: f.note.value.trim(),
        envoye: false,
      };
      etat.journal.push(entree);
      sauver();
      dlg.close();
      vue = "journal";
      rendre();
      window.scrollTo(0, 0);
    };
  }

  // ---------- Navigation ----------
  const VUES = { aujourdhui: vueAujourdhui, semaine: vueSemaine, afaire: vueAFaire, journal: vueJournal };
  let vue = "aujourdhui";
  try { vue = localStorage.getItem("vue") || vue; } catch (e) { /* stockage indisponible */ }
  if (!VUES[vue]) vue = "aujourdhui";

  function rendre() {
    const main = document.getElementById("contenu");
    main.replaceChildren(VUES[vue]());
    document.querySelectorAll(".onglet").forEach((o) => o.setAttribute("aria-current", o.dataset.vue === vue ? "page" : "false"));
  }

  document.querySelectorAll(".onglet").forEach((o) => {
    o.addEventListener("click", () => {
      vue = o.dataset.vue;
      if (vue === "semaine") decalageSemaine = 0;
      try { localStorage.setItem("vue", vue); } catch (e) { /* rien */ }
      rendre();
      window.scrollTo(0, 0);
    });
  });

  initFormulaire();
  rendre();
  synchroniser();
  // Rafraîchit chaque minute (bloc "maintenant", changement de jour à minuit).
  setInterval(() => { if (vue === "aujourdhui" && !document.getElementById("formulaire").open) rendre(); }, 60000);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { if (minuterie) { clearTimeout(minuterie); synchroniser(); } return; }
    if (!document.getElementById("formulaire").open) rendre();
    synchroniser();
  });

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    // Recharge une fois quand une nouvelle version de l'appli prend la main.
    const avaitUnControleur = !!navigator.serviceWorker.controller;
    let recharge = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!avaitUnControleur || recharge) return;
      recharge = true;
      location.reload();
    });
    navigator.serviceWorker.register("sw.js", { updateViaCache: "none" }).then((r) => {
      document.addEventListener("visibilitychange", () => { if (!document.hidden) r.update(); });
    });
  }
})();
