<script lang="ts">
	import type { GameMonster } from '$lib/types/game';
	import { getMonsterImageUrl } from '$lib/utils/game/assets';

	interface Props {
		monster: GameMonster;
		currentHP: number;
	}

	let { monster, currentHP }: Props = $props();

	const imageUrl = $derived(getMonsterImageUrl(monster.img_url));
	const hpPercentage = $derived((currentHP / monster.max_endurance) * 100);
	const isLowHP = $derived(hpPercentage < 30);
	let imageError = $state(false);

	const elementEmojis = {
		fire: '🔥',
		water: '💧',
		earth: '🌍',
		wind: '💨'
	};

	const categoryLabels = {
		common: 'Commun',
		elite: 'Élite',
		legendary: 'Légendaire'
	};

	const hpColorClass = $derived.by(() => {
		if (hpPercentage < 10) return 'bg-destructive';
		if (isLowHP) return 'bg-yellow-500';
		return 'bg-red-500';
	});
</script>

<div class="monster-panel rounded-lg border border-border bg-card p-4">
	<!-- Monster Image -->
	<div
		class="mb-3 flex aspect-video items-center justify-center overflow-hidden rounded-md bg-muted"
	>
		{#if imageError}
			<div class="text-6xl">{elementEmojis[monster.element]}</div>
		{:else}
			<img
				src={imageUrl}
				alt={monster.name}
				class="h-full w-full object-cover"
				onerror={() => (imageError = true)}
			/>
		{/if}
	</div>

	<!-- Monster Info -->
	<div class="mb-3 space-y-1">
		<div class="flex items-center justify-between">
			<h3 class="text-xl font-bold text-card-foreground">{monster.name}</h3>
			<span class="text-sm font-medium text-primary">Niv. {monster.level}</span>
		</div>

		<div class="flex items-center gap-4 text-sm text-muted-foreground">
			<span class="flex items-center gap-1">
				<span>{elementEmojis[monster.element]}</span>
				<span class="capitalize">{monster.element}</span>
			</span>
			<span>•</span>
			<span>{categoryLabels[monster.category]}</span>
		</div>
	</div>

	<!-- HP Bar -->
	<div class="space-y-1">
		<div class="flex items-center justify-between text-sm">
			<span class="font-medium text-foreground">Points de vie</span>
			<span class="font-mono font-bold">
				{currentHP} / {monster.max_endurance}
			</span>
		</div>

		<div class="h-4 w-full overflow-hidden rounded-full bg-muted">
			<div
				class="h-full transition-all duration-300 {hpColorClass}"
				style="width: {hpPercentage}%"
			></div>
		</div>
	</div>
</div>
