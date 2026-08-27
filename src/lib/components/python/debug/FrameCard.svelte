<script lang="ts">
	/**
	 * Single call-stack frame card — one node in the ELK-laid-out memory diagram.
	 * Extracted from FramesPanel so MemoryDiagramView can position each frame
	 * individually. Renders at its natural size (measured for layout).
	 */

	import type { DebugStackFrame, DebugVariable } from '$lib/shared/python/debug/types';
	import { Badge } from '$lib/components/ui/badge';
	import { cn } from '$lib/utils';
	import { parseVariableValue, isHeapRef, formatInline, colorForHeapId } from './heap-utils';

	interface Props {
		frame: DebugStackFrame;
		hoveredObjectId?: string | null;
		onVariableHover?: (objectId: string | null) => void;
	}

	let { frame, hoveredObjectId = null, onVariableHover }: Props = $props();

	function frameLabel(name: string): string {
		return name === '<module>' ? '<module>' : `${name}()`;
	}

	function variableClass(variable: DebugVariable): string {
		if (variable.isNew) return 'bg-green-100 dark:bg-green-900/30';
		if (variable.isChanged) return 'bg-yellow-100 dark:bg-yellow-900/30';
		return '';
	}
</script>

<div
	class={cn(
		'w-max max-w-[18rem] rounded-lg border bg-card p-3',
		frame.isCurrentFrame && 'ring-1 ring-primary'
	)}
>
	<!-- Header -->
	<div class="mb-2 flex items-center gap-2 border-b border-border/50 pb-1.5">
		<span class="font-mono text-sm font-medium">{frameLabel(frame.functionName)}</span>
		{#if frame.locals.length > 0}
			<Badge variant="secondary">{frame.locals.length}</Badge>
		{/if}
		{#if frame.isCurrentFrame}
			<span class="text-xs text-primary">(courante)</span>
		{/if}
	</div>

	<!-- Variables -->
	{#if frame.locals.length === 0}
		<p class="text-sm text-muted-foreground italic">Aucune variable</p>
	{:else}
		<div class="flex flex-col gap-1">
			{#each frame.locals as variable (variable.name)}
				{@const parsed = parseVariableValue(variable.value)}
				{@const refId = parsed && isHeapRef(parsed) ? parsed.objectId : null}
				{@const color = refId ? colorForHeapId(refId) : null}
				{@const isHovered = refId !== null && refId === hoveredObjectId}
				<div
					data-frame-var={variable.name}
					onmouseenter={() => refId && onVariableHover?.(refId)}
					onmouseleave={() => onVariableHover?.(null)}
					role="group"
					class={cn(
						'flex items-center gap-2 rounded-md px-2 py-1 text-sm transition-colors',
						variableClass(variable),
						isHovered && 'ring-2 ring-primary ring-offset-1'
					)}
				>
					<span class="min-w-[70px] font-mono font-medium text-foreground">{variable.name}</span>
					<span class="flex-1 text-right">
						{#if refId && color}
							<span
								class={cn(
									'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-xs',
									color.bg,
									color.text,
									color.dark
								)}
							>
								<span class="h-2 w-2 rounded-full" aria-hidden="true"></span>
								→ {variable.type}
							</span>
						{:else if parsed}
							<span class="font-mono text-muted-foreground">{formatInline(parsed as never)}</span>
						{:else}
							<span class="font-mono text-muted-foreground">{variable.value}</span>
						{/if}
					</span>
				</div>
			{/each}
		</div>
	{/if}
</div>
