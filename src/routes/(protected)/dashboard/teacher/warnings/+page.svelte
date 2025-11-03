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
	Instant updates with debounced server sync (500ms).
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
	import { History, AlertCircle } from 'lucide-svelte';
	import type { StudentWarningCounts } from '$lib/server/warnings';
	import { teacherCache } from '$lib/stores/teacherDashboardCache.svelte';
	import { selectedClassStore } from '$lib/stores/selectedClass.svelte';
	import { selectedPeriodStore } from '$lib/stores/selectedPeriod.svelte';
	import type { ClassWithData } from '$lib/server/students';
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

	// DEBOUNCING STATE
	// Tracks pending add operations to batch rapid clicks
	// Key: studentId, Value: timeout ID
	let pendingAdds = $state<Record<string, number>>({});

	// Confirmation modal state (no warningId needed - will delete most recent of type)
	let warningToDelete = $state<{
		studentId: string;
		studentName: string;
		warningType: string;
	} | null>(null);

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
	 * Add warning with optimistic UI and debouncing
	 */
	async function addWarning(studentId: string, warningType: string, studentName: string) {
		if (!selectedPeriodId || !selectedClassId) {
			toaster.error('Aucune période académique active');
			return;
		}

		// STEP 1: Save current state for rollback
		const previousCounts = getStudentWarnings(studentId);

		// STEP 2: Apply optimistic update (increment count)
		const newCounts: StudentWarningCounts = { ...previousCounts };
		if (warningType === 'C') newCounts.C++;
		else if (warningType === 'M') newCounts.M++;
		else if (warningType === 'R') newCounts.R++;
		else if (warningType === 'T') newCounts.T++;

		teacherCache.updateWarningsOptimistic(selectedClassId, selectedPeriodId, studentId, newCounts);

		// STEP 3: Clear existing timeout if any
		if (pendingAdds[studentId]) {
			clearTimeout(pendingAdds[studentId]);
		}

		// STEP 4: Set new timeout to sync with server after 500ms
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

				// SUCCESS: Optimistic update already has temp Warning object
				// Cache will naturally refresh later with real ID from server
				toaster.success(
					`Avertissement ${getWarningTypeLabel(warningType)} ajouté (${studentName})`
				);
			} catch (err) {
				console.error('Error adding warning:', err);

				// ROLLBACK: Revert to previous state
				teacherCache.updateWarningsOptimistic(
					selectedClassId,
					selectedPeriodId,
					studentId,
					previousCounts
				);

				toaster.error("Erreur lors de l'ajout de l'avertissement");
			}
		}, 500) as unknown as number;

		pendingAdds[studentId] = timeoutId;
	}

	/**
	 * Remove warning with optimistic UI
	 */
	async function removeWarning() {
		if (!warningToDelete || !selectedClassId || !selectedPeriodId) return;

		const { studentId, studentName, warningType } = warningToDelete;

		// STEP 1: Save current state for rollback
		const previousCounts = getStudentWarnings(studentId);

		// STEP 2: Apply optimistic update (decrement count)
		const newCounts: StudentWarningCounts = { ...previousCounts };
		if (warningType === 'C' && newCounts.C > 0) newCounts.C--;
		else if (warningType === 'M' && newCounts.M > 0) newCounts.M--;
		else if (warningType === 'R' && newCounts.R > 0) newCounts.R--;
		else if (warningType === 'T' && newCounts.T > 0) newCounts.T--;

		teacherCache.updateWarningsOptimistic(selectedClassId, selectedPeriodId, studentId, newCounts);

		// STEP 3: Close confirmation dialog
		warningToDelete = null;

		try {
			// STEP 4: Make API call - delete most recent warning of this type
			const response = await fetch(`/api/warnings/remove`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					student_id: studentId,
					class_id: selectedClassId,
					academic_period_id: selectedPeriodId,
					warning_type: warningType
				})
			});

			if (response.ok) {
				// SUCCESS: Cache already has correct optimistic value
				// No need to invalidate - optimistic update matches server response
				// Cache will naturally expire and refresh later
				toaster.success(
					`Avertissement ${getWarningTypeLabel(warningType)} retiré (${studentName})`
				);
			} else {
				// ERROR: Server returned error status (including 404) - rollback
				teacherCache.updateWarningsOptimistic(
					selectedClassId,
					selectedPeriodId,
					studentId,
					previousCounts
				);

				toaster.error("Erreur lors de la suppression de l'avertissement");
			}
		} catch (err) {
			console.error('Error removing warning:', err);

			// NETWORK ERROR: Request failed completely - rollback
			teacherCache.updateWarningsOptimistic(
				selectedClassId,
				selectedPeriodId,
				studentId,
				previousCounts
			);

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
		if (currentPeriod) {
			selectedPeriodId = (currentPeriod as any).id;
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
										<Avatar.Root class="h-12 w-12 flex-shrink-0">
											<Avatar.Image
												src={student.avatar_url ||
													getAvatarFallback(
														(student.role as 'student' | 'teacher' | 'admin') || 'student',
														student.gender === 'boy' ? 'M' : student.gender === 'girl' ? 'F' : null
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
																// Open confirmation dialog to delete most recent of this type
																warningToDelete = {
																	studentId: student.id,
																	studentName: getFullName(
																		student.firstname,
																		student.lastname,
																		student.full_name
																	),
																	warningType: type
																};
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
