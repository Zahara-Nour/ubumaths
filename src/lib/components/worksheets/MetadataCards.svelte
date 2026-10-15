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
	import { worksheetLocale } from '$lib/types/worksheets';
	import WorksheetTypeOptions from '$lib/components/worksheets/WorksheetTypeOptions.svelte';
	import GradeBadgeSelector from '$lib/components/GradeBadgeSelector.svelte';
	import TagBadgeSelector from '$lib/components/TagBadgeSelector.svelte';
	import { Loader2, Check, X, Settings } from '@lucide/svelte';
	import {
		WORKSHEET_TYPE_LABELS,
		WORKSHEET_TYPE_OPTIONS,
		formatDuration
	} from '$lib/utils/worksheet-constants';
	import { formatGradeShort } from '$lib/utils/grades';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { WorksheetWithRelations, WorksheetConfig } from '$lib/types/worksheets';
	import type { GradeCode } from '$lib/types/grades';
	import {
		BUILT_IN_STYLE_OPTIONS,
		DEFAULT_STYLE_ID,
		styleIdOf,
		type StyleOption
	} from '$lib/typst/templates/styles';

	// Props - controlled component pattern
	interface Props {
		worksheet: WorksheetWithRelations; // Already merged with pending changes
		/** Le menu « Style » : ceux de Chiphre, puis ceux du prof */
		styles?: StyleOption[];
		hasPendingChanges?: boolean;
		onFieldChange?: (field: string, value: unknown) => void;
		onSave?: () => Promise<void>;
		onCancel?: () => void;
	}

	let {
		worksheet,
		styles = BUILT_IN_STYLE_OPTIONS,
		hasPendingChanges = false,
		onFieldChange,
		onSave,
		onCancel
	}: Props = $props();

	// Editing mode flags only (no temp values!)
	let editingTitle = $state(false);
	let editingDescription = $state(false);
	let editingType = $state(false);
	let editingStyle = $state(false);
	let editingLanguage = $state(false);
	let editingDuration = $state(false);
	let editingGrades = $state(false);
	let editingTags = $state(false);

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
		editingStyle = false;
		editingDuration = false;
		editingGrades = false;
		editingTags = false;
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
			case 'style':
				editingStyle = true;
				break;
			case 'language':
				editingLanguage = true;
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
				case 'language':
					editingLanguage = false;
					break;
			}
		}
	}

	/**
	 * English worksheets carry an English title alongside the French one.
	 *
	 * Same contract as the exercise content: French stays the source of truth in
	 * the column, the translation only overrides, and an emptied field removes
	 * itself rather than leaving an empty `translations` behind.
	 */
	const isEnglishWorksheet = $derived(worksheetLocale(worksheet.config) === 'en');

	function handleTitleTranslation(value: string) {
		const trimmed = value.trim();
		const en = { ...worksheet.translations?.en };
		if (trimmed) en.title = value;
		else delete en.title;

		const translations = Object.keys(en).length > 0 ? { en } : null;
		onFieldChange?.('translations', translations);
	}

	// Language the worksheet is rendered in: exercise content and PDF chrome alike
	const languageOptions = [
		{ value: 'fr', label: 'Français' },
		{ value: 'en', label: 'English' }
	];

	// Type options for MySelect
	const typeOptions = [...WORKSHEET_TYPE_OPTIONS] as { value: string; label: string }[];

	// Style options for MySelect
	let styleOptions = $derived(styles.map((s) => ({ value: s.id, label: s.name })));

	// Le style retenu ; absent ou illisible → le style par défaut, comme le PDF
	let chosenStyle = $derived(styles.find((s) => s.id === styleIdOf(worksheet)));
	let defaultStyle = $derived(styles.find((s) => s.id === DEFAULT_STYLE_ID));
	let styleLabel = $derived(
		chosenStyle?.name ?? `${defaultStyle?.name ?? 'Fiche élève'} (par défaut)`
	);
</script>

