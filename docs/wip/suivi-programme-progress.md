# Suivi du programme & cahier de texte — Spec Phase 0 (TDD)

> **Statut** : Phase 0 — spécification, **en attente de validation David**. Aucun code écrit.
> **Créé le** : 2026-06-21
> **Feature** : référentiel de programme (distinct de l'évaluation) + suivi de couverture alimenté par le cahier de texte.

---

## 1. Objectif

Permettre au prof de **suivre l'avancement dans le programme officiel par classe** : voir où on en est, quels points n'ont **jamais** été travaillés (les trous), et combien de fois chaque point a été travaillé (heatmap). L'alimentation se fait depuis le **cahier de texte** (`class_journal_entries`, déjà implémenté), via les activités proposées.

**Distinction fondamentale (2 axes de suivi)** :

| Axe                                    | Question                                                                               | Existant ?                                                                                               |
| -------------------------------------- | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| **Acquisition élève**                  | « tel élève **maîtrise**-t-il l'objectif X ? »                                         | ✅ existe (référentiel `skills`/`skill_objectives`, routes `objectifs`/`competences`/`evaluation-tasks`) |
| **Couverture programme** (ce chantier) | « la classe a-t-elle **déjà travaillé** le point X cette année, et combien de fois ? » | ❌ à construire                                                                                          |

---

## 2. Décisions actées (David, 2026-06-21)

1. **Référentiel de programme NOUVEAU et distinct** du référentiel d'évaluation (`skills`/`skill_objectives`). Nouvelles tables, propre nomenclature. _(Lien optionnel point ↔ objectif possible plus tard, pas maintenant.)_
2. **3 niveaux, grain fin** : `Thème → Item → Point`. Ex. **Calcul → Fractions → « Additionner deux fractions »**. Le **Point** est le grain de suivi (assez précis pour repérer les trous).
3. **Couverture = compteur** (pas booléen) : nombre de fois qu'un point a été travaillé, **par classe**, sur l'année scolaire → **heatmap** (intensité de couleur ∝ nombre ; vide = jamais vu ⚠️).
4. **Alimentation hybride** : activités taguées → couverture auto **+** coche manuelle.
5. **Création hybride** : un grade **pré-rempli** comme point de départ, puis **éditable par le prof dans l'app** (CRUD thèmes/items/points), une arborescence **par grade**, réutilisée sur toutes les classes du même grade.
6. **Nomenclature actée** : `Thème → Item → Point` (cf. §3). Niveau 3 « Point » **neutre** (connaissance OU savoir-faire via `kind`), pour ne pas réutiliser « Objectif »/« Capacité » (éval) ni « Domaine » (banni dans le réf. d'éval).

---

## 3. Vocabulaire (ACTÉ 2026-06-21)

- **Thème** (niveau 1) — ex. « Calcul », « Espace et géométrie ». _(« thème », pas « domaine ».)_
- **Item** (niveau 2) — ex. « Fractions », « Symétrie axiale ».
- **Point** (niveau 3, grain de suivi) — ex. « Additionner deux fractions ».
- **Couverture** — nombre de fois qu'un point a été travaillé dans une classe sur l'année.
- ⚠️ Ne pas réutiliser « objectif » / « capacité » / « observable » (réservés au référentiel d'évaluation, pour éviter la confusion).

**Justification (sourcée)** : « Thème » est identique dans le réf. d'éval _et_ le système de questions → gardé. « Item » est déjà employé comme synonyme d'« objectif » dans le doc d'éval (`skills-referentiel-design.md:126`). « Point » reste neutre car « Capacité » (éval) impose _exactement 4, ordonnées par difficulté_ — ce que le niveau 3 du programme n'a pas. « Domaine »/« Sous-domaine » (système de questions) écartés car « Domaine » est un **terme banni** côté éval (`:109`).

---

## 4. Modèle de données (proposition — à valider)

> Convention mono-prof : **pas de `teacher_id`**, ownership par rôle via `is_teacher_or_admin()` (cohérent avec le cluster classes après le retrait `teacher_id`). Grade = code canonique (`'6'`, pas `'6e'`) → réconcilier avec `niveau_scolaire` du référentiel d'éval.

### 4.1 Arborescence du programme (par grade, éditable)

```
curriculum_themes
  id uuid pk · grade text · name text · display_order int · timestamps
curriculum_items
  id uuid pk · theme_id fk→themes (cascade) · name text · display_order int · timestamps
curriculum_points
  id uuid pk · item_id fk→items (cascade) · name text · display_order int
  · kind text null  -- optionnel: 'connaissance' | 'savoir-faire' | null
  · timestamps
```

### 4.2 Tagging des activités du système d'exercices

```
exercise_curriculum_points
  exercise_id fk→exercises · point_id fk→curriculum_points · pk(exercise_id, point_id)
```

Un exercice du système porte 0..n points. Référencer cet exercice dans une entrée de cahier de texte ⇒ ses points sont marqués **auto**.

### 4.3 Alimentation depuis le cahier de texte

`class_journal_entries` existe déjà (id, class_id, entry_date, lesson_content, homework_content, …). On ajoute :

```
journal_entry_activities          -- les 3 types d'activité d'une entrée
  id uuid pk · entry_id fk→class_journal_entries (cascade)
  · kind text  -- 'exercise' | 'textbook' | 'course'
  · exercise_id fk→exercises null          -- si kind='exercise'
  · chapter_id  fk→class_chapters null      -- si kind='course' (point de cours = chapitre)
  · textbook_ref jsonb null                 -- si kind='textbook' { manuel?, page?, numero?, label }
  · label text null
  · display_order int

journal_entry_points              -- signal de couverture (manuel + auto matérialisé)
  id uuid pk · entry_id fk→class_journal_entries (cascade)
  · point_id fk→curriculum_points
  · source text  -- 'auto' (dérivé d'une activité taguée) | 'manual' (coché par le prof)
  · unique(entry_id, point_id)
```

**Couverture d'un point pour une classe** = `count(journal_entry_points jep JOIN class_journal_entries e) WHERE e.class_id = :class AND jep.point_id = :point AND e.entry_date dans l'année scolaire courante`.

> **Choix à trancher (Phase 1)** : matérialiser les points `auto` dans `journal_entry_points` au moment de l'enregistrement (heatmap = simple `count`, supporte la dé-sélection manuelle, snapshot stable) **vs** dériver à la lecture (`manual ∪ points-des-activités`). Proposition : **matérialiser** pour la simplicité de la heatmap et la maîtrise prof (il peut décocher un point auto).

---

## 5. Couverture & heatmap

- **Périmètre temporel** : année scolaire courante (proposition : champ « début d'année » au niveau prof/réglages, défaut 1er septembre). Les compteurs ne mélangent pas deux années.
- **Agrégation (rollup)** : compteur au **Point**, sommé/agrégé à l'**Item** puis au **Thème**. Vue d'avancement à 3 niveaux dépliables.
- **Échelle de couleur (proposition)** : 0 = « jamais vu » (état distinct, mis en avant) · 1 = clair · 2–3 = moyen · 4+ = foncé. Seuils ajustables.
- **% d'avancement** (proposition) : part des points d'un item/thème touchés au moins 1 fois (≠ intensité). Affiché à côté de la heatmap.

---

## 6. Comportements (TDD — cas nominal / limite / erreur)

### 6.1 Édition du programme (CRUD arborescence)

- **Nominal** : le prof crée un thème pour la 6ᵉ → il apparaît dans l'arborescence de la 6ᵉ, `display_order` à la fin. Idem item (sous un thème), point (sous un item).
- **Nominal** : renommer / réordonner (drag) un nœud persiste l'ordre.
- **Limite** : supprimer un thème avec items/points → cascade (avec confirmation UI). Supprimer un point déjà couvert → **interdit ou archivage** (à trancher : on ne veut pas perdre l'historique de couverture). Proposition : **soft-archive** (`archived_at`) plutôt que delete dur si le point a des `journal_entry_points`.
- **Erreur** : nom vide / > N caractères → 400 (Zod). Grade hors codes canoniques → 400.
- **Sécurité** : seul `is_teacher_or_admin()` peut éditer (RLS). Élève : aucun accès en écriture (lecture éventuelle hors V1).

### 6.2 Pré-remplissage (seed) d'un grade

- **Nominal** : un grade pré-rempli (ex. 6ᵉ) apparaît avec ses thèmes/items/points dès l'ouverture, puis modifiable.
- **Limite** : le seed ne s'applique qu'une fois (idempotent) ; éditer après seed n'est pas écrasé par un re-seed.

### 6.3 Tagging d'un exercice du système

- **Nominal** : associer un exercice à 1..n points → relation créée.
- **Limite** : exercice déjà tagué sur le même point → idempotent (pas de doublon).
- **Erreur** : point/exercice inexistant → 400/404.

### 6.4 Alimentation depuis une entrée de cahier de texte

- **Nominal (auto)** : entrée qui référence un exercice tagué (points P1,P2) → `journal_entry_points` (P1,P2, source='auto'). La couverture de P1,P2 pour la classe **+1**.
- **Nominal (manuel)** : le prof coche P3 sur l'entrée (réf. manuel ou point de cours libre) → `journal_entry_points` (P3, source='manual'). Couverture +1.
- **Limite** : même point couvert 2 fois par la même entrée (1 auto via exo + 1 manuel) → **compté une fois par entrée** (`unique(entry_id, point_id)` ; `manual` l'emporte sur `auto` ou priorité à définir).
- **Limite** : le prof décoche un point `auto` → retiré de la couverture pour cette entrée.
- **Limite** : supprimer l'entrée → cascade, couverture recalculée (−1).
- **Limite** : changer la `class_id`/date d'une entrée → la couverture suit la bonne classe/année.
- **Erreur** : référencer un exercice/chapitre/point inexistant → 400.

### 6.5 Vue d'avancement (heatmap)

- **Nominal** : pour une classe, l'arborescence affiche chaque point avec son compteur et sa couleur ; items/thèmes agrègent.
- **Limite** : classe sans aucune entrée → tout à 0 / « jamais vu ».
- **Limite** : points archivés → exclus de la heatmap active (consultables à part).

---

## 7. UI (pages — proposition)

1. **Édition du programme** (`teacher/programme` ou `teacher/curriculum`) : sélecteur de grade + arborescence éditable (thèmes/items/points, drag-order, CRUD).
2. **Avancement par classe** (heatmap) : `teacher/classes/[classId]/programme` (ou onglet) — arborescence dépliable colorée, % par item/thème, filtre « points non vus ».
3. **Intégration cahier de texte** : dans l'éditeur d'entrée (`teacher/cahier-texte/[classId]/[date]`), bloc « Programme travaillé » : (a) activités (exo système / réf manuel / point de cours) ; (b) points auto-déduits + coche manuelle.

> Composants UI : **MySelect / MyCheckbox** obligatoires ; runes only ; `svelte-autofixer` sur chaque `.svelte`.

---

## 8. Phasage (proposition)

- **Phase 1 — Données & API** : migrations (4.1–4.3), types `database-helpers`, validation Zod, endpoints CRUD programme + tagging + alimentation. Tests d'intégration (RLS `is_teacher_or_admin()`, triggers couverture). **Tests d'abord.**
- **Phase 2 — Seed d'un grade** : pré-remplissage du grade choisi (cf. §10).
- **Phase 3 — UI édition programme** (CRUD).
- **Phase 4 — UI heatmap avancement** (rollup, couleurs, filtre trous).
- **Phase 5 — Intégration cahier de texte** (bloc « Programme travaillé », auto + manuel).
- Revue : `code-reviewer` + `security-auditor` (RLS/API) à chaque phase touchant données/auth.

---

## 9. Hors périmètre V1 (proposé)

- Accès **élève** à la couverture/programme (lecture).
- Lien point ↔ objectif d'évaluation (croisement « travaillé » × « acquis »).
- Tagging massif des 103 exercices existants (on tague au fil de l'eau / par lots ensuite).
- Multi-grades complets (on démarre par 1 grade pré-rempli).

---

## 11. Phase 1 — progression (crash-recovery)

> Branche : **`feat/suivi-programme`**. **Non commité** (en attente d'accord).

**Fait & vérifié (local Supabase) :**

- **Migration** `supabase/migrations/20260621100000_curriculum_tracking.sql` — les 6 tables (§4) + RLS mono-prof (`is_teacher_or_admin()`, pattern `class_chapters`) + CHECK + UNIQUE + index + triggers `updated_at`. **Appliquée via `db:reset` sans erreur.**
- **Tests** `tests/integration/curriculum-tracking-rls.test.ts` — **12/12 verts** : RLS (teacher OK / student refusé 42501 / student SELECT filtré / admin OK), CHECK (grade canonique, nom non vide, `kind`), UNIQUE (`grade,name` / `item_id,name`), cascade thème→items→points.

**Décisions gravées dans le schéma :**

- Valeurs : `kind` ∈ {`connaissance`, `savoir_faire`} (nullable) · `source` ∈ {`auto`, `manual`} · activité `kind` ∈ {`exercise`, `textbook`, `course`}.
- **Grade = code canonique** (`'6'`, pas `'6e'`) — réconciliation avec `niveau_scolaire` du réf. d'éval **à faire au moment du seed** (Phase 2).
- **Soft-archive** des points via `archived_at` (pas de delete dur si couverture existante — à appliquer côté API).
- UNIQUE `(grade,name)` / `(theme_id,name)` / `(item_id,name)` → 409 côté API.
- `textbook_ref` = `jsonb` souple `{ manuel?, page?, numero?, label }`.

**Brique 1 — Arborescence (Thème/Item/Point) : ✅ FAIT & VERT**

- Types manuels standalone dans `database-helpers.ts` (`CurriculumTheme/Item/Point`, `JournalEntryActivity/Point`, `ExerciseCurriculumPoint`, unions `kind`/`source`/`activityKind`, `TextbookRef`). ⚠️ À remplacer par `Tables<'…'>` après push prod + `db:types`.
- Zod : `src/lib/server/validation/curriculum.ts` (create/update themes/items/points + query schemas).
- Helper serveur : `src/lib/server/curriculum.ts` (mapping erreurs PG→HTTP, colonnes).
- **6 endpoints** `src/routes/api/teacher/curriculum/{themes,items,points}[/[id]]/+server.ts` — GET/POST/PATCH/DELETE, `requireRoles(['teacher','admin'])` + RLS.
- Tests : `curriculum-api.test.ts` **22/22** (201/400/404/409/401/403, tri, cascade, archive). + `curriculum-tracking-rls.test.ts` **12/12**. **`check:incremental` = 0 erreur.**

**Brique 2 — Alimentation (à faire) :**

- Endpoints tagging exercices (`exercise_curriculum_points`).
- Endpoints cahier de texte : `journal_entry_activities` (3 types) + `journal_entry_points` (couverture auto matérialisée depuis les activités taguées + coche manuelle, dé-coche).
- Tests endpoints + RLS/contraintes (`exercise_curriculum_points`, `journal_entry_*` : `kind_shape`, `source`, unique).

---

## 10. Questions ouvertes (à trancher avec David)

1. **Grade de démarrage** : quel(s) niveau(x) enseignes-tu, et lequel pré-remplit-on en premier ? (6ᵉ ?)
2. **Source du pré-remplissage** : ta **progression perso 2016** (« echelles descriptives connaissance 6 2016.pdf », tableau ~15 items × colonnes, intitulés simples) ? le **BO** ? l'arbre **éval 6ᵉ existant** (6 thèmes / 18 items) comme ossature ? Une combinaison ?
3. **Référence manuel** : structurée (`manuel`, `page`, `numéro`) ou simple texte libre (label) ? Proposition : `jsonb` souple (label obligatoire, le reste optionnel).
4. **`kind` sur le Point** (connaissance / savoir-faire) : utile ou superflu vu le grain fin ? Proposition : champ **optionnel** (null par défaut).
5. ~~Vocabulaire~~ — **ACTÉ** (2026-06-21) : `Thème → Item → Point`, niveau 3 neutre + champ `kind` optionnel (cf. §3).
6. **Matérialisation vs dérivation** de la couverture auto (cf. §4.3) : ok pour matérialiser ?

```

```
