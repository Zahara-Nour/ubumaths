# Refactor « professeur unique + école comme frontière sociale »

> Doc de reprise (crash recovery). Branche : `refactor/single-teacher`.
> Démarré : 2026-06-15.

## Contexte

Passer le site d'un modèle **multi-tenant professeurs** (plusieurs comptes prof,
chacun propriétaire/cloisonné de ses classes) à un modèle **mono-professeur** :

- **1 seul professeur = David** (`d.lejolly@voltairedoha.com`), définitif et voulu.
- **1 admin** à côté (`zahara.alnour@gmail.com`), rôle distinct.
- **Élèves** appartenant aux classes de David **ou non** (suivis hors classe).
- **École** = frontière sociale réelle (safeguarding mineurs / RGPD), élèves
  rattachés par UAI/RNE. Multi-écoles, mais toujours **un seul prof**.

Précision clé : « multi-écoles » et « multi-prof » sont deux axes **indépendants**.
Le schéma n'a JAMAIS eu de multi-prof par classe (`classes.teacher_id` singulier).

## Décisions verrouillées (validées par David)

| Sujet              | Décision                                                                                                              |
| ------------------ | --------------------------------------------------------------------------------------------------------------------- |
| Multi-prof         | Éteint — un seul prof (David), permanent                                                                              |
| Méthode            | **Verrouillage produit** : garder `teacher_id` partout, ne pas démolir le schéma (+ garde anti-2ᵉ-prof)               |
| Comptes démo       | **Tout supprimer** (4 profs + 4 classes + 20 élèves démo)                                                             |
| teacher / admin    | Rôles **distincts**                                                                                                   |
| Toi → élèves       | **Le prof voit TOUS les élèves** (Option B) ; la classe devient un dossier d'organisation, plus une frontière d'accès |
| École              | Frontière **sociale** réelle ; élèves rattachés par UAI/RNE                                                           |
| Social hors-classe | Pool = **école** (option b) ; classe = sous-pool ; global réservé à ce que David ouvre                                |

## Modèle cible (3 axes)

- **Prof (David)** : singleton, transcende tout. `is_my_student(x)` ≡ `is_teacher_or_admin()`.
- **École** (UAI/RNE) : frontière entre élèves (social/safeguarding/RGPD). Pas de prof propre.
- **Classe** : sous-groupe d'organisation sous David. Ni frontière prof, ni frontière sociale primaire.

## Plan — lots

1. **Ménage démo** (data) — supprimer 4 profs + 4 classes + 20 élèves démo. Risque faible.
2. **Verrou mono-prof** (+ garde anti-2ᵉ-prof). Risque faible.
3. **Axe 1 « prof voit tout »** (RLS, helper `is_my_student`). Risque **élevé** (cœur).
4. **Miroir serveur** (roster + bucket « non assignés »). Risque moyen.
5. **UI hors-classe**. Risque moyen.
6. **Social école-scopé**. Large, différable.
7. **Audit sécurité + doc/RGPD + checks finaux**.

Ordre reco : 1 → 2 → 3 → 4 → 5 → (6 différable) → 7.

## Phase 0 — vérifs de sûreté (FAIT, read-only)

État live de la base (prod) au 2026-06-15 :

- Rôles : 1 admin (Zahara), 5 `teacher` (David + 4 démo), 98 élèves réels + 3 test.
- **4 profs démo** (Baguette/Escargot/Fromage/Croissant) : `last_sign_in = null`,
  `auth.users.created_at` identique (2025-10-11 21:15:16), 1 classe archivée chacun,
  **0 autre donnée possédée** (0 schedule/chapter/journal/eval/rag/google…).
- **20 élèves démo-only** (rattachés uniquement à des classes démo) : 0 login,
  0 gidouille, 0 carte VIP, 0 amitié, 0 kanban, 0 game_player, 1 membership chacun.
  → seeds inertes, suppression sûre.
- **Élève à cheval** = `clara.rousseau@voltairedoha.com` : membership dans
  « 2nde Maths » (David, archivée) ET « 3ème Maths » (Escargot, démo). Jamais connectée
  (`last_sign_in=null`), 0 amitié/kanban/jeu/skill. Signaux de seed : `gidouilles=0.10`,
  1 carte VIP. **Décision David (2026-06-15) : supprimée aussi.** → cible totale = 25 comptes
  (4 profs + 20 démo-only + clara). Cascade confirmée : `profiles.id→auth.users` CASCADE,
  `classes.teacher_id→profiles` CASCADE, `class_members.*` CASCADE.
