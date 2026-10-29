# Chantier `shtam-journal` — la page du Shtam en vrai journal

## Reprendre ici

_Mis à jour le 2026-10-29, après #1991._

- **État** : #1991 mergée (une + pages intérieures `?page=N`), pas encore en prod · **Prochaine action** : retouches selon le retour visuel de David, sinon chantier clos (journal à archiver, le durable est déjà dans `docs/systeme/univers-chiphre.md`) · **En attente de David** : regard sur `/shtam` (ligne #1991 de `verifications-manuelles.md`) ; image de la une prise dans le vrai du faux, à garder ou non · **Pièges en cours** : `<header>` interdit (app.css force 1rem) ; CI : le navigateur des tests client peut se fermer en cours de route (« Browser connection was closed »), relancer le job · **Worktree / branche** : retirés

## Décisions de David (2026-10-29)

- Une = dernier article paru : titre, chapeau, image s'il y en a une, début du corps ; « Lire la suite ».
- Pas d'« anciens numéros » ; on lit tout le journal en tournant les pages : pages intérieures = articles **en entier**, avec leur vrai du faux.
- Prix : vérifier la monnaie → gidouille (la phynance est de l'argent réel, Compendium § VI).
