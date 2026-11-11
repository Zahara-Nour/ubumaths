# Chantier `lien-consentements`

## Reprendre ici

_Mis à jour le 2026-11-11, à l'ouverture de la PR._

- **État** : PR ouverte · **Prochaine action** : merge, archiver ce journal · **En attente de David** : rien · **Pièges en cours** : aucun · **Worktree / branche** : `../ubumaths-wt-lien-consentements` / `fix/lien-consentements`

## Historique

- 2026-11-11 : pour renvoyer un lien de consentement à un parent, aucun lien de l'appli ne menait à `dashboard/teacher/consent` ; le bouton « Envoyer email » de la liste des classes menait, pour un enfant inscrit par son parent, à l'email de bienvenue vers son adresse fictive. Correctif : lien « Consentements parentaux » dans l'en-tête de « Mes classes », identifiant + « Lien au parent » sur la ligne d'un enfant, redirection 303 de la page de bienvenue pour un compte d'enfant.
