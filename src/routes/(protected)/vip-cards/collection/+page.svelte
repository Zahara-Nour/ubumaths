<!--
	VIP Cards Collection Page
	=========================

	Displays student's complete VIP card collection with:
	- All available card templates
	- Visual distinction between owned, history, and never-obtained cards
	- Filtering by name, rarity, status, and category
	- Collection statistics
	- Action buttons for owned cards with actions
-->

<script lang="ts">
	import type { PageData } from './$types';
	import VipCard from '$lib/components/VipCard.svelte';
	import MySelect from '$lib/components/MySelect.svelte';
	import { Input } from '$lib/components/ui/input';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import { Search, Lock, Trophy, Sparkles } from 'lucide-svelte';
	import { cn } from '$lib/utils';
	import type { VipCardRarity } from '$lib/types/vip-card';
	import type { CardCollectionStatus } from './+page.server';
	import { toaster } from '$lib/stores/toaster.svelte';

	let { data }: { data: PageData } = $props();

	// Filter state
	let searchQuery = $state('');
	let selectedRarity = $state<string>('all');
	let selectedStatus = $state<string>('all');
	let selectedCategory = $state<string>('all');

	// Extract unique categories from templates
	const categories = $derived(
		Array.from(new Set(data.templates.map((t) => t.category)))
			.filter(Boolean)
			.sort()
	);

	// Rarity options for filter
	const rarityOptions = [
		{ value: 'all', label: 'Toutes les raretés' },
		{ value: 'common', label: 'Commune' },
		{ value: 'rare', label: 'Rare' },
		{ value: 'epic', label: 'Épique' },
		{ value: 'legendary', label: 'Légendaire' }
	];

	// Status options for filter
	const statusOptions = [
		{ value: 'all', label: 'Toutes les cartes' },
		{ value: 'owned', label: 'Possédées' },
		{ value: 'history', label: 'Historique' },
		{ value: 'never', label: 'Jamais obtenues' }
	];

	// Category options for filter
	const categoryOptions = $derived([
		{ value: 'all', label: 'Toutes les catégories' },
		...categories.map((cat) => ({
			value: cat,
			label: getCategoryLabel(cat)
		}))
	]);

	/**
	 * Get human-readable label for category
	 */
	function getCategoryLabel(category: string): string {
		const labels: Record<string, string> = {
			bonus: 'Bonus',
			privilege: 'Privilège',
			social: 'Social',
			power: 'Pouvoir'
		};
		return labels[category] || category;
	}

	/**
	 * Get card status (owned, history, never)
	 */
	function getCardStatus(collectionStatus: CardCollectionStatus): 'owned' | 'history' | 'never' {
		if (collectionStatus.hasActiveInstance) return 'owned';
		if (collectionStatus.historyCount > 0) return 'history';
		return 'never';
	}

	/**
	 * Filtered collection data based on all filters
	 */
	const filteredCollection = $derived(() => {
		const lowerQuery = searchQuery.toLowerCase().trim();

		return data.templates
			.filter((template) => {
				const collectionStatus = data.collectionData?.[template.id];
				if (!collectionStatus) return false;

				// Search filter (name or description)
				if (lowerQuery) {
					const matchesName = template.name.toLowerCase().includes(lowerQuery);
					const matchesDescription = template.description.toLowerCase().includes(lowerQuery);
					if (!matchesName && !matchesDescription) return false;
				}

				// Rarity filter
				if (selectedRarity !== 'all' && template.rarity !== selectedRarity) {
					return false;
				}

				// Status filter
				if (selectedStatus !== 'all') {
					const status = getCardStatus(collectionStatus);
					if (status !== selectedStatus) return false;
				}

				// Category filter
				if (selectedCategory !== 'all' && template.category !== selectedCategory) {
					return false;
				}

				return true;
			})
			.map((template) => ({
				template,
				collectionStatus: data.collectionData![template.id]
			}));
	});

	/**
	 * Handle card use button click - request activation from teacher
	 */
	async function handleUseCard(cardId: string) {
		// Find the first unused instance of this card
		const instances = Object.entries(data.ownedCards).filter(
			([_, instance]) => instance.cardId === cardId && !instance.usedAt
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

		// Request activation from teacher
		try {
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
				toaster.error(error.message || "Erreur lors de la demande d'activation");
				return;
			}

			const result = await response.json();
			toaster.success(
				`Demande d'activation envoyée ! Ton enseignant recevra la demande pour : ${result.cardName}`
			);

			// Reload page data to update pending request status
			window.location.reload();
		} catch (err) {
			console.error('[collection] Error requesting activation:', err);
			toaster.error('Une erreur est survenue');
		}
	}

	/**
	 * Format date for display
	 */
	function formatDate(isoString: string): string {
		const date = new Date(isoString);
		return date.toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Ma Collection VIP - UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
	<!-- Page Header -->
	<div class="space-y-2">
		<h1 class="text-3xl font-bold tracking-tight">Ma Collection VIP</h1>
		<p class="text-muted-foreground">
			Découvre toutes les cartes VIP et consulte ta collection complète
		</p>

		<!-- Collection Stats -->
		<div class="flex flex-wrap gap-3 pt-2">
			<Badge variant="default" class="gap-1.5 text-sm">
				<Trophy class="h-4 w-4" />
				{data.collectionStats.ownedCards} / {data.collectionStats.totalCards} possédées
			</Badge>
			<Badge variant="secondary" class="gap-1.5 text-sm">
				<Sparkles class="h-4 w-4" />
				{data.collectionStats.historyCards} dans l'historique
			</Badge>
			<Badge variant="outline" class="gap-1.5 text-sm">
				<Lock class="h-4 w-4" />
				{data.collectionStats.neverObtainedCards} à découvrir
			</Badge>
		</div>
	</div>

	<!-- Filter Bar (Sticky) -->
	<div class="sticky top-16 z-10 rounded-lg border bg-card p-4 shadow-sm">
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
			<!-- Search Input -->
			<div class="relative sm:col-span-2 lg:col-span-1">
				<Search class="absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
				<Input
					type="text"
					placeholder="Rechercher une carte..."
					bind:value={searchQuery}
					class="pl-9"
				/>
			</div>

			<!-- Rarity Filter -->
			<MySelect type="single" bind:value={selectedRarity} items={rarityOptions} />

			<!-- Status Filter -->
			<MySelect type="single" bind:value={selectedStatus} items={statusOptions} />

			<!-- Category Filter -->
			<MySelect type="single" bind:value={selectedCategory} items={categoryOptions} />
		</div>
	</div>

	<!-- Card Grid -->
	{#if filteredCollection().length === 0}
		<!-- Empty State -->
		<div class="flex min-h-[400px] flex-col items-center justify-center space-y-4 text-center">
			<div class="rounded-full bg-muted p-6">
				<Search class="h-12 w-12 text-muted-foreground" />
			</div>
			<div class="space-y-2">
				<h3 class="text-xl font-semibold">Aucune carte trouvée</h3>
				<p class="text-muted-foreground">
					{#if searchQuery || selectedRarity !== 'all' || selectedStatus !== 'all' || selectedCategory !== 'all'}
						Essaie de modifier tes filtres pour voir plus de cartes
					{:else}
						Tu n'as pas encore de cartes VIP dans ta collection
					{/if}
				</p>
			</div>
		</div>
	{:else}
		<!-- Card Grid -->
		<div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each filteredCollection() as { template, collectionStatus } (template.id)}
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
							{count}
							size="md"
							showUseButton={status === 'owned' && hasAction && !hasPendingRequest}
							{hasPendingRequest}
							onUse={() => handleUseCard(template.id)}
						/>

						<!-- Status Badge Overlay -->
						<div class="absolute top-2 right-2 z-20 flex flex-col gap-1">
							{#if status === 'history'}
								<Badge variant="secondary" class="bg-amber-500/90 text-white backdrop-blur-sm">
									Utilisée
								</Badge>
							{:else if status === 'never'}
								<Badge variant="secondary" class="bg-gray-500/90 text-white backdrop-blur-sm">
									Non obtenue
								</Badge>
							{/if}
						</div>

						<!-- Lock Icon for Never Obtained -->
						{#if status === 'never'}
							<div
								class="absolute inset-0 z-10 flex items-center justify-center bg-black/30 backdrop-blur-[1px]"
							>
								<div class="rounded-full bg-black/50 p-4">
									<Lock class="h-12 w-12 text-white" />
								</div>
							</div>
						{/if}
					</div>

					<!-- Card Info Below (for history cards) -->
					{#if status === 'history' && collectionStatus.firstEarnedAt}
						<div class="mt-2 text-center text-xs text-muted-foreground">
							Obtenue le {formatDate(collectionStatus.firstEarnedAt)}
						</div>
					{/if}

					<!-- Card Info Below (for owned cards with multiple instances) -->
					{#if status === 'owned' && count > 1}
						<div class="mt-2 text-center text-xs text-muted-foreground">
							{count} exemplaires possédés
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<style>
	/* Ensure sticky filter bar doesn't overlap with navigation */
	.sticky {
		top: calc(4rem + 0.5rem); /* Adjust based on your nav height */
	}
</style>
