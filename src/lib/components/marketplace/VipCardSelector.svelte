<script lang="ts">
	import type { VipCardWithLockStatus } from '$lib/types/marketplace';
	import type { Database } from '$lib/types/database';
	import { Badge } from '$lib/components/ui/badge';
	import { Lock, Check } from 'lucide-svelte';
	import { cn } from '$lib/utils';

	type VipCardTemplate = Database['public']['Tables']['vip_card_templates']['Row'];

	// Props
	let {
		cards = [],
		selectedCardIds = $bindable([]),
		mode = 'multiple',
		excludeLocked = true,
		maxSelection = null,
		studentId = null,
		showQuantity = true,
		compact = false,
		onselectionchange = null
	} = $props<{
		cards?: VipCardWithLockStatus[];
		selectedCardIds?: string[];
		mode?: 'single' | 'multiple';
		excludeLocked?: boolean;
		maxSelection?: number | null;
		studentId?: string | null;
		showQuantity?: boolean;
		compact?: boolean;
		onselectionchange?: ((selectedIds: string[]) => void) | null;
	}>();

	// Group cards by template for display
	let groupedCards = $derived(() => {
		const groups = new Map<
			string,
			{
				template: VipCardTemplate;
				cards: VipCardWithLockStatus[];
				availableCount: number;
			}
		>();

		for (const card of cards) {
			if (!card.template) continue;

			const templateId = card.template_id;
			if (!groups.has(templateId)) {
				groups.set(templateId, {
					template: card.template,
					cards: [],
					availableCount: 0
				});
			}

			const group = groups.get(templateId)!;
			group.cards.push(card);

			if (!card.is_locked || !excludeLocked) {
				group.availableCount++;
			}
		}

		return Array.from(groups.values()).sort((a, b) => {
			// Sort by rarity (legendary first) then by name
			const rarityOrder = { legendary: 0, epic: 1, rare: 2, common: 3 };
			const rarityDiff = rarityOrder[a.template.rarity] - rarityOrder[b.template.rarity];
			if (rarityDiff !== 0) return rarityDiff;
			return a.template.name.localeCompare(b.template.name);
		});
	});

	// Count selected cards per template
	let selectedCountPerTemplate = $derived(() => {
		const counts = new Map<string, number>();
		for (const cardId of selectedCardIds) {
			const card = cards.find((c) => c.id === cardId);
			if (card) {
				const count = counts.get(card.template_id) || 0;
				counts.set(card.template_id, count + 1);
			}
		}
		return counts;
	});

	// Toggle card selection
	function toggleCardSelection(templateId: string) {
		const group = groupedCards().find((g) => g.template.id === templateId);
		if (!group) return;

		// Find available cards from this template
		const availableCards = group.cards.filter((c) => !c.is_locked || !excludeLocked);
		if (availableCards.length === 0) return;

		// Get currently selected cards from this template
		const selectedFromTemplate = selectedCardIds.filter((id) => {
			const card = cards.find((c) => c.id === id);
			return card?.template_id === templateId;
		});

		if (selectedFromTemplate.length > 0) {
			// Deselect all cards from this template
			selectedCardIds = selectedCardIds.filter((id) => !selectedFromTemplate.includes(id));
		} else {
			// Select one (or all if multiple) card from this template
			if (mode === 'single') {
				selectedCardIds = [availableCards[0].id];
			} else {
				const toAdd = availableCards.slice(
					0,
					maxSelection ? maxSelection - selectedCardIds.length : undefined
				);
				selectedCardIds = [...selectedCardIds, ...toAdd.map((c) => c.id)];
			}
		}

		onselectionchange?.(selectedCardIds);
	}

	// Increase/decrease selection count for a template
	function adjustSelection(templateId: string, delta: number) {
		const group = groupedCards().find((g) => g.template.id === templateId);
		if (!group) return;

		const availableCards = group.cards.filter((c) => !c.is_locked || !excludeLocked);
		const currentCount = selectedCountPerTemplate().get(templateId) || 0;
		const newCount = Math.max(0, Math.min(availableCards.length, currentCount + delta));

		// Remove all current selections for this template
		const otherSelections = selectedCardIds.filter((id) => {
			const card = cards.find((c) => c.id === id);
			return card?.template_id !== templateId;
		});

		// Add the new count of selections
		const newSelections = availableCards.slice(0, newCount).map((c) => c.id);
		selectedCardIds = [...otherSelections, ...newSelections];

		onselectionchange?.(selectedCardIds);
	}

	// Get rarity badge variant
	function getRarityBadgeVariant(
		rarity: string
	): 'default' | 'secondary' | 'destructive' | 'outline' {
		switch (rarity) {
			case 'legendary':
				return 'default';
			case 'epic':
				return 'secondary';
			case 'rare':
				return 'secondary';
			case 'common':
				return 'outline';
			default:
				return 'outline';
		}
	}
