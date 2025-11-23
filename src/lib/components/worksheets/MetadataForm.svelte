<!--
	MetadataForm Component
	======================

	Form for editing worksheet metadata (title, description, type, duration, grades, tags, config).
	Includes Zod validation with proper bounds.

	Usage:
	```svelte
	<script lang="ts">
	  import MetadataForm from '$lib/components/worksheets/MetadataForm.svelte';
	</script>

	<MetadataForm
	  {worksheet}
	  onSave={handleSave}
	  onCancel={() => editMode = false}
	  saving={isSaving}
	/>
	```
-->
<script lang="ts">
	import { z } from 'zod';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import MySelect from '$lib/components/MySelect.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import GradeBadgeSelector from '$lib/components/GradeBadgeSelector.svelte';
	import TagBadgeSelector from '$lib/components/TagBadgeSelector.svelte';
	import {
		WORKSHEET_TYPE_OPTIONS,
		NUMBERING_STYLE_OPTIONS,
		PAGE_LAYOUT_OPTIONS
	} from '$lib/utils/worksheet-constants';
	import { ChevronDown, ChevronUp, Loader2, Save, X } from 'lucide-svelte';
	import type {
		WorksheetWithRelations,
		WorksheetType,
		WorksheetConfig,
		NumberingStyle,
		WorksheetMetadataUpdate
	} from '$lib/types/worksheets';
	import type { GradeCode } from '$lib/types/grades';

	// Props
	interface Props {
		worksheet: WorksheetWithRelations;
		onSave: (data: WorksheetMetadataUpdate) => Promise<void>;
		onCancel: () => void;
		saving?: boolean;
	}

	let { worksheet, onSave, onCancel, saving = false }: Props = $props();

	// Validation schema with proper bounds
	const metadataSchema = z.object({
		title: z.string().min(1, 'Le titre est requis').max(200, 'Le titre est trop long (max 200)'),
		description: z
			.string()
			.max(2000, 'La description est trop longue (max 2000)')
			.optional()
			.nullable()
			.transform((v) => v || null),
		type: z.enum(['worksheet', 'assessment', 'exam', 'quiz', 'homework']),
		estimated_duration_minutes: z
			.number()
			.int('La duree doit etre un nombre entier')
			.min(0, 'La duree doit etre positive')
			.max(600, 'La duree maximale est de 10 heures (600 min)')
			.nullable()
			.optional(),
		grade_levels: z.array(z.string()).max(20, 'Maximum 20 niveaux'),
		tags: z
			.array(z.string().min(1, 'Tag ne peut pas etre vide').max(50, 'Tag trop long (max 50)'))
			.max(10, 'Maximum 10 tags')
	});

	// Extract initial config from worksheet (computed once at initialization)
	const initialConfig = worksheet.config || {};

	// Form state - initialized from worksheet data
	let title = $state(worksheet.title || '');
	let description = $state(worksheet.description || '');
	let worksheetType = $state<WorksheetType>(worksheet.type);
	let estimatedDuration = $state<number | null>(worksheet.estimated_duration_minutes);
	let selectedGrades = $state<GradeCode[]>(
		(worksheet.grade_levels || []).map((g) => String(g) as GradeCode)
	);
	let selectedTags = $state<string[]>(worksheet.tags || []);

	// Config options - initialized from worksheet config
	let configOpen = $state(false);
	let showTitle = $state(initialConfig.show_title ?? true);
	let showDate = $state(initialConfig.show_date ?? true);
	let showStudentName = $state(initialConfig.show_student_name ?? true);
	let showClass = $state(initialConfig.show_class ?? true);
	let showPoints = $state(initialConfig.show_points ?? true);
	let numberingStyle = $state<NumberingStyle>(initialConfig.numbering_style ?? 'numeric');
	let shuffleExercises = $state(initialConfig.shuffle_exercises ?? false);
	let shuffleWithinSections = $state(initialConfig.shuffle_within_sections ?? false);
	let pageLayout = $state<'A4' | 'Letter'>(initialConfig.page_layout ?? 'A4');

	// Validation errors
	let errors = $state<Record<string, string>>({});

	// Derived: build config object
	let config = $derived<WorksheetConfig>({
		show_title: showTitle,
		show_date: showDate,
		show_student_name: showStudentName,
		show_class: showClass,
		show_points: showPoints,
		numbering_style: numberingStyle,
		shuffle_exercises: shuffleExercises,
		shuffle_within_sections: shuffleWithinSections,
		page_layout: pageLayout
	});

	// Derived: form is valid (basic check for UI feedback)
	let isValid = $derived(title.trim().length > 0 && title.trim().length <= 200);

	/**
	 * Validate form data using Zod
	 */
	function validateForm(): WorksheetMetadataUpdate | null {
		const formData = {
			title: title.trim(),
			description: description.trim() || null,
			type: worksheetType,
			estimated_duration_minutes: estimatedDuration,
			grade_levels: selectedGrades,
			tags: selectedTags
		};

		const result = metadataSchema.safeParse(formData);

		if (!result.success) {
			// Map Zod errors to field errors
			const fieldErrors: Record<string, string> = {};
			for (const issue of result.error.issues) {
				const fieldName = issue.path[0] as string;
				if (!fieldErrors[fieldName]) {
					fieldErrors[fieldName] = issue.message;
				}
			}
			errors = fieldErrors;
			return null;
		}

		errors = {};
		return {
			title: result.data.title,
			description: result.data.description,
			type: result.data.type,
			estimated_duration_minutes: result.data.estimated_duration_minutes ?? null,
			grade_levels: result.data.grade_levels.map((g) => {
				const parsed = parseInt(g, 10);
				return isNaN(parsed) ? g : parsed;
			}),
			tags: result.data.tags,
			config
		};
	}

	/**
	 * Handle form submission
	 */
	async function handleSubmit(): Promise<void> {
		if (saving) return;

		const validatedData = validateForm();
		if (!validatedData) return;

		await onSave(validatedData);
	}

	/**
	 * Clear error for a specific field when user starts typing
	 */
	function clearError(field: string): void {
		if (errors[field]) {
			errors = { ...errors, [field]: '' };
		}
	}
