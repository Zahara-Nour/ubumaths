<script lang="ts">
	interface Props {
		playerName: string;
		level: number;
		currentHP: number;
		maxHP: number;
		avatarUrl?: string;
	}

	let { playerName, level, currentHP, maxHP, avatarUrl }: Props = $props();

	const hpPercentage = $derived((currentHP / maxHP) * 100);
	const isLowHP = $derived(hpPercentage < 30);
	const isCriticalHP = $derived(hpPercentage < 10);

	const hpColorClass = $derived.by(() => {
		if (isCriticalHP) return 'bg-destructive';
		if (isLowHP) return 'bg-yellow-500';
		return 'bg-green-500';
	});
</script>

<div class="player-panel rounded-lg border border-border bg-card p-4">
	<!-- Header -->
	<div class="mb-3 flex items-center gap-3">
		<!-- Avatar -->
		<div class="h-12 w-12 overflow-hidden rounded-full bg-muted">
			{#if avatarUrl}
				<img src={avatarUrl} alt={playerName} class="h-full w-full object-cover" />
			{:else}
				<div class="flex h-full w-full items-center justify-center text-2xl">👤</div>
			{/if}
		</div>

		<!-- Name & Level -->
		<div class="flex-1">
			<h3 class="font-bold text-card-foreground">{playerName}</h3>
			<p class="text-sm text-muted-foreground">Niveau {level}</p>
		</div>
	</div>

	<!-- HP Bar -->
	<div class="space-y-1">
		<div class="flex items-center justify-between text-sm">
			<span class="font-medium text-foreground">Points de vie</span>
			<span class="font-mono font-bold {isCriticalHP ? 'text-destructive' : 'text-foreground'}">
				{currentHP} / {maxHP}
			</span>
		</div>

		<div class="h-4 w-full overflow-hidden rounded-full bg-muted">
			<div
				class="h-full transition-all duration-300 {hpColorClass}"
				style="width: {hpPercentage}%"
				class:animate-pulse={isCriticalHP}
			></div>
		</div>
	</div>

	{#if isCriticalHP}
		<p class="mt-2 text-center text-sm font-medium text-destructive">⚠️ PV critiques !</p>
	{/if}
</div>

<style>
	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.7;
		}
	}

	.animate-pulse {
		animation: pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite;
	}
</style>
