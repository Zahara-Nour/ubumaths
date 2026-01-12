<!--
	Gidouilles Tab Component
	========================

	Displays the gidouilles management interface for teachers.

	Features:
	- Class selection via tabs
	- Class-wide gidouilles +/- controls
	- VIP card filter/add mode
	- Student list with rewards (uses StudentRewardRow)
-->

<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { Loader2 } from 'lucide-svelte';
	import { teacherCache } from '$lib/stores/teacherDashboardCache.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { getStudentCardCounts } from '$lib/utils/vip-cards';
	import {
		vipCardTemplates,
		getTemplateById,
		getEnabledTemplates
	} from '$lib/stores/vipCardTemplates.svelte';
	import VipCardSelector from '$lib/components/VipCardSelector.svelte';
	import StudentRewardRow from './StudentRewardRow.svelte';
	import gidouilleImg from '$lib/assets/images/gidouille.png';

	interface ClassItem {
		id: string;
		name: string;
	}

	interface Student {
		id: string;
		firstname: string | null;
		lastname: string | null;
		full_name: string | null;
		avatar_url: string | null;
		role: string | null;
		gender: string | null;
	}

	interface Props {
		classes: ClassItem[];
		selectedClassId: string;
		onUpdateStudentGidouilles: (studentId: string, delta: number, studentName: string) => void;
		onUpdateStudentBonus: (studentId: string, delta: number, studentName: string) => void;
		onUpdateClassGidouilles: (classId: string, delta: number) => void;
		onAwardVipCard: (student: Student) => void;
		onViewVipCards: (student: Student) => void;
	}

	let {
		classes,
		selectedClassId = $bindable(),
		onUpdateStudentGidouilles,
		onUpdateStudentBonus,
		onUpdateClassGidouilles,
		onAwardVipCard,
		onViewVipCards
	}: Props = $props();

	// Grant VIP card state (local to this component)
	let grantingCard = $state<string | null>(null);

	// Filter state for VIP cards
	let selectedCardFilter = $state<string | null>(null);
	let filterMode = $state<'filter' | 'add'>('filter');

	// Get enabled templates for VipCardSelector
	const enabledCardTemplates = $derived(getEnabledTemplates($vipCardTemplates));

	// Get students from cache (reactively updates when cache changes)
	let currentStudents = $derived(
		selectedClassId ? (teacherCache.getStudentsSync(selectedClassId) as Student[]) : []
	);

	// Check if students are loaded in cache (for loading spinner)
	let isStudentsLoaded = $derived(
		selectedClassId ? teacherCache.hasStudentsCached(selectedClassId) : true
	);

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
				// MODE AJOUTER : afficher tous les eleves
				return true;
			}
		})
	);

	/**
	 * Get current gidouilles for a student from cache
	 */
	function getStudentGidouilles(studentId: string): number {
		const cached = teacherCache.getRewardsSync(selectedClassId);
		if (cached) {
			const rewards = cached.get(studentId);
			if (rewards) return rewards.gidouilles;
		}
		return 0;
	}

	/**
	 * Get current bonus for a student from cache
	 */
	function getStudentBonus(studentId: string): number {
		const cached = teacherCache.getRewardsSync(selectedClassId);
		if (cached) {
			const rewards = cached.get(studentId);
			if (rewards) return rewards.bonus;
		}
		return 0;
	}

	/**
	 * Handle granting a specific VIP card to a student (in add mode)
	 */
	async function handleGrantVipCard(studentId: string) {
		if (!selectedCardFilter) {
			toaster.error('Aucune carte VIP selectionnee');
			return;
		}

		grantingCard = studentId;

		try {
			const response = await fetch('/api/teacher/rewards/grant-specific-vip-card', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					studentId,
					cardId: selectedCardFilter
				})
			});

			if (response.ok) {
				const result = await response.json();
				// Update cache optimistically - use first granted card from response
				const grantedCard = result.cards?.[0];
				teacherCache.addVipCardOptimistic(selectedClassId, studentId, {
					id: grantedCard?.instanceId || crypto.randomUUID(),
					card_id: selectedCardFilter,
					status: 'active',
					granted_at: new Date().toISOString()
				});
				const card = getTemplateById(selectedCardFilter, $vipCardTemplates);
				toaster.success(`Carte "${card?.name || selectedCardFilter}" offerte !`);
			} else {
				const errorData = await response.json();
				toaster.error(errorData.message || "Echec de l'attribution de la carte");
			}
		} catch {
			toaster.error('Erreur reseau');
		} finally {
			grantingCard = null;
		}
	}
</script>