- `skill_attempts` **vide sur toute la plateforme** (système compétences sans données réelles).
- **1 seule école** : « Lycée Franco-Qatari Voltaire » ; `schools.uai` existe (NULL).

### Énumération exacte — policies à basculer au Lot 3 (Axe 1)

Pattern actuel : `EXISTS(classes c JOIN class_members cm WHERE c.teacher_id=auth.uid() AND cm.student_id=X)`.
Cible : `is_my_student(student_id)` (corps = `is_teacher_or_admin()`).

Policies de lecture prof « cœur » (≈12) :

- `skill_attempts` → `skill_attempts_select_teacher`
- `student_skill_state_a` → `student_skill_state_a_select_teacher`
- `student_observable_state` → `student_observable_state_select_teacher`
- `student_competence_level` → `student_competence_level_select_teacher`
- `student_achievements` → « Teachers can view their students achievements »
- `bonus_history` → « Teachers can view bonus history for their students »
- `daily_summaries` → « Teachers can view daily summaries for their students »
- `gidouilles_activity` → « Teachers can view gidouilles activity for their students »
- `reward_events` → « Teachers can view reward events for their students » (`is_class_teacher(class_id)`)
- `weekly_rewards` → « Teachers can view weekly rewards for their students »
- `weekly_best_rewards` → « Teachers can view student weekly best »
- `game_players` → « Teachers can view student game profiles »
- `profiles` → « Teachers can view student profiles in their classes » (helper `can_view_student_profile`)
  — NB : `profiles` est déjà largement lisible via policy `true` « Anyone can view profiles for leaderboard »,
  donc cette policy est en partie redondante pour le SELECT.

Tables sociales/classe (marketplace, game_combats, tournois, kanban…) → **hors Lot 3**,
traitées au Lot 6 ou laissées class-scopées.

## État d'avancement

- [x] Étude + décisions
- [x] Branche `refactor/single-teacher`
- [x] Phase 0 — vérifs de sûreté + énumération policies
- [x] Lot 1 — **exécuté & vérifié (2026-06-15)** : 1 prof (David), 1 admin, 77 élèves réels,
      0 compte démo restant, 6 classes David, 77 élèves actifs (−clara), 0 orphelin.
      Script : `scripts/cleanup-demo-accounts.sql`.
- [x] Lot 2 — **livré & appliqué sur EU (2026-06-16)** ✓ trigger + fonction confirmés via MCP.
      ⚠️ Détour infra : le 1ᵉʳ `db:migrate` ciblait l'**ancien projet US** (CLI pas relinké après la
      migration EU). Corrigé : `supabase link --project-ref cnevnzsvixxpnurautls` + réconciliation de
      l'historique (`scripts/repair-eu-migration-history.sh`, 610 migrations marquées applied) + re-push.
      **Désormais le CLI cible EU ; l'ancien projet US est mort.** (cf. supabase-eu-migration-plan.md)
- [~] Lot 2 (détail) — Verrou mono-prof en 3 couches : trigger DB
  `enforce_single_teacher` (0-ou-1, message lisible) ; garde serveur sur le **vrai** chemin
  `PATCH /api/admin/users/[id]` + mapping erreur DB→400 ; UI (rôle `teacher` non assignable +
  sélecteur prof retiré, classes auto-assignées via `maybeSingle`). **En attente David** :
  push migration (`pnpm db:migrate`) + `scripts/verify-single-teacher-trigger.sql`.
  ⏳ svelte-autofixer + eslint + check:incremental → gate qualité final du plan.
- [x] Lot 3 — **livré & appliqué EU (2026-06-16)** : helper `is_my_student()` (= `is_teacher_or_admin()`) + **34 policies de lecture prof → Option B**, en 3 migrations :
      `20260616120000` (3a, 13 cœur) · `20260616130000` (3b, 21 compléments) · `20260616140000`
      (3c, 3 manquées via `class_chapters`/`class_id`). `audit_logs` → `is_teacher_or_admin()` (clé JSON).
      Test : `tests/integration/single-teacher-rls.test.ts`. Audit sécu : **OK, pas de fuite** ; le trou
      de périmètre relevé a été comblé par un **balayage principiel** (toute table `student_id`/`user_id`
      avec policy prof class-scopée). **3 leaves intentionnelles** : `class_members` (roster),
      `python_exercise_assignments` (devoirs prof), `template_usage_stats` (stats classe).
