---
status: en-cours
---

# Chantier `taux-par-point` — taux de réussite de la classe par point et par notion (P3)

Ouvert le 2026-11-14, choisi par David après la clôture de `durees-trop-courtes`. Besoin P3 validé le
2026-11-11 ([`formes-de-serie-progress.md`](../archive/wip/formes-de-serie-progress.md) § « Besoins de
suivi validés ») : « taux de réussite par point et par notion » (prof, classe). Dernier écran prévu
sur les nouvelles traces (P4, P5, P6, P7, P8, P9 faits).

## Reprendre ici

_Mis à jour le 2026-11-14, après #2666._

- **État** : PR 2 mergée (#2666) : widget « Taux de réussite » livré sur `main` (pas encore en prod : attend un `deploy:prod`) ; le découpage (PR 1 migration, PR 2 code) est fait · **Prochaine action** : clôture si David la valide (versement : le durable est déjà dans `analytique-prof.md` et `base-de-donnees.md`, journal à archiver) · **En attente de David** : « clore le chantier ? » ; vérification manuelle #2666 notée dans `verifications-manuelles.md` · **Pièges en cours** : base locale réinitialisée (`db:seed-riche`) le 2026-11-14, traces fictives ajoutées dans « 6B » · **Worktree / branche** : aucun (retiré après #2666)

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
- `security-auditor` : aucun finding bloquant ni important. Faibles : coût à revoir par `EXPLAIN`
  quand la table grossira (`idx_skill_attempts_student_time` borne mieux la date ; au planificateur) ;
  `p_first_day` NULL → 0 ligne ; admin et membre archivé appelant non testés (déduits des policies).
- Mergée le 2026-11-14 (#2663) ; `db:migrate` fait (essai à blanc : seule cette migration).

## PR 2 — calcul, endpoint, widget (2026-11-14)

- `pnpm db:types` : `class_template_success` dans `database.ts`.
- `src/lib/server/stats/class-success-rate.ts` : `pointsOfTemplates` (points vivants, niveau de la
  classe), `buildClassSuccessRates` (pur), `getClassSuccessRates` (rentrée de l'école, comptes lus
  **par pages** : la RPC est plafonnée par `max_rows` = 1000, une classe la dépasse vite).
- `placeInTree` rend aussi `notion_id` (deux notions peuvent porter le même nom).
- Endpoint `GET /api/teacher/classes/[classId]/analytics/success-rate` ; widget
  `ClassSuccessRates.svelte` après « Top à remédier ».
- Tests : 17 unitaires du calcul et de la lecture, 3 de l'endpoint, 6 du widget. Endpoint et widget
  vus rouges (module absent) avant d'être écrits ; le calcul aussi, mais seulement par module absent.

- Revues : `code-reviewer` (aucun bloquant ni important ; corrigé : course de réponses du widget,
  motif `requestSeq` de la grille C ; laissé : liens modèle → point d'un lot de 100 modèles au-delà de
  `max_rows`, il faudrait plus de 10 points par modèle) ; `security-auditor` (aucun bloquant ni
  important ; effectif affiché sous le seuil voulu, écrit dans la doc).
- Vérifié en local (`db:reset` + `db:seed-riche`, traces fictives insérées dans « 6B », qui n'en avait
  aucune) : rendu conforme (67 %, « Pas assez de réponses · 2 », « Seulement déclaré », 83 %), trace
  d'avant la rentrée exclue, RPC lue par le prof avec `order` + `range`.

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

- 2026-11-14 : #2666 mergée (PR 2).
- 2026-11-14 : PR 2 écrite (calcul, endpoint, widget).
- 2026-11-14 : #2663 mergée, `db:migrate` fait.
- 2026-11-14 : T1 tranchée (base) ; PR 1 écrite, tests rouges puis verts.
- 2026-11-14 : plan technique écrit ; T1 posée à David.
- 2026-11-14 : phase 0 tranchée (« je suis tes recos »).
- 2026-11-14 : chantier ouvert, état des lieux, phase 0 posée (Q1 à Q5).
