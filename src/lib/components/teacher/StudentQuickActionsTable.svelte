<!--
	StudentQuickActionsTable Component
	====================================

	Compact student table with quick action buttons for the teacher dashboard.

	FEATURES:
	---------
	- Displays students sorted alphabetically by firstname
	- Shows: Name | Gidouilles | VIP Cards | Warnings Score | Actions
	- Quick action buttons:
		- Warning button (⚠️): 3-step logic (remove gidouille → remove VIP card → add warning)
		- Add gidouille button (+1): Instant optimistic UI update
		- View VIP cards button (🎴): Opens modal with all cards
	- Color-coded warning scores: green (≥15), orange (10-14), red (<10)
	- Optimistic UI for all actions (gidouilles, VIP cards, warnings)
	- Debounced API calls: Rapid clicks batched into single request (500ms)

	OPTIMISTIC UI PATTERN:
	----------------------
	All actions use optimistic updates for instant feedback:

	1. INSTANT FEEDBACK (Optimistic Update)
		 - Action triggers immediate UI update (0ms latency)
		 - Local state (optimisticUpdates) overrides server data
		 - User sees change immediately without waiting

	2. DEBOUNCED API CALLS (Gidouille Add/Remove Only)
		 - Rapid clicks accumulate locally via optimistic state
		 - Timer resets on each click (500ms debounce)
		 - Single batched API call sent after inactivity
		 - Example: 5 rapid clicks = 1 API call with amount: +5

	3. BACKGROUND SYNC
		 - Request sent to server in background
		 - On success: Clear optimistic state, show success toast
		 - On error: Rollback optimistic state, show error toast

	WARNING BUTTON 3-STEP LOGIC:
	-----------------------------
	The warning button applies penalties in order of severity:

	Step 1: Remove 1 gidouille (if gidouilles > 0)
		- Deducts 1 gidouille instantly
		- Sends notification: "Gidouille retirée"
		- Prevents student from losing cards/warnings first

	Step 2: Remove random VIP card (if has unused cards)
		- Selects random unused card from student's collection
		- Removes card instantly
		- Sends notification: "Carte VIP retirée"
		- No gidouilles refund

	Step 3: Add warning C (if score ≠ 0)
		- Adds Conduite warning instantly
		- Decrements warning score by 1
		- Sends notification: "Avertissement de Conduite"

	Edge Case: Already at 20 warnings (score = 0)
		- Shows warning toast: "Already has 20 warnings"
		- No action taken

	TECHNICAL DETAILS:
	------------------
	- Uses Svelte 5 runes ($state, $derived, $effect, $props)
	- Optimistic state tracks all pending changes per student
	- Immutable updates for proper reactivity
	- Data loaded from 3 API endpoints: /students, /gidouilles, /warnings
	- Parallel fetch with Promise.all for optimal performance

	SECURITY:
	---------
	- Teacher permissions validated on server side
	- All mutations secured via API endpoints
	- Notifications sent only to affected students
	- No client-side privilege escalation possible
-->

