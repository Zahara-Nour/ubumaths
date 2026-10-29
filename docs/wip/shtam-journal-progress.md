# Chantier `shtam-journal` — la page du Shtam en vrai journal

## Reprendre ici

_Mis à jour le 2026-10-29, PR des espaces insécables ouverte._

- **État** : #1991 mergée (une + pages intérieures), pas en prod ; PR `fix/shtam-insecables` : espaces insécables posées à la lecture (`frenchSpacing`), « suite page N » insécable · **Prochaine action** : merger, puis retouches 3-5 si David les veut (une plus compacte, chapô plus contrasté, date en casse homogène, lien « Page de l'article » plus visible), sinon chantier clos (journal à archiver) · **En attente de David** : retouches 3-5 ; regard sur `/shtam` (ligne #1991 de `verifications-manuelles.md`) · **Pièges en cours** : `<header>` interdit (app.css force 1rem) ; CI : « Browser connection was closed » → relancer le job · **Worktree / branche** : `ubumaths-wt-shtam-journal` / `fix/shtam-insecables`

## Décisions de David (2026-10-29)

- Une = dernier article paru : titre, chapeau, image s'il y en a une, début du corps ; « Lire la suite ».
- Pas d'« anciens numéros » ; on lit tout le journal en tournant les pages : pages intérieures = articles **en entier**, avec leur vrai du faux.
- Prix : vérifier la monnaie → gidouille (la phynance est de l'argent réel, Compendium § VI).

## Retouches (2026-10-29)

- Espaces insécables : guillemets et « : » en espace mot, « ; ! ? » en espace fine (Imprimerie nationale) ; code et formules `~…~` intacts. L'espace fine dans les guillemets collait trop en Inter : écartée.
- Image de la une : la une actuelle (Turingrad) n'en a pas, question sans objet pour l'instant.
