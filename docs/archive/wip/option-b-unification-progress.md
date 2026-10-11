# Unification Option B + retrait partage inter-profs — Progress

> Statut : **PO validé. Phases 1–3 FAITES (branche `refactor/option-b-unification`).** Reste : revues (code-reviewer + security-auditor) → PR. Migration destructive `DROP COLUMN is_public` = **PR de suivi après deploy**.
> Date de départ : 2026-06-18. Contexte : suite de l'audit mono-prof ([[project_single-teacher-refactor]]).

## Journal d'exécution (2026-06-18)

- **Phase 1 — tests d'abord** : 3 fichiers d'intégration (`option-b-messaging`, `option-b-feature-rls`, `inter-teacher-sharing-removed`), 17 tests, rouges d'abord puis verts. Fixture **élève hors-classe**.
- **Phase 2 — migration** : `supabase/migrations/20260618093000_option_b_unification_remove_inter_teacher_sharing.sql` (non destructive). `db:reset` OK. **Suite d'intégration complète verte** (301 passés ; test stat. VIP 10 000 tirages mis en `it.skip` à la demande PO).
- **Phase 3 — code applicatif** : endpoints modération `messages/[id]` + `restrict-user` passés en role-based (Option B) ; retrait complet de `is_public`/`isPublic`/`include_public` côté chapter_templates + worksheet_templates (server, API, types, validation Zod, UI Svelte, tests). `pnpm check:incremental` = **0 erreur** (1697 fichiers) ; unit tests affectés verts (168).

### Découvertes en route (vérifiées en prod)

- **Bug prod préexistant** : `get_student_teachers`/`get_teacher_students` référencent `classes.archived` (colonne inexistante → `classes` a `is_active`) → les 3 RPC messagerie **erraient en prod**. La réécriture role-based **corrige** ce bug.
- **`profiles`** : la visibilité est déjà ouverte (`USING true` leaderboard) + `is_my_student` ⇒ `students_view_class_teacher_profile` (is_class_teacher_of) était **mort/redondant** → simplement DROP (aucun test comportemental possible, aucun changement observable).
- **Kanban** : confirmé **sans divergence hors-classe** (boards `owner_id`/classe ; perso = privé voulu) → **sorti du périmètre** (aucun changement).

## Objectif

1. **Unifier la messagerie + certaines RLS sur Option B** : le prof unique voit / peut messager /
   modérer **tous** les élèves, y compris ceux qui ne sont dans **aucune classe** (hors-classe).
   Aujourd'hui ces parties sont restées scopées « par classe » (héritage multi-prof) → divergence
   avec `is_my_student()` (= `is_teacher_or_admin()`).
2. **Retirer le partage de contenu entre professeurs** (résidus multi-prof).

## Décisions PO (2026-06-18)

| #   | Sujet                   | Décision                                                                                                                                                                                                |
| --- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D1  | Portée messagerie       | **Tous les élèves, sans filtre école** (pur Option B, role-based).                                                                                                                                      |
| D2  | RLS features à basculer | **Python (lecture du travail élève) + Profils prof↔élève.** `student_warnings` **exclu** (reste par classe). **Kanban : recommandé hors périmètre** (pas de divergence réelle — voir §Hors périmètre). |
| D3  | Exercices publics       | **Garder** l'accès public élève (`is_public`, share tokens, `/exercice/[slug]`). Retirer seulement le résiduel inter-profs (`Teachers can view all exercises`).                                         |
| D4  | Colonnes `is_public`    | **DROP COLUMN** sur `chapter_templates` ET `worksheet_templates` (destructif → après déploiement).                                                                                                      |

## Périmètre — ce qui change

### A. Messagerie / modération (réécrire sur Option B, role-based, sans filtre école)

RPC Postgres (SECURITY DEFINER) à réécrire :