<script lang="ts">
	import * as Table from '$lib/components/ui/table';
	import * as Avatar from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { StudentWarningCounts } from '$lib/server/warnings';
	import { openVipCardsModal } from '$lib/utils/vip-card-modals';
	import { getAvatarFallback } from '$lib/utils/avatar';
	import { AlertTriangle, Plus, Eye } from 'lucide-svelte';
	import type { StudentVipCards } from '$lib/types/vip-card';
	import { teacherCache } from '$lib/stores/teacherDashboardCache.svelte';

	// ============================================================================
	// PROPS
	// ============================================================================

	interface Props {
		classId: string;
		periodId: string;
	}

	let { classId, periodId }: Props = $props();

	// ============================================================================
	// TYPES
	// ============================================================================

	interface StudentData {
		id: string;
		firstname: string;
		lastname?: string | null;
		avatar_url?: string | null;
		role?: string | null;
		gender?: string | null;
		gidouilles: number;
		vipCards: StudentVipCards;
		warnings: StudentWarningCounts;
	}

	// ============================================================================
	// STATE
	// ============================================================================

	// Debounce timers for batching gidouille updates
	// Tracks pending API calls per student to batch rapid clicks
	let debounceTimers = $state<Record<string, ReturnType<typeof setTimeout>>>({});

	// Base gidouilles values (captured at first click, before optimistic updates)
	// Used to calculate accumulated delta correctly across multiple rapid clicks
	let baseGidouilles = $state<Record<string, number>>({});

	// ============================================================================
	// CACHE DATA ACCESS (Reactive via $derived)
	// ============================================================================

	// Get students from cache (reactively updates when cache changes)
	let students = $derived(teacherCache.getStudentsSync(classId));

	// Get rewards from cache (reactively updates when cache changes)
	let rewardsMap = $derived(teacherCache.getRewardsSync(classId));

	// Get warnings from cache (reactively updates when cache changes)
	let warningsMap = $derived(teacherCache.getWarningsSync(classId, periodId));

	// Merge data from cache into StudentData array (reactive)
	let studentsData = $derived(
		students.map((student) => {
			const rewards = rewardsMap?.get(student.id);
			const warnings = warningsMap?.get(student.id);
			return {
				id: student.id,
				firstname: student.firstname,
				lastname: student.lastname,
				avatar_url: student.avatar_url,
				role: student.role,
				gender: student.gender,
				gidouilles: rewards?.gidouilles ?? 0,
				vipCards: rewards?.vip_cards ?? {},
				warnings: warnings ?? { C: 0, M: 0, R: 0, T: 0 }
			};
		})
	);

	/**
	 * Calculate total warnings from counts
	 */
	function getTotalWarnings(counts: StudentWarningCounts): number {
		return counts.C + counts.M + counts.R + counts.T;
	}

	/**
	 * Calculate score from total warnings (20 - total, clamped 0-20)
	 */
	function getScore(counts: StudentWarningCounts): number {
		const total = getTotalWarnings(counts);
		return Math.max(0, Math.min(20, 20 - total));
	}

	/**
	 * Get warning score badge color based on score
	 */
	function getScoreBadgeVariant(score: number): 'default' | 'destructive' | 'secondary' {
		if (score >= 15) return 'default'; // Green
		if (score >= 10) return 'secondary'; // Orange
		return 'destructive'; // Red
	}

	// ============================================================================
	// VIP CARD HELPERS
	// ============================================================================

	/**
	 * Get unused VIP cards (usedAt === null)
	 */
	function getUnusedVipCards(
		vipCards: StudentVipCards
	): Array<{ instanceId: string; cardId: string }> {
		return Object.entries(vipCards)
			.filter(([_, card]) => card && card.usedAt === null)
			.map(([instanceId, card]) => ({ instanceId, cardId: card.cardId }));
	}

	/**
	 * Select random card from array
	 */
	function selectRandomCard(cards: Array<{ instanceId: string; cardId: string }>) {
		const randomIndex = Math.floor(Math.random() * cards.length);
		return cards[randomIndex];
	}

	// ============================================================================
	// ACTION HANDLERS
	// ============================================================================

	/**
	 * Handle warning button click (3-step logic)
	 */
	async function handleWarningAction(student: StudentData) {
		const gidouilles = student.gidouilles;
		const unusedVipCards = getUnusedVipCards(student.vipCards);
		const score = getScore(student.warnings);

		// STEP 1: Remove gidouille if > 0 (optimistic UI + debounced API call)
		if (gidouilles > 0) {
			const studentId = student.id;

			// Save base value on first click (before any optimistic updates)
			if (!debounceTimers[studentId]) {
				baseGidouilles[studentId] = gidouilles;
			}

			// 1. Instant optimistic update via cache
			teacherCache.updateGidouillesOptimistic(classId, studentId, -1);

			// 2. Clear existing timer for this student
			if (debounceTimers[studentId]) {
				clearTimeout(debounceTimers[studentId]);
			}

			// 3. Set new debounced timer (500ms)
			debounceTimers[studentId] = setTimeout(async () => {
				// Get current optimistic value from cache
				const currentOptimistic =
					teacherCache.getRewardsSync(classId)?.get(studentId)?.gidouilles ?? gidouilles;
				// Use saved base value (from first click) instead of current value
				const baseValue = baseGidouilles[studentId] ?? gidouilles;
				const actualChange = currentOptimistic - baseValue;

				if (actualChange === 0) return;

				try {
					const response = await fetch('/api/rewards/gidouilles', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							studentId,
							amount: actualChange
						})
					});

					if (response.ok) {
						// Success: Cache already has correct optimistic value
						// Show toast with accumulated amount
						const amountStr = actualChange > 0 ? `+${actualChange}` : `${actualChange}`;
						const plural = Math.abs(actualChange) > 1 ? 's' : '';
						toaster.success(`${amountStr} gidouille${plural} (${student.firstname})`);
					} else {
						throw new Error('Failed');
					}
				} catch (_error) {
					// Rollback optimistic update by reversing delta
					teacherCache.updateGidouillesOptimistic(classId, studentId, -actualChange);
					toaster.error('Erreur lors du retrait de la gidouille');
				}

				// Clean up timer AND base value
				const newTimers = { ...debounceTimers };
				delete newTimers[studentId];
				debounceTimers = newTimers;

				const newBase = { ...baseGidouilles };
				delete newBase[studentId];
				baseGidouilles = newBase;
			}, 500);

			return;
		}

		// STEP 2: Remove random VIP card if has cards
		if (unusedVipCards.length > 0) {
			const studentId = student.id;
			const randomCard = selectRandomCard(unusedVipCards);

			// 1. Instant optimistic update via cache - remove card from collection
			const currentVipCards = rewardsMap?.get(studentId)?.vip_cards ?? {};
			const newVipCards = { ...currentVipCards };
			delete newVipCards[randomCard.instanceId];

			teacherCache.updateVipCardsOptimistic(classId, studentId, newVipCards);

			// 2. Make API call
			try {
				// Call API endpoint to remove VIP card
				const response = await fetch('/api/rewards/vip-cards/remove', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						studentId,
						cardId: randomCard.cardId
					})
				});

				if (!response.ok) {
					const errorText = await response.text();
					throw new Error(errorText || 'Failed to remove VIP card');
				}

				// Success: Cache already has correct optimistic value
				toaster.success(`Carte VIP retirée (${student.firstname})`);
			} catch (error) {
				// Rollback optimistic update by restoring previous state
				teacherCache.updateVipCardsOptimistic(classId, studentId, currentVipCards);

				const errorMessage =
					error instanceof Error ? error.message : 'Erreur lors du retrait de la carte';
				toaster.error(errorMessage);
			}
			return;
		}

		// STEP 3: Add warning C if score ≠ 0
		if (score !== 0) {
			const studentId = student.id;

			// 1. Instant optimistic update via cache
			const currentWarnings = warningsMap?.get(studentId) ?? { C: 0, M: 0, R: 0, T: 0 };
			const newWarnings: StudentWarningCounts = {
				C: currentWarnings.C + 1,
				M: currentWarnings.M,
				R: currentWarnings.R,
				T: currentWarnings.T
			};

			teacherCache.updateWarningsOptimistic(classId, periodId, studentId, newWarnings);

			// 2. Make API call
			try {
				const response = await fetch('/api/warnings', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						student_id: studentId,
						warning_type: 'C',
						class_id: classId,
						academic_period_id: periodId
					})
				});

				if (response.ok) {
					// Success: Cache already has correct optimistic value
					toaster.success(`Avertissement de conduite ajouté (${student.firstname})`);
				} else {
					throw new Error('Failed');
				}
			} catch (_error) {
				// Rollback optimistic update by restoring previous state
				teacherCache.updateWarningsOptimistic(classId, periodId, studentId, currentWarnings);
				toaster.error("Erreur lors de l'ajout de l'avertissement");
			}
			return;
		}

		// Edge case: Already at 20 warnings
		toaster.warning(`${student.firstname} a déjà 20 avertissements`);
	}

	/**
	 * Handle add gidouille button click (optimistic UI + debounced API call)
	 * Batches rapid clicks into single API call after 500ms of inactivity
	 */
	async function handleAddGidouille(student: StudentData) {
		const studentId = student.id;
		const gidouilles = student.gidouilles;

		// Save base value on first click (before any optimistic updates)
		if (!debounceTimers[studentId]) {
			baseGidouilles[studentId] = gidouilles;
		}

		// 1. Instant optimistic update via cache
		teacherCache.updateGidouillesOptimistic(classId, studentId, +1);

		// 2. Clear existing timer for this student
		if (debounceTimers[studentId]) {
			clearTimeout(debounceTimers[studentId]);
		}

		// 3. Set new debounced timer (500ms)
		debounceTimers[studentId] = setTimeout(async () => {
			// Get current optimistic value from cache
			const currentOptimistic =
				teacherCache.getRewardsSync(classId)?.get(studentId)?.gidouilles ?? gidouilles;
			// Use saved base value (from first click) instead of current value
			const baseValue = baseGidouilles[studentId] ?? gidouilles;
			const actualChange = currentOptimistic - baseValue;

			if (actualChange === 0) return;

			try {
				const response = await fetch('/api/rewards/gidouilles', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						studentId,
						amount: actualChange
					})
				});

				if (response.ok) {
					// Success: Cache already has correct optimistic value
					// Show toast with accumulated amount
					const amountStr = actualChange > 0 ? `+${actualChange}` : `${actualChange}`;
					const plural = Math.abs(actualChange) > 1 ? 's' : '';
					toaster.success(`${amountStr} gidouille${plural} (${student.firstname})`);
				} else {
					throw new Error('Failed');
				}
			} catch (_error) {
				// Rollback optimistic update by reversing delta
				teacherCache.updateGidouillesOptimistic(classId, studentId, -actualChange);
				toaster.error("Erreur lors de l'ajout de la gidouille");
			}

			// Clean up timer AND base value
			const newTimers = { ...debounceTimers };
			delete newTimers[studentId];
			debounceTimers = newTimers;

			const newBase = { ...baseGidouilles };
			delete newBase[studentId];
			baseGidouilles = newBase;
		}, 500);
	}

	/**
	 * Handle show VIP cards button click
	 */
	function handleShowVipCards(student: StudentData) {
		openVipCardsModal({
			studentId: student.id,
			studentName: student.firstname,
			classId,
			periodId,
			teacherView: true
		});
	}
