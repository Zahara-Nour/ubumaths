# Analytique prof — la page « analytics » d'une classe

> Vérifié contre le code le 2026-10-10. Historique du chantier (V2.0, juin 2026) :
> [teacher-analytics-progress.md](../archive/wip/teacher-analytics-progress.md) (archivé, ne décrit
> pas le code actuel).

## À quoi ça sert

Une page par classe, `/dashboard/teacher/classes/[classId]/analytics`, ouverte depuis la liste des
classes du prof. Elle montre l'état de la classe sous trois onglets :

| Onglet           | Ce qu'il montre                                                                         | Sources                                                                                   |
| ---------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 📘 Connaissances | Mémorisation (FSRS) des **points du programme** travaillés, activité, notes de révision | `skill_attempts`, `question_template_points` → `curriculum_points`, `srs_card_stats`      |
| 🎯 Compétences   | Niveaux des six **compétences mathématiques** et observables à consolider               | `math_competences`, `student_competence_level`, `student_observable_state`, `observables` |
| Surveillance     | Drapeaux anti-triche non résolus (badge = leur nombre)                                  | `srs_anti_fraud_flags` — voir [srs.md](srs.md) (anti-triche éteint en prod)               |

Termes ([CONTEXT.md](../../CONTEXT.md)) : Point du programme, compétences mathématiques. ⚠️ Le code
et l'interface disent encore « **capacité** » (`ClassCapacityGrid`, « Top capacités à remédier ») et
les commentaires « famille A » : c'est le **vocabulaire du référentiel abandonné**
([ADR 0008](../adr/0008-referentiel-famille-a-abandonne.md)). Les colonnes sont aujourd'hui des
`curriculum_points` ; seule la famille B (compétences) reste un référentiel vivant.

**Accès** : `requireTeacherOfClass(locals, classId)` (`src/lib/server/stats/teacher-class-auth.ts`)
= `requireRoles(['teacher','admin'])` puis existence de la classe (404 sinon) ; la page elle-même
passe d'abord par le layout du tableau de bord prof, réservé au rôle `teacher`. Mono-prof : aucun
`teacher_id` de classe n'entre en jeu ([ADR 0002](../adr/0002-mono-professeur-ecole-frontiere-sociale.md)).

## Les widgets

Onglet 📘 Connaissances :

- **A — Grille élève × point** (`ClassCapacityGrid.svelte`) : une colonne par `curriculum_point`
  tagué sur un modèle que la classe a tenté (via `question_template_points`, en ne gardant que les
  points du **niveau de la classe** — `keepLinksOfGrade`). Cellule = badge FSRS agrégé
  🆘 / 🔁 / ⏳ / ✅ / ◯ (`templateToBadge` + `BADGE_PRIORITY`, `src/lib/server/srs/capacity-badge.ts`).
  Bascule « Tout le cycle » : ajoute les points non archivés du niveau de la classe, même non
  touchés. Tri optionnel par % acquis ; pied de colonne `% acquise / % à remédier`.
- **B — Courbe de rétention** (`StudentRetentionCurve.svelte`) : un élève × un thème
  (`curriculum_themes.code`), retrievability moyenne par semaine (8 par défaut), lue dans
  `srs_card_stats.review_history`. Rien n'est tracé sous 3 révisions.
- **C — Heatmap d'activité** (`ClassActivityHeatmap.svelte`) : élève × jour (30 j), nombre de
  tentatives ; alerte au-delà de 5 jours sans activité. Les cartes de cours comptent comme activité
  mais pas dans le taux de réussite (`success_pct` à `null` un jour sans question notée).
- **D — Histogramme des notes** (`StudentGradeHistogram.svelte`) : Again/Hard/Good/Easy sur 7 jours,
  avec stabilité moyenne.
- **E — Top à remédier** (`TopCapacitiesToRemediate.svelte`) : points triés par % 🆘 + 🔁 ; clic →
  `AnalyticsModal.svelte` (élèves concernés).

