<!--
	MetadataCards Component
	=======================

	Displays worksheet metadata in inline-editable cards format.
	All editable fields are in a single card with a subtle floating save button.
	Click to edit fields, ESC to cancel current field, X per field to cancel that field.

	Usage:
	```svelte
	<script lang="ts">
	  import MetadataCards from '$lib/components/worksheets/MetadataCards.svelte';

	  async function handleSave(field: string, value: unknown) {
	    // Save field to database
	  }
	</script>

	<MetadataCards {worksheet} {onSave} />
	```
-->
<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import MySelect from '$lib/components/MySelect.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import GradeBadgeSelector from '$lib/components/GradeBadgeSelector.svelte';
	import TagBadgeSelector from '$lib/components/TagBadgeSelector.svelte';
	import { Loader2, Check, X, Settings } from 'lucide-svelte';
	import {
		WORKSHEET_TYPE_LABELS,
		WORKSHEET_TYPE_OPTIONS,
		formatDuration
	} from '$lib/utils/worksheet-constants';
	import { formatGradeShort } from '$lib/utils/grades';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { WorksheetWithRelations, WorksheetConfig } from '$lib/types/worksheets';
	import type { GradeCode } from '$lib/types/grades';

	// Template type for the selector
	interface TemplateOption {
		id: string;
		name: string;
		description: string | null;
	}

	// Props
	interface Props {
		worksheet: WorksheetWithRelations;
		templates?: TemplateOption[];
		onSave?: (field: string, value: unknown) => Promise<void>;
	}

	let { worksheet, templates = [], onSave }: Props = $props();

	// Per-field editing flags for info card
	let editingTitle = $state(false);
	let editingDescription = $state(false);
	let editingType = $state(false);
	let editingTemplate = $state(false);
	let editingDuration = $state(false);
	let editingGrades = $state(false);
	let editingTags = $state(false);

	// Global saving state
	let isSaving = $state(false);

	// Temporary values for editing info fields
	let tempTitle = $state(worksheet.title || '');
	let tempDescription = $state(worksheet.description || '');
	let tempType = $state<string | undefined>(worksheet.type || undefined);
	let tempTemplateId = $state<string | undefined>(worksheet.template_id || undefined);
	let tempDuration = $state<number | null>(worksheet.estimated_duration_minutes);
	let tempGrades = $state<GradeCode[]>((worksheet.grade_levels as GradeCode[]) || []);
	let tempTags = $state<string[]>(worksheet.tags || []);

	// Config editing state
	let editingConfig = $state(false);

	// Temporary values for config options (initialize from worksheet.config)
	let tempShowTitle = $state(worksheet.config?.show_title ?? true);
	let tempShowDate = $state(worksheet.config?.show_date ?? true);
	let tempShowStudentName = $state(worksheet.config?.show_student_name ?? true);
	let tempShowClass = $state(worksheet.config?.show_class ?? true);
	let tempShowPoints = $state(worksheet.config?.show_points ?? true);
	let tempNumberingStyle = $state<string>(worksheet.config?.numbering_style ?? 'numeric');
	let tempPageLayout = $state<string>(worksheet.config?.page_layout ?? 'A4');
	let tempShuffleExercises = $state(worksheet.config?.shuffle_exercises ?? false);
	let tempShuffleWithinSections = $state(worksheet.config?.shuffle_within_sections ?? false);

	// Per-field change detection for info
	let titleChanged = $derived(tempTitle !== (worksheet.title || ''));
	let descriptionChanged = $derived(tempDescription !== (worksheet.description || ''));
	let typeChanged = $derived(tempType !== (worksheet.type || undefined));
	let templateChanged = $derived(tempTemplateId !== (worksheet.template_id || undefined));
	let durationChanged = $derived(tempDuration !== worksheet.estimated_duration_minutes);
	let gradesChanged = $derived(
		JSON.stringify(tempGrades.sort()) !==
			JSON.stringify(((worksheet.grade_levels as GradeCode[]) || []).sort())
	);
	let tagsChanged = $derived(
		JSON.stringify(tempTags.sort()) !== JSON.stringify((worksheet.tags || []).sort())
	);

	// Config change detection
	let configChanged = $derived(
		tempShowTitle !== (worksheet.config?.show_title ?? true) ||
			tempShowDate !== (worksheet.config?.show_date ?? true) ||
			tempShowStudentName !== (worksheet.config?.show_student_name ?? true) ||
			tempShowClass !== (worksheet.config?.show_class ?? true) ||
			tempShowPoints !== (worksheet.config?.show_points ?? true) ||
			tempNumberingStyle !== (worksheet.config?.numbering_style ?? 'numeric') ||
			tempPageLayout !== (worksheet.config?.page_layout ?? 'A4') ||
			tempShuffleExercises !== (worksheet.config?.shuffle_exercises ?? false) ||
			tempShuffleWithinSections !== (worksheet.config?.shuffle_within_sections ?? false)
	);

	// Global change detection (for showing save button)
	let hasChanges = $derived(
		titleChanged ||
			descriptionChanged ||
			typeChanged ||
			templateChanged ||
			durationChanged ||
			gradesChanged ||
			tagsChanged ||
			configChanged
	);

	// Global save function - saves all modified fields
	async function handleSave() {
		if (!onSave || isSaving || !hasChanges) return;
		isSaving = true;

		try {
			// Save each modified field
			const savePromises: Promise<void>[] = [];

			if (titleChanged) {
				savePromises.push(onSave('title', tempTitle.trim()));
			}
			if (descriptionChanged) {
				savePromises.push(onSave('description', tempDescription.trim() || null));
			}
			if (typeChanged) {
				savePromises.push(onSave('type', tempType || null));
			}
			if (templateChanged) {
				savePromises.push(onSave('template_id', tempTemplateId || null));
			}
			if (durationChanged) {
				savePromises.push(onSave('estimated_duration_minutes', tempDuration));
			}
			if (gradesChanged) {
				savePromises.push(onSave('grade_levels', tempGrades));
			}
			if (tagsChanged) {
				savePromises.push(onSave('tags', tempTags));
			}
			if (configChanged) {
				const newConfig: WorksheetConfig = {
					...worksheet.config,
					show_title: tempShowTitle,
					show_date: tempShowDate,
					show_student_name: tempShowStudentName,
					show_class: tempShowClass,
					show_points: tempShowPoints,
					numbering_style: tempNumberingStyle as 'numeric' | 'alphabetic' | 'roman',
					page_layout: tempPageLayout as 'A4' | 'Letter',
					shuffle_exercises: tempShuffleExercises,
					shuffle_within_sections: tempShuffleWithinSections
				};
				savePromises.push(onSave('config', newConfig));
			}

			// Execute all saves in parallel
			await Promise.all(savePromises);

			// Close all editing modes on success
			closeAllEditing();
		} catch (error) {
			console.error('Save failed:', error);
			toaster.error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde');
		} finally {
			isSaving = false;
		}
	}

	// Close all editing modes (without resetting values)
	function closeAllEditing() {
		editingTitle = false;
		editingDescription = false;
		editingType = false;
		editingTemplate = false;
		editingDuration = false;
		editingGrades = false;
		editingTags = false;
		editingConfig = false;
	}

	// Cancel all edits and restore original values
	function cancelAllEdits() {
		cancelTitle();
		cancelDescription();
		cancelType();
		cancelTemplate();
		cancelDuration();
		cancelGrades();
		cancelTags();
	}

	// Cancel all config edits
	function cancelAllConfigEdits() {
		tempShowTitle = worksheet.config?.show_title ?? true;
		tempShowDate = worksheet.config?.show_date ?? true;
		tempShowStudentName = worksheet.config?.show_student_name ?? true;
		tempShowClass = worksheet.config?.show_class ?? true;
		tempShowPoints = worksheet.config?.show_points ?? true;
		tempNumberingStyle = worksheet.config?.numbering_style ?? 'numeric';
		tempPageLayout = worksheet.config?.page_layout ?? 'A4';
		tempShuffleExercises = worksheet.config?.shuffle_exercises ?? false;
		tempShuffleWithinSections = worksheet.config?.shuffle_within_sections ?? false;
		editingConfig = false;
	}

	// Per-field cancel functions (reset value + close editing)
	function cancelTitle() {
		tempTitle = worksheet.title || '';
		editingTitle = false;
	}

	function cancelDescription() {
		tempDescription = worksheet.description || '';
		editingDescription = false;
	}

	function cancelType() {
		tempType = worksheet.type || undefined;
		editingType = false;
	}

	function cancelTemplate() {
		tempTemplateId = worksheet.template_id || undefined;
		editingTemplate = false;
	}

	function cancelDuration() {
		tempDuration = worksheet.estimated_duration_minutes;
		editingDuration = false;
	}

	function cancelGrades() {
		tempGrades = (worksheet.grade_levels as GradeCode[]) || [];
		editingGrades = false;
	}

	function cancelTags() {
		tempTags = worksheet.tags || [];
		editingTags = false;
	}

	// Start editing functions (initialize temp values)
	function startEditTitle() {
		if (!onSave) return;
		tempTitle = worksheet.title || '';
		editingTitle = true;
	}

	function startEditDescription() {
		if (!onSave) return;
		tempDescription = worksheet.description || '';
		editingDescription = true;
	}

	function startEditType() {
		if (!onSave) return;
		tempType = worksheet.type || undefined;
		editingType = true;
	}

	function startEditTemplate() {
		if (!onSave || templates.length === 0) return;
		tempTemplateId = worksheet.template_id || undefined;
		editingTemplate = true;
	}

	function startEditDuration() {
		if (!onSave) return;
		tempDuration = worksheet.estimated_duration_minutes;
		editingDuration = true;
	}

	function startEditGrades() {
		if (!onSave) return;
		tempGrades = (worksheet.grade_levels as GradeCode[]) || [];
		editingGrades = true;
	}

	function startEditTags() {
		if (!onSave) return;
		tempTags = worksheet.tags || [];
		editingTags = true;
	}

	function startEditConfig() {
		if (!onSave) return;
		// Initialize temp values from current config
		tempShowTitle = worksheet.config?.show_title ?? true;
		tempShowDate = worksheet.config?.show_date ?? true;
		tempShowStudentName = worksheet.config?.show_student_name ?? true;
		tempShowClass = worksheet.config?.show_class ?? true;
		tempShowPoints = worksheet.config?.show_points ?? true;
		tempNumberingStyle = worksheet.config?.numbering_style ?? 'numeric';
		tempPageLayout = worksheet.config?.page_layout ?? 'A4';
		tempShuffleExercises = worksheet.config?.shuffle_exercises ?? false;
		tempShuffleWithinSections = worksheet.config?.shuffle_within_sections ?? false;
		editingConfig = true;
	}

	// Per-field ESC handlers (cancel only the current field)
	function handleKeydownTitle(e: KeyboardEvent) {
		if (e.key === 'Escape') cancelTitle();
	}

	function handleKeydownDescription(e: KeyboardEvent) {
		if (e.key === 'Escape') cancelDescription();
	}

	function handleKeydownDuration(e: KeyboardEvent) {
		if (e.key === 'Escape') cancelDuration();
	}

	// Type options for MySelect (convert to mutable array)
	const typeOptions = [...WORKSHEET_TYPE_OPTIONS] as { value: string; label: string }[];

	// Template options for MySelect
	let templateOptions = $derived(templates.map((t) => ({ value: t.id, label: t.name })));

	// Helper to get template name by ID
	function getTemplateName(templateId: string | null | undefined): string {
		if (!templateId) return '-';
		// First check in templates prop
		const template = templates.find((t) => t.id === templateId);
		if (template) return template.name;
		// Then check in worksheet.template (for pre-loaded template)
		if (worksheet.template?.name) return worksheet.template.name;
		// Fallback: show the ID if it looks like a default template ID
		if (!templateId.includes('-')) return templateId.charAt(0).toUpperCase() + templateId.slice(1);
		return '-';
	}

	// Select options for config
	const numberingOptions = [
		{ value: 'numeric', label: 'Numerique (1, 2, 3)' },
		{ value: 'alphabetic', label: 'Alphabetique (a, b, c)' },
		{ value: 'roman', label: 'Romain (i, ii, iii)' }
	];

	const layoutOptions = [
		{ value: 'A4', label: 'A4' },
		{ value: 'Letter', label: 'Letter' }
	];

	// Helper to get display label for numbering style
	function getNumberingLabel(value: string): string {
		return numberingOptions.find((o) => o.value === value)?.label ?? value;
	}

	// Helper to get display label for page layout
	function getLayoutLabel(value: string): string {
		return layoutOptions.find((o) => o.value === value)?.label ?? value;
	}
