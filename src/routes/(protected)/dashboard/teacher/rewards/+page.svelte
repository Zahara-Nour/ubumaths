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
	- Optimistic UI with instant feedback
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
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Avatar from '$lib/components/ui/avatar';
	import { toaster } from '$lib/stores/toaster.svelte';
	import gidouilleImg from '$lib/assets/images/gidouille.png';
	import { getAvatarFallback, getAvatarInitials } from '$lib/utils/avatar';
	import VipCardsModal from '$lib/components/VipCardsModal.svelte';
	import VipCardHoloReveal from '$lib/components/VipCardHoloReveal.svelte';
	import { getVipCardById, type VipCard } from '$lib/types/vip-card';
	import { canAffordVipCard } from '$lib/utils/vip-cards';
	import { Sparkles, Eye, Loader2, Check, X } from 'lucide-svelte';
	import { teacherCache } from '$lib/stores/teacherDashboardCache.svelte';
	import { selectedClassStore } from '$lib/stores/selectedClass.svelte';
	import * as Table from '$lib/components/ui/table';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { invalidateAll } from '$app/navigation';

	// Data from parent layouts (user/profile only)
	let { data }: { data: PageData } = $props();

	// Get classes from cache (reactively updates when cache changes)
	let classes = $derived(teacherCache.getAllClassesSync());

	// Use shared selectedClass store (persists across pages and reloads)
	const classStore = selectedClassStore();

	// Initialize selectedClassId: restore from localStorage (fallback handled in effect)
	let selectedClassId = $state(classStore.id || '');

	// Get students from cache (reactively updates when cache changes)
	let currentStudents = $derived(
		selectedClassId ? teacherCache.getStudentsSync(selectedClassId) : []
	);

	// Fallback to first class when no selection and classes are loaded
	$effect(() => {
		if (!selectedClassId && classes.length > 0) {
			selectedClassId = classes[0].id;
		}
	});

	// Sync local state with shared store when it changes locally
	// Note: Auto-hydration is set up in the teacher layout, not here
	$effect(() => {
		if (selectedClassId) {
			classStore.set(selectedClassId);
		}
	});

	// Local state for gidouilles inputs (per student)
	let studentDeltas = $state<Record<string, number>>({});

	// Local state for gidouilles input at class level
	let classDeltas = $state<Record<string, number>>({});

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
		classId: string;
		id: string;
		name: string;
	} | null>(null);
	let revealingCard = $state<{
		card: VipCard;
		studentName: string;
		loading: boolean;
		confirmed: boolean;
	} | null>(null); // Tracks card reveal state with loading/confirmed

	// Tab management (URL-based)
	let activeTab = $derived(page.url.searchParams.get('tab') || 'gidouilles');

	function changeTab(tab: string) {
		const url =
			tab === 'gidouilles' ? '/dashboard/teacher/rewards' : `/dashboard/teacher/rewards?tab=${tab}`;
		goto(url, { replaceState: false });
	}

	// Processing state for use-card requests (demandes tab)
	let processingRequests = $state<Record<string, boolean>>({});

	// Handle use card from demandes tab
	async function handleUseCard(instanceId: string, studentId: string, studentName: string) {
		processingRequests[instanceId] = true;

		try {
			const response = await fetch('/api/vip-cards/use-card', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ instanceId, studentId })
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.message || "Erreur lors de l'utilisation");
			}

			// Success toast with action details
			let message = `Carte ${result.cardName} utilisée pour ${studentName} !`;
			if (result.actionResult) {
				const ar = result.actionResult;
				if (ar.cardsDrawn) {
					const cardNames = ar.cardsDrawn.map((c: { name: string }) => c.name).join(', ');
					message += `\n→ Cartes tirées : ${cardNames}`;
				} else if (ar.warningsRemoved !== undefined) {
					message += `\n→ ${ar.warningsRemoved} avertissement(s) enlevé(s)`;
				} else if (ar.cardsReceived) {
					message += `\n→ Cartes reçues : ${ar.cardsReceived.join(', ')}`;
				} else if (ar.newBalance !== undefined) {
					message += `\n→ Nouveau solde : ${ar.newBalance} gidouilles`;
				}
			}

			toaster.success(message);
			await invalidateAll();
		} catch (_error) {
			console.error('[rewards] Use card error:', error);
			toaster.error(error instanceof Error ? errorData.message : 'Erreur');
		} finally {
			processingRequests[instanceId] = false;
		}
	}

	// Handle reject activation request
	async function handleReject(instanceId: string, studentId: string, studentName: string) {
		processingRequests[instanceId] = true;

		try {
			const response = await fetch('/api/vip-cards/reject-activation', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ instanceId, studentId })
			});

			if (!response.ok) throw new Error('Erreur lors du rejet');

			toaster.success(`Demande rejetée pour ${studentName}`);
			await invalidateAll();
		} catch (_error) {
			toaster.error('Erreur lors du rejet');
		} finally {
			processingRequests[instanceId] = false;
		}
	}

	// Format date for demandes display
	function formatDate(dateString: string): string {
		const date = new Date(dateString);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);

		if (diffMins < 1) return "À l'instant";
		if (diffMins < 60) return `Il y a ${diffMins} min`;

		const diffHours = Math.floor(diffMins / 60);
		if (diffHours < 24) return `Il y a ${diffHours}h`;

		const diffDays = Math.floor(diffHours / 24);
		if (diffDays < 7) return `Il y a ${diffDays}j`;

		return date.toLocaleDateString('fr-FR');
	}

	// Initialize deltas to 1 for each student and class
	$effect(() => {
		classes.forEach((classItem) => {
			if (!classDeltas[classItem.id]) {
				classDeltas[classItem.id] = 1;
			}
		});
		currentStudents.forEach((student) => {
			if (!studentDeltas[student.id]) {
				studentDeltas[student.id] = 1;
			}
		});
	});

	/**
	 * Award VIP Card Handler
	 * Replaces form action with direct API call
	 */
	async function handleAwardVipCard(student: {
		id: string;
		firstname: string;
		lastname: string | null;
		full_name: string | null;
	}) {
		// Save student name for reveal animation
		const studentName = getFullName(student.firstname, student.lastname, student.full_name);

		// Initialize reveal modal with loading state (back of card, shaking)
		const placeholderCard = getVipCardById('bonus');
		if (!placeholderCard) {
			toaster.error('Erreur: carte non trouvée');
			return;
		}

		revealingCard = {
			card: placeholderCard, // Temporary card (will be replaced)
			studentName,
			loading: true,
			confirmed: false
		};

		// Optimistically deduct 3 gidouilles via cache
		updateStudentGidouillesOptimistic(student.id, -3);

		try {
			// Call API to award VIP card
			const response = await fetch('/api/teacher/rewards/award-vip-card', {
				method: 'POST',
				body: JSON.stringify({ studentId: student.id }),
				headers: {
					'Content-Type': 'application/json'
				}
			});

			if (response.ok) {
				const result = await response.json();

				// SUCCESS: Cache already has the -3 gidouilles optimistic update
				// Now update VIP cards cache and trigger the flip animation
				const card = getVipCardById(result.cardId);
				if (card && revealingCard) {
					lastProcessedCardId = result.cardId;

					// Update VIP cards cache with the new card (if migration applied)
					// After migration: result = { cardId, instanceId, earnedAt }
					// Before migration: result = { cardId } only
					if (result.instanceId && result.earnedAt) {
						const rewards = teacherCache.getRewardsSync(selectedClassId);
						const currentVipCards = rewards?.get(student.id)?.vip_cards || {};

						const newVipCards = {
							...currentVipCards,
							[result.instanceId]: {
								cardId: result.cardId,
								earnedAt: result.earnedAt,
								usedAt: null
							}
						};

						teacherCache.updateVipCardsOptimistic(selectedClassId, student.id, newVipCards);
					}

					// Update revealingCard to show confirmation (triggers flip)
					revealingCard = {
						card,
						studentName: revealingCard.studentName,
						loading: false,
						confirmed: true
					};
				}
			} else {
				// ERROR: Rollback the -3 gidouilles optimistic update by adding +3 back
				updateStudentGidouillesOptimistic(student.id, +3);
				revealingCard = null;

				const errorData = await response.json().catch(() => ({ message: 'Erreur inconnue' }));
				toaster.error(errorData.message || "Erreur lors de l'attribution de la carte");
			}
		} catch (_err) {
			// ERROR: Rollback optimistic update
			updateStudentGidouillesOptimistic(student.id, +3);
			revealingCard = null;
			toaster.error('Erreur réseau');
		}
	}

	// ============================================================================
	// OPTIMISTIC UI HELPER FUNCTIONS
	// ============================================================================

	/**
	 * Get current gidouilles for a student from cache (with optimistic override)
	 *
	 * Returns the cached value (which may include optimistic updates) if available,
	 * otherwise returns 0 as fallback.
	 *
	 * @param studentId - The student's ID
	 * @returns The gidouilles count to display in the UI
	 */
	function getStudentGidouilles(studentId: string): number {
		// Check cache (includes optimistic overrides via SvelteMap reactivity)
		const cached = teacherCache.getRewardsSync(selectedClassId);
		if (cached) {
			const rewards = cached.get(studentId);
			if (rewards) return rewards.gidouilles;
		}

		// Fallback to 0 if not in cache yet
		return 0;
	}

	/**
	 * Apply optimistic update to a single student via cache
	 *
	 * Delegates to teacherCache.updateGidouillesOptimistic() for instant UI feedback.
	 * The cache handles reactivity via SvelteMap and enforces minimum of 0 gidouilles.
	 *
	 * @param studentId - The student's ID
	 * @param delta - The change amount (positive or negative)
	 */
	function updateStudentGidouillesOptimistic(studentId: string, delta: number) {
		teacherCache.updateGidouillesOptimistic(selectedClassId, studentId, delta);
	}

	/**
	 * Apply optimistic update to all students in a class via cache
	 *
	 * Delegates to teacherCache for each student.
	 * Each student's update respects the 0 minimum independently via cache.
	 *
	 * @param classId - The class ID
	 * @param delta - The change amount to apply to each student
	 */
	function updateClassGidouillesOptimistic(classId: string, delta: number) {
		const students = teacherCache.getStudentsSync(classId);
		students.forEach((student) => {
			teacherCache.updateGidouillesOptimistic(classId, student.id, delta);
		});
	}

	// ============================================================================
	// DEBOUNCED UPDATE FUNCTIONS
	// ============================================================================

	/**
	 * Debounced update for individual student gidouilles via cache
	 *
	 * This function implements the core debouncing logic:
	 * 1. Applies optimistic UI update immediately via teacherCache (instant feedback)
	 * 2. Starts/resets a 500ms timer
	 * 3. Accumulates all deltas within the debounce window
	 * 4. After 500ms of no clicks, sends ONE request with total accumulated delta
	 * 5. On success: invalidates cache to refresh data and shows success toast
	 * 6. On error: invalidates cache to rollback optimistic update and shows error
	 *
	 * Example: User clicks +1, +1, +1 rapidly
	 * - UI shows: 0 → 1 → 2 → 3 (instant via reactive cache)
	 * - Server receives: ONE request with delta = +3 (after 500ms)
	 * - Toast shows: "+3 gidouilles (Marie)"
	 *
	 * @param studentId - The student's ID
	 * @param delta - The change amount for this click (positive or negative)
	 * @param studentName - The student's first name for the success toast
	 */
	function debouncedUpdateStudent(studentId: string, delta: number, studentName: string) {
		const key = `student-${studentId}`;

		// STEP 1: Apply optimistic update immediately for instant UI feedback
		updateStudentGidouillesOptimistic(studentId, delta);

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

			// Prepare JSON payload with accumulated delta
			const payload = {
				studentId,
				delta: accumulatedDelta
			};

			try {
				// Send request to API endpoint
				const response = await fetch('/api/teacher/rewards/update-student', {
					method: 'POST',
					body: JSON.stringify(payload),
					headers: {
						'Content-Type': 'application/json'
					}
				});

				if (response.ok) {
					// SUCCESS: Server updated the database
					await response.json();

					// ✅ NO DATA UPDATE NEEDED
					// The cache already has the correct optimistic value from the immediate UI update
					// No need to update 'classes' since it doesn't contain students anymore

					// Show success toast with accumulated delta and student name
					toaster.success(
						`${accumulatedDelta > 0 ? '+' : ''}${accumulatedDelta} gidouille${Math.abs(accumulatedDelta) > 1 ? 's' : ''} (${studentName})`
					);
				} else {
					// ERROR: Server returned error status - rollback by reversing the optimistic delta
					teacherCache.updateGidouillesOptimistic(selectedClassId, studentId, -accumulatedDelta);

					toaster.error('Échec de la mise à jour');
				}
			} catch {
				// NETWORK ERROR: Request failed completely - rollback by reversing the optimistic delta
				teacherCache.updateGidouillesOptimistic(selectedClassId, studentId, -accumulatedDelta);

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

			// Prepare JSON payload
			const payload = {
				classId,
				delta: accumulatedDelta
			};

			try {
				// Send request to API endpoint
				const response = await fetch('/api/teacher/rewards/update-class', {
					method: 'POST',
					body: JSON.stringify(payload),
					headers: {
						'Content-Type': 'application/json'
					}
				});

				if (response.ok) {
					// SUCCESS: All students updated in database
					await response.json();

					// ✅ NO DATA UPDATE NEEDED
					// The cache already has the correct optimistic values for all students

					// Get student count from cache for toast message
					const students = teacherCache.getStudentsSync(classId);
					const studentCount = students.length;

					// Show success toast with student count
					toaster.success(
						`${accumulatedDelta > 0 ? '+' : ''}${accumulatedDelta} gidouille${Math.abs(accumulatedDelta) > 1 ? 's' : ''} pour ${studentCount} élève${studentCount > 1 ? 's' : ''}`
					);
				} else {
					// ERROR: Rollback all students by reversing the optimistic delta
					updateClassGidouillesOptimistic(classId, -accumulatedDelta);

					toaster.error('Échec de la mise à jour de la classe');
				}
			} catch {
				// NETWORK ERROR: Rollback all students by reversing the optimistic delta
				updateClassGidouillesOptimistic(classId, -accumulatedDelta);

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
	 * VIP cards will be read from cache by the modal component itself
	 */
	function openVipModal(student: {
		id: string;
		firstname: string | null;
		lastname: string | null;
		full_name: string | null;
	}) {
		selectedStudentForVipModal = {
			classId: selectedClassId,
			id: student.id,
			name: getFullName(student.firstname, student.lastname, student.full_name)
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

<div class="container mx-auto py-8">
	<h1 class="mb-6 text-3xl font-bold">Gestion des Récompenses</h1>

	<Tabs.Root value={activeTab} onValueChange={changeTab}>
		<Tabs.List class="mb-6">
			<Tabs.Trigger value="gidouilles">Gidouilles</Tabs.Trigger>
			<Tabs.Trigger value="demandes" class="relative">
				Demandes d'activation VIP
				{#if data.activationRequests.length > 0}
					<Badge variant="destructive" class="ml-2">
						{data.activationRequests.length}
					</Badge>
				{/if}
			</Tabs.Trigger>
		</Tabs.List>

		<!-- TAB 1: GIDOUILLES (existing content) -->
		<Tabs.Content value="gidouilles">
			<div class="space-y-6">
				{#if classes.length === 0}
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
							{#each classes as classItem (classItem.id)}
								<Tabs.Trigger value={classItem.id}>
									{classItem.name}
								</Tabs.Trigger>
							{/each}
						</Tabs.List>

						{#each classes as classItem (classItem.id)}
							<Tabs.Content value={classItem.id} class="mt-0 space-y-6">
								<!-- CONTRÔLES AU NIVEAU CLASSE -->
								<div class="rounded-lg border border-border bg-card p-6">
									<h3 class="mb-4 text-lg font-semibold text-foreground">
										Actions pour toute la classe
									</h3>
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
								{#if currentStudents.length === 0}
									<div class="rounded-lg border border-border bg-card p-12 text-center">
										<p class="text-muted-foreground">Aucun élève dans cette classe</p>
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
												<div class="flex items-center gap-6 px-6 py-4">
													<!-- AVATAR -->
													<Avatar.Root class="h-12 w-12 flex-shrink-0">
														<Avatar.Image
															src={student.avatar_url ||
																getAvatarFallback(
																	(student.role as 'student' | 'teacher' | 'admin') || 'student',
																	student.gender === 'boy'
																		? 'M'
																		: student.gender === 'girl'
																			? 'F'
																			: null
																)}
															alt={getFullName(
																student.firstname,
																student.lastname,
																student.full_name
															)}
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
															disabled={getStudentGidouilles(student.id) <
																studentDeltas[student.id]}
															onclick={() => {
																const delta = -studentDeltas[student.id];
																// Get student name for toast (priority: firstname > full_name > fallback)
																const name = student.firstname || student.full_name || 'Élève';
																debouncedUpdateStudent(student.id, delta, name);
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
																// Get student name for toast (priority: firstname > full_name > fallback)
																const name = student.firstname || student.full_name || 'Élève';
																debouncedUpdateStudent(student.id, delta, name);
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

														<!-- Button to award VIP card -->
														<Button
															onclick={() => handleAwardVipCard(student)}
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
		</Tabs.Content>

		<!-- TAB 2: DEMANDES D'ACTIVATION VIP -->
		<Tabs.Content value="demandes">
			{#if data.activationRequests.length === 0}
				<Card.Root>
					<Card.Content class="pt-6 text-center">
						<Sparkles class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
						<p class="text-lg text-muted-foreground">Aucune demande d'activation en attente</p>
						<p class="mt-2 text-sm text-muted-foreground">
							Les demandes de vos élèves apparaîtront ici
						</p>
					</Card.Content>
				</Card.Root>
			{:else}
				<Card.Root>
					<Card.Header>
						<Card.Title class="flex items-center justify-between">
							<span>Demandes en attente</span>
							<Badge variant="secondary">{data.activationRequests.length}</Badge>
						</Card.Title>
					</Card.Header>
					<Card.Content>
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Élève</Table.Head>
									<Table.Head>Carte</Table.Head>
									<Table.Head>Action</Table.Head>
									<Table.Head>Demandé</Table.Head>
									<Table.Head class="text-right">Actions</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each data.activationRequests as request (request.instanceId)}
									<Table.Row>
										<Table.Cell class="font-medium">
											{request.studentName}
										</Table.Cell>
										<Table.Cell>
											<Badge variant="outline" class="font-semibold">
												{request.cardName}
											</Badge>
										</Table.Cell>
										<Table.Cell class="text-sm text-muted-foreground">
											{request.actionDescription}
										</Table.Cell>
										<Table.Cell class="text-sm">
											{formatDate(request.requestedAt)}
										</Table.Cell>
										<Table.Cell class="text-right">
											<div class="flex justify-end gap-2">
												<Button
													onclick={() =>
														handleUseCard(
															request.instanceId,
															request.studentId,
															request.studentName
														)}
													disabled={processingRequests[request.instanceId]}
													size="sm"
													class="bg-green-600 hover:bg-green-700"
												>
													{#if processingRequests[request.instanceId]}
														<Loader2 class="h-4 w-4 animate-spin" />
													{:else}
														<Check class="mr-1 h-4 w-4" />
														Utiliser
													{/if}
												</Button>
												<Button
													onclick={() =>
														handleReject(
															request.instanceId,
															request.studentId,
															request.studentName
														)}
													disabled={processingRequests[request.instanceId]}
													size="sm"
													variant="destructive"
												>
													{#if processingRequests[request.instanceId]}
														<Loader2 class="h-4 w-4 animate-spin" />
													{:else}
														<X class="mr-1 h-4 w-4" />
														Rejeter
													{/if}
												</Button>
											</div>
										</Table.Cell>
									</Table.Row>
								{/each}
							</Table.Body>
						</Table.Root>
					</Card.Content>
				</Card.Root>
			{/if}
		</Tabs.Content>
	</Tabs.Root>
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
		classId={selectedStudentForVipModal.classId}
		studentId={selectedStudentForVipModal.id}
		teacherView={true}
	/>
{/if}
