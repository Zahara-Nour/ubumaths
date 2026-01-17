<!--
	Rewards Management Page for Teachers
	=====================================

	This page allows teachers to manage gidouilles (reward points) and VIP cards for their students.

	ARCHITECTURE:
	- GidouillesTab.svelte: Main tab for managing gidouilles and VIP cards per class
	- ActivationRequestsTab.svelte: Tab for handling VIP card activation requests
	- StudentRewardRow.svelte: Individual student row with gidouilles/bonus/VIP controls

	PERFORMANCE OPTIMIZATION (Optimistic UI + Debouncing):
	- Instant UI feedback via teacherCache optimistic updates
	- Request batching with 500ms debounce window
	- Delta accumulation for rapid clicks
	- Automatic rollback on errors
-->

<script lang="ts">
	import type { PageData } from './$types';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Badge } from '$lib/components/ui/badge';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { teacherCache } from '$lib/stores/teacherDashboardCache.svelte';
	import { selectedClassStore } from '$lib/stores/selectedClass.svelte';
	import { getSelectedPeriodId } from '$lib/stores/selectedPeriod.svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { openVipCardDrawModal, openVipCardsModal } from '$lib/utils/vip-card-modals';
	import GidouillesTab from './GidouillesTab.svelte';
	import ActivationRequestsTab, { type ActivationRequest } from './ActivationRequestsTab.svelte';

	// Data from parent layouts
	let { data }: { data: PageData } = $props();

	// Get classes from cache (reactively updates when cache changes)
	let classes = $derived(teacherCache.getAllClassesSync());

	// Use shared selectedClass store (persists across pages and reloads)
	const classStore = selectedClassStore();

	// Initialize selectedClassId: restore from localStorage (fallback handled in effect)
	let selectedClassId = $state(classStore.id || '');

	// Fallback to first class when no selection and classes are loaded
	$effect(() => {
		if (!selectedClassId && classes.length > 0) {
			selectedClassId = classes[0].id;
		}
	});

	// Sync local state with shared store when it changes locally
	$effect(() => {
		if (selectedClassId) {
			classStore.set(selectedClassId);
		}
	});

	// Tab management (URL-based)
	let activeTab = $derived(page.url.searchParams.get('tab') || 'gidouilles');

	function changeTab(tab: string) {
		const url =
			tab === 'gidouilles'
				? '/dashboard/teacher/gamification/rewards'
				: `/dashboard/teacher/gamification/rewards?tab=${tab}`;
		goto(url, { replaceState: false });
	}

	// Local state for activation requests (enables optimistic updates)
	let activationRequests = $state<ActivationRequest[]>([]);

	// Sync local state with server data (runs on mount and after invalidateAll)
	$effect(() => {
		activationRequests = data.activationRequests as ActivationRequest[];
	});

	// ============================================================================
	// DEBOUNCING STATE
	// ============================================================================

	// Tracks pending server requests to batch rapid clicks
	// Key: "student-{id}" or "class-{id}"
	let pendingSubmissions = $state<Record<string, { timeoutId: number; accumulatedDelta: number }>>(
		{}
	);

	// Tracks pending bonus server requests (student-level only)
	let pendingBonusSubmissions = $state<
		Record<string, { timeoutId: number; accumulatedDelta: number }>
	>({});

	// ============================================================================
	// DEBOUNCED UPDATE FUNCTIONS
	// ============================================================================

	/**
	 * Debounced update for individual student gidouilles via cache
	 */
	function debouncedUpdateStudent(studentId: string, delta: number, studentName: string) {
		const key = `student-${studentId}`;

		// Apply optimistic update immediately
		teacherCache.updateGidouillesOptimistic(selectedClassId, studentId, delta);

		// Handle debouncing
		if (pendingSubmissions[key]) {
			clearTimeout(pendingSubmissions[key].timeoutId);
			pendingSubmissions[key].accumulatedDelta += delta;
		} else {
			pendingSubmissions[key] = { timeoutId: 0, accumulatedDelta: delta };
		}

		// Set timeout to submit after 500ms
		const timeoutId = setTimeout(async () => {
			const accumulatedDelta = pendingSubmissions[key].accumulatedDelta;
			delete pendingSubmissions[key];

			try {
				const response = await fetch('/api/teacher/rewards/update-student', {
					method: 'POST',
					body: JSON.stringify({
						studentId,
						classId: selectedClassId,
						delta: accumulatedDelta
					}),
					headers: { 'Content-Type': 'application/json' }
				});

				if (response.ok) {
					await response.json();
					toaster.success(
						`${accumulatedDelta > 0 ? '+' : ''}${accumulatedDelta} gidouille${Math.abs(accumulatedDelta) > 1 ? 's' : ''} (${studentName})`
					);
				} else {
					teacherCache.updateGidouillesOptimistic(selectedClassId, studentId, -accumulatedDelta);
					toaster.error('Echec de la mise a jour');
				}
			} catch {
				teacherCache.updateGidouillesOptimistic(selectedClassId, studentId, -accumulatedDelta);
				toaster.error('Erreur reseau');
			}
		}, 500) as unknown as number;

		pendingSubmissions[key].timeoutId = timeoutId;
	}

	/**
	 * Debounced update for individual student bonus
	 */
	function debouncedUpdateStudentBonus(studentId: string, delta: number, studentName: string) {
		const key = `bonus-student-${studentId}`;

		// Apply optimistic update immediately
		teacherCache.updateBonusOptimistic(selectedClassId, studentId, delta);

		// Handle debouncing
		if (pendingBonusSubmissions[key]) {
			clearTimeout(pendingBonusSubmissions[key].timeoutId);
			pendingBonusSubmissions[key].accumulatedDelta += delta;
		} else {
			pendingBonusSubmissions[key] = { timeoutId: 0, accumulatedDelta: delta };
		}

		// Set timeout to submit after 500ms
		const timeoutId = setTimeout(async () => {
			const accumulatedDelta = pendingBonusSubmissions[key].accumulatedDelta;
			delete pendingBonusSubmissions[key];

			try {
				const response = await fetch('/api/teacher/rewards/update-student-bonus', {
					method: 'POST',
					body: JSON.stringify({
						studentId,
						classId: selectedClassId,
						delta: accumulatedDelta
					}),
					headers: { 'Content-Type': 'application/json' }
				});

				if (response.ok) {
					await response.json();
					toaster.success(
						`${accumulatedDelta > 0 ? '+' : ''}${accumulatedDelta} bonus (${studentName})`
					);
				} else {
					teacherCache.updateBonusOptimistic(selectedClassId, studentId, -accumulatedDelta);
					toaster.error('Echec de la mise a jour du bonus');
				}
			} catch {
				teacherCache.updateBonusOptimistic(selectedClassId, studentId, -accumulatedDelta);
				toaster.error('Erreur reseau');
			}
		}, 500) as unknown as number;

		pendingBonusSubmissions[key].timeoutId = timeoutId;
	}

	/**
	 * Debounced update for class-wide gidouilles
	 */
	function debouncedUpdateClass(classId: string, delta: number) {
		const key = `class-${classId}`;

		// Apply optimistic update to ALL students immediately
		const students = teacherCache.getStudentsSync(classId);
		students.forEach((student) => {
			teacherCache.updateGidouillesOptimistic(classId, student.id, delta);
		});

		// Handle debouncing
		if (pendingSubmissions[key]) {
			clearTimeout(pendingSubmissions[key].timeoutId);
			pendingSubmissions[key].accumulatedDelta += delta;
		} else {
			pendingSubmissions[key] = { timeoutId: 0, accumulatedDelta: delta };
		}

		// Set timeout to submit after 500ms
		const timeoutId = setTimeout(async () => {
			const accumulatedDelta = pendingSubmissions[key].accumulatedDelta;
			delete pendingSubmissions[key];

			try {
				const response = await fetch('/api/teacher/rewards/update-class', {
					method: 'POST',
					body: JSON.stringify({ classId, delta: accumulatedDelta }),
					headers: { 'Content-Type': 'application/json' }
				});

				if (response.ok) {
					await response.json();
					const studentCount = teacherCache.getStudentsSync(classId).length;
					toaster.success(
						`${accumulatedDelta > 0 ? '+' : ''}${accumulatedDelta} gidouille${Math.abs(accumulatedDelta) > 1 ? 's' : ''} pour ${studentCount} eleve${studentCount > 1 ? 's' : ''}`
					);
				} else {
					// Rollback all students
					students.forEach((student) => {
						teacherCache.updateGidouillesOptimistic(classId, student.id, -accumulatedDelta);
					});
					toaster.error('Echec de la mise a jour de la classe');
				}
			} catch {
				// Rollback all students
				students.forEach((student) => {
					teacherCache.updateGidouillesOptimistic(classId, student.id, -accumulatedDelta);
				});
				toaster.error('Erreur reseau');
			}
		}, 500) as unknown as number;

		pendingSubmissions[key].timeoutId = timeoutId;
	}

	// ============================================================================
	// VIP CARD HANDLERS
	// ============================================================================

	interface Student {
		id: string;
		firstname: string | null;
		lastname: string | null;
		full_name: string | null;
	}

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
		return 'Eleve sans nom';
	}

	/**
	 * Award VIP Card Handler - Uses modalStack-based VIP card draw system
	 */
	function handleAwardVipCard(student: Student) {
		const studentName = getFullName(student.firstname, student.lastname, student.full_name);

		openVipCardDrawModal({
			studentId: student.id,
			count: 1,
			paymentMethod: 'gidouilles',
			gidouillesCost: 3,
			studentName,
			classId: selectedClassId,
			onComplete: () => {
				// Cache is already updated optimistically by the modal
			}
		});
	}

	/**
	 * Open VIP cards modal for a student (teacher view)
	 */
	function handleViewVipCards(student: Student) {
		const periodId = getSelectedPeriodId();
		if (!periodId) {
			toaster.error('Aucune periode academique selectionnee');
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

	// ============================================================================
	// CLEANUP
	// ============================================================================

	/**
	 * Cleanup effect - clears all pending timeouts on component unmount
	 */
	$effect(() => {
		return () => {
			Object.values(pendingSubmissions).forEach(({ timeoutId }) => {
				clearTimeout(timeoutId);
			});
			Object.values(pendingBonusSubmissions).forEach(({ timeoutId }) => {
				clearTimeout(timeoutId);
			});
		};
	});
</script>

<div class="container mx-auto py-8">
	<h1 class="mb-6 text-3xl font-bold">Gestion des Recompenses</h1>

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

		<!-- TAB 1: GIDOUILLES -->
		<Tabs.Content value="gidouilles">
			<GidouillesTab
				{classes}
				bind:selectedClassId
				onUpdateStudentGidouilles={debouncedUpdateStudent}
				onUpdateStudentBonus={debouncedUpdateStudentBonus}
				onUpdateClassGidouilles={debouncedUpdateClass}
				onAwardVipCard={handleAwardVipCard}
				onViewVipCards={handleViewVipCards}
			/>
		</Tabs.Content>

		<!-- TAB 2: DEMANDES D'ACTIVATION VIP -->
		<Tabs.Content value="demandes">
			<ActivationRequestsTab
				{activationRequests}
				onRequestsChange={(requests) => (activationRequests = requests)}
			/>
		</Tabs.Content>
	</Tabs.Root>
</div>