</script>

<div class="space-y-4">
	<!-- Information card -->
	<Card.Root class="relative">
		<!-- Floating save button (appears when changes detected) -->
		{#if hasChanges && onSave && !isSaving}
			<button
				type="button"
				class="absolute top-3 right-3 z-10 rounded-full bg-green-500 p-2 text-white shadow-lg transition-all hover:scale-110 hover:bg-green-600 active:scale-95"
				onclick={handleSave}
				aria-label="Enregistrer les modifications"
			>
				<Check class="h-4 w-4" />
			</button>
		{/if}

		<Card.Header>
			<div class="flex items-center gap-2">
				<Card.Title class="text-lg">Informations</Card.Title>
				<!-- Global cancel/loading indicator next to title -->
				{#if hasChanges && onSave}
					{#if isSaving}
						<Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
					{:else}
						<button
							type="button"
							class="rounded-full p-1 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
							onclick={cancelAllEdits}
							aria-label="Annuler toutes les modifications"
						>
							<X class="h-4 w-4" />
						</button>
					{/if}
				{/if}
			</div>
		</Card.Header>
		<Card.Content class="space-y-3">
			<!-- Title -->
			<div>
				<div class="flex items-center gap-1">
					<p class="text-xs text-muted-foreground">Titre</p>
					{#if titleChanged}
						<button
							type="button"
							class="rounded-full p-0.5 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
							onclick={cancelTitle}
							aria-label="Annuler la modification du titre"
						>
							<X class="h-3 w-3" />
						</button>
					{/if}
				</div>
				{#if !editingTitle}
					<button
						type="button"
						class="w-full text-left font-semibold {onSave
							? 'cursor-pointer hover:text-primary'
							: 'cursor-default'}"
						onclick={startEditTitle}
						disabled={!onSave}
					>
						{worksheet.title || '-'}
					</button>
				{:else}
					<Input
						bind:value={tempTitle}
						class="w-full"
						placeholder="Titre de la feuille"
						onkeydown={handleKeydownTitle}
					/>
				{/if}
			</div>

			<!-- Description -->
			{#if worksheet.description || editingDescription}
				<div>
					<div class="flex items-center gap-1">
						<p class="text-xs text-muted-foreground">Description</p>
						{#if descriptionChanged}
							<button
								type="button"
								class="rounded-full p-0.5 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
								onclick={cancelDescription}
								aria-label="Annuler la modification de la description"
							>
								<X class="h-3 w-3" />
							</button>
						{/if}
					</div>
					{#if !editingDescription}
						<button
							type="button"
							class="w-full text-left text-sm whitespace-pre-wrap text-muted-foreground {onSave
								? 'cursor-pointer hover:text-primary'
								: 'cursor-default'}"
							onclick={startEditDescription}
							disabled={!onSave}
						>
							{worksheet.description}
						</button>
					{:else}
						<Textarea
							bind:value={tempDescription}
							class="min-h-[60px] w-full"
							placeholder="Description de la feuille..."
							onkeydown={handleKeydownDescription}
						/>
					{/if}
				</div>
			{/if}

			<Separator />

			<!-- Type, Template, Duration - compact row -->
			<div class="grid grid-cols-3 gap-4">
				<!-- Type -->
				<div>
					<div class="flex items-center gap-1">
						<p class="text-xs text-muted-foreground">Type</p>
						{#if typeChanged}
							<button
								type="button"
								class="rounded-full p-0.5 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
								onclick={cancelType}
								aria-label="Annuler la modification du type"
							>
								<X class="h-3 w-3" />
							</button>
						{/if}
					</div>
					{#if !editingType}
						<button
							type="button"
							class="text-left text-sm font-medium {onSave
								? 'cursor-pointer hover:text-primary'
								: 'cursor-default'}"
							onclick={startEditType}
							disabled={!onSave}
						>
							{worksheet.type ? WORKSHEET_TYPE_LABELS[worksheet.type] : '-'}
						</button>
					{:else}
						<MySelect type="single" bind:value={tempType} items={typeOptions} placeholder="Type" />
					{/if}
				</div>

				<!-- Template -->
				<div>
					<div class="flex items-center gap-1">
						<p class="text-xs text-muted-foreground">Template</p>
						{#if templateChanged}
							<button
								type="button"
								class="rounded-full p-0.5 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
								onclick={cancelTemplate}
								aria-label="Annuler la modification du template"
							>
								<X class="h-3 w-3" />
							</button>
						{/if}
					</div>
					{#if !editingTemplate}
						<button
							type="button"
							class="text-left text-sm font-medium {onSave && templates.length > 0
								? 'cursor-pointer hover:text-primary'
								: 'cursor-default'}"
							onclick={startEditTemplate}
							disabled={!onSave || templates.length === 0}
						>
							{getTemplateName(worksheet.template_id)}
						</button>
					{:else}
						<MySelect
							type="single"
							bind:value={tempTemplateId}
							items={templateOptions}
							placeholder="Template"
						/>
					{/if}
				</div>

				<!-- Duration -->
				<div>
					<div class="flex items-center gap-1">
						<p class="text-xs text-muted-foreground">Duree</p>
						{#if durationChanged}
							<button
								type="button"
								class="rounded-full p-0.5 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
								onclick={cancelDuration}
								aria-label="Annuler la modification de la duree"
							>
								<X class="h-3 w-3" />
							</button>
						{/if}
					</div>
					{#if !editingDuration}
						<button
							type="button"
							class="text-left text-sm font-medium {onSave
								? 'cursor-pointer hover:text-primary'
								: 'cursor-default'}"
							onclick={startEditDuration}
							disabled={!onSave}
						>
							{formatDuration(worksheet.estimated_duration_minutes)}
						</button>
					{:else}
						<div class="flex items-center gap-1">
							<Input
								type="number"
								bind:value={tempDuration}
								class="h-8 w-16"
								min={0}
								max={480}
								placeholder="min"
								onkeydown={handleKeydownDuration}
							/>
							<span class="text-xs text-muted-foreground">min</span>
						</div>
					{/if}
				</div>
			</div>

			<Separator />

			<!-- Grade levels and Tags - compact row -->
			<div class="grid grid-cols-2 gap-4">
				<!-- Grade levels -->
				<div>
					<div class="flex items-center gap-1">
						<p class="text-xs text-muted-foreground">Niveaux</p>
						{#if gradesChanged}
							<button
								type="button"
								class="rounded-full p-0.5 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
								onclick={cancelGrades}
								aria-label="Annuler la modification des niveaux"
							>
								<X class="h-3 w-3" />
							</button>
						{/if}
					</div>
					{#if !editingGrades}
						<button
							type="button"
							class="w-full text-left {onSave
								? 'cursor-pointer hover:text-primary'
								: 'cursor-default'}"
							onclick={startEditGrades}
							disabled={!onSave}
						>
							{#if worksheet.grade_levels && worksheet.grade_levels.length > 0}
								<div class="flex flex-wrap gap-1">
									{#each worksheet.grade_levels as grade, i (i)}
										<Badge variant="outline" class="text-xs">
											{formatGradeShort(String(grade) as GradeCode)}
										</Badge>
									{/each}
								</div>
							{:else}
								<span class="text-sm font-medium">-</span>
							{/if}
						</button>
					{:else}
						<GradeBadgeSelector bind:value={tempGrades} />
					{/if}
				</div>

				<!-- Tags -->
				<div>
					<div class="flex items-center gap-1">
						<p class="text-xs text-muted-foreground">Tags</p>
						{#if tagsChanged}
							<button
								type="button"
								class="rounded-full p-0.5 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
								onclick={cancelTags}
								aria-label="Annuler la modification des tags"
							>
								<X class="h-3 w-3" />
							</button>
						{/if}
					</div>
					{#if !editingTags}
						<button
							type="button"
							class="w-full text-left {onSave
								? 'cursor-pointer hover:text-primary'
								: 'cursor-default'}"
							onclick={startEditTags}
							disabled={!onSave}
						>
							{#if worksheet.tags && worksheet.tags.length > 0}
								<div class="flex flex-wrap gap-1">
									{#each worksheet.tags as tag (tag)}
										<Badge variant="secondary" class="text-xs">{tag}</Badge>
									{/each}
								</div>
							{:else}
								<span class="text-sm font-medium">-</span>
							{/if}
						</button>
					{:else}
						<TagBadgeSelector bind:value={tempTags} />
					{/if}
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Options d'affichage card -->
	<Card.Root class="relative">
		<!-- Floating save button (appears when changes detected, same as info card) -->
		{#if hasChanges && onSave && !isSaving}
			<button
				type="button"
				class="absolute top-3 right-3 z-10 rounded-full bg-green-500 p-2 text-white shadow-lg transition-all hover:scale-110 hover:bg-green-600 active:scale-95"
				onclick={handleSave}
				aria-label="Enregistrer les modifications"
			>
				<Check class="h-4 w-4" />
			</button>
		{/if}

		<Card.Header>
			<div class="flex items-center gap-2">
				<Settings class="h-5 w-5 text-muted-foreground" />
				<Card.Title class="text-lg">Options d'affichage</Card.Title>
				<!-- Cancel/loading indicator next to title -->
				{#if configChanged && onSave}
					{#if isSaving}
						<Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
					{:else}
						<button
							type="button"
							class="rounded-full p-1 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
							onclick={cancelAllConfigEdits}
							aria-label="Annuler les modifications d'affichage"
						>
							<X class="h-4 w-4" />
						</button>
					{/if}
				{/if}
			</div>
		</Card.Header>
		<Card.Content>
			{#if !editingConfig}
				<!-- Display mode: show current config values -->
				<button
					type="button"
					class="w-full text-left {onSave ? 'cursor-pointer' : 'cursor-default'}"
					onclick={startEditConfig}
					disabled={!onSave}
				>
					<div class="space-y-6">
						<!-- Elements affiches section -->
						<div class="space-y-2">
							<h4 class="text-sm font-medium text-muted-foreground">Elements affiches</h4>
							<div class="flex flex-wrap gap-2">
								{#if worksheet.config?.show_title ?? true}
									<Badge variant="secondary">Titre</Badge>
								{/if}
								{#if worksheet.config?.show_date ?? true}
									<Badge variant="secondary">Date</Badge>
								{/if}
								{#if worksheet.config?.show_student_name ?? true}
									<Badge variant="secondary">Nom</Badge>
								{/if}
								{#if worksheet.config?.show_class ?? true}
									<Badge variant="secondary">Classe</Badge>
								{/if}
								{#if worksheet.config?.show_points ?? true}
									<Badge variant="secondary">Points</Badge>
								{/if}
								{#if !(worksheet.config?.show_title ?? true) && !(worksheet.config?.show_date ?? true) && !(worksheet.config?.show_student_name ?? true) && !(worksheet.config?.show_class ?? true) && !(worksheet.config?.show_points ?? true)}
									<span class="text-sm text-muted-foreground/50 italic">Aucun element</span>
								{/if}
							</div>
						</div>

						<!-- Mise en page section -->
						<div class="space-y-2">
							<h4 class="text-sm font-medium text-muted-foreground">Mise en page</h4>
							<div class="flex flex-wrap gap-4 text-sm">
								<span>
									<span class="text-muted-foreground">Numerotation:</span>
									<span class="font-medium">
										{getNumberingLabel(worksheet.config?.numbering_style ?? 'numeric')}
									</span>
								</span>
								<span>
									<span class="text-muted-foreground">Format:</span>
									<span class="font-medium">
										{getLayoutLabel(worksheet.config?.page_layout ?? 'A4')}
									</span>
								</span>
							</div>
						</div>

						<!-- Options de melange section -->
						<div class="space-y-2">
							<h4 class="text-sm font-medium text-muted-foreground">Options de melange</h4>
							<div class="flex flex-wrap gap-2">
								{#if worksheet.config?.shuffle_exercises}
									<Badge variant="outline">Exercices melanges</Badge>
								{/if}
								{#if worksheet.config?.shuffle_within_sections}
									<Badge variant="outline">Sections melangees</Badge>
								{/if}
								{#if !worksheet.config?.shuffle_exercises && !worksheet.config?.shuffle_within_sections}
									<span class="text-sm text-muted-foreground/50 italic">Aucun melange</span>
								{/if}
							</div>
						</div>
					</div>

					{#if onSave}
						<p class="mt-4 text-xs text-muted-foreground/60 italic">Cliquer pour modifier</p>
					{/if}
				</button>
			{:else}
				<!-- Edit mode: show checkboxes and selects -->
				<div class="space-y-6">
					<!-- Elements affiches section -->
					<div class="space-y-4">
						<h4 class="text-sm font-medium">Elements affiches</h4>
						<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
							<MyCheckbox bind:checked={tempShowTitle} label="Afficher le titre" />
							<MyCheckbox bind:checked={tempShowDate} label="Afficher la date" />
							<MyCheckbox bind:checked={tempShowStudentName} label="Nom de l'eleve" />
							<MyCheckbox bind:checked={tempShowClass} label="Classe" />
							<MyCheckbox bind:checked={tempShowPoints} label="Points par exercice" />
						</div>
					</div>

					<Separator />

					<!-- Mise en page section -->
					<div class="space-y-4">
						<h4 class="text-sm font-medium">Mise en page</h4>
						<div class="grid gap-4 sm:grid-cols-2">
							<div class="space-y-2">
								<p class="text-xs text-muted-foreground">Numerotation</p>
								<MySelect
									bind:value={tempNumberingStyle}
									items={numberingOptions}
									placeholder="Style de numerotation"
								/>
							</div>
							<div class="space-y-2">
								<p class="text-xs text-muted-foreground">Format de page</p>
								<MySelect
									bind:value={tempPageLayout}
									items={layoutOptions}
									placeholder="Format de page"
								/>
							</div>
						</div>
					</div>

					<Separator />

					<!-- Options de melange section -->
					<div class="space-y-4">
						<h4 class="text-sm font-medium">Options de melange</h4>
						<div class="grid gap-4 sm:grid-cols-2">
							<MyCheckbox bind:checked={tempShuffleExercises} label="Melanger les exercices" />
							<MyCheckbox
								bind:checked={tempShuffleWithinSections}
								label="Melanger dans les sections"
							/>
						</div>
					</div>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
