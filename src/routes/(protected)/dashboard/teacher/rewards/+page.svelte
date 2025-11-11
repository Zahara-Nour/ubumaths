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
	import { canAffordVipCard, getStudentCardCounts } from '$lib/utils/vip-cards';
	import { Sparkles, Eye, Loader2, Check, X, Plus } from 'lucide-svelte';
	import { teacherCache } from '$lib/stores/teacherDashboardCache.svelte';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { selectedClassStore } from '$lib/stores/selectedClass.svelte';
	import { getSelectedPeriodId } from '$lib/stores/selectedPeriod.svelte';
	import * as Table from '$lib/components/ui/table';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { invalidateAll } from '$app/navigation';
	import { openVipCardDrawModal, openVipCardsModal } from '$lib/utils/vip-card-modals';
	import MySelect from '$lib/components/MySelect.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import ConfirmDialog from '$lib/components/ui/confirm-dialog/ConfirmDialog.svelte';
	import VipCardSelector from '$lib/components/VipCardSelector.svelte';
	import { Search, CheckCircle, XCircle, AlertCircle } from 'lucide-svelte';
	import {
		vipCardTemplates,
		getTemplateById,
		getEnabledTemplates
	} from '$lib/stores/vipCardTemplates.svelte';
	import { getActionDescription } from '$lib/utils/vip-cards';

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

	// Filter state for VIP cards
	let selectedCardFilter = $state<string | null>(null);
	let filterMode = $state<'filter' | 'add'>('filter'); // Mode par défaut : filtrer

	// Get enabled templates for VipCardSelector
	const enabledCardTemplates = $derived(getEnabledTemplates($vipCardTemplates));

	// Filtered students list based on selected VIP card
	let filteredStudents = $derived(
		currentStudents.filter((student) => {
			if (filterMode === 'filter') {
				// MODE FILTRER : comportement actuel
				if (!selectedCardFilter) return true; // No filter selected = show all
				const rewards = teacherCache.getRewardsSync(selectedClassId)?.get(student.id);
				if (!rewards) return false;
				const cardCounts = getStudentCardCounts(rewards.vip_cards);
				return (cardCounts.get(selectedCardFilter) || 0) > 0;
			} else {
				// MODE AJOUTER : afficher tous les élèves
				return true;
			}
		})
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

	// Tab management (URL-based)
	let activeTab = $derived(page.url.searchParams.get('tab') || 'gidouilles');

	function changeTab(tab: string) {
		const url =
			tab === 'gidouilles' ? '/dashboard/teacher/rewards' : `/dashboard/teacher/rewards?tab=${tab}`;
		goto(url, { replaceState: false });
	}

	// Processing state for use-card requests (demandes tab)
	let processingRequests = $state<Record<string, boolean>>({});

	// Grant VIP card state (for grant button loading state)
	let grantingCard = $state<string | null>(null);

	// Local state for activation requests (enables optimistic updates)
	let activationRequests = $state<typeof data.activationRequests>([]);

	// ============================================================================
	// ACTIVATION REQUESTS TAB - SEARCH, FILTERS, AND BULK ACTIONS
	// ============================================================================

	// Search and filter state
	let requestSearchQuery = $state('');
	let requestCardFilter = $state<string>('all');
	let requestSortOrder = $state<'oldest' | 'newest'>('oldest');

	// Bulk selection state
	let selectedRequests = $state<Set<string>>(new Set());

	// Bulk action state
	let isBulkProcessing = $state(false);
	let bulkProgress = $state({ current: 0, total: 0 });

	// Confirmation modals
	let showBulkApproveDialog = $state(false);
	let showBulkRejectDialog = $state(false);

	// Card filter items for requests tab
	const requestCardFilterItems = $derived([
		{ value: 'all', label: 'Toutes les cartes' },
		...getEnabledTemplates($vipCardTemplates).map((template) => ({
			value: template.id,
			label: template.name
		}))
	]);

	// Sync local state with server data (runs on mount and after invalidateAll)
	$effect(() => {
		activationRequests = data.activationRequests;
	});

	// Filtered and sorted activation requests
	let filteredActivationRequests = $derived.by(() => {
		let results = [...activationRequests];

		// Apply search filter
		if (requestSearchQuery.trim()) {
			const query = requestSearchQuery.toLowerCase();
			results = results.filter((r) => r.studentName.toLowerCase().includes(query));
		}

		// Apply card filter
		if (requestCardFilter !== 'all') {
			results = results.filter((r) => r.cardId === requestCardFilter);
		}

		// Apply sort
		results.sort((a, b) => {
			const aTime = new Date(a.requestedAt).getTime();
			const bTime = new Date(b.requestedAt).getTime();
			return requestSortOrder === 'oldest' ? aTime - bTime : bTime - aTime;
		});

		return results;
	});

	// Check if all visible requests are selected
	let allVisibleSelected = $derived(
		filteredActivationRequests.length > 0 &&
			filteredActivationRequests.every((r) => selectedRequests.has(r.instanceId))
	);

	// Get list of selected requests with details
	let selectedRequestDetails = $derived(
		filteredActivationRequests.filter((r) => selectedRequests.has(r.instanceId))
	);

	/**
	 * Toggle select all visible requests
	 */
	function toggleSelectAll() {
		if (allVisibleSelected) {
			// Deselect all visible
			filteredActivationRequests.forEach((r) => selectedRequests.delete(r.instanceId));
		} else {
			// Select all visible
			filteredActivationRequests.forEach((r) => selectedRequests.add(r.instanceId));
		}
		selectedRequests = new Set(selectedRequests); // Trigger reactivity
	}

	/**
	 * Toggle individual request selection
	 */
	function toggleRequestSelection(instanceId: string) {
		if (selectedRequests.has(instanceId)) {
			selectedRequests.delete(instanceId);
		} else {
			selectedRequests.add(instanceId);
		}
		selectedRequests = new Set(selectedRequests); // Trigger reactivity
	}

	/**
	 * Clear all selections
	 */
	function clearSelections() {
		selectedRequests.clear();
		selectedRequests = new Set(selectedRequests); // Trigger reactivity
	}

	/**
	 * Get relative time string in French
	 */
	function getRelativeTime(isoDate: string): string {
		const date = new Date(isoDate);
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

	/**
	 * Handle bulk approve action
	 */
	async function handleBulkApprove() {
		if (selectedRequestDetails.length === 0) return;

		isBulkProcessing = true;
		bulkProgress = { current: 0, total: selectedRequestDetails.length };

		const requestsToProcess = [...selectedRequestDetails];
		const results = { success: 0, failed: 0 };

		for (const request of requestsToProcess) {
			try {
				const response = await fetch('/api/vip-cards/use-card', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						instanceId: request.instanceId,
						studentId: request.studentId
					})
				});

				if (response.ok) {
					results.success++;
				} else {
					results.failed++;
					console.error(`Failed to approve request ${request.instanceId}`);
				}
			} catch (error) {
				results.failed++;
				console.error(`Error approving request ${request.instanceId}:`, error);
			}

			bulkProgress.current++;
		}

		// Show results
		if (results.success > 0) {
			toaster.success(
				`${results.success} demande${results.success > 1 ? 's' : ''} approuvée${results.success > 1 ? 's' : ''}`
			);
		}
		if (results.failed > 0) {
			toaster.error(
				`${results.failed} demande${results.failed > 1 ? 's' : ''} échouée${results.failed > 1 ? 's' : ''}`
			);
		}

		// Clear selections
		clearSelections();

		// Optimistic update: Remove all processed requests from list
		const processedInstanceIds = new Set(requestsToProcess.map((r) => r.instanceId));
		activationRequests = activationRequests.filter(
			(req) => !processedInstanceIds.has(req.instanceId)
		);

		// Sync with server in background
		await invalidateAll();

		isBulkProcessing = false;
		showBulkApproveDialog = false;
	}

	/**
	 * Handle bulk reject action
	 */
	async function handleBulkReject() {
		if (selectedRequestDetails.length === 0) return;

		isBulkProcessing = true;
		bulkProgress = { current: 0, total: selectedRequestDetails.length };

		const requestsToProcess = [...selectedRequestDetails];
		const results = { success: 0, failed: 0 };

		for (const request of requestsToProcess) {
			try {
				const response = await fetch('/api/vip-cards/reject-activation', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						instanceId: request.instanceId,
						studentId: request.studentId
					})
				});

				if (response.ok) {
					results.success++;
				} else {
					results.failed++;
					console.error(`Failed to reject request ${request.instanceId}`);
				}
			} catch (error) {
				results.failed++;
				console.error(`Error rejecting request ${request.instanceId}:`, error);
			}

			bulkProgress.current++;
		}

		// Show results
		if (results.success > 0) {
			toaster.success(
				`${results.success} demande${results.success > 1 ? 's' : ''} rejetée${results.success > 1 ? 's' : ''}`
			);
		}
		if (results.failed > 0) {
			toaster.error(
				`${results.failed} demande${results.failed > 1 ? 's' : ''} échouée${results.failed > 1 ? 's' : ''}`
			);
		}

		// Clear selections
		clearSelections();

		// Optimistic update: Remove all processed requests from list
		const processedInstanceIds = new Set(requestsToProcess.map((r) => r.instanceId));
		activationRequests = activationRequests.filter(
			(req) => !processedInstanceIds.has(req.instanceId)
		);

		// Sync with server in background
		await invalidateAll();

		isBulkProcessing = false;
		showBulkRejectDialog = false;
	}

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
			let message = `Carte ${result.cardName} approuvée pour ${studentName} ! L'élève peut maintenant l'activer.`;
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

			// Optimistic update: Remove request from list immediately
			activationRequests = activationRequests.filter((req) => req.instanceId !== instanceId);

			// Sync with server in background
			await invalidateAll();
		} catch (_error) {
			console.error('[rewards] Use card error:', _error);
			toaster.error(_error instanceof Error ? _error.message : 'Erreur');
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

			// Optimistic update: Remove request from list immediately
			activationRequests = activationRequests.filter((req) => req.instanceId !== instanceId);

			// Sync with server in background
			await invalidateAll();
		} catch (_error) {
			toaster.error('Erreur lors du rejet');
		} finally {
			processingRequests[instanceId] = false;
		}
	}

	/**
	 * Handle granting a specific VIP card to a student
	 * Called when teacher clicks the "+" button next to a filtered card
	 */
	async function handleGrantVipCard(studentId: string) {
		if (!selectedCardFilter) return; // Safety check - no card selected

		grantingCard = studentId;

		// Get current state for rollback if needed
		const currentRewards = teacherCache.getRewardsSync(selectedClassId);
		const studentRewards = currentRewards?.get(studentId);
		const originalVipCards = studentRewards ? { ...studentRewards.vip_cards } : null;

		try {
			// Optimistic update: Add card BEFORE API call
			if (studentRewards) {
				const tempInstanceId = `temp-${Date.now()}-${Math.random()}`;
				const optimisticVipCards = { ...studentRewards.vip_cards };

				optimisticVipCards[tempInstanceId] = {
					cardId: selectedCardFilter,
					earnedAt: new Date().toISOString(),
					usedAt: null
				};

				teacherCache.updateVipCardsOptimistic(selectedClassId, studentId, optimisticVipCards);
			}

			const response = await fetch('/api/teacher/rewards/grant-specific-vip-card', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					studentId,
					cardId: selectedCardFilter,
					count: 1
				})
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				throw new Error(errorData.message || "Erreur lors de l'attribution de la carte");
			}

			const result = await response.json();

			// Replace optimistic data with real data from server
			if (studentRewards) {
				const finalVipCards = { ...studentRewards.vip_cards };

				for (const c of result.cards) {
					finalVipCards[c.instanceId] = {
						cardId: c.cardId,
						earnedAt: c.earnedAt,
						usedAt: null
					};
				}

				teacherCache.updateVipCardsOptimistic(selectedClassId, studentId, finalVipCards);
			}

			// Get card name for success message
			const card = getTemplateById(selectedCardFilter, $vipCardTemplates);
			toaster.success(`Carte "${card?.name || selectedCardFilter}" offerte !`);
		} catch (err) {
			console.error('Error granting VIP card:', err);
			toaster.error(err instanceof Error ? err.message : "Erreur lors de l'attribution");

			// Rollback: Restore original state
			if (originalVipCards) {
				teacherCache.updateVipCardsOptimistic(selectedClassId, studentId, originalVipCards);
			}
		} finally {
			grantingCard = null;
		}
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
	 * Uses new modalStack-based VIP card draw system
	 */
	function handleAwardVipCard(student: {
		id: string;
		firstname: string;
		lastname: string | null;
		full_name: string | null;
	}) {
		const studentName = getFullName(student.firstname, student.lastname, student.full_name);

		openVipCardDrawModal({
			studentId: student.id,
			count: 1,
			paymentMethod: 'gidouilles',
			gidouillesCost: 3,
			studentName,
			classId: selectedClassId,
			onComplete: () => {
				// Optional: refresh or update UI after draw
				// Cache is already updated optimistically by the modal
			}
		});
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
	 * Open VIP cards modal for a student (teacher view)
	 * Passes studentId/classId/periodId - modal reads from cache
	 * VIP cards will be read from cache by the modal component itself
	 */
	function openVipModal(student: {
		id: string;
		firstname: string | null;
		lastname: string | null;
		full_name: string | null;
	}) {
		const periodId = getSelectedPeriodId();
		if (!periodId) {
			toaster.error('Aucune période académique sélectionnée');
			return;
		}

		openVipCardsModal({
			studentId: student.id,
			studentName: getFullName(student.firstname, student.lastname, student.full_name),
			classId: selectedClassId,
			periodId,
			teacherView: true
		});
	}
</script>

<div class="container mx-auto py-8">
	<h1 class="mb-6 text-3xl font-bold">Gestion des Récompenses</h1>

	<Tabs.Root value={activeTab} onValueChange={changeTab}>
		<Tabs.List class="mb-6">
			<Tabs.Trigger value="gidouilles">Gidouilles</Tabs.Trigger>
			<Tabs.Trigger value="demandes" class="relative">
				Demandes d'activation VIP
				{#if activationRequests.length > 0}
					<Badge variant="destructive" class="ml-2">
						{activationRequests.length}
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

								<!-- Filter Section with Toggle Mode -->
								<div class="space-y-2">
									<div class="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
										<!-- Left side: Mode toggle -->
										<div class="flex items-center gap-3">
											<span class="text-sm font-medium">Mode :</span>
											<div class="flex gap-2">
												<Button
													variant={filterMode === 'filter' ? 'default' : 'outline'}
													size="sm"
													onclick={() => (filterMode = 'filter')}
												>
													Filtrer
												</Button>
												<Button
													variant={filterMode === 'add' ? 'default' : 'outline'}
													size="sm"
													disabled={!selectedCardFilter}
													onclick={() => (filterMode = 'add')}
													title={!selectedCardFilter ? "Sélectionnez une carte VIP d'abord" : ''}
												>
													Ajouter
												</Button>
											</div>
										</div>

										<!-- Separator -->
										<div class="h-8 w-px bg-border"></div>

										<!-- Right side: Card selection -->
										<span class="text-sm font-medium">Carte VIP :</span>
										<div class="w-64">
											<VipCardSelector
												bind:selectedCardId={selectedCardFilter}
												availableCards={enabledCardTemplates}
											/>
										</div>
									</div>

									<!-- Contextual help message -->
									{#if filterMode === 'filter'}
										<p class="px-4 text-xs text-muted-foreground">
											Affiche uniquement les élèves qui possèdent déjà cette carte
										</p>
									{:else if !selectedCardFilter}
										<p class="px-4 text-xs text-amber-600 dark:text-amber-400">
											Sélectionnez une carte VIP pour activer le mode "Ajouter"
										</p>
									{:else}
										{@const card = getTemplateById(selectedCardFilter, $vipCardTemplates)}
										<p class="px-4 text-xs text-muted-foreground">
											Affiche tous les élèves. Cliquez sur + pour offrir la carte "{card?.name ||
												selectedCardFilter}"
										</p>
									{/if}
								</div>

								<!-- LISTE DES ÉLÈVES -->
								<Tooltip.Provider>
									{#if currentStudents.length === 0}
										<div class="rounded-lg border border-border bg-card p-12 text-center">
											<p class="text-lg font-medium">Aucun élève dans cette classe</p>
											<p class="mt-2 text-sm text-muted-foreground">
												Ajoutez des élèves pour commencer à gérer leurs récompenses
											</p>
										</div>
									{:else if filteredStudents.length === 0}
										<div class="rounded-lg border border-border bg-card p-12 text-center">
											<p class="text-lg font-medium">Aucun élève ne correspond au filtre</p>
											<p class="mt-2 text-sm text-muted-foreground">
												Aucun élève ne possède cette carte VIP actuellement
											</p>
										</div>
									{:else}
										<div class="overflow-hidden rounded-lg border border-border bg-card">
											<div class="border-b border-border bg-muted/30 px-6 py-4">
												<h3 class="text-lg font-semibold text-foreground">
													Élèves ({filteredStudents.length})
												</h3>
											</div>

											<div class="divide-y divide-border">
												{#each filteredStudents as student (student.id)}
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
																{getFullName(
																	student.firstname,
																	student.lastname,
																	student.full_name
																)}
															</p>
														</div>

														<!-- GIDOUILLES ACTUELLES -->
														<div class="flex w-32 items-center justify-end gap-2">
															<img
																src={gidouilleImg}
																alt="Gidouille"
																class="h-6 w-6 flex-shrink-0"
															/>
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
																disabled={!canAffordVipCard(getStudentGidouilles(student.id))}
															>
																<Sparkles class="h-4 w-4" />
																<span class="hidden sm:inline">Carte VIP</span>
																<span class="text-xs opacity-80"
																	>(3 <img
																		src={gidouilleImg}
																		alt="gidouille"
																		class="inline h-3 w-3"
																	/>)</span
																>
															</Button>

															<!-- Grant Specific VIP Card Button (only shows when add mode is active) -->
															{#if filterMode === 'add' && selectedCardFilter}
																{@const card = getTemplateById(
																	selectedCardFilter,
																	$vipCardTemplates
																)}
																<Tooltip.Root>
																	<Tooltip.Trigger>
																		<Button
																			size="sm"
																			variant="outline"
																			class="h-10 w-10 p-0"
																			onclick={() => handleGrantVipCard(student.id)}
																			disabled={grantingCard === student.id}
																		>
																			{#if grantingCard === student.id}
																				<Loader2 class="h-4 w-4 animate-spin" />
																			{:else}
																				<Plus class="h-4 w-4" />
																			{/if}
																		</Button>
																	</Tooltip.Trigger>
																	<Tooltip.Content>
																		<p>Offrir carte "{card?.name || selectedCardFilter}"</p>
																	</Tooltip.Content>
																</Tooltip.Root>
															{/if}
														</div>
													</div>
												{/each}
											</div>
										</div>
									{/if}
								</Tooltip.Provider>
							</Tabs.Content>
						{/each}
					</Tabs.Root>
				{/if}
			</div>
		</Tabs.Content>

		<!-- TAB 2: DEMANDES D'ACTIVATION VIP -->
		<Tabs.Content value="demandes">
			<div class="space-y-6">
				{#if activationRequests.length === 0}
					<!-- Empty state -->
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
					<!-- Search and Filters -->
					<Card.Root>
						<Card.Content class="pt-6">
							<div class="flex flex-col gap-4 sm:flex-row sm:items-center">
								<!-- Search -->
								<div class="relative flex-1">
									<Search
										class="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
									/>
									<Input
										type="text"
										placeholder="Rechercher un élève..."
										bind:value={requestSearchQuery}
										class="pl-10"
									/>
								</div>

								<!-- Card Filter -->
								<div class="w-full sm:w-64">
									<MySelect
										type="single"
										bind:value={requestCardFilter}
										items={requestCardFilterItems}
										placeholder="Filtrer par carte"
									/>
								</div>

								<!-- Sort Order -->
								<div class="w-full sm:w-48">
									<MySelect
										type="single"
										bind:value={requestSortOrder}
										items={[
											{ value: 'oldest', label: 'Plus anciennes' },
											{ value: 'newest', label: 'Plus récentes' }
										]}
										placeholder="Trier par"
									/>
								</div>
							</div>
						</Card.Content>
					</Card.Root>

					<!-- Requests Table -->
					{#if filteredActivationRequests.length === 0}
						<Card.Root>
							<Card.Content class="pt-6 text-center">
								<AlertCircle class="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
								<p class="text-lg text-muted-foreground">
									Aucune demande ne correspond aux filtres
								</p>
								<p class="mt-2 text-sm text-muted-foreground">
									Essayez de modifier vos critères de recherche
								</p>
							</Card.Content>
						</Card.Root>
					{:else}
						<Card.Root>
							<Card.Header>
								<Card.Title class="flex items-center justify-between">
									<span>Demandes en attente</span>
									<Badge variant="secondary">
										{filteredActivationRequests.length}
										{#if filteredActivationRequests.length !== activationRequests.length}
											/ {activationRequests.length}
										{/if}
									</Badge>
								</Card.Title>
							</Card.Header>
							<Card.Content>
								<!-- Responsive Table -->
								<div class="overflow-x-auto">
									<Table.Root>
										<Table.Header>
											<Table.Row>
												<!-- Select All Checkbox -->
												<Table.Head class="w-12">
													<MyCheckbox
														checked={allVisibleSelected}
														onCheckedChange={toggleSelectAll}
													/>
												</Table.Head>
												<Table.Head>Élève</Table.Head>
												<Table.Head>Carte</Table.Head>
												<Table.Head class="hidden md:table-cell">Action</Table.Head>
												<Table.Head class="hidden sm:table-cell">Demandé</Table.Head>
												<Table.Head class="text-right">Actions</Table.Head>
											</Table.Row>
										</Table.Header>
										<Table.Body>
											{#each filteredActivationRequests as request (request.instanceId)}
												{@const template = getTemplateById(request.cardId, $vipCardTemplates)}
												<Table.Row class="group hover:bg-muted/50">
													<!-- Checkbox -->
													<Table.Cell>
														<MyCheckbox
															checked={selectedRequests.has(request.instanceId)}
															onCheckedChange={() => toggleRequestSelection(request.instanceId)}
															disabled={processingRequests[request.instanceId]}
														/>
													</Table.Cell>

													<!-- Student Name -->
													<Table.Cell class="font-medium">
														{request.studentName}
													</Table.Cell>

													<!-- Card -->
													<Table.Cell>
														<div class="flex items-center gap-2">
															{#if template}
																<img
																	src={template.image_path}
																	alt={template.name}
																	class="h-8 w-8 rounded object-cover"
																/>
															{/if}
															<Badge variant="outline" class="font-semibold">
																{request.cardName}
															</Badge>
														</div>
													</Table.Cell>

													<!-- Action Description (hidden on mobile) -->
													<Table.Cell class="hidden text-sm text-muted-foreground md:table-cell">
														{#if template && template.action}
															{getActionDescription(template.action, $vipCardTemplates)}
														{:else}
															{request.actionDescription}
														{/if}
													</Table.Cell>

													<!-- Requested Time (hidden on small screens) -->
													<Table.Cell class="hidden text-sm sm:table-cell">
														{getRelativeTime(request.requestedAt)}
													</Table.Cell>

													<!-- Actions -->
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
																	<span class="hidden sm:inline">Utiliser</span>
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
																	<span class="hidden sm:inline">Rejeter</span>
																{/if}
															</Button>
														</div>
													</Table.Cell>
												</Table.Row>
											{/each}
										</Table.Body>
									</Table.Root>
								</div>

								<!-- Bulk Actions -->
								{#if selectedRequests.size > 0}
									<div
										class="mt-4 flex flex-col items-center justify-between gap-4 rounded-lg border border-border bg-muted/30 p-4 sm:flex-row"
									>
										<div class="flex items-center gap-2 text-sm font-medium">
											<span>
												{selectedRequests.size} demande{selectedRequests.size > 1 ? 's' : ''} sélectionnée{selectedRequests.size >
												1
													? 's'
													: ''}
											</span>
											<Button variant="ghost" size="sm" onclick={clearSelections}>
												Désélectionner tout
											</Button>
										</div>

										<div class="flex gap-2">
											<Button
												onclick={() => (showBulkApproveDialog = true)}
												disabled={isBulkProcessing}
												size="sm"
												class="bg-green-600 hover:bg-green-700"
											>
												{#if isBulkProcessing && !showBulkRejectDialog}
													<Loader2 class="mr-2 h-4 w-4 animate-spin" />
													{bulkProgress.current}/{bulkProgress.total}
												{:else}
													<CheckCircle class="mr-2 h-4 w-4" />
													Approuver sélectionnées
												{/if}
											</Button>

											<Button
												onclick={() => (showBulkRejectDialog = true)}
												disabled={isBulkProcessing}
												size="sm"
												variant="destructive"
											>
												{#if isBulkProcessing && showBulkRejectDialog}
													<Loader2 class="mr-2 h-4 w-4 animate-spin" />
													{bulkProgress.current}/{bulkProgress.total}
												{:else}
													<XCircle class="mr-2 h-4 w-4" />
													Rejeter sélectionnées
												{/if}
											</Button>
										</div>
									</div>
								{/if}
							</Card.Content>
						</Card.Root>
					{/if}
				{/if}
			</div>
		</Tabs.Content>
	</Tabs.Root>
</div>

<!-- Bulk Approve Confirmation Dialog -->
<ConfirmDialog
	bind:open={showBulkApproveDialog}
	title="Approuver les demandes sélectionnées"
	description={`Vous êtes sur le point d'approuver ${selectedRequestDetails.length} demande${selectedRequestDetails.length > 1 ? 's' : ''} d'activation VIP :\n\n${selectedRequestDetails.map((r) => `• ${r.studentName} - ${r.cardName}`).join('\n')}\n\nAprès approbation, les élèves pourront activer leurs cartes eux-mêmes.`}
	confirmLabel="Approuver tout"
	cancelLabel="Annuler"
	variant="default"
	onConfirm={handleBulkApprove}
/>

<!-- Bulk Reject Confirmation Dialog -->
<ConfirmDialog
	bind:open={showBulkRejectDialog}
	title="Rejeter les demandes sélectionnées"
	description={`Vous êtes sur le point de rejeter ${selectedRequestDetails.length} demande${selectedRequestDetails.length > 1 ? 's' : ''} d'activation VIP :\n\n${selectedRequestDetails.map((r) => `• ${r.studentName} - ${r.cardName}`).join('\n')}\n\nLes cartes retourneront dans la collection des élèves sans effet.`}
	confirmLabel="Rejeter tout"
	cancelLabel="Annuler"
	variant="destructive"
	onConfirm={handleBulkReject}
/>

<!-- VIP Cards Modal is now managed by modal stack via openVipCardsModal() -->
