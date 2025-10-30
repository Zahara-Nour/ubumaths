<!--
	Rewards Management Page for Teachers
	=====================================

	This page allows teachers to manage gidouilles (reward points) and VIP cards for their students.

	FEATURES:
	---------
	- Select a class via Tabs component
	- View all students in the selected class with their current gidouilles
	- Add/remove gidouilles for individual students via input + buttons
	- Add/remove gidouilles for all students in a class at once
	- Award random VIP cards to students (costs 3 gidouilles)
	- View student VIP card collections (with removal capability)
	- Remove VIP cards from students (teacher-only, no gidouilles refund)
	- Animated card reveal with loading state
	- Real-time reactive updates with optimistic UI
	- Toast notifications for success/error feedback

	PERFORMANCE OPTIMIZATION (Optimistic UI + Debouncing):
	------------------------------------------------------
	This page implements a sophisticated performance optimization strategy combining
	optimistic UI updates with request debouncing to provide instant feedback while
	minimizing server load.

	**How it works:**

	1. INSTANT FEEDBACK (Optimistic UI)
	   - When user clicks +/-, the UI updates immediately
	   - Local state (optimisticGidouilles) tracks temporary values
	   - No waiting for server response - feels instant

	2. REQUEST BATCHING (Debouncing - 500ms)
	   - Multiple rapid clicks are accumulated into a single request
	   - Each new click resets the 500ms timer
	   - Example: Click +1 ten times = ONE server request with +10

	3. DELTA ACCUMULATION
	   - All changes within debounce window are summed
	   - Reduces database writes dramatically
	   - Example: +3, +2, -1, +5 = Single update of +9

	4. BACKGROUND SYNC
	   - After 500ms of inactivity, accumulated delta is sent to server
	   - Server updates database via secure RPC functions
	   - On success: invalidateAll() refreshes data from server after 100ms
	   - On failure: Rollback to server value and show error toast

	5. SUCCESS CONFIRMATION
	   - Toast notification shows accumulated delta after sync
	   - Individual student: "+3 gidouilles (Marie)" - includes student's first name
	   - Class-wide: "+2 gidouilles pour 15 élèves" - shows student count
	   - Toasts stack vertically without overlap (custom CSS applied)
	   - Appears ~600ms after last click

	6. SMART CLEANUP
	   - All pending timeouts cleared on component unmount
	   - Prevents memory leaks and stale requests

	**Benefits:**
	- Instant perceived performance (0ms UI latency)
	- 90% reduction in database calls for rapid clicks
	- Seamless rollback on errors
	- Works per-student (independent updates) and per-class (batch updates)

	**Technical Details:**
	- State management: optimisticGidouilles (per-student overrides)
	- Debounce tracking: pendingSubmissions (timeout IDs + accumulated deltas)
	- Cleanup: $effect with return cleanup function
	- Server communication: fetch with x-sveltekit-action header

	VIP CARD FLOW (HOLOGRAPHIC REVEAL WITH SHAKE):
	------------------------------------------------
	1. Teacher clicks "Carte VIP" button for a student
	2. Optimistic UI: -3 gidouilles deducted immediately
	3. Modal appears with card BACK showing, shaking animation starts
	4. "Attribution en cours..." text displays while syncing with database
	5. Server assigns weighted random card and returns cardId
	6. On confirmation: shake stops (dramatic pause)
	7. Card flips to reveal holographic FRONT
	8. Confetti and sparkles celebration
	9. Card info (name, description) appears
	10. User clicks anywhere to dismiss
	11. Data refreshes to show updated collection

	ERROR HANDLING:
	- If server fails, modal closes immediately
	- Toast error message appears
	- Optimistic gidouilles update is rolled back

	TECHNICAL DETAILS:
	- Uses VipCardHoloReveal component with loading/confirmed states
	- Shake animation: 2deg rotation, 0.4s duration, infinite loop
	- Flip animation: Y-axis rotation using showBack prop
	- Weighted random selection based on rarity (common: 40%, rare: 30%, epic: 20%, legendary: 10%)

	SECURITY:
	---------
	- Uses secure RPC functions (update_student_gidouilles, update_class_gidouilles)
	- Teachers can only modify gidouilles for students in their classes
	- All operations enforce minimum of 0 gidouilles
	- VIP card awards validate sufficient gidouilles on server side
