# Chantier `regularite-sql` — grille de régularité comptée dans la base

Ouvert le 2026-11-12 : `docs/wip/outils-manquants.md` n° 28, né de la revue de #2587 (chantier
[`regularite`](../archive/wip/regularite-progress.md), clos). David : « ok pour 28 », puis
« je valide » (phase 0 ci-dessous).

## Reprendre ici

_Mis à jour le 2026-11-12, après #2604 ; PR 2 en cours._

- **État** : PR 1 mergée (#2604), `db:migrate` fait, `db:types` dans la PR 2. PR 2 = `getClassRegularityGrid` appelle `class_regularity_weeks` (plus aucune trace lue) ; tests unitaires réécrits (rouges puis verts), parité SQL ↔ `activeDaysOf` en intégration (6 verts) · **Prochaine action** : `code-reviewer`, PR, CI, merge ; ligne 28 de `outils-manquants.md` → « Livré » ; clôture · **En attente de David** : rien · **Pièges en cours** : base locale : historique des migrations en retard (`migration up --local` échoue) → `psql` + `notify pgrst` · **Worktree / branche** : `../ubumaths-wt-regularite-sql` · `feat/regularite-sql-code`

## Constat (2026-11-12)

`getClassRegularityGrid` (`src/lib/server/stats/class-regularity.ts`) lit, à chaque ouverture de
la grille, toutes les traces autonomes de la classe depuis la rentrée (pages de 1000), puis compte
en mémoire : traces par élève × jour de Paris → jours ≥ 5 traces → jours actifs par semaine.

## Phase 0 — validée par David le 2026-11-12 (« je valide »)

- **Fonction** `class_regularity_weeks(p_class_id uuid, p_first_day date, p_min_traces int)` →
  `(student_id, week_start, active_days)`, mêmes règles : sources `auto`/`srs`/`student_self`, lieu
  `evaluation` exclu, sans lieu compté, jour de Paris, seuil en paramètre (une seule source : la
  constante TS), semaine lundi → dimanche, membres `active` de la classe.
- **`security invoker`** : RLS de l'appelant ; exécution à `authenticated`, retirée à `anon`.
- **TS** : `buildRegularityGrid` reçoit les jours actifs par semaine ; semaines, vacances, paliers
  restent en TS ; le prof ne reçoit que le palier. `loadWeekMoment` (Palotin) hors périmètre.
- **Comportements** : nominal = même grille case pour case (test ancien calcul vs nouveau) ;
  limites = 23 h 30 Paris, dimanche soir, 4 traces, sans lieu, contrôle ; erreur = 500 journalisé.
- **Question d'accès** : **personne** ne lit rien de plus.
- **Livraison** : PR 1 migration + intégration, `db:migrate` + `db:types` ; PR 2 le code.

## PR 1 — migration (2026-11-12)

- `supabase/migrations/20261112210248_regularite_comptee_en_base.sql` ; intégration
  `tests/integration/regularite-comptee-en-base.test.ts` (5) : comptes exacts pour le prof
  (frontière de Paris, 4 traces, contrôle, sans lieu, `srs`, `student_self`, avant la rentrée),
  membre archivé exclu, élève limité à ses traces, élève hors classe → rien, `anon` refusé (42501). Rouges sans la migration
  (fonction introuvable), vertes avec.
- **Écart avec la phase 0** : le cas « un prof d'une autre classe → 0 ligne » n'existe pas
  (mono-prof : `is_my_student` et `is_class_teacher` = tout prof ou admin) ; remplacé par « membre
  archivé exclu ». Réponse à la question d'accès inchangée.
- Plan : `idx_skill_attempts_student_time` utilisé (jointure par élève, borne `created_at`).
- `security-auditor` : aucun finding bloquant (prod : mêmes policies SELECT qu'en local ; timing
  par élève via l'index ; `p_first_day` ancien ou `p_min_traces` ≤ 0 sans effet nuisible). Faibles :
  cas « élève hors classe » ajouté (test 4, vert) ; **à faire en PR 2** : `p_min_traces` NULL rend
  une grille vide en silence → l'appelant passe la constante `MIN_TRACES_PER_ACTIVE_DAY` ; garder
  `locals.supabase` + `requireTeacherOfClass`, ne renvoyer que les paliers.
- Mergée le 2026-11-12 (#2604) ; `db:migrate` fait (essai à blanc d'abord : seule cette migration).

## PR 2 — le code (2026-11-12)

- `db:types` : `class_regularity_weeks` dans `database.ts`.
- `class-regularity.ts` : `buildRegularityGrid` reçoit `activeWeeks` (`RegularityWeekCount[]`) au
  lieu des traces ; `getClassRegularityGrid` appelle la fonction avec le client du prof et
  `p_min_traces = MIN_TRACES_PER_ACTIVE_DAY` (jamais NULL : finding faible de l'audit) ; erreur →
  levée (E1). `readAllRows` retiré. `isAutonomousTrace`, `AUTONOMOUS_SOURCES` gardés (Palotin).
- Tests unitaires réécrits (règles de trace → intégration) : 9 rouges avant le code ; intégration
  - test 6 « parité » : jours actifs SQL = `activeDaysOf` (règle TS du Palotin) sur les mêmes traces.
- Doc : `analytique-prof.md` (widget C).
- Revues : `security-auditor` (rien) ; `code-reviewer` (rien de bloquant). Gardés : (1) la borne
  haute « aujourd'hui » de l'ancien calcul n'existe plus : une trace datée d'un jour à venir de la
  semaine en cours compterait (les semaines à venir restent hors grille) ; `created_at` vaut
  `now()` en pratique, effet au plus sur le palier de la semaine en cours ; (2) `data` nul sans
  erreur → grille vide (cas que supabase-js ne produit pas). Commentaire périmé du test corrigé.
