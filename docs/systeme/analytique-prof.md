---
couvre:
  - 'src/lib/server/stats/**'
  - src/lib/server/validation/teacher-analytics.ts
  - 'src/lib/components/teacher/analytics/**'
  - 'src/routes/(protected)/dashboard/teacher/classes/*/analytics/**'
  - 'src/routes/api/teacher/classes/*/analytics/**'
---

# Analytique prof — la page « analytics » d'une classe

> Vérifié contre le code le 2026-10-21. Historique du chantier (V2.0, juin 2026) :
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
mathématiques. L'interface dit « point » ; ⚠️ le code dit encore « **capacité** »
(`ClassCapacityGrid`, `getClassCapacityGrid`, `CapacityBadge`) et certains commentaires « famille A » :
c'est le **vocabulaire du référentiel abandonné**
([ADR 0008](../adr/0008-referentiel-famille-a-abandonne.md)). Les colonnes sont des **points neufs**
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

- **A — Grille élève × point** (`ClassCapacityGrid.svelte`) : une colonne par point neuf **non
  archivé** tagué sur un modèle que la classe a tenté (via `question_template_points`, sans `!inner` ;
  anciens points et archivés écartés en mémoire par `isLivePoint`). Carte tagguée dans plusieurs
  programmes : seuls ses points du **niveau de la classe** comptent, s'il en a (`keepLinksOfGrade`,
  niveau lu sur le point). Colonnes dans l'**ordre de l'arbre** (branche, notion, puis ordre du BO,
  `placeInTree`) ; sous chaque nom (rendu par `InlineMarkdown`, LaTeX compris), la **notion** du
  point ; un point qu'on ne sait pas placer garde sa colonne, en dernier, sans notion. Cellule = badge
  FSRS agrégé 🆘 / 🔁 / ⏳ / ✅ / ◯ (`templateToBadge` + `BADGE_PRIORITY`,
  `src/lib/server/srs/capacity-badge.ts`). Bascule « Tout le niveau » : ajoute les points neufs non
  archivés du niveau de la classe, même non touchés. Tri optionnel par % acquis ; pied de colonne
  `% acquise / % à remédier`.
- **B — Courbe de rétention** (`StudentRetentionCurve.svelte`) : un élève × une **branche** de l'arbre,
  dans le programme du niveau de la classe (points neufs non archivés de ce niveau dont la branche,
  lue en remontant sous-notion → notion → branche, est celle choisie). Retrievability moyenne par
  semaine (8 par défaut), lue dans `srs_card_stats.review_history`. Rien n'est tracé sous 3 révisions.
- **C — Heatmap d'activité** (`ClassActivityHeatmap.svelte`) : élève × jour (30 j), nombre de
  tentatives ; alerte au-delà de 5 jours sans activité. Les cartes de cours comptent comme activité
  mais pas dans le taux de réussite (`success_pct` à `null` un jour sans question notée).
- **D — Histogramme des notes** (`StudentGradeHistogram.svelte`) : Again/Hard/Good/Easy sur 7 jours,
  avec stabilité moyenne.
- **E — Top à remédier** (`TopCapacitiesToRemediate.svelte`) : points triés par % 🆘 + 🔁 ; clic →
  `AnalyticsModal.svelte` (élèves concernés).

Les widgets B et D apparaissent dans « Détail par élève », après choix d'un élève ; B demande en plus
une branche. Le sélecteur ne propose que les branches du niveau de la classe, dans l'ordre de l'arbre
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
  - `class-knowledge.ts` : `getClassCapacityGrid`, `getClassTopCapacitiesToRemediate`,
    `getStudentRetentionCurve`, `getClassActivityHeatmap`, `getStudentGradeHistogram` ;
  - `class-competence.ts` : `getClassCompetenceGrid`, `getClassTopObservablesToConsolidate`.
    Requêtes groupées (pas une requête par élève) ; les listes de modèles sont découpées par
    `fetchInChunks`.
- Endpoints `GET` sous `src/routes/api/teacher/classes/[classId]/analytics/` : `knowledge-grid`
  (`?includeAllCycle`), `knowledge-top-remediate` (`?topN`), `knowledge-retention/[studentId]`
  (`?branch=<uuid>&weeks`), `knowledge-heatmap` (`?days&alertThresholdDays`), `knowledge-grades/[studentId]`
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

- **Vocabulaire périmé** : « capacité » et « famille A » dans les noms (`ClassCapacityGrid`,
  `getClassCapacityGrid`, `CapacityBadge`, `capacity-badge.ts`) et des commentaires, alors que les
  données sont des points du programme. L'interface dit « point » depuis la PR F de l'arbre des
  notions (2026-10-21) ; les noms du code restent à renommer (non tranché).
- **Nom d'un point en LaTeX brut** dans les infobulles (`title`) de la grille et dans le titre de la
  fenêtre des élèves concernés (Top) : un attribut ou un titre texte ne rend pas les formules.
- **Deux « acquis » différents** : la grille A calcule un badge **FSRS** depuis `srs_card_stats` ;
  elle ne lit pas `student_point_state` (régime d'acquisition `fluence` / `diversite`). Un point
  peut être « acquis » pour l'un et pas pour l'autre ; la page ne montre pas le second. Tranché le
  2026-10-12 : on ne change rien tant que `student_point_state` est vide en prod.