- [x] Lot 4 — **livré (2026-06-16)** : `verifyTeacherStudent()` → Option B (prof/admin accède à
      tout élève, plus de JOIN class_members ; RLS `is_my_student` reste le vrai garde) +
      `getUnassignedStudents()` (bucket « Non assignés »). Test middleware réécrit (15 ✓).
      Revue code-reviewer : fail-closed, pas d'élargissement non voulu. Pas de migration.
- [~] Lot 5 — **UI hors-classe livrée (2026-06-16)** : section « Non assignés » dans le dashboard
  prof (`teacher/classes`) listant les élèves sans classe active, avec lien vers leur fiche
  (`/students/[id]/journal`). Loader branche `getUnassignedStudents`. `check:incremental` 0 erreur.
  **Reste optionnel** : action « rattacher à une classe » depuis cette section (non faite, à valider
  avec David — pas nécessaire pour « le prof voit les hors-classe »).
- [ ] Lot 6 — social école
- [~] Lot 7 — closing **en cours** : (a) ✅ **AIPD mise à jour** (`docs/ref/conformite/aipd-dpia.md`
  rév. 0.3 : accès lecture prof à toutes données élèves, sensibles incluses). (b) ⚠️ **Finding tests/seed**
  (voir note ci-dessous) — décision David requise. (c) checks finaux : `check:incremental` 0 erreur,
  pre-commit eslint+tests verts à chaque commit.

## Notes / points ouverts

- **Lot 7 — remédiation tests/seed (FAITE 2026-06-16, sans bypass — respecte « pas d'échappatoire »)** :

  - **Seed** : nouveau `tests/integration/global-setup.ts` (globalSetup du config intégration) supprime
    **tous les profs** de la base de test locale avant la suite (les 4 profs seed de `015` cascadent).
    → chaque test démarre avec 0 prof. Base locale uniquement, jamais la prod.
  - **Tests 2-profs** (impossibles + assertions d'isolation inter-prof contredites par Option B) :
    skippés avec note → `kanban-rls` (1), `competence-referentiel` (5 : 1155/1216/1475/1506/1543),
    `vip-card-filters` (1). Et `competence-referentiel:607` **réparé** (réutilise le prof de `setupChercher`,
    pas de 2ᵉ prof). Scan awk complet : tous les blocs `it()` ≥2 profs des tests **fonctionnels** sont couverts.
  - **Hors-scope** : `tests/integration/database/*-triggers.test.ts` (cleanup/messaging/chat/sync/updated-at)
    ont aussi des tests 2-profs mais sont **déjà non fonctionnels en local** ([[feedback_no-trigger-tests]],
    Docker) → à traiter seulement s'ils sont remis en service. **À vérifier par David** : `pnpm db:start`
    puis `pnpm test:integration` (les `*-triggers` peuvent rester rouges pour d'autres raisons).

- **Lot 3 — RGPD à acter (Lot 7)** : `parental_consents`, `audit_logs`, `welcome_emails_sent` sont
  désormais visibles au compte PROF (avant : class-scopé). Aucun privilège nouveau (David y accède
  déjà en admin) mais **à documenter dans l'AIPD**. Leçon : énumérer les policies par pattern est
  piégeux (class_members vs class_chapters vs class_id) — le **balayage principiel** par colonne
  `student_id`/`user_id` est la méthode fiable.
- **Lot 3 — nits d'audit (acceptés)** : 3 policies en `TO public` (au lieu de `authenticated`) et
  `is_my_student` en `SECURITY DEFINER` (inutile car délègue) — inoffensifs, non corrigés (migrations
  déjà poussées, zéro gain).
- **Lot 2 — revue** : BLOQUANT corrigé (garde déplacée sur `PATCH /api/admin/users/[id]`,
  l'action de form `update_profile` étant morte) ; `.single()`→`.maybeSingle()` ; état
  `formData.teacher_id` orphelin nettoyé. Race théorique du trigger jugée négligeable (1 admin) ;
  index unique partiel documenté en option dans la migration.
- **Mécanisme Lot 1 (décidé)** : script one-off gardé `scripts/cleanup-demo-accounts.sql`
  (transaction unique, garde-fous PRE/POST, `RAISE EXCEPTION`→ROLLBACK si déviation).
  Sélection par critères (emails démo + démo-only + clara), pas d'UUID en dur sauf David.
  David l'exécute une fois contre la prod (SQL editor/psql). NON versé dans migrations/.
- **Classes archivées « seed-like » de David** (« 2nde Maths », etc.) : hors-scope Lot 1
  (appartiennent à David). Nettoyage éventuel séparé.
- David pousse les migrations (`pnpm db:migrate`) ; pas de push/release automatique.
