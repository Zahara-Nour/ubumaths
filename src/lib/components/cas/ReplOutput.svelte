<script lang="ts">
	import { replStore } from '$lib/stores/repl.svelte';
	import HistoryEntry from './HistoryEntry.svelte';
	import type { TabStyle, ReplHistoryEntry } from '$lib/mathAST/cli/web';

	interface Props {
		variant: TabStyle;
		onShowAst?: (entry: ReplHistoryEntry) => void;
	}

	let { variant, onShowAst }: Props = $props();

	let outputContainer: HTMLDivElement | undefined = $state();

	/**
	 * Scroll to bottom when new history entries are added.
	 */
	$effect(() => {
		// Track history length to trigger scroll on new entries
		const count = replStore.historyCount;

		if (outputContainer && count > 0) {
			// Use requestAnimationFrame to ensure DOM is updated
			requestAnimationFrame(() => {
				if (outputContainer) {
					outputContainer.scrollTop = outputContainer.scrollHeight;
				}
			});
		}
	});
</script>

<div
	bind:this={outputContainer}
	class="max-h-[400px] overflow-y-auto p-4"
	role="log"
	aria-live="polite"
	aria-label="Historique des calculs"
>
	{#if replStore.hasHistory}
		<div class="space-y-4">
			<!-- Display history in reverse order (newest first from store, but oldest first visually) -->
			{#each [...replStore.history].reverse() as entry (entry.id)}
				<HistoryEntry {entry} {variant} {onShowAst} />
			{/each}
		</div>
	{:else}
		<!-- Empty state -->
		<div class="flex h-full min-h-[200px] items-center justify-center">
			<div class="text-center text-muted-foreground">
				<p class="mb-2 text-sm">Aucun historique</p>
				<p class="text-xs">Entrez une expression pour commencer</p>
			</div>
		</div>
	{/if}
</div>
