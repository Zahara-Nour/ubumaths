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
- [ ] Lot 2 — verrou mono-prof
- [ ] Lot 3 — RLS Axe 1
- [ ] Lot 4 — miroir serveur
- [ ] Lot 5 — UI hors-classe
- [ ] Lot 6 — social école
- [ ] Lot 7 — audit / doc / checks

## Notes / points ouverts

- **Mécanisme Lot 1 (décidé)** : script one-off gardé `scripts/cleanup-demo-accounts.sql`
  (transaction unique, garde-fous PRE/POST, `RAISE EXCEPTION`→ROLLBACK si déviation).
  Sélection par critères (emails démo + démo-only + clara), pas d'UUID en dur sauf David.
  David l'exécute une fois contre la prod (SQL editor/psql). NON versé dans migrations/.
- **Classes archivées « seed-like » de David** (« 2nde Maths », etc.) : hors-scope Lot 1
  (appartiennent à David). Nettoyage éventuel séparé.
- David pousse les migrations (`pnpm db:migrate`) ; pas de push/release automatique.
