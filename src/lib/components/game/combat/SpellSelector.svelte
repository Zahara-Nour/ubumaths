<script lang="ts">
	import type { GameSpell } from '$lib/types/game';
	import { getSpellIconUrl } from '$lib/utils/game/assets';

	interface Props {
		spells: GameSpell[];
		selectedSpellNum: number | null;
		onselect: (spellNum: number) => void;
		disabled?: boolean;
	}

	let { spells, selectedSpellNum, onselect, disabled = false }: Props = $props();

	const elementEmojis = {
		fire: '🔥',
		water: '💧',
		earth: '🌍',
		wind: '💨'
	};

	const typeLabels = {
		attack: 'Attaque',
		heal: 'Soin',
		buff: 'Buff',
		debuff: 'Debuff'
	};
</script>

<div class="spell-selector space-y-3">
	<h3 class="text-lg font-bold text-foreground">Choisis ton sort</h3>

	<div class="grid grid-cols-2 gap-3 md:grid-cols-5">
		{#each spells as spell}
			<button
				class="spell-card group relative overflow-hidden rounded-lg border-2 bg-card p-3 text-left transition-all hover:scale-105 hover:shadow-md {selectedSpellNum ===
				spell.spell_num
					? 'border-primary'
					: 'border-border'}"
				onclick={() => onselect(spell.spell_num)}
				{disabled}
			>
				<!-- Spell Icon -->
				<div class="mb-2 flex items-center justify-center">
					<div class="h-16 w-16 rounded-full bg-muted p-2">
						<img
							src={getSpellIconUrl(spell.spell_num)}
							alt="Sort {spell.spell_num}"
							class="h-full w-full object-contain"
							loading="lazy"
						/>
					</div>
				</div>

				<!-- Spell Info -->
				<div class="space-y-1 text-center">
					<div class="flex items-center justify-center gap-1 text-xs">
						<span>{elementEmojis[spell.element]}</span>
						<span class="text-muted-foreground">{typeLabels[spell.type]}</span>
					</div>

					<div class="font-mono text-sm font-bold text-primary">
						{spell.power} PTS
					</div>

					<div class="text-xs text-muted-foreground">
						Niv. {spell.level}
					</div>
				</div>

				<!-- Selected Badge -->
				{#if selectedSpellNum === spell.spell_num}
					<div class="absolute right-1 top-1 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
						✓
					</div>
				{/if}
			</button>
		{/each}
	</div>
</div>