Les widgets B et D apparaissent dans « Détail par élève », après choix d'un élève et d'un thème.

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
  `+page.server.ts` (classe, élèves actifs, thèmes, compte des drapeaux non résolus). Les widgets
  chargent leurs données eux-mêmes, côté client.
- Agrégations (`src/lib/server/stats/`, barrel `index.ts`) :
  - `class-knowledge.ts` : `getClassCapacityGrid`, `getClassTopCapacitiesToRemediate`,
    `getStudentRetentionCurve`, `getClassActivityHeatmap`, `getStudentGradeHistogram` ;
  - `class-competence.ts` : `getClassCompetenceGrid`, `getClassTopObservablesToConsolidate`.
    Requêtes groupées (pas une requête par élève) ; les listes de modèles sont découpées par
    `fetchInChunks`.
- Endpoints `GET` sous `src/routes/api/teacher/classes/[classId]/analytics/` : `knowledge-grid`
  (`?includeAllCycle`), `knowledge-top-remediate` (`?topN`), `knowledge-retention/[studentId]`
  (`?theme&weeks`), `knowledge-heatmap` (`?days&alertThresholdDays`), `knowledge-grades/[studentId]`
  (`?days`), `competence-grid`, `competence-top-consolidate` (`?topN`). Tous : Zod puis
  `requireTeacherOfClass` ; les deux routes par élève vérifient en plus l'appartenance à la classe
  dans `class_members`.
- Zod : `src/lib/server/validation/teacher-analytics.ts` (7 schémas, bornes : `topN` 1-30,
  `weeks` 1-26, `days` 1-60 / 1-30).
- Composants : `src/lib/components/teacher/analytics/` (7 widgets + `AnalyticsModal`) ; onglet
  Surveillance : `src/lib/components/teacher/anti-fraud/`.

## Invariants

- Lecture seule : la page n'écrit rien. Les niveaux de compétence viennent des caches tenus par le
  trigger de `skill_attempts` ([base-de-donnees.md](base-de-donnees.md), « Programme et suivi par
  compétences »).
- Un élève hors classe ne passe pas par les routes par élève (contrôle `class_members`).
- Carte partagée entre deux programmes : une seule colonne, celle du niveau de la classe.

## Tests

Serveur : `src/lib/server/stats/__tests__/class-knowledge.test.ts` (28),
`class-competence.test.ts` (12). Composants : un `*.svelte.test.ts` par widget dans
`src/lib/components/teacher/analytics/__tests__/` (29 au total). Aucun test d'intégration base.

## Décisions

- Revue du 2026-06-10 : pas d'export CSV des grilles, pas de comparatif inter-classes, pas de cache
  HTTP ni de vue matérialisée tant qu'aucun prof n'en exprime le besoin ou qu'aucune mesure ne le
  justifie. Seul candidat retenu « si friction confirmée » : ouvrir B + D depuis une cellule de la
  grille A (non fait).
- [ADR 0008](../adr/0008-referentiel-famille-a-abandonne.md) — famille A abandonnée.

## Écarts connus

- **Vocabulaire périmé** : « capacité » et « famille A » dans les noms (`ClassCapacityGrid`,
  `getClassCapacityGrid`, `CapacityBadge`, `capacity-badge.ts`), les commentaires et l'interface,
  alors que les données sont des points du programme. À renommer (non tranché).
- **Deux « acquis » différents** : la grille A calcule un badge **FSRS** depuis `srs_card_stats` ;
  elle ne lit pas `student_point_state` (régime d'acquisition `fluence` / `diversite`). Un point
  peut être « acquis » pour l'un et pas pour l'autre ; la page ne montre pas le second.
- `+page.server.ts` compte `srs_anti_fraud_flags` sans tester l'erreur : un échec donne un badge à 0.
- Accès asymétrique : la **page** est réservée au rôle `teacher` (le layout
  `src/routes/(protected)/dashboard/teacher/+layout.server.ts` refuse tout autre rôle), alors que les
  **endpoints** acceptent aussi `admin`. Sans conséquence aujourd'hui (l'élévation admin ne change pas
  le rôle de session, voir [auth.md](auth.md)), mais la doc d'origine promettait l'accès admin.
