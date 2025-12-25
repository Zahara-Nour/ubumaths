# Worksheets Online Mode - Architecture Document

> **Status**: Draft - En attente de validation
> **Date**: 2025-12-12
> **Auteur**: Claude (avec David)

---

## 1. Vue d'ensemble

### 1.1 Objectif

Ajouter un mode de consultation en ligne (non-interactif) pour les worksheets, permettant aux eleves de visualiser les exercices et leurs corrections directement dans l'application.

### 1.2 Decisions cles

| Aspect               | Decision                                             |
| -------------------- | ---------------------------------------------------- |
| Distribution         | Table separee `worksheet_assignment_students`        |
| Ajout exercice       | Etendre les instances automatiquement                |
| Suppression exercice | Retirer de la vue (soft delete)                      |
| Corrections          | Global + override par exercice                       |
| Mise a jour          | Refresh page (pas de temps reel)                     |
| Interface            | `/student/worksheets` + onglet dans `/student/cours` |
| Tracking             | Aucun                                                |

---

## 2. Modifications Base de Donnees

### 2.1 Nouvelle table: `worksheet_assignment_students`

Permet d'assigner des eleves individuels en plus des classes.

```sql
CREATE TABLE worksheet_assignment_students (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES worksheet_assignments(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT worksheet_assignment_students_unique
    UNIQUE (assignment_id, student_id)
);

CREATE INDEX idx_was_assignment_id ON worksheet_assignment_students(assignment_id);
CREATE INDEX idx_was_student_id ON worksheet_assignment_students(student_id);
```

### 2.2 Modification: `worksheet_assignments`

Ajouter le controle global des corrections.

```sql
ALTER TABLE worksheet_assignments
ADD COLUMN show_corrections BOOLEAN DEFAULT false;
```

### 2.3 Modification: `worksheet_exercises`

Ajouter le controle des corrections par exercice (niveau template).

```sql
ALTER TABLE worksheet_exercises
ADD COLUMN correction_visible BOOLEAN DEFAULT true;
-- true = suit le reglage global, peut etre override dans l'assignation
```

### 2.4 Nouvelle table: `worksheet_assignment_exercise_settings`

Override des corrections par exercice au niveau de l'assignation.

```sql
CREATE TABLE worksheet_assignment_exercise_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES worksheet_assignments(id) ON DELETE CASCADE,
  worksheet_exercise_id UUID NOT NULL REFERENCES worksheet_exercises(id) ON DELETE CASCADE,
  show_correction BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT waes_unique UNIQUE (assignment_id, worksheet_exercise_id)
);

CREATE INDEX idx_waes_assignment_id ON worksheet_assignment_exercise_settings(assignment_id);
```

### 2.5 Modification: `worksheet_instances`

Stocker les exercices resolus de maniere stable pour permettre les mises a jour partielles.

```sql
-- Pas de modification structurelle necessaire
-- instance_data.exercises[] contient deja les exercices resolus avec leur exercise_id
-- On peut ajouter/retirer des exercices en regenerant uniquement les nouveaux
```

### 2.6 Vue: `student_worksheet_assignments`

Vue pour simplifier les requetes cote eleve.

```sql
CREATE VIEW student_worksheet_assignments AS
SELECT DISTINCT
  wa.id AS assignment_id,
  wa.worksheet_id,
  wa.title AS assignment_title,
  wa.instructions,
  wa.available_from,
  wa.due_at,
  wa.show_corrections,
  wa.status,
  w.title AS worksheet_title,
  w.type AS worksheet_type,
  w.description,
  cm.student_id
FROM worksheet_assignments wa
JOIN worksheets w ON w.id = wa.worksheet_id
LEFT JOIN class_members cm ON cm.class_id = wa.class_id
WHERE wa.status = 'active'
  AND wa.available_from <= NOW()

UNION

SELECT DISTINCT
  wa.id AS assignment_id,
  wa.worksheet_id,
  wa.title AS assignment_title,
  wa.instructions,
  wa.available_from,
  wa.due_at,
  wa.show_corrections,
  wa.status,
  w.title AS worksheet_title,
  w.type AS worksheet_type,
  w.description,
  was.student_id
FROM worksheet_assignments wa
JOIN worksheets w ON w.id = wa.worksheet_id
JOIN worksheet_assignment_students was ON was.assignment_id = wa.id
WHERE wa.status = 'active'
  AND wa.available_from <= NOW();
```

---

## 3. Logique de visibilite des corrections

### 3.1 Algorithme de resolution

