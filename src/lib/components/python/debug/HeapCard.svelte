<script lang="ts">
	/**
	 * Single heap-object card — one node in the ELK-laid-out memory diagram.
	 * Extracted from HeapPanel so MemoryDiagramView can position each object
	 * individually. Renders at its natural size (measured for layout).
	 */

	import type {
		HeapObject,
		HeapEntry,
		InlineValue,
		TruncatedValue
	} from '$lib/shared/python/debug/types';
	import { cn } from '$lib/utils';
	import {
		shortHeapId,
		colorForHeapId,
		formatInline,
		heapTypeLabel,
		isEntryRef
	} from './heap-utils';

	interface Props {
		obj: HeapObject;
		highlighted?: boolean;
		onHover?: (objectId: string | null) => void;
	}

	let { obj, highlighted = false, onHover }: Props = $props();

	let color = $derived(colorForHeapId(obj.id));

	function asInlineOrTruncated(v: unknown): InlineValue | TruncatedValue {
		return v as InlineValue | TruncatedValue;
	}

	function entryKey(o: HeapObject, entry: HeapEntry, index: number): string {
		if (entry.key !== undefined) return entry.key;
		if (o.type === 'set' || o.type === 'frozenset') return '•';
		return `[${index}]`;
	}
</script>

<div
	data-heap-id={obj.id}
	aria-label={`Objet ${obj.type} ${shortHeapId(obj.id)}`}
	onmouseenter={() => onHover?.(obj.id)}
	onmouseleave={() => onHover?.(null)}
	role="group"
	class={cn(
		'w-max max-w-[16rem] rounded-lg border bg-card p-3 transition-shadow',
		color.bg,
		color.dark,
		highlighted && 'shadow-lg ring-2 ring-primary'
	)}
>
	<!-- Header: type label + short id -->
	<div class="mb-2 flex items-center justify-between gap-4 border-b border-border/50 pb-1.5">
		<span class={cn('font-mono text-sm font-semibold', color.text)}>{heapTypeLabel(obj)}</span>
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
						>
							<span class="h-1.5 w-1.5 rounded-full" aria-hidden="true"></span>
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
