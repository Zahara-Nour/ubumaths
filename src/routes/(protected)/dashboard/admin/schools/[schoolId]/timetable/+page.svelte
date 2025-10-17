<script lang="ts">
	import type { PageData } from './$types';
	import type { SchoolPeriod } from '$lib/types/database';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { invalidateAll, goto } from '$app/navigation';
	import {
		formatPeriodDisplay,
		formatPeriodTimes,
		validateTimetable,
		sortPeriods,
		getNextPeriodNumber,
		createDefaultTimetable
	} from '$lib/utils/timetable';
	import { ArrowLeft, Plus, Pencil, Trash2, MoveUp, MoveDown } from 'lucide-svelte';

	let { data }: { data: PageData } = $props();

	// Periods state (mutable copy of school timetable)
	let periods = $state<SchoolPeriod[]>(
		data.school.timetable?.periods ? [...data.school.timetable.periods] : []
	);

	// Modal state
	let showModal = $state(false);
	let editingPeriod = $state<SchoolPeriod | null>(null);
	let modalMode = $state<'create' | 'edit'>('create');

	// Form state
	let formData = $state({
		number: 1,
		name: '',
		start_time: '08:00',
		end_time: '09:00'
	});

	/**
	 * Open modal to create new period
	 */
	function handleAddPeriod() {
		modalMode = 'create';
		editingPeriod = null;
		formData = {
			number: getNextPeriodNumber(periods),
			name: '',
			start_time: '08:00',
			end_time: '09:00'
		};
		showModal = true;
	}

	/**
	 * Open modal to edit existing period
	 */
	function handleEditPeriod(period: SchoolPeriod) {
		modalMode = 'edit';
		editingPeriod = period;
		formData = {
			number: period.number,
			name: period.name || '',
			start_time: period.start_time.substring(0, 5), // HH:MM
			end_time: period.end_time.substring(0, 5)
		};
		showModal = true;
	}

	/**
	 * Save period (create or update)
	 */
	function handleSavePeriod() {
		const newPeriod: SchoolPeriod = {
			number: formData.number,
			name: formData.name.trim() || undefined,
			start_time: formData.start_time + ':00',
			end_time: formData.end_time + ':00'
		};

		if (modalMode === 'create') {
			periods = [...periods, newPeriod];
		} else {
			// Update existing period
			periods = periods.map((p) => (p.number === editingPeriod?.number ? newPeriod : p));
		}

		showModal = false;
	}

	/**
	 * Delete period
	 */
	function handleDeletePeriod(periodNumber: number) {
		if (!confirm('Êtes-vous sûr de vouloir supprimer cette période ?')) {
			return;
		}

		periods = periods.filter((p) => p.number !== periodNumber);
		showModal = false;
	}

	/**
	 * Move period up in list
	 */
	function handleMoveUp(index: number) {
		if (index === 0) return;
		const newPeriods = [...periods];
		[newPeriods[index], newPeriods[index - 1]] = [newPeriods[index - 1], newPeriods[index]];
		periods = newPeriods;
	}

	/**
	 * Move period down in list
	 */
	function handleMoveDown(index: number) {
		if (index === periods.length - 1) return;
		const newPeriods = [...periods];
		[newPeriods[index], newPeriods[index + 1]] = [newPeriods[index + 1], newPeriods[index]];
		periods = newPeriods;
	}

	/**
	 * Load default timetable template
	 */
	function handleLoadDefault() {
		if (
			periods.length > 0 &&
			!confirm('Cela remplacera toutes les périodes existantes. Continuer ?')
		) {
			return;
		}

		const defaultTimetable = createDefaultTimetable();
		periods = [...defaultTimetable.periods];
		toaster.info('Modèle de base chargé');
	}

	/**
	 * Save timetable to database
	 */
	async function handleSaveTimetable() {
		// Validate before saving
		const validation = validateTimetable(periods);
		if (!validation.valid) {
			toaster.error('Erreurs de validation');
			validation.errors.forEach((err) => {
				toaster.error(err.message);
			});
			return;
		}

		// Prepare data
		const formData = new FormData();
		formData.append(
			'timetable',
			JSON.stringify({
				periods: sortPeriods(periods) // Sort by time before saving
			})
		);

		try {
			const response = await fetch('?/updateTimetable', {
				method: 'POST',
				body: formData,
				headers: {
					'x-sveltekit-action': 'true'
				}
			});

			if (response.ok) {
				await invalidateAll();
				toaster.success('Emploi du temps mis à jour avec succès');
			} else {
				const result = await response.json();
				toaster.error(result?.message || 'Erreur lors de la sauvegarde');
			}
		} catch (error) {
			console.error('Error saving timetable:', error);
			toaster.error('Erreur lors de la sauvegarde');
		}
	}

	/**
	 * Navigate back to schools page
	 */
	function handleGoBack() {
		goto('/dashboard/admin/schools');
	}

	// Sorted periods for display
	let sortedPeriods = $derived(sortPeriods(periods));
</script>

