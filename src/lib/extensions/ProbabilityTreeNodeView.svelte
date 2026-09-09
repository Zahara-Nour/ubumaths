<!--
	Vue de nœud — l’arbre de probabilité.

	Ne porte que ce qui distingue ce type : son analyseur, son composant de rendu
	et son gabarit. L'enveloppe (aperçu, survol, dialogue, erreurs) vient de
	`FencedDslNodeView`, partagée avec l'autre bloc DSL.
-->
<script lang="ts">
	import FencedDslNodeView from './FencedDslNodeView.svelte';
	import ProbabilityTreeRender from '$lib/components/markdown/nodes/ProbabilityTree.svelte';
	import { parseProbTreeContent } from '$lib/ubumark/parser/probability-tree-parser';

	// TipTap fournit six props ; on ne déclare QUE celles utilisées — `editor`,
	// `getPos` et `nodeSize` sont inutiles ici, et les déclarer sans s'en servir
	// est une erreur `svelte/no-unused-props`.
	//
	// `attrs` reste un `Record<string, unknown>` : le restreindre à `{ content:
	// string }` casserait l'affectation à `Component<NodeViewProps>`, les props
	// étant en position contravariante.
	interface Props {
		node: { attrs: Record<string, unknown> };
		updateAttributes: (attrs: Record<string, unknown>) => void;
		deleteNode: () => void;
		selected: boolean;
	}

	let { node, updateAttributes, deleteNode, selected }: Props = $props();
</script>

<FencedDslNodeView
	content={(node.attrs.content as string) ?? ''}
	label="l’arbre de probabilité"
	parse={(texte) => parseProbTreeContent(texte.split('\n'))}
	preview={ProbabilityTreeRender}
	{selected}
	onSave={(texte) => updateAttributes({ content: texte })}
	onDelete={deleteNode}
/>
