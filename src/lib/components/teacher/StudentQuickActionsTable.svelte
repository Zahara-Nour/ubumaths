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
		- Add gidouille button (+1): Instant optimistic UI
		- View VIP cards button (🎴): Opens modal with all cards
	- Color-coded warning scores: green (≥15), orange (10-14), red (<10)
	- Optimistic UI for instant feedback
	- Cross-device polling (5s) for real-time sync

	OPTIMISTIC UI PATTERN:
	----------------------
	All actions use optimistic updates for instant feedback:

	1. INSTANT FEEDBACK (Optimistic Update)
		 - Action triggers immediate UI update (0ms latency)
		 - Local state (optimisticUpdates) overrides server data
		 - User sees change immediately without waiting

	2. BACKGROUND SYNC
		 - Request sent to server in background
		 - On success: Clear optimistic state, show success toast
		 - On error: Rollback optimistic state, show error toast

	3. POLLING SYNCHRONIZATION (5 seconds)
		 - Auto-reloads data every 5s for cross-device sync
		 - Pauses while user is actively editing (isEditing flag)
		 - Resumes 2s after last action completes
		 - Ensures projector + laptop stay in sync

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

	CROSS-DEVICE POLLING:
	---------------------
	- Polls every 5s when tab is visible and not editing
	- markEditing() sets isEditing = true, clears after 2s
	- Pauses polling during active edits to prevent conflicts
	- Resumes automatically when user stops interacting
	- Document visibility API pauses polling when tab hidden
	- Reloads data when tab becomes visible again

	TECHNICAL DETAILS:
	------------------
	- Uses Svelte 5 runes ($state, $derived, $effect, $props)
	- Three cache stores: teacherStudentsCache, gidouillesCache, warningsCache
	- Parallel data loading (Promise.all) for fast initial render
	- Optimistic state tracks all pending changes per student
	- Immutable updates for proper reactivity
	- Cleanup in $effect return function

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
	import { teacherStudentsCache } from '$lib/stores/teacherStudentsCache.svelte';
	import { gidouillesCache } from '$lib/stores/gidouillesCache.svelte';
	import { warningsCache, type StudentWarningCounts } from '$lib/stores/warningsCache.svelte';
	import VipCardsModal from '$lib/components/VipCardsModal.svelte';
	import { getAvatarFallback } from '$lib/utils/avatar';
	import { AlertTriangle, Plus, Eye, Loader2 } from 'lucide-svelte';
	import type { StudentVipCards } from '$lib/types/vip-card';

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
		lastname?: string;
		avatar_url?: string;
		role?: string;
		gender?: string;
		gidouilles: number;
		vipCards: StudentVipCards;
		warnings: StudentWarningCounts;
	}

	// ============================================================================
	// STATE
	// ============================================================================

	// Student data (merged from 3 caches)
	let studentsData = $state<StudentData[]>([]);
	let isLoading = $state(true);

	// Optimistic UI state
	// Tracks temporary overrides for instant feedback
	// Example: { "student-123": { gidouilles: 5, warnings: {...} } }
	let optimisticUpdates = $state<Record<string, Partial<StudentData>>>({});

	// VIP cards modal state
	let vipModalOpen = $state(false);
	let selectedStudent = $state<StudentData | null>(null);

	// Polling control
	let pollInterval: ReturnType<typeof setInterval> | null = $state(null);
	let isEditing = $state(false);
	let editingTimeout: ReturnType<typeof setTimeout> | null = null;

	// ============================================================================
	// DERIVED STATE (With Optimistic Updates Applied)
	// ============================================================================

	/**
	 * Get gidouilles for a student (with optimistic updates)
	 */
	function getGidouilles(student: StudentData): number {
		return optimisticUpdates[student.id]?.gidouilles ?? student.gidouilles;
	}

	/**
	 * Get VIP cards for a student (with optimistic updates)
	 */
	function getVipCards(student: StudentData): StudentVipCards {
		return optimisticUpdates[student.id]?.vipCards ?? student.vipCards;
	}

	/**
	 * Get warnings for a student (with optimistic updates)
	 */
	function getWarnings(student: StudentData): StudentWarningCounts {
		return optimisticUpdates[student.id]?.warnings ?? student.warnings;
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
	// DATA LOADING
	// ============================================================================

	/**
	 * Load student data from all 3 caches in parallel
	 */
	async function loadData() {
		isLoading = true;
		try {
			// Load from 3 caches in parallel (Promise.all for speed)
			const [students, gidouilles, warnings] = await Promise.all([
				teacherStudentsCache.getStudents(classId),
				gidouillesCache.get(classId),
				warningsCache.get(classId, periodId)
			]);

			// Merge data and sort by firstname
			studentsData = students
				.map((s) => ({
					...s,
					gidouilles: gidouilles.get(s.id)?.gidouilles ?? 0,
					vipCards: gidouilles.get(s.id)?.vip_cards ?? {},
					warnings: warnings.get(s.id) ?? {
						C: 0,
						M: 0,
						R: 0,
						T: 0,
						total: 0,
						score: 20,
						warnings: []
					}
				}))
				.sort((a, b) => a.firstname.localeCompare(b.firstname));
		} catch (_error) {
			console.error('[StudentQuickActions] Error loading data:', _error);
			toaster.error('Erreur de chargement des données');
		} finally {
			isLoading = false;
		}
	}

	/**
	 * Mark user as actively editing (pauses polling)
	 */
	function markEditing() {
		isEditing = true;
		if (editingTimeout) clearTimeout(editingTimeout);
		editingTimeout = setTimeout(() => {
			isEditing = false;
		}, 2000);
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
		const gidouilles = getGidouilles(student);
		const unusedVipCards = getUnusedVipCards(getVipCards(student));
		const score = getWarnings(student).score;

		markEditing();

		// STEP 1: Remove gidouille if > 0
		if (gidouilles > 0) {
			// Optimistic UI
			optimisticUpdates = {
				...optimisticUpdates,
				[student.id]: {
					...optimisticUpdates[student.id],
					gidouilles: gidouilles - 1
				}
			};

			try {
				const response = await fetch('/api/rewards/gidouilles', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ studentId: student.id, amount: -1 })
				});

				if (response.ok) {
					// Clear optimistic state
					const newUpdates = { ...optimisticUpdates };
					delete newUpdates[student.id]?.gidouilles;
					optimisticUpdates = newUpdates;

					// Invalidate cache
					gidouillesCache.invalidate(classId);

					toaster.success(`1 gidouille retirée (${student.firstname})`);
				} else {
					throw new Error('Failed');
				}
			} catch (_error) {
				// Rollback optimistic update
				const newUpdates = { ...optimisticUpdates };
				delete newUpdates[student.id]?.gidouilles;
				optimisticUpdates = newUpdates;
				toaster.error('Erreur lors du retrait de la gidouille');
			}
			return;
		}

		// STEP 2: Remove random VIP card if has cards
		if (unusedVipCards.length > 0) {
			const randomCard = selectRandomCard(unusedVipCards);

			// Optimistic UI - remove card from collection
			const newVipCards = { ...getVipCards(student) };
			delete newVipCards[randomCard.instanceId];

			optimisticUpdates = {
				...optimisticUpdates,
				[student.id]: {
					...optimisticUpdates[student.id],
					vipCards: newVipCards
				}
			};

			try {
				const response = await fetch('/api/vip-cards/remove', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						studentId: student.id,
						instanceId: randomCard.instanceId
					})
				});

				if (response.ok) {
					// Clear optimistic state
					const newUpdates = { ...optimisticUpdates };
					delete newUpdates[student.id]?.vipCards;
					optimisticUpdates = newUpdates;

					// Invalidate cache
					gidouillesCache.invalidate(classId);

					toaster.success(`Carte VIP retirée (${student.firstname})`);
				} else {
					throw new Error('Failed');
				}
			} catch (_error) {
				// Rollback optimistic update
				const newUpdates = { ...optimisticUpdates };
				delete newUpdates[student.id]?.vipCards;
				optimisticUpdates = newUpdates;
				toaster.error('Erreur lors du retrait de la carte');
			}
			return;
		}

		// STEP 3: Add warning C if score ≠ 0
		if (score !== 0) {
			// Optimistic UI - add warning
			const currentWarnings = getWarnings(student);
			const newWarnings: StudentWarningCounts = {
				...currentWarnings,
				C: currentWarnings.C + 1,
				total: currentWarnings.total + 1,
				score: currentWarnings.score - 1
			};

			optimisticUpdates = {
				...optimisticUpdates,
				[student.id]: {
					...optimisticUpdates[student.id],
					warnings: newWarnings
				}
			};

			try {
				const response = await fetch('/api/warnings', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						student_id: student.id,
						warning_type: 'C',
						class_id: classId,
						academic_period_id: periodId
					})
				});

				if (response.ok) {
					// Clear optimistic state
					const newUpdates = { ...optimisticUpdates };
					delete newUpdates[student.id]?.warnings;
					optimisticUpdates = newUpdates;

					// Invalidate cache
					warningsCache.invalidate(classId, periodId);

					toaster.success(`Avertissement de conduite ajouté (${student.firstname})`);
				} else {
					throw new Error('Failed');
				}
			} catch (_error) {
				// Rollback optimistic update
				const newUpdates = { ...optimisticUpdates };
				delete newUpdates[student.id]?.warnings;
				optimisticUpdates = newUpdates;
				toaster.error("Erreur lors de l'ajout de l'avertissement");
			}
			return;
		}

		// Edge case: Already at 20 warnings
		toaster.warning(`${student.firstname} a déjà 20 avertissements`);
	}

	/**
	 * Handle add gidouille button click
	 */
	async function handleAddGidouille(student: StudentData) {
		markEditing();
		const current = getGidouilles(student);

		// Optimistic UI
		optimisticUpdates = {
			...optimisticUpdates,
			[student.id]: {
				...optimisticUpdates[student.id],
				gidouilles: current + 1
			}
		};

		try {
			const response = await fetch('/api/rewards/gidouilles', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ studentId: student.id, amount: 1 })
			});

			if (response.ok) {
				// Clear optimistic state
				const newUpdates = { ...optimisticUpdates };
				delete newUpdates[student.id]?.gidouilles;
				optimisticUpdates = newUpdates;

				// Invalidate cache
				gidouillesCache.invalidate(classId);

				toaster.success(`+1 gidouille (${student.firstname})`);
			} else {
				throw new Error('Failed');
			}
		} catch (_error) {
			// Rollback optimistic update
			const newUpdates = { ...optimisticUpdates };
			delete newUpdates[student.id]?.gidouilles;
			optimisticUpdates = newUpdates;
			toaster.error("Erreur lors de l'ajout de la gidouille");
		}
	}

	/**
	 * Handle show VIP cards button click
	 */
	function handleShowVipCards(student: StudentData) {
		selectedStudent = student;
		vipModalOpen = true;
	}

	// ============================================================================
	// EFFECTS
	// ============================================================================

	/**
	 * Load data on mount and when classId/periodId changes
	 */
	$effect(() => {
		if (classId && periodId) {
			loadData();
		}
	});

	/**
	 * Polling effect (5s interval with smart pausing)
	 */
	$effect(() => {
		// Only poll if:
		// - classId and periodId are set
		// - User is not actively editing
		// - Tab is visible
		if (classId && periodId && !isEditing && document.visibilityState === 'visible') {
			pollInterval = setInterval(async () => {
				console.log('[StudentQuickActions] Polling (cross-device sync)');
				await loadData();
			}, 60000);
		} else {
			if (pollInterval) {
				clearInterval(pollInterval);
				pollInterval = null;
			}
		}

		// Cleanup on unmount or when dependencies change
		return () => {
			if (pollInterval) clearInterval(pollInterval);
			if (editingTimeout) clearTimeout(editingTimeout);
		};
	});

	/**
	 * Visibility change handler (reload when tab becomes visible)
	 */
	$effect(() => {
		const handleVisibilityChange = async () => {
			if (document.visibilityState === 'visible' && classId && periodId && !isEditing) {
				console.log('[StudentQuickActions] Tab visible - reloading');
				await loadData();
			}
		};

		document.addEventListener('visibilitychange', handleVisibilityChange);

		return () => {
			document.removeEventListener('visibilitychange', handleVisibilityChange);
		};
	});
