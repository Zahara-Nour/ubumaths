<script lang="ts">
	import type { VipCardTemplate } from '$lib/stores/vipCardTemplates.svelte';
	import VipCardOverrideToggle from './VipCardOverrideToggle.svelte';
	import { rarityLabel } from './utils';

	interface Props {
		templates: VipCardTemplate[];
		overrides: Record<string, boolean>; // cardId -> isEnabled
		onChange: (cardId: string, enabled: boolean) => void;
	}

	let { templates, overrides, onChange }: Props = $props();

	const groupedByRarity = $derived(() => {
		const groups: Record<string, VipCardTemplate[]> = {
			common: [],
			rare: [],
			epic: [],
			legendary: []
		};

		templates.forEach((template) => {
			if (groups[template.rarity]) {
				groups[template.rarity].push(template);
			}
		});

		return groups;
	});
</script>

<div class="space-y-8">
	{#each Object.entries(groupedByRarity()) as [rarity, cards] (rarity)}
		{#if cards.length > 0}
			<div class="space-y-4">
				<h3 class="text-lg font-semibold">
					{rarityLabel(rarity)}
				</h3>

				<div class="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
					{#each cards as card (card.id)}
						<VipCardOverrideToggle
							{card}
							isEnabled={overrides[card.id] ?? card.is_enabled}
							onChange={(enabled) => onChange(card.id, enabled)}
						/>
					{/each}
				</div>
			</div>
		{/if}
	{/each}
</div>
