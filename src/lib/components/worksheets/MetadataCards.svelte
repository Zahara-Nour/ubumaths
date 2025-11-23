<!--
	MetadataCards Component
	=======================

	Displays worksheet metadata in inline-editable cards format.
	Shows type, duration, grades, tags, statistics, and dates.
	Single-click to edit fields, with per-field save buttons and spinners.

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
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import MySelect from '$lib/components/MySelect.svelte';
	import GradeBadgeSelector from '$lib/components/GradeBadgeSelector.svelte';
	import TagBadgeSelector from '$lib/components/TagBadgeSelector.svelte';
	import {
		Clock,
		GraduationCap,
		Tag,
		ListOrdered,
		FileText,
		Calendar,
		Type,
		AlignLeft,
		Loader2,
		Check,
		X
	} from 'lucide-svelte';
	import {
		WORKSHEET_TYPE_ICONS,
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

	// Derived: Get type icon component
	let TypeIcon = $derived(worksheet.type ? WORKSHEET_TYPE_ICONS[worksheet.type] : null);

	// Per-field editing flags
	let editingTitle = $state(false);
	let editingDescription = $state(false);
	let editingType = $state(false);
	let editingDuration = $state(false);
	let editingGrades = $state(false);
	let editingTags = $state(false);

	// Per-field saving flags (for spinner)
	let savingTitle = $state(false);
	let savingDescription = $state(false);
	let savingType = $state(false);
	let savingDuration = $state(false);
	let savingGrades = $state(false);
	let savingTags = $state(false);

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

	// Save functions for each field (show error toast on failure, keep edit mode open)
	async function saveTitle() {
		if (!onSave || savingTitle) return;
		savingTitle = true;
		try {
			await onSave('title', tempTitle.trim());
			editingTitle = false;
		} catch (error) {
			console.error('Save failed:', error);
			toaster.error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde');
		} finally {
			savingTitle = false;
		}
	}

	async function saveDescription() {
		if (!onSave || savingDescription) return;
		savingDescription = true;
		try {
			await onSave('description', tempDescription.trim() || null);
			editingDescription = false;
		} catch (error) {
			console.error('Save failed:', error);
			toaster.error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde');
		} finally {
			savingDescription = false;
		}
	}

	async function saveType() {
		if (!onSave || savingType) return;
		savingType = true;
		try {
			await onSave('type', tempType || null);
			editingType = false;
		} catch (error) {
			console.error('Save failed:', error);
			toaster.error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde');
		} finally {
			savingType = false;
		}
	}

	async function saveDuration() {
		if (!onSave || savingDuration) return;
		savingDuration = true;
		try {
			await onSave('estimated_duration_minutes', tempDuration);
			editingDuration = false;
		} catch (error) {
			console.error('Save failed:', error);
			toaster.error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde');
		} finally {
			savingDuration = false;
		}
	}

	async function saveGrades() {
		if (!onSave || savingGrades) return;
		savingGrades = true;
		try {
			await onSave('grade_levels', tempGrades);
			editingGrades = false;
		} catch (error) {
			console.error('Save failed:', error);
			toaster.error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde');
		} finally {
			savingGrades = false;
		}
	}

	async function saveTags() {
		if (!onSave || savingTags) return;
		savingTags = true;
		try {
			await onSave('tags', tempTags);
			editingTags = false;
		} catch (error) {
			console.error('Save failed:', error);
			toaster.error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde');
		} finally {
			savingTags = false;
		}
	}

	// Cancel functions for each field
	function cancelEditTitle() {
		editingTitle = false;
		tempTitle = worksheet.title || '';
	}

	function cancelEditDescription() {
		editingDescription = false;
		tempDescription = worksheet.description || '';
	}

	function cancelEditType() {
		editingType = false;
		tempType = worksheet.type || undefined;
	}

	function cancelEditDuration() {
		editingDuration = false;
		tempDuration = worksheet.estimated_duration_minutes;
	}

	function cancelEditGrades() {
		editingGrades = false;
		tempGrades = (worksheet.grade_levels as GradeCode[]) || [];
	}

	function cancelEditTags() {
		editingTags = false;
		tempTags = worksheet.tags || [];
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

	// Handle ESC key to cancel editing
	function handleKeydown(cancelFn: () => void) {
		return (e: KeyboardEvent) => {
			if (e.key === 'Escape') {
				cancelFn();
			}
		};
	}

	// Type options for MySelect (convert to mutable array)
	const typeOptions = [...WORKSHEET_TYPE_OPTIONS] as { value: string; label: string }[];
</script>

<!-- Title Card (always visible, inline-editable) -->
<Card.Root>
	<Card.Header>
		<Card.Title class="text-lg">Titre</Card.Title>
	</Card.Header>
	<Card.Content>
		<div class="flex items-center gap-3">
			<Type class="h-4 w-4 shrink-0 text-muted-foreground" />
			<div class="min-w-0 flex-1">
				{#if !editingTitle}
					<!-- READ MODE: clickable to edit -->
					<button
						type="button"
						class="w-full text-left text-lg font-semibold {onSave
							? 'cursor-pointer hover:text-primary'
							: 'cursor-default'}"
						onclick={startEditTitle}
						disabled={!onSave}
					>
						{worksheet.title || '-'}
					</button>
				{:else}
					<!-- EDIT MODE: input + buttons -->
					<div class="flex items-center gap-2">
						<Input
							bind:value={tempTitle}
							class="flex-1"
							placeholder="Titre de la feuille"
							onkeydown={handleKeydown(cancelEditTitle)}
						/>
						{#if savingTitle}
							<Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
						{:else if titleChanged}
							<Button size="sm" onclick={saveTitle} aria-label="Enregistrer">
								<Check class="h-4 w-4" />
							</Button>
						{/if}
						<Button size="sm" variant="ghost" onclick={cancelEditTitle} aria-label="Annuler">
							<X class="h-4 w-4" />
						</Button>
					</div>
				{/if}
			</div>
		</div>
	</Card.Content>
</Card.Root>

<!-- Description Card (always visible, inline-editable) -->
<Card.Root>
	<Card.Header>
		<Card.Title class="text-lg">Description</Card.Title>
	</Card.Header>
	<Card.Content>
		<div class="flex items-start gap-3">
			<AlignLeft class="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
			<div class="min-w-0 flex-1">
				{#if !editingDescription}
					<!-- READ MODE: clickable to edit -->
					<button
						type="button"
						class="w-full text-left whitespace-pre-wrap {worksheet.description
							? ''
							: 'text-muted-foreground italic'} {onSave
							? 'cursor-pointer hover:text-primary'
							: 'cursor-default'}"
						onclick={startEditDescription}
						disabled={!onSave}
					>
						{worksheet.description || 'Aucune description'}
					</button>
				{:else}
					<!-- EDIT MODE: textarea + buttons -->
					<div class="space-y-2">
						<Textarea
							bind:value={tempDescription}
							class="min-h-[100px] w-full"
							placeholder="Description de la feuille..."
							onkeydown={handleKeydown(cancelEditDescription)}
						/>
						<div class="flex items-center justify-end gap-2">
							{#if savingDescription}
								<Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
							{:else if descriptionChanged}
								<Button size="sm" onclick={saveDescription}>
									<Check class="mr-1 h-4 w-4" />
									Enregistrer
								</Button>
							{/if}
							<Button size="sm" variant="ghost" onclick={cancelEditDescription}>
								<X class="mr-1 h-4 w-4" />
								Annuler
							</Button>
						</div>
					</div>
				{/if}
			</div>
		</div>
	</Card.Content>
</Card.Root>

<!-- Metadata grid -->
<div class="grid gap-4 md:grid-cols-2">
	<!-- Left column: Information -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="text-lg">Informations</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-4">
			<!-- Type -->
			<div class="flex items-center gap-3">
				{#if TypeIcon}
					<TypeIcon class="h-4 w-4 shrink-0 text-muted-foreground" />
				{:else}
					<FileText class="h-4 w-4 shrink-0 text-muted-foreground" />
				{/if}
				<div class="min-w-0 flex-1">
					<p class="text-sm text-muted-foreground">Type</p>
					{#if !editingType}
						<!-- READ MODE -->
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
						<!-- EDIT MODE -->
						<div class="flex items-center gap-2">
							<MySelect
								type="single"
								bind:value={tempType}
								items={typeOptions}
								placeholder="Choisir un type"
							/>
							{#if savingType}
								<Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
							{:else if typeChanged}
								<Button size="sm" onclick={saveType} aria-label="Enregistrer">
									<Check class="h-4 w-4" />
								</Button>
							{/if}
							<Button size="sm" variant="ghost" onclick={cancelEditType} aria-label="Annuler">
								<X class="h-4 w-4" />
							</Button>
						</div>
					{/if}
				</div>
			</div>

			<Separator />

			<!-- Duration -->
			<div class="flex items-center gap-3">
				<Clock class="h-4 w-4 shrink-0 text-muted-foreground" />
				<div class="min-w-0 flex-1">
					<p class="text-sm text-muted-foreground">Duree estimee</p>
					{#if !editingDuration}
						<!-- READ MODE -->
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
						<!-- EDIT MODE -->
						<div class="flex items-center gap-2">
							<Input
								type="number"
								bind:value={tempDuration}
								class="w-24"
								min={0}
								max={480}
								placeholder="min"
								onkeydown={handleKeydown(cancelEditDuration)}
							/>
							<span class="text-sm text-muted-foreground">min</span>
							{#if savingDuration}
								<Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
							{:else if durationChanged}
								<Button size="sm" onclick={saveDuration} aria-label="Enregistrer">
									<Check class="h-4 w-4" />
								</Button>
							{/if}
							<Button size="sm" variant="ghost" onclick={cancelEditDuration} aria-label="Annuler">
								<X class="h-4 w-4" />
							</Button>
						</div>
					{/if}
				</div>
			</div>

			<Separator />

			<!-- Grade levels -->
			<div class="flex items-start gap-3">
				<GraduationCap class="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
				<div class="min-w-0 flex-1">
					<p class="text-sm text-muted-foreground">Niveaux scolaires</p>
					{#if !editingGrades}
						<!-- READ MODE -->
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
						<!-- EDIT MODE -->
						<div class="mt-1 space-y-2">
							<GradeBadgeSelector bind:value={tempGrades} />
							<div class="flex items-center gap-2">
								{#if savingGrades}
									<Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
								{:else if gradesChanged}
									<Button size="sm" onclick={saveGrades}>
										<Check class="mr-1 h-4 w-4" />
										Enregistrer
									</Button>
								{/if}
								<Button size="sm" variant="ghost" onclick={cancelEditGrades}>
									<X class="mr-1 h-4 w-4" />
									Annuler
								</Button>
							</div>
						</div>
					{/if}
				</div>
			</div>

			<Separator />

			<!-- Tags -->
			<div class="flex items-start gap-3">
				<Tag class="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
				<div class="min-w-0 flex-1">
					<p class="text-sm text-muted-foreground">Tags</p>
					{#if !editingTags}
						<!-- READ MODE -->
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
						<!-- EDIT MODE -->
						<div class="mt-1 space-y-2">
							<TagBadgeSelector bind:value={tempTags} />
							<div class="flex items-center gap-2">
								{#if savingTags}
									<Loader2 class="h-4 w-4 animate-spin text-muted-foreground" />
								{:else if tagsChanged}
									<Button size="sm" onclick={saveTags}>
										<Check class="mr-1 h-4 w-4" />
										Enregistrer
									</Button>
								{/if}
								<Button size="sm" variant="ghost" onclick={cancelEditTags}>
									<X class="mr-1 h-4 w-4" />
									Annuler
								</Button>
							</div>
						</div>
					{/if}
				</div>
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
					<p class="text-sm text-muted-foreground">Points total</p>
					<p class="font-medium">{worksheet.total_points ?? 0} points</p>
				</div>
			</div>

			<Separator />

			<!-- Exercises count -->
			<div class="flex items-center gap-3">
				<FileText class="h-4 w-4 shrink-0 text-muted-foreground" />
				<div>
					<p class="text-sm text-muted-foreground">Exercices</p>
					<p class="font-medium">{worksheet.exercises?.length ?? 0} exercice(s)</p>
				</div>
			</div>

			<Separator />

			<!-- Dates -->
			<div class="flex items-center gap-3">
				<Calendar class="h-4 w-4 shrink-0 text-muted-foreground" />
				<div>
					<p class="text-sm text-muted-foreground">Cree le</p>
					<p class="font-medium">{formatDate(worksheet.created_at)}</p>
				</div>
			</div>

			{#if worksheet.published_at}
				<div class="ml-7 flex items-center gap-3">
					<div>
						<p class="text-sm text-muted-foreground">Publie le</p>
						<p class="font-medium">{formatDate(worksheet.published_at)}</p>
					</div>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