- `get_allowed_recipients(p_user_id)` : élève → **le prof unique** ; prof → **tous les élèves** (`role='student'`, `is_test=false`) ; admin → inchangé.
- `validate_message_recipients(sender, recipient[])` : élève → recipient doit être le prof ; prof → recipients doivent tous être des élèves ; admin → ok.
- `can_moderate_message(moderator, message)` : prof peut modérer si sender **ou** un recipient est un élève (`role='student'`), hors-classe inclus ; admin → true.
- Helpers `get_student_teachers` / `get_teacher_students` : ne plus être utilisés par la messagerie (les laisser ou les retirer — voir §À confirmer). `validate_class_message_recipients` : reste (envoi groupé à SA classe = légitime, la classe est un dossier).

Policy : `private_messages` _« Teachers can view messages for moderation »_ (utilise `can_moderate_message`) — inchangée dans sa forme, dépend de la nouvelle fonction.

Endpoints à aligner (jointures `class_members` → role-based) :

- `src/routes/api/moderation/messages/[id]/+server.ts` (autorisation suppression).
- `src/routes/api/moderation/restrict-user/+server.ts` (restriction globale).
- `src/routes/api/messages/recipients/+server.ts` (liste destinataires).
- Déjà OK (Option B), ne pas toucher : `src/lib/server/middleware/student-access.ts`.

### B. RLS features → Option B (lecture du travail élève par le prof)

Remplacer `is_teacher_of_student(...)` par `is_my_student(...)` :

