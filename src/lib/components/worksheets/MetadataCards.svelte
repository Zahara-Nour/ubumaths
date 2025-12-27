<!--
	MetadataCards Component
	=======================

	Displays worksheet metadata in inline-editable cards format.
	Uses controlled component pattern - all state is managed by parent.

	Usage:
	```svelte
	<MetadataCards
		{worksheet}
		{hasPendingChanges}
		onFieldChange={(field, value) => pendingChanges[field] = value}
		onSave={handleSave}
		onCancel={() => pendingChanges = {}}
	/>
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

	// Props - controlled component pattern
	interface Props {
		worksheet: WorksheetWithRelations; // Already merged with pending changes
		templates?: TemplateOption[];
		hasPendingChanges?: boolean;
		onFieldChange?: (field: string, value: unknown) => void;
		onSave?: () => Promise<void>;
		onCancel?: () => void;
	}

	let {
		worksheet,
		templates = [],
		hasPendingChanges = false,
		onFieldChange,
		onSave,
		onCancel
	}: Props = $props();

	// Editing mode flags only (no temp values!)
	let editingTitle = $state(false);
	let editingDescription = $state(false);
	let editingType = $state(false);
	let editingTemplate = $state(false);
	let editingDuration = $state(false);
	let editingGrades = $state(false);
	let editingTags = $state(false);
	let editingConfig = $state(false);

	// Saving state
	let isSaving = $state(false);

	// Check if editable
	let isEditable = $derived(!!onFieldChange);

	// Handle save - just call parent's save function
	async function handleSave() {
		if (!onSave || isSaving || !hasPendingChanges) return;
		isSaving = true;

		try {
			await onSave();
			closeAllEditing();
		} catch (error) {
			console.error('Save failed:', error);
			toaster.error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde');
		} finally {
			isSaving = false;
		}
	}

	// Close all editing modes
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

	// Cancel all edits - calls parent's cancel
	function handleCancelAll() {
		if (onCancel) onCancel();
		closeAllEditing();
	}

	// Field change handler with config support
	function handleConfigChange(configField: string, value: unknown) {
		if (!onFieldChange) return;
		const newConfig: WorksheetConfig = {
			...worksheet.config,
			[configField]: value
		};
		onFieldChange('config', newConfig);
	}

	// Start editing functions
	function startEdit(field: string) {
		if (!isEditable) return;
		switch (field) {
			case 'title':
				editingTitle = true;
				break;
			case 'description':
				editingDescription = true;
				break;
			case 'type':
				editingType = true;
				break;
			case 'template':
				if (templates.length > 0) editingTemplate = true;
				break;
			case 'duration':
				editingDuration = true;
				break;
			case 'grades':
				editingGrades = true;
				break;
			case 'tags':
				editingTags = true;
				break;
			case 'config':
				editingConfig = true;
				break;
		}
	}

	// ESC handler
	function handleKeydown(e: KeyboardEvent, field: string) {
		if (e.key === 'Escape') {
			switch (field) {
				case 'title':
					editingTitle = false;
					break;
				case 'description':
					editingDescription = false;
					break;
				case 'duration':
					editingDuration = false;
					break;
			}
		}
	}

	// Type options for MySelect
	const typeOptions = [...WORKSHEET_TYPE_OPTIONS] as { value: string; label: string }[];

	// Template options for MySelect
	let templateOptions = $derived(templates.map((t) => ({ value: t.id, label: t.name })));

	// Helper to get template name by ID
	function getTemplateName(templateId: string | null | undefined): string {
		if (!templateId) return '-';
		const template = templates.find((t) => t.id === templateId);
		if (template) return template.name;
		if (worksheet.template?.name) return worksheet.template.name;
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

	function getNumberingLabel(value: string): string {
		return numberingOptions.find((o) => o.value === value)?.label ?? value;
	}

	function getLayoutLabel(value: string): string {
		return layoutOptions.find((o) => o.value === value)?.label ?? value;
	}
</script>

<div class="space-y-4">
	<!-- Information card -->
	<Card.Root class="relative">
		<!-- Floating save button -->
		{#if hasPendingChanges && isEditable && !isSaving}
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
				{#if hasPendingChanges && isEditable}
					{#if isSaving}
						<Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
					{:else}
						<button
							type="button"
							class="rounded-full p-1 text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
							onclick={handleCancelAll}
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
				<p class="text-xs text-muted-foreground">Titre</p>
				{#if !editingTitle}
					<button
						type="button"
						class="w-full text-left font-semibold {isEditable
							? 'cursor-pointer hover:text-primary'
							: 'cursor-default'}"
						onclick={() => startEdit('title')}
						disabled={!isEditable}
					>
						{worksheet.title || '-'}
					</button>
				{:else}
					<Input
						value={worksheet.title || ''}
						oninput={(e) => onFieldChange?.('title', e.currentTarget.value)}
						class="w-full"
						placeholder="Titre de la feuille"
						onkeydown={(e) => handleKeydown(e, 'title')}
					/>
				{/if}
			</div>

			<!-- Description -->
			{#if worksheet.description || editingDescription}
				<div>
					<p class="text-xs text-muted-foreground">Description</p>
					{#if !editingDescription}
						<button
							type="button"
							class="w-full text-left text-sm whitespace-pre-wrap text-muted-foreground {isEditable
								? 'cursor-pointer hover:text-primary'
								: 'cursor-default'}"
							onclick={() => startEdit('description')}
							disabled={!isEditable}
						>
							{worksheet.description}
						</button>
					{:else}
						<Textarea
							value={worksheet.description || ''}
							oninput={(e) => onFieldChange?.('description', e.currentTarget.value || null)}
							class="min-h-[60px] w-full"
							placeholder="Description de la feuille..."
							onkeydown={(e) => handleKeydown(e, 'description')}
						/>
					{/if}
				</div>
			{/if}

			<Separator />

			<!-- Type, Template, Duration - compact row -->
			<div class="grid grid-cols-3 gap-4">
				<!-- Type -->
				<div>
					<p class="text-xs text-muted-foreground">Type</p>
					{#if !editingType}
						<button
							type="button"
							class="text-left text-sm font-medium {isEditable
								? 'cursor-pointer hover:text-primary'
								: 'cursor-default'}"
							onclick={() => startEdit('type')}
							disabled={!isEditable}
						>
							{worksheet.type ? WORKSHEET_TYPE_LABELS[worksheet.type] : '-'}
						</button>
					{:else}
						<MySelect
							type="single"
							value={worksheet.type || undefined}
							onchange={(v) => onFieldChange?.('type', v || null)}
							items={typeOptions}
							placeholder="Type"
						/>
					{/if}
				</div>

				<!-- Template -->
				<div>
					<p class="text-xs text-muted-foreground">Template</p>
					{#if !editingTemplate}
						<button
							type="button"
							class="text-left text-sm font-medium {isEditable && templates.length > 0
								? 'cursor-pointer hover:text-primary'
								: 'cursor-default'}"
							onclick={() => startEdit('template')}
							disabled={!isEditable || templates.length === 0}
						>
							{getTemplateName(worksheet.template_id)}
						</button>
					{:else}
						<MySelect
							type="single"
							value={worksheet.template_id || undefined}
							onchange={(v) => onFieldChange?.('template_id', v || null)}
							items={templateOptions}
							placeholder="Template"
						/>
					{/if}
				</div>

				<!-- Duration -->
				<div>
					<p class="text-xs text-muted-foreground">Duree</p>
					{#if !editingDuration}
						<button
							type="button"
							class="text-left text-sm font-medium {isEditable
								? 'cursor-pointer hover:text-primary'
								: 'cursor-default'}"
							onclick={() => startEdit('duration')}
							disabled={!isEditable}
						>
							{formatDuration(worksheet.estimated_duration_minutes)}
						</button>
					{:else}
						<div class="flex items-center gap-1">
							<Input
								type="number"
								value={worksheet.estimated_duration_minutes ?? ''}
								oninput={(e) => {
									const val = e.currentTarget.value;
									onFieldChange?.('estimated_duration_minutes', val ? Number(val) : null);
								}}
								class="h-8 w-16"
								min={0}
								max={480}
								placeholder="min"
								onkeydown={(e) => handleKeydown(e, 'duration')}
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
					<p class="text-xs text-muted-foreground">Niveaux</p>
					{#if !editingGrades}
						<button
							type="button"
							class="w-full text-left {isEditable
								? 'cursor-pointer hover:text-primary'
								: 'cursor-default'}"
							onclick={() => startEdit('grades')}
							disabled={!isEditable}
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
						<GradeBadgeSelector
							value={(worksheet.grade_levels as GradeCode[]) || []}
							onchange={(v) => onFieldChange?.('grade_levels', v)}
						/>
					{/if}
				</div>

				<!-- Tags -->
				<div>
					<p class="text-xs text-muted-foreground">Tags</p>
					{#if !editingTags}
						<button
							type="button"
							class="w-full text-left {isEditable
								? 'cursor-pointer hover:text-primary'
								: 'cursor-default'}"
							onclick={() => startEdit('tags')}
							disabled={!isEditable}
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
						<TagBadgeSelector
							value={worksheet.tags || []}
							onchange={(v) => onFieldChange?.('tags', v)}
						/>
					{/if}
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Options d'affichage card -->
	<Card.Root class="relative">
		<Card.Header>
			<div class="flex items-center gap-2">
				<Settings class="h-5 w-5 text-muted-foreground" />
				<Card.Title class="text-lg">Options d'affichage</Card.Title>
			</div>
		</Card.Header>
		<Card.Content>
			{#if !editingConfig}
				<!-- Display mode: show current config values -->
				<button
					type="button"
					class="w-full text-left {isEditable ? 'cursor-pointer' : 'cursor-default'}"
					onclick={() => startEdit('config')}
					disabled={!isEditable}
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

					{#if isEditable}
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
							<MyCheckbox
								checked={worksheet.config?.show_title ?? true}
								onchange={(v) => handleConfigChange('show_title', v)}
								label="Afficher le titre"
							/>
							<MyCheckbox
								checked={worksheet.config?.show_date ?? true}
								onchange={(v) => handleConfigChange('show_date', v)}
								label="Afficher la date"
							/>
							<MyCheckbox
								checked={worksheet.config?.show_student_name ?? true}
								onchange={(v) => handleConfigChange('show_student_name', v)}
								label="Nom de l'eleve"
							/>
							<MyCheckbox
								checked={worksheet.config?.show_class ?? true}
								onchange={(v) => handleConfigChange('show_class', v)}
								label="Classe"
							/>
							<MyCheckbox
								checked={worksheet.config?.show_points ?? true}
								onchange={(v) => handleConfigChange('show_points', v)}
								label="Points par exercice"
							/>
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
									value={worksheet.config?.numbering_style ?? 'numeric'}
									onchange={(v) => handleConfigChange('numbering_style', v)}
									items={numberingOptions}
									placeholder="Style de numerotation"
								/>
							</div>
							<div class="space-y-2">
								<p class="text-xs text-muted-foreground">Format de page</p>
								<MySelect
									value={worksheet.config?.page_layout ?? 'A4'}
									onchange={(v) => handleConfigChange('page_layout', v)}
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
							<MyCheckbox
								checked={worksheet.config?.shuffle_exercises ?? false}
								onchange={(v) => handleConfigChange('shuffle_exercises', v)}
								label="Melanger les exercices"
							/>
							<MyCheckbox
								checked={worksheet.config?.shuffle_within_sections ?? false}
								onchange={(v) => handleConfigChange('shuffle_within_sections', v)}
								label="Melanger dans les sections"
							/>
						</div>
					</div>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
