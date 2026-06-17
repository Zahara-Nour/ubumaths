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
	- C: Comportement (Behavior)
	- M: Matériel (Material/Equipment)
	- R: Retard (Late)
	- T: Travail (Work)

	SCORE CALCULATION:
	------------------
	score = 20 - total_warnings (clamped to 0-20)
	- ≥15: Green (good)
	- 10-14: Orange (warning)
	- <10: Red (critical)

	OPTIMISTIC UI PATTERN:
	----------------------
	Instant updates with debounced server sync (500ms).
	Each operation updates UI immediately, then syncs with backend.
-->

<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import * as Tabs from '$lib/components/ui/tabs';
	import UserAvatar from '$lib/components/UserAvatar.svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { History, AlertCircle, Plus } from '@lucide/svelte';
	import type { StudentWarningCounts } from '$lib/server/warnings';
	import { getWarningTypeLabel } from '$lib/types/warnings';
	import { teacherCache } from '$lib/stores/teacherDashboardCache.svelte';
	import { selectedClassStore } from '$lib/stores/selectedClass.svelte';
	import { selectedPeriodStore } from '$lib/stores/selectedPeriod.svelte';
	import type { Database } from '$lib/types/database';

	type AcademicPeriod = Database['public']['Tables']['academic_periods']['Row'];

	// Data from server (user/profile only)
	let { data }: { data: PageData } = $props();

	// Get classes from cache (reactively updates when cache changes)
	let classes = $derived(teacherCache.getAllClassesSync());

	// Get periods from cache (reactively updates when cache changes)
	let cachedPeriods = $derived(
		data.profile?.school_id ? teacherCache.getPeriodsSync(data.profile.school_id) : null
	);
	let currentPeriod = $derived<AcademicPeriod | null>(
		(cachedPeriods?.currentPeriod as AcademicPeriod) || null
	);
	let allPeriods = $derived<AcademicPeriod[]>(
		(cachedPeriods?.allPeriods as AcademicPeriod[]) || []
	);

	// Use shared selectedClass store (persists across pages and reloads)
	const classStore = selectedClassStore();

	// Use shared selectedPeriod store (persists across pages and reloads)
	const periodStore = selectedPeriodStore();

	// Initialize selectedClassId: restore from localStorage (fallback handled in effect)
	let selectedClassId = $state(classStore.id || '');

	// Initialize selectedPeriodId: restore from localStorage (fallback handled in layout)
	let selectedPeriodId = $state(periodStore.id || '');

	let showHistoryDialog = $state(false);

	// Get students from cache (reactively updates when cache changes)
	let currentStudents = $derived(
		selectedClassId ? teacherCache.getStudentsSync(selectedClassId) : []
	);

	// Pending warning submissions: accumulates types per student, sends bulk after 500ms
	const pendingWarnings: Record<
		string,
		{ timeoutId: number; types: Array<'C' | 'M' | 'R' | 'T'> }
	> = {};

	// Pending warning removals: accumulates types per student, sends bulk after 500ms
	const pendingRemovals: Record<
		string,
		{ timeoutId: number; types: Array<'C' | 'M' | 'R' | 'T'> }
	> = {};

	// ============================================================================
	// COMPUTED VALUES
	// ============================================================================

	/**
	 * Get currently selected period name
	 */
	let selectedPeriodName = $derived(
		allPeriods.find((p) => p.id === selectedPeriodId)?.name ||
			currentPeriod?.name ||
			'Période actuelle'
	);

	// ============================================================================
	// EFFECTS
	// ============================================================================

	/**
	 * Fallback to first class when no selection and classes are loaded
	 */
	$effect(() => {
		if (!selectedClassId && classes.length > 0) {
			selectedClassId = classes[0].id;
		}
	});

	/**
	 * Sync local selectedClassId state with shared store when it changes locally
	 * Note: Auto-hydration is set up in the teacher layout, not here
	 */
	$effect(() => {
		if (selectedClassId) {
			classStore.set(selectedClassId);
		}
	});

	/**
	 * Sync local selectedPeriodId state with shared store when it changes locally
	 * Note: Auto-initialization is set up in the teacher layout, not here
	 */
	$effect(() => {
		if (selectedPeriodId) {
			periodStore.set(selectedPeriodId);
		}
	});

	// Cleanup pending warning timers on unmount
	$effect(() => {
		return () => {
			Object.values(pendingWarnings).forEach(({ timeoutId }) => {
				clearTimeout(timeoutId);
			});
			Object.values(pendingRemovals).forEach(({ timeoutId }) => {
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
	 * Get CSS class for score color coding
	 */
	function getScoreColor(score: number): string {
		if (score >= 15) return 'text-green-600 dark:text-green-400';
		if (score >= 10) return 'text-orange-600 dark:text-orange-400';
		return 'text-red-600 dark:text-red-400';
	}

	/**
	 * Get warning counts for a student from cache
	 *
	 * @param studentId - The student's ID
	 * @returns Warning counts (C, M, R, T only) or default empty counts
	 */
	function getStudentWarnings(studentId: string): StudentWarningCounts {
		if (selectedClassId && selectedPeriodId) {
			const cached = teacherCache.getWarningsSync(selectedClassId, selectedPeriodId);
			if (cached) {
				const counts = cached.get(studentId);
				if (counts) return counts;
			}
		}

		// Fallback to default empty counts if not in cache yet
		return { C: 0, M: 0, R: 0, T: 0 };
	}

	/**
	 * Calculate total warnings for a student
	 */
	function getTotalWarnings(counts: StudentWarningCounts): number {
		return counts.C + counts.M + counts.R + counts.T;
	}

	/**
	 * Calculate score for a student (20 - total, clamped to 0-20)
	 */
	function getScore(counts: StudentWarningCounts): number {
		const total = getTotalWarnings(counts);
		return Math.max(0, Math.min(20, 20 - total));
	}

	// ============================================================================
	// API FUNCTIONS
	// ============================================================================

	/**
	 * Add warning with optimistic UI and accumulating debounce.
	 * Rapid clicks accumulate types, then send one bulk POST after 500ms of inactivity.
	 */
	function addWarning(studentId: string, warningType: string, studentName: string) {
		if (!selectedPeriodId || !selectedClassId) {
			toaster.error('Aucune période académique active');
			return;
		}

		// Capture current IDs (may change if user switches class/period)
		const currentClassId = selectedClassId;
		const currentPeriodId = selectedPeriodId;
		const wType = warningType as 'C' | 'M' | 'R' | 'T';

		// 1. Snapshot current counts BEFORE optimistic update (for accurate rollback)
		const snapshotCounts: StudentWarningCounts = { ...getStudentWarnings(studentId) };

		// 2. Instant optimistic update
		const newCounts: StudentWarningCounts = { ...snapshotCounts };
		newCounts[wType]++;
		teacherCache.updateWarningsOptimistic(currentClassId, currentPeriodId, studentId, newCounts);

		// 3. Accumulate type and reset debounce timer
		if (pendingWarnings[studentId]) {
			clearTimeout(pendingWarnings[studentId].timeoutId);
			pendingWarnings[studentId].types.push(wType);
		} else {
			pendingWarnings[studentId] = { timeoutId: 0, types: [wType] };
		}

		// 4. Set debounced timer (500ms)
		const timeoutId = setTimeout(async () => {
			const accumulated = pendingWarnings[studentId].types;
			delete pendingWarnings[studentId];

			if (accumulated.length === 0) return;

			try {
				const response = await fetch('/api/warnings/bulk', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({
						student_id: studentId,
						class_id: currentClassId,
						academic_period_id: currentPeriodId,
						warning_types: accumulated,
						deletion_context: { source: 'teacher' }
					})
				});

				if (!response.ok) {
					throw new Error('Failed to add warnings');
				}

				const result = await response.json();
				// Sync cache with server-confirmed counts
				teacherCache.updateWarningsOptimistic(
					currentClassId,
					currentPeriodId,
					studentId,
					result.counts
				);
				const labels = accumulated.map((t) => getWarningTypeLabel(t)).join(', ');
				toaster.success(`+${labels} (${studentName})`);
			} catch (err) {
				console.error('Error adding warnings:', err);

				// Rollback to pre-update snapshot (avoids reading stale cache at error-time)
				teacherCache.updateWarningsOptimistic(
					currentClassId,
					currentPeriodId,
					studentId,
					snapshotCounts
				);

				toaster.error("Erreur lors de l'ajout des avertissements");
			}
		}, 500) as unknown as number;

		pendingWarnings[studentId].timeoutId = timeoutId;
	}

	/**
	 * Remove warning with optimistic UI and accumulating debounce.
	 * Rapid clicks accumulate types, then send one bulk POST after 500ms of inactivity.
	 * Mirrors addWarning pattern but calls /api/warnings/remove-bulk.
	 */
	function handleRemoveWarning(studentId: string, studentName: string, warningType: string) {
		if (!selectedPeriodId || !selectedClassId) {
			toaster.error('Aucune période académique active');
			return;
		}

		const currentClassId = selectedClassId;
		const currentPeriodId = selectedPeriodId;
		const wType = warningType as 'C' | 'M' | 'R' | 'T';

		// 1. Snapshot current counts BEFORE optimistic update (for accurate rollback)
		const snapshotCounts: StudentWarningCounts = { ...getStudentWarnings(studentId) };

		// Skip if count already 0
		if (snapshotCounts[wType] <= 0) return;

		// 2. Instant optimistic update (decrement)
		const newCounts: StudentWarningCounts = { ...snapshotCounts };
		newCounts[wType]--;
		teacherCache.updateWarningsOptimistic(currentClassId, currentPeriodId, studentId, newCounts);

		// 3. Accumulate type and reset debounce timer
		if (pendingRemovals[studentId]) {
			clearTimeout(pendingRemovals[studentId].timeoutId);
			pendingRemovals[studentId].types.push(wType);
		} else {
			pendingRemovals[studentId] = { timeoutId: 0, types: [wType] };
		}

		// 4. Set debounced timer (500ms)
		const timeoutId = setTimeout(async () => {
			const accumulated = pendingRemovals[studentId].types;
			delete pendingRemovals[studentId];

			if (accumulated.length === 0) return;

			try {
				const response = await fetch('/api/warnings/remove-bulk', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({
						student_id: studentId,
						class_id: currentClassId,
						academic_period_id: currentPeriodId,
						warning_types: accumulated,
						deletion_context: { source: 'teacher' }
					})
				});

				if (!response.ok) {
					throw new Error('Failed to remove warnings');
				}

				const result = await response.json();
				// Sync cache with server-confirmed counts
				teacherCache.updateWarningsOptimistic(
					currentClassId,
					currentPeriodId,
					studentId,
					result.counts
				);
				const labels = accumulated.map((t) => getWarningTypeLabel(t)).join(', ');
				toaster.success(`-${labels} (${studentName})`);
			} catch (err) {
				console.error('Error removing warnings:', err);

				// Rollback to pre-update snapshot
				teacherCache.updateWarningsOptimistic(
					currentClassId,
					currentPeriodId,
					studentId,
					snapshotCounts
				);

				toaster.error('Erreur lors de la suppression des avertissements');
			}
		}, 500) as unknown as number;

		pendingRemovals[studentId].timeoutId = timeoutId;
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
		if (currentPeriod && typeof currentPeriod === 'object' && 'id' in currentPeriod) {
			selectedPeriodId = currentPeriod.id as string;
		}
	}
</script>

<div class="space-y-6">
	<!-- HEADER -->
	<div class="flex items-center justify-between">
		<h1 class="text-3xl font-bold text-foreground">Avertissements</h1>

		<!-- History Button -->
		{#if allPeriods.length > 0}
			<Button variant="outline" onclick={() => (showHistoryDialog = true)}>
				<History class="mr-2 h-4 w-4" />
				Historique
			</Button>
		{/if}
	</div>

	<!-- NO ACADEMIC PERIOD WARNING -->
	<!-- Only show if periods have been loaded (cachedPeriods !== null) and are empty -->
	{#if cachedPeriods && !currentPeriod && allPeriods.length === 0}
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
	{#if classes.length === 0}
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
				{#each classes as classItem (classItem.id)}
					<Tabs.Trigger value={classItem.id}>
						{classItem.name}
					</Tabs.Trigger>
				{/each}
			</Tabs.List>

			{#each classes as classItem (classItem.id)}
				<Tabs.Content value={classItem.id} class="mt-0 space-y-6">
					<!-- PERIOD SELECTOR (if not current period) -->
					{#if selectedPeriodId !== currentPeriod?.id}
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
					{#if currentStudents.length === 0}
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
									Élèves ({currentStudents.length})
								</h3>
							</div>

							<div class="divide-y divide-border">
								{#each currentStudents as student (student.id)}
									{@const counts = getStudentWarnings(student.id)}
									<div class="flex items-center gap-6 px-6 py-4">
										<!-- AVATAR -->
										<UserAvatar
											avatar_url={student.avatar_url}
											role={student.role || 'student'}
											firstname={student.firstname}
											lastname={student.lastname}
											class="h-12 w-12 flex-shrink-0"
										/>

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
											{#if counts === null}
												<!-- Loading state: Data not yet loaded, show skeleton/spinner -->
												<span class="animate-pulse text-sm text-muted-foreground">...</span>
											{:else if getTotalWarnings(counts) === 0}
												<!-- Fallback text when student has no warnings at all -->
												<span class="text-sm text-muted-foreground italic">Aucun</span>
											{:else}
												{#each ['C', 'M', 'R', 'T'] as type (type)}
													{@const typeCount = counts[type as keyof typeof counts]}
													{@const hasWarnings = typeof typeCount === 'number' && typeCount > 0}

													{#if hasWarnings}
														<!-- Only render warning badge if count > 0 -->
														<button
															type="button"
															class="flex cursor-pointer items-center gap-1.5 rounded-full transition-all hover:scale-110"
															onclick={() => {
																// Open RemoveWarningsModal to see and confirm which warning will be deleted
																handleRemoveWarning(
																	student.id,
																	getFullName(
																		student.firstname,
																		student.lastname,
																		student.full_name
																	),
																	type as 'C' | 'M' | 'R' | 'T'
																);
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
											{#if counts === null}
												<!-- Loading state -->
												<p
													class="animate-pulse text-2xl font-bold text-muted-foreground tabular-nums"
												>
													.../20
												</p>
											{:else}
												{@const score = getScore(counts)}
												<p class="text-2xl font-bold tabular-nums {getScoreColor(score)}">
													{score}/20
												</p>
											{/if}
										</div>

										<!-- SEPARATOR -->
										<Separator orientation="vertical" class="h-10" />

										<!-- ADD WARNING DROPDOWN -->
										<DropdownMenu.Root>
											<DropdownMenu.Trigger>
												{#snippet child({ props })}
													<Button {...props} variant="outline" size="icon" class="h-8 w-8">
														<Plus class="h-4 w-4" />
														<span class="sr-only">Ajouter un avertissement</span>
													</Button>
												{/snippet}
											</DropdownMenu.Trigger>
											<DropdownMenu.Content>
												<DropdownMenu.Item
													onclick={() => {
														const name = student.firstname || student.full_name || 'Élève';
														addWarning(student.id, 'C', name);
													}}
												>
													+C (Comportement)
												</DropdownMenu.Item>
												<DropdownMenu.Item
													onclick={() => {
														const name = student.firstname || student.full_name || 'Élève';
														addWarning(student.id, 'M', name);
													}}
												>
													+M (Matériel)
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
													+T (Travail)
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
			{#each allPeriods as period: AcademicPeriod (period.id)}
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
					{#if period.id === currentPeriod?.id}
						<Badge variant="default">Actuelle</Badge>
					{/if}
				</button>
			{/each}
		</div>
	</Dialog.Content>
</Dialog.Root>

<!-- Old confirmation dialog removed: now using RemoveWarningsModal via modal stack -->
