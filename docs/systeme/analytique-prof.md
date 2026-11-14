---
couvre:
  - 'src/lib/server/stats/**'
  - src/lib/server/validation/teacher-analytics.ts
  - 'src/lib/components/teacher/analytics/**'
  - src/lib/types/point-errors.ts
  - 'src/routes/(protected)/dashboard/teacher/classes/*/analytics/**'
  - 'src/routes/api/teacher/classes/*/analytics/**'
---

# Analytique prof — la page « analytics » d'une classe

> Vérifié contre le code le 2026-10-21 ; onglet « Erreurs » du widget E (`erreurs-frequentes`, PR 2) le 2026-11-14 ; widget C remplacé par la régularité le 2026-11-12 ; filtres de l'ancienne génération retirés le 2026-10-22. Historique du chantier (V2.0, juin 2026) :
> [teacher-analytics-progress.md](../archive/wip/teacher-analytics-progress.md) (archivé, ne décrit
> pas le code actuel).

## À quoi ça sert

Une page par classe, `/dashboard/teacher/classes/[classId]/analytics`, ouverte depuis la liste des
classes du prof. Elle montre l'état de la classe sous trois onglets :

| Onglet           | Ce qu'il montre                                                                                                                                              | Sources                                                                                   |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| 📘 Connaissances | Mémorisation (FSRS) des **points du programme** travaillés, activité, notes de révision                                                                      | `skill_attempts`, `question_template_points` → `curriculum_points`, `srs_card_stats`      |
| 🎯 Compétences   | Niveaux des six **compétences mathématiques** et observables à consolider                                                                                    | `math_competences`, `student_competence_level`, `student_observable_state`, `observables` |
| Surveillance     | Drapeaux anti-triche non résolus (badge = leur nombre ; « ? » si le compteur est illisible, au chargement comme au rafraîchissement : `unresolved-count.ts`) | `srs_anti_fraud_flags` — voir [srs.md](srs.md) (anti-triche éteint en prod)               |

Termes ([CONTEXT.md](../../CONTEXT.md)) : Point du programme, branche, notion, compétences
mathématiques. L'interface et le code disent « point du programme » (`CurriculumPoint` dans les noms :
`ClassCurriculumPointGrid`, `getClassCurriculumPointGrid`, `CurriculumPointBadge`) ; « capacité » et
« famille A », vocabulaire du référentiel abandonné
([ADR 0008](../adr/0008-referentiel-famille-a-abandonne.md)), ont été renommés (écart C10,
2026-11-04). Seule reste la colonne `srs_anti_fraud_flags.capacity_point_id` (renommage par
migration, à part). Les colonnes sont des **points**
du programme (posés sur un nœud de l'arbre, ADR 0020) ; seule la famille B (compétences) reste un
référentiel vivant.

**Accès** : `requireTeacherOfClass(locals, classId)` (`src/lib/server/stats/teacher-class-auth.ts`)
= `requireRole('teacher')` puis existence de la classe (404 sinon) ; la page elle-même passe
d'abord par le layout du tableau de bord prof, réservé au rôle `teacher`. Le compte admin est refusé
partout, page comme endpoints (analytique et anti-triche ; décision du 2026-10-11) : David enseigne avec son compte prof et
s'élève quand il a besoin de l'admin ; l'élévation laisse le rôle de session à `teacher`
([auth.md](auth.md)). Mono-prof : aucun
`teacher_id` de classe n'entre en jeu ([ADR 0002](../adr/0002-mono-professeur-ecole-frontiere-sociale.md)).

## Les widgets

Onglet 📘 Connaissances :

- **A — Grille élève × point** (`ClassCurriculumPointGrid.svelte`) : une colonne par point **non
  archivé** tagué sur un modèle que la classe a tenté (via `question_template_points`, sans `!inner` ;
  points sans niveau et archivés écartés en mémoire par `isLivePoint`). Carte tagguée dans plusieurs
  programmes : seuls ses points du **niveau de la classe** comptent, s'il en a (`keepLinksOfGrade`,
  niveau lu sur le point). Colonnes dans l'**ordre de l'arbre** (branche, notion, puis ordre du BO,
  `placeInTree`) ; sous chaque nom (rendu par `InlineMarkdown`, LaTeX compris), la **notion** du
  point ; un point qu'on ne sait pas placer garde sa colonne, en dernier, sans notion. Cellule = badge
  FSRS agrégé 🆘 / 🔁 / ⏳ / ✅ / ◯ (`templateToBadge` + `BADGE_PRIORITY`,
  `src/lib/server/srs/curriculum-point-badge.ts`). Bascule « Tout le niveau » : ajoute les points non
  archivés du niveau de la classe, même non touchés. Tri optionnel par % acquis ; pied de colonne
  `% acquise / % à remédier`.
- **B — Courbe de rétention** (`StudentRetentionCurve.svelte`) : un élève × une **branche** de l'arbre,
  dans le programme du niveau de la classe (points non archivés de ce niveau dont la branche,
  lue en remontant sous-notion → notion → branche, est celle choisie). Retrievability moyenne par
  semaine (8 par défaut), lue dans `srs_card_stats.review_history`. Rien n'est tracé sous 3 révisions.
