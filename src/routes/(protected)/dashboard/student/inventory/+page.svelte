<!--
	Student Inventory Page
	======================

	Displays student's complete inventory with:
	- VIP card collection organized by rarity
	- Visual distinction between owned, history, and never-obtained cards
	- Collection statistics
	- Action buttons for owned cards with actions

	Future: Will include other item types when inventory system is expanded.
-->

<script lang="ts">
	import type { PageData } from './$types';
	import VipCard from '$lib/components/VipCard.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import { Lock, Trophy, Sparkles, Gem } from 'lucide-svelte';
	import { cn } from '$lib/utils';
	import type { VipCardRarity, StudentVipCards } from '$lib/types/vip-card';
	import type { CardCollectionStatus } from './+page.server';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { syncVipCards } from '$lib/utils/cache-sync';

	let { data }: { data: PageData } = $props();

	// Rarity configuration for sections
	const rarityConfig = {
		legendary: {
			label: 'Legendaire',
			color: 'text-orange-500 dark:text-orange-400',
			bgColor: 'bg-orange-500/10 dark:bg-orange-400/10',
			borderColor: 'border-orange-500/20 dark:border-orange-400/20'
		},
		epic: {
			label: 'Epique',
			color: 'text-purple-500 dark:text-purple-400',
			bgColor: 'bg-purple-500/10 dark:bg-purple-400/10',
			borderColor: 'border-purple-500/20 dark:border-purple-400/20'
		},
		rare: {
			label: 'Rare',
			color: 'text-blue-500 dark:text-blue-400',
			bgColor: 'bg-blue-500/10 dark:bg-blue-400/10',
			borderColor: 'border-blue-500/20 dark:border-blue-400/20'
		},
		common: {
			label: 'Commune',
			color: 'text-gray-500 dark:text-gray-400',
			bgColor: 'bg-gray-500/10 dark:bg-gray-400/10',
			borderColor: 'border-gray-500/20 dark:border-gray-400/20'
		}
	} as const;

	type RarityKey = keyof typeof rarityConfig;

	/**
	 * Get card status (owned, history, never)
	 */
	function getCardStatus(collectionStatus: CardCollectionStatus): 'owned' | 'history' | 'never' {
		if (collectionStatus.hasActiveInstance) return 'owned';
		if (collectionStatus.historyCount > 0) return 'history';
		return 'never';
	}

	/**
	 * Group cards by rarity and sort by rarity (Legendary -> Common)
	 */
	const collectionByRarity = $derived.by(() => {
		// Initialize groups with proper typing
		const grouped: Record<
			RarityKey,
			Array<{ template: (typeof data.templates)[0]; collectionStatus: CardCollectionStatus }>
		> = {
			legendary: [],
			epic: [],
			rare: [],
			common: []
		};

		// Group cards by rarity
		data.templates.forEach((template) => {
			const collectionStatus = data.collectionData?.[template.id];
			if (collectionStatus) {
				const rarity = template.rarity.toLowerCase() as RarityKey;
				if (grouped[rarity]) {
					grouped[rarity].push({ template, collectionStatus });
				}
			}
		});

		return grouped;
	});

	/**
	 * Handle card use button click - request activation from teacher
	 *
	 * PATTERN: Optimistic update BEFORE API call
	 * 1. Update cache immediately (activationRequestedAt = now)
	 * 2. Update local data.ownedCards for instant UI feedback
	 * 3. Make API call
	 * 4. Success: Cache and local state already correct
	 * 5. Error: Rollback both cache and local state
	 */
	async function handleUseCard(cardId: string) {
		// Find the first unused instance of this card
		const instances = Object.entries(data.ownedCards).filter(
			([_, instance]) =>
				instance.cardId === cardId && !instance.usedAt && !instance.activationRequestedAt
		);

		if (instances.length === 0) {
			toaster.error('Aucune instance disponible');
			return;
		}

		const [instanceId] = instances[0];
		const template = data.templates.find((t) => t.id === cardId);

		if (!template || !template.action) {
			toaster.error("Cette carte n'a pas d'action activable");
			return;
		}

		// Save current state for potential rollback
		const currentVipCards = { ...data.ownedCards };
		const now = new Date().toISOString();

		// 1. OPTIMISTIC UPDATE (instant UI feedback)
		const optimisticCards: StudentVipCards = {
			...data.ownedCards,
			[instanceId]: {
				...data.ownedCards[instanceId],
				activationRequestedAt: now,
				activationRequestedBy: data.studentId
			}
		};

		// Update both cache AND local state
		syncVipCards({ type: 'student' }, optimisticCards);
		data.ownedCards = optimisticCards;

		try {
			// 2. API CALL
			const response = await fetch('/api/vip-cards/request-activation', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					instanceId,
					studentId: data.studentId
				})
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "Erreur lors de la demande d'activation");
			}

			const result = await response.json();

			// 3. SUCCESS: Cache and local state already correct
			toaster.success(
				`Demande d'activation envoyee ! Ton enseignant recevra la demande pour : ${result.cardName}`
			);
		} catch (err) {
			// 4. ERROR: Rollback optimistic update
			syncVipCards({ type: 'student' }, currentVipCards);
			data.ownedCards = currentVipCards;

			const message = err instanceof Error ? err.message : 'Une erreur est survenue';
			console.error('[inventory] Error requesting activation:', err);
			toaster.error(message);
		}
	}