<!-- Floating action buttons -->
{#if hasPendingChanges && isEditable}
	<div class="mb-3 flex items-center gap-2">
		{#if isSaving}
			<Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
			<span class="text-sm text-muted-foreground">Enregistrement...</span>
		{:else}
			<button
				type="button"
				class="flex items-center gap-1.5 rounded-md bg-green-500 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-green-600 active:scale-95"
				onclick={handleSave}
			>
				<Check class="h-3.5 w-3.5" />
				Enregistrer
			</button>
			<button
				type="button"
				class="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
				onclick={handleCancelAll}
			>
				<X class="h-3.5 w-3.5" />
				Annuler
			</button>
		{/if}
	</div>
{/if}

<div class="grid gap-4 md:grid-cols-2">
	<!-- Information card -->
	<Card.Root>
		<Card.Header class="pb-3">
			<Card.Title class="text-base">Informations</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-3 pt-0">
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

				{#if isEnglishWorksheet}
					<p class="mt-2 text-xs text-muted-foreground">Titre anglais</p>
					<Input
						value={worksheet.translations?.en?.title ?? ''}
						oninput={(e) => handleTitleTranslation(e.currentTarget.value)}
						class="w-full"
						placeholder="Laisser vide pour garder le titre français"
						disabled={!isEditable}
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

			<!-- Type, Style, Langue, Duration - compact row -->
			<div class="grid grid-cols-4 gap-4">
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

				<!-- Style -->
				<div>
					<p class="text-xs text-muted-foreground">Style</p>
					{#if !editingStyle}
						<button
							type="button"
							class="text-left text-sm font-medium {isEditable
								? 'cursor-pointer hover:text-primary'
								: 'cursor-default'}"
							onclick={() => startEdit('style')}
							disabled={!isEditable}
						>
							{styleLabel}
						</button>
					{:else}
						<MySelect
							type="single"
							value={chosenStyle?.id ?? DEFAULT_STYLE_ID}
							onchange={(v) => onFieldChange?.('style_id', v || null)}
							items={styleOptions}
							placeholder="Style"
							triggerAriaLabel="Choisir le style"
							contentProps={{
								// La colonne est étroite : le menu prend la largeur de ses noms
								class:
									'z-[200] max-h-96 w-max min-w-[var(--bits-select-anchor-width)] overflow-hidden rounded-md border bg-popover p-1 shadow-md'
							}}
						/>
					{/if}
				</div>

				<!--
					Langue : volontairement ici, à côté du type et du style, et non
					dans « Options d'affichage ». Ce n'est pas un réglage d'affichage :
					elle change le contenu même de la fiche. Visible sans clic.
				-->
				<div>
					<p class="text-xs text-muted-foreground">Langue</p>
					{#if !editingLanguage}
						<button
							type="button"
							class="text-left text-sm font-medium {isEditable
								? 'cursor-pointer hover:text-primary'
								: 'cursor-default'}"
							onclick={() => startEdit('language')}
							disabled={!isEditable}
						>
							{worksheetLocale(worksheet.config) === 'en' ? 'English' : 'Français'}
						</button>
					{:else}
						<MySelect
							type="single"
							value={worksheetLocale(worksheet.config)}
							onchange={(v) => handleConfigChange('language', v)}
							items={languageOptions}
							placeholder="Langue"
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
							{#if worksheet.grades && worksheet.grades.length > 0}
								<div class="flex flex-wrap gap-1">
									{#each worksheet.grades as grade, i (i)}
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
							value={(worksheet.grades as GradeCode[]) || []}
							onchange={(v) => onFieldChange?.('grades', v)}
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
							kind="worksheet"
							value={worksheet.tags || []}
							onchange={(v) => onFieldChange?.('tags', v)}
						/>
					{/if}
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Options du type de la fiche (ADR 0030) : le type décide de l'en-tête du PDF -->
	<Card.Root>
		<Card.Header class="pb-3">
			<div class="flex items-center gap-2">
				<Settings class="h-4 w-4 text-muted-foreground" />
				<Card.Title class="text-base">Options</Card.Title>
			</div>
			<Card.Description>
				{WORKSHEET_TYPE_LABELS[worksheet.type] ?? WORKSHEET_TYPE_LABELS.worksheet} : ce que le PDF imprime
			</Card.Description>
		</Card.Header>
		<Card.Content class="pt-0">
			<WorksheetTypeOptions
				type={worksheet.type}
				config={worksheet.config}
				editable={isEditable}
				onchange={handleConfigChange}
			/>
		</Card.Content>
	</Card.Root>
</div>