- **C — Régularité** (`ClassRegularityGrid.svelte`, `getClassRegularityGrid` dans
  `class-regularity.ts`, chantier `regularite`, 2026-11-12) : élève × **semaine** (lundi → dimanche,
  heure de Paris), de la rentrée (`start_date` de l'année scolaire active de l'école ; à défaut, ou
  rentrée à venir, le 1er septembre écoulé) à la semaine en cours. Case = **palier** de jours actifs :
  0 (vide), 1, 2-3, 4+, une seule couleur (`--color-primary`) en quatre intensités ; survol ou appui
  = le palier en toutes lettres. **Le serveur n'envoie que le palier** (ni nombre de jours, ni dates,
  ni compte de traces). Jour actif = au moins 5 traces le même jour de Paris, écrites par l'élève
  (sources `auto` / `srs` / `student_self`), hors contrôle (lieu `evaluation`) ; une trace sans lieu
  (antérieure à `formes-de-serie`) compte. Semaine qui touche un jour de `school_holidays` : repère
  dans l'en-tête, colorée comme les autres. Jours actifs **comptés par la base**
  (`class_regularity_weeks`, chantier `regularite-sql`, 2026-11-12 : une ligne par élève × semaine,
  avec les droits du prof ; le serveur ne lit plus une trace) ; une lecture en échec rend une erreur, affichée dans le cadre du widget. Remplace l'ancienne carte élève × jour
  (30 j, nombres de traces, alerte après 5 jours sans activité), jugée trop précise (besoin P5).
- **D — Histogramme des notes** : **retiré** le 2026-11-11 (chantier `formes-de-serie`) — avec deux
  boutons « Pas réussi / Réussi », la grille A dit déjà réussi / raté.
- **E — Top à remédier** (`TopCurriculumPointsToRemediate.svelte`) : points triés par % 🆘 + 🔁 ; clic →
  `PointDetailsModal.svelte`, deux onglets : **élèves concernés** (badge) et **Erreurs** (voir plus bas).

**Onglet « Erreurs » du widget E** (chantier `erreurs-frequentes`, besoin P4, PR 2 ;
`getClassPointErrors` dans `src/lib/server/stats/point-errors.ts`, route `point-errors?point=<uuid>`) : lu à
la première ouverture de l'onglet (un échec se relit à l'ouverture suivante). Pour chaque modèle du point
ayant au moins une réponse écrite, du plus de réponses fausses au moins, les mêmes blocs que le bilan d'un
contrôle (`QuestionErrorsPanel.svelte`, partagé avec [evaluations.md](evaluations.md) § Résultats) :

- **Élèves** : membres actifs de la classe (`class_members`) ; noms en texte, nominatif (décision Q2).
- **Contrôles** : réponses `test_answers` des séances de contrôle (`evaluation_id` non nul), meilleure
  copie de chaque élève **pour chaque contrôle** (`bestCopies`), énoncé tiré lu tel quel.
- **Séries** (Saisie, Contrôle blanc, Course aux nombres : lieux `typing`, `mock_test`, `number_race`) :
  traces `skill_attempts` avec graine, **postérieures à `question_templates.updated_at`** ; énoncé rejoué
  par `generateInstance(modèle, graine)` (une génération par graine) ; trace réussie = juste, ratée =
  faux ; verdict par case = `part_verdicts` stocké, jamais recalculé (longueur différente des réponses →
  détail indisponible) ; rien de tapé = sans réponse. Les `POINT_ERRORS_TRACE_CAP` (200) traces les plus
  récentes par modèle, plafond posé par la base (tri `created_at` décroissant, `range`).
- **Budget de temps** (`REQUEST_BUDGET_MS`, 5 s) partagé par toute la requête : rejeu des énoncés et verdicts
  recalculés des contrôles. Au-delà : plus aucun énoncé rejoué, verdict « indisponible ». Un modèle dont des
  traces ne sont pas montrées (plafond ou budget) le dit (« seules les réponses les plus récentes »).
- **Écart connu** : les copies de contrôle de la classe sont lues sans borne de date (règle du bilan :
  copie avec réponses, tous modèles confondus) ; sans effet à l'échelle mono-prof.
- **Exclus** : flash-cards (aucune réponse tapée), traces de contrôle (ni réponse ni graine, déjà dans
  `test_answers`), anciennes séries libres (`test_answers` d'une séance sans contrôle, circuit fermé le
  2026-11-11, décision Q7).
- Aucune réponse écrite → « Pas encore de réponse écrite sur ce point (les flash-cards ne gardent pas de
  réponse). » ; lecture en échec → message dans l'onglet, les élèves restent.

Le widget B apparaît dans « Détail par élève », après choix d'un élève et d'une branche. Le sélecteur ne propose que les branches du niveau de la classe, dans l'ordre de l'arbre
(`getProgrammeTree`). Classe sans niveau : pas de sélecteur, B est remplacé par « Le niveau de votre
… n'est pas renseigné. » (et l'API rend une courbe vide).

