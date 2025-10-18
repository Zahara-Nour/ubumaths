<script lang="ts">
	import type { GameMonster } from '$lib/types/game';
	import { getMonsterImageUrl } from '$lib/utils/game/assets';

	interface Props {
		monster: GameMonster;
		onclick?: () => void;
		selectable?: boolean;
	}

	let { monster, onclick, selectable = false }: Props = $props();

	const imageUrl = $derived(getMonsterImageUrl(monster.img_url));
	let imageError = $state(false);

	const categoryColors = {
		common: 'border-gray-400',
		elite: 'border-blue-500',
		legendary: 'border-yellow-500'
	};

	const elementEmojis = {
		fire: '🔥',
		water: '💧',
		earth: '🌍',
		wind: '💨'
	};
</script>

<button
	class="monster-card group relative overflow-hidden rounded-lg border-2 bg-card transition-all {categoryColors[
		monster.category
	]} {selectable ? 'cursor-pointer hover:scale-105 hover:shadow-lg' : 'cursor-default'} {onclick
		? ''
		: 'pointer-events-none'}"
	{onclick}
	disabled={!onclick}
>
	<!-- Monster Image -->
	<div class="flex aspect-square items-center justify-center overflow-hidden bg-muted">
		{#if imageError}
			<div class="text-8xl">{elementEmojis[monster.element]}</div>
		{:else}
			<img
				src={imageUrl}
				alt={monster.name}
				class="h-full w-full object-cover transition-transform group-hover:scale-110"
				loading="lazy"
				onerror={() => (imageError = true)}
			/>
		{/if}
	</div>

	<!-- Monster Info -->
	<div class="space-y-2 p-3">
		<!-- Name & Level -->
		<div class="flex items-center justify-between">
			<h3 class="font-bold text-card-foreground">{monster.name}</h3>
			<span class="text-sm font-medium text-primary">Niv. {monster.level}</span>
		</div>

		<!-- Element & Category -->
		<div class="flex items-center justify-between text-sm">
			<span class="flex items-center gap-1">
				<span>{elementEmojis[monster.element]}</span>
				<span class="text-muted-foreground capitalize">{monster.element}</span>
			</span>
			<span class="text-muted-foreground capitalize">{monster.category}</span>
		</div>

		<!-- HP -->
		<div class="flex items-center justify-between text-sm">
			<span class="text-muted-foreground">PV :</span>
			<span class="font-mono font-medium">{monster.max_endurance}</span>
		</div>
	</div>

	<!-- Legendary Badge -->
	{#if monster.category === 'legendary'}
		<div class="absolute top-2 right-2 rounded-full bg-yellow-500 px-2 py-1 text-xs font-bold">
			⭐ LÉGENDAIRE
		</div>
	{/if}
</button>
