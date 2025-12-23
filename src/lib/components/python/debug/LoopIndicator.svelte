<script lang="ts">
	/**
	 * Loop Indicator Component
	 *
	 * Displays active loop iterations with progress bars when max iterations is known.
	 * Only renders when there are active loops.
	 */

	// Imports
	import type { DebugLoopInfo } from '$lib/shared/python/debug/types';
	import { Progress } from '$lib/components/ui/progress';
	import { cn } from '$lib/utils';
	import Repeat from '@lucide/svelte/icons/repeat';
	import RefreshCw from '@lucide/svelte/icons/refresh-cw';

	// Types
	interface Props {
		/** Active loops stack */
		loops: DebugLoopInfo[];
		/** CSS class for the container */
		class?: string;
	}

	// Props
	let { loops, class: className }: Props = $props();

	/**
	 * Calculate progress percentage for a loop
	 */
	function getProgressPercent(loop: DebugLoopInfo): number {
		if (!loop.maxIterations || loop.maxIterations === 0) {
			return 0;
		}
		return Math.min(100, (loop.iterationCount / loop.maxIterations) * 100);
	}

	/**
	 * Get loop type label in French
	 */
	function getLoopTypeLabel(loopType: 'for' | 'while'): string {
		return loopType === 'for' ? 'for' : 'while';
	}
</script>

{#if loops.length > 0}
	<div class={cn('flex flex-col gap-2 rounded-lg border border-border bg-muted/20 p-3', className)}>
		<h4 class="flex items-center gap-2 text-sm font-medium text-foreground">
			<Repeat class="size-4 text-muted-foreground" aria-hidden="true" />
			Boucles actives
		</h4>

		<div class="flex flex-col gap-2">
			{#each loops as loop (loop.loopId)}
				<div class="flex flex-col gap-1">
					<div class="flex items-center justify-between text-sm">
						<span class="flex items-center gap-1.5">
							{#if loop.loopType === 'for'}
								<Repeat class="size-3.5 text-blue-500" aria-hidden="true" />
							{:else}
								<RefreshCw class="size-3.5 text-orange-500" aria-hidden="true" />
							{/if}
							<span class="font-medium">
								Boucle {getLoopTypeLabel(loop.loopType)}
							</span>
							<span class="text-muted-foreground">
								(ligne {loop.lineNumber})
							</span>
						</span>

						<span class="font-mono text-muted-foreground">
							{#if loop.maxIterations}
								{loop.iterationCount}/{loop.maxIterations}
							{:else}
								itération {loop.iterationCount}
							{/if}
						</span>
					</div>

					{#if loop.maxIterations}
						<Progress
							value={getProgressPercent(loop)}
							max={100}
							class="h-1.5"
							aria-label="Progression de la boucle"
						/>
					{:else}
						<!-- Indeterminate progress for while loops without known max -->
						<div class="h-1.5 w-full overflow-hidden rounded-full bg-primary/20">
							<div
								class="h-full w-1/4 animate-pulse rounded-full bg-primary/60"
								style="animation-duration: 1.5s"
							></div>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	</div>
{/if}