</script>

<!-- ============================================================================ -->
<!-- TEMPLATE -->
<!-- ============================================================================ -->

<div class="rounded-md border">
	{#if isLoading}
		<!-- Loading State -->
		<div class="flex items-center justify-center p-8">
			<Loader2 class="h-6 w-6 animate-spin text-muted-foreground" />
			<span class="ml-2 text-muted-foreground">Chargement...</span>
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
					<Table.Head class="w-[200px]">Prénom</Table.Head>
					<Table.Head class="w-[80px] text-center">🪙</Table.Head>
					<Table.Head class="w-[80px] text-center">🎴</Table.Head>
					<Table.Head class="w-[80px] text-center">⚠️</Table.Head>
					<Table.Head class="w-[200px] text-right">Actions</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#each studentsData as student (student.id)}
					{@const gidouilles = getGidouilles(student)}
					{@const vipCards = getVipCards(student)}
					{@const warnings = getWarnings(student)}
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
												(student.gender as 'boy' | 'girl' | null) || null
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
							<Badge variant={getScoreBadgeVariant(warnings.score)}>
								{warnings.score}/20
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

<!-- VIP Cards Modal -->
{#if selectedStudent}
	<VipCardsModal
		bind:open={vipModalOpen}
		studentName={selectedStudent.firstname}
		studentId={selectedStudent.id}
		vipCards={getVipCards(selectedStudent)}
		teacherView={true}
	/>
{/if}
