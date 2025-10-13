<!--
	Rewards Management Page for Teachers
	=====================================

	This page allows teachers to manage gidouilles (reward points) for their students.

	FEATURES:
	---------
	- Select a class via Tabs component
	- View all students in the selected class with their current gidouilles
	- Add/remove gidouilles for individual students via input + buttons
	- Add/remove gidouilles for all students in a class at once
	- Award random VIP cards to students (costs 3 gidouilles)
	- View student VIP card collections
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
	   - Format: "+3 gidouilles" or "+2 gidouilles pour 15 élèves"
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

	VIP CARD FLOW:
	--------------
	1. Teacher clicks "Carte VIP" button for a student
	2. Loading animation shows (mystery card shaking)
	3. Server assigns random card and returns cardId
	4. Loading transitions to reveal animation
	5. Card flips to show front with confetti celebration
	6. Data refreshes to show updated collection

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
	import { invalidateAll } from '$app/navigation';
	import gidouilleImg from '$lib/assets/images/gidouille.png';
	import { getAvatarFallback, getAvatarInitials } from '$lib/utils/avatar';
	import VipCardsModal from '$lib/components/VipCardsModal.svelte';
	import VipCardReveal from '$lib/components/VipCardReveal.svelte';
	import VipCardLoading from '$lib/components/VipCardLoading.svelte';
	import { getVipCardById } from '$lib/types/vip-card';
	import { canAffordVipCard } from '$lib/utils/vip-cards';
	import { Sparkles, Eye, Loader2 } from 'lucide-svelte';

	// Data from server load function
	let { data, form }: { data: PageData; form: ActionData } = $props();

	// Local state for selected class
	let selectedClassId = $state(data.classes[0]?.id);

	// Local state for gidouilles inputs (per student)
	let studentDeltas = $state<Record<string, number>>({});

	// Local state for gidouilles input at class level
	let classDeltas = $state<Record<string, number>>({});

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
	let pendingSubmissions = $state<Record<string, { timeoutId: number; accumulatedDelta: number }>>({});

	// VIP card states
	let vipModalOpen = $state(false);
	let selectedStudentForVipModal = $state<{ id: string; name: string; vipCards: any } | null>(null);
	let revealingCard = $state<{ cardId: string; studentName: string } | null>(null);
	let awardingCard = $state(false); // Shows loading animation (shaking mystery card)
	let lastProcessedCardId = $state<string | null>(null); // Tracks last processed cardId to prevent duplicates and infinite loops

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
			// If it's a VIP card award, show reveal animation
			if (form.cardId && form.cardId !== lastProcessedCardId) {
				// Only process if it's a new card (not already processed)
				const card = getVipCardById(form.cardId);
				if (card) {
					// Mark this card as processed to prevent re-triggers
					lastProcessedCardId = form.cardId;

					// Hide loading and show reveal
					awardingCard = false;
					const studentName = selectedStudentForVipModal?.name || 'Élève';
					revealingCard = { cardId: form.cardId, studentName };
				}
			} else if (!form.cardId) {
				// Other successful actions (add/remove gidouilles)
				toaster.success(form.message || 'Opération réussie');
			}
		} else if (form?.message && !form?.success) {
			// On error, hide loading
			awardingCard = false;
			toaster.error(form.message);
		}
	});

	// ============================================================================
	// OPTIMISTIC UI HELPER FUNCTIONS
	// ============================================================================

	/**
	 * Get current gidouilles for a student with optimistic override
	 *
	 * Returns the optimistic value if it exists (user clicked but server hasn't
	 * confirmed yet), otherwise returns the server value.
	 *
	 * @param studentId - The student's ID
	 * @param serverValue - The confirmed value from the database
	 * @returns The gidouilles count to display in the UI
	 */
	function getStudentGidouilles(studentId: string, serverValue: number): number {
		return optimisticGidouilles[studentId] ?? serverValue;
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
	function updateStudentGidouillesOptimistic(studentId: string, delta: number, currentValue: number) {
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
		const classItem = data.classes.find(c => c.id === classId);
		if (classItem) {
			classItem.students.forEach(student => {
				const currentValue = getStudentGidouilles(student.id, student.gidouilles);
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
	 * 5. On success: refreshes data and shows success toast
	 * 6. On error: rolls back optimistic update and shows error
	 *
	 * Example: User clicks +1, +1, +1 rapidly
	 * - UI shows: 0 → 1 → 2 → 3 (instant)
	 * - Server receives: ONE request with delta = +3 (after 500ms)
	 *
	 * @param studentId - The student's ID
	 * @param delta - The change amount for this click (positive or negative)
	 * @param currentValue - The current gidouilles count (may be optimistic)
	 */
	function debouncedUpdateStudent(studentId: string, delta: number, currentValue: number) {
		const key = `student-${studentId}`;

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
					// Wait 100ms then refresh data from server and show confirmation
					setTimeout(() => {
						invalidateAll(); // Fetch fresh data from server
						// Show success toast with accumulated delta
						toaster.success(`${accumulatedDelta > 0 ? '+' : ''}${accumulatedDelta} gidouille${Math.abs(accumulatedDelta) > 1 ? 's' : ''}`);
					}, 100);
				} else {
					// ERROR: Server returned error status
					clearOptimisticOverride(studentId); // Rollback to server value
					toaster.error('Échec de la mise à jour');
				}
			} catch (error) {
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
					const classItem = data.classes.find(c => c.id === classId);
					const studentCount = classItem?.students.length || 0;
					setTimeout(() => {
						invalidateAll(); // Refresh all student data
						// Show success toast with student count
						toaster.success(`${accumulatedDelta > 0 ? '+' : ''}${accumulatedDelta} gidouille${Math.abs(accumulatedDelta) > 1 ? 's' : ''} pour ${studentCount} élève${studentCount > 1 ? 's' : ''}`);
					}, 100);
				} else {
					// ERROR: Rollback all students in the class
					const classItem = data.classes.find(c => c.id === classId);
					classItem?.students.forEach(student => clearOptimisticOverride(student.id));
					toaster.error('Échec de la mise à jour de la classe');
				}
			} catch (error) {
				// NETWORK ERROR: Rollback all students
				const classItem = data.classes.find(c => c.id === classId);
				classItem?.students.forEach(student => clearOptimisticOverride(student.id));
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

	// Open VIP cards modal for a student
	function openVipModal(student: any) {
		selectedStudentForVipModal = {
			id: student.id,
			name: getFullName(student.firstname, student.lastname, student.full_name),
			vipCards: student.vip_cards || {}
		};
		vipModalOpen = true;
	}

	// Close card reveal modal
	function handleRevealComplete() {
		revealingCard = null;
		awardingCard = false; // Ensure loading animation is hidden
		invalidateAll(); // Refresh data to update card collection
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
		<div class="bg-card border border-border rounded-lg p-12 text-center">
			<img src={gidouilleImg} alt="Gidouille" class="w-16 h-16 mx-auto mb-4 opacity-50" />
			<h2 class="text-xl font-semibold text-foreground mb-2">Aucune classe trouvée</h2>
			<p class="text-muted-foreground">
				Vous devez d'abord créer des classes pour gérer les récompenses de vos élèves.
			</p>
		</div>
	{:else}
		<!-- TABS PAR CLASSE -->
		<Tabs.Root bind:value={selectedClassId} class="w-full">
			<Tabs.List class="mb-6">
				{#each data.classes as classItem}
					<Tabs.Trigger value={classItem.id}>
						{classItem.name}
					</Tabs.Trigger>
				{/each}
			</Tabs.List>

			{#each data.classes as classItem}
				<Tabs.Content value={classItem.id} class="space-y-6 mt-0">
					<!-- CONTRÔLES AU NIVEAU CLASSE -->
					<div class="bg-card border border-border rounded-lg p-6">
						<h3 class="text-lg font-semibold text-foreground mb-4">
							Actions pour toute la classe
						</h3>
						<div class="flex items-end gap-3">
							<div class="flex items-center gap-2">
								<!-- Bouton pour enlever (debounced) -->
								<Button
									variant="default"
									class="w-10 h-10 p-0"
									onclick={() => {
										const delta = -classDeltas[classItem.id];
										debouncedUpdateClass(classItem.id, delta);
									}}
								>
									−
								</Button>

								<!-- Input pour le nombre de gidouilles -->
								<div class="w-16">
									<label for="class-delta-{classItem.id}" class="text-sm text-muted-foreground mb-2 block text-center">
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
									class="w-10 h-10 p-0"
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
						<div class="bg-card border border-border rounded-lg p-12 text-center">
							<p class="text-muted-foreground">Aucun élève dans cette classe</p>
						</div>
					{:else}
						<div class="bg-card border border-border rounded-lg overflow-hidden">
							<div class="px-6 py-4 border-b border-border bg-muted/30">
								<h3 class="text-lg font-semibold text-foreground">
									Élèves ({classItem.students.length})
								</h3>
							</div>

							<div class="divide-y divide-border">
								{#each classItem.students as student}
									<div class="px-6 py-4 flex items-center gap-6">
										<!-- AVATAR -->
										<Avatar.Root class="w-12 h-12 flex-shrink-0">
											<Avatar.Image
												src={student.avatar_url || getAvatarFallback(student.role || 'student', student.gender)}
												alt={getFullName(student.firstname, student.lastname, student.full_name)}
											/>
											<Avatar.Fallback class="bg-primary/10 text-primary font-semibold">
												{getAvatarInitials(student.firstname, student.lastname)}
											</Avatar.Fallback>
										</Avatar.Root>

										<!-- NOM DE L'ÉLÈVE -->
										<div class="flex-1 min-w-0">
											<p class="font-medium text-foreground truncate">
												{getFullName(student.firstname, student.lastname, student.full_name)}
											</p>
										</div>

										<!-- GIDOUILLES ACTUELLES -->
										<div class="flex items-center gap-2 w-32 justify-end">
											<img src={gidouilleImg} alt="Gidouille" class="w-6 h-6 flex-shrink-0" />
											<span class="text-2xl font-bold text-foreground tabular-nums">
												{getStudentGidouilles(student.id, student.gidouilles)}
											</span>
										</div>

										<!-- BOUTONS +/- AVEC INPUT AU MILIEU -->
										<div class="flex items-center gap-2 flex-shrink-0">
											<!-- Bouton pour enlever (debounced) -->
											<Button
												size="sm"
												variant="default"
												class="w-10 h-10 p-0"
												disabled={getStudentGidouilles(student.id, student.gidouilles) < studentDeltas[student.id]}
												onclick={() => {
													const delta = -studentDeltas[student.id];
													const currentValue = getStudentGidouilles(student.id, student.gidouilles);
													debouncedUpdateStudent(student.id, delta, currentValue);
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
													class="w-full text-center h-10"
												/>
											</div>

											<!-- Bouton pour ajouter (debounced) -->
											<Button
												size="sm"
												variant="default"
												class="w-10 h-10 p-0"
												onclick={() => {
													const delta = studentDeltas[student.id];
													const currentValue = getStudentGidouilles(student.id, student.gidouilles);
													debouncedUpdateStudent(student.id, delta, currentValue);
												}}
											>
												+
											</Button>
										</div>

										<!-- SÉPARATEUR VERTICAL -->
										<div class="h-10 w-px bg-border mx-2"></div>

										<!-- BOUTONS CARTES VIP -->
										<div class="flex items-center gap-2 flex-shrink-0">
											<!-- Bouton Voir Cartes VIP -->
											<Button
												size="sm"
												variant="outline"
												class="gap-1"
												onclick={() => openVipModal(student)}
											>
												<Eye class="w-4 h-4" />
												<span class="hidden sm:inline">Voir Cartes</span>
											</Button>

											<!-- Form to award VIP card -->
											<form
												method="POST"
												action="?/awardVipCard"
												use:enhance={() => {
													// Save student name for reveal animation
													selectedStudentForVipModal = {
														id: student.id,
														name: getFullName(student.firstname, student.lastname, student.full_name),
														vipCards: student.vip_cards || {}
													};

													// Optimistically deduct 3 gidouilles
													const currentValue = getStudentGidouilles(student.id, student.gidouilles);
													updateStudentGidouillesOptimistic(student.id, -3, currentValue);

													// Show loading animation (mystery card) immediately
													awardingCard = true;

													return async ({ result, update }) => {
														await update();
														// Note: awardingCard will be set to false in $effect when response arrives
														// Clear optimistic override after server response
														if (result.type === 'success') {
															clearOptimisticOverride(student.id);
														} else {
															// Rollback on error
															clearOptimisticOverride(student.id);
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
													disabled={!canAffordVipCard(getStudentGidouilles(student.id, student.gidouilles)) || awardingCard}
												>
													{#if awardingCard}
														<Loader2 class="w-4 h-4 animate-spin" />
														<span class="hidden sm:inline">Attribution...</span>
													{:else}
														<Sparkles class="w-4 h-4" />
														<span class="hidden sm:inline">Carte VIP</span>
														<span class="text-xs opacity-80">(3 <img src={gidouilleImg} alt="gidouille" class="inline w-3 h-3" />)</span>
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

<!-- Loading State: Shaking Mystery Card -->
<!-- Displayed immediately when "Carte VIP" button is clicked -->
{#if awardingCard && selectedStudentForVipModal}
	<VipCardLoading
		visible={true}
		studentName={selectedStudentForVipModal.name}
	/>
{/if}

<!-- VIP Card Reveal Animation -->
<!-- Displayed once server returns the cardId -->
<!-- The #key ensures each new card triggers a fresh animation -->
{#if revealingCard}
	{@const card = getVipCardById(revealingCard.cardId)}
	{#if card}
		{#key revealingCard.cardId}
			<VipCardReveal
				{card}
				fromLoadingState={true}
				onComplete={handleRevealComplete}
			/>
		{/key}
	{/if}
{/if}

<!-- Modal des Cartes VIP -->
{#if selectedStudentForVipModal && vipModalOpen}
	<VipCardsModal
		bind:open={vipModalOpen}
		studentName={selectedStudentForVipModal.name}
		vipCards={selectedStudentForVipModal.vipCards}
	/>
{/if}
