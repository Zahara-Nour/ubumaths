# Chantier `shtam-journal` — la page du Shtam en vrai journal

## Reprendre ici

_Mis à jour le 2026-10-30, après #1994 (en prod, v0.57.1)._

- **État** : #1991 (une + pages intérieures) et #1994 (espaces insécables, « suite page N » insécable) EN PROD v0.57.1 · **Prochaine action** : retouches 3-5 si David les veut (une plus compacte, chapô plus contrasté, date en casse homogène, lien « Page de l'article » plus visible), sinon chantier clos (journal à archiver, le durable est dans `docs/systeme/univers-chiphre.md`) · **En attente de David** : retouches 3-5 ; regard sur `/shtam` en prod (ligne #1991 de `verifications-manuelles.md`) · **Pièges en cours** : `<header>` interdit (app.css force 1rem) ; CI : « Browser connection was closed » → relancer le job · **Worktree / branche** : retirés

## Décisions de David (2026-10-29)

- Une = dernier article paru : titre, chapeau, image s'il y en a une, début du corps ; « Lire la suite ».
- Pas d'« anciens numéros » ; on lit tout le journal en tournant les pages : pages intérieures = articles **en entier**, avec leur vrai du faux.
- Prix : vérifier la monnaie → gidouille (la phynance est de l'argent réel, Compendium § VI).

## Retouches (2026-10-29)

- Espaces insécables : guillemets et « : » en espace mot, « ; ! ? » en espace fine (Imprimerie nationale) ; code et formules `~…~` intacts. L'espace fine dans les guillemets collait trop en Inter : écartée.
- Image de la une : la une actuelle (Turingrad) n'en a pas, question sans objet pour l'instant.
