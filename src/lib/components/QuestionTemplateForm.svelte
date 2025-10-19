<!--
	Question Template Form Component
	=================================

	Main orchestrator for creating/editing question templates.

	FEATURES:
	- Type selection (numerical, algebraic, fill-in-blanks, QCM)
	- Dynamic form fields based on question type
	- Variable editor with syntax helpers
	- Content field editor for statement/correction
	- Answer editor (varies by type)
	- Precision configuration (for numerical questions)
	- Grade level multi-select
	- Live preview of generated instances
	- JSON viewer for debugging

	PROPS:
	- template?: QuestionTemplate (for editing)
	- onSave: (template) => void
	- onCancel: () => void
	- isSubmitting: boolean
-->

<script lang="ts">
	import type {
		QuestionTemplate,
		QuestionType,
		GradeLevel,
		QuestionVariable,
		ContentField,
		PrecisionType
	} from '$lib/questions/types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Badge } from '$lib/components/ui/badge';
	import VariableEditor from './VariableEditor.svelte';
	import ContentFieldEditor from './ContentFieldEditor.svelte';
	import AnswerEditor from './AnswerEditor.svelte';
	import PrecisionEditor from './PrecisionEditor.svelte';
	import QuestionPreview from './QuestionPreview.svelte';
	import JsonViewer from './JsonViewer.svelte';
	import CategorySelector from './CategorySelector.svelte';
	import { Save, X } from 'lucide-svelte';

	interface Props {
		template?: QuestionTemplate;
		onSave: (template: Omit<QuestionTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'>) => void;
		onCancel: () => void;
		isSubmitting: boolean;
	}

	let { template, onSave, onCancel, isSubmitting }: Props = $props();

	// Form state
	let questionType = $state<QuestionType>(template?.type || 'numerical_exact');
	let statement = $state<ContentField[]>(template?.statement || [{ type: 'text', content: '' }]);
	let variables = $state<QuestionVariable[]>(template?.variables || []);
	let answer = $state<string | string[]>(template?.answer || '');
	let grades = $state<GradeLevel[]>(template?.grades || []);
	let delay = $state<number | undefined>(template?.delay);
	let correction = $state<ContentField[] | undefined>(template?.correction);
	let precision = $state<PrecisionType>(template?.precision || { type: 'none' });

	// Categorization fields
	let theme = $state<string>(template?.theme || '');
	let domain = $state<string>(template?.domain || '');
	let subdomain = $state<string | undefined>(template?.subdomain);
	let level = $state<number>(template?.level || 1);

	// Category options (extracted from existing questions)
	let themeOptions = $state<string[]>([]);
	let domainOptions = $state<string[]>([]);
	let subdomainOptions = $state<string[]>([]);

	// Type-specific fields
	let transformType = $state<string | undefined>(template?.transform_type);
	let blanks = $state<number[] | undefined>(template?.blanks);
	let choices = $state<string[] | undefined>(template?.choices);
	let multipleAnswers = $state<boolean | undefined>(template?.multiple_answers);

	// Available grade levels
	const GRADE_LEVELS: GradeLevel[] = [
		'CP', 'CE1', 'CE2', 'CM1', 'CM2',
		'6', '5', '4', '3', '2',
		'SPE_1', 'SPE_T', 'T_EXP', 'T_COMP', 'STMG'
	];

	// Question type options
	const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
		{ value: 'numerical_exact', label: 'Numérique (exact)' },
		{ value: 'numerical_decimal', label: 'Numérique (décimal)' },
		{ value: 'numerical_rounded', label: 'Numérique (arrondi)' },
		{ value: 'algebraic_transform', label: 'Transformation algébrique' },
		{ value: 'fill_in_blanks', label: 'Texte à trous' },
		{ value: 'multiple_choice', label: 'QCM' }
	];

	// Handle grade toggle
	function toggleGrade(grade: GradeLevel) {
		if (grades.includes(grade)) {
			grades = grades.filter((g) => g !== grade);
		} else {
			grades = [...grades, grade];
		}
	}

	// Handle category changes
	function handleAddTheme(newTheme: string) {
		if (!themeOptions.includes(newTheme)) {
			themeOptions = [...themeOptions, newTheme];
		}
	}

	function handleAddDomain(newDomain: string) {
		if (!domainOptions.includes(newDomain)) {
			domainOptions = [...domainOptions, newDomain];
		}
	}

	function handleAddSubdomain(newSubdomain: string) {
		if (!subdomainOptions.includes(newSubdomain)) {
			subdomainOptions = [...subdomainOptions, newSubdomain];
		}
	}

	// Build template object
	function buildTemplate(): Omit<QuestionTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'> {
		// Filter out empty correction fields
		const filteredCorrection = correction?.filter(
			(field) => (field.type === 'text' && field.content.trim() !== '') || (field.type === 'image' && field.url)
		);

		const base = {
			type: questionType,
			statement,
			variables: variables.length > 0 ? variables : undefined,
			answer,
			grades,
			theme,
			domain,
			subdomain,
			level,
			delay,
			correction: filteredCorrection && filteredCorrection.length > 0 ? filteredCorrection : undefined,
			precision: questionType.startsWith('numerical') ? precision : undefined
		};

		// Add type-specific fields
		if (questionType === 'algebraic_transform') {
			return { ...base, transform_type: transformType };
		} else if (questionType === 'fill_in_blanks') {
			return { ...base, blanks };
		} else if (questionType === 'multiple_choice') {
			return { ...base, choices, multiple_answers: multipleAnswers };
		}

		return base;
	}

	// Handle save
	function handleSave() {
		const templateData = buildTemplate();
		onSave(templateData);
	}

	// Validate form
	let isValid = $derived(
		statement.length > 0 &&
		statement.some((s) => s.type === 'text' && s.content.trim().length > 0) &&
		grades.length > 0 &&
		theme.trim().length > 0 &&
		domain.trim().length > 0 &&
		level > 0 &&
		(typeof answer === 'string' ? answer.trim().length > 0 : answer.length > 0)
	);
