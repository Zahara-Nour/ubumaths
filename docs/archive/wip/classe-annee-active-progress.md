# Chantier `classe-annee-active`

## Reprendre ici

_Mis à jour le 2026-11-11, à l'ouverture de la PR._

- **État** : PR ouverte (une classe créée par l'admin prend l'année active de son école) · **Prochaine action** : merge, puis archiver ce journal · **En attente de David** : rien · **Pièges en cours** : aucun · **Worktree / branche** : `../ubumaths-wt-classe-annee-active` / `fix/classe-annee-active`

## Historique

- 2026-11-11 : NOELIE (Akadada) créée le 2026-10-21 sans `school_year_id` — la création de classe ne posait jamais l'année (la migration de Phase 1 de la bascule d'année le prévoyait pour la Phase 2). Recommandation acceptée par David : côté application (seule voie de création : action `create` de `dashboard/admin/classes`), pas de trigger. École sans année active → classe sans année + avertissement ; colonne toujours nullable ; changement d'école d'une classe existante hors périmètre (Phase 2). NOELIE corrigée à la main par David (SQL au Dashboard), vérifiée en prod.