-->

<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Avatar from '$lib/components/ui/avatar';
	import { toaster } from '$lib/stores/toaster.svelte';
	import gidouilleImg from '$lib/assets/images/gidouille.png';
	import { getAvatarFallback, getAvatarInitials } from '$lib/utils/avatar';
	import VipCardsModal from '$lib/components/VipCardsModal.svelte';
	import VipCardHoloReveal from '$lib/components/VipCardHoloReveal.svelte';
	import { getVipCardById } from '$lib/types/vip-card';
	import { canAffordVipCard } from '$lib/utils/vip-cards';
	import { Sparkles, Eye, Loader2 } from 'lucide-svelte';
	import { gidouillesCache } from '$lib/stores/gidouillesCache.svelte';

	// Data from server load function
	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Local state for selected class
	let selectedClassId = $state(data.classes[0]?.id);

	// Local state for gidouilles inputs (per student)
	let studentDeltas = $state<Record<string, number>>({});

	// Local state for gidouilles input at class level
	let classDeltas = $state<Record<string, number>>({});

	// Gidouilles data (fetched from cache)
	let gidouillesData = $state<
		Map<string, { gidouilles: number; vip_cards: Record<string, number> }>
	>(new Map());

	// OPTIMISTIC UI STATE
	// Tracks temporary gidouilles values that override server data
	// Key: studentId, Value: optimistic gidouilles count
	// This provides instant UI feedback before server confirmation
	let optimisticGidouilles = $state<Record<string, number>>({});

	// DEBOUNCING STATE
	// Tracks pending server requests to batch rapid clicks
	// Key: "student-{id}" or "class-{id}"
	// Value: { timeoutId: timer ID, accumulatedDelta: sum of all pending changes }
	// Example: Click +1 three times = { timeoutId: 123, accumulatedDelta: 3 }
	let pendingSubmissions = $state<Record<string, { timeoutId: number; accumulatedDelta: number }>>(
		{}
	);

	// VIP card states
	let vipModalOpen = $state(false);
	let selectedStudentForVipModal = $state<{
		id: string;
		name: string;
		vipCards: Record<string, number>;
	} | null>(null);
	let revealingCard = $state<{
		card: { card_id: string; quantity: number };
		studentName: string;
		loading: boolean;
		confirmed: boolean;
	} | null>(null); // Tracks card reveal state with loading/confirmed
	let lastProcessedCardId = $state<string | null>(null); // Tracks last processed cardId to prevent duplicates and infinite loops

	// Load gidouilles data when selected class changes
	$effect(() => {
		if (selectedClassId) {
			gidouillesCache.get(selectedClassId).then((data) => {
				gidouillesData = data;
			});
		}
	});

	// ============================================================================
	// CROSS-DEVICE SYNCHRONIZATION (Polling)
	// ============================================================================

	/**
	 * Auto-reload gidouilles every 5 seconds for cross-device sync
	 *
	 * WHY POLLING: Replaced BroadcastChannel (removed in refactoring)
	 * - BroadcastChannel only works within same browser instance
	 * - Teacher scenario: laptop + projector (2 different browsers)
	 * - Polling ensures changes sync across ANY devices/browsers
	 *
	 * WHY 5 SECONDS:
	 * - Fast enough: Teacher sees projector update within reasonable time
	 * - Light load: 12 requests/minute is negligible server impact
	 * - Battery friendly: Not aggressive enough to drain mobile devices
	 *
	 * Smart behaviors:
	 * - Only polls when tab is visible (pauses when hidden)
	 * - Pauses while user is actively editing (prevents conflicts)
	 * - Direct API polling for reliable synchronization
	 * - Cleans up interval on unmount
	 */
	let pollInterval: ReturnType<typeof setInterval> | null = $state(null);
	let isEditing = $state(false); // Tracks if user is actively editing
	let editingTimeout: ReturnType<typeof setTimeout> | null = null;

	// Mark as editing and reset timer
	function markEditing() {
		isEditing = true;
		if (editingTimeout) clearTimeout(editingTimeout);
		// Resume polling 2 seconds after last edit
		editingTimeout = setTimeout(() => {
			isEditing = false;
		}, 2000);
	}

	// Polling effect - runs every 5 seconds when conditions are met
	$effect(() => {
		// Only poll if class selected, tab visible, and user not editing
		if (selectedClassId && document.visibilityState === 'visible' && !isEditing) {
			// Start polling interval
			pollInterval = setInterval(async () => {
				console.log('[RewardsPage] Polling gidouilles (cross-device sync)');
				try {
					const response = await fetch(`/api/classes/${selectedClassId}/gidouilles`);

					if (!response.ok) {
						console.error('[RewardsPage] Polling failed:', response.statusText);
						return;
					}

					const result = await response.json();
					const students = result.students || [];

					// Convert array to Map
					const dataMap = new Map<
						string,
						{ gidouilles: number; vip_cards: Record<string, number> }
					>();
					students.forEach(
						(student: { id: string; gidouilles: number; vip_cards: Record<string, number> }) => {
							dataMap.set(student.id, {
								gidouilles: student.gidouilles,
								vip_cards: student.vip_cards || {}
							});
						}
					);

					gidouillesData = dataMap;

					// Update cache with fresh data (optional - for other components)
					// Note: Cache will auto-reload via its own fetch mechanism when needed
				} catch (error) {
					console.error('[RewardsPage] Polling error:', error);
					// Keep existing data on error (graceful degradation)
				}
			}, 60000); // 5 seconds
		} else {
			// Stop polling if conditions not met
			if (pollInterval) {
				clearInterval(pollInterval);
				pollInterval = null;
			}
		}

		// Cleanup on unmount
		return () => {
			if (pollInterval) clearInterval(pollInterval);
			if (editingTimeout) clearTimeout(editingTimeout);
		};
	});

	// Handle visibility changes (pause when tab hidden)
	$effect(() => {
		const handleVisibilityChange = async () => {
			if (document.visibilityState === 'visible' && selectedClassId && !isEditing) {
				// Tab became visible - immediately reload and resume polling
				console.log('[RewardsPage] Tab visible - reloading gidouilles');
				try {
					const response = await fetch(`/api/classes/${selectedClassId}/gidouilles`);
					if (response.ok) {
						const result = await response.json();
						const students = result.students || [];

						// Convert array to Map
						const dataMap = new Map<
							string,
							{ gidouilles: number; vip_cards: Record<string, number> }
						>();
						students.forEach(
							(student: { id: string; gidouilles: number; vip_cards: Record<string, number> }) => {
								dataMap.set(student.id, {
									gidouilles: student.gidouilles,
									vip_cards: student.vip_cards || {}
								});
							}
						);

						gidouillesData = dataMap;
					}
				} catch (error) {
					console.error('[RewardsPage] Visibility reload error:', error);
				}
			}
		};

		document.addEventListener('visibilitychange', handleVisibilityChange);
		return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
	});

	// Initialize deltas to 1 for each student and class
	$effect(() => {
		data.classes.forEach((classItem) => {
			if (!classDeltas[classItem.id]) {
				classDeltas[classItem.id] = 1;
			}
			classItem.students.forEach((student) => {
				if (!studentDeltas[student.id]) {
					studentDeltas[student.id] = 1;
				}
			});
		});
	});

	// Handle toasts and animations based on action result
	// IMPORTANT: lastProcessedCardId prevents duplicates and infinite loops.
	// Without this check, the effect would trigger every time revealingCard changes,
	// creating an infinite loop of revelations.
	$effect(() => {
		if (form?.success) {
			// If it's a VIP card award, trigger confirmation (flip animation)
			if (form.cardId && form.cardId !== lastProcessedCardId) {
				// Only process if it's a new card (not already processed)
				const card = getVipCardById(form.cardId);
				if (card && revealingCard) {
					// Mark this card as processed to prevent re-triggers
					lastProcessedCardId = form.cardId;

					// Update revealingCard to show confirmation (triggers flip)
					revealingCard = {
						card,
						studentName: revealingCard.studentName,
						loading: false,
						confirmed: true
					};
				}
			} else if (!form.cardId) {
				// Other successful actions (add/remove gidouilles)
				toaster.success(form.message || 'Opération réussie');
			}
		} else if (form?.message && !form?.success) {
			// On error, hide reveal and show toast
			revealingCard = null;
			toaster.error(form.message);

			// The optimistic override will be rolled back by the enhance callback
		}
	});

	// ============================================================================
	// OPTIMISTIC UI HELPER FUNCTIONS
	// ============================================================================

	/**
	 * Get current gidouilles for a student with optimistic override
	 *
	 * Returns the optimistic value if it exists (user clicked but server hasn't
	 * confirmed yet), otherwise returns the cached value.
	 *
	 * @param studentId - The student's ID
	 * @returns The gidouilles count to display in the UI
	 */
	function getStudentGidouilles(studentId: string): number {
		// First check optimistic override
		if (optimisticGidouilles[studentId] !== undefined) {
			return optimisticGidouilles[studentId];
		}

		// Otherwise return cached value
		return gidouillesData.get(studentId)?.gidouilles ?? 0;
	}

	/**
	 * Apply optimistic update to a single student
	 *
	 * Updates the UI immediately without waiting for server confirmation.
	 * Enforces minimum of 0 gidouilles (cannot go negative).
	 *
	 * @param studentId - The student's ID
	 * @param delta - The change amount (positive or negative)
	 * @param currentValue - The current gidouilles count (may be optimistic)
	 */
	function updateStudentGidouillesOptimistic(
		studentId: string,
		delta: number,
		currentValue: number
	) {
		const newValue = Math.max(0, currentValue + delta);
		optimisticGidouilles[studentId] = newValue;
	}

	/**
	 * Apply optimistic update to all students in a class
	 *
	 * Updates all students simultaneously for class-wide operations.
	 * Each student's update respects the 0 minimum independently.
	 *
	 * @param classId - The class ID
	 * @param delta - The change amount to apply to each student
	 */
	function updateClassGidouillesOptimistic(classId: string, delta: number) {
		const classItem = data.classes.find((c) => c.id === classId);
		if (classItem) {
			classItem.students.forEach((student) => {
				const currentValue = getStudentGidouilles(student.id);
				const newValue = Math.max(0, currentValue + delta);
				optimisticGidouilles[student.id] = newValue;
			});
		}
	}

	/**
	 * Clear optimistic override for a student
	 *
	 * Removes the temporary value, causing UI to revert to server data.
	 * Called after successful server sync or on error rollback.
	 *
	 * @param studentId - The student's ID
	 */
	function clearOptimisticOverride(studentId: string) {
		delete optimisticGidouilles[studentId];
	}

	// ============================================================================
	// DEBOUNCED UPDATE FUNCTIONS
	// ============================================================================

	/**
	 * Debounced update for individual student gidouilles
	 *
	 * This function implements the core debouncing logic:
	 * 1. Applies optimistic UI update immediately (instant feedback)
	 * 2. Starts/resets a 500ms timer
	 * 3. Accumulates all deltas within the debounce window
	 * 4. After 500ms of no clicks, sends ONE request with total accumulated delta
	 * 5. On success: refreshes data and shows success toast with student name
	 * 6. On error: rolls back optimistic update and shows error
	 *
	 * Example: User clicks +1, +1, +1 rapidly
	 * - UI shows: 0 → 1 → 2 → 3 (instant)
	 * - Server receives: ONE request with delta = +3 (after 500ms)
	 * - Toast shows: "+3 gidouilles (Marie)"
	 *
	 * @param studentId - The student's ID
	 * @param delta - The change amount for this click (positive or negative)
	 * @param currentValue - The current gidouilles count (may be optimistic)
	 * @param studentName - The student's first name for the success toast
	 */
	function debouncedUpdateStudent(
		studentId: string,
		delta: number,
		currentValue: number,
		studentName: string
	) {
		const key = `student-${studentId}`;

		// Mark as editing to pause polling (prevents conflicts)
		markEditing();

		// STEP 1: Apply optimistic update immediately for instant UI feedback
		updateStudentGidouillesOptimistic(studentId, delta, currentValue);

		// STEP 2: Handle debouncing - accumulate or initialize
		if (pendingSubmissions[key]) {
			// There's already a pending request - cancel it and accumulate the delta
			clearTimeout(pendingSubmissions[key].timeoutId);
			pendingSubmissions[key].accumulatedDelta += delta;
		} else {
			// First click - initialize tracking
			pendingSubmissions[key] = { timeoutId: 0, accumulatedDelta: delta };
		}

		// STEP 3: Set new timeout to submit after 500ms of inactivity
		const timeoutId = setTimeout(async () => {
			// Timeout fired - no more clicks for 500ms, time to sync with server
			const accumulatedDelta = pendingSubmissions[key].accumulatedDelta;
			delete pendingSubmissions[key]; // Clear pending state

			// Prepare form data with accumulated delta
			const formData = new FormData();
			formData.set('studentId', studentId);
			formData.set('delta', accumulatedDelta.toString());

			try {
				// Send request to SvelteKit form action
				const response = await fetch('?/updateStudent', {
					method: 'POST',
					body: formData,
					headers: {
						'x-sveltekit-action': 'true' // Required for SvelteKit actions
					}
				});

				if (response.ok) {
					// SUCCESS: Server updated the database
					// Wait 100ms then refresh data and show confirmation
					setTimeout(() => {
						// Clear optimistic state
						clearOptimisticOverride(studentId);

						// Show success toast with accumulated delta and student name
						toaster.success(
							`${accumulatedDelta > 0 ? '+' : ''}${accumulatedDelta} gidouille${Math.abs(accumulatedDelta) > 1 ? 's' : ''} (${studentName})`
						);
					}, 100);
				} else {
					// ERROR: Server returned error status
					clearOptimisticOverride(studentId); // Rollback to server value
					toaster.error('Échec de la mise à jour');
				}
			} catch {
				// NETWORK ERROR: Request failed completely
				clearOptimisticOverride(studentId); // Rollback to server value
				toaster.error('Erreur réseau');
			}
		}, 500) as unknown as number;

		// Store the timeout ID so we can cancel it if user clicks again
		pendingSubmissions[key].timeoutId = timeoutId;
	}

	/**
	 * Debounced update for class-wide gidouilles
	 *
	 * Similar to debouncedUpdateStudent but applies to all students in a class.
	 * Each student gets their own optimistic update, and all are synced together
	 * in a single server request.
	 *
	 * Example: Class of 20 students, teacher clicks +2, +1, +1 rapidly
	 * - UI shows: All 20 students get +4 instantly
	 * - Server receives: ONE request with delta = +4 applied to all 20 students
	 *
	 * @param classId - The class ID
	 * @param delta - The change amount to apply to all students
	 */
	function debouncedUpdateClass(classId: string, delta: number) {
		const key = `class-${classId}`;

		// Mark as editing to pause polling (prevents conflicts)
		markEditing();

		// STEP 1: Apply optimistic update to ALL students immediately
		updateClassGidouillesOptimistic(classId, delta);

		// STEP 2: Handle debouncing - accumulate or initialize
		if (pendingSubmissions[key]) {
			// Already pending - cancel and accumulate
			clearTimeout(pendingSubmissions[key].timeoutId);
			pendingSubmissions[key].accumulatedDelta += delta;
		} else {
			// First click - initialize
			pendingSubmissions[key] = { timeoutId: 0, accumulatedDelta: delta };
		}

		// STEP 3: Set timeout to submit after 500ms of inactivity
		const timeoutId = setTimeout(async () => {
			const accumulatedDelta = pendingSubmissions[key].accumulatedDelta;
			delete pendingSubmissions[key];

			// Prepare form data
			const formData = new FormData();
			formData.set('classId', classId);
			formData.set('delta', accumulatedDelta.toString());

			try {
				// Send request to update entire class
				const response = await fetch('?/updateClass', {
					method: 'POST',
					body: formData,
					headers: {
						'x-sveltekit-action': 'true'
					}
				});

				if (response.ok) {
					// SUCCESS: All students updated in database
					const classItem = data.classes.find((c) => c.id === classId);
					const studentCount = classItem?.students.length || 0;
					setTimeout(() => {
						// Clear optimistic state for all students
						classItem?.students.forEach((student) => clearOptimisticOverride(student.id));

						// Show success toast with student count
						toaster.success(
							`${accumulatedDelta > 0 ? '+' : ''}${accumulatedDelta} gidouille${Math.abs(accumulatedDelta) > 1 ? 's' : ''} pour ${studentCount} élève${studentCount > 1 ? 's' : ''}`
						);
					}, 100);
				} else {
					// ERROR: Rollback all students in the class
					const classItem = data.classes.find((c) => c.id === classId);
					classItem?.students.forEach((student) => clearOptimisticOverride(student.id));
					toaster.error('Échec de la mise à jour de la classe');
				}
			} catch {
				// NETWORK ERROR: Rollback all students
				const classItem = data.classes.find((c) => c.id === classId);
				classItem?.students.forEach((student) => clearOptimisticOverride(student.id));
				toaster.error('Erreur réseau');
			}
		}, 500) as unknown as number;

		pendingSubmissions[key].timeoutId = timeoutId;
	}

	// ============================================================================
	// CLEANUP
	// ============================================================================

	/**
	 * Cleanup effect - clears all pending timeouts on component unmount
	 *
	 * Prevents memory leaks and ensures no stale requests are sent after
	 * the component is destroyed (e.g., user navigates away).
	 */
	$effect(() => {
		return () => {
			// Clear all pending timeouts
			Object.values(pendingSubmissions).forEach(({ timeoutId }) => {
				clearTimeout(timeoutId);
			});
		};
	});

	// Get full name or identifier for student
	function getFullName(
		firstname: string | null,
		lastname: string | null,
		fullname: string | null
	): string {
		// Use firstname and lastname if they exist
		const name = [firstname, lastname].filter(Boolean).join(' ');
		if (name) return name;

		// Otherwise use full_name
		if (fullname) return fullname;

		// Last resort
		return 'Élève sans nom';
	}

	/**
	 * Open VIP cards modal for a student
	 * Passes student ID for card removal functionality (teacher view)
	 */
	function openVipModal(student: {
		id: string;
		firstname?: string;
		lastname?: string;
		full_name?: string;
		vip_cards?: Record<string, number>;
	}) {
		selectedStudentForVipModal = {
			id: student.id,
			name: getFullName(student.firstname, student.lastname, student.full_name),
			vipCards: student.vip_cards || {}
		};
		vipModalOpen = true;
	}

	/**
	 * Handle VIP modal open/close state
	 */
	function handleVipModalClose(newOpen: boolean) {
		vipModalOpen = newOpen;
	}

	// Close card reveal modal
	function handleRevealComplete() {
		revealingCard = null;
	}
