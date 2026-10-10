# Dictionnaire en base — progression

ADR 0022 et spécification validées par David le 2026-10-10 ([spec](dictionnaire-en-base-spec.md)).
Worktree `../ubumaths-wt-dictionnaire`, branche `feat/dictionnaire-en-base`.

## PR 1 — tables, droits, reprise (en cours)

- Migration `20261012153000_dictionnaire_en_base.sql`, générée depuis le fichier (671 entrées, ordre
  gardé dans `position`) : `dictionary_entries`, `dictionary_entry_versions`, trigger d'historique
  (droits de l'appelant), lecture publique des entrées non masquées, écriture admin (`is_admin()`),
  aucun DELETE accordé, historique lisible par l'admin seul.
- Tests `tests/integration/dictionnaire-en-base.test.ts` : 11 rouges sans la migration ; 16 verts avec, après la revue sécurité (lien « Voir aussi » et image en liste blanche, pas de fausse version, auteur et dates posés par le trigger).
- Supabase local : la migration `20261012120000` (autre session) avait été appliquée à la main, sans
  trace dans l'historique ; `migration repair --status applied` avant `migration up --local`.
- Reste : security-auditor, PR, CI, `db:migrate`, `db:types`.

## PR 2 — lecture depuis la base, page d'admin (à faire)

## PR 3 — suppression du fichier (après un `deploy:prod` lancé par David)
