# Chantier `shtam-journal` — la page du Shtam en vrai journal

## Reprendre ici

_Mis à jour le 2026-10-29, avant la PR._

- **État** : une + pages intérieures (`?page=N`, 2 articles en entier par page) codées, tests verts · **Prochaine action** : PR, CI, merge · **En attente de David** : retour visuel (serveur de test sur le port 5181) · **Pièges en cours** : `<header>` interdit (app.css force 1rem) ; images toutes dans le vrai du faux · **Worktree / branche** : `../ubumaths-wt-shtam-journal`, `feat/shtam-journal`

## Décisions de David (2026-10-29)

- Une = dernier article paru : titre, chapeau, image s'il y en a une, début du corps ; « Lire la suite ».
- Pas d'« anciens numéros » ; on lit tout le journal en tournant les pages : pages intérieures = articles **en entier**, avec leur vrai du faux.
- Prix : vérifier la monnaie → gidouille (la phynance est de l'argent réel, Compendium § VI).
