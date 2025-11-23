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
	import GradeBadgeSelector from '$lib/components/GradeBadgeSelector.svelte';
	import TagBadgeSelector from '$lib/components/TagBadgeSelector.svelte';
	import { ListOrdered, FileText, Calendar, Loader2, Check, X } from 'lucide-svelte';
	import {
		WORKSHEET_TYPE_LABELS,
		WORKSHEET_TYPE_OPTIONS,
		formatDate,
		formatDuration
	} from '$lib/utils/worksheet-constants';
	import { formatGradeShort } from '$lib/utils/grades';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { WorksheetWithRelations } from '$lib/types/worksheets';
	import type { GradeCode } from '$lib/types/grades';

	// Props
	interface Props {
		worksheet: WorksheetWithRelations;
		onSave?: (field: string, value: unknown) => Promise<void>;
	}

	let { worksheet, onSave }: Props = $props();

	// Per-field editing flags
	let editingTitle = $state(false);
	let editingDescription = $state(false);
	let editingType = $state(false);
	let editingDuration = $state(false);
	let editingGrades = $state(false);
	let editingTags = $state(false);

	// Global saving state
	let isSaving = $state(false);

	// Temporary values for editing
	let tempTitle = $state(worksheet.title || '');
	let tempDescription = $state(worksheet.description || '');
	let tempType = $state<string | undefined>(worksheet.type || undefined);
	let tempDuration = $state<number | null>(worksheet.estimated_duration_minutes);
	let tempGrades = $state<GradeCode[]>((worksheet.grade_levels as GradeCode[]) || []);
	let tempTags = $state<string[]>(worksheet.tags || []);

	// Per-field change detection
	let titleChanged = $derived(tempTitle !== (worksheet.title || ''));
	let descriptionChanged = $derived(tempDescription !== (worksheet.description || ''));
	let typeChanged = $derived(tempType !== (worksheet.type || undefined));
	let durationChanged = $derived(tempDuration !== worksheet.estimated_duration_minutes);
	let gradesChanged = $derived(
		JSON.stringify(tempGrades.sort()) !==
			JSON.stringify(((worksheet.grade_levels as GradeCode[]) || []).sort())
	);
	let tagsChanged = $derived(
		JSON.stringify(tempTags.sort()) !== JSON.stringify((worksheet.tags || []).sort())
	);

	// Global change detection (for showing save button)
	let hasChanges = $derived(
		titleChanged ||
			descriptionChanged ||
			typeChanged ||
			durationChanged ||
			gradesChanged ||
			tagsChanged
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
			if (durationChanged) {
				savePromises.push(onSave('estimated_duration_minutes', tempDuration));
			}
			if (gradesChanged) {
				savePromises.push(onSave('grade_levels', tempGrades));
			}
			if (tagsChanged) {
				savePromises.push(onSave('tags', tempTags));
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
		editingDuration = false;
		editingGrades = false;
		editingTags = false;
	}

	// Cancel all edits and restore original values
	function cancelAllEdits() {
		cancelTitle();
		cancelDescription();
		cancelType();
		cancelDuration();
		cancelGrades();
		cancelTags();
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
</script>

<div class="grid gap-4 md:grid-cols-2">
	<!-- Left column: All editable information -->
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
		<Card.Content class="space-y-4">
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

			<Separator />

			<!-- Description -->
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
						class="w-full text-left whitespace-pre-wrap {worksheet.description
							? 'font-medium'
							: 'text-muted-foreground/50 italic'} {onSave
							? 'cursor-pointer hover:text-primary'
							: 'cursor-default'}"
						onclick={startEditDescription}
						disabled={!onSave}
					>
						{worksheet.description || 'Aucune description'}
					</button>
				{:else}
					<Textarea
						bind:value={tempDescription}
						class="min-h-[80px] w-full"
						placeholder="Description de la feuille..."
						onkeydown={handleKeydownDescription}
					/>
				{/if}
			</div>

			<Separator />

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
						class="text-left font-medium {onSave
							? 'cursor-pointer hover:text-primary'
							: 'cursor-default'}"
						onclick={startEditType}
						disabled={!onSave}
					>
						{worksheet.type ? WORKSHEET_TYPE_LABELS[worksheet.type] : '-'}
					</button>
				{:else}
					<MySelect
						type="single"
						bind:value={tempType}
						items={typeOptions}
						placeholder="Choisir un type"
					/>
				{/if}
			</div>

			<Separator />

			<!-- Duration -->
			<div>
				<div class="flex items-center gap-1">
					<p class="text-xs text-muted-foreground">Duree estimee</p>
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
						class="text-left font-medium {onSave
							? 'cursor-pointer hover:text-primary'
							: 'cursor-default'}"
						onclick={startEditDuration}
						disabled={!onSave}
					>
						{formatDuration(worksheet.estimated_duration_minutes)}
					</button>
				{:else}
					<div class="flex items-center gap-2">
						<Input
							type="number"
							bind:value={tempDuration}
							class="w-24"
							min={0}
							max={480}
							placeholder="min"
							onkeydown={handleKeydownDuration}
						/>
						<span class="text-sm text-muted-foreground">min</span>
					</div>
				{/if}
			</div>

			<Separator />

			<!-- Grade levels -->
			<div>
				<div class="flex items-center gap-1">
					<p class="text-xs text-muted-foreground">Niveaux scolaires</p>
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
						class="mt-1 w-full text-left {onSave
							? 'cursor-pointer hover:text-primary'
							: 'cursor-default'}"
						onclick={startEditGrades}
						disabled={!onSave}
					>
						{#if worksheet.grade_levels && worksheet.grade_levels.length > 0}
							<div class="flex flex-wrap gap-1">
								{#each worksheet.grade_levels as grade, i (i)}
									<Badge variant="outline">
										{formatGradeShort(String(grade) as GradeCode)}
									</Badge>
								{/each}
							</div>
						{:else}
							<span class="font-medium">-</span>
						{/if}
					</button>
				{:else}
					<div class="mt-1">
						<GradeBadgeSelector bind:value={tempGrades} />
					</div>
				{/if}
			</div>

			<Separator />

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
						class="mt-1 w-full text-left {onSave
							? 'cursor-pointer hover:text-primary'
							: 'cursor-default'}"
						onclick={startEditTags}
						disabled={!onSave}
					>
						{#if worksheet.tags && worksheet.tags.length > 0}
							<div class="flex flex-wrap gap-1">
								{#each worksheet.tags as tag (tag)}
									<Badge variant="secondary">{tag}</Badge>
								{/each}
							</div>
						{:else}
							<span class="font-medium">-</span>
						{/if}
					</button>
				{:else}
					<div class="mt-1">
						<TagBadgeSelector bind:value={tempTags} />
					</div>
				{/if}
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Right column: Statistics (read-only) -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="text-lg">Statistiques</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-4">
			<!-- Points total -->
			<div class="flex items-center gap-3">
				<ListOrdered class="h-4 w-4 shrink-0 text-muted-foreground" />
				<div>
					<p class="text-xs text-muted-foreground">Points total</p>
					<p class="font-medium">{worksheet.total_points ?? 0} points</p>
				</div>
			</div>

			<Separator />

			<!-- Exercises count -->
			<div class="flex items-center gap-3">
				<FileText class="h-4 w-4 shrink-0 text-muted-foreground" />
				<div>
					<p class="text-xs text-muted-foreground">Exercices</p>
					<p class="font-medium">{worksheet.exercises?.length ?? 0} exercice(s)</p>
				</div>
			</div>

			<Separator />

			<!-- Dates -->
			<div class="flex items-center gap-3">
				<Calendar class="h-4 w-4 shrink-0 text-muted-foreground" />
				<div>
					<p class="text-xs text-muted-foreground">Cree le</p>
					<p class="font-medium">{formatDate(worksheet.created_at)}</p>
				</div>
			</div>

			{#if worksheet.published_at}
				<div class="ml-7 flex items-center gap-3">
					<div>
						<p class="text-xs text-muted-foreground">Publie le</p>
						<p class="font-medium">{formatDate(worksheet.published_at)}</p>
					</div>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
