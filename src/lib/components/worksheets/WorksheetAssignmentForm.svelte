<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import MySelect from '$lib/components/MySelect.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import CorrectionSettings from '$lib/components/worksheets/CorrectionSettings.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Loader2, Users, Calendar, FileCheck, Monitor } from 'lucide-svelte';
	import type { CorrectionReleaseMode, WorksheetAssignmentInsert } from '$lib/types/worksheets';

	// ============================================================================
	// PROPS
	// ============================================================================

	interface ClassOption {
		id: string;
		name: string;
	}

	interface Props {
		worksheetId: string;
		worksheetTitle: string;
		classes: ClassOption[];
		onSubmit?: (assignment: WorksheetAssignmentInsert) => Promise<void>;
		onCancel?: () => void;
	}

	let { worksheetId, worksheetTitle, classes, onSubmit, onCancel }: Props = $props();

	// ============================================================================
	// FORM STATE
	// ============================================================================

	let title = $state<string>('');
	let instructions = $state<string>('');
	let selectedClassId = $state<string>('');
	let individualized = $state<boolean>(true);

	// Disponibilite (defaut: maintenant -> indefiniment)
	let availableFrom = $state<string>(new Date().toISOString().slice(0, 16));
	let closesAt = $state<string>('');

	// Correction settings
	let correctionReleaseMode = $state<CorrectionReleaseMode>('manual');
	let correctionScheduledDate = $state<string>('');

	// Mode consultation en ligne
	let showCorrections = $state<boolean>(false);

	// Loading state
	let isSubmitting = $state(false);

	// Class options for select
	let classItems = $derived(
		classes.map((c) => ({
			value: c.id,
			label: c.name
		}))
	);

	// Validation
	let isValid = $derived(
		selectedClassId !== '' &&
			(correctionReleaseMode !== 'scheduled' || correctionScheduledDate !== '')
	);

	// ============================================================================
	// HANDLERS
	// ============================================================================

	async function handleSubmit() {
		if (!isValid || isSubmitting) return;

		isSubmitting = true;

		try {
			const assignmentData: WorksheetAssignmentInsert = {
				worksheet_id: worksheetId,
				class_id: selectedClassId,
				title: title || null,
				instructions: instructions || null,
				individualized,
				available_from: availableFrom ? new Date(availableFrom).toISOString() : undefined,
				closes_at: closesAt ? new Date(closesAt).toISOString() : null,
				correction_release_mode: correctionReleaseMode,
				correction_release_at:
					correctionReleaseMode === 'scheduled' && correctionScheduledDate
						? new Date(correctionScheduledDate).toISOString()
						: null,
				show_corrections: showCorrections,
				status: 'active',
				created_by: '' // Will be set by the API
			};

			if (onSubmit) {
				await onSubmit(assignmentData);
			}

			toaster.success('Assignation creee avec succes');
		} catch (err) {
			console.error('Error creating assignment:', err);
			toaster.error(err instanceof Error ? err.message : 'Erreur lors de la creation');
		} finally {
			isSubmitting = false;
		}
	}
</script>

<div class="space-y-6">
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Users class="h-5 w-5" />
				Assigner a une classe
			</Card.Title>
			<Card.Description>
				Assignez "{worksheetTitle}" a une classe d'eleves
			</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-6">
			<!-- Class selection -->
			<div class="space-y-2">
				<Label for="class-select">Classe *</Label>
				{#if classes.length === 0}
					<p class="text-sm text-muted-foreground">
						Aucune classe disponible. Creez d'abord une classe.
					</p>
				{:else}
					<MySelect
						type="single"
						bind:value={selectedClassId}
						items={classItems}
						placeholder="Selectionnez une classe"
					/>
				{/if}
			</div>

			<!-- Optional title override -->
			<div class="space-y-2">
				<Label for="title">Titre personnalise (optionnel)</Label>
				<Input
					id="title"
					bind:value={title}
					placeholder="Laissez vide pour utiliser le titre original"
				/>
			</div>

			<!-- Instructions -->
			<div class="space-y-2">
				<Label for="instructions">Instructions supplementaires</Label>
				<Textarea
					id="instructions"
					bind:value={instructions}
					placeholder="Instructions speciales pour les eleves..."
					rows={3}
				/>
			</div>

			<!-- Individualization -->
			<div class="flex items-start space-x-3">
				<MyCheckbox id="individualized" bind:checked={individualized} />
				<div class="space-y-1">
					<Label for="individualized" class="cursor-pointer font-normal">
						Exercices individualises
					</Label>
					<p class="text-xs text-muted-foreground">
						Chaque eleve recevra une version personnalisee avec des valeurs differentes
					</p>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Calendar class="h-5 w-5" />
				Disponibilite
			</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="grid gap-4 md:grid-cols-2">
				<!-- Available from -->
				<div class="space-y-2">
					<Label for="available-from">Disponible a partir de</Label>
					<Input id="available-from" type="datetime-local" bind:value={availableFrom} />
				</div>

				<!-- Closes at -->
				<div class="space-y-2">
					<Label for="closes-at">Visible jusqu'au (optionnel)</Label>
					<Input id="closes-at" type="datetime-local" bind:value={closesAt} />
					<p class="text-xs text-muted-foreground">Laissez vide pour une visibilite indefinie</p>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<FileCheck class="h-5 w-5" />
				Publication des corrections
			</Card.Title>
		</Card.Header>
		<Card.Content>
			<CorrectionSettings
				bind:releaseMode={correctionReleaseMode}
				bind:scheduledDate={correctionScheduledDate}
			/>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2">
				<Monitor class="h-5 w-5" />
				Mode consultation en ligne
			</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-4">
			<div class="flex items-start space-x-3">
				<MyCheckbox id="show-corrections" bind:checked={showCorrections} />
				<div class="space-y-1">
					<Label for="show-corrections" class="cursor-pointer font-normal">
						Activer le mode consultation
					</Label>
					<p class="text-xs text-muted-foreground">
						Permet aux eleves de consulter la feuille directement en ligne sur leur tableau de bord.
					</p>
				</div>
			</div>

			{#if showCorrections}
				<div
					class="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950"
				>
					<p class="text-sm text-blue-800 dark:text-blue-200">
						Une fois l'assignation creee, vous pourrez gerer la visibilite des corrections pour
						chaque exercice depuis la page de gestion.
					</p>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Form actions -->
	<div class="flex justify-end gap-4">
		{#if onCancel}
			<Button variant="outline" onclick={onCancel}>Annuler</Button>
		{/if}
		<Button onclick={handleSubmit} disabled={!isValid || isSubmitting}>
			{#if isSubmitting}
				<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				Creation...
			{:else}
				Creer l'assignation
			{/if}
		</Button>
	</div>
</div>
