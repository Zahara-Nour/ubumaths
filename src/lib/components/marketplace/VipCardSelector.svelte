<script lang="ts">
	import type { VipCardWithLockStatus } from '$lib/types/marketplace';
	import type { Database } from '$lib/types/database';
	import type { VipCard } from '$lib/types/vip-card';
	import { Badge } from '$lib/components/ui/badge';
	import { Lock, Check } from 'lucide-svelte';
	import { cn } from '$lib/utils';
	import VipCardHolo from '$lib/components/VipCardHolo.svelte';
	import { RARITY_COLORS, RARITY_LABELS } from '$lib/constants/vip-card-ui';

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
	let groupedCards = $derived.by(() => {
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
			const rarityOrder: Record<string, number> = { legendary: 0, epic: 1, rare: 2, common: 3 };
			const rarityDiff = rarityOrder[a.template.rarity] - rarityOrder[b.template.rarity];
			if (rarityDiff !== 0) return rarityDiff;
			return a.template.name.localeCompare(b.template.name);
		});
	});

	// Count selected cards per template
	let selectedCountPerTemplate = $derived.by(() => {
		const counts = new Map<string, number>();
		for (const cardId of selectedCardIds) {
			const card = cards.find((c: { id: string; template_id: string }) => c.id === cardId);
			if (card) {
				const count = counts.get(card.template_id) || 0;
				counts.set(card.template_id, count + 1);
			}
		}
		return counts;
	});

	// Toggle card selection
	function toggleCardSelection(templateId: string) {
		const group = groupedCards.find((g) => g.template.id === templateId);
		if (!group) return;

		// Find available cards from this template
		const availableCards = group.cards.filter((c) => !c.is_locked || !excludeLocked);
		if (availableCards.length === 0) return;

		// Get currently selected cards from this template
		const selectedFromTemplate = selectedCardIds.filter((id: string) => {
			const card = cards.find((c: { id: string; template_id: string }) => c.id === id);
			return card?.template_id === templateId;
		});

		if (selectedFromTemplate.length > 0) {
			// Deselect all cards from this template
			selectedCardIds = selectedCardIds.filter((id: string) => !selectedFromTemplate.includes(id));
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
		const group = groupedCards.find((g) => g.template.id === templateId);
		if (!group) return;

		const availableCards = group.cards.filter((c) => !c.is_locked || !excludeLocked);
		const currentCount = selectedCountPerTemplate.get(templateId) || 0;
		const newCount = Math.max(0, Math.min(availableCards.length, currentCount + delta));

		// Remove all current selections for this template
		const otherSelections = selectedCardIds.filter((id: string) => {
			const card = cards.find((c: { id: string; template_id: string }) => c.id === id);
			return card?.template_id !== templateId;
		});

		// Add the new count of selections
		const newSelections = availableCards.slice(0, newCount).map((c) => c.id);
		selectedCardIds = [...otherSelections, ...newSelections];

		onselectionchange?.(selectedCardIds);
	}

	// Convert template to VipCard format for VipCardHolo
	function templateToVipCard(template: VipCardTemplate): VipCard {
		return {
			id: template.id,
			name: template.name,
			description: template.description,
			imagePath: template.image_path ?? undefined,
			rarity: template.rarity as VipCard['rarity'],
			category: template.category as VipCard['category']
		};
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
		{#each groupedCards as group (group.template.id)}
			{@const selectedCount = selectedCountPerTemplate.get(group.template.id) || 0}
			{@const isDisabled =
				group.availableCount === 0 ||
				(maxSelection && selectedCardIds.length >= maxSelection && selectedCount === 0)}

			<div
				role="button"
				tabindex={isDisabled ? -1 : 0}
				onclick={() => !isDisabled && toggleCardSelection(group.template.id)}
				onkeydown={(e) => {
					if ((e.key === 'Enter' || e.key === ' ') && !isDisabled) {
						e.preventDefault();
						toggleCardSelection(group.template.id);
					}
				}}
				aria-disabled={isDisabled}
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
					<!-- Compact view with VipCardHolo -->
					<div class="flex flex-col items-center gap-2">
						<div class="w-16">
							<VipCardHolo
								card={templateToVipCard(group.template)}
								count={showQuantity ? group.availableCount : 1}
								enableDescriptionOverlay={false}
								enableRarityIndicator={true}
								enablePopover={false}
								enable3d={true}
								enableHoloEffect={true}
							/>
						</div>
						<div class="text-center">
							<div class="line-clamp-1 text-xs font-medium">
								{group.template.name}
							</div>
							<Badge
								variant="outline"
								class="mt-1 border {RARITY_COLORS[
									group.template.rarity as keyof typeof RARITY_COLORS
								]} text-xs"
							>
								{RARITY_LABELS[group.template.rarity as keyof typeof RARITY_LABELS]}
							</Badge>
						</div>
					</div>
				{:else}
					<!-- Full view with VipCardHolo -->
					<div class="flex flex-col items-center gap-3">
						<div class="w-24">
							<VipCardHolo
								card={templateToVipCard(group.template)}
								count={showQuantity ? group.availableCount : 1}
								enableDescriptionOverlay={true}
								enableRarityIndicator={true}
								enablePopover={false}
								enable3d={true}
								enableHoloEffect={true}
							/>
						</div>

						<div class="w-full text-center">
							<h4 class="line-clamp-1 text-sm font-medium">
								{group.template.name}
							</h4>
							<Badge
								variant="outline"
								class="mt-1 border {RARITY_COLORS[
									group.template.rarity as keyof typeof RARITY_COLORS
								]} text-xs"
							>
								{RARITY_LABELS[group.template.rarity as keyof typeof RARITY_LABELS]}
							</Badge>
							{#if showQuantity}
								<p class="mt-1 text-xs text-muted-foreground">
									{group.availableCount} disponible{group.availableCount > 1 ? 's' : ''}
								</p>
							{/if}
						</div>

						{#if mode === 'multiple' && group.availableCount > 1}
							<div class="flex w-full items-center justify-between">
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
			</div>
		{/each}
	</div>

	{#if groupedCards.length === 0}
		<div class="py-8 text-center text-muted-foreground">
			{#if studentId}
				Cet étudiant n'a pas de cartes VIP disponibles
			{:else}
				Aucune carte VIP disponible
			{/if}
		</div>
	{/if}
</div>