</script>

<form
	onsubmit={(e) => {
		e.preventDefault();
		handleSubmit();
	}}
	class="space-y-6"
>
	<!-- Basic info card -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Informations generales</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-4">
			<!-- Title -->
			<div class="space-y-2">
				<Label for="title">Titre *</Label>
				<Input
					id="title"
					type="text"
					placeholder="Ex: Equations du premier degre"
					bind:value={title}
					oninput={() => clearError('title')}
					required
					maxlength={200}
					class={errors.title ? 'border-destructive' : ''}
				/>
				{#if errors.title}
					<p class="text-sm text-destructive">{errors.title}</p>
				{/if}
			</div>

			<!-- Description -->
			<div class="space-y-2">
				<Label for="description">Description</Label>
				<Textarea
					id="description"
					placeholder="Description de la feuille d'exercices..."
					bind:value={description}
					oninput={() => clearError('description')}
					rows={3}
					maxlength={2000}
					class={errors.description ? 'border-destructive' : ''}
				/>
				{#if errors.description}
					<p class="text-sm text-destructive">{errors.description}</p>
				{/if}
				<p class="text-xs text-muted-foreground">{description.length}/2000 caracteres</p>
			</div>

			<!-- Type and Duration row -->
			<div class="grid gap-4 md:grid-cols-2">
				<!-- Type -->
				<div class="space-y-2">
					<Label>Type</Label>
					<MySelect items={WORKSHEET_TYPE_OPTIONS} bind:value={worksheetType} />
				</div>

				<!-- Estimated duration -->
				<div class="space-y-2">
					<Label for="duration">Duree estimee (minutes)</Label>
					<Input
						id="duration"
						type="number"
						placeholder="Ex: 45"
						min={0}
						max={600}
						bind:value={estimatedDuration}
						oninput={() => clearError('estimated_duration_minutes')}
						class={errors.estimated_duration_minutes ? 'border-destructive' : ''}
					/>
					{#if errors.estimated_duration_minutes}
						<p class="text-sm text-destructive">{errors.estimated_duration_minutes}</p>
					{/if}
				</div>
			</div>

			<!-- Grade levels -->
			<div class="space-y-2">
				<Label>Niveaux scolaires</Label>
				<GradeBadgeSelector bind:value={selectedGrades} placeholder="Selectionner les niveaux" />
				{#if errors.grade_levels}
					<p class="text-sm text-destructive">{errors.grade_levels}</p>
				{/if}
			</div>

			<!-- Tags -->
			<div class="space-y-2">
				<Label>Tags</Label>
				<TagBadgeSelector
					bind:value={selectedTags}
					placeholder="Ajouter des tags"
					maxSelections={10}
				/>
				{#if errors.tags}
					<p class="text-sm text-destructive">{errors.tags}</p>
				{/if}
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Config options (collapsible) -->
	<Card.Root>
		<Collapsible.Root bind:open={configOpen}>
			<Card.Header class="cursor-pointer" onclick={() => (configOpen = !configOpen)}>
				<div class="flex items-center justify-between">
					<Card.Title>Options d'affichage</Card.Title>
					<Collapsible.Trigger asChild>
						<Button variant="ghost" size="icon" class="h-8 w-8">
							{#if configOpen}
								<ChevronUp class="h-4 w-4" />
							{:else}
								<ChevronDown class="h-4 w-4" />
							{/if}
						</Button>
					</Collapsible.Trigger>
				</div>
				<Card.Description>Configurez l'apparence et le comportement de la feuille</Card.Description>
			</Card.Header>
			<Collapsible.Content>
				<Card.Content class="space-y-6 border-t pt-6">
					<!-- Display options -->
					<div class="space-y-4">
						<h4 class="text-sm font-medium">Elements affiches</h4>
						<div class="grid gap-4 sm:grid-cols-2">
							<MyCheckbox bind:checked={showTitle} label="Afficher le titre" />
							<MyCheckbox bind:checked={showDate} label="Afficher la date" />
							<MyCheckbox bind:checked={showStudentName} label="Nom de l'eleve" />
							<MyCheckbox bind:checked={showClass} label="Classe" />
							<MyCheckbox bind:checked={showPoints} label="Points par exercice" />
						</div>
					</div>

					<!-- Numbering and layout -->
					<div class="grid gap-4 sm:grid-cols-2">
						<div class="space-y-2">
							<Label>Numerotation</Label>
							<MySelect items={NUMBERING_STYLE_OPTIONS} bind:value={numberingStyle} />
						</div>
						<div class="space-y-2">
							<Label>Format de page</Label>
							<MySelect items={PAGE_LAYOUT_OPTIONS} bind:value={pageLayout} />
						</div>
					</div>

					<!-- Shuffle options -->
					<div class="space-y-4">
						<h4 class="text-sm font-medium">Options de melange</h4>
						<div class="grid gap-4 sm:grid-cols-2">
							<MyCheckbox bind:checked={shuffleExercises} label="Melanger les exercices" />
							<MyCheckbox bind:checked={shuffleWithinSections} label="Melanger dans les sections" />
						</div>
					</div>
				</Card.Content>
			</Collapsible.Content>
		</Collapsible.Root>
	</Card.Root>

	<!-- Actions -->
	<div class="flex justify-end gap-3">
		<Button variant="outline" type="button" onclick={onCancel} disabled={saving}>
			<X class="mr-2 h-4 w-4" />
			Annuler
		</Button>
		<Button type="submit" disabled={!isValid || saving}>
			{#if saving}
				<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				Enregistrement...
			{:else}
				<Save class="mr-2 h-4 w-4" />
				Enregistrer
			{/if}
		</Button>
	</div>
</form>
