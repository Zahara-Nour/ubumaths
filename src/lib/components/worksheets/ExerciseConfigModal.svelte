<!--
	ExerciseConfigModal Component
	=============================

	Modal for configuring exercise settings within a worksheet.

	Features:
	- Edit points for exercise
	- Configure variant mode (none, individual, n_versions, group)
	- Variant config options based on mode
	- Custom instructions field
	- Save button calls API

	Usage:
	```svelte
	<ExerciseConfigModal
		bind:open={configModalOpen}
		exercise={selectedExercise}
		worksheetId={worksheet.id}
		sections={worksheet.sections}
		onSave={handleSave}
	/>
	```
-->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import MySelect from '$lib/components/MySelect.svelte';
	import * as Dialog from '$lib/components/ui/dialog';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Loader2, Save, Star } from 'lucide-svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import type {
		WorksheetExerciseWithExercise,
		WorksheetSectionRow,
		VariantMode,
		VariantConfig
	} from '$lib/types/worksheets';

	// Types
	interface Props {
		open?: boolean;
		exercise: WorksheetExerciseWithExercise | null;
		worksheetId: string;
		sections: WorksheetSectionRow[];
		onSave?: (exercise: WorksheetExerciseWithExercise) => void;
	}

	// Props
	let { open = $bindable(false), exercise, worksheetId, sections = [], onSave }: Props = $props();

	// Track which exercise we've initialized for
	let initializedExerciseId = $state<string | null>(null);

	// Form state
	let points = $state<number | null>(null);
	let sectionId = $state<string>('');
	let variantMode = $state<VariantMode>('none');
	let nVersions = $state<number>(2);
	let groupSize = $state<number>(2);
	let customInstructions = $state('');
	let isEssential = $state(false);

	// Saving state
	let isSaving = $state(false);

	// Variant mode options
	const variantModeOptions = [
		{ value: 'none', label: 'Aucune variante' },
		{ value: 'individual', label: 'Individuel (unique par eleve)' },
		{ value: 'n_versions', label: 'N versions (nombre fixe)' },
		{ value: 'group', label: "Groupe (par groupe d'eleves)" }
	];

	// Section options (with "Sans section" option)
	let sectionOptions = $derived([
		{ value: '', label: 'Sans section' },
		...sections
			.sort((a, b) => a.position - b.position)
			.map((s) => ({ value: s.id, label: s.title }))
	]);

	// Initialize form when modal opens with a new exercise
	// Using a tracking variable to avoid re-initializing on every render
	$effect(() => {
		if (exercise && open && initializedExerciseId !== exercise.id) {
			initializeForm(exercise);
			initializedExerciseId = exercise.id;
		} else if (!open) {
			// Reset tracking when modal closes
			initializedExerciseId = null;
		}
	});

	/**
	 * Initialize form values from exercise
	 */
	function initializeForm(ex: WorksheetExerciseWithExercise) {
		points = ex.points;
		sectionId = ex.section_id || '';
		variantMode = ex.variant_mode;
		nVersions = ex.variant_config?.n_versions ?? 2;
		groupSize = ex.variant_config?.group_size ?? 2;
		customInstructions = ex.custom_instructions || '';
		isEssential = ex.is_essential ?? false;
	}

	/**
	 * Build variant config from form state
	 */
	function buildVariantConfig(): VariantConfig {
		const config: VariantConfig = {
			mode: variantMode
		};

		if (variantMode === 'n_versions') {
			config.n_versions = nVersions;
		} else if (variantMode === 'group') {
			config.group_size = groupSize;
		}

		return config;
	}

	/**
	 * Save changes
	 */
	async function handleSave() {
		if (!exercise) return;

		isSaving = true;

		try {
			const response = await fetch(`/api/worksheets/${worksheetId}/exercises/${exercise.id}`, {
				method: 'PUT',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					points: points,
					section_id: sectionId || null,
					variant_mode: variantMode,
					variant_config: buildVariantConfig(),
					custom_instructions: customInstructions.trim() || null,
					is_essential: isEssential
				})
			});

			if (!response.ok) {
				const error = await response.json().catch(() => ({}));
				throw new Error(error.message || 'Erreur lors de la sauvegarde');
			}

			const data = await response.json();

			// Merge the updated data with the original exercise (keeping joined exercise data)
			const updatedExercise: WorksheetExerciseWithExercise = {
				...exercise,
				...data.exercise,
				exercise: exercise.exercise // Keep the original exercise data
			};

			onSave?.(updatedExercise);
			toaster.success('Configuration sauvegardee');
			open = false;
		} catch (err) {
			console.error('Error saving exercise config:', err);
			toaster.error(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
		} finally {
			isSaving = false;
		}
	}

	/**
	 * Cancel and close
	 */
	function handleCancel() {
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Configuration de l'exercice</Dialog.Title>
			<Dialog.Description>
				{#if exercise?.exercise?.title}
					{exercise.exercise.title}
				{:else}
					Modifier les parametres de l'exercice
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			<!-- Section -->
			<div class="space-y-2">
				<Label for="section">Section</Label>
				<MySelect
					bind:value={sectionId}
					items={sectionOptions}
					placeholder="Selectionner une section"
				/>
				<p class="text-xs text-muted-foreground">
					Choisissez dans quelle section placer cet exercice
				</p>
			</div>

			<!-- Points -->
			<div class="space-y-2">
				<Label for="points">Points</Label>
				<Input
					id="points"
					type="number"
					min={0}
					max={1000}
					bind:value={points}
					placeholder="Ex: 10"
				/>
				<p class="text-xs text-muted-foreground">Nombre de points attribues a cet exercice</p>
			</div>

			<!-- Essential exercise -->
			<div
				class="flex items-start space-x-3 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-800 dark:bg-amber-950/30"
			>
				<Star class="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
				<div class="flex-1 space-y-2">
					<div class="flex items-center justify-between">
						<Label for="is-essential" class="cursor-pointer font-medium"
							>Exercice indispensable</Label
						>
						<MyCheckbox id="is-essential" bind:checked={isEssential} />
					</div>
					<p class="text-xs text-muted-foreground">
						Les exercices indispensables sont mis en evidence avec une etoile doree pour les eleves
					</p>
				</div>
			</div>

			<!-- Variant mode -->
			<div class="space-y-2">
				<Label>Mode de variante</Label>
				<MySelect
					bind:value={variantMode}
					items={variantModeOptions}
					placeholder="Selectionner un mode"
				/>
				<p class="text-xs text-muted-foreground">
					{#if variantMode === 'none'}
						Tous les eleves recevront le meme exercice
					{:else if variantMode === 'individual'}
						Chaque eleve recevra une variante unique
					{:else if variantMode === 'n_versions'}
						L'exercice aura un nombre fixe de versions differentes
					{:else if variantMode === 'group'}
						Les eleves d'un meme groupe recevront la meme variante
					{/if}
				</p>
			</div>

			<!-- N versions config -->
			{#if variantMode === 'n_versions'}
				<div class="space-y-2">
					<Label for="n-versions">Nombre de versions</Label>
					<Input id="n-versions" type="number" min={2} max={100} bind:value={nVersions} />
					<p class="text-xs text-muted-foreground">Nombre de versions differentes de l'exercice</p>
				</div>
			{/if}

			<!-- Group size config -->
			{#if variantMode === 'group'}
				<div class="space-y-2">
					<Label for="group-size">Taille des groupes</Label>
					<Input id="group-size" type="number" min={2} max={50} bind:value={groupSize} />
					<p class="text-xs text-muted-foreground">
						Nombre d'eleves par groupe partageant la meme variante
					</p>
				</div>
			{/if}

			<!-- Custom instructions -->
			<div class="space-y-2">
				<Label for="custom-instructions">Instructions personnalisees</Label>
				<Textarea
					id="custom-instructions"
					bind:value={customInstructions}
					placeholder="Instructions supplementaires pour cet exercice..."
					rows={3}
				/>
				<p class="text-xs text-muted-foreground">
					Ces instructions s'afficheront avant l'enonce de l'exercice
				</p>
			</div>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={handleCancel} disabled={isSaving}>Annuler</Button>
			<Button onclick={handleSave} disabled={isSaving}>
				{#if isSaving}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					Sauvegarde...
				{:else}
					<Save class="mr-2 h-4 w-4" />
					Enregistrer
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
