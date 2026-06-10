# Teacher Analytics V2.0 — Référence

Stats prof exploitant les données SRS/FSRS + famille B pour piloter une classe.

> **Statut** : livré 2026-06-10, commits `4432b20a5` (Phase 1 backend), `33a951b82` (Phase 2 UI), `b1bb8f223` (Phase 3 P1 fixes).
> **Page** : `/dashboard/teacher/classes/[classId]/analytics`

---

## 1. Vue d'ensemble

Le prof accède à une vue unifiée de l'**état d'acquisition** de sa classe sur **2 familles** :

| Onglet           | Famille              | Données source                                                   | Widgets       |
| ---------------- | -------------------- | ---------------------------------------------------------------- | ------------- |
| 📘 Connaissances | A (FSRS knowledge)   | `srs_card_stats` + `skill_attempts` + `question_template_skills` | A, B, C, D, E |
| 🎯 Compétences   | B (compétences math) | `student_competence_level` + `student_observable_state`          | F, G          |

**Sécurité** : seul le `teacher_id` de la classe (ou un admin) peut accéder via la garde `requireTeacherOfClass`.

---

## 2. Les 7 widgets

### Widget A — Grille capacité × classe (`ClassCapacityGrid.svelte`)

Tableau élève × capacité famille A, cellule = badge FSRS agrégé (🆘 / 🔁 / ⏳ / ✅ / ◯).

- **Toggle "Tout le cycle"** : inclut les capacités non encore touchées (pour planification)
- **Tri par % acquise descendant** : pivot pédagogique pour identifier les colonnes faibles
- **Pied de colonne** : `% acquise / % à remédier` par capacité

### Widget B — Courbe rétention par élève × thème (`StudentRetentionCurve.svelte`)

SVG inline 8 semaines × retrievability moyenne. Source : parsing `srs_card_stats.review_history` JSONB en mémoire.

- Affichage seulement si ≥ 3 reviews sur la période
- Drill-down depuis sélecteur élève + sélecteur thème (page conteneur)

### Widget C — Heatmap activité classe (`ClassActivityHeatmap.svelte`)

Grille élève × jour (30 derniers jours), opacité ∝ count de reviews ce jour.

- **Alerte "X jours sans review"** : seuil **5 jours** (paramétrable via query param)
- Tooltip : `N reviews — N% succès`

### Widget D — Histogramme grades par élève (`StudentGradeHistogram.svelte`)

Bar chart SVG inline {Again=1, Hard=2, Good=3, Easy=4} sur 7 derniers jours.

- Couleurs par grade (rouge → vert)
- Tooltip : count + stability moyenne en sortie

### Widget E — Top capacités à remédier (`TopCapacitiesToRemediate.svelte`)

Liste triée par `% {🆘+🔁}` desc. Modal "élèves concernés" au clic.

### Widget F — Grille compétences math × classe (`ClassCompetenceGrid.svelte`)

Tableau élève × 6 compétences math (Chercher, Modéliser, Représenter, Raisonner, Calculer, Communiquer).

- Cellules : niveau visuel `◯ / 🟠 / 🟢 / ✨`
- Chip de fraîcheur "dernière saisie il y a X jours" en header
- Pied de colonne : `% satisfaisante+`

### Widget G — Top observables à consolider (`TopObservablesToConsolidate.svelte`)

Liste triée par `% minus` desc, observés ≥ 1 fois en classe. Modal "élèves concernés" au clic.

---

## 3. Backend — Architecture

### Helpers d'agrégation (`src/lib/server/stats/`)

| Fichier                 | Fonctions exposées                                                                                                                            |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `class-knowledge.ts`    | `getClassCapacityGrid`, `getClassTopCapacitiesToRemediate`, `getStudentRetentionCurve`, `getClassActivityHeatmap`, `getStudentGradeHistogram` |
| `class-competence.ts`   | `getClassCompetenceGrid`, `getClassTopObservablesToConsolidate`                                                                               |
| `teacher-class-auth.ts` | `requireTeacherOfClass(locals, classId)` — garde 403/404                                                                                      |

**Stratégie performance** : approche batchée (2-3 queries par fonction, pas N×queries). Réutilise `templateToBadge` et `BADGE_PRIORITY` de `src/lib/server/srs/capacity-badge.ts`.

### Endpoints REST (`src/routes/api/teacher/classes/[classId]/analytics/`)

```
GET /knowledge-grid                        ?includeAllCycle=true
GET /knowledge-top-remediate               ?topN=10
GET /knowledge-retention/[studentId]       ?theme=NOM&weeks=8
GET /knowledge-heatmap                     ?days=30&alertThresholdDays=5
GET /knowledge-grades/[studentId]          ?days=7
GET /competence-grid
GET /competence-top-consolidate            ?topN=10
```

