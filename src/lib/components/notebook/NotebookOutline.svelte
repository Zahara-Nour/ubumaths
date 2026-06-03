<script lang="ts">
	/**
	 * NotebookOutline — Collapsible sidebar listing the markdown headings.
	 *
	 * Reads `cells` and derives an outline via `extractOutline`. Indents each
	 * entry by depth (h1 / h2 / h3 → 0 / 12 / 24 px). Clicking an entry
	 * scrolls to the cell — the parent attaches `id="notebook-cell-<cellId>"`
	 * on each rendered cell, so we can use document.getElementById here
	 * without coupling to the Svelte tree.
	 *
	 * Renders nothing when no headings exist (no empty noisy sidebar).
	 */

	import type { NotebookCell } from '$lib/types/notebook';
	import { extractOutline } from '$lib/utils/notebook-outline';
	import { Button } from '$lib/components/ui/button';
	import { ListTree, X } from 'lucide-svelte';

	let {
		cells,
		open = $bindable(false),
		onJumpTo = undefined as ((cellId: string) => void) | undefined
	}: {
		cells: NotebookCell[];
		open?: boolean;
		onJumpTo?: (cellId: string) => void;
	} = $props();

	const entries = $derived(extractOutline(cells));

	function jumpTo(cellId: string): void {
		if (typeof document === 'undefined') return;
		const el = document.getElementById(`notebook-cell-${cellId}`);
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'start' });
		}
		// Inform the parent so it can also mark the cell active.
		onJumpTo?.(cellId);
	}
</script>

{#if open && entries.length > 0}
	<aside
		class="flex w-64 shrink-0 flex-col border-r border-border bg-muted/30"
		aria-label="Sommaire du notebook"
	>
		<!-- Header -->
		<div class="flex items-center justify-between border-b border-border px-3 py-2">
			<div
				class="flex items-center gap-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase"
			>
				<ListTree class="size-4" />
				Sommaire
			</div>
			<Button
				variant="ghost"
				size="icon"
				class="h-7 w-7"
				onclick={() => (open = false)}
				aria-label="Fermer le sommaire"
				title="Fermer"
			>
				<X class="size-4" />
			</Button>
		</div>

		<!-- Entries (scrollable) -->
		<nav class="flex-1 overflow-y-auto py-2">
			<ul class="space-y-0.5 px-1">
				{#each entries as entry, idx (idx)}
					<li>
						<button
							type="button"
							onclick={() => jumpTo(entry.cellId)}
							class="w-full rounded px-2 py-1.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
							style:padding-left="{8 + (entry.depth - 1) * 12}px"
							class:font-semibold={entry.depth === 1}
							class:text-foreground={entry.depth === 1}
							title={entry.text}
						>
							<span class="line-clamp-2">{entry.text}</span>
						</button>
					</li>
				{/each}
			</ul>
		</nav>
	</aside>
{/if}