</script>

<div class="space-y-6">
	<!-- Type Selection -->
	<div class="grid gap-4 md:grid-cols-2">
		<div class="space-y-2">
			<Label for="question-type">Type de question</Label>
			<select
				id="question-type"
				bind:value={questionType}
				class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
			>
				{#each QUESTION_TYPES as type}
					<option value={type.value}>{type.label}</option>
				{/each}
			</select>
		</div>

		<div class="space-y-2">
			<Label for="delay">Délai (secondes, optionnel)</Label>
			<Input
				id="delay"
				type="number"
				min="0"
				bind:value={delay}
				placeholder="Ex: 60"
			/>
		</div>
	</div>

	<!-- Categorization Fields -->
	<!--
		Category system allows organizing questions by:
		- Theme: Broad subject area (e.g., "Algèbre", "Géométrie") [required]
		- Domain: Specific topic within theme (e.g., "Équations", "Polynômes") [required]
		- Subdomain: Optional sub-topic (e.g., "Linéaires", "Quadratiques") [optional]
		- Level: Difficulty as positive integer (1=easy, higher=harder) [required]

		These fields are independent from grade levels (grades field).
		Admins can add new categories on-the-fly via CategorySelector modals.
	-->
	<Card.Root>
		<Card.Header>
			<Card.Title>Catégorisation</Card.Title>
			<Card.Description>
				Classez la question par thème, domaine et niveau de difficulté (indépendants des niveaux scolaires)
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="grid gap-4 md:grid-cols-2">
				<!-- Theme (Required) -->
				<CategorySelector
					label="Thème"
					bind:value={theme}
					options={themeOptions}
					placeholder="Ex: Algèbre, Géométrie..."
					required={true}
					onValueChange={(val) => (theme = val)}
					onAddNew={handleAddTheme}
				/>

				<!-- Domain (Required) -->
				<CategorySelector
					label="Domaine"
					bind:value={domain}
					options={domainOptions}
					placeholder="Ex: Équations, Polynômes..."
					required={true}
					onValueChange={(val) => (domain = val)}
					onAddNew={handleAddDomain}
				/>
			</div>

			<div class="grid gap-4 md:grid-cols-2">
				<!-- Subdomain (Optional) -->
				<CategorySelector
					label="Sous-domaine (optionnel)"
					bind:value={subdomain}
					options={subdomainOptions}
					placeholder="Ex: Linéaires, Quadratiques..."
					required={false}
					onValueChange={(val) => (subdomain = val || undefined)}
					onAddNew={handleAddSubdomain}
				/>

				<!-- Difficulty Level (Required, positive integer, no max) -->
				<div class="space-y-2">
					<Label for="level">
						Niveau de difficulté
						<span class="text-destructive">*</span>
					</Label>
					<Input
						id="level"
						type="number"
						min="1"
						bind:value={level}
						placeholder="1, 2, 3..."
						required
					/>
					<p class="text-xs text-muted-foreground">
						Entier positif sans maximum (1 = facile, valeurs plus élevées = plus difficile)
					</p>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Grade Levels -->
	<div class="space-y-2">
		<Label>Niveaux scolaires</Label>
		<div class="flex flex-wrap gap-2">
			{#each GRADE_LEVELS as grade}
				<Badge
					class={grades.includes(grade)
						? 'cursor-pointer bg-primary text-primary-foreground hover:bg-primary/80'
						: 'cursor-pointer bg-muted text-muted-foreground hover:bg-muted/80'}
					onclick={() => toggleGrade(grade)}
				>
					{grade}
				</Badge>
			{/each}
		</div>
		{#if grades.length === 0}
			<p class="text-sm text-destructive">Sélectionnez au moins un niveau</p>
		{/if}
	</div>

	<!-- Tabbed Interface -->
	<Tabs.Root value="statement">
		<Tabs.List class="grid w-full grid-cols-5">
			<Tabs.Trigger value="statement">Énoncé</Tabs.Trigger>
			<Tabs.Trigger value="variables">Variables</Tabs.Trigger>
			<Tabs.Trigger value="answer">Réponse</Tabs.Trigger>
			<Tabs.Trigger value="preview">Aperçu</Tabs.Trigger>
			<Tabs.Trigger value="json">JSON</Tabs.Trigger>
		</Tabs.List>

		<!-- Statement Tab -->
		<Tabs.Content value="statement" class="space-y-4">
			<Card.Root>
				<Card.Header>
					<Card.Title>Énoncé de la question</Card.Title>
					<Card.Description>
						Utilisez la syntaxe <code>&#123;@:nom&#125;</code> pour les variables,
						<code>&#123;#:min-max&#125;</code> pour les nombres aléatoires,
						et <code>&#123;eval:expression&#125;</code> pour les calculs.
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<ContentFieldEditor bind:fields={statement} />
				</Card.Content>
			</Card.Root>

			<!-- Optional Correction -->
			<Card.Root>
				<Card.Header>
					<Card.Title>Correction (optionnelle)</Card.Title>
					<Card.Description>
						Explication détaillée de la solution
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<ContentFieldEditor bind:fields={correction} />
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<!-- Variables Tab -->
		<Tabs.Content value="variables">
			<Card.Root>
				<Card.Header>
					<Card.Title>Variables</Card.Title>
					<Card.Description>
						Définissez des variables réutilisables dans l'énoncé et la réponse.
						Les variables sont résolues dans l'ordre de déclaration.
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<VariableEditor bind:variables />
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<!-- Answer Tab -->
		<Tabs.Content value="answer" class="space-y-4">
			<AnswerEditor
				{questionType}
				bind:answer
				bind:precision
				bind:transformType
				bind:blanks
				bind:choices
				bind:multipleAnswers
			/>
		</Tabs.Content>

		<!-- Preview Tab -->
		<Tabs.Content value="preview">
			<QuestionPreview template={buildTemplate()} />
		</Tabs.Content>

		<!-- JSON Tab -->
		<Tabs.Content value="json">
			<JsonViewer data={buildTemplate()} />
		</Tabs.Content>
	</Tabs.Root>

	<!-- Action Buttons -->
	<div class="flex justify-end gap-3">
		<Button variant="outline" onclick={onCancel} disabled={isSubmitting}>
			<X class="mr-2 h-4 w-4" />
			Annuler
		</Button>
		<Button onclick={handleSave} disabled={!isValid || isSubmitting}>
			<Save class="mr-2 h-4 w-4" />
			{isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
		</Button>
	</div>
</div>
