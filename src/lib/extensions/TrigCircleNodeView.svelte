<!--
	Vue de nœud — le cercle trigonométrique.

	Ne porte que ce qui distingue ce type : son analyseur, son composant de rendu
	et son gabarit. L'enveloppe (aperçu, survol, dialogue, erreurs) vient de
	`FencedDslNodeView`, partagée avec l'autre bloc DSL.
-->
<script lang="ts">
	import type { Editor } from '@tiptap/core';
	import FencedDslNodeView from './FencedDslNodeView.svelte';
	import TrigCircleRender from '$lib/components/markdown/nodes/TrigCircle.svelte';
	import { parseTrigCircleContent } from '$lib/ubumark/parser/trig-circle-parser';

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
	label="le cercle trigonométrique"
	parse={(texte) => parseTrigCircleContent(texte.split('\n'))}
	preview={TrigCircleRender}
	{selected}
	onSave={(texte) => updateAttributes({ content: texte })}
	onDelete={deleteNode}
/>
