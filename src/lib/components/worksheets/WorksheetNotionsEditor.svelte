<script lang="ts">
	/**
	 * Notions d'une fiche (ADR 0041)
	 * ==============================
	 *
	 * De quoi parle la fiche : notions ou sous-notions de l'arbre, dans l'ordre
	 * d'impression (« Suites · Dérivation »).
	 * - une seule notion (`several` faux : Entraînement technique, Applications,
	 *   fiche sans catégorie) : le sélecteur choisit LA notion ;
	 * - plusieurs (`several` vrai : Révisions, Automatismes, autres types) : la
	 *   liste, un bouton pour ajouter la notion choisie, un pour retirer chacune.
	 * Trop de notions pour une catégorie à une notion (catégorie changée) : la
	 * liste reste, avec la consigne de retirer les notions en trop.
	 */
	import { X } from '@lucide/svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import ClassificationNodePicker from '#lib/components/questions/ClassificationNodePicker.svelte';
	import { indexNodes, type TreeNode } from '#lib/questions/classification-tree.ts';
	import type { WorksheetClassificationView } from '#lib/types/worksheets.ts';

	// ============================================================================
	// Props
	// ============================================================================

	interface Props {
		/** Nœuds non archivés de l'arbre */
		nodes: TreeNode[];
		/** Notions de la fiche, dans l'ordre d'impression */
		value: WorksheetClassificationView[];
		/** Plusieurs notions possibles (`allowsSeveralNotions`) */
		several: boolean;
		disabled?: boolean;
		onchange: (value: WorksheetClassificationView[]) => void;
	}

	let { nodes, value, several, disabled = false, onchange }: Props = $props();

	// ============================================================================
	// État
	// ============================================================================

	const nodesById = $derived(indexNodes(nodes));

	/** La notion choisie, à ajouter à la liste (plusieurs notions) */
	let picked = $state<string | null>(null);

	/** La liste s'affiche dès qu'il y a plusieurs notions, même en trop */
	const showList = $derived(several || value.length > 1);
	const tooMany = $derived(!several && value.length > 1);
	const canAdd = $derived(picked !== null && !value.some((n) => n.node_id === picked));

	// ============================================================================
	// Fonctions
	// ============================================================================

	/** Positions 0, 1, 2… dans l'ordre de la liste */
	function renumbered(list: WorksheetClassificationView[]): WorksheetClassificationView[] {
		return list.map((notion, position) => ({ ...notion, position }));
	}

	function viewOf(nodeId: string, position: number): WorksheetClassificationView {
		const node = nodesById.get(nodeId);
		return { node_id: nodeId, name: node?.name ?? '', kind: node?.kind, position };
	}

	/** Une seule notion : le sélecteur la remplace (aucune : liste vide) */
	function chooseSingle(nodeId: string | null) {
		if ((nodeId ?? null) === (value[0]?.node_id ?? null)) return;
		onchange(nodeId ? [viewOf(nodeId, 0)] : []);
	}

	function add() {
		if (!picked || !canAdd) return;
		onchange([...value, viewOf(picked, value.length)]);
		picked = null;
	}

	function remove(nodeId: string) {
		onchange(renumbered(value.filter((notion) => notion.node_id !== nodeId)));
	}
</script>

<div class="space-y-2">
	{#if showList}
		{#if value.length > 0}
			<ul class="flex flex-wrap gap-1.5">
				{#each value as notion (notion.node_id)}
					<li
						class="flex items-center gap-1 rounded-full border bg-muted/40 py-0.5 pr-1 pl-2.5 text-sm"
					>
						<span>{notion.name}</span>
						<button
							type="button"
							class="rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
							aria-label="Retirer {notion.name}"
							onclick={() => remove(notion.node_id)}
							{disabled}
						>
							<X class="h-3.5 w-3.5" />
						</button>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="text-sm text-muted-foreground">Aucune notion</p>
		{/if}

		{#if tooMany}
			<p class="text-xs text-destructive">
				Cette catégorie n'admet qu'une seule notion : retire les notions en trop.
			</p>
		{:else}
			<ClassificationNodePicker {nodes} bind:value={picked} {disabled} />
			<Button
				type="button"
				size="sm"
				variant="outline"
				onclick={add}
				disabled={disabled || !canAdd}
			>
				Ajouter la notion
			</Button>
		{/if}
	{:else}
		<ClassificationNodePicker
			{nodes}
			bind:value={() => value[0]?.node_id ?? null, chooseSingle}
			{disabled}
		/>
	{/if}
</div>