Onglet 🎯 Compétences :

- **F — Grille élève × compétence** (`ClassCompetenceGrid.svelte`) : niveau
  ◯ insuffisante / 🟠 fragile / 🟢 satisfaisante / ✨ très bonne, lu dans `student_competence_level`
  (colonnes = lignes de `math_competences`) ; date de dernière saisie ; pied `% satisfaisante+`.
- **G — Observables à consolider** (`TopObservablesToConsolidate.svelte`) : observables vus au moins
  une fois dans la classe, triés par part d'élèves dont `count_minus > count_plus`.

En-tête : bouton **Export compétences** (→ [export-competences.md](export-competences.md)),
**Mode projection** (noms anonymisés « Élève 1… »), **Actualiser** (incrémente `refreshNonce`, que
chaque widget suit dans son `$effect` de chargement).

## Carte du code

- Page : `src/routes/(protected)/dashboard/teacher/classes/[classId]/analytics/+page.svelte` et
  `+page.server.ts` (classe, élèves actifs, branches du niveau, compte des drapeaux non résolus). Les widgets
  chargent leurs données eux-mêmes, côté client.
- Agrégations (`src/lib/server/stats/`, barrel `index.ts`) :
  - `class-knowledge.ts` : `getClassCurriculumPointGrid`, `getClassTopCurriculumPointsToRemediate`,
    `getStudentRetentionCurve` ;
  - `point-errors.ts` : `getClassPointErrors` (onglet « Erreurs » du widget E ; hors barrel) ;
  - `class-regularity.ts` : `getClassRegularityGrid` (et ses fonctions pures, testées seules) ;
  - `class-competence.ts` : `getClassCompetenceGrid`, `getClassTopObservablesToConsolidate`.
    Requêtes groupées (pas une requête par élève) ; les listes de modèles sont découpées par
    `fetchInChunks`.
- Endpoints `GET` sous `src/routes/api/teacher/classes/[classId]/analytics/` : `knowledge-grid`
  (`?includeAllCycle`), `knowledge-top-remediate` (`?topN`), `knowledge-retention/[studentId]`
  (`?branch=<uuid>&weeks`), `regularity` (sans paramètre), `competence-grid`,
  `competence-top-consolidate` (`?topN`), `point-errors` (`?point=<uuid>`). Tous : Zod puis `requireTeacherOfClass` ; la route par élève vérifie en plus l'appartenance à la classe
  dans `class_members`.
- Zod : `src/lib/server/validation/teacher-analytics.ts` (5 schémas, bornes : `topN` 1-30,
  `weeks` 1-26).
- Composants : `src/lib/components/teacher/analytics/` (6 widgets, `AnalyticsModal` du widget G, `PointDetailsModal` du widget E) ; onglet
  Surveillance : `src/lib/components/teacher/anti-fraud/`.

## Invariants

- Lecture seule : la page n'écrit rien. Les niveaux de compétence viennent des caches tenus par le
  trigger de `skill_attempts` ([base-de-donnees.md](base-de-donnees.md), « Programme et suivi par
  compétences »).
- Un élève hors classe ne passe pas par les routes par élève (contrôle `class_members`).
- Carte partagée entre deux programmes : une seule colonne, celle du niveau de la classe.

## Tests

Serveur : `src/lib/server/stats/__tests__/class-knowledge.test.ts` (28),
`class-competence.test.ts` (12), `point-errors.test.ts` (18) ; route `point-errors` :
`analytics/point-errors/__tests__/server.test.ts`. Composants : un `*.svelte.test.ts` par widget dans
`src/lib/components/teacher/analytics/__tests__/` (29 au total). Garde : `src/lib/server/stats/__tests__/teacher-class-auth.test.ts` (prof accepté,
admin et élève refusés). Loader : `classes/[classId]/analytics/__tests__/page.server.test.ts`
(compteur de signalements illisible → `null`, pas 0). Aucun test d'intégration base.

## Décisions

- Revue du 2026-06-10 : pas d'export CSV des grilles, pas de comparatif inter-classes, pas de cache
  HTTP ni de vue matérialisée tant qu'aucun prof n'en exprime le besoin ou qu'aucune mesure ne le
  justifie. Seul candidat retenu « si friction confirmée » : ouvrir B + D depuis une cellule de la
  grille A (non fait).
- [ADR 0008](../adr/0008-referentiel-famille-a-abandonne.md) — famille A abandonnée.

## Écarts connus

- **Nom d'un point en LaTeX brut** dans les infobulles (`title`) de la grille : un attribut ne rend pas
  les formules. (La fenêtre du widget E rend son titre par `InlineMarkdown` depuis le 2026-11-14.)
- **Deux « acquis » différents** : la grille A calcule un badge **FSRS** depuis `srs_card_stats` ;
  elle ne lit pas `student_point_state` (régime d'acquisition `fluence` / `diversite`). Un point
  peut être « acquis » pour l'un et pas pour l'autre ; la page ne montre pas le second. Tranché le
  2026-10-12 : on ne change rien tant que `student_point_state` est vide en prod.