<div class="space-y-6">
	{#if classes.length === 0}
		<!-- No classes -->
		<div class="rounded-lg border border-border bg-card p-12 text-center">
			<img src={gidouilleImg} alt="Gidouille" class="mx-auto mb-4 h-16 w-16 opacity-50" />
			<h2 class="mb-2 text-xl font-semibold text-foreground">Aucune classe trouvee</h2>
			<p class="text-muted-foreground">
				Vous devez d'abord creer des classes pour gerer les recompenses de vos eleves.
			</p>
		</div>
	{:else}
		<!-- CLASS TABS -->
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
					<!-- CLASS CONTROLS AND VIP CARD FILTER -->
					<div class="flex w-full justify-between rounded-lg border border-border bg-card p-6">
						<div class="flex items-start gap-6">
							<!-- Left: Gidouilles Section -->
							<div class="flex items-center gap-3">
								<img src={gidouilleImg} alt="Gidouille" class="h-6 w-6 flex-shrink-0" />

								<!-- Button to remove 1 gidouille (debounced) -->
								<Button
									variant="default"
									class="h-10 w-10 p-0"
									onclick={() => onUpdateClassGidouilles(classItem.id, -1)}
								>
									-
								</Button>

								<!-- Button to add 1 gidouille (debounced) -->
								<Button
									variant="default"
									class="h-10 w-10 p-0"
									onclick={() => onUpdateClassGidouilles(classItem.id, 1)}
								>
									+
								</Button>
							</div>

							<!-- Vertical separator -->
							<div class="h-10 w-px bg-border"></div>

							<!-- Right: VIP Card Filter/Add Section -->
							<div class="flex-1 space-y-2">
								<div
									class="flex items-center gap-4 rounded-lg border border-border bg-muted/30 p-4"
								>
									<!-- Left side: Mode toggle -->
									<div class="flex items-center gap-3">
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
												title={!selectedCardFilter ? "Selectionnez une carte VIP d'abord" : ''}
											>
												Ajouter
											</Button>
										</div>
									</div>

									<!-- Separator -->
									<div class="h-8 w-px bg-border"></div>

									<!-- Right side: Card selection -->
									<div class="w-64">
										<VipCardSelector
											bind:selectedCardId={selectedCardFilter}
											availableCards={enabledCardTemplates}
										/>
									</div>
								</div>

								<!-- Contextual help message -->
								{#if filterMode === 'filter'}
									<p class="text-xs text-muted-foreground">
										Affiche uniquement les eleves qui possedent deja cette carte
									</p>
								{:else if !selectedCardFilter}
									<p class="text-xs text-amber-600 dark:text-amber-400">
										Selectionnez une carte VIP pour activer le mode "Ajouter"
									</p>
								{:else}
									{@const card = getTemplateById(selectedCardFilter, $vipCardTemplates)}
									<p class="text-xs text-muted-foreground">
										Affiche tous les eleves. Cliquez sur + pour offrir la carte "{card?.name ||
											selectedCardFilter}"
									</p>
								{/if}
							</div>
						</div>
					</div>

					<!-- STUDENT LIST -->
					<Tooltip.Provider>
						{#if !isStudentsLoaded}
							<!-- Loading spinner while students are being fetched -->
							<div class="rounded-lg border border-border bg-card p-12 text-center">
								<Loader2 class="mx-auto mb-4 h-8 w-8 animate-spin text-muted-foreground" />
								<p class="text-muted-foreground">Chargement des eleves...</p>
							</div>
						{:else if currentStudents.length === 0}
							<div class="rounded-lg border border-border bg-card p-12 text-center">
								<p class="text-lg font-medium">Aucun eleve dans cette classe</p>
								<p class="mt-2 text-sm text-muted-foreground">
									Ajoutez des eleves pour commencer a gerer leurs recompenses
								</p>
							</div>
						{:else if filteredStudents.length === 0}
							<div class="rounded-lg border border-border bg-card p-12 text-center">
								<p class="text-lg font-medium">Aucun eleve ne correspond au filtre</p>
								<p class="mt-2 text-sm text-muted-foreground">
									Aucun eleve ne possede cette carte VIP actuellement
								</p>
							</div>
						{:else}
							<div class="overflow-x-auto rounded-lg border border-border bg-card">
								<div class="border-b border-border bg-muted/30 px-6 py-4">
									<h3 class="text-lg font-semibold text-foreground">
										Eleves ({filteredStudents.length})
									</h3>
								</div>

								<div class="divide-y divide-border">
									{#each filteredStudents as student (student.id)}
										<StudentRewardRow
											{student}
											gidouilles={getStudentGidouilles(student.id)}
											bonus={getStudentBonus(student.id)}
											{filterMode}
											{selectedCardFilter}
											{grantingCard}
											onUpdateGidouilles={onUpdateStudentGidouilles}
											onUpdateBonus={onUpdateStudentBonus}
											{onAwardVipCard}
											{onViewVipCards}
											onGrantVipCard={handleGrantVipCard}
										/>
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
