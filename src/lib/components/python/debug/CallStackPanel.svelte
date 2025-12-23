<script lang="ts">
	/**
	 * Call Stack Panel Component
	 *
	 * Displays the call stack frames from bottom (oldest) to top (current).
	 * Allows clicking on frames to inspect their variables (future feature).
	 */

	// Imports
	import type { DebugStackFrame } from '$lib/shared/python/debug/types';
	import { cn } from '$lib/utils';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';

	// Types
	interface Props {
		/** Stack frames (first element is top of stack / current frame) */
		callStack: DebugStackFrame[];
		/** Callback when a frame is selected */
		onSelectFrame?: (index: number) => void;
		/** CSS class for the container */
		class?: string;
	}

	// Props
	let { callStack, onSelectFrame, class: className }: Props = $props();

	// Constants
	const MODULE_NAME = '<module>';
	const MODULE_LABEL = '<module principal>';

	// Derived state - reverse stack to show oldest at bottom, newest at top
	let reversedStack = $derived([...callStack].reverse());

	/**
	 * Format function name for display
	 */
	function formatFunctionName(name: string): string {
		if (name === MODULE_NAME) {
			return MODULE_LABEL;
		}
		return name + '()';
	}

	/**
	 * Handle frame click
	 */
	function handleFrameClick(originalIndex: number) {
		onSelectFrame?.(originalIndex);
	}
</script>

<div class={cn('flex flex-col gap-1', className)}>
	<h3 class="mb-2 text-sm font-medium text-foreground">Pile d'appels</h3>

	{#if callStack.length === 0}
		<p class="py-2 text-sm text-muted-foreground italic">Aucun appel</p>
	{:else}
		<div class="flex flex-col gap-0.5" aria-label="Pile d'appels">
			{#each reversedStack as frame, reversedIndex (`${frame.functionName}-${frame.lineNumber}-${reversedIndex}`)}
				{@const originalIndex = callStack.length - 1 - reversedIndex}
				<button
					type="button"
					onclick={() => handleFrameClick(originalIndex)}
					class={cn(
						'flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
						'hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
						frame.isCurrentFrame && 'bg-muted/80'
					)}
					aria-current={frame.isCurrentFrame ? 'true' : undefined}
				>
					<!-- Current frame indicator -->
					<span class="w-4 shrink-0" aria-hidden="true">
						{#if frame.isCurrentFrame}
							<ArrowRight class="size-4 text-primary" />
						{/if}
					</span>

					<!-- Function name -->
					<span
						class={cn(
							'flex-1 truncate font-mono',
							frame.isCurrentFrame ? 'font-semibold text-foreground' : 'text-muted-foreground'
						)}
					>
						{formatFunctionName(frame.functionName)}
					</span>

					<!-- Line number -->
					<span class="shrink-0 text-xs text-muted-foreground">
						ligne {frame.lineNumber}
					</span>
				</button>
			{/each}
		</div>

		<!-- Stack depth indicator -->
		<p class="mt-2 text-xs text-muted-foreground">
			Profondeur : {callStack.length} {callStack.length === 1 ? 'niveau' : 'niveaux'}
		</p>
	{/if}
</div>
