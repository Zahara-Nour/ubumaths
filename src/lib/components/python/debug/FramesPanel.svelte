<script lang="ts">
	/**
	 * Frames Panel — left side of the memory diagram.
	 *
	 * Shows each call stack frame and its variables. Variables that point to a
	 * heap object render a colored bullet (●) instead of an inline value, and
	 * carry a `data-heap-ref` attribute so MemoryDiagramView can attach an
	 * arrow to it. Variables holding a primitive show their value inline.
	 */

	import type { DebugStackFrame, DebugVariable } from '$lib/shared/python/debug/types';
	import * as Accordion from '$lib/components/ui/accordion';
	import { Badge } from '$lib/components/ui/badge';
	import { cn } from '$lib/utils';
	import { parseVariableValue, isHeapRef, formatInline, colorForHeapId } from './heap-utils';

	interface Props {
		callStack: DebugStackFrame[];
		/** Hovered objectId (set by parent for cross-panel highlighting) */
		hoveredObjectId?: string | null;
		onVariableHover?: (objectId: string | null) => void;
		class?: string;
	}

	let { callStack, hoveredObjectId = null, onVariableHover, class: className }: Props = $props();

	// Default-open all frames present at mount. New frames added later stay
	// closed; the user opens them as needed. Same UX as VariablesPanel.
	let openFrames = $state<string[]>(callStack.map((_, i) => `frame-${i}`));

	function frameLabel(name: string): string {
		return name === '<module>' ? '<module>' : `${name}()`;
	}

	function variableClass(variable: DebugVariable): string {
		if (variable.isNew) return 'bg-green-100 dark:bg-green-900/30';
		if (variable.isChanged) return 'bg-yellow-100 dark:bg-yellow-900/30';
		return '';
	}

	function rowAria(name: string, refId: string | null): string {
		return refId ? `Variable ${name}, pointe vers l'objet ${refId}` : `Variable ${name}`;
	}
</script>

<div class={cn('flex flex-col gap-2', className)}>
	<div class="border-b border-border pb-1">
		<h3 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Frames</h3>
	</div>

	{#if callStack.length === 0}
		<p class="py-2 text-sm text-muted-foreground italic">Aucune frame active</p>
	{:else}
		<Accordion.Root type="multiple" bind:value={openFrames}>
			{#each callStack as frame, frameIndex (frameIndex)}
				<Accordion.Item value={`frame-${frameIndex}`}>
					<Accordion.Trigger class="text-sm font-medium">
						<span class="font-mono">{frameLabel(frame.functionName)}</span>
						{#if frame.locals.length > 0}
							<Badge variant="secondary" class="ml-2">{frame.locals.length}</Badge>
						{/if}
						{#if frame.isCurrentFrame}
							<span class="ml-2 text-xs text-primary">(courante)</span>
						{/if}
					</Accordion.Trigger>
					<Accordion.Content aria-label={`Variables de la frame ${frame.functionName}`}>
						{#if frame.locals.length === 0}
							<p class="py-2 text-sm text-muted-foreground italic">Aucune variable</p>
						{:else}
							<div class="flex flex-col gap-1">
								{#each frame.locals as variable (variable.name)}
									{@const parsed = parseVariableValue(variable.value)}
									{@const refId = parsed && isHeapRef(parsed) ? parsed.objectId : null}
									{@const color = refId ? colorForHeapId(refId) : null}
									{@const isHovered = refId !== null && refId === hoveredObjectId}
									{#if refId}
										<button
											type="button"
											data-frame-var={variable.name}
											data-heap-ref={refId}
											aria-label={rowAria(variable.name, refId)}
											onmouseenter={() => onVariableHover?.(refId)}
											onmouseleave={() => onVariableHover?.(null)}
											onfocus={() => onVariableHover?.(refId)}
											onblur={() => onVariableHover?.(null)}
											class={cn(
												'flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors',
												'cursor-pointer hover:bg-accent',
												variableClass(variable),
												isHovered && 'ring-2 ring-primary ring-offset-1'
											)}
										>
											<span class="min-w-[80px] font-mono font-medium text-foreground">
												{variable.name}
											</span>
											<span class="flex-1 text-right">
												{#if color}
													<span
														class={cn(
															'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-xs',
															color.bg,
															color.text,
															color.dark
														)}
													>
														<span class={cn('h-2 w-2 rounded-full', color.bg)} aria-hidden="true"
														></span>
														→ {variable.type}
													</span>
												{/if}
											</span>
											{#if variable.isNew}
												<span
													class="text-xs text-green-600 dark:text-green-400"
													aria-label="Nouvelle variable"
												>
													nouveau
												</span>
											{:else if variable.isChanged}
												<span
													class="text-xs text-yellow-600 dark:text-yellow-400"
													aria-label="Variable modifiée"
												>
													modifié
												</span>
											{/if}
										</button>
									{:else}
										<div
											data-frame-var={variable.name}
											aria-label={rowAria(variable.name, null)}
											class={cn(
												'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
												variableClass(variable)
											)}
										>
											<span class="min-w-[80px] font-mono font-medium text-foreground">
												{variable.name}
											</span>
											<span class="flex-1 text-right">
												{#if parsed}
													<span class="font-mono text-muted-foreground">
														{formatInline(parsed as never)}
													</span>
												{:else}
													<!-- Fallback: raw value (older worker output) -->
													<span class="font-mono text-muted-foreground">{variable.value}</span>
												{/if}
											</span>
											{#if variable.isNew}
												<span
													class="text-xs text-green-600 dark:text-green-400"
													aria-label="Nouvelle variable"
												>
													nouveau
												</span>
											{:else if variable.isChanged}
												<span
													class="text-xs text-yellow-600 dark:text-yellow-400"
													aria-label="Variable modifiée"
												>
													modifié
												</span>
											{/if}
										</div>
									{/if}
								{/each}
							</div>
						{/if}
					</Accordion.Content>
				</Accordion.Item>
			{/each}
		</Accordion.Root>
	{/if}
</div>