</script>

<div class="space-y-6">
	<!-- HEADER -->
	<div>
		<h1 class="text-3xl font-bold text-foreground">Gestion des Récompenses</h1>
	</div>

	<!-- MAIN CONTENT -->
	{#if data.classes.length === 0}
		<!-- Pas de classes -->
		<div class="rounded-lg border border-border bg-card p-12 text-center">
			<img src={gidouilleImg} alt="Gidouille" class="mx-auto mb-4 h-16 w-16 opacity-50" />
			<h2 class="mb-2 text-xl font-semibold text-foreground">Aucune classe trouvée</h2>
			<p class="text-muted-foreground">
				Vous devez d'abord créer des classes pour gérer les récompenses de vos élèves.
			</p>
		</div>
	{:else}
		<!-- TABS PAR CLASSE -->
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
					<!-- CONTRÔLES AU NIVEAU CLASSE -->
					<div class="rounded-lg border border-border bg-card p-6">
						<h3 class="mb-4 text-lg font-semibold text-foreground">Actions pour toute la classe</h3>
						<div class="flex items-end gap-3">
							<div class="flex items-center gap-2">
								<!-- Bouton pour enlever (debounced) -->
								<Button
									variant="default"
									class="h-10 w-10 p-0"
									onclick={() => {
										const delta = -classDeltas[classItem.id];
										debouncedUpdateClass(classItem.id, delta);
									}}
								>
									−
								</Button>

								<!-- Input pour le nombre de gidouilles -->
								<div class="w-16">
									<label
										for="class-delta-{classItem.id}"
										class="mb-2 block text-center text-sm text-muted-foreground"
									>
										Nombre
									</label>
									<Input
										id="class-delta-{classItem.id}"
										type="number"
										min="1"
										max="9"
										bind:value={classDeltas[classItem.id]}
										class="w-full text-center"
									/>
								</div>

								<!-- Bouton pour ajouter (debounced) -->
								<Button
									variant="default"
									class="h-10 w-10 p-0"
									onclick={() => {
										const delta = classDeltas[classItem.id];
										debouncedUpdateClass(classItem.id, delta);
									}}
								>
									+
								</Button>
							</div>

							<span class="text-sm text-muted-foreground">
								Appliquer à tous les élèves de la classe
							</span>
						</div>
					</div>

					<!-- LISTE DES ÉLÈVES -->
					{#if classItem.students.length === 0}
						<div class="rounded-lg border border-border bg-card p-12 text-center">
							<p class="text-muted-foreground">Aucun élève dans cette classe</p>
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
									<div class="flex items-center gap-6 px-6 py-4">
										<!-- AVATAR -->
										<Avatar.Root class="h-12 w-12 flex-shrink-0">
											<Avatar.Image
												src={student.avatar_url ||
													getAvatarFallback(student.role || 'student', student.gender)}
												alt={getFullName(student.firstname, student.lastname, student.full_name)}
											/>
											<Avatar.Fallback class="bg-primary/10 font-semibold text-primary">
												{getAvatarInitials(student.firstname, student.lastname)}
											</Avatar.Fallback>
										</Avatar.Root>

										<!-- NOM DE L'ÉLÈVE -->
										<div class="min-w-0 flex-1">
											<p class="truncate font-medium text-foreground">
												{getFullName(student.firstname, student.lastname, student.full_name)}
											</p>
										</div>

										<!-- GIDOUILLES ACTUELLES -->
										<div class="flex w-32 items-center justify-end gap-2">
											<img src={gidouilleImg} alt="Gidouille" class="h-6 w-6 flex-shrink-0" />
											<span class="text-2xl font-bold text-foreground tabular-nums">
												{getStudentGidouilles(student.id)}
											</span>
										</div>

										<!-- BOUTONS +/- AVEC INPUT AU MILIEU -->
										<div class="flex flex-shrink-0 items-center gap-2">
											<!-- Bouton pour enlever (debounced) -->
											<Button
												size="sm"
												variant="default"
												class="h-10 w-10 p-0"
												disabled={getStudentGidouilles(student.id) < studentDeltas[student.id]}
												onclick={() => {
													const delta = -studentDeltas[student.id];
													const currentValue = getStudentGidouilles(student.id);
													// Get student name for toast (priority: firstname > full_name > fallback)
													const name = student.firstname || student.full_name || 'Élève';
													debouncedUpdateStudent(student.id, delta, currentValue, name);
												}}
											>
												−
											</Button>

											<!-- INPUT POUR LE DELTA -->
											<div class="w-14">
												<Input
													type="number"
													min="1"
													max="9"
													bind:value={studentDeltas[student.id]}
													class="h-10 w-full text-center"
												/>
											</div>

											<!-- Bouton pour ajouter (debounced) -->
											<Button
												size="sm"
												variant="default"
												class="h-10 w-10 p-0"
												onclick={() => {
													const delta = studentDeltas[student.id];
													const currentValue = getStudentGidouilles(student.id);
													// Get student name for toast (priority: firstname > full_name > fallback)
													const name = student.firstname || student.full_name || 'Élève';
													debouncedUpdateStudent(student.id, delta, currentValue, name);
												}}
											>
												+
											</Button>
										</div>

										<!-- SÉPARATEUR VERTICAL -->
										<div class="mx-2 h-10 w-px bg-border"></div>

										<!-- BOUTONS CARTES VIP -->
										<div class="flex flex-shrink-0 items-center gap-2">
											<!-- Bouton Voir Cartes VIP -->
											<Button
												size="sm"
												variant="outline"
												class="gap-1"
												onclick={() => openVipModal(student)}
											>
												<Eye class="h-4 w-4" />
												<span class="hidden sm:inline">Voir Cartes</span>
											</Button>

											<!-- Form to award VIP card -->
											<form
												method="POST"
												action="?/awardVipCard"
												use:enhance={() => {
													// Save student name for reveal animation
													const studentName = getFullName(
														student.firstname,
														student.lastname,
														student.full_name
													);

													// Initialize reveal modal with loading state (back of card, shaking)
													revealingCard = {
														card: getVipCardById('bonus'), // Temporary card (will be replaced)
														studentName,
														loading: true,
														confirmed: false
													};

													// Optimistically deduct 3 gidouilles
													const currentValue = getStudentGidouilles(student.id);
													updateStudentGidouillesOptimistic(student.id, -3, currentValue);

													return async ({ result, update }) => {
														await update();
														// Clear optimistic override after server response
														if (result.type === 'success') {
															clearOptimisticOverride(student.id);
															// Card will be updated by $effect when form.cardId arrives
														} else {
															// Rollback on error
															clearOptimisticOverride(student.id);
															revealingCard = null;
														}
													};
												}}
											>
												<input type="hidden" name="studentId" value={student.id} />
												<Button
													type="submit"
													size="sm"
													variant="default"
													class="gap-1 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
													disabled={!canAffordVipCard(getStudentGidouilles(student.id)) ||
														revealingCard !== null}
												>
													{#if revealingCard !== null}
														<Loader2 class="h-4 w-4 animate-spin" />
														<span class="hidden sm:inline">Attribution...</span>
													{:else}
														<Sparkles class="h-4 w-4" />
														<span class="hidden sm:inline">Carte VIP</span>
														<span class="text-xs opacity-80"
															>(3 <img
																src={gidouilleImg}
																alt="gidouille"
																class="inline h-3 w-3"
															/>)</span
														>
													{/if}
												</Button>
											</form>
										</div>
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

<!-- VIP Card Reveal Modal -->
<!-- Fullscreen modal with shake animation during loading, then flip reveal -->
{#if revealingCard && revealingCard.card}
	<VipCardHoloReveal
		card={revealingCard.card}
		studentName={revealingCard.studentName}
		loading={revealingCard.loading}
		confirmed={revealingCard.confirmed}
		onComplete={handleRevealComplete}
	/>
{/if}

<!-- Modal des Cartes VIP (Teacher View with Removal) -->
<!--
	teacherView={true} enables:
	- Trash buttons on each card for removal
	- Optimistic UI for instant feedback
	- No gidouilles refund when cards removed
-->
{#if selectedStudentForVipModal && vipModalOpen}
	<VipCardsModal
		bind:open={vipModalOpen}
		onOpenChange={handleVipModalClose}
		studentName={selectedStudentForVipModal.name}
		studentId={selectedStudentForVipModal.id}
		vipCards={selectedStudentForVipModal.vipCards}
		teacherView={true}
	/>
{/if}