</script>

<svelte:head>
	<title>Mon Inventaire - UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
	<!-- Page Header -->
	<div class="space-y-2">
		<h1 class="text-3xl font-bold tracking-tight">Mon Inventaire</h1>
		<p class="text-muted-foreground">Tous tes objets et recompenses en un seul endroit</p>

		<!-- Collection Stats -->
		<div class="flex flex-wrap gap-3 pt-2">
			<Badge variant="default" class="gap-1.5 text-sm">
				<Trophy class="h-4 w-4" />
				{data.collectionStats.ownedCards} / {data.collectionStats.totalCards} cartes VIP
			</Badge>
			<Badge variant="secondary" class="gap-1.5 text-sm">
				<Sparkles class="h-4 w-4" />
				{data.collectionStats.historyCards} dans l'historique
			</Badge>
			<Badge variant="outline" class="gap-1.5 text-sm">
				<Lock class="h-4 w-4" />
				{data.collectionStats.neverObtainedCards} a decouvrir
			</Badge>
		</div>
	</div>

	<!-- VIP Cards Section -->
	<div class="space-y-8">
		{#each ['legendary', 'epic', 'rare', 'common'] as rarity (rarity)}
			{@const cards = collectionByRarity[rarity as RarityKey]}
			{@const config = rarityConfig[rarity as RarityKey]}

			{#if cards.length > 0}
				<section class="space-y-4">
					<!-- Rarity Section Header -->
					<div
						class={cn(
							'flex items-center gap-3 rounded-lg border p-4',
							config.bgColor,
							config.borderColor
						)}
					>
						<Gem class={cn('h-6 w-6', config.color)} />
						<h2 class={cn('text-2xl font-bold', config.color)}>
							{config.label}
						</h2>
						<Badge variant="outline" class={cn('ml-auto text-sm', config.color)}>
							{cards.length}
							{cards.length === 1 ? 'carte' : 'cartes'}
						</Badge>
					</div>

					<!-- Card Grid -->
					<div class="grid grid-cols-2 gap-8 sm:grid-cols-3 xl:grid-cols-3">
						{#each cards as { template, collectionStatus } (template.id)}
							{@const status = getCardStatus(collectionStatus)}
							{@const count = collectionStatus.ownedInstances.length}
							{@const hasAction = template.action !== null}
							{@const hasPendingRequest = collectionStatus.hasPendingRequest}

							<div class="relative">
								<!-- Card Container with Status Overlay -->
								<div
									class={cn(
										'relative transition-all duration-300',
										status === 'history' && 'opacity-70',
										status === 'never' && 'opacity-40 grayscale'
									)}
								>
									<VipCard
										card={{
											id: template.id,
											name: template.name,
											description: template.description,
											imagePath: template.image_path,
											category: template.category,
											rarity: template.rarity as VipCardRarity,
											action: template.action ?? undefined
										}}
										clickable={false}
										{count}
										size="sm"
										showUseButton={status === 'owned' && hasAction && !hasPendingRequest}
										{hasPendingRequest}
										onUse={() => handleUseCard(template.id)}
									/>

									<!-- Lock Icon for Never Obtained -->
									{#if status === 'never'}
										<div
											class="absolute top-0 left-0 z-10 flex h-48 w-32 items-center justify-center rounded-xl bg-black/30 backdrop-blur-[1px]"
										>
											<div class="rounded-full bg-black/50 p-3">
												<Lock class="h-8 w-8 text-white" />
											</div>
										</div>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</section>
			{/if}
		{/each}
	</div>
</div>
