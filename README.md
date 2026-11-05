# Calendrier de Vie

Mon planning de 3e année de bachelor Game Programming, sous forme de petite appli
installable sur le téléphone : https://trijeux.github.io/Calendrier-de-Vie/

- **Aujourd'hui** : le programme du jour, le bloc en cours, les prochaines échéances et le conseil de la semaine.
- **Semaine** : les 7 jours, avec le jour actuel en évidence.
- **À faire** : les tâches à cocher (avec la date visée et la vraie limite) et toutes les échéances.
- **Journal** : noter un imprévu ou une nouvelle info, voir quoi décaler, et « Envoyer à Claude » pour faire mettre à jour le planning.

L'écran Aujourd'hui montre aussi **le plus urgent** (tâches à rattraper en premier) et la **jauge de charge** de la semaine (légère, chargée, trop chargée avec conseils pour alléger).

Les coches et le journal sont enregistrés sur le téléphone : vider les données du navigateur les efface.

Elle marche hors ligne et se met à jour toute seule quand le planning change.

## Installer sur le téléphone

- **iPhone (Safari)** : ouvrir le lien, bouton Partager, puis « Sur l'écran d'accueil ».
- **Android (Chrome)** : ouvrir le lien, menu ⋮, puis « Installer l'application » (ou « Ajouter à l'écran d'accueil »).

## Modifier le planning

Tout est dans [`data.js`](data.js) : semaine type, vendredis de cours, vacances,
échéances, tâches, priorité et conseil de chaque semaine, journées particulières.
