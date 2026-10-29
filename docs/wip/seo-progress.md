# Chantier `seo` — journal

## Reprendre ici

_Mis à jour le 2026-10-29, après #1980._

- **État** : #1979 (`robots.txt`) et #1980 (migration `slug`) mergées, pas encore en prod (`deploy:prod`). Migration `20261030001000_dictionnaire_slug.sql` **pas encore appliquée en prod** : le mode auto refuse `db push`.
- **Prochaine action** : David lance `! pnpm exec supabase db push --include-all --yes` (dry-run : seule cette migration part) → vérifier en prod (675 slugs, 0 doublon) → `pnpm db:types` → PR 3 sur `feat/glossaire-pages` : pages `/glossaire/[slug]`, liens dans `/glossaire` (B1), sitemap.
- **En attente de David** : le `db push` ci-dessus.
- **Pièges en cours** : données structurées reportées par David. Horodatage de migration pris par une autre session → renommée en `20261030001000`. Le test de la visite lit maintenant seulement le groupe `User-agent: *` de `robots.txt`.
- **Worktree / branche** : `../ubumaths-wt-seo` · `feat/glossaire-pages`.

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
- 2026-10-29 : #1979 mergée (test de la visite corrigé : il lisait tous les groupes de `robots.txt`).
- 2026-10-29 : #1980 mergée. `security-auditor` : 0 bloquant, 2 mineurs appliqués (collision avec entrée masquée testée, `dictionary_slugify` retirée à anon). Test rouge sans la migration, 7/7 vert avec.
