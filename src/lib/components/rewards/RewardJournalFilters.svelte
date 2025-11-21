<!--
	RewardJournalFilters.svelte
	===========================

	Filter component for the reward journal.
	Displays chips/pills for filtering by reward_type.
	Mobile-friendly with horizontal scroll.
-->

<script lang="ts">
	import type { RewardType } from '$lib/types/reward-journal';
	import { cn } from '$lib/utils';
	import { Button } from '$lib/components/ui/button';
	import { Coins, Star, Crown, Trophy, Package, X } from 'lucide-svelte';

	// Props
	let {
		selectedType = $bindable<RewardType | null>(null),
		onFilterChange
	}: {
		selectedType?: RewardType | null;
		onFilterChange?: (type: RewardType | null) => void;
	} = $props();

	// Filter options with icons and labels
	const filterOptions: Array<{
		value: RewardType | null;
		label: string;
		icon: typeof Coins | null;
	}> = [
		{ value: null, label: 'Tout', icon: null },
		{ value: 'gidouilles', label: 'Gidouilles', icon: Coins },
		{ value: 'bonus', label: 'Bonus', icon: Star },
		{ value: 'vip_card', label: 'Cartes VIP', icon: Crown },
		{ value: 'achievement', label: 'Succ\u00e8s', icon: Trophy },
		{ value: 'item', label: 'Objets', icon: Package }
	];

	// Handle filter selection
	function handleSelect(type: RewardType | null) {
		selectedType = type;
		onFilterChange?.(type);
	}

	// Check if filters are active
	let hasActiveFilter = $derived(selectedType !== null);
</script>

<div class="relative">
	<!-- Filter chips container with horizontal scroll on mobile -->
	<div class="scrollbar-thin scrollbar-thumb-muted flex items-center gap-2 overflow-x-auto pb-2">
		{#each filterOptions as option (option.value)}
			{@const isSelected = selectedType === option.value}
			<Button
				variant={isSelected ? 'default' : 'outline'}
				size="sm"
				class={cn('shrink-0 gap-1.5 transition-all', isSelected && 'ring-2 ring-primary/20')}
				onclick={() => handleSelect(option.value)}
			>
				{#if option.icon}
					{@const IconComponent = option.icon}
					<IconComponent class="h-4 w-4" />
				{/if}
				{option.label}
			</Button>
		{/each}

		<!-- Clear filter button (only visible when filter is active) -->
		{#if hasActiveFilter}
			<Button
				variant="ghost"
				size="sm"
				class="shrink-0 gap-1.5 text-muted-foreground hover:text-foreground"
				onclick={() => handleSelect(null)}
			>
				<X class="h-4 w-4" />
				Effacer
			</Button>
		{/if}
	</div>

	<!-- Fade gradient for scroll indication (right side) -->
	<div
		class="pointer-events-none absolute top-0 right-0 h-full w-8 bg-gradient-to-l from-background to-transparent sm:hidden"
	></div>
</div>
