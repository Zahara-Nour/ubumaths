# Chantier `ecarts-m60` : suppression des modèles de message en base

## Reprendre ici

_Mis à jour le 2026-11-26, avant l'ouverture de la PR._

- **État** : une seule PR, sur la branche `chore/ecarts-m60`. Migration `20261126224009_suppression_modeles_de_message.sql` (DESTRUCTIVE) écrite, tests adaptés, types régénérés, doc à jour.
- **Prochaine action** : ⛔ NE PAS MERGER avant le go de David (migration destructive : le `db:migrate` de n'importe quelle session la jouerait en prod). Après son go : `pnpm check:migrations --pr <n>`, merge, puis `pnpm db:migrate` depuis le dépôt principal (vérifier d'abord `migration list --linked` : aucune autre migration en attente), relire en prod (lecture seule) que les cinq tables n'existent plus, barrer M60 au registre, archiver ce journal.
- **En attente de David** : son go pour le merge. Lui dire ce qui dépasse la ligne du registre : une cinquième table (`user_favorite_templates`, 0 ligne en prod) et la fonction de suppression de compte (`delete_user_account`), réécrite sans le bloc qui effaçait dans `template_audit_log`.
- **Pièges en cours** : la migration ne passe en prod qu'APRÈS le merge ; le code de prod (0.115.0) ne lit déjà plus ces tables. Sans `CASCADE` : une dépendance oubliée fait échouer la migration au lieu d'emporter autre chose.
- **Worktree / branche** : `../ubumaths-wt-ecarts-m60`, `chore/ecarts-m60`.

## Ce qui est supprimé

- **Tables** (0 ligne en prod dans chacune, compté en lecture seule le 2026-11-26) : `message_templates`, `message_template_versions`, `template_usage_stats`, `template_audit_log`, `user_favorite_templates`.
- **Fonctions** : `get_templates_for_context`, `get_template_statistics`, `get_user_frequent_templates`, `duplicate_template`, `log_template_action`, et les trois fonctions de trigger `auto_log_template_changes`, `save_template_version`, `update_message_template_updated_at`.
- **Réécrite** : `delete_user_account` (RGPD art. 17), recopiée à l'identique de `20261016101200` moins le bloc `DELETE FROM template_audit_log` ; droits et commentaire inchangés.
- L'inventaire de prod (fonctions qui citent ces tables, clés étrangères, vues, publications temps réel) est le même que celui de la base locale : aucune vue, aucune publication, aucune clé étrangère entrante hors de ces cinq tables.

## Usages (grep du 2026-11-26)

Motif : `message_template|template_usage_stats|template_audit_log|user_favorite_templates|get_templates_for_context|get_template_statistics|get_user_frequent_templates|duplicate_template|log_template_action|save_template_version|auto_log_template_changes|update_message_template_updated_at`.

- `src`, `e2e` : aucune ligne hors `src/lib/types/database.ts` (généré, régénéré par `pnpm db:types`).
- Tests d'intégration adaptés : `anon-option-b` (126 relations, 128 fonctions), `rpc-lot2-maintenance-prof` (blocs `duplicate_template` et `log_template_action` retirés), `rpc-lot5-gardes-restantes`, `succes-gidouilles` (bloc Q154 / audit C / Q158 retiré), `profiles-columns`, `suppression-compte-art17`, `fixtures/fonctions-definer-verifiees.ts` ; `database/template-triggers.test.ts` supprimé.
- Scripts : `scripts/db-seed-riche/regles.ts` et son test, `scripts/generate-db-doc.ts` ; `supabase/seed/default_message_templates.sql` supprimé (plus cité par `config.toml`).

## Preuves

- `tests/integration/suppression-modeles-de-message.test.ts` : rouge sans la migration (14 échecs sur 15, le 2026-11-26), vert avec.
