<!--
	StudentQuickActionsTable Component
	====================================

	Compact student table with quick action buttons for the teacher dashboard.

	FEATURES:
	---------
	- Displays students sorted alphabetically by firstname
	- Shows: Name | Gidouilles | VIP Cards | Bonus | Warnings Score
	- All columns are clickable:
		- Click on gidouilles count: Add 1 gidouille (instant optimistic UI update)
		- Click on VIP cards count: Opens modal with all cards
		- Click on bonus count: Add 1 bonus (instant optimistic UI update)
		- Click on warnings score: 3-step logic (remove gidouille → remove VIP card → add warning)
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
		- Adds Comportement warning instantly
		- Decrements warning score by 1
		- Sends notification: "Avertissement de Comportement"

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
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { StudentWarningCounts } from '$lib/server/warnings';
	import { openVipCardsModal } from '$lib/utils/vip-card-modals';
	import { openBonusReasonModal } from '$lib/utils/bonus-modals';
	import { getAvatarInitials, getAvatarUrl } from '$lib/utils/avatar';
	import { onDestroy } from 'svelte';
	import { Star, Loader2, ScrollText } from 'lucide-svelte';
	import gidouilleImg from '$lib/assets/images/gidouille.png';
	import type { StudentVipCards } from '$lib/types/vip-card';
	import { getTotalUnusedCards } from '$lib/utils/vip-cards';
	import { teacherCache } from '$lib/stores/teacherDashboardCache.svelte';
	import { WARNING_TYPE_LABELS, type WarningType } from '$lib/types/warnings';

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
		gidouilles: number;
		bonus: number;
		vipCards: StudentVipCards;
		warnings: StudentWarningCounts;
	}

	// ============================================================================
	// STATE
	// ============================================================================

	// Pending gidouille submissions: accumulates delta per student, sends after 500ms
	const pendingGidouilles: Record<string, { timeoutId: number; accumulatedDelta: number }> = {};

	// Warning submission queue: serializes API calls per student (no debounce - each click = 1 POST)
	const warningQueues: Record<string, Promise<void>> = {};

	// ============================================================================
	// CACHE DATA ACCESS (Reactive via $derived)
	// ============================================================================

	// Check if students are cached (for loading state detection)
	let isLoading = $derived(!teacherCache.hasStudentsCached(classId));

	// Get students from cache (reactively updates when cache changes)
	let students = $derived(teacherCache.getStudentsSync(classId));

	// Get rewards from cache (reactively updates when cache changes)
	let rewardsMap = $derived(teacherCache.getRewardsSync(classId));

	// Get warnings from cache (reactively updates when cache changes)
	let warningsMap = $derived(teacherCache.getWarningsSync(classId, periodId));

	// Merge data from cache into StudentData array (reactive), sorted by firstname A→Z
	let studentsData = $derived(
		students
			.map((student) => {
				const rewards = rewardsMap?.get(student.id);
				const warnings = warningsMap?.get(student.id);
				return {
					id: student.id,
					firstname: student.firstname,
					lastname: student.lastname,
					avatar_url: student.avatar_url,
					role: student.role,
					gidouilles: rewards?.gidouilles ?? 0,
					bonus: rewards?.bonus ?? 0,
					vipCards: rewards?.vip_cards ?? {},
					warnings: warnings ?? { C: 0, M: 0, R: 0, T: 0 }
				};
			})
			.sort((a, b) => a.firstname.localeCompare(b.firstname, 'fr'))
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
	 * Debounced gidouille update (shared by add and warning actions)
	 * Accumulates delta directly, sends single API call after 500ms of inactivity
	 */
	function debouncedUpdateGidouilles(studentId: string, delta: number, studentName: string) {
		// 1. Instant optimistic update
		teacherCache.updateGidouillesOptimistic(classId, studentId, delta);

		// 2. Accumulate delta and reset debounce timer
		if (pendingGidouilles[studentId]) {
			clearTimeout(pendingGidouilles[studentId].timeoutId);
			pendingGidouilles[studentId].accumulatedDelta += delta;
		} else {
			pendingGidouilles[studentId] = { timeoutId: 0, accumulatedDelta: delta };
		}

		// 3. Set new debounced timer (500ms)
		const timeoutId = setTimeout(async () => {
			const accumulatedDelta = pendingGidouilles[studentId].accumulatedDelta;
			delete pendingGidouilles[studentId];

			if (accumulatedDelta === 0) return;

			try {
				const response = await fetch('/api/teacher/rewards/update-student', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ studentId, classId, delta: accumulatedDelta })
				});

				if (response.ok) {
					const amountStr = accumulatedDelta > 0 ? `+${accumulatedDelta}` : `${accumulatedDelta}`;
					const plural = Math.abs(accumulatedDelta) > 1 ? 's' : '';
					toaster.success(`${amountStr} gidouille${plural} (${studentName})`);
				} else {
					throw new Error('Failed');
				}
			} catch {
				teacherCache.updateGidouillesOptimistic(classId, studentId, -accumulatedDelta);
				toaster.error('Erreur lors de la mise a jour des gidouilles');
			}
		}, 500) as unknown as number;

		pendingGidouilles[studentId].timeoutId = timeoutId;
	}

	/**
	 * Handle warning button click (3-step logic)
	 */
	async function handleWarningAction(student: StudentData) {
		const gidouilles = student.gidouilles;
		const unusedVipCards = getUnusedVipCards(student.vipCards);
		const score = getScore(student.warnings);

		// STEP 1: Remove gidouille if > 0 (optimistic UI + debounced API call)
		if (gidouilles > 0) {
			debouncedUpdateGidouilles(student.id, -1, student.firstname);
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
				const response = await fetch('/api/vip-cards/remove', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
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

		// STEP 3: Add warning C if score ≠ 0 (uses shared queue to avoid conflicts)
		if (score !== 0) {
			handleAddWarning(student, 'C');
			return;
		}

		// Edge case: Already at 20 warnings
		toaster.warning(`${student.firstname} a déjà 20 avertissements`);
	}

	/**
	 * Handle add gidouille button click (optimistic UI + debounced API call)
	 * Batches rapid clicks into single API call after 500ms of inactivity
	 */
	function handleAddGidouille(student: StudentData) {
		debouncedUpdateGidouilles(student.id, +1, student.firstname);
	}

	/**
	 * Handle add bonus click - opens modal to select reason
	 * Each click = 1 modal = +1 bonus (no debouncing)
	 */
	function handleAddBonus(student: StudentData) {
		openBonusReasonModal({
			studentName: student.firstname,
			onConfirm: async (reason: string) => {
				const studentId = student.id;

				// 1. Instant optimistic update via cache
				teacherCache.updateBonusOptimistic(classId, studentId, +1);

				// 2. Immediate API call with reason
				try {
					const response = await fetch('/api/teacher/rewards/update-student-bonus', {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						credentials: 'include',
						body: JSON.stringify({
							studentId,
							classId,
							delta: 1,
							reason
						})
					});

					if (response.ok) {
						toaster.success(`+1 bonus (${student.firstname})`);
					} else {
						throw new Error('Failed');
					}
				} catch (_error) {
					// Rollback optimistic update
					teacherCache.updateBonusOptimistic(classId, studentId, -1);
					toaster.error("Erreur lors de l'ajout du bonus");
				}
			}
		});
	}

	/**
	 * Add a specific warning type (R, T, M) with optimistic UI and serialized API calls.
	 * Each click = 1 API call, queued to avoid race conditions.
	 */
	function handleAddWarning(student: StudentData, warningType: WarningType) {
		const studentId = student.id;

		// 1. Save current state for rollback
		const previousCounts = warningsMap?.get(studentId) ?? { C: 0, M: 0, R: 0, T: 0 };

		// 2. Apply optimistic update
		const newCounts: StudentWarningCounts = { ...previousCounts };
		newCounts[warningType]++;
		teacherCache.updateWarningsOptimistic(classId, periodId, studentId, newCounts);

		// 3. Queue API call (serialized per student)
		const previous = warningQueues[studentId] ?? Promise.resolve();
		warningQueues[studentId] = previous.then(async () => {
			try {
				const response = await fetch('/api/warnings', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					credentials: 'include',
					body: JSON.stringify({
						student_id: studentId,
						warning_type: warningType,
						class_id: classId,
						academic_period_id: periodId
					})
				});

				if (response.ok) {
					toaster.success(`+${WARNING_TYPE_LABELS[warningType]} (${student.firstname})`);
				} else {
					throw new Error('Failed');
				}
			} catch {
				// Rollback this specific increment
				const current = warningsMap?.get(studentId) ?? { C: 0, M: 0, R: 0, T: 0 };
				const rolledBack: StudentWarningCounts = { ...current };
				rolledBack[warningType] = Math.max(0, rolledBack[warningType] - 1);
				teacherCache.updateWarningsOptimistic(classId, periodId, studentId, rolledBack);
				toaster.error("Erreur lors de l'ajout de l'avertissement");
			}
		});
	}

	// Clear pending timers on component unmount
	onDestroy(() => {
		Object.values(pendingGidouilles).forEach(({ timeoutId }) => {
			clearTimeout(timeoutId);
		});
	});

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
	{#if isLoading}
		<!-- Loading State -->
		<div class="flex flex-col items-center justify-center p-8 text-center">
			<Loader2 class="h-8 w-8 animate-spin text-primary" />
			<p class="mt-2 text-sm text-muted-foreground">Chargement des élèves...</p>
		</div>
	{:else if studentsData.length === 0}
		<!-- Empty State -->
		<div class="flex flex-col items-center justify-center p-8 text-center">
			<p class="text-muted-foreground">Aucun élève dans cette classe</p>
		</div>
	{:else}
		<!-- Student Table -->
		<Table.Root>
			<Table.Header>
				<Table.Row>
					<Table.Head class="w-[200px]">Élève</Table.Head>
					<Table.Head class="w-[80px] text-center">
						<img src={gidouilleImg} alt="Gidouilles" class="mx-auto h-5 w-5" />
					</Table.Head>
					<Table.Head class="w-[80px] text-center">
						<!-- VIP Card Back Miniature -->
						<div
							class="mx-auto h-7 w-5 overflow-hidden rounded-sm border border-amber-400 bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 shadow-sm"
						>
							<div class="flex h-full items-center justify-center">
								<span
									class="text-[8px] font-black tracking-tight text-white"
									style="text-shadow: 0.5px 0.5px 1px rgba(0,0,0,0.3);">VIP</span
								>
							</div>
						</div>
					</Table.Head>
					<Table.Head class="w-[80px] text-center">
						<Star class="mx-auto h-5 w-5 fill-amber-400 text-amber-400" />
					</Table.Head>
					<Table.Head class="w-[120px] text-center">
						<span class="text-xs font-medium text-muted-foreground">+Avert.</span>
					</Table.Head>
					<Table.Head class="w-[80px] text-center">
						<!-- Danger Icon -->
						<div
							class="mx-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white shadow-sm"
						>
							<span class="text-xs leading-none font-bold">!</span>
						</div>
					</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each studentsData as student (student.id)}
					{@const gidouilles = student.gidouilles}
					{@const bonus = student.bonus}
					{@const vipCards = student.vipCards}
					{@const warnings = student.warnings}
					{@const vipCardCount = getTotalUnusedCards(vipCards)}

					<Table.Row>
						<!-- Name with Avatar -->
						<Table.Cell class="font-medium">
							<div class="flex items-center gap-2">
								<Avatar.Root class="h-8 w-8">
									<Avatar.Image
										src={getAvatarUrl({
											avatar_url: student.avatar_url,
											role: (student.role as 'student' | 'teacher' | 'admin') || 'student'
										})}
										alt={student.firstname}
									/>
									<Avatar.Fallback>
										{getAvatarInitials(student.firstname, student.lastname)}
									</Avatar.Fallback>
								</Avatar.Root>
								<span>
									{student.firstname}
									{#if student.lastname}
										<span class="text-muted-foreground">{student.lastname}</span>
									{/if}
								</span>
								<a
									href="/dashboard/teacher/students/{student.id}/journal"
									title="Voir l'historique des récompenses"
									class="ml-auto text-muted-foreground transition-colors hover:text-foreground"
								>
									<ScrollText class="h-4 w-4" />
								</a>
							</div>
						</Table.Cell>

						<!-- Gidouilles (cliquable pour ajouter) -->
						<Table.Cell class="text-center">
							<button
								type="button"
								onclick={() => handleAddGidouille(student)}
								title="Cliquer pour ajouter 1 gidouille"
								class="cursor-pointer transition-transform hover:scale-110 active:scale-95"
							>
								<Badge variant="secondary">{gidouilles}</Badge>
							</button>
						</Table.Cell>

						<!-- VIP Cards (cliquable pour voir les cartes) -->
						<Table.Cell class="text-center">
							{#if vipCardCount > 0}
								<button
									type="button"
									onclick={() => handleShowVipCards(student)}
									title="Cliquer pour voir les cartes VIP"
									class="cursor-pointer transition-transform hover:scale-110 active:scale-95"
								>
									<Badge variant="default">{vipCardCount}</Badge>
								</button>
							{:else}
								<span class="text-muted-foreground">-</span>
							{/if}
						</Table.Cell>

						<!-- Bonus (cliquable pour ajouter) -->
						<Table.Cell class="text-center">
							<button
								type="button"
								onclick={() => handleAddBonus(student)}
								title="Cliquer pour ajouter 1 bonus"
								class="cursor-pointer transition-transform hover:scale-110 active:scale-95"
							>
								{#if bonus > 0}
									<Badge variant="secondary" class="bg-amber-100 text-amber-700">{bonus}</Badge>
								{:else}
									<Badge variant="outline" class="text-muted-foreground">0</Badge>
								{/if}
							</button>
						</Table.Cell>

						<!-- Add Warning Buttons (R, T, M) -->
						<Table.Cell class="text-center">
							<div class="flex items-center justify-center gap-1">
								{#each ['R', 'T', 'M'] as type (type)}
									<button
										type="button"
										onclick={() => handleAddWarning(student, type as WarningType)}
										title="Ajouter un avertissement {WARNING_TYPE_LABELS[type as WarningType]}"
										class="cursor-pointer transition-transform hover:scale-110 active:scale-95"
									>
										<Badge variant={type === 'T' ? 'destructive' : 'secondary'} class="text-xs">
											{type}
										</Badge>
									</button>
								{/each}
							</div>
						</Table.Cell>

						<!-- Warnings Score (cliquable pour ajouter un avertissement) -->
						<Table.Cell class="text-center">
							<button
								type="button"
								onclick={() => handleWarningAction(student)}
								title="Cliquer pour ajouter un avertissement (retire gidouille → carte → ajoute avertissement)"
								class="cursor-pointer transition-transform hover:scale-110 active:scale-95"
							>
								<Badge variant={getScoreBadgeVariant(getScore(warnings))}>
									{getScore(warnings)}/20
								</Badge>
							</button>
						</Table.Cell>
					</Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	{/if}
</div>

<!-- VIP Cards Modal is now managed by modal stack via openVipCardsModal() -->