Tous : `requireTeacherOfClass(locals, classId)` + Zod sur params/query. Endpoints student-scoped (B/D) revérifient l'appartenance à la classe via `class_members`.

### Schemas Zod (`src/lib/server/validation/teacher-analytics.ts`)

6 schemas : `classIdParamSchema`, `classAndStudentParamSchema`, `knowledgeGridQuerySchema`, `retentionQuerySchema`, `heatmapQuerySchema`, `gradesQuerySchema`, `topNQuerySchema`.

---

## 4. UI — Architecture

### Page conteneur

`src/routes/(protected)/dashboard/teacher/classes/[classId]/analytics/+page.{svelte,server.ts}`

- 2 onglets `Tabs` (Connaissances / Compétences)
- Header : toggle Mode projection + bouton Actualiser
- Sélecteurs élève + thème pour drill-down B/D
- `+page.server.ts` charge la classe + liste élèves + thèmes BO

### Composants

8 composants dans `src/lib/components/teacher/analytics/` :

- `AnalyticsModal.svelte` — modal "élèves concernés" réutilisable (E, G)
- 7 widgets (1 par diagramme + 1 grille famille B)

**Pattern fetch unifié** :

```svelte
$effect(() => {
  void classId; void refreshNonce; // deps explicites
  void load();
});
```

**`refreshNonce` pattern** : nombre incrémental dispatché du parent, déclenche refetch via `$effect`.

---

## 5. Tests

| Suite                                        | Tests  | Cible       |
| -------------------------------------------- | ------ | ----------- |
| `class-knowledge.test.ts`                    | 21     | ≥ 15 ✅     |
| `class-competence.test.ts`                   | 12     | ≥ 10 ✅     |
| `AnalyticsModal.svelte.test.ts`              | 5      | ≥ 4 ✅      |
| `ClassCapacityGrid.svelte.test.ts`           | 6      | ≥ 5 ✅      |
| `ClassCompetenceGrid.svelte.test.ts`         | 4      | ≥ 3 ✅      |
| `TopCapacitiesToRemediate.svelte.test.ts`    | 3      | ≥ 3 ✅      |
| `TopObservablesToConsolidate.svelte.test.ts` | 2      | ≥ 2 ✅      |
| `ClassActivityHeatmap.svelte.test.ts`        | 3      | ≥ 3 ✅      |
| `StudentRetentionCurve.svelte.test.ts`       | 3      | ≥ 3 ✅      |
| `StudentGradeHistogram.svelte.test.ts`       | 3      | ≥ 3 ✅      |
| **Total**                                    | **62** | **≥ 51** ✅ |

---

## 6. Roadmap V2.1

Reporté du périmètre V2.0 :

- **Export CSV** de Widgets A et F (réunion parents / bulletin)
- **Comparatif inter-classes** (split view CM2-A vs CM2-B)
- **Vue matérialisée** si perf endpoint dégrade sous charge (classe > 50 élèves)
- **Drill-down click** depuis cellule grille (au lieu du sélecteur manuel)
- **Hook `useFetch`** pour factoriser les 7 widgets (P2 #11)
- **`loadClassStudents` helper** mutualisé (P2 #9)
- **Cache HTTP** sur endpoints analytics (P2 #15)

---

## 7. Vérification end-to-end (Phase 4)

À effectuer manuellement par le prof :

1. Connexion prof, sélection d'une classe peuplée
2. Aller `/dashboard/teacher/classes/[classId]/analytics`
3. **Onglet 📘 Connaissances** : vérifier les 5 widgets affichés
4. Toggle **Mode projection** → vérifier que les noms deviennent "Élève 1", "Élève 2", …
5. Sélecteurs élève + thème → Widgets B + D apparaissent dans la zone "Détail par élève"
6. Bouton **Actualiser** → cache rechargé, indicateurs de chargement visibles
7. Onglet **🎯 Compétences** : vérifier Widget F + G
8. Clic "Voir" sur une ligne Widget E ou G → modal liste des élèves concernés
9. Classe vide → message "Aucun élève dans cette classe"
10. Tentative d'accès via URL d'une classe non-owner → 403

---

## 8. Références

- Progress : `docs/wip/teacher-analytics-progress.md`
- SRS / FSRS architecture : `docs/ref/srs/architecture.md`
- Famille B saisie : `src/routes/(protected)/dashboard/teacher/evaluation-tasks/[id]/saisie/`
- Pattern badge FSRS : `src/lib/server/srs/capacity-badge.ts`