```typescript
function isCorrectionVisible(
	assignment: WorksheetAssignment,
	worksheetExercise: WorksheetExercise,
	exerciseSettings?: WorksheetAssignmentExerciseSettings
): boolean {
	// 1. Verifier le mode de publication des corrections
	if (!isCorrectionReleased(assignment)) {
		return false;
	}

	// 2. Si override specifique pour cet exercice dans l'assignation
	if (exerciseSettings?.show_correction !== undefined) {
		return exerciseSettings.show_correction;
	}

	// 3. Sinon, utiliser le reglage global de l'assignation
	// combine avec le reglage par defaut de l'exercice
	return assignment.show_corrections && worksheetExercise.correction_visible;
}

function isCorrectionReleased(assignment: WorksheetAssignment): boolean {
	switch (assignment.correction_release_mode) {
		case 'manual':
			return assignment.show_corrections;
		case 'immediate':
			return true;
		case 'scheduled':
			return assignment.correction_release_at
				? new Date() >= new Date(assignment.correction_release_at)
				: false;
		case 'after_due':
			return assignment.due_at ? new Date() >= new Date(assignment.due_at) : false;
		default:
			return false;
	}
}
```

### 3.2 Matrice de visibilite

| correction_release_mode | show_corrections (global) | correction_visible (exo) | Override assignation | Resultat |
| ----------------------- | ------------------------- | ------------------------ | -------------------- | -------- |
| manual                  | false                     | true                     | -                    | NON      |
| manual                  | true                      | true                     | -                    | OUI      |
| manual                  | true                      | false                    | -                    | NON      |
| manual                  | true                      | true                     | false                | NON      |
| immediate               | -                         | true                     | -                    | OUI      |
| immediate               | -                         | false                    | -                    | NON      |
| immediate               | -                         | false                    | true                 | OUI      |
| scheduled (date passee) | -                         | true                     | -                    | OUI      |
| after_due (date passee) | -                         | true                     | -                    | OUI      |

---

## 4. Gestion des modifications de worksheet

### 4.1 Ajout d'un exercice

Quand un exercice est ajoute a une worksheet deja distribuee :

```typescript
async function onExerciseAdded(worksheetId: string, newExercise: WorksheetExercise): Promise<void> {
	// 1. Trouver toutes les instances existantes
	const instances = await supabase
		.from('worksheet_instances')
		.select('*')
		.eq('worksheet_id', worksheetId);

	// 2. Pour chaque instance, generer le nouvel exercice avec le meme seed
	for (const instance of instances.data) {
		const resolvedExercise = resolveExercise(newExercise, instance.variant_seed);

		// 3. Ajouter a instance_data.exercises
		const updatedExercises = [...instance.instance_data.exercises, resolvedExercise];

		await supabase
			.from('worksheet_instances')
			.update({
				instance_data: {
					...instance.instance_data,
					exercises: updatedExercises
				}
			})
			.eq('id', instance.id);
	}
}
```

**Points cles:**

- Le seed de l'instance est conserve
- Le nouvel exercice utilise ce seed pour generer ses parametres
- Les exercices existants ne sont PAS modifies

### 4.2 Suppression d'un exercice

Quand un exercice est supprime :

```typescript
async function onExerciseRemoved(worksheetId: string, removedExerciseId: string): Promise<void> {
	// 1. Trouver toutes les instances
	const instances = await supabase
		.from('worksheet_instances')
		.select('*')
		.eq('worksheet_id', worksheetId);

	// 2. Retirer l'exercice de chaque instance
	for (const instance of instances.data) {
		const updatedExercises = instance.instance_data.exercises.filter(
			(e) => e.exercise_id !== removedExerciseId
		);

		await supabase
			.from('worksheet_instances')
			.update({
				instance_data: {
					...instance.instance_data,
					exercises: updatedExercises
				}
			})
			.eq('id', instance.id);
	}
}
```

### 4.3 Modification d'un exercice

Quand un exercice existant est modifie (enonce, variables) :

```typescript
async function onExerciseModified(
	worksheetId: string,
	modifiedExercise: WorksheetExercise
): Promise<void> {
	// 1. Trouver toutes les instances
	const instances = await supabase
		.from('worksheet_instances')
		.select('*')
		.eq('worksheet_id', worksheetId);

	// 2. Regenerer l'exercice avec le MEME SEED
	for (const instance of instances.data) {
		const resolvedExercise = resolveExercise(modifiedExercise, instance.variant_seed);

		// 3. Remplacer dans instance_data.exercises
		const updatedExercises = instance.instance_data.exercises.map((e) =>
			e.exercise_id === modifiedExercise.exercise_id ? resolvedExercise : e
		);

		await supabase
			.from('worksheet_instances')
			.update({
				instance_data: {
					...instance.instance_data,
					exercises: updatedExercises
				}
			})
			.eq('id', instance.id);
	}
}
```