</script>

<div class="space-y-2">
	{#if maxSelection && mode === 'multiple'}
		<div class="text-sm text-muted-foreground">
			Sélection: {selectedCardIds.length} / {maxSelection}
		</div>
	{/if}

	<div
		class={cn(
			'grid gap-2',
			compact
				? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
				: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
		)}
	>
		{#each groupedCards() as group (group.template_id)}
			{@const selectedCount = selectedCountPerTemplate().get(group.template.id) || 0}
			{@const isDisabled =
				group.availableCount === 0 ||
				(maxSelection && selectedCardIds.length >= maxSelection && selectedCount === 0)}

			<button
				type="button"
				onclick={() => toggleCardSelection(group.template.id)}
				disabled={isDisabled}
				class={cn(
					'relative rounded-lg border transition-all',
					compact ? 'p-2' : 'p-3',
					selectedCount > 0
						? 'border-primary bg-primary/5 ring-2 ring-primary'
						: 'hover:border-foreground/20',
					isDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
				)}
			>
				{#if compact}
					<!-- Compact view -->
					<div class="flex items-center gap-2">
						{#if group.template.image_path}
							<img
								src={group.template.image_path}
								alt={group.template.name}
								class="h-12 w-12 rounded object-cover"
							/>
						{:else}
							<div class="flex h-12 w-12 items-center justify-center rounded bg-muted text-lg">
								🎴
							</div>
						{/if}

						<div class="flex-1 text-left">
							<div class="line-clamp-1 text-xs font-medium">
								{group.template.name}
							</div>
							<div class="mt-1 flex items-center gap-1">
								<Badge
									variant={getRarityBadgeVariant(group.template.rarity)}
									class="px-1 py-0 text-xs"
								>
									{group.template.rarity}
								</Badge>
								{#if showQuantity}
									<span class="text-xs text-muted-foreground">
										x{group.availableCount}
									</span>
								{/if}
							</div>
						</div>

						{#if selectedCount > 0}
							<div
								class="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
							>
								{selectedCount}
							</div>
						{/if}
					</div>
				{:else}
					<!-- Full view -->
					<div class="space-y-2">
						{#if group.template.image_path}
							<img
								src={group.template.image_path}
								alt={group.template.name}
								class="h-32 w-full rounded object-cover"
							/>
						{:else}
							<div class="flex h-32 w-full items-center justify-center rounded bg-muted text-4xl">
								🎴
							</div>
						{/if}

						<div>
							<h4 class="line-clamp-1 text-sm font-medium">
								{group.template.name}
							</h4>
							<p class="mt-1 line-clamp-2 text-xs text-muted-foreground">
								{group.template.description}
							</p>
						</div>

						<div class="flex items-center justify-between">
							<Badge variant={getRarityBadgeVariant(group.template.rarity)} class="text-xs">
								{group.template.rarity}
							</Badge>
							{#if showQuantity}
								<span class="text-xs text-muted-foreground">
									Disponible: {group.availableCount}
								</span>
							{/if}
						</div>

						{#if mode === 'multiple' && group.availableCount > 1}
							<div class="mt-2 flex items-center justify-between">
								<button
									type="button"
									onclick={(e) => {
										e.stopPropagation();
										adjustSelection(group.template.id, -1);
									}}
									disabled={selectedCount === 0}
									class="h-6 w-6 rounded border text-xs font-bold hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
								>
									-
								</button>
								<span class="text-sm font-medium">
									{selectedCount} sélectionnée{selectedCount > 1 ? 's' : ''}
								</span>
								<button
									type="button"
									onclick={(e) => {
										e.stopPropagation();
										adjustSelection(group.template.id, 1);
									}}
									disabled={selectedCount >= group.availableCount ||
										(maxSelection && selectedCardIds.length >= maxSelection)}
									class="h-6 w-6 rounded border text-xs font-bold hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
								>
									+
								</button>
							</div>
						{/if}
					</div>
				{/if}

				{#if selectedCount > 0}
					<div class="absolute top-1 right-1">
						<Check class="h-4 w-4 text-primary" />
					</div>
				{/if}

				{#if group.cards.some((c) => c.is_locked) && excludeLocked}
					<div class="absolute top-1 left-1">
						<Lock class="h-3 w-3 text-muted-foreground" />
					</div>
				{/if}
			</button>
		{/each}
	</div>

	{#if groupedCards().length === 0}
		<div class="py-8 text-center text-muted-foreground">
			{#if studentId}
				Cet étudiant n'a pas de cartes VIP disponibles
			{:else}
				Aucune carte VIP disponible
			{/if}
		</div>
	{/if}
</div>
