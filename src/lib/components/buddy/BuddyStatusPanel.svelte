<!--
	BuddyStatusPanel
	==================
	Panel shown when clicking/tapping the buddy.
	Displays: XP progress bar, level, streak, change button.
-->

<script lang="ts">
	import type { BuddyState } from '$lib/types/buddy';
	import { xpProgress, MAX_LEVEL } from '$lib/utils/buddy-xp';
	import { Progress } from '$lib/components/ui/progress';
	import { Button } from '$lib/components/ui/button';
	import { Flame, Star, ArrowRightLeft, X } from 'lucide-svelte';
	import { fade } from 'svelte/transition';

	interface Props {
		buddy: BuddyState;
		onClose: () => void;
		onChangePalotin: () => void;
	}

	let { buddy, onClose, onChangePalotin }: Props = $props();

	const palotinNames: Record<string, string> = {
		giron: 'Giron',
		pile: 'Pile',
		cotice: 'Cotice'
	};

	const progress = $derived(xpProgress(buddy.xp, buddy.level));
	const progressPercent = $derived(
		progress.needed > 0 ? Math.round((progress.current / progress.needed) * 100) : 100
	);
	const isMaxLevel = $derived(buddy.level >= MAX_LEVEL);
</script>

<div
	class="absolute right-0 bottom-full mb-2 w-64 rounded-lg bg-popover p-4 shadow-xl ring-1 ring-border"
	transition:fade={{ duration: 150 }}
>
	<!-- Header -->
	<div class="mb-3 flex items-center justify-between">
		<h3 class="text-sm font-semibold">{palotinNames[buddy.palotin_type]}</h3>
		<button
			type="button"
			onclick={onClose}
			class="rounded p-0.5 text-muted-foreground hover:text-foreground"
		>
			<X class="h-4 w-4" />
		</button>
	</div>

	<!-- Level & XP -->
	<div class="mb-3">
		<div class="mb-1 flex items-center justify-between text-xs text-muted-foreground">
			<span class="flex items-center gap-1">
				<Star class="h-3 w-3" />
				Niveau {buddy.level}
			</span>
			{#if !isMaxLevel}
				<span>{progress.current} / {progress.needed} XP</span>
			{:else}
				<span>Niveau max !</span>
			{/if}
		</div>
		<Progress value={progressPercent} class="h-2" />
	</div>

	<!-- Streak -->
	<div class="mb-3 flex items-center gap-2 text-sm">
		<Flame class="h-4 w-4 text-orange-500" />
		<span>
			{#if buddy.current_streak > 0}
				Serie de {buddy.current_streak} jour{buddy.current_streak > 1 ? 's' : ''}
			{:else}
				Pas de serie en cours
			{/if}
		</span>
	</div>

	{#if buddy.longest_streak > 0}
		<div class="mb-3 text-xs text-muted-foreground">
			Record : {buddy.longest_streak} jour{buddy.longest_streak > 1 ? 's' : ''}
		</div>
	{/if}

	<!-- Change Palotin button -->
	<Button variant="outline" size="sm" class="w-full" onclick={onChangePalotin}>
		<ArrowRightLeft class="mr-2 h-3 w-3" />
		Changer de Palotin
	</Button>
</div>