**Important:** Le seed est conserve, donc les valeurs numeriques restent identiques. Seul le texte/structure change.

---

## 5. API Endpoints

### 5.1 Nouveaux endpoints eleve

```typescript
// GET /api/student/worksheets
// Liste des worksheets assignes a l'eleve connecte
{
  worksheets: [{
    assignment_id: string,
    worksheet_id: string,
    title: string,
    type: WorksheetType,
    available_from: string,
    due_at: string | null,
    show_corrections: boolean
  }]
}

// GET /api/student/worksheets/[assignmentId]
// Detail d'un worksheet avec exercices resolus
{
  assignment: WorksheetAssignment,
  worksheet: Worksheet,
  exercises: [{
    position: number,
    statement: string,        // Markdown resolu
    solution: string | null,  // Null si correction non visible
    points: number | null,
    show_correction: boolean
  }]
}
```

### 5.2 Nouveaux endpoints enseignant

```typescript
// POST /api/worksheets/[id]/assignments/[assignmentId]/students
// Ajouter des eleves individuels a une assignation
{
  student_ids: string[]
}

// DELETE /api/worksheets/[id]/assignments/[assignmentId]/students/[studentId]
// Retirer un eleve d'une assignation

// PUT /api/worksheets/[id]/assignments/[assignmentId]/exercises/[exerciseId]/settings
// Configurer la visibilite de correction pour un exercice specifique
{
  show_correction: boolean
}

// PUT /api/worksheets/[id]/assignments/[assignmentId]/corrections
// Toggle global des corrections
{
  show_corrections: boolean
}
```

### 5.3 Modification endpoints existants

```typescript
// PUT /api/worksheets/[id]/exercises
// Lors de l'ajout/modification/suppression, declencher la mise a jour des instances
// Ajouter un flag pour propager aux instances existantes
{
  // ... existing fields
  propagate_to_instances?: boolean  // default: true pour les worksheets distribues
}
```

---

## 6. Interface Eleve

### 6.1 Route `/dashboard/student/worksheets`

**Page liste:**

```
/dashboard/student/worksheets/+page.svelte
```

Affiche tous les worksheets assignes a l'eleve avec :

- Titre, type, date limite
- Indicateur si corrections disponibles
- Filtre par cours/classe (optionnel)

**Page detail:**

```
/dashboard/student/worksheets/[assignmentId]/+page.svelte
```

Affiche le worksheet complet :

- En-tete avec titre, instructions, date limite
- Liste des exercices avec enonces
- Corrections si visibles (toggle par exercice)

### 6.2 Integration dans `/dashboard/student/cours`

Ajouter un onglet "Worksheets" dans la page cours existante :

```svelte
<Tabs>
	<TabsList>
		<TabsTrigger value="content">Contenu</TabsTrigger>
		<TabsTrigger value="worksheets">Worksheets</TabsTrigger>
	</TabsList>

	<TabsContent value="worksheets">
		<WorksheetList courseId={data.course.id} />
	</TabsContent>
</Tabs>
```

### 6.3 Composants UI

```
src/lib/components/student/
  worksheets/
    WorksheetCard.svelte        # Carte dans la liste
    WorksheetDetail.svelte      # Vue complete d'un worksheet
    ExerciseDisplay.svelte      # Affichage d'un exercice (enonce + correction)
    CorrectionToggle.svelte     # Toggle pour montrer/cacher correction
```

---

## 7. Interface Enseignant - Modifications

### 7.1 Formulaire d'assignation

Modifier `WorksheetAssignmentForm.svelte` :

```svelte
<!-- Section existante: selection classe -->

<!-- NOUVELLE SECTION: Eleves individuels -->
<Card.Root>
	<Card.Header>
		<Card.Title>Eleves supplementaires</Card.Title>
		<Card.Description>
			Ajouter des eleves qui ne sont pas dans la classe selectionnee
		</Card.Description>
	</Card.Header>
	<Card.Content>
		<StudentSelector bind:selectedStudents={additionalStudents} excludeClassId={selectedClassId} />
	</Card.Content>
</Card.Root>

<!-- NOUVELLE SECTION: Corrections par exercice -->
<Card.Root>
	<Card.Header>
		<Card.Title>Visibilite des corrections</Card.Title>
	</Card.Header>
	<Card.Content>
		<div class="space-y-2">
			<MyCheckbox bind:checked={showCorrectionsGlobal} label="Activer les corrections (global)" />

			{#if showCorrectionsGlobal}
				<div class="ml-6 space-y-2">
					<p class="text-sm text-muted-foreground">Override par exercice :</p>
					{#each exercises as exercise, i}
						<div class="flex items-center gap-2">
							<MyCheckbox bind:checked={exerciseCorrectionSettings[exercise.id]} />
							<span>Exercice {i + 1}: {exercise.title}</span>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</Card.Content>
</Card.Root>
```

