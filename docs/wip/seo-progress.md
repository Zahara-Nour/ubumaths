# Chantier `seo` — journal

## Reprendre ici

_Mis à jour le 2026-10-29, PR 1 (#1979) en CI, PR 2 écrite._

- **État** : PR 1 `robots.txt` (#1979) en CI. PR 2 migration `slug` (branche `feat/glossaire-slug`) ouverte, test d'intégration vert en local (rouge sans la migration).
- **Prochaine action** : PR 2 mergée → `db:migrate` (si `security-auditor` sans bloquant) → `db:types` → PR 3 : pages `/glossaire/[slug]`, liens dans `/glossaire`, sitemap.
- **En attente de David** : rien (A1 + B1 tranchés le 2026-10-29).
- **Pièges en cours** : données structurées toujours reportées par David. Base locale en avance sur `main` : migration `slug` appliquée à la main (psql + ligne dans `schema_migrations`).
- **Worktree / branche** : `../ubumaths-wt-seo` · `feat/glossaire-slug`.

## Plan (validé par David le 2026-10-29 : « on commence avec tes recos »)

1. `robots.txt` : bloquer les robots d'entraînement (GPTBot, ClaudeBot, CCBot, Google-Extended…),
   garder ceux de recherche et de réponse. Pas de `llms.txt` (aucun effet sur Google).
2. Glossaire en une page par terme (`/glossaire/<terme>`), pour que chaque définition soit une
   page d'arrivée sur Google. Phase 0 validée le 2026-10-29 :
   - page par terme principal : titre « X : définition », toutes les définitions avec leur niveau,
     exemples, histoire, synonymes, « Voir aussi » ;
   - homonymes : adresse avec le sens (`base-puissance`) ; forme dérivée → redirection vers son
     terme principal ; terme masqué ou inconnu → 404, absent du sitemap ;
   - **A1** : adresse enregistrée en base (colonne `slug`), figée au renommage ;
   - **B1** : plus de fenêtre dans `/glossaire`, un clic ouvre la page (`BackLink` vers le glossaire).
     PR 2 = migration seule (`db:types` lit la prod), PR 3 = le code.

## Historique

- 2026-10-29 : worktree ouvert, PR 1 écrite. Prod : 625 termes principaux visibles, 0 collision d'adresse.
