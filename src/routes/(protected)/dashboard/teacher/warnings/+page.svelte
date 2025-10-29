<!--
	Warnings Management Page for Teachers
	=======================================

	This page allows teachers to manage student behavioral warnings across academic periods.

	FEATURES:
	---------
	- Select a class via Tabs component
	- View all students in the selected class with warning counts
	- Add warnings (C, M, R, T) via dropdown menu
	- Click warning badge to remove it (confirmation modal)
	- View statistics (avg score, min/max, total warnings)
	- View history by selecting different academic periods
	- Real-time score calculation (20 - total warnings)
	- Optimistic UI with instant feedback
	- Toast notifications for success/error feedback

	WARNING TYPES:
	--------------
	- C: Conduite (Behavior)
	- M: Manque de Travail (Lack of Work)
	- R: Retard (Late)
	- T: Tricherie (Cheating)

	SCORE CALCULATION:
	------------------
	score = 20 - total_warnings (clamped to 0-20)
	- ≥15: Green (good)
	- 10-14: Orange (warning)
	- <10: Red (critical)

	OPTIMISTIC UI PATTERN:
	----------------------
	Similar to rewards page - instant updates with debounced server sync.
	Each operation updates UI immediately, then syncs with backend.
-->

<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { getAvatarFallback, getAvatarInitials } from '$lib/utils/avatar';
	import { teacherStudentsCache } from '$lib/stores/teacherStudentsCache.svelte';
	import { warningsCache } from '$lib/stores/warningsCache.svelte';
	import { cacheEventBus } from '$lib/stores/cacheEventBus.svelte';
	import { History, AlertCircle } from 'lucide-svelte';
	import type { Warning, StudentWarningCounts } from '$lib/server/warnings';

	// Data from server load function
	let { data }: { data: PageData } = $props();

	// Local state for selected class and period
	let selectedClassId = $state(data.classes[0]?.id || '');
	let selectedPeriodId = $state(data.currentPeriod?.id || '');
	let showHistoryDialog = $state(false);

	// OPTIMISTIC UI STATE
	// Tracks temporary warning counts that override server data
	// Key: studentId, Value: optimistic warning counts
	let optimisticWarnings = $state<Record<string, StudentWarningCounts>>({});

	// DEBOUNCING STATE
	// Tracks pending add operations to batch rapid clicks
	// Key: studentId, Value: timeout ID
	let pendingAdds = $state<Record<string, number>>({});

	// Confirmation modal state
	let warningToDelete = $state<{
		warningId: string;
		studentId: string;
		studentName: string;
		warningType: string;
	} | null>(null);

	// Warning counts by student (fetched from API)
	let warningsData = $state<Map<string, StudentWarningCounts>>(new Map());
	let _isLoadingWarnings = $state(false);

	// ============================================================================
	// COMPUTED VALUES
	// ============================================================================

	/**
	 * Get currently selected period name
	 */
	let selectedPeriodName = $derived(
		data.allPeriods.find((p) => p.id === selectedPeriodId)?.name ||
			data.currentPeriod?.name ||
			'Période actuelle'
	);

	// ============================================================================
	// EFFECTS
	// ============================================================================

	/**
	 * Load warnings when class or period changes
	 */
	$effect(() => {
		if (selectedClassId && selectedPeriodId) {
			loadWarnings();
		}
	});

	/**
	 * Subscribe to Event Bus for cross-tab cache invalidation
	 */
	$effect(() => {
		const unsubscribe = cacheEventBus.subscribe((event) => {
			// Only respond to warnings or 'all' events
			if (event.type === 'warnings' || event.type === 'all') {
				// Check if the event matches our current class and period
				const matchesClass = !event.scope.classId || event.scope.classId === selectedClassId;
				const matchesPeriod = !event.scope.periodId || event.scope.periodId === selectedPeriodId;

				if (matchesClass && matchesPeriod) {
					loadWarnings();
				}
			}
		});

		// Cleanup subscription on unmount
		return unsubscribe;
	});

	/**
	 * Cleanup pending timeouts on unmount
	 */
	$effect(() => {
		return () => {
			Object.values(pendingAdds).forEach((timeoutId) => {
				clearTimeout(timeoutId);
			});
		};
	});

	// ============================================================================
	// HELPER FUNCTIONS
	// ============================================================================

	/**
	 * Get full name or identifier for student
	 */
	function getFullName(
		firstname: string | null,
		lastname: string | null,
		fullname: string | null
	): string {
		const name = [firstname, lastname].filter(Boolean).join(' ');
		if (name) return name;
		if (fullname) return fullname;
		return 'Élève sans nom';
	}

	/**
	 * Get warning counts for a student with optimistic override
	 */
	function getStudentWarnings(studentId: string): StudentWarningCounts {
		// Return optimistic value if it exists (user action pending)
		if (optimisticWarnings[studentId]) {
			return optimisticWarnings[studentId];
		}

		// Otherwise return server value
		return (
			warningsData.get(studentId) || {
				C: 0,
				M: 0,
				R: 0,
				T: 0,
				total: 0,
				score: 20,
				warnings: []
			}
		);
	}

	/**
	 * Get CSS class for score color coding
	 */
	function getScoreColor(score: number): string {
		if (score >= 15) return 'text-green-600 dark:text-green-400';
		if (score >= 10) return 'text-orange-600 dark:text-orange-400';
		return 'text-red-600 dark:text-red-400';
	}

	/**
	 * Get warning type label (French)
	 */
	function getWarningTypeLabel(type: string): string {
		const labels: Record<string, string> = {
			C: 'Conduite',
			M: 'Manque de Travail',
			R: 'Retard',
			T: 'Tricherie'
		};
		return labels[type] || type;
	}

	// ============================================================================
	// API FUNCTIONS
	// ============================================================================

	/**
	 * Load warnings for selected class and period
	 */
	async function loadWarnings() {
		if (!selectedClassId || !selectedPeriodId) return;

		_isLoadingWarnings = true;

		try {
			const response = await fetch(
				`/api/classes/${selectedClassId}/warnings?period_id=${selectedPeriodId}`
			);

			if (!response.ok) {
				throw new Error('Failed to fetch warnings');
			}

			const result = await response.json();

			// Convert array to Map for efficient lookups
			const newWarningsData = new Map<string, StudentWarningCounts>();
			for (const [studentId, counts] of Object.entries(result.warnings)) {
				newWarningsData.set(studentId, counts as StudentWarningCounts);
			}

			warningsData = newWarningsData;
		} catch (err) {
			console.error('[loadWarnings] ERROR:', err);
			toaster.error('Erreur lors du chargement des avertissements');
		} finally {
			_isLoadingWarnings = false;
		}
	}

	/**
	 * Add warning with optimistic UI and debouncing
	 */
	async function addWarning(studentId: string, warningType: string, studentName: string) {
		if (!selectedPeriodId) {
			toaster.error('Aucune période académique active');
			return;
		}

		// STEP 1: Apply optimistic update immediately
		const currentCounts = getStudentWarnings(studentId);
		const newCounts = { ...currentCounts };

		// Increment specific warning type
		if (warningType === 'C') newCounts.C++;
		else if (warningType === 'M') newCounts.M++;
		else if (warningType === 'R') newCounts.R++;
		else if (warningType === 'T') newCounts.T++;

		// Recalculate totals
		newCounts.total = newCounts.C + newCounts.M + newCounts.R + newCounts.T;
		newCounts.score = Math.max(0, Math.min(20, 20 - newCounts.total));

		// Apply optimistic update
		optimisticWarnings[studentId] = newCounts;

		// STEP 2: Clear existing timeout if any
		if (pendingAdds[studentId]) {
			clearTimeout(pendingAdds[studentId]);
		}

		// STEP 3: Set new timeout to sync with server after 500ms
		const timeoutId = setTimeout(async () => {
			delete pendingAdds[studentId];

			try {
				const response = await fetch('/api/warnings', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						student_id: studentId,
						class_id: selectedClassId,
						academic_period_id: selectedPeriodId,
						warning_type: warningType
					})
				});

				if (!response.ok) {
					throw new Error('Failed to add warning');
				}

				const result = await response.json();

				// Clear optimistic override
				delete optimisticWarnings[studentId];

				// Update server data
				warningsData.set(studentId, result.counts);

				// Invalidate cache
				teacherStudentsCache.invalidate(selectedClassId);
				warningsCache.invalidate(selectedClassId, selectedPeriodId);

				// Publish Event Bus event for cross-tab sync
				cacheEventBus.invalidateWarnings(
					selectedClassId,
					selectedPeriodId,
					`Added ${warningType} warning for ${studentName}`
				);

				// Force immediate reload to get fresh data
				await loadWarnings();

				// Show success toast
				toaster.success(
					`Avertissement ${getWarningTypeLabel(warningType)} ajouté (${studentName})`
				);
			} catch (err) {
				console.error('Error adding warning:', err);

				// ROLLBACK: Clear optimistic override
				delete optimisticWarnings[studentId];

				toaster.error("Erreur lors de l'ajout de l'avertissement");
			}
		}, 500) as unknown as number;

		pendingAdds[studentId] = timeoutId;
	}

	/**
	 * Remove warning with optimistic UI
	 */
	async function removeWarning() {
		if (!warningToDelete) return;

		const { warningId, studentId, studentName, warningType } = warningToDelete;

		// STEP 1: Save current state for rollback
		const previousCounts = getStudentWarnings(studentId);
		const rollbackState = { ...previousCounts };

		// STEP 2: Apply optimistic update immediately
		const newCounts = { ...previousCounts };

		// Decrement specific warning type (prevent negative values)
		if (warningType === 'C') newCounts.C = Math.max(0, newCounts.C - 1);
		else if (warningType === 'M') newCounts.M = Math.max(0, newCounts.M - 1);
		else if (warningType === 'R') newCounts.R = Math.max(0, newCounts.R - 1);
		else if (warningType === 'T') newCounts.T = Math.max(0, newCounts.T - 1);

		// Recalculate totals
		newCounts.total = newCounts.C + newCounts.M + newCounts.R + newCounts.T;
		newCounts.score = Math.max(0, Math.min(20, 20 - newCounts.total));

		// Apply optimistic update (instant UI feedback)
		optimisticWarnings[studentId] = newCounts;

		// STEP 3: Close confirmation dialog
		warningToDelete = null;

		try {
			// STEP 4: Make API call in background
			const response = await fetch(`/api/warnings/${warningId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error('Failed to remove warning');
			}

			const result = await response.json();

			// SUCCESS: Update with server response after brief delay
			setTimeout(() => {
				// Clear optimistic override
				delete optimisticWarnings[studentId];

				// Update server data
				warningsData.set(studentId, result.counts);

				// Invalidate cache
				teacherStudentsCache.invalidate(selectedClassId);
				warningsCache.invalidate(selectedClassId, selectedPeriodId);

				// Publish Event Bus event for cross-tab sync
				cacheEventBus.invalidateWarnings(
					selectedClassId,
					selectedPeriodId,
					`Removed ${warningType} warning for ${studentName}`
				);

				// Show success toast
				toaster.success(
					`Avertissement ${getWarningTypeLabel(warningType)} retiré (${studentName})`
				);
			}, 100);
		} catch (err) {
			console.error('Error removing warning:', err);

			// ROLLBACK: Restore previous state
			optimisticWarnings[studentId] = rollbackState;

			// Clear after brief delay to show rollback
			setTimeout(() => {
				delete optimisticWarnings[studentId];
			}, 100);

			toaster.error("Erreur lors de la suppression de l'avertissement");
		}
	}

	/**
	 * Handle period selection from history dialog
	 */
	function handlePeriodSelect(periodId: string) {
		selectedPeriodId = periodId;
		showHistoryDialog = false;
	}

	/**
	 * Reset to current period
	 */
	function resetToCurrentPeriod() {
		if (data.currentPeriod) {
			selectedPeriodId = data.currentPeriod.id;
		}
	}
</script>

<div class="space-y-6">
	<!-- HEADER -->
	<div class="flex items-center justify-between">
		<h1 class="text-3xl font-bold text-foreground">Avertissements</h1>

		<!-- History Button -->
		{#if data.allPeriods.length > 0}
			<Button variant="outline" onclick={() => (showHistoryDialog = true)}>
				<History class="mr-2 h-4 w-4" />
				Historique
			</Button>
		{/if}
	</div>

	<!-- NO ACADEMIC PERIOD WARNING -->
	{#if !data.currentPeriod && data.allPeriods.length === 0}
		<div
			class="rounded-lg border border-orange-200 bg-orange-50 p-6 dark:border-orange-900 dark:bg-orange-950"
		>
			<div class="flex items-start gap-3">
				<AlertCircle class="mt-0.5 h-5 w-5 text-orange-600 dark:text-orange-400" />
				<div>
					<h3 class="font-semibold text-orange-900 dark:text-orange-100">
						Aucune période académique configurée
					</h3>
					<p class="mt-1 text-sm text-orange-700 dark:text-orange-300">
						Contactez votre administrateur pour configurer les périodes académiques (trimestres ou
						semestres) de votre établissement.
					</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- MAIN CONTENT -->
	{#if data.classes.length === 0}
		<!-- No classes -->
		<div class="rounded-lg border border-border bg-card p-12 text-center">
			<h2 class="mb-2 text-xl font-semibold text-foreground">Aucune classe trouvée</h2>
			<p class="text-muted-foreground">
				Vous devez d'abord créer des classes pour gérer les avertissements de vos élèves.
			</p>
		</div>
	{:else}
		<!-- TABS BY CLASS -->
		<Tabs.Root bind:value={selectedClassId} class="w-full">
			<Tabs.List class="mb-6">
				{#each data.classes as classItem (classItem.id)}
					<Tabs.Trigger value={classItem.id}>
						{classItem.name}
					</Tabs.Trigger>
				{/each}
			</Tabs.List>

			{#each data.classes as classItem (classItem.id)}
				<Tabs.Content value={classItem.id} class="mt-0 space-y-6">
					<!-- PERIOD SELECTOR (if not current period) -->
					{#if selectedPeriodId !== data.currentPeriod?.id}
						<div
							class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950"
						>
							<div class="flex items-center justify-between">
								<div class="flex items-center gap-2">
									<History class="h-5 w-5 text-blue-600 dark:text-blue-400" />
									<span class="font-medium text-blue-900 dark:text-blue-100">
										Affichage: {selectedPeriodName}
									</span>
								</div>
								<Button variant="outline" size="sm" onclick={resetToCurrentPeriod}>
									Retour à la période actuelle
								</Button>
							</div>
						</div>
					{/if}

					<!-- STUDENTS LIST -->
					{#if classItem.students.length === 0}
						<div class="rounded-lg border border-border bg-card p-12 text-center">
							<p class="text-muted-foreground">Aucun élève dans cette classe</p>
						</div>
					{:else if !selectedPeriodId}
						<div class="rounded-lg border border-border bg-card p-12 text-center">
							<p class="text-muted-foreground">Sélectionnez une période académique</p>
						</div>
					{:else}
						<div class="overflow-hidden rounded-lg border border-border bg-card">
							<div class="border-b border-border bg-muted/30 px-6 py-4">
								<h3 class="text-lg font-semibold text-foreground">
									Élèves ({classItem.students.length})
								</h3>
							</div>

							<div class="divide-y divide-border">
								{#each classItem.students as student (student.id)}
									{@const counts = getStudentWarnings(student.id)}
									<div class="flex items-center gap-6 px-6 py-4">
										<!-- AVATAR -->
										<Avatar.Root class="h-12 w-12 flex-shrink-0">
											<Avatar.Image
												src={student.avatar_url ||
													getAvatarFallback(
														(student.role as 'student' | 'teacher' | 'admin') || 'student',
														student.gender
													)}
												alt={getFullName(student.firstname, student.lastname, student.full_name)}
											/>
											<Avatar.Fallback class="bg-primary/10 font-semibold text-primary">
												{getAvatarInitials(student.firstname, student.lastname)}
											</Avatar.Fallback>
										</Avatar.Root>

										<!-- STUDENT NAME -->
										<div class="min-w-0 flex-1">
											<p class="truncate font-medium text-foreground">
												{getFullName(student.firstname, student.lastname, student.full_name)}
											</p>
										</div>

										<!-- WARNING COUNTS (Clickable counters with optimistic updates)
										     UI Structure: Badge + Count displayed side-by-side
										     - Badge: Single letter (C/M/R/T) in colored pill
										     - Count: Number displayed OUTSIDE badge for better readability
										     - "Aucun" fallback: Shows when student has zero warnings
										     - Conditional rendering: Badges only shown if count > 0
										     - Click behavior: Opens confirmation dialog to remove most recent warning of that type
										-->
										<div class="flex flex-shrink-0 items-center gap-3">
											{#if counts.total === 0}
												<!-- Fallback text when student has no warnings at all -->
												<span class="text-sm text-muted-foreground italic">Aucun</span>
											{:else}
												{#each ['C', 'M', 'R', 'T'] as type (type)}
													{@const typeCount = counts[type as keyof typeof counts]}
													{@const typeWarnings = counts.warnings.filter(
														(w: Warning) => w.warning_type === type
													)}
													{@const hasWarnings = typeof typeCount === 'number' && typeCount > 0}

													{#if hasWarnings}
														<!-- Only render warning badge if count > 0 (not just disabled) -->
														<button
															type="button"
															class="flex cursor-pointer items-center gap-1.5 rounded-full transition-all hover:scale-110"
															onclick={() => {
																if (typeWarnings.length > 0) {
																	// Delete the most recent warning of this type
																	const mostRecent = typeWarnings[typeWarnings.length - 1];
																	warningToDelete = {
																		warningId: mostRecent.id,
																		studentId: student.id,
																		studentName: getFullName(
																			student.firstname,
																			student.lastname,
																			student.full_name
																		),
																		warningType: type
																	};
																}
															}}
														>
															<!-- Badge contains ONLY the letter (e.g., "C") -->
															<Badge variant={type === 'T' ? 'destructive' : 'secondary'}>
																{type}
															</Badge>
															<!-- Count displayed OUTSIDE badge (e.g., "[C] 3" instead of "[C:3]") -->
															<span class="text-sm font-medium tabular-nums">{typeCount}</span>
														</button>
													{/if}
												{/each}
											{/if}
										</div>

										<!-- SCORE -->
										<div class="w-20 text-right">
											<p class="text-2xl font-bold tabular-nums {getScoreColor(counts.score)}">
												{counts.score}/20
											</p>
										</div>

										<!-- SEPARATOR -->
										<Separator orientation="vertical" class="h-10" />

										<!-- ADD WARNING DROPDOWN -->
										<DropdownMenu.Root>
											<DropdownMenu.Trigger>
												{#snippet child({ props })}
													<Button {...props} variant="outline" size="sm">Ajouter</Button>
												{/snippet}
											</DropdownMenu.Trigger>
											<DropdownMenu.Content>
												<DropdownMenu.Item
													onclick={() => {
														const name = student.firstname || student.full_name || 'Élève';
														addWarning(student.id, 'C', name);
													}}
												>
													+C (Conduite)
												</DropdownMenu.Item>
												<DropdownMenu.Item
													onclick={() => {
														const name = student.firstname || student.full_name || 'Élève';
														addWarning(student.id, 'M', name);
													}}
												>
													+M (Manque de Travail)
												</DropdownMenu.Item>
												<DropdownMenu.Item
													onclick={() => {
														const name = student.firstname || student.full_name || 'Élève';
														addWarning(student.id, 'R', name);
													}}
												>
													+R (Retard)
												</DropdownMenu.Item>
												<DropdownMenu.Item
													onclick={() => {
														const name = student.firstname || student.full_name || 'Élève';
														addWarning(student.id, 'T', name);
													}}
												>
													+T (Tricherie)
												</DropdownMenu.Item>
											</DropdownMenu.Content>
										</DropdownMenu.Root>
									</div>
								{/each}
							</div>
						</div>
					{/if}
				</Tabs.Content>
			{/each}
		</Tabs.Root>
	{/if}
</div>

<!-- HISTORY DIALOG (Period Selection) -->
<Dialog.Root bind:open={showHistoryDialog}>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Sélectionner une période</Dialog.Title>
			<Dialog.Description>Consultez les avertissements des périodes précédentes</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-2">
			{#each data.allPeriods as period (period.id)}
				<button
					type="button"
					class="flex w-full items-center justify-between rounded-lg border border-border p-4 transition-colors hover:bg-muted {selectedPeriodId ===
					period.id
						? 'border-primary bg-primary/5'
						: ''}"
					onclick={() => handlePeriodSelect(period.id)}
				>
					<div class="text-left">
						<p class="font-medium text-foreground">{period.name}</p>
						<p class="text-sm text-muted-foreground">
							{new Date(period.start_date).toLocaleDateString('fr-FR')} - {new Date(
								period.end_date
							).toLocaleDateString('fr-FR')}
						</p>
					</div>
					{#if period.id === data.currentPeriod?.id}
						<Badge variant="default">Actuelle</Badge>
					{/if}
				</button>
			{/each}
		</div>
	</Dialog.Content>
</Dialog.Root>

<!-- CONFIRMATION DIALOG (Delete Warning) -->
<Dialog.Root
	open={warningToDelete !== null}
	onOpenChange={(open) => !open && (warningToDelete = null)}
>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title>Retirer l'avertissement ?</Dialog.Title>
			<Dialog.Description>
				{#if warningToDelete}
					Voulez-vous retirer l'avertissement
					<strong>{getWarningTypeLabel(warningToDelete.warningType)}</strong>
					pour <strong>{warningToDelete.studentName}</strong> ?
				{/if}
			</Dialog.Description>
		</Dialog.Header>

		<div class="flex justify-end gap-3">
			<Button variant="outline" onclick={() => (warningToDelete = null)}>Annuler</Button>
			<Button variant="destructive" onclick={removeWarning}>Retirer</Button>
		</div>
	</Dialog.Content>
</Dialog.Root>