### 7.2 Page de gestion d'une assignation

Nouvelle page pour gerer une assignation existante :

```
/dashboard/teacher/worksheets/[id]/assignments/[assignmentId]/+page.svelte
```

Fonctionnalites :

- Voir les eleves concernes (classe + individuels)
- Ajouter/retirer des eleves
- Toggle corrections (global et par exercice)
- Voir statistiques de consultation (si tracking active plus tard)

---

## 8. RLS Policies

### 8.1 `worksheet_assignment_students`

```sql
-- Enseignants peuvent gerer les eleves de leurs assignations
CREATE POLICY "Teachers manage assignment students"
  ON worksheet_assignment_students
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM worksheet_assignments wa
      WHERE wa.id = worksheet_assignment_students.assignment_id
      AND wa.created_by = auth.uid()
    )
  );

-- Eleves peuvent voir s'ils sont assignes
CREATE POLICY "Students view their assignments"
  ON worksheet_assignment_students
  FOR SELECT
  USING (student_id = auth.uid());
```

### 8.2 `worksheet_assignment_exercise_settings`

```sql
-- Enseignants peuvent gerer les settings de leurs assignations
CREATE POLICY "Teachers manage exercise settings"
  ON worksheet_assignment_exercise_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM worksheet_assignments wa
      WHERE wa.id = worksheet_assignment_exercise_settings.assignment_id
      AND wa.created_by = auth.uid()
    )
  );
```

### 8.3 Mise a jour `worksheet_instances`

```sql
-- Eleves peuvent lire leurs propres instances
CREATE POLICY "Students read own instances"
  ON worksheet_instances
  FOR SELECT
  USING (student_id = auth.uid());
```

---

## 9. Plan d'implementation

### Phase 1: Base de donnees (Migration)

1. Creer table `worksheet_assignment_students`
2. Creer table `worksheet_assignment_exercise_settings`
3. Ajouter colonne `show_corrections` a `worksheet_assignments`
4. Ajouter colonne `correction_visible` a `worksheet_exercises`
5. Creer vue `student_worksheet_assignments`
6. Ajouter RLS policies

### Phase 2: API Backend

1. Endpoints eleve (`/api/student/worksheets/*`)
2. Endpoints gestion eleves individuels
3. Endpoints gestion corrections par exercice
4. Logique de propagation des modifications aux instances

### Phase 3: Interface Eleve

1. Page liste `/dashboard/student/worksheets`
2. Page detail `/dashboard/student/worksheets/[assignmentId]`
3. Composants `WorksheetCard`, `ExerciseDisplay`
4. Integration onglet dans `/dashboard/student/cours`

### Phase 4: Interface Enseignant

1. Modifier `WorksheetAssignmentForm` (eleves individuels)
2. Ajouter section corrections par exercice
3. Page gestion assignation existante
4. Composant `StudentSelector`

### Phase 5: Tests et Documentation

1. Tests unitaires API
2. Tests composants Svelte
3. Mise a jour documentation

---

## 10. Questions ouvertes

1. **Performance**: Si un worksheet a 1000 eleves et on ajoute un exercice, faut-il :

   - Mise a jour synchrone (peut etre lent)
   - Job asynchrone (background task)
   - Lazy update (regenerer a l'acces)

2. **Conflits**: Que faire si l'enseignant modifie pendant qu'un eleve consulte ?

   - L'eleve voit l'ancienne version jusqu'au refresh

3. **Historique**: Faut-il garder un historique des modifications ?
   - Pour l'instant: non (KISS)
   - A considerer plus tard si besoin

---

## 11. Estimation effort

| Phase                  | Effort estime |
| ---------------------- | ------------- |
| Phase 1: DB            | 2-3h          |
| Phase 2: API           | 4-6h          |
| Phase 3: UI Eleve      | 4-6h          |
| Phase 4: UI Enseignant | 3-4h          |
| Phase 5: Tests         | 2-3h          |
| **Total**              | **15-22h**    |

---

## Validation

- [ ] Architecture validee par David
- [ ] Migration DB approuvee
- [ ] Maquettes UI approuvees (si necessaire)
