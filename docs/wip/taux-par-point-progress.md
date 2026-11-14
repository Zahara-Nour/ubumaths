---
status: en-cours
---

# Chantier `taux-par-point` — taux de réussite de la classe par point et par notion (P3)

Ouvert le 2026-11-14, choisi par David après la clôture de `durees-trop-courtes`. Besoin P3 validé le
2026-11-11 ([`formes-de-serie-progress.md`](../archive/wip/formes-de-serie-progress.md) § « Besoins de
suivi validés ») : « taux de réussite par point et par notion » (prof, classe). Dernier écran prévu
sur les nouvelles traces (P4, P5, P6, P7, P8, P9 faits).

## Reprendre ici

_Mis à jour le 2026-11-14, PR 1 ouverte._

- **État** : T1 tranchée (base, accès : personne ne lit rien de plus) ; PR 1 (migration `class_template_success` + intégration, 5 tests rouges sans la migration, verts avec) ouverte · **Prochaine action** : audit `security-auditor`, CI verte → merge → `db:migrate` depuis le dépôt principal → PR 2 (`db:types`, calcul, endpoint, widget) · **En attente de David** : rien · **Pièges en cours** : base locale : migration appliquée par `docker exec supabase_db_ubumaths psql` + `notify pgrst` (pas de `psql` sur la machine) ; prod presque vide (vérifier en local, `db:seed-riche`) ; l'analytique refuse le compte admin ; `success` jamais NULL sur une trace de modèle (CHECK) · **Worktree / branche** : `../ubumaths-wt-taux-par-point`, `feat/taux-par-point`

## Ce qui existe (vérifié le 2026-11-14)

- **Analytique de la classe** (`/dashboard/teacher/classes/[classId]/analytics`, onglet Connaissances,
  [analytique-prof.md](../systeme/analytique-prof.md)) :
  - grille A élève × point : badge de **mémorisation** (révision espacée, 🆘 / 🔁 / ⏳ / ✅ / ◯),
    colonnes dans l'ordre de l'arbre (branche › notion › point), notion sous chaque nom, pied de
    colonne « % acquise / % à remédier » ;
  - E « Top à remédier » : points triés par % 🆘 + 🔁, détail élèves et erreurs (P4) ;
  - C régularité (P5), B courbe de rétention.
  - **Aucun taux de réussite** : tout est mémorisation, rien ne dit « 62 % de réponses justes ».
- **Suivi d'un élève** (P8, P9, `student-follow-up.ts`) : par point, deux comptes `{ done, succeeded }`.
  **Prouvé** = sources `auto` + `teacher` (l'appli ou un adulte a jugé) ; **déclaré** = `student_self`
  - `srs` (l'élève a dit « je sais »). Une trace sans verdict ou d'origine inconnue ne compte nulle part.
- **Traces** (`skill_attempts`) : élève, modèle, réussi, lieu, date ; modèle → points par
  `question_template_points` ; point → notion en remontant l'arbre (`placeInTree`, `keepLinksOfGrade`
  pour le niveau de la classe). Contrôles : traces `evaluation` écrites par le serveur (réussi = juste).
- **Accès** : `requireTeacherOfClass` ; RLS `skill_attempts_select_teacher` (`is_my_student` = prof
  unique ou admin). A priori **aucune migration** ; si la lecture des traces est trop lourde, un
  comptage par la base, comme pour la régularité (`class_regularity_weeks`), serait une migration à part.

## Plan technique (2026-11-14, à valider : T1)

**Coût de la lecture.** Le taux a besoin de toutes les traces prouvées de la classe depuis la rentrée.
C'est exactement la lecture que `regularite-sql` a retirée de la grille C (`outils-manquants.md`
n° 28 : pages de 1000, à chaque ouverture). Ordre de grandeur : 30 élèves × ~150 jours × quelques
dizaines de traces = des centaines de milliers de lignes en fin d'année. La grille A lit d'ailleurs
`skill_attempts` sans pages (plafond `max_rows`) : ce n'est pas un modèle à suivre.

- **T1 — recommandé : comptage par la base**, fonction
  `class_template_success(p_class_id uuid, p_first_day date)` →
  `(student_id, template_id, proved_done, proved_succeeded, declared_done)`. `security invoker`
  (RLS du prof), `authenticated` seulement, membres `active`, `template_id` non NULL, jour de Paris
  ≥ `p_first_day`, `success` NULL hors compte, prouvé = `auto`/`teacher`, déclaré =
  `student_self`/`srs`. Une ligne par élève × modèle : quelques milliers au plus.
  Livraison en deux PR (règle `db:types`) : PR 1 = migration + intégration, `db:migrate`, `db:types` ;
  PR 2 = le code. Question d'accès attendue : **personne ne lit rien de plus** (comptes de traces
  que le prof lit déjà par la RLS `skill_attempts_select_teacher`).
- Autre choix : lecture des traces en TypeScript (`readInBatches`, une seule PR, pas de migration),
  au prix de la lecture que n° 28 a jugée trop lourde.

**Calcul (TypeScript, pur, testé en unitaire)** : `buildClassSuccessRates` dans
`src/lib/server/stats/class-success-rate.ts`.

1. Liens modèle → points : `question_template_points` + `isLivePoint` + `keepLinksOfGrade` (niveau de
   la classe), comme la grille A.
2. **Point** : pour chaque élève, les comptes de ses modèles liés au point → taux de l'élève =
   réussis / faits (prouvé). Taux du point = moyenne des taux des élèves ayant ≥ 1 réponse prouvée
   (Q3) ; `students` = leur nombre. Moins de 3 → `rate: null` (« pas assez de réponses », Q5).
   Aucun prouvé mais du déclaré → `onlyDeclared` (Q2).
