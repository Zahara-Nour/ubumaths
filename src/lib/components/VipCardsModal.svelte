<!--
	VipCardsModal Component
	========================
	Modal dialog displaying all VIP cards owned by a student.

	Features:
	- Responsive grid layout of all cards
	- Count badges on cards
	- Click to view holographic card detail
	- Empty state for no cards
	- Progress statistics
-->

<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import VipCard from './VipCard.svelte';
	import VipCardHoloModal from './VipCardHoloModal.svelte';
	import {
		getStudentCardsWithCounts,
		getUniqueCardTypesCount,
		getTotalUnusedCards,
		sortCardsByPriority
	} from '$lib/utils/vip-cards';
	import {
		getTotalVipCards,
		type VipCard as VipCardType
	} from '$lib/types/vip-card';
	import type { StudentVipCards } from '$lib/types/vip-card';
	import { Sparkles } from 'lucide-svelte';

	interface Props {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		studentName: string;
		vipCards: StudentVipCards;
	}

	let { open = $bindable(false), onOpenChange, studentName, vipCards }: Props = $props();

	// Holographic modal state
	let holoModalVisible = $state(false);
	let selectedCardForHolo = $state<{ card: VipCardType; count: number } | null>(null);

	// Get cards with counts, sorted by rarity (legendary → epic → rare → common)
	const cardsWithCounts = $derived(sortCardsByPriority(getStudentCardsWithCounts(vipCards)));

	// Statistics
	const uniqueCardsCount = $derived(getUniqueCardTypesCount(vipCards));
	const totalCardsCount = $derived(getTotalUnusedCards(vipCards));
	const totalAvailableCards = getTotalVipCards();

	// Handle dialog open/close
	function handleOpenChange(newOpen: boolean) {
		open = newOpen;
		onOpenChange?.(newOpen);
	}

	// Handle card click - open holographic modal
	function handleCardClick(card: VipCardType, count: number) {
		selectedCardForHolo = { card, count };
		holoModalVisible = true;
	}

	// Close holographic modal
	function closeHoloModal() {
		holoModalVisible = false;
		// Clear selection after animation completes
		setTimeout(() => {
			selectedCardForHolo = null;
		}, 300);
	}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Content class="max-h-[90vh] max-w-7xl overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2 text-2xl font-bold">
				<Sparkles class="h-6 w-6 text-amber-500" />
				Cartes VIP de {studentName}
			</Dialog.Title>
		</Dialog.Header>

		<!-- Cards Display -->
		{#if cardsWithCounts.length === 0}
			<!-- Empty State -->
			<div class="flex flex-col items-center justify-center px-4 py-16 text-center">
				<div class="mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-muted">
					<Sparkles class="h-12 w-12 text-muted-foreground" />
				</div>
				<h3 class="mb-2 text-xl font-semibold text-foreground">Aucune carte VIP pour le moment</h3>
				<p class="max-w-md text-muted-foreground">
					{studentName} n'a pas encore de cartes VIP. Il faut dépenser 3 gidouilles pour obtenir une
					carte aléatoire.
				</p>
			</div>
		{:else}
			<!-- All Cards Grid - Sorted by Rarity -->
			<div class="grid grid-cols-2 gap-8 sm:grid-cols-3 xl:grid-cols-4 p-6">
				{#each cardsWithCounts as cardWithCount}
					<div
						class="transform cursor-pointer transition-transform hover:scale-105"
						onclick={() => handleCardClick(cardWithCount, cardWithCount.count)}
						onkeydown={(e) => {
							if (e.key === 'Enter' || e.key === ' ') {
								e.preventDefault();
								handleCardClick(cardWithCount, cardWithCount.count);
							}
						}}
						role="button"
						tabindex="0"
						aria-label="Voir {cardWithCount.name} en grand"
					>
						<VipCard
							card={cardWithCount}
							count={cardWithCount.count}
							size="sm"
							clickable={false}
						/>
					</div>
				{/each}
			</div>
		{/if}

		<Dialog.Footer class="mt-6">
			<Button variant="outline" onclick={() => handleOpenChange(false)}>Fermer</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<!-- Holographic Card Modal -->
{#if selectedCardForHolo}
	<VipCardHoloModal
		card={selectedCardForHolo.card}
		count={selectedCardForHolo.count}
		visible={holoModalVisible}
		onClose={closeHoloModal}
	/>
{/if}