- `python_files` — _« Teachers can read student python files »_ : `is_teacher_of_student(owner_id)` → `is_my_student(owner_id)`.
- `python_notebooks` — _« Teachers can read student notebooks »_ : `is_teacher_of_student(author_id)` → `is_my_student(author_id)`.
- `python_exercise_mastery` — _« pem_select_teacher »_ : `is_teacher_of_student(student_id)` → `is_my_student(student_id)`.
- `python_notebook_checkpoint_runs` — _« Teachers can read checkpoint runs… »_ : ajouter une branche `is_my_student(user_id)` (sinon un run d'élève hors-classe sur notebook public échappe au prof). Garder la branche `author_id`.

`profiles` :

- _« students_view_class_teacher_profile »_ : `is_class_teacher_of(id)` → **tout élève voit le profil du prof unique** (condition role-based : la ligne ciblée a `role='teacher'`).
- À CONFIRMER en implémentation : _« Teachers can update student rewards in their classes »_ (UPDATE class-scopé) → un élève hors-classe ne peut pas recevoir de récompense modifiée par le prof. Candidat à basculer aussi (cohérence Option B).

**Ne PAS toucher** (légitimement class-scopé, = assigner à SA classe / roster) :

- `python_file_assignments` / `python_notebook_assignments` INSERT _« assign to their classes »_ (`is_teacher_of_class`).
- `class_members` (roster). `student_warnings` (exclu par D2).
- `python_notebooks` _« Teachers can read public notebooks »_ (bibliothèque publique de notebooks — hors sujet inter-prof ; à laisser).

### C. Retrait du partage inter-profs

- **`chapter_templates`** :
  - DROP policy _« Teachers can view public published templates »_.
  - `src/lib/server/chapter-templates.ts` : retirer la branche `or(is_public.eq.true, …)` de `listChapterTemplates` ; `publishTemplate` ne prend plus `isPublic` ; `instantiate`/détail : accès = **owner uniquement** (retirer `isPublicPublished`).
  - Endpoints `api/teacher/chapter-templates/[id]/+server.ts`, `/publish`, `/instantiate` : retirer `isPublic`/`isPublicPublished`.
  - UI `dashboard/teacher/contenu/templates/**` : retirer onglet/filtre « publics » + badge « Public ».
  - **DROP COLUMN `is_public`** (après déploiement) → régénérer `database.ts`.
- **`worksheets`** :
  - Policy _« Users can view worksheets »_ : retirer la branche prof↔prof même-école (`p1.school_id=p2.school_id … p1.role='teacher'`). Garder `created_by`, admin, `student_has_worksheet_access`.
- **`worksheet_templates`** :
  - Retirer le partage public : `src/routes/(protected)/dashboard/teacher/contenu/worksheets/templates/+page.server.ts` + `src/routes/api/worksheets/templates/+server.ts` (param `include_public`, `or('is_public.eq.true,…')`).
  - **DROP COLUMN `is_public`** (après déploiement) → régénérer `database.ts`.
- **`exercises`** :
  - Policy _« Teachers can view all exercises »_ (role=teacher voit tout) → _« Teachers can view own exercises »_ (`created_by = auth.uid()`).
  - **Ne pas toucher** : `is_public`, _« Anyone can read public exercises »_, share tokens, `/exercice/[slug]` (accès élève/parent).

## Hors périmètre (vérifié, justifié)

- **Kanban** : `kanban_boards` scopé `owner_id` + boards de classe visibles via `is_class_teacher` (le prof unique possède toutes les classes → il les voit déjà). Boards personnels (`class_id IS NULL`) = privés au propriétaire (intentionnel, y compris élèves). Pas d'élève hors-classe qui échappe. Toucher `can_access_kanban_board/column` = risque pour gain nul → **laissé tel quel** (sauf objection PO).
- Social élève↔élève scopé école (amitiés `same_school`, `marketplace_listings`), export Google Classroom (`shared_coursework`/`shared_materials`, scopé `classes.teacher_id`), leaderboards (CTE teacher borné `my_school()`) : corrects, non touchés.

## Comportements (TDD — à valider avant de coder)

### Messagerie

- **Nominal** : un élève hors-classe peut écrire au prof ; le prof peut lui écrire et apparaît dans ses destinataires.
- **Nominal** : le prof voit **tous** les élèves (non-test) comme destinataires, hors-classe inclus.
- **Limite** : élèves `is_test=true` exclus de la liste du prof.
- **Erreur** : élève → autre élève = refusé ; élève → non-prof = refusé ; tableau vide = refusé.

### Modération

- **Nominal** : le prof modère tout message dont sender/recipient est un élève (hors-classe inclus) ; admin modère tout.
- **Limite** : message entre deux élèves hors-classe → modérable par le prof (avant : non).
- **Erreur** : non-prof/non-admin → false ; message inexistant → false.

### RLS features

- **Nominal** : le prof lit les `python_files`/`notebooks`/`mastery` de tout élève (hors-classe inclus) ; tout élève voit le profil du prof unique.
- **Non-régression** : un élève ne lit pas le travail Python d'un autre élève ; `student_warnings` reste par classe.

### Partage inter-profs

- **Nominal** : `listChapterTemplates`/UI ne renvoient que les templates `created_by` du prof ; instancier/détailler un template = owner uniquement.
- **Non-régression** : instanciation OK, accès élève au chapitre via `class_chapters` OK ; `/exercice/[slug]` public OK ; worksheets assignées aux élèves OK.

## Phasing & ordre prod-safe

1. **Phase 1 — Tests d'abord (doivent échouer)** : tests d'intégration locaux (Supabase local, **jamais** smoke-test `auth.uid()` NULL) avec fixture **élève hors-classe** : messagerie (3 RPC), modération (`can_moderate_message` + policy), RLS Python/profils, retrait partage (chapter_templates/worksheets/exercises).
2. **Phase 2 — Migration RLS/RPC (non destructive)** : réécriture des 3 RPC, swap policies (B + C hors DROP COLUMN), `exercises view all→own`. Tests passent en local.
3. **Phase 3 — Code applicatif** : endpoints modération/recipients, `chapter-templates` server/API/UI, `worksheets/templates` server/API. `svelte-autofixer` sur `.svelte`, `pnpm check:incremental` = 0.
4. **Phase 4 — Revue** : `code-reviewer` + **`security-auditor` (obligatoire, RLS/auth)**.
5. **PR → CI verte → merge (accord explicite)** → `db:migrate` de la migration non destructive (avec/avant deploy).
6. **Phase 5 — Migration destructive (après deploy vérifié)** : `DROP COLUMN is_public` sur `chapter_templates` + `worksheet_templates` ; `pnpm db:types` + commit. **Accord explicite requis.**

## Agents / modèles

- `supabase-expert` (Opus) — migrations RLS/RPC + tests d'intégration.
- `backend-developer` (Opus) — endpoints modération/recipients + chapter-templates/worksheets server.
- `frontend-developer` — UI templates/worksheets (retrait « public »).
- `security-auditor` (Opus) — **obligatoire** en fin (RLS/auth).
- `code-reviewer` — fin de phase.

## À confirmer pendant l'implémentation

- `profiles` _« update student rewards in their classes »_ : basculer Option B aussi ? (récompenses pour élève hors-classe).
- Sort des helpers `get_student_teachers` / `get_teacher_students` une fois la messagerie réécrite (laisser morts vs DROP).
- `python_notebook_checkpoint_runs` : confirmer l'ajout de la branche `is_my_student(user_id)`.

## Revues (2026-06-18) — verdict : OK pour merge

- **security-auditor** : « Safe to merge », 0 critical/high. Tous les chemins élève/parent préservés ; `is_my_student` utilisé uniquement en lecture prof/admin ; modération role-gated.
- **code-reviewer** : « ready to merge », 0 blocker. RPC SQL correctes, retrait `is_public` complet, runes OK.

### Follow-up (hors PR — à traiter plus tard)

- **(PR de suivi, destructif)** `DROP COLUMN is_public` sur `chapter_templates` + `worksheet_templates`, **après** deploy vérifié → `pnpm db:types` + commit. Nettoyer alors les mocks `is_public` inertes dans `templates/__tests__/routes.test.ts`.
- **(durcissement, optionnel)** Lier `sender`/`p_user_id` à `auth.uid()` dans `get_allowed_recipients`/`validate_message_recipients`/`send_private_message` (pattern préexistant ; seul appelant passe `user.id` → sûr aujourd'hui).
- **(optionnel)** `restrict-user` scope `conversation` : valider que `scopeId` est une vraie conversation du destinataire (évite des restrictions orphelines ; inerte sous mono-prof).
- **(cosmétique)** Corriger le COMMENT de `is_admin()` (« admin or teacher » → « admin only ») dans la migration de suivi.

### Migration de suivi (Phase 5, destructive) — PRÊTE, à créer en PR séparée APRÈS deploy vérifié

> ⚠️ NE PAS ajouter à `supabase/migrations/` sur cette branche (rendrait cette PR destructive). Créer une **nouvelle branche** après le deploy de la PR #26, coller ce SQL dans `supabase/migrations/<nouveau-timestamp>_drop_is_public_template_columns.sql`, puis `db:migrate` + `pnpm db:types` (+ commit `database.ts`).

```sql
-- Drop the now-unused is_public columns on the two template families.
-- Inter-teacher sharing was removed (RLS + app) in the previous migration; the
-- app no longer reads/writes these columns. Destructive → after deploy only.
ALTER TABLE public.chapter_templates DROP COLUMN IF EXISTS is_public;
ALTER TABLE public.worksheet_templates DROP COLUMN IF EXISTS is_public;

-- Cosmetic: is_admin() COMMENT wrongly says "admin or teacher"; the body checks
-- role = 'admin' only. Fix it while we're here (flagged in review).
COMMENT ON FUNCTION public.is_admin() IS 'True when the current user has role = admin.';
```

Après application : retirer les champs `is_public` inertes restants dans `templates/__tests__/routes.test.ts` (mocks).

## Definition of Done

- [ ] Tests d'intégration locaux verts (fixture hors-classe) — messagerie, modération, RLS features, retrait partage.
- [ ] `svelte-autofixer` sur `.svelte` modifiés · `pnpm check:incremental` = 0 erreur.
- [ ] `code-reviewer` + `security-auditor` OK.
- [ ] Migration non destructive déployée ; **puis** DROP COLUMN + `db:types` (accord explicite).
- [ ] Zod sur entrées · pas de `any` · runes only · MySelect/MyCheckbox.