<svelte:head>
	<title>Emploi du Temps - {data.school.name} - UbuMaths</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<div class="flex items-center gap-2 mb-2">
				<Button variant="ghost" size="sm" onclick={handleGoBack} class="gap-2">
					<ArrowLeft class="w-4 h-4" />
					Retour
				</Button>
			</div>
			<h1 class="text-3xl font-bold text-foreground">Emploi du Temps de l'École</h1>
			<p class="text-muted-foreground mt-2">
				{data.school.name}
			</p>
		</div>

		<div class="flex gap-2">
			<Button variant="outline" onclick={handleLoadDefault}>Charger Modèle de Base</Button>
			<Button onclick={handleAddPeriod} class="gap-2">
				<Plus class="w-4 h-4" />
				Ajouter Période
			</Button>
		</div>
	</div>

	<!-- Info Banner -->
	<div class="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-4">
		<p class="text-sm">
			<strong>Information:</strong> Les périodes définies ici seront utilisées par tous les enseignants
			lors de la création de leurs emplois du temps de classe. Les périodes doivent être identiques
			pour tous les jours de la semaine.
		</p>
	</div>

	<!-- Periods Table -->
	<div class="bg-card rounded-lg shadow border border-border overflow-hidden">
		{#if sortedPeriods.length > 0}
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="bg-muted border-b border-border">
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
							>
								Numéro
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
							>
								Nom
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
							>
								Horaires
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider"
							>
								Durée
							</th>
							<th
								class="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider"
							>
								Actions
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-border">
						{#each sortedPeriods as period, index}
							{@const duration =
								(new Date(`2000-01-01T${period.end_time}`).getTime() -
									new Date(`2000-01-01T${period.start_time}`).getTime()) /
								1000 /
								60}
							<tr class="hover:bg-muted/50 transition-colors">
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm font-medium text-foreground">Période {period.number}</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm text-muted-foreground">
										{period.name || '—'}
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm text-foreground">
										{formatPeriodTimes(period)}
									</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap">
									<div class="text-sm text-muted-foreground">{duration} min</div>
								</td>
								<td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
									<Button
										variant="ghost"
										size="sm"
										onclick={() => handleMoveUp(index)}
										disabled={index === 0}
										class="gap-1"
									>
										<MoveUp class="w-3 h-3" />
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onclick={() => handleMoveDown(index)}
										disabled={index === sortedPeriods.length - 1}
										class="gap-1"
									>
										<MoveDown class="w-3 h-3" />
									</Button>
									<Button variant="ghost" size="sm" onclick={() => handleEditPeriod(period)}>
										<Pencil class="w-4 h-4" />
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onclick={() => handleDeletePeriod(period.number)}
										class="text-destructive hover:text-destructive"
									>
										<Trash2 class="w-4 h-4" />
									</Button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Save Button -->
			<div class="bg-muted px-6 py-4 border-t border-border flex justify-end">
				<Button onclick={handleSaveTimetable}>Enregistrer l'Emploi du Temps</Button>
			</div>
		{:else}
			<!-- Empty State -->
			<div class="p-12 text-center">
				<h3 class="text-lg font-semibold text-foreground mb-2">Aucune période définie</h3>
				<p class="text-muted-foreground mb-4">
					Commencez par ajouter des périodes ou chargez le modèle de base.
				</p>
				<div class="flex gap-2 justify-center">
					<Button variant="outline" onclick={handleLoadDefault}>Charger Modèle de Base</Button>
					<Button onclick={handleAddPeriod}>Ajouter Première Période</Button>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Period Modal -->
{#if showModal}
	<div
		class="fixed inset-0 z-[100] overflow-y-auto"
		aria-labelledby="modal-title"
		role="dialog"
		aria-modal="true"
	>
		<div class="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 sm:p-0">
			<!-- Background overlay -->
			<div
				class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
				aria-hidden="true"
				onclick={() => (showModal = false)}
			></div>

			<!-- Modal panel -->
			<div
				class="relative inline-block align-middle bg-card rounded-lg text-left overflow-visible shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full border border-border"
			>
				<!-- Modal Header -->
				<div class="bg-card px-6 pt-6 pb-4 border-b border-border">
					<h3 class="text-lg font-medium text-foreground" id="modal-title">
						{modalMode === 'create' ? 'Ajouter une Période' : 'Modifier la Période'}
					</h3>
				</div>

				<!-- Modal Body -->
				<form
					onsubmit={(e) => {
						e.preventDefault();
						handleSavePeriod();
					}}
					class="bg-card px-6 py-4"
				>
					<div class="space-y-4">
						<!-- Period Number (disabled in edit mode) -->
						<div>
							<label for="number" class="block text-sm font-medium text-foreground mb-1">
								Numéro de Période
							</label>
							<Input
								type="number"
								id="number"
								bind:value={formData.number}
								disabled={modalMode === 'edit'}
								required
								min="1"
							/>
						</div>

						<!-- Period Name (optional) -->
						<div>
							<label for="name" class="block text-sm font-medium text-foreground mb-1">
								Nom (optionnel)
							</label>
							<Input
								type="text"
								id="name"
								bind:value={formData.name}
								placeholder="Ex: Pause du Matin, Déjeuner"
							/>
						</div>

						<!-- Time Range -->
						<div class="grid grid-cols-2 gap-4">
							<div>
								<label for="start_time" class="block text-sm font-medium text-foreground mb-1">
									Heure de Début *
								</label>
								<Input type="time" id="start_time" bind:value={formData.start_time} required />
							</div>

							<div>
								<label for="end_time" class="block text-sm font-medium text-foreground mb-1">
									Heure de Fin *
								</label>
								<Input type="time" id="end_time" bind:value={formData.end_time} required />
							</div>
						</div>
					</div>

					<!-- Modal Footer -->
					<div class="flex justify-between items-center mt-6">
						<!-- Delete button (edit mode only) -->
						{#if modalMode === 'edit' && editingPeriod}
							<Button
								type="button"
								variant="destructive"
								onclick={() => handleDeletePeriod(editingPeriod.number)}
								class="gap-2"
							>
								<Trash2 class="w-4 h-4" />
								Supprimer
							</Button>
						{:else}
							<div></div>
						{/if}

						<!-- Cancel/Save buttons -->
						<div class="flex gap-2">
							<Button type="button" variant="outline" onclick={() => (showModal = false)}>
								Annuler
							</Button>
							<Button type="submit">
								{modalMode === 'create' ? 'Créer' : 'Enregistrer'}
							</Button>
						</div>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
