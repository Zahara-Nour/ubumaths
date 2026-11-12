# Chantier `regularite-sql` — grille de régularité comptée dans la base

Ouvert le 2026-11-12 : `docs/wip/outils-manquants.md` n° 28, né de la revue de #2587 (chantier
[`regularite`](../archive/wip/regularite-progress.md), clos). David : « ok pour 28 », puis
« je valide » (phase 0 ci-dessous).

## Reprendre ici

_Mis à jour le 2026-11-12, PR 1 (migration) en cours._

- **État** : PR 1 = migration `class_regularity_weeks` + intégration (5 ; les 4 premiers rouges sans la migration, verts avec) ; `security-auditor` : rien de bloquant · **Prochaine action** : revue `security-auditor`, PR, CI, merge, `db:migrate`, `db:types` ; puis PR 2 (le code de `getClassRegularityGrid` appelle la fonction) · **En attente de David** : rien · **Pièges en cours** : base locale : l'historique des migrations est en retard sur le schéma (`migration up --local` échoue sur `20261112131750`) → appliquer le fichier par `psql` + `notify pgrst` ; mono-prof : `is_my_student` = tout prof, pas de cas « autre prof » · **Worktree / branche** : `../ubumaths-wt-regularite-sql` · `feat/regularite-sql`

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