3. **Notion** : même règle, chaque trace comptée **une fois** par notion (un modèle lié à deux points
   de la même notion ne double pas l'élève). Notion = celle de `placeInTree` ; point non placé → en
   dernier, sans notion, comme la grille A.
4. Ordre : celui de `placeInTree` (branche › notion › point).
5. Rentrée : `readSchoolYear` + `regularityFirstDay` (règle de la régularité, Q4).

**Serveur** : `getClassSuccessRates(supabase, classId)` (lève en cas d'échec de lecture, E1) ;
endpoint `GET /api/teacher/classes/[classId]/analytics/success-rate` (`classIdParamSchema`,
`requireTeacherOfClass`). Réponse : `{ notions: [{ name, branch_name, rate, students,
onlyDeclared, points: [{ id, name, rate, students, onlyDeclared }] }] }`. Aucun nom d'élève, aucune date.

**UI** : `ClassSuccessRates.svelte` dans `src/lib/components/teacher/analytics/`, une carte de l'onglet
Connaissances (après E). Notions repliées, clic → points. Messages : classe sans trace, aucun point
prouvé, erreur dans le cadre de la carte. Rafraîchi par `refreshNonce` comme les autres widgets.

**Tests d'abord** : unitaires du calcul (moyenne par élève, seuil 3, déclaré seul, `success` NULL,
source inconnue, modèle à deux points d'une même notion, niveau de la classe, rentrée) ; endpoint
(200, 400, 403) ; intégration de la fonction si T1 = base (comptes exacts, frontière de Paris,
membre archivé exclu, élève hors classe → rien, `anon` 42501, rouges sans la migration).
Revue : `code-reviewer` + `security-auditor` (données d'élèves, API). Doc : `analytique-prof.md`
(nouveau widget), `base-de-donnees.md` si fonction.

## Décision T1 (David, 2026-11-14 : « je suis tes recos »)

Comptage par la base ; question d'accès : **personne** ne lit rien de plus.

## PR 1 — migration (2026-11-14)

- `supabase/migrations/20261114173810_taux_par_point_compte_en_base.sql` : `class_template_success`
  (security invoker, `authenticated` seulement, rollback en commentaire).
- `tests/integration/taux-par-point-compte-en-base.test.ts` (5) : comptes exacts (frontière de Paris
  de la rentrée, contrôle et prof dans le prouvé, déclaré à part, modèle seulement déclaré), membre
  archivé exclu, élève limité à ses traces, élève hors classe → rien, `anon` 42501. **Rouges sans la
  migration** (PGRST202, fonction introuvable), verts avec.
- Plan : `idx_skill_attempts_student_template_time` (local, `enable_seqscan=off`).

## Phase 0 — comportements proposés (à valider)

- **Nominal** : dans l'onglet Connaissances, un widget « Taux de réussite » liste les **notions**
  travaillées par la classe, rangées dans l'ordre de l'arbre (branche › notion). Chaque notion donne
  son taux (« 64 % de réussite · 18 élèves »), et un clic déplie ses **points**, chacun avec son taux.
  Le taux ne compte que le **prouvé** : réponses corrigées par l'appli ou le prof.
- **Limite** : un point ou une notion avec moins de **3 élèves** → « pas assez de réponses » au lieu
  d'un taux. Aucun point travaillé → message. Une classe sans trace → message.
- **Erreur** : lecture en échec → message dans le cadre du widget, le reste de la page reste.

## Décisions (David, 2026-11-14 : « je suis tes recos »)

- **Q1** : un **widget à part** dans l'onglet Connaissances ; notions dans l'ordre de l'arbre,
  dépliables en points.
- **Q2** : **prouvé seulement** (sources `auto` + `teacher`) ; flash-cards et révision (déclaré) hors
  du taux ; mention « seulement déclaré » quand un point n'a que du déclaré.
- **Q3** : **chaque élève pèse autant** (taux de chaque élève, puis moyenne).
- **Q4** : **depuis la rentrée** (année scolaire de l'école, règle de la régularité).
- **Q5** : moins de **3 élèves** → « pas assez de réponses ».

## Questions à David (phase 0, posées le 2026-11-14 — tranchées ci-dessus)

- **Q1 — Où ?** Recommandé : un **widget à part** dans l'onglet Connaissances (notions, dépliables en
  points). Autres choix : une ligne « % réussite » en pied de la grille A (déjà chargée en pieds), ou
  une colonne dans « Top à remédier ».
- **Q2 — Quelles réponses ?** Recommandé : le **prouvé seulement** (Saisie, Contrôle blanc, Course,
  contrôles, prof), puisque les flash-cards sont auto-évaluées. Afficher le déclaré à part, comme dans
  le suivi d'un élève ? Recommandé : **non**, une mention seulement quand un point n'a que du déclaré
  (« seulement déclaré »).
- **Q3 — Comment compter ?** Recommandé : **chaque élève pèse autant** (taux de chaque élève, puis
  moyenne), pour qu'un élève à 100 réponses n'écrase pas les autres. Autre choix : toutes les réponses
  mises ensemble (justes / total).
- **Q4 — Depuis quand ?** Recommandé : **depuis la rentrée** (année scolaire de l'école, comme la
  régularité). Autre choix : tout l'historique.
- **Q5 — Seuil** : moins de **3 élèves** → « pas assez de réponses » (recommandé) ? Ou un autre seuil ?

## Journal

- 2026-11-14 : T1 tranchée (base) ; PR 1 écrite, tests rouges puis verts.
- 2026-11-14 : plan technique écrit ; T1 posée à David.
- 2026-11-14 : phase 0 tranchée (« je suis tes recos »).
- 2026-11-14 : chantier ouvert, état des lieux, phase 0 posée (Q1 à Q5).