</script>

<!-- ============================================================================ -->
<!-- TEMPLATE -->
<!-- ============================================================================ -->

<div class="rounded-md border">
	{#if studentsData.length === 0}
		<!-- Empty State -->
		<div class="flex flex-col items-center justify-center p-8 text-center">
			<p class="text-muted-foreground">Aucun élève dans cette classe</p>
		</div>
	{:else}
		<!-- Student Table -->
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head class="w-[200px]">Prénom</Table.Head>
					<Table.Head class="w-[80px] text-center">🪙</Table.Head>
					<Table.Head class="w-[80px] text-center">🎴</Table.Head>
					<Table.Head class="w-[80px] text-center">⚠️</Table.Head>
					<Table.Head class="w-[200px] text-right">Actions</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each studentsData as student (student.id)}
					{@const gidouilles = student.gidouilles}
					{@const vipCards = student.vipCards}
					{@const warnings = student.warnings}
					{@const vipCardCount = Object.keys(vipCards).length}

					<Table.Row>
						<!-- Name with Avatar -->
						<Table.Cell class="font-medium">
							<div class="flex items-center gap-2">
								<Avatar.Root class="h-8 w-8">
									{#if student.avatar_url}
										<Avatar.Image src={student.avatar_url} alt={student.firstname} />
									{/if}
									<Avatar.Fallback>
										<img
											src={getAvatarFallback(
												(student.role as 'student' | 'teacher' | 'admin') || 'student',
												student.gender === 'boy' ? 'M' : student.gender === 'girl' ? 'F' : null
											)}
											alt={student.firstname}
										/>
									</Avatar.Fallback>
								</Avatar.Root>
								<span>{student.firstname}</span>
							</div>
						</Table.Cell>

						<!-- Gidouilles -->
						<Table.Cell class="text-center">
							<Badge variant="secondary">{gidouilles}</Badge>
						</Table.Cell>

						<!-- VIP Cards -->
						<Table.Cell class="text-center">
							{#if vipCardCount > 0}
								<Badge variant="default">{vipCardCount}</Badge>
							{:else}
								<span class="text-muted-foreground">-</span>
							{/if}
						</Table.Cell>

						<!-- Warnings Score -->
						<Table.Cell class="text-center">
							<Badge variant={getScoreBadgeVariant(getScore(warnings))}>
								{getScore(warnings)}/20
							</Badge>
						</Table.Cell>

						<!-- Actions -->
						<Table.Cell class="text-right">
							<div class="flex items-center justify-end gap-1">
								<!-- Warning Button -->
								<Button
									size="sm"
									variant="outline"
									onclick={() => handleWarningAction(student)}
									title="Avertissement (retire gidouille → carte → ajoute avertissement)"
								>
									<AlertTriangle class="h-4 w-4 text-orange-500" />
								</Button>

								<!-- Add Gidouille Button -->
								<Button
									size="sm"
									variant="outline"
									onclick={() => handleAddGidouille(student)}
									title="Ajouter 1 gidouille"
								>
									<Plus class="h-4 w-4 text-green-500" />
								</Button>

								<!-- View VIP Cards Button -->
								<Button
									size="sm"
									variant="outline"
									onclick={() => handleShowVipCards(student)}
									title="Voir les cartes VIP"
									disabled={vipCardCount === 0}
								>
									<Eye class="h-4 w-4 text-purple-500" />
								</Button>
							</div>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	{/if}
</div>

<!-- VIP Cards Modal is now managed by modal stack via openVipCardsModal() -->
