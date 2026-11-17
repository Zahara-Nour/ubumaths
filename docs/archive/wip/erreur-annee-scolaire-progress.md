# Chantier `erreur-annee-scolaire`

## Reprendre ici

_Mis à jour le 2026-11-11, à l'ouverture de la PR._

- **État** : PR ouverte (message clair quand la base refuse une année scolaire en doublon) · **Prochaine action** : merge, puis archiver ce journal · **En attente de David** : rien · **Pièges en cours** : aucun · **Worktree / branche** : `../ubumaths-wt-erreur-annee-scolaire` / `fix/erreur-annee-scolaire`

## Historique

- 2026-11-11 : David crée « 2026-2027 » pour Akadada dans l'admin → « Erreur lors de la création de l'année scolaire ». Cause (logs prod) : `unique_school_year` (school_id, name), l'année existait déjà, inactive. Correctif : `schoolYearConflictMessage` (`src/lib/server/school-year-errors.ts`), branché dans createYear / updateYear / duplicateYear de la page Organisation ; couvre aussi `idx_one_active_year_per_school`. Réponse 409 au lieu de 500.
