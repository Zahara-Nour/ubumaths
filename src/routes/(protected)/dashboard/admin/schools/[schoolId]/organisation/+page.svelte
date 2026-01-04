<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Tabs from '$lib/components/ui/tabs';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { invalidateAll, goto } from '$app/navigation';
	import {
		formatPeriodTimes,
		validateTimetable,
		sortPeriods,
		getNextPeriodNumber,
		createDefaultTimetable,
		type SchoolPeriod
	} from '$lib/utils/timetable';
	import {
		ArrowLeft,
		Plus,
		Pencil,
		Trash2,
		MoveUp,
		MoveDown,
		Calendar,
		Copy,
		Check
	} from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import MySelect from '$lib/components/MySelect.svelte';

	// Types for the new academic tables
	type SchoolYear = {
		id: string;
		school_id: string;
		name: string;
		start_date: string;
		end_date: string;
		is_active: boolean;
		metadata: Record<string, unknown>;
		created_at: string;
		updated_at: string;
	};

	type AcademicPeriod = {
		id: string;
		school_year_id: string;
		type: string;
		name: string;
		start_date: string;
		end_date: string;
		period_order: number;
		color: string;
		metadata: Record<string, unknown>;
		created_at: string;
		updated_at: string;
	};

	type SchoolHoliday = {
		id: string;
		school_year_id: string;
		name: string;
		start_date: string;
		end_date: string;
		created_at: string;
		updated_at: string;
	};

	let { data, form }: { data: PageData; form: ActionData } = $props();

	// ========================================
	// State - Tabs
	// ========================================
	let activeTab = $state<'timetable' | 'periods'>('timetable');

	// ========================================
	// State - Timetable (existing)
	// ========================================
	let periods = $state<SchoolPeriod[]>(
		data.school.timetable?.periods ? [...data.school.timetable.periods] : []
	);

	let showTimetableModal = $state(false);
	let editingPeriod = $state<SchoolPeriod | null>(null);
	let timetableModalMode = $state<'create' | 'edit'>('create');

	let timetableFormData = $state({
		number: 1,
		name: '',
		start_time: '08:00',
		end_time: '09:00'
	});

	// ========================================
	// State - Academic Periods
	// ========================================
	let selectedYearId = $state<string | undefined>(data.activeYear?.id);
	let editingYear = $state<SchoolYear | null>(null);
	let editingAcademicPeriod = $state<AcademicPeriod | null>(null);
	let editingHoliday = $state<SchoolHoliday | null>(null);

	// Dialog references
	let yearDialog: HTMLDialogElement;
	let periodDialog: HTMLDialogElement;
	let holidayDialog: HTMLDialogElement;
	let duplicateDialog: HTMLDialogElement;
	let deleteYearDialog: HTMLDialogElement;

	// ========================================
	// Derived State
	// ========================================
	let selectedYear = $derived(
		data.schoolYears.find((y: SchoolYear) => y.id === selectedYearId) as SchoolYear | undefined
	);

	let displayedPeriods = $derived(
		selectedYearId
			? (data.academicPeriods as AcademicPeriod[]).filter(
					(p) => p.school_year_id === selectedYearId
				)
			: []
	);

	let displayedHolidays = $derived(
		selectedYearId
			? (data.schoolHolidays as SchoolHoliday[]).filter((h) => h.school_year_id === selectedYearId)
			: []
	);

	let sortedTimetablePeriods = $derived(sortPeriods(periods));

	let yearSelectItems = $derived(
		(data.schoolYears as SchoolYear[]).map((year) => ({
			value: year.id,
			label: year.name + (year.is_active ? ' (Active)' : '')
		}))
	);

	// ========================================
	// Utility Functions
	// ========================================

	/**
	 * Format date as DD/MM/YYYY
	 */
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		return date.toLocaleDateString('fr-FR', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric'
		});
	}

	/**
	 * Format date range as DD/MM - DD/MM or DD/MM/YYYY - DD/MM/YYYY
	 */
	function formatDateRange(start: string, end: string, short = true): string {
		if (short) {
			const startDate = new Date(start);
			const endDate = new Date(end);
			return `${startDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} - ${endDate.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}`;
		}
		return `${formatDate(start)} - ${formatDate(end)}`;
	}

	// ========================================
	// Timetable Functions (existing)
	// ========================================

	function handleAddTimetablePeriod() {
		timetableModalMode = 'create';
		editingPeriod = null;
		timetableFormData = {
			number: getNextPeriodNumber(periods),
			name: '',
			start_time: '08:00',
			end_time: '09:00'
		};
		showTimetableModal = true;
	}

	function handleEditTimetablePeriod(period: SchoolPeriod) {
		timetableModalMode = 'edit';
		editingPeriod = period;
		timetableFormData = {
			number: period.number,
			name: period.name || '',
			start_time: period.start_time.substring(0, 5),
			end_time: period.end_time.substring(0, 5)
		};
		showTimetableModal = true;
	}

	function handleSaveTimetablePeriod() {
		const newPeriod: SchoolPeriod = {
			number: timetableFormData.number,
			name: timetableFormData.name.trim() || null,
			start_time: timetableFormData.start_time + ':00',
			end_time: timetableFormData.end_time + ':00'
		};

		if (timetableModalMode === 'create') {
			periods = [...periods, newPeriod];
		} else {
			periods = periods.map((p) => (p.number === editingPeriod?.number ? newPeriod : p));
		}

		showTimetableModal = false;
	}

	function handleDeleteTimetablePeriod(periodNumber: number) {
		if (!confirm('Êtes-vous sûr de vouloir supprimer cette période ?')) {
			return;
		}
		periods = periods.filter((p) => p.number !== periodNumber);
		showTimetableModal = false;
	}

	function handleMoveUp(index: number) {
		if (index === 0) return;
		const newPeriods = [...periods];
		[newPeriods[index], newPeriods[index - 1]] = [newPeriods[index - 1], newPeriods[index]];
		periods = newPeriods;
	}

	function handleMoveDown(index: number) {
		if (index === periods.length - 1) return;
		const newPeriods = [...periods];
		[newPeriods[index], newPeriods[index + 1]] = [newPeriods[index + 1], newPeriods[index]];
		periods = newPeriods;
	}

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

	async function handleSaveTimetable() {
		const validation = validateTimetable(periods);
		if (!validation.valid) {
			toaster.error('Erreurs de validation');
			validation.errors.forEach((err) => {
				toaster.error(err.message);
			});
			return;
		}

		const formData = new FormData();
		formData.append(
			'timetable',
			JSON.stringify({
				periods: sortPeriods(periods)
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

	// ========================================
	// Academic Year Functions
	// ========================================

	function openYearDialog(year: SchoolYear | null = null) {
		editingYear = year;
		yearDialog?.showModal();
	}

	function closeYearDialog() {
		editingYear = null;
		yearDialog?.close();
	}

	function openDeleteYearDialog(year: SchoolYear) {
		editingYear = year;
		deleteYearDialog?.showModal();
	}

	function closeDeleteYearDialog() {
		editingYear = null;
		deleteYearDialog?.close();
	}

	function openDuplicateDialog() {
		if (!data.activeYear) {
			toaster.warning('Aucune année active à dupliquer');
			return;
		}
		duplicateDialog?.showModal();
	}

	function closeDuplicateDialog() {
		duplicateDialog?.close();
	}

	async function handleSetActiveYear(yearId: string) {
		const formData = new FormData();
		formData.append('id', yearId);

		try {
			const response = await fetch('?/setActiveYear', {
				method: 'POST',
				body: formData,
				headers: {
					'x-sveltekit-action': 'true'
				}
			});

			if (response.ok) {
				await invalidateAll();
				toaster.success('Année active définie');
			} else {
				toaster.error("Erreur lors de la définition de l'année active");
			}
		} catch (error) {
			console.error('Error setting active year:', error);
			toaster.error("Erreur lors de la définition de l'année active");
		}
	}

	// ========================================
	// Academic Period Functions
	// ========================================

	function openPeriodDialog(period: AcademicPeriod | null = null) {
		editingAcademicPeriod = period;
		periodDialog?.showModal();
	}

	function closePeriodDialog() {
		editingAcademicPeriod = null;
		periodDialog?.close();
	}

	// ========================================
	// Holiday Functions
	// ========================================

	function openHolidayDialog(holiday: SchoolHoliday | null = null) {
		editingHoliday = holiday;
		holidayDialog?.showModal();
	}

	function closeHolidayDialog() {
		editingHoliday = null;
		holidayDialog?.close();
	}

	// ========================================
	// Navigation
	// ========================================

	function handleGoBack() {
		goto('/dashboard/admin/schools').then(() => {});
	}

	// ========================================
	// Form Result Handling
	// ========================================

	$effect(() => {
		if (form?.success) {
			toaster.success(form.message || 'Opération réussie');
			closeYearDialog();
			closePeriodDialog();
			closeHolidayDialog();
			closeDuplicateDialog();
			closeDeleteYearDialog();
			invalidateAll().then(() => {});
		} else if (form?.error) {
			toaster.error(form.error);
		}
	});
</script>

<svelte:head>
	<title>Organisation - {data.school.name} - UbuMaths</title>
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
			<h1 class="text-3xl font-bold text-foreground">Organisation de l'École</h1>
			<p class="mt-2 text-muted-foreground">
				{data.school.name}
			</p>
		</div>
	</div>

	<!-- Tabs -->
	<Tabs.Root bind:value={activeTab}>
		<Tabs.List class="grid w-full grid-cols-2">
			<Tabs.Trigger value="timetable">Emploi du temps</Tabs.Trigger>
			<Tabs.Trigger value="periods">Périodes académiques</Tabs.Trigger>
		</Tabs.List>

		<!-- ========================================
		     Tab 1: Timetable (Existing)
		     ======================================== -->
		<Tabs.Content value="timetable" class="space-y-6">
			<!-- Info Banner -->
			<div
				class="rounded-lg border border-blue-200 bg-blue-50 p-4 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200"
			>
				<p class="text-sm">
					<strong>Information:</strong> Les périodes définies ici seront utilisées par tous les enseignants
					lors de la création de leurs emplois du temps de classe. Les périodes doivent être identiques
					pour tous les jours de la semaine.
				</p>
			</div>

			<!-- Action Buttons -->
			<div class="flex gap-2">
				<Button variant="outline" onclick={handleLoadDefault}>Charger Modèle de Base</Button>
				<Button onclick={handleAddTimetablePeriod} class="gap-2">
					<Plus class="h-4 w-4" />
					Ajouter Période
				</Button>
			</div>

			<!-- Periods Table -->
			<div class="overflow-hidden rounded-lg border border-border bg-card shadow">
				{#if sortedTimetablePeriods.length > 0}
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
								{#each sortedTimetablePeriods as period, index (period.number)}
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
										<td
											class="space-x-2 px-6 py-4 text-right text-sm font-medium whitespace-nowrap"
										>
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
												disabled={index === sortedTimetablePeriods.length - 1}
												class="gap-1"
											>
												<MoveDown class="h-3 w-3" />
											</Button>
											<Button
												variant="ghost"
												size="sm"
												onclick={() => handleEditTimetablePeriod(period)}
											>
												<Pencil class="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="sm"
												onclick={() => handleDeleteTimetablePeriod(period.number)}
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
							<Button onclick={handleAddTimetablePeriod}>Ajouter Première Période</Button>
						</div>
					</div>
				{/if}
			</div>
		</Tabs.Content>

		<!-- ========================================
		     Tab 2: Academic Periods (New)
		     ======================================== -->
		<Tabs.Content value="periods" class="space-y-6">
			<!-- Year Management Section -->
			<div class="rounded-lg border border-border bg-card p-6 shadow">
				<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
					<div class="flex flex-wrap items-center gap-3">
						<span class="text-sm font-medium text-foreground">Année scolaire:</span>
						{#if yearSelectItems.length > 0}
							<MySelect
								type="single"
								bind:value={selectedYearId}
								items={yearSelectItems}
								placeholder="Sélectionner une année"
								triggerClass="h-9 w-48 rounded-md border"
							/>
						{:else}
							<span class="text-sm text-muted-foreground">Aucune année définie</span>
						{/if}
						{#if selectedYear}
							<div class="flex items-center gap-2 text-sm text-muted-foreground">
								<span>{formatDateRange(selectedYear.start_date, selectedYear.end_date, false)}</span
								>
								{#if selectedYear.is_active}
									<span
										class="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200"
									>
										<Check class="h-3 w-3" />
										Active
									</span>
								{:else}
									<Button
										variant="outline"
										size="sm"
										onclick={() => handleSetActiveYear(selectedYear.id)}
										class="gap-1 text-xs"
									>
										<Check class="h-3 w-3" />
										Activer
									</Button>
								{/if}
							</div>
						{/if}
					</div>
					<div class="flex gap-2">
						<Button variant="outline" onclick={() => openYearDialog(null)} class="gap-2">
							<Plus class="h-4 w-4" />
							Créer
						</Button>
						{#if selectedYear}
							<Button variant="outline" onclick={() => openYearDialog(selectedYear)} class="gap-2">
								<Pencil class="h-4 w-4" />
								Modifier
							</Button>
							<Button variant="outline" onclick={openDuplicateDialog} class="gap-2">
								<Copy class="h-4 w-4" />
								Dupliquer
							</Button>
						{/if}
					</div>
				</div>
			</div>

			{#if selectedYear}
				<!-- Périodes d'enseignement Section -->
				<div class="rounded-lg border border-border bg-card shadow">
					<div class="flex items-center justify-between border-b border-border bg-muted px-6 py-4">
						<div class="flex items-center gap-2">
							<Calendar class="h-5 w-5 text-muted-foreground" />
							<h2 class="text-lg font-semibold text-foreground">Périodes d'enseignement</h2>
						</div>
						<Button onclick={() => openPeriodDialog(null)} size="sm" class="gap-2">
							<Plus class="h-4 w-4" />
							Ajouter une période
						</Button>
					</div>

					{#if displayedPeriods.length > 0}
						<div class="overflow-x-auto">
							<table class="w-full">
								<thead class="border-b border-border bg-muted/50">
									<tr>
										<th
											class="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase"
										>
											Ordre
										</th>
										<th
											class="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase"
										>
											Type
										</th>
										<th
											class="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase"
										>
											Nom
										</th>
										<th
											class="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase"
										>
											Dates
										</th>
										<th
											class="px-6 py-3 text-right text-xs font-medium tracking-wider text-muted-foreground uppercase"
										>
											Actions
										</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-border">
									{#each displayedPeriods as period (period.id)}
										<tr class="transition-colors hover:bg-muted/50">
											<td class="px-6 py-4 whitespace-nowrap">
												<div class="flex items-center gap-2">
													<span
														class="inline-block h-3 w-3 rounded-full"
														style="background-color: {period.color}"
													></span>
													<span class="text-sm font-medium text-foreground"
														>{period.period_order}</span
													>
												</div>
											</td>
											<td class="px-6 py-4 whitespace-nowrap">
												<span class="text-sm text-muted-foreground capitalize">{period.type}</span>
											</td>
											<td class="px-6 py-4 whitespace-nowrap">
												<span class="text-sm text-foreground">{period.name}</span>
											</td>
											<td class="px-6 py-4 whitespace-nowrap">
												<span class="text-sm text-muted-foreground">
													{formatDateRange(period.start_date, period.end_date)}
												</span>
											</td>
											<td
												class="space-x-2 px-6 py-4 text-right text-sm font-medium whitespace-nowrap"
											>
												<Button variant="ghost" size="sm" onclick={() => openPeriodDialog(period)}>
													<Pencil class="h-4 w-4" />
												</Button>
												<form
													method="POST"
													action="?/deletePeriod"
													use:enhance
													class="inline-block"
												>
													<input type="hidden" name="id" value={period.id} />
													<Button
														type="submit"
														variant="ghost"
														size="sm"
														class="text-destructive hover:text-destructive"
														onclick={(e) => {
															if (!confirm('Êtes-vous sûr de vouloir supprimer cette période ?')) {
																e.preventDefault();
															}
														}}
													>
														<Trash2 class="h-4 w-4" />
													</Button>
												</form>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{:else}
						<div class="p-8 text-center">
							<p class="mb-4 text-muted-foreground">
								Aucune période définie pour cette année scolaire.
							</p>
							<Button onclick={() => openPeriodDialog(null)} class="gap-2">
								<Plus class="h-4 w-4" />
								Ajouter une période
							</Button>
						</div>
					{/if}
				</div>

				<!-- Vacances scolaires Section -->
				<div class="rounded-lg border border-border bg-card shadow">
					<div class="flex items-center justify-between border-b border-border bg-muted px-6 py-4">
						<div class="flex items-center gap-2">
							<span class="text-lg">🏖️</span>
							<h2 class="text-lg font-semibold text-foreground">Vacances scolaires</h2>
						</div>
						<Button onclick={() => openHolidayDialog(null)} size="sm" class="gap-2">
							<Plus class="h-4 w-4" />
							Ajouter des vacances
						</Button>
					</div>

					{#if displayedHolidays.length > 0}
						<div class="overflow-x-auto">
							<table class="w-full">
								<thead class="border-b border-border bg-muted/50">
									<tr>
										<th
											class="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase"
										>
											Nom
										</th>
										<th
											class="px-6 py-3 text-left text-xs font-medium tracking-wider text-muted-foreground uppercase"
										>
											Dates
										</th>
										<th
											class="px-6 py-3 text-right text-xs font-medium tracking-wider text-muted-foreground uppercase"
										>
											Actions
										</th>
									</tr>
								</thead>
								<tbody class="divide-y divide-border">
									{#each displayedHolidays as holiday (holiday.id)}
										<tr class="transition-colors hover:bg-muted/50">
											<td class="px-6 py-4 whitespace-nowrap">
												<span class="text-sm font-medium text-foreground">{holiday.name}</span>
											</td>
											<td class="px-6 py-4 whitespace-nowrap">
												<span class="text-sm text-muted-foreground">
													{formatDateRange(holiday.start_date, holiday.end_date)}
												</span>
											</td>
											<td
												class="space-x-2 px-6 py-4 text-right text-sm font-medium whitespace-nowrap"
											>
												<Button
													variant="ghost"
													size="sm"
													onclick={() => openHolidayDialog(holiday)}
												>
													<Pencil class="h-4 w-4" />
												</Button>
												<form
													method="POST"
													action="?/deleteHoliday"
													use:enhance
													class="inline-block"
												>
													<input type="hidden" name="id" value={holiday.id} />
													<Button
														type="submit"
														variant="ghost"
														size="sm"
														class="text-destructive hover:text-destructive"
														onclick={(e) => {
															if (!confirm('Êtes-vous sûr de vouloir supprimer ces vacances ?')) {
																e.preventDefault();
															}
														}}
													>
														<Trash2 class="h-4 w-4" />
													</Button>
												</form>
											</td>
										</tr>
									{/each}
								</tbody>
							</table>
						</div>
					{:else}
						<div class="p-8 text-center">
							<p class="mb-4 text-muted-foreground">
								Aucunes vacances définies pour cette année scolaire.
							</p>
							<Button onclick={() => openHolidayDialog(null)} class="gap-2">
								<Plus class="h-4 w-4" />
								Ajouter des vacances
							</Button>
						</div>
					{/if}
				</div>
			{:else}
				<!-- No Year Selected State -->
				<div class="rounded-lg border border-border bg-card p-12 text-center shadow">
					<h3 class="mb-2 text-lg font-semibold text-foreground">Aucune année sélectionnée</h3>
					<p class="mb-4 text-muted-foreground">
						Créez une année scolaire pour commencer à définir les périodes et les vacances.
					</p>
					<Button onclick={() => openYearDialog(null)} class="gap-2">
						<Plus class="h-4 w-4" />
						Créer une année scolaire
					</Button>
				</div>
			{/if}
		</Tabs.Content>
	</Tabs.Root>
</div>

<!-- ========================================
     Timetable Period Modal (existing)
     ======================================== -->
{#if showTimetableModal}
	<div
		class="fixed inset-0 z-[100] overflow-y-auto"
		aria-labelledby="timetable-modal-title"
		role="dialog"
		aria-modal="true"
	>
		<div class="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 sm:p-0">
			<div
				class="bg-opacity-50 fixed inset-0 bg-black transition-opacity"
				aria-hidden="true"
				onclick={() => (showTimetableModal = false)}
			></div>

			<div
				class="relative inline-block transform overflow-visible rounded-lg border border-border bg-card text-left align-middle shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg"
			>
				<div class="border-b border-border bg-card px-6 pt-6 pb-4">
					<h3 class="text-lg font-medium text-foreground" id="timetable-modal-title">
						{timetableModalMode === 'create' ? 'Ajouter une Période' : 'Modifier la Période'}
					</h3>
				</div>

				<form
					onsubmit={(e) => {
						e.preventDefault();
						handleSaveTimetablePeriod();
					}}
					class="bg-card px-6 py-4"
				>
					<div class="space-y-4">
						<div>
							<label for="number" class="mb-1 block text-sm font-medium text-foreground">
								Numéro de Période
							</label>
							<Input
								type="number"
								id="number"
								bind:value={timetableFormData.number}
								disabled={timetableModalMode === 'edit'}
								required
								min="1"
							/>
						</div>

						<div>
							<label for="name" class="mb-1 block text-sm font-medium text-foreground">
								Nom (optionnel)
							</label>
							<Input
								type="text"
								id="name"
								bind:value={timetableFormData.name}
								placeholder="Ex: Pause du Matin, Déjeuner"
							/>
						</div>

						<div class="grid grid-cols-2 gap-4">
							<div>
								<label for="start_time" class="mb-1 block text-sm font-medium text-foreground">
									Heure de Début *
								</label>
								<Input
									type="time"
									id="start_time"
									bind:value={timetableFormData.start_time}
									required
								/>
							</div>

							<div>
								<label for="end_time" class="mb-1 block text-sm font-medium text-foreground">
									Heure de Fin *
								</label>
								<Input type="time" id="end_time" bind:value={timetableFormData.end_time} required />
							</div>
						</div>
					</div>

					<div class="mt-6 flex items-center justify-between">
						{#if timetableModalMode === 'edit' && editingPeriod}
							<Button
								type="button"
								variant="destructive"
								onclick={() => editingPeriod && handleDeleteTimetablePeriod(editingPeriod.number)}
								class="gap-2"
							>
								<Trash2 class="h-4 w-4" />
								Supprimer
							</Button>
						{:else}
							<div></div>
						{/if}

						<div class="flex gap-2">
							<Button type="button" variant="outline" onclick={() => (showTimetableModal = false)}>
								Annuler
							</Button>
							<Button type="submit">
								{timetableModalMode === 'create' ? 'Créer' : 'Enregistrer'}
							</Button>
						</div>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}

<!-- ========================================
     Year Dialog (Create/Edit)
     ======================================== -->
<dialog
	bind:this={yearDialog}
	class="rounded-lg border border-border bg-card p-0 shadow-xl backdrop:bg-black/50"
>
	<div class="w-full max-w-lg min-w-[500px]">
		<div class="border-b border-border px-6 pt-6 pb-4">
			<h2 class="text-lg font-semibold text-foreground">
				{editingYear ? 'Modifier' : 'Créer'} l'année scolaire
			</h2>
		</div>

		<form
			method="POST"
			action="?/{editingYear ? 'updateYear' : 'createYear'}"
			use:enhance
			class="px-6 py-4"
		>
			{#if editingYear}
				<input type="hidden" name="id" value={editingYear.id} />
			{/if}

			<div class="space-y-4">
				<!-- General error message -->
				{#if form?.error}
					<div
						class="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400"
					>
						{form.error}
					</div>
				{/if}

				<div>
					<label for="year-name" class="mb-1 block text-sm font-medium text-foreground">
						Nom (ex: 2024-2025) *
					</label>
					<Input
						type="text"
						id="year-name"
						name="name"
						value={editingYear?.name ?? ''}
						required
						placeholder="2024-2025"
						class={form && 'errors' in form && (form.errors as Record<string, string[]>)?.name
							? 'border-red-500'
							: ''}
					/>
					{#if form && 'errors' in form && (form.errors as Record<string, string[]>)?.name}
						<p class="mt-1 text-sm text-red-600 dark:text-red-400">
							{(form.errors as Record<string, string[]>).name[0]}
						</p>
					{/if}
					<p class="mt-1 text-xs text-muted-foreground">
						Format requis: YYYY-YYYY avec tiret simple (années consécutives)
					</p>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<div>
						<label for="year-start" class="mb-1 block text-sm font-medium text-foreground">
							Date de début *
						</label>
						<Input
							type="date"
							id="year-start"
							name="start_date"
							value={editingYear?.start_date ?? ''}
							required
							class={form &&
							'errors' in form &&
							(form.errors as Record<string, string[]>)?.start_date
								? 'border-red-500'
								: ''}
						/>
						{#if form && 'errors' in form && (form.errors as Record<string, string[]>)?.start_date}
							<p class="mt-1 text-sm text-red-600 dark:text-red-400">
								{(form.errors as Record<string, string[]>).start_date[0]}
							</p>
						{/if}
					</div>

					<div>
						<label for="year-end" class="mb-1 block text-sm font-medium text-foreground">
							Date de fin *
						</label>
						<Input
							type="date"
							id="year-end"
							name="end_date"
							value={editingYear?.end_date ?? ''}
							required
							class={form && 'errors' in form && (form.errors as Record<string, string[]>)?.end_date
								? 'border-red-500'
								: ''}
						/>
						{#if form && 'errors' in form && (form.errors as Record<string, string[]>)?.end_date}
							<p class="mt-1 text-sm text-red-600 dark:text-red-400">
								{(form.errors as Record<string, string[]>).end_date[0]}
							</p>
						{/if}
					</div>
				</div>

				<div class="flex items-center gap-2">
					<input
						type="checkbox"
						id="year-active"
						name="is_active"
						value="true"
						checked={editingYear?.is_active ?? false}
						class="h-4 w-4 rounded border-border"
					/>
					<label for="year-active" class="text-sm text-foreground"> Année active </label>
				</div>
			</div>

			<div class="mt-6 flex items-center justify-between">
				{#if editingYear}
					<Button
						type="button"
						variant="destructive"
						onclick={() => {
							if (editingYear) {
								closeYearDialog();
								openDeleteYearDialog(editingYear);
							}
						}}
						class="gap-2"
					>
						<Trash2 class="h-4 w-4" />
						Supprimer
					</Button>
				{:else}
					<div></div>
				{/if}

				<div class="flex gap-2">
					<Button type="button" variant="outline" onclick={closeYearDialog}>Annuler</Button>
					<Button type="submit">Enregistrer</Button>
				</div>
			</div>
		</form>
	</div>
</dialog>

<!-- ========================================
     Delete Year Confirmation Dialog
     ======================================== -->
<dialog
	bind:this={deleteYearDialog}
	class="rounded-lg border border-border bg-card p-0 shadow-xl backdrop:bg-black/50"
>
	<div class="w-full max-w-md min-w-[400px]">
		<div class="border-b border-border px-6 pt-6 pb-4">
			<h2 class="text-lg font-semibold text-foreground">Confirmer la suppression</h2>
		</div>

		<div class="px-6 py-4">
			<p class="text-sm text-muted-foreground">
				Êtes-vous sûr de vouloir supprimer l'année scolaire <strong class="text-foreground"
					>{editingYear?.name}</strong
				> ? Cette action supprimera également toutes les périodes et vacances associées.
			</p>
		</div>

		<form method="POST" action="?/deleteYear" use:enhance class="border-t border-border px-6 py-4">
			{#if editingYear}
				<input type="hidden" name="id" value={editingYear.id} />
			{/if}

			<div class="flex justify-end gap-2">
				<Button type="button" variant="outline" onclick={closeDeleteYearDialog}>Annuler</Button>
				<Button type="submit" variant="destructive">Supprimer</Button>
			</div>
		</form>
	</div>
</dialog>

<!-- ========================================
     Period Dialog (Create/Edit)
     ======================================== -->
<dialog
	bind:this={periodDialog}
	class="rounded-lg border border-border bg-card p-0 shadow-xl backdrop:bg-black/50"
>
	<div class="w-full max-w-lg min-w-[500px]">
		<div class="border-b border-border px-6 pt-6 pb-4">
			<h2 class="text-lg font-semibold text-foreground">
				{editingAcademicPeriod ? 'Modifier' : 'Créer'} la période
			</h2>
		</div>

		{#key editingAcademicPeriod?.id ?? 'new'}
			<form
				method="POST"
				action="?/{editingAcademicPeriod ? 'updatePeriod' : 'createPeriod'}"
				use:enhance
				class="px-6 py-4"
			>
				{#if editingAcademicPeriod}
					<input type="hidden" name="id" value={editingAcademicPeriod.id} />
				{:else}
					<input type="hidden" name="school_year_id" value={selectedYearId} />
				{/if}

				<div class="space-y-4">
					<div>
						<label for="period-type" class="mb-1 block text-sm font-medium text-foreground">
							Type *
						</label>
						<select
							id="period-type"
							name="type"
							required
							class="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
						>
							<option value="trimester" selected={editingAcademicPeriod?.type === 'trimester'}
								>Trimestre</option
							>
							<option value="semester" selected={editingAcademicPeriod?.type === 'semester'}
								>Semestre</option
							>
							<option value="quarter" selected={editingAcademicPeriod?.type === 'quarter'}
								>Quadrimestre</option
							>
							<option value="custom" selected={editingAcademicPeriod?.type === 'custom'}
								>Personnalisé</option
							>
						</select>
					</div>

					<div>
						<label for="period-name" class="mb-1 block text-sm font-medium text-foreground">
							Nom *
						</label>
						<Input
							type="text"
							id="period-name"
							name="name"
							value={editingAcademicPeriod?.name ?? ''}
							required
							placeholder="Trimestre 1"
						/>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label for="period-start" class="mb-1 block text-sm font-medium text-foreground">
								Date de début *
							</label>
							<Input
								type="date"
								id="period-start"
								name="start_date"
								value={editingAcademicPeriod?.start_date ?? ''}
								required
							/>
						</div>

						<div>
							<label for="period-end" class="mb-1 block text-sm font-medium text-foreground">
								Date de fin *
							</label>
							<Input
								type="date"
								id="period-end"
								name="end_date"
								value={editingAcademicPeriod?.end_date ?? ''}
								required
							/>
						</div>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label for="period-order" class="mb-1 block text-sm font-medium text-foreground">
								Ordre *
							</label>
							<Input
								type="number"
								id="period-order"
								name="period_order"
								value={editingAcademicPeriod?.period_order ?? 1}
								required
								min="1"
								max="10"
							/>
						</div>

						<div>
							<label for="period-color" class="mb-1 block text-sm font-medium text-foreground">
								Couleur *
							</label>
							<Input
								type="color"
								id="period-color"
								name="color"
								value={editingAcademicPeriod?.color || '#3b82f6'}
								class="h-9"
							/>
						</div>
					</div>
				</div>

				<div class="mt-6 flex items-center justify-between">
					{#if editingAcademicPeriod}
						<Button
							type="button"
							variant="destructive"
							class="gap-2"
							onclick={async () => {
								if (!confirm('Êtes-vous sûr de vouloir supprimer cette période ?')) {
									return;
								}
								const formData = new FormData();
								formData.append('id', editingAcademicPeriod?.id ?? '');
								try {
									const response = await fetch('?/deletePeriod', {
										method: 'POST',
										body: formData,
										headers: { 'x-sveltekit-action': 'true' }
									});
									if (response.ok) {
										await invalidateAll();
										toaster.success('Période supprimée');
										closePeriodDialog();
									} else {
										toaster.error('Erreur lors de la suppression');
									}
								} catch (error) {
									console.error('Error deleting period:', error);
									toaster.error('Erreur lors de la suppression');
								}
							}}
						>
							<Trash2 class="h-4 w-4" />
							Supprimer
						</Button>
					{:else}
						<div></div>
					{/if}

					<div class="flex gap-2">
						<Button type="button" variant="outline" onclick={closePeriodDialog}>Annuler</Button>
						<Button type="submit">Enregistrer</Button>
					</div>
				</div>
			</form>
		{/key}
	</div>
</dialog>

<!-- ========================================
     Holiday Dialog (Create/Edit)
     ======================================== -->
<dialog
	bind:this={holidayDialog}
	class="rounded-lg border border-border bg-card p-0 shadow-xl backdrop:bg-black/50"
>
	<div class="w-full max-w-lg min-w-[500px]">
		<div class="border-b border-border px-6 pt-6 pb-4">
			<h2 class="text-lg font-semibold text-foreground">
				{editingHoliday ? 'Modifier' : 'Créer'} les vacances
			</h2>
		</div>

		{#key editingHoliday?.id ?? 'new'}
			<form
				method="POST"
				action="?/{editingHoliday ? 'updateHoliday' : 'createHoliday'}"
				use:enhance
				class="px-6 py-4"
			>
				{#if editingHoliday}
					<input type="hidden" name="id" value={editingHoliday.id} />
				{:else}
					<input type="hidden" name="school_year_id" value={selectedYearId} />
				{/if}

				<div class="space-y-4">
					<div>
						<label for="holiday-name" class="mb-1 block text-sm font-medium text-foreground">
							Nom *
						</label>
						<Input
							type="text"
							id="holiday-name"
							name="name"
							value={editingHoliday?.name ?? ''}
							required
							placeholder="Vacances de Noël"
						/>
					</div>

					<div class="grid grid-cols-2 gap-4">
						<div>
							<label for="holiday-start" class="mb-1 block text-sm font-medium text-foreground">
								Date de début *
							</label>
							<Input
								type="date"
								id="holiday-start"
								name="start_date"
								value={editingHoliday?.start_date ?? ''}
								required
							/>
						</div>

						<div>
							<label for="holiday-end" class="mb-1 block text-sm font-medium text-foreground">
								Date de fin *
							</label>
							<Input
								type="date"
								id="holiday-end"
								name="end_date"
								value={editingHoliday?.end_date ?? ''}
								required
							/>
						</div>
					</div>
				</div>

				<div class="mt-6 flex items-center justify-between">
					{#if editingHoliday}
						<Button
							type="button"
							variant="destructive"
							class="gap-2"
							onclick={async () => {
								if (!confirm('Êtes-vous sûr de vouloir supprimer ces vacances ?')) {
									return;
								}
								const formData = new FormData();
								formData.append('id', editingHoliday?.id ?? '');
								try {
									const response = await fetch('?/deleteHoliday', {
										method: 'POST',
										body: formData,
										headers: { 'x-sveltekit-action': 'true' }
									});
									if (response.ok) {
										await invalidateAll();
										toaster.success('Vacances supprimées');
										closeHolidayDialog();
									} else {
										toaster.error('Erreur lors de la suppression');
									}
								} catch (error) {
									console.error('Error deleting holiday:', error);
									toaster.error('Erreur lors de la suppression');
								}
							}}
						>
							<Trash2 class="h-4 w-4" />
							Supprimer
						</Button>
					{:else}
						<div></div>
					{/if}

					<div class="flex gap-2">
						<Button type="button" variant="outline" onclick={closeHolidayDialog}>Annuler</Button>
						<Button type="submit">Enregistrer</Button>
					</div>
				</div>
			</form>
		{/key}
	</div>
</dialog>

<!-- ========================================
     Duplicate Year Wizard Dialog
     ======================================== -->
<dialog
	bind:this={duplicateDialog}
	class="rounded-lg border border-border bg-card p-0 shadow-xl backdrop:bg-black/50"
>
	<div class="w-full max-w-2xl min-w-[600px]">
		<div class="border-b border-border px-6 pt-6 pb-4">
			<h2 class="text-lg font-semibold text-foreground">Dupliquer l'année scolaire</h2>
		</div>

		<form method="POST" action="?/duplicateYear" use:enhance class="px-6 py-4">
			{#if data.activeYear}
				<input type="hidden" name="source_year_id" value={data.activeYear.id} />
			{/if}

			<div class="space-y-4">
				<div
					class="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200"
				>
					<p>
						<strong>Source:</strong>
						{data.activeYear?.name}
						({formatDateRange(
							data.activeYear?.start_date ?? '',
							data.activeYear?.end_date ?? '',
							false
						)})
					</p>
				</div>

				<div>
					<label for="target-year-name" class="mb-1 block text-sm font-medium text-foreground">
						Nouvelle année (ex: 2025-2026) *
					</label>
					<Input
						type="text"
						id="target-year-name"
						name="target_year_name"
						required
						pattern="\d{4}-\d{4}"
						placeholder="2025-2026"
					/>
				</div>

				<div>
					<label for="date-offset" class="mb-1 block text-sm font-medium text-foreground">
						Décalage en jours *
					</label>
					<Input type="number" id="date-offset" name="date_offset_days" value="365" required />
					<p class="mt-1 text-xs text-muted-foreground">365 = +1 an, -365 = -1 an</p>
				</div>

				<div class="space-y-2">
					<p class="text-sm font-medium text-foreground">Éléments à dupliquer:</p>
					<div class="space-y-2">
						<div class="flex items-center gap-2">
							<input
								type="checkbox"
								id="include-periods"
								name="include_periods"
								value="true"
								checked
								class="h-4 w-4 rounded border-border"
							/>
							<label for="include-periods" class="text-sm text-foreground">
								Périodes d'enseignement
							</label>
						</div>
						<div class="flex items-center gap-2">
							<input
								type="checkbox"
								id="include-holidays"
								name="include_holidays"
								value="true"
								checked
								class="h-4 w-4 rounded border-border"
							/>
							<label for="include-holidays" class="text-sm text-foreground">
								Vacances scolaires
							</label>
						</div>
					</div>
				</div>
			</div>

			<div class="mt-6 flex justify-end gap-2">
				<Button type="button" variant="outline" onclick={closeDuplicateDialog}>Annuler</Button>
				<Button type="submit" class="gap-2">
					<Copy class="h-4 w-4" />
					Dupliquer
				</Button>
			</div>
		</form>
	</div>
</dialog>
