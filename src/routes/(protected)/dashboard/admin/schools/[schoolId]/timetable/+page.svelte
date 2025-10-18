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
			<div class="mb-2 flex items-center gap-2">
				<Button variant="ghost" size="sm" onclick={handleGoBack} class="gap-2">
					<ArrowLeft class="h-4 w-4" />
					Retour
				</Button>
			</div>
			<h1 class="text-3xl font-bold text-foreground">Emploi du Temps de l'École</h1>
			<p class="mt-2 text-muted-foreground">
				{data.school.name}
			</p>
		</div>

		<div class="flex gap-2">
			<Button variant="outline" onclick={handleLoadDefault}>Charger Modèle de Base</Button>
			<Button onclick={handleAddPeriod} class="gap-2">
				<Plus class="h-4 w-4" />
				Ajouter Période
			</Button>
		</div>
	</div>

	<!-- Info Banner -->
	<div class="rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-800">
		<p class="text-sm">
			<strong>Information:</strong> Les périodes définies ici seront utilisées par tous les enseignants
			lors de la création de leurs emplois du temps de classe. Les périodes doivent être identiques pour
			tous les jours de la semaine.
		</p>
	</div>

	<!-- Periods Table -->
	<div class="overflow-hidden rounded-lg border border-border bg-card shadow">
		{#if sortedPeriods.length > 0}
			<div class="overflow-x-auto">
				<table class="w-full">
					<thead class="border-b border-border bg-muted">
						<tr>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase"
							>
								Numéro
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase"
							>
								Nom
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase"
							>
								Horaires
							</th>
							<th
								class="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase"
							>
								Durée
							</th>
							<th
								class="px-6 py-3 text-right text-xs font-medium tracking-wider text-muted-foreground uppercase"
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
							<tr class="transition-colors hover:bg-muted/50">
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
								<td class="space-x-2 px-6 py-4 text-right text-sm font-medium whitespace-nowrap">
									<Button
										variant="ghost"
										size="sm"
										onclick={() => handleMoveUp(index)}
										disabled={index === 0}
										class="gap-1"
									>
										<MoveUp class="h-3 w-3" />
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onclick={() => handleMoveDown(index)}
										disabled={index === sortedPeriods.length - 1}
										class="gap-1"
									>
										<MoveDown class="h-3 w-3" />
									</Button>
									<Button variant="ghost" size="sm" onclick={() => handleEditPeriod(period)}>
										<Pencil class="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="sm"
										onclick={() => handleDeletePeriod(period.number)}
										class="text-destructive hover:text-destructive"
									>
										<Trash2 class="h-4 w-4" />
									</Button>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Save Button -->
			<div class="flex justify-end border-t border-border bg-muted px-6 py-4">
				<Button onclick={handleSaveTimetable}>Enregistrer l'Emploi du Temps</Button>
			</div>
		{:else}
			<!-- Empty State -->
			<div class="p-12 text-center">
				<h3 class="mb-2 text-lg font-semibold text-foreground">Aucune période définie</h3>
				<p class="mb-4 text-muted-foreground">
					Commencez par ajouter des périodes ou chargez le modèle de base.
				</p>
				<div class="flex justify-center gap-2">
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
		<div class="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 sm:p-0">
			<!-- Background overlay -->
			<div
				class="bg-opacity-50 fixed inset-0 bg-black transition-opacity"
				aria-hidden="true"
				onclick={() => (showModal = false)}
			></div>

			<!-- Modal panel -->
			<div
				class="relative inline-block transform overflow-visible rounded-lg border border-border bg-card text-left align-middle shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg"
			>
				<!-- Modal Header -->
				<div class="border-b border-border bg-card px-6 pt-6 pb-4">
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
							<label for="number" class="mb-1 block text-sm font-medium text-foreground">
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
							<label for="name" class="mb-1 block text-sm font-medium text-foreground">
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
								<label for="start_time" class="mb-1 block text-sm font-medium text-foreground">
									Heure de Début *
								</label>
								<Input type="time" id="start_time" bind:value={formData.start_time} required />
							</div>

							<div>
								<label for="end_time" class="mb-1 block text-sm font-medium text-foreground">
									Heure de Fin *
								</label>
								<Input type="time" id="end_time" bind:value={formData.end_time} required />
							</div>
						</div>
					</div>

					<!-- Modal Footer -->
					<div class="mt-6 flex items-center justify-between">
						<!-- Delete button (edit mode only) -->
						{#if modalMode === 'edit' && editingPeriod}
							<Button
								type="button"
								variant="destructive"
								onclick={() => handleDeletePeriod(editingPeriod.number)}
								class="gap-2"
							>
								<Trash2 class="h-4 w-4" />
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
