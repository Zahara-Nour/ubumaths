<!--
	VipCardsModal Component
	========================
	Modal dialog displaying all VIP cards owned by a student.

	Features:
	- Grid layout of flip cards
	- Count badges on cards
	- Filter by category
	- Empty state for no cards
	- Progress indicator (X/26 cards collected)
-->

<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import * as Tabs from '$lib/components/ui/tabs';
	import VipCard from './VipCard.svelte';
	import { getStudentCardsWithCounts, getUniqueCardTypesCount, getTotalUnusedCards } from '$lib/utils/vip-cards';
	import { getTotalVipCards, type VipCardCategory } from '$lib/types/vip-card';
	import type { StudentVipCards } from '$lib/types/vip-card';
	import { cn } from '$lib/utils';
	import { Sparkles, Trophy } from 'lucide-svelte';

	interface Props {
		open?: boolean;
		onOpenChange?: (open: boolean) => void;
		studentName: string;
		vipCards: StudentVipCards;
	}

	let {
		open = $bindable(false),
		onOpenChange,
		studentName,
		vipCards
	}: Props = $props();

	// Get cards with counts
	const cardsWithCounts = $derived(getStudentCardsWithCounts(vipCards));

	// Statistics
	const uniqueCardsCount = $derived(getUniqueCardTypesCount(vipCards));
	const totalCardsCount = $derived(getTotalUnusedCards(vipCards));
	const totalAvailableCards = getTotalVipCards();

	// Group cards by category
	const cardsByCategory = $derived(() => {
		const grouped: Record<VipCardCategory, typeof cardsWithCounts> = {
			bonus: [],
			privilege: [],
			social: [],
			power: []
		};

		cardsWithCounts.forEach((card) => {
			grouped[card.category].push(card);
		});

		return grouped;
	});

	// Category labels in French
	const categoryLabels: Record<VipCardCategory, string> = {
		bonus: '🎁 Bonus',
		privilege: '👑 Privilèges',
		social: '👥 Social',
		power: '⚡ Pouvoirs'
	};

	// Handle dialog open/close
	function handleOpenChange(newOpen: boolean) {
		open = newOpen;
		onOpenChange?.(newOpen);
	}
</script>

<Dialog.Root {open} onOpenChange={handleOpenChange}>
	<Dialog.Content class="max-w-5xl max-h-[90vh] overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title class="text-2xl font-bold flex items-center gap-2">
				<Sparkles class="w-6 h-6 text-amber-500" />
				Cartes VIP de {studentName}
			</Dialog.Title>
			<Dialog.Description class="text-base">
				Collection de cartes privilèges
			</Dialog.Description>
		</Dialog.Header>

		<!-- Statistics Bar -->
		<div class="flex items-center justify-between gap-4 py-4 px-2 bg-muted/30 rounded-lg mb-6">
			<div class="flex items-center gap-2">
				<Trophy class="w-5 h-5 text-amber-500" />
				<div>
					<p class="text-sm font-semibold text-foreground">
						{uniqueCardsCount} / {totalAvailableCards}
					</p>
					<p class="text-xs text-muted-foreground">Types uniques collectés</p>
				</div>
			</div>

			<div class="h-8 w-px bg-border"></div>

			<div>
				<p class="text-sm font-semibold text-foreground">
					{totalCardsCount}
				</p>
				<p class="text-xs text-muted-foreground">Cartes disponibles</p>
			</div>

			<div class="h-8 w-px bg-border"></div>

			<div class="flex-1">
				<div class="flex items-center gap-2 mb-1">
					<span class="text-xs font-medium text-muted-foreground">Progression</span>
					<span class="text-xs font-semibold text-foreground">
						{Math.round((uniqueCardsCount / totalAvailableCards) * 100)}%
					</span>
				</div>
				<div class="w-full bg-muted rounded-full h-2 overflow-hidden">
					<div
						class="bg-gradient-to-r from-amber-500 to-orange-500 h-full transition-all duration-500"
						style="width: {(uniqueCardsCount / totalAvailableCards) * 100}%"
					></div>
				</div>
			</div>
		</div>

		<!-- Cards Display -->
		{#if cardsWithCounts.length === 0}
			<!-- Empty State -->
			<div class="flex flex-col items-center justify-center py-16 px-4 text-center">
				<div class="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
					<Sparkles class="w-12 h-12 text-muted-foreground" />
				</div>
				<h3 class="text-xl font-semibold text-foreground mb-2">
					Aucune carte VIP pour le moment
				</h3>
				<p class="text-muted-foreground max-w-md">
					{studentName} n'a pas encore de cartes VIP. Il faut dépenser 3 gidouilles pour obtenir une carte aléatoire.
				</p>
			</div>
		{:else}
			<!-- Tabs by Category -->
			<Tabs.Root value="all" class="w-full">
				<Tabs.List class="mb-6">
					<Tabs.Trigger value="all">
						Toutes ({cardsWithCounts.length})
					</Tabs.Trigger>
					{#each Object.entries(cardsByCategory()) as [category, cards]}
						{#if cards.length > 0}
							<Tabs.Trigger value={category}>
								{categoryLabels[category as VipCardCategory]} ({cards.length})
							</Tabs.Trigger>
						{/if}
					{/each}
				</Tabs.List>

				<!-- All Cards Tab -->
				<Tabs.Content value="all">
					<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
						{#each cardsWithCounts as cardWithCount}
							<VipCard
								card={cardWithCount}
								count={cardWithCount.count}
								size="sm"
								clickable={true}
							/>
						{/each}
					</div>
				</Tabs.Content>

				<!-- Category Tabs -->
				{#each Object.entries(cardsByCategory()) as [category, cards]}
					{#if cards.length > 0}
						<Tabs.Content value={category}>
							<div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
								{#each cards as cardWithCount}
									<VipCard
										card={cardWithCount}
										count={cardWithCount.count}
										size="sm"
										clickable={true}
									/>
								{/each}
							</div>
						</Tabs.Content>
					{/if}
				{/each}
			</Tabs.Root>
		{/if}

		<Dialog.Footer class="mt-6">
			<Button variant="outline" onclick={() => handleOpenChange(false)}>
				Fermer
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
