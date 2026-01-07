<script lang="ts">
	import { replStore } from '$lib/stores/repl.svelte';
	import HistoryEntry from './HistoryEntry.svelte';
	import type { TabStyle } from '$lib/mathAST/cli/web';

	interface Props {
		variant: TabStyle;
	}

	let { variant }: Props = $props();

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
				<HistoryEntry {entry} {variant} />
			{/each}
		</div>
	{:else}
		<!-- Empty state with examples -->
		<div class="flex h-full min-h-[200px] items-center justify-center">
			<div class="max-w-md space-y-4 text-center">
				<div>
					<h3 class="text-lg font-semibold text-foreground">Bienvenue dans le REPL mathématique</h3>
					<p class="mt-1 text-sm text-muted-foreground">
						Console interactive pour le calcul symbolique
					</p>
				</div>

				<!-- Example commands -->
				<div class="space-y-2 rounded-lg border border-border bg-muted/50 p-4 text-left">
					<h4 class="text-sm font-medium text-foreground">Essayez ces exemples :</h4>
					<div class="space-y-1 text-xs">
						<div>
							<code class="rounded bg-background px-2 py-1 font-mono text-primary"
								>2x^2 + 3x - 5</code
							>
							<span class="ml-2 text-muted-foreground">Expression mathématique</span>
						</div>
						<div>
							<code class="rounded bg-background px-2 py-1 font-mono text-primary">.simplify</code>
							<span class="ml-2 text-muted-foreground">Simplifier l'expression précédente</span>
						</div>
						<div>
							<code class="rounded bg-background px-2 py-1 font-mono text-primary">.tree</code>
							<span class="ml-2 text-muted-foreground">Afficher l'arbre AST</span>
						</div>
						<div>
							<code class="rounded bg-background px-2 py-1 font-mono text-primary">.latex</code>
							<span class="ml-2 text-muted-foreground">Convertir en LaTeX</span>
						</div>
						<div>
							<code class="rounded bg-background px-2 py-1 font-mono text-primary">.help</code>
							<span class="ml-2 text-muted-foreground">Liste complète des commandes</span>
						</div>
					</div>
				</div>

				<!-- Keyboard hint -->
				<p class="text-xs text-muted-foreground">
					Utilisez <kbd
						class="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">↑</kbd
					>
					<kbd class="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-xs">↓</kbd>
					pour naviguer dans l'historique
				</p>
			</div>
		</div>
	{/if}
</div>
