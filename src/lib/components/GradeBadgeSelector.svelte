<!--
	GradeBadgeSelector Component
	============================

	A badge-based grade selector that displays selected grades as badges
	with a modal for selecting/deselecting grades organized by school level.

	Usage:
	```svelte
	<script lang="ts">
	  import GradeBadgeSelector from '$lib/components/GradeBadgeSelector.svelte';
	  import type { GradeCode } from '$lib/types/grades';

	  let selectedGrades = $state<GradeCode[]>(['6', '5', '4']);
	</script>

	<GradeBadgeSelector bind:value={selectedGrades} />
	```
-->
<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { X, Plus } from 'lucide-svelte';
	import {
		GRADES,
		PRIMARY_GRADES,
		MIDDLE_GRADES,
		HIGH_GRADES,
		type GradeCode,
		type SchoolLevel
	} from '$lib/types/grades';
	import { formatGradeShort } from '$lib/utils/grades';

	// Props interface
	interface Props {
		value: GradeCode[];
		placeholder?: string;
		disabled?: boolean;
		maxSelections?: number;
	}

	let {
		value = $bindable([]),
		placeholder = 'Ajouter des niveaux',
		disabled = false,
		maxSelections
	}: Props = $props();

	// Local state for modal
	let isModalOpen = $state(false);
	let pendingSelection = $state<GradeCode[]>([]);

	// School level labels in French
	const schoolLevelLabels: Record<SchoolLevel, string> = {
		primary: 'Primaire',
		middle: 'Collège',
		high: 'Lycée'
	};

	// Grouped grades for display in modal
	const gradesByLevel = [
		{ level: 'primary' as SchoolLevel, grades: PRIMARY_GRADES },
		{ level: 'middle' as SchoolLevel, grades: MIDDLE_GRADES },
		{ level: 'high' as SchoolLevel, grades: HIGH_GRADES }
	];

	// Check if we can add more selections
	let canAddMore = $derived(maxSelections === undefined || value.length < maxSelections);

	/**
	 * Remove a grade from selection
	 */
	function removeGrade(grade: GradeCode): void {
		if (disabled) return;
		value = value.filter((g) => g !== grade);
	}

	/**
	 * Open modal and initialize pending selection
	 */
	function openModal(): void {
		if (disabled) return;
		pendingSelection = [...value];
		isModalOpen = true;
	}

	/**
	 * Toggle a grade in pending selection
	 */
	function toggleGrade(grade: GradeCode): void {
		const isSelected = pendingSelection.includes(grade);

		if (isSelected) {
			pendingSelection = pendingSelection.filter((g) => g !== grade);
		} else {
			// Check max selections limit
			if (maxSelections !== undefined && pendingSelection.length >= maxSelections) {
				return;
			}
			pendingSelection = [...pendingSelection, grade];
		}
	}

	/**
	 * Confirm selection and close modal
	 */
	function confirmSelection(): void {
		value = [...pendingSelection];
		isModalOpen = false;
	}

	/**
	 * Cancel and close modal
	 */
	function cancelSelection(): void {
		isModalOpen = false;
	}

	/**
	 * Handle modal open state change
	 */
	function handleOpenChange(open: boolean): void {
		if (!open) {
			cancelSelection();
		}
		isModalOpen = open;
	}

	/**
	 * Check if a grade is in pending selection
	 */
	function isGradeSelected(grade: GradeCode): boolean {
		return pendingSelection.includes(grade);
	}

	/**
	 * Check if we can select more grades in modal
	 */
	let canSelectMoreInModal = $derived(
		maxSelections === undefined || pendingSelection.length < maxSelections
	);
</script>

<div class="flex flex-wrap items-center gap-2">
	<!-- Selected grade badges -->
	{#each value as grade (grade)}
		<Badge variant="secondary" class="group flex items-center gap-1 pr-1 transition-colors">
			<span>{formatGradeShort(grade)}</span>
			<button
				type="button"
				onclick={() => removeGrade(grade)}
				{disabled}
				class="ml-1 rounded-full p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/20 focus:opacity-100 disabled:cursor-not-allowed"
				aria-label="Supprimer {GRADES[grade].displayName}"
			>
				<X class="h-3 w-3" />
			</button>
		</Badge>
	{/each}

	<!-- Add button -->
	{#if value.length === 0}
		<!-- Empty state: button with text -->
		<Button
			variant="outline"
			size="sm"
			onclick={openModal}
			disabled={disabled || !canAddMore}
			class="gap-1"
			aria-label={placeholder}
		>
			<Plus class="h-4 w-4" />
			<span>{placeholder}</span>
		</Button>
	{:else if canAddMore}
		<!-- Has selections: just the + button -->
		<Button
			variant="outline"
			size="icon"
			class="h-6 w-6"
			onclick={openModal}
			{disabled}
			aria-label="Ajouter un niveau"
		>
			<Plus class="h-4 w-4" />
		</Button>
	{/if}
</div>

<!-- Selection Modal -->
<Dialog.Root open={isModalOpen} onOpenChange={handleOpenChange}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Sélectionner les niveaux</Dialog.Title>
			{#if maxSelections !== undefined}
				<Dialog.Description>
					{pendingSelection.length} / {maxSelections} niveaux sélectionnés
				</Dialog.Description>
			{/if}
		</Dialog.Header>

		<div class="space-y-6 py-4">
			{#each gradesByLevel as { level, grades } (level)}
				<div>
					<h4 class="mb-3 text-sm font-medium text-muted-foreground">
						{schoolLevelLabels[level]}
					</h4>
					<div class="flex flex-wrap gap-2">
						{#each grades as grade (grade)}
							{@const selected = isGradeSelected(grade)}
							{@const canSelect = selected || canSelectMoreInModal}
							<button
								type="button"
								onclick={() => toggleGrade(grade)}
								disabled={!canSelect}
								class="rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
								aria-pressed={selected}
								aria-label="{selected ? 'Désélectionner' : 'Sélectionner'} {GRADES[grade]
									.displayName}"
							>
								<Badge
									variant={selected ? 'default' : 'outline'}
									class="cursor-pointer transition-colors hover:bg-accent {selected
										? 'hover:bg-primary/90'
										: ''}"
								>
									{formatGradeShort(grade)}
								</Badge>
							</button>
						{/each}
					</div>
				</div>
			{/each}
		</div>

		<Dialog.Footer class="gap-2 sm:gap-0">
			<Button variant="outline" onclick={cancelSelection}>Annuler</Button>
			<Button onclick={confirmSelection}>Confirmer</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
