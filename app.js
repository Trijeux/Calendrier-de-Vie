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
  // "09:30" -> "9h30", "12:00" -> "12h"
  const heure = (h) => {
    if (!h || !/^\d\d:\d\d$/.test(h)) return h || "";
    const [a, b] = h.split(":");
    return `${Number(a)}h${b === "00" ? "" : b}`;
  };

  const speSet = new Map(P.VENDREDIS_SPE);
  const echeancesDu = (s) => P.ECHEANCES.filter((e) => e.date === s);
  const semaineDe = (d) => P.SEMAINES[iso(lundi(d))];
  const labelCat = (c) => (P.CATEGORIES[c] ? P.CATEGORIES[c].label : c);

  // ---------- Contenu d'une journée ----------
  function journee(d) {
    const s = iso(d);
    const repos = P.REPOS.find((p) => dans(s, p));
    if (repos) return { blocs: [{ debut: "", cat: "repos", titre: repos.titre }], repos: true };

    const notes = [];
    const fermeture = P.FERMETURES.find((p) => dans(s, p));
    if (fermeture) notes.push(fermeture.titre);

    let blocs;
    if (P.JOURS[s]) {
      blocs = P.JOURS[s].map((b) => ({ ...b }));
    } else if (speSet.has(s)) {
      blocs = [{ debut: "journée", cat: "cours", titre: speSet.get(s), lieu: "Octagone" }];
    } else {
      blocs = (P.SEMAINE_TYPE[d.getDay()] || []).map((b) => ({ ...b }));
      // Mardi d'une semaine avec cours de Spé le vendredi : l'après-midi passe en perso.
      if (d.getDay() === 2 && speSet.has(iso(ajoute(d, 3)))) {
        blocs = blocs.map((b) => (b.debut === "14:00"
          ? { debut: "14:00", fin: "16:00", cat: "perso", titre: "Projets perso (2h, vendredi pris par les cours)" }
          : b));
      }
    }

    const sem = semaineDe(d);
    blocs = blocs.map((b) => {
      if (b.cat !== "focus") return b;
      const f = sem && sem.focus && sem.focus !== "repos" ? sem.focus : "jeu";
      return { ...b, cat: f, titre: `Priorité de la semaine : ${labelCat(f)}` };
    });

    if (d.getDay() === 4 && !fermeture) notes.push(P.INFO_JEUDI);
    return { blocs, notes, repos: false };
  }

  // ---------- Rendu ----------
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };
  const minutes = (h) => { if (!/^\d\d:\d\d$/.test(h || "")) return null; const [a, b] = h.split(":").map(Number); return a * 60 + b; };

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
    const li = el("li", `echeance cat-${e.cat}${e.date < iso(ref) ? " passee" : ""}`);
    const n = ecart(ref, parse(e.date));
    const compte = n === 0 ? "aujourd'hui" : n === 1 ? "demain" : n > 0 ? `dans ${n} j` : "passé";
    const g = el("div", "ech-gauche");
    g.append(el("span", "ech-date", `${dateLongue(parse(e.date))}${e.heure ? " · " + heure(e.heure) : ""}`));
    g.append(el("span", "ech-titre", e.titre));
    if (e.lieu) g.append(el("span", "bloc-lieu", e.lieu));
    if (e.a_confirmer) g.append(el("span", "badge badge-confirmer", "à confirmer"));
    if (e.note) g.append(el("span", "ech-note", e.note));
    li.append(g, el("span", `ech-compte${n >= 0 && n <= 7 ? " proche" : ""}`, compte));
    return li;
  }

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
    (j.notes || []).forEach((n) => carte.append(el("p", "note", n)));
    root.append(carte);

    const duJour = echeancesDu(iso(ref));
    if (duJour.length) {
      root.append(el("h2", "sous-titre", "À rendre aujourd'hui"));
      const l = el("ul", "echeances");
      duJour.forEach((e) => l.append(echeanceEl(e, ref)));
      root.append(l);
    }

    const prochaines = P.ECHEANCES.filter((e) => e.date > iso(ref)).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
    if (prochaines.length) {
      root.append(el("h2", "sous-titre", "Prochaines échéances"));
      const l = el("ul", "echeances");
      prochaines.forEach((e) => l.append(echeanceEl(e, ref)));
      root.append(l);
    }

    const sem = semaineDe(ref);
    if (sem && sem.conseil) {
      const c = el("div", "carte conseil");
      c.append(el("p", "conseil-sur", "Cette semaine"));
      c.append(el("p", "conseil-texte", sem.conseil));
      root.append(c);
    }
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
    if (sem && sem.conseil) {
      const c = el("div", "carte conseil");
      if (sem.focus && sem.focus !== "repos") c.append(el("p", "conseil-sur", `Priorité : ${labelCat(sem.focus)}`));
      c.append(el("p", "conseil-texte", sem.conseil));
      root.append(c);
    }

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
        const p = el("p", `echeance-mini cat-${e.cat}`, `⚑ ${e.heure ? heure(e.heure) + " · " : ""}${e.titre}${e.a_confirmer ? " (à confirmer)" : ""}`);
        carte.append(p);
      });
      (j.notes || []).forEach((n) => carte.append(el("p", "note", n)));
      root.append(carte);
    }
    return root;
  }

  let voirPassees = false;
  function vueEcheances() {
    const ref = aujourdhui();
    const root = el("section", "vue");
    root.append(el("h1", "jour-titre", "Échéances"));
    const toutes = [...P.ECHEANCES].sort((a, b) => (a.date + (a.heure || "")).localeCompare(b.date + (b.heure || "")));
    const liste = toutes.filter((e) => voirPassees || e.date >= iso(ref));
    const b = el("button", "lien", voirPassees ? "masquer les échéances passées" : "voir aussi les échéances passées");
    b.onclick = () => { voirPassees = !voirPassees; rendre(); };
    root.append(b);

    let moisCourant = "";
    let ul = null;
    liste.forEach((e) => {
      const d = parse(e.date);
      const m = majuscule(`${MOIS_NOMS[d.getMonth()]} ${d.getFullYear()}`);
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

  // ---------- Navigation ----------
  const VUES = { aujourdhui: vueAujourdhui, semaine: vueSemaine, echeances: vueEcheances };
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

  rendre();
  // Rafraîchit chaque minute (bloc "maintenant", changement de jour à minuit).
  setInterval(() => { if (vue === "aujourdhui") rendre(); }, 60000);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) rendre(); });

  if ("serviceWorker" in navigator && location.protocol !== "file:") {
    navigator.serviceWorker.register("sw.js");
  }
})();
