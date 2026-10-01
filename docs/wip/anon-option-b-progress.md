# Option b — retrait des droits hérités de `anon`

Branche `fix/anon-option-b`, worktree `ubumaths-wt-anon-b`. **Rien n'est appliqué en prod** : migration et test préparés, à relire (security-auditor) avant `db:migrate`.

## Inventaire re-mesuré en prod (2026-10-01, MCP lecture seule)

Requêtes : `pg_class.relacl` (aclexplode, grantee `anon`), `pg_policies` (rôles `anon` ou `public`), `pg_proc` (`has_function_privilege('anon', …)`, hors fonctions d'extension), `pg_depend` (fonctions référencées par policy, CHECK, DEFAULT, index, vue).

### Relations à fermer : 143

Critère : `anon` a au moins un droit ET aucune policy de la table ne vise `anon` ou `public`.

- **141 tables et vues** (toutes les vues sont `security_invoker`) : liste exacte dans la migration et dans `RELATIONS_FERMEES` du test. Comprend `classes`, `class_members` (policies passées à `authenticated` par 20261001130000) et `vip_card_templates` (le layout ne la lit plus sans session).
- **1 vue matérialisée** : `student_achievement_stats` (anon n'avait déjà pas SELECT, seulement des droits d'écriture inertes).
- **1 séquence** : `riddles_riddle_number_seq` (`riddles` n'a aucune policy d'INSERT satisfaisable par anon).

Écart avec l'inventaire du matin (141 objets) : +1 séquence, +1 vue matérialisée (non listées dans le fichier initial).

Vérifié : aucune policy `TO public/anon` d'une table gardée ne cite une relation fermée (recherche par nom dans `qual`/`with_check`) → pas de 42501 introduit sur une lecture anon. Policies `storage.*` visant `public` : uniquement `bucket_id = …`, non concernées.

### Fonctions à révoquer (PUBLIC + anon) : 143

Toutes les fonctions de `public` exécutables par anon, sauf les 4 RPC publiques. 138 avaient `anon=X` explicite + PUBLIC ; 5 seulement PUBLIC (`cleanup_kanban_assignees_on_move`, `friendships_freeze_parties`, `guard_profile_role_on_insert`, `set_class_member_left_at`, `sync_class_chat_membership`).

- **`authenticated` et `service_role` ont un GRANT explicite sur les 143** (ACL lue en prod). La migration le rejoue quand même avant le REVOKE (aucun effet en prod).
- **Aucune** des 143 n'est utilisée par une policy, un DEFAULT, un index ou une vue (pg_depend). Les fonctions citées par des policies `TO public/anon` (`is_admin`, `is_teacher_or_admin`, …) n'étaient **déjà plus** exécutables par anon : rien ne change pour elles.
- `is_valid_grade_array` sert dans 4 CHECK (exercises, question_templates, rag_documents, worksheets) : anon n'écrit dans aucune.
- Les triggers ne vérifient pas EXECUTE : les ~100 fonctions trigger continuent de tourner.

### RPC appelées depuis `src` parmi les 143 (grep `rpc('…')`, 2026-10-01)

Toutes derrière une session — aucune n'est appelée par anon :

| RPC                                             | Appelant                                                            | Garde            |
| ----------------------------------------------- | ------------------------------------------------------------------- | ---------------- |
| `generate_join_code`                            | `(protected)/dashboard/{admin,teacher}/classes/+page.server.ts`     | route protégée   |
| `get_accessible_kanban_boards`                  | `lib/server/kanban.ts` ← `(protected)/organisation/kanban`          | route protégée   |
| `mark_checkpoint_hint_revealed`                 | `api/python-notebooks/[id]/checkpoint-runs/[cell_id]/hint-revealed` | `if (!user) 401` |
| `upsert_checkpoint_run`                         | `api/python-notebooks/[id]/checkpoint-runs`                         | session          |
| `rag_hybrid_search`                             | `lib/server/rag/search.ts` ← `api/chat`                             | `requireAuth`    |
| `reorder_curriculum_{objectives,points,themes}` | `api/teacher/curriculum/*/reorder`                                  | session prof     |

### Ce qu'on garde, et pourquoi

- **Tables à policy `anon` ou `public`** (79 en prod, dont `question_templates`, `resource_tags`, `parody_evaluations`, `tags` réellement lues sans connexion) : hors périmètre de l'option b ; une policy `TO public` mal écrite y serait encore à auditer à part.
- **4 RPC publiques** (toutes `SECURITY DEFINER`) : `get_consent_info(uuid)`, `get_worksheet_by_share_token(text, uuid)`, `get_class_journal_by_share_token(text)`, `get_exercise_by_share_token(text)` — GRANT explicite à anon répété dans la migration.

## Livrables

- Migration : `supabase/migrations/20261001170000_anon_retrait_droits_herites.sql` (rollback complet en commentaire, droits exacts relevés en prod).
- Test : `tests/integration/anon-option-b.test.ts` (593 cas).

## Preuves

- ROUGE sans la migration (copie scratchpad, retrait, `db:reset`) : 287 échecs / 593 = exactement les 141 + 1 + 1 + 143 + 1 assertions de la partie (a) ; (b), (c), (d) verts (non-régression).
- VERT avec la migration restaurée depuis la copie (`cmp` identique), `db:reset` : 593 / 593.
- Suite d'intégration complète avec la migration : 1950 verts, 1 rouge, 12 skipped (137 fichiers). Le rouge : `competence-referentiel.test.ts` affirmait qu'anon lit `curriculum_themes` sans erreur et reçoit 0 ligne. Il reçoit maintenant un refus 42501, ce qui est le but de la migration. Le test affirme désormais le 42501. Relancé avec `anon-option-b` : 635 verts, 6 skipped.
- `check:incremental` (FORCE=1) : 0 erreur. `lint:fast` : RAS.

## Changement de comportement à connaître

Sur les 143 relations fermées, anon reçoit maintenant **une erreur 42501** au lieu de **0 ligne**. Un code qui interrogerait l'une d'elles sans session et traiterait `error` comme une panne afficherait une erreur au lieu d'une liste vide. Les logs prod sur 24 h ne montrent aucune lecture anon de ces tables (hors `vip_card_templates`, corrigé).

## Reste à faire

- [ ] security-auditor sur la migration.
- [ ] Commit, PR, CI.
- [ ] `db:migrate` (conditions CLAUDE.md : question d'accès tranchée par David).
- [ ] Après push : re-mesurer en prod (`has_table_privilege` / `has_function_privilege`) et surveiller les logs 24 h (erreurs 42501 anon).
