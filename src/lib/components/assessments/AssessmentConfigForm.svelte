<!--
	AssessmentConfigForm Component
	===============================
	Form for configuring assessment settings (title, grade, deadline, attempts, etc.)

	Props:
	- initialData: Optional initial form data for editing
	- onSubmit: Callback with form data
	- onCancel: Callback for cancel action
	- submitLabel: Label for submit button (default: "Créer")
-->

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import MySelect from '$lib/components/MySelect.svelte';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import type { AssessmentSettings } from '$lib/types/assessment';
	import { GRADE_LEVELS, DEFAULT_ASSESSMENT_SETTINGS } from '$lib/types/assessment';

	interface AssessmentFormData {
		title: string;
		grade: string;
		description: string;
		settings: AssessmentSettings;
	}

	interface Props {
		initialData?: Partial<AssessmentFormData>;
		onSubmit: (data: AssessmentFormData) => void;
		onCancel?: () => void;
		submitLabel?: string;
	}

	let { initialData, onSubmit, onCancel, submitLabel = 'Créer' }: Props = $props();

	// Form state
	let title = $state(initialData?.title || '');
	let grade = $state(initialData?.grade || '6ème');
	let description = $state(initialData?.description || '');
	let maxAttempts = $state<number | null>(
		initialData?.settings?.max_attempts ?? DEFAULT_ASSESSMENT_SETTINGS.max_attempts
	);
	let timeLimit = $state<number | null>(
		initialData?.settings?.time_limit ?? DEFAULT_ASSESSMENT_SETTINGS.time_limit
	);
	let deadline = $state<string>(initialData?.settings?.deadline ?? '');
	let shuffleQuestions = $state(
		initialData?.settings?.shuffle_questions ?? DEFAULT_ASSESSMENT_SETTINGS.shuffle_questions
	);

	// Input values for optional fields (string for input binding)
	let maxAttemptsInput = $state(maxAttempts?.toString() || '');
	let timeLimitInput = $state(timeLimit?.toString() || '');

	// Validation
	let errors = $state<Record<string, string>>({});

	function validate(): boolean {
		errors = {};

		if (!title.trim()) {
			errors.title = 'Le titre est requis';
		}

		if (!grade) {
			errors.grade = 'Le niveau est requis';
		}

		if (maxAttemptsInput && parseInt(maxAttemptsInput) < 1) {
			errors.maxAttempts = 'Le nombre de tentatives doit être au moins 1';
		}

		if (timeLimitInput && parseInt(timeLimitInput) < 1) {
			errors.timeLimit = 'Le temps limite doit être au moins 1 minute';
		}

		return Object.keys(errors).length === 0;
	}

	function handleSubmit() {
		if (!validate()) return;

		// Parse optional numeric fields
		const parsedMaxAttempts = maxAttemptsInput ? parseInt(maxAttemptsInput) : null;
		const parsedTimeLimit = timeLimitInput ? parseInt(timeLimitInput) * 60 : null; // Convert minutes to seconds

		const settings: AssessmentSettings = {
			max_attempts: parsedMaxAttempts,
			time_limit: parsedTimeLimit,
			deadline: deadline || null,
			shuffle_questions: shuffleQuestions
		};

		onSubmit({
			title,
			grade,
			description,
			settings
		});
	}

	// Min datetime for deadline (now)
	let minDeadline = $derived.by(() => {
		const now = new Date();
		now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
		return now.toISOString().slice(0, 16);
	});
</script>

<form
	onsubmit={(e) => {
		e.preventDefault();
		handleSubmit();
	}}
	class="space-y-6"
>
	<!-- Title -->
	<div class="space-y-2">
		<Label for="title">Titre *</Label>
		<Input
			id="title"
			bind:value={title}
			placeholder="Ex: Évaluation Chapitre 3 - Les Fractions"
			class={errors.title ? 'border-red-500' : ''}
		/>
		{#if errors.title}
			<p class="text-sm text-red-500">{errors.title}</p>
		{/if}
	</div>

	<!-- Grade -->
	<div class="space-y-2">
		<Label for="grade">Niveau *</Label>
		<MySelect
			type="single"
			bind:value={grade}
			items={GRADE_LEVELS.map((level) => ({ value: level, label: level }))}
			placeholder="Sélectionner un niveau"
			triggerClass="h-10 w-full rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between {errors.grade
				? 'border-red-500'
				: ''}"
		/>
		{#if errors.grade}
			<p class="text-sm text-red-500">{errors.grade}</p>
		{/if}
	</div>

	<!-- Description -->
	<div class="space-y-2">
		<Label for="description">Description (optionnel)</Label>
		<Textarea
			id="description"
			bind:value={description}
			placeholder="Description de l'évaluation..."
			rows={3}
		/>
	</div>

	<!-- Settings Section -->
	<div class="space-y-4 rounded-lg border p-4">
		<h3 class="font-semibold">Paramètres</h3>

		<!-- Deadline -->
		<div class="space-y-2">
			<Label for="deadline">Date limite (optionnel)</Label>
			<Input id="deadline" type="datetime-local" bind:value={deadline} min={minDeadline} />
			<p class="text-xs text-muted-foreground">
				Si définie, les élèves ne pourront plus commencer après cette date
			</p>
		</div>

		<!-- Max Attempts -->
		<div class="space-y-2">
			<Label for="maxAttempts">Nombre de tentatives maximum (optionnel)</Label>
			<Input
				id="maxAttempts"
				type="number"
				bind:value={maxAttemptsInput}
				placeholder="Illimité"
				min="1"
				class={errors.maxAttempts ? 'border-red-500' : ''}
			/>
			{#if errors.maxAttempts}
				<p class="text-sm text-red-500">{errors.maxAttempts}</p>
			{/if}
			<p class="text-xs text-muted-foreground">Laisser vide pour des tentatives illimitées</p>
		</div>

		<!-- Time Limit -->
		<div class="space-y-2">
			<Label for="timeLimit">Temps limite total en minutes (optionnel)</Label>
			<Input
				id="timeLimit"
				type="number"
				bind:value={timeLimitInput}
				placeholder="Aucune limite"
				min="1"
				class={errors.timeLimit ? 'border-red-500' : ''}
			/>
			{#if errors.timeLimit}
				<p class="text-sm text-red-500">{errors.timeLimit}</p>
			{/if}
			<p class="text-xs text-muted-foreground">
				Temps total alloué pour compléter toute l'évaluation
			</p>
		</div>

		<!-- Shuffle Questions -->
		<div class="flex items-center space-x-2">
			<Checkbox id="shuffle" bind:checked={shuffleQuestions} />
			<Label for="shuffle" class="cursor-pointer font-normal">Mélanger l'ordre des questions</Label>
		</div>
	</div>

	<!-- Actions -->
	<div class="flex justify-end gap-3">
		{#if onCancel}
			<Button type="button" variant="outline" onclick={onCancel}>Annuler</Button>
		{/if}
		<Button type="submit">
			{submitLabel}
		</Button>
	</div>
</form>
