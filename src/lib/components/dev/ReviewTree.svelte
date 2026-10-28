<!--
	@component ReviewTree

	Arbre de la revue `/dev/modeles` : programme > branche > notion > sous-notion, avec à chaque
	étage le compte ✅ validé · 🔶 à revoir · ⚪ sans verdict. Chaque étage est un lien
	(`?noeud=<clé>`, filtres gardés) ; les étages au-dessus du nœud choisi restent ouverts.
-->
<script lang="ts">
	// Imports
	import { resolve } from '$app/paths';
	import type { ReviewNode } from '$lib/questions/template-review';
	import Self from './ReviewTree.svelte';

	// Types
	interface Props {
		nodes: ReviewNode[];
		/** Clés du chemin vers le nœud choisi (ouvertes d'office) */
		openKeys: ReadonlySet<string>;
		selectedKey: string | null;
		/** Recherche de l'adresse (`?noeud=…&…`) qui choisit ce nœud */
		queryFor: (key: string) => string;
		depth?: number;
	}

	// Variables
	let { nodes, openKeys, selectedKey, queryFor, depth = 0 }: Props = $props();

	let toggled = $state<Record<string, boolean>>({});

	// Functions
	function isOpen(key: string): boolean {
		return toggled[key] ?? openKeys.has(key);
	}
</script>

<ul class="space-y-0.5" class:ml-3={depth > 0}>
	{#each nodes as node (node.key)}
		<li>
			<div class="flex items-center gap-1">
				{#if node.children.length > 0}
					<button
						type="button"
						class="w-4 shrink-0 text-xs text-muted-foreground"
						aria-label="{isOpen(node.key) ? 'Replier' : 'Déplier'} {node.name}"
						aria-expanded={isOpen(node.key)}
						onclick={() => (toggled[node.key] = !isOpen(node.key))}
					>
						{isOpen(node.key) ? '▾' : '▸'}
					</button>
				{:else}
					<span class="w-4 shrink-0"></span>
				{/if}
				<a
					href="{resolve('/(protected)/dev/modeles')}{queryFor(node.key)}"
					class="flex min-w-0 flex-1 items-baseline justify-between gap-2 rounded px-1 py-0.5 text-sm hover:bg-muted"
					class:font-semibold={depth === 0}
					class:selected={node.key === selectedKey}
					aria-current={node.key === selectedKey ? 'page' : undefined}
				>
					<span class="truncate">{node.name}</span>
					<span class="shrink-0 font-mono text-xs whitespace-nowrap text-muted-foreground">
						{#if node.count.valide > 0}<span class="ok">✅{node.count.valide}</span>{/if}
						{#if node.count.aRevoir > 0}<span class="todo">🔶{node.count.aRevoir}</span>{/if}
						{#if node.count.none > 0}<span>⚪{node.count.none}</span>{/if}
					</span>
				</a>
			</div>
			{#if node.children.length > 0 && isOpen(node.key)}
				<Self nodes={node.children} {openKeys} {selectedKey} {queryFor} depth={depth + 1} />
			{/if}
		</li>
	{/each}
</ul>

<style>
	.selected {
		background: color-mix(in oklab, var(--color-primary) 15%, transparent);
	}
	.ok,
	.todo {
		margin-left: 0.25rem;
	}
</style>
