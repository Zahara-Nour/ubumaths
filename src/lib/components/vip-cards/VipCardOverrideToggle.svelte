<script lang="ts">
	import { Checkbox } from '$lib/components/ui/checkbox';
	import type { Database } from '$lib/types/database';
	import { rarityLabel, rarityBadgeClass, categoryIcon } from './utils';

	type VipCardTemplate = Database['public']['Tables']['vip_card_templates']['Row'];

	interface Props {
		card: VipCardTemplate;
		isEnabled: boolean;
		onChange: (enabled: boolean) => void;
	}

	let { card, isEnabled, onChange }: Props = $props();
</script>

<div class="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent/50">
	<Checkbox checked={isEnabled} onCheckedChange={(checked) => onChange(!!checked)} />

	{#if card.image_url}
		<img src={card.image_url} alt={card.name} class="h-16 w-16 rounded border object-cover" />
	{:else}
		<div class="flex h-16 w-16 items-center justify-center rounded border bg-muted text-2xl">
			{categoryIcon(card.category)}
		</div>
	{/if}

	<div class="min-w-0 flex-1">
		<p class="truncate font-medium">{card.name}</p>
		<span
			class="inline-block rounded-full border px-2 py-0.5 text-xs {rarityBadgeClass(card.rarity)}"
		>
			{rarityLabel(card.rarity)}
		</span>
	</div>
</div>
