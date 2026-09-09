<!--
	Vue de nœud — l’arbre de probabilité.

	Ne porte que ce qui distingue ce type : son analyseur, son composant de rendu
	et son gabarit. L'enveloppe (aperçu, survol, dialogue, erreurs) vient de
	`FencedDslNodeView`, partagée avec l'autre bloc DSL.
-->
<script lang="ts">
	import type { Editor } from '@tiptap/core';
	import FencedDslNodeView from './FencedDslNodeView.svelte';
	import ProbabilityTreeRender from '$lib/components/markdown/nodes/ProbabilityTree.svelte';
	import { parseProbTreeContent } from '$lib/ubumark/parser/probability-tree-parser';

	// Forme imposée par `SvelteNodeViewRenderer` : les six props sont fournies par
	// TipTap, même si cette vue n'en utilise que quatre.
	interface NodeViewProps {
		editor: Editor;
		node: { attrs: Record<string, unknown>; nodeSize: number };
		updateAttributes: (attrs: Record<string, unknown>) => void;
		deleteNode: () => void;
		getPos: () => number | undefined;
		selected: boolean;
	}

	let { node, updateAttributes, deleteNode, selected }: NodeViewProps = $props();
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
