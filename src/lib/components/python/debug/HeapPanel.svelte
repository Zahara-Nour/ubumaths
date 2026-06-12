<script lang="ts">
	/**
	 * Heap Panel — right side of the memory diagram.
	 *
	 * Renders one card per HeapObject: list / tuple / set / frozenset show
	 * indexed entries, dict and user-class instances show key→value pairs.
	 * Each card carries `data-heap-id` so MemoryDiagramView can attach arrows
	 * to it.
	 */

	import type { HeapObject, HeapEntry } from '$lib/shared/python/debug/types';
	import { cn } from '$lib/utils';
	import type { InlineValue, TruncatedValue } from '$lib/shared/python/debug/types';
	import {
		shortHeapId,
		colorForHeapId,
		formatInline,
		heapTypeLabel,
		isEntryRef
	} from './heap-utils';

	// Template narrowing helper: in the {:else} branch after {#if isEntryRef(entry)},
	// entry.value is guaranteed to be InlineValue | TruncatedValue (not HeapRef).
	function asInlineOrTruncated(v: unknown): InlineValue | TruncatedValue {
		return v as InlineValue | TruncatedValue;
	}

	interface Props {
		heap: HeapObject[];
		/** Hovered objectId (set by parent for cross-panel highlighting) */
		hoveredObjectId?: string | null;
		onObjectHover?: (objectId: string | null) => void;
		class?: string;
	}

	let { heap, hoveredObjectId = null, onObjectHover, class: className }: Props = $props();

	function entryKey(obj: HeapObject, entry: HeapEntry, index: number): string {
		if (entry.key !== undefined) return entry.key;
		if (obj.type === 'set' || obj.type === 'frozenset') return `•`;
		return `[${index}]`;
	}
</script>

<div class={cn('flex flex-col gap-2', className)}>
	<div class="border-b border-border pb-1">
		<h3 class="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
			Heap
			{#if heap.length > 0}
				<span class="text-muted-foreground/70">({heap.length})</span>
			{/if}
		</h3>
	</div>

	{#if heap.length === 0}
		<p class="py-2 text-sm text-muted-foreground italic">Aucun objet sur la heap</p>
	{:else}
		<div class="flex flex-col gap-3">
			{#each heap as obj (obj.id)}
				{@const color = colorForHeapId(obj.id)}
				{@const isHovered = obj.id === hoveredObjectId}
				<div
					data-heap-id={obj.id}
					aria-label={`Objet ${obj.type} ${shortHeapId(obj.id)}`}
					onmouseenter={() => onObjectHover?.(obj.id)}
					onmouseleave={() => onObjectHover?.(null)}
					role="group"
					class={cn(
						'rounded-lg border bg-card p-3 transition-shadow',
						color.bg,
						color.dark,
						isHovered && 'shadow-lg ring-2 ring-primary'
					)}
				>
					<!-- Header: type label + short id -->
					<div class="mb-2 flex items-center justify-between border-b border-border/50 pb-1.5">
						<span class={cn('font-mono text-sm font-semibold', color.text)}>
							{heapTypeLabel(obj)}
						</span>
						<span class="font-mono text-xs text-muted-foreground">{shortHeapId(obj.id)}</span>
					</div>

					<!-- Entries -->
					{#if obj.entries.length === 0}
						<p class="text-xs text-muted-foreground italic">vide</p>
					{:else}
						<div class="flex flex-col gap-1 font-mono text-xs">
							{#each obj.entries as entry, index (index)}
								<div class="flex items-baseline gap-2">
									<span class="min-w-[3ch] flex-shrink-0 text-muted-foreground">
										{entryKey(obj, entry, index)}
									</span>
									<span class="text-muted-foreground/70">→</span>
									{#if isEntryRef(entry)}
										{@const refColor = colorForHeapId(entry.value.objectId)}
										<span
											class={cn(
												'inline-flex items-center gap-1 rounded px-1.5 py-0.5',
												refColor.bg,
												refColor.text,
												refColor.dark
											)}
											data-heap-ref-internal={entry.value.objectId}
										>
											<span class={cn('h-1.5 w-1.5 rounded-full')} aria-hidden="true"></span>
											{shortHeapId(entry.value.objectId)}
										</span>
									{:else}
										<span class="text-foreground">{formatInline(asInlineOrTruncated(entry.value))}</span>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>
