<script lang="ts">
	/**
	 * « Rangé dans » : choix d'une notion ou d'une sous-notion de l'arbre
	 * ====================================================================
	 *
	 * Cascade branche → notion → sous-notion (ADR 0019, 0035). Tout est facultatif :
	 * `value` est l'identifiant de la sous-notion si elle est choisie, sinon celui
	 * de la notion, sinon `null` (modèle « Non rangé »). Une branche seule ne se
	 * range pas : elle ne fait que guider le choix de la notion.
	 */
	import MySelect from '$lib/components/MySelect.svelte';
	import {
		childrenOf,
		indexNodes,
		nodeIdOfSelection,
		placeOfNode,
		selectionOf,
		type CascadeSelection,
		type TreeNode
	} from '$lib/questions/classification-tree';

	// ============================================================================
	// Props
	// ============================================================================

	interface Props {
		/** Nœuds non archivés de l'arbre */
		nodes: TreeNode[];
		/** Nœud enregistré (notion ou sous-notion), `null` si non rangé */
		value?: string | null;
		disabled?: boolean;
	}

	let { nodes, value = $bindable(null), disabled = false }: Props = $props();

	// ============================================================================
	// Constantes
	// ============================================================================

	/** Valeur de l'option « aucun » (MySelect n'accepte pas `null`) */
	const NONE = '';

	// ============================================================================
	// État
	// ============================================================================

	const nodesById = $derived(indexNodes(nodes));

	// Choix de l'utilisateur, gardé tant qu'il correspond à `value` (une branche choisie seule
	// n'a pas de nœud à écrire : `value` reste `null` et la branche doit rester affichée).
	let choice = $state<CascadeSelection | null>(null);

	// Les trois niveaux affichés : le choix local s'il dit la même chose que `value`, sinon
	// `value` (changée de l'extérieur, par exemple au retour du mode JSON) fait foi.
	const selection = $derived<CascadeSelection>(
		choice && nodeIdOfSelection(choice) === (value ?? null) ? choice : selectionOf(value, nodesById)
	);

	const branchItems = $derived([
		{ value: NONE, label: 'Aucune branche' },
		...childrenOf(nodes, null, 'branch').map((n) => ({ value: n.id, label: n.name }))
	]);
	const notionItems = $derived([
		{ value: NONE, label: 'Aucune notion' },
		...(selection.branchId
			? childrenOf(nodes, selection.branchId, 'notion').map((n) => ({ value: n.id, label: n.name }))
			: [])
	]);
	const subnotionItems = $derived([
		{ value: NONE, label: 'Aucune sous-notion' },
		...(selection.notionId
			? childrenOf(nodes, selection.notionId, 'subnotion').map((n) => ({
					value: n.id,
					label: n.name
				}))
			: [])
	]);

	/** Nom annoncé d'un champ : son titre et la valeur choisie (le placeholder seul ne la dit pas) */
	function ariaLabel(title: string, id: string | null): string {
		return `${title} : ${(id && nodesById.get(id)?.name) || 'aucune'}`;
	}

	/** Valeur enregistrée mais absente de l'arbre lu (nœud archivé, par exemple) */
	const unknownValue = $derived(
		value !== null && value !== undefined && placeOfNode(value, nodesById) === null
	);

	// ============================================================================
	// Fonctions
	// ============================================================================

	function choose(next: CascadeSelection) {
		choice = next;
		value = nodeIdOfSelection(next);
	}

	function chooseBranch(id: string) {
		choose({ branchId: id || null, notionId: null, subnotionId: null });
	}

	function chooseNotion(id: string) {
		choose({ branchId: selection.branchId, notionId: id || null, subnotionId: null });
	}

	function chooseSubnotion(id: string) {
		choose({ ...selection, subnotionId: id || null });
	}
</script>

<div class="space-y-2">
	<div class="grid gap-3 md:grid-cols-3">
		<div class="space-y-1">
			<span class="text-xs text-muted-foreground">Branche</span>
			<MySelect
				items={branchItems}
				value={selection.branchId ?? NONE}
				onValueChange={chooseBranch}
				{disabled}
				placeholder="Branche"
				triggerAriaLabel={ariaLabel('Branche', selection.branchId)}
			/>
		</div>
		<div class="space-y-1">
			<span class="text-xs text-muted-foreground">Notion</span>
			<MySelect
				items={notionItems}
				value={selection.notionId ?? NONE}
				onValueChange={chooseNotion}
				disabled={disabled || !selection.branchId}
				placeholder="Notion"
				triggerAriaLabel={ariaLabel('Notion', selection.notionId)}
			/>
		</div>
		<div class="space-y-1">
			<span class="text-xs text-muted-foreground">Sous-notion (facultative)</span>
			<MySelect
				items={subnotionItems}
				value={selection.subnotionId ?? NONE}
				onValueChange={chooseSubnotion}
				disabled={disabled || !selection.notionId}
				placeholder="Sous-notion"
				triggerAriaLabel={ariaLabel('Sous-notion', selection.subnotionId)}
			/>
		</div>
	</div>
	{#if unknownValue}
		<p class="text-xs text-muted-foreground">
			Ce modèle est rangé dans un nœud qui n'est plus dans l'arbre (archivé ?). Choisir une notion
			le range ailleurs.
		</p>
	{/if}
</div>
