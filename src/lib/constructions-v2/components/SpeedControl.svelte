<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { cn } from '$lib/utils';
	import { Minus, Plus } from 'lucide-svelte';
	import { formatPlaybackRate } from '../core/timeline.svelte';
	import type { TimelineState } from '../core/timeline.svelte';

	interface Props {
		tl: TimelineState;
		onSetRate: (rate: number) => void;
		onSpeedUp: () => void;
		onSlowDown: () => void;
		onResetSpeed: () => void;
		class?: string;
		mode?: 'buttons' | 'compact';
		disabled?: boolean;
	}

	let {
		tl,
		onSetRate,
		onSpeedUp,
		onSlowDown,
		onResetSpeed,
		class: className = '',
		mode = 'buttons',
		disabled = false
	}: Props = $props();

	const presets = [0.5, 1, 1.5, 2];
</script>

{#if mode === 'buttons'}
	<div class={cn('flex items-center gap-1', className)}>
		{#each presets as rate (rate)}
			<Button
				variant={tl.playbackRate === rate ? 'default' : 'ghost'}
				size="sm"
				class="h-7 px-2 text-xs"
				onclick={() => onSetRate(rate)}
				{disabled}
			>
				{formatPlaybackRate(rate)}
			</Button>
		{/each}
	</div>
{:else}
	<div class={cn('flex items-center gap-1', className)}>
		<Button variant="ghost" size="icon" class="h-7 w-7" onclick={onSlowDown} {disabled}>
			<Minus class="h-3 w-3" />
		</Button>
		<button class="min-w-[3rem] text-center text-xs font-medium" onclick={onResetSpeed} {disabled}>
			{formatPlaybackRate(tl.playbackRate)}
		</button>
		<Button variant="ghost" size="icon" class="h-7 w-7" onclick={onSpeedUp} {disabled}>
			<Plus class="h-3 w-3" />
		</Button>
	</div>
{/if}
