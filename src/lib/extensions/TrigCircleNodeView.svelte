<!--
	Vue de nœud — le cercle trigonométrique.

	Ne porte que ce qui distingue ce type : son analyseur, son composant de rendu
	et son gabarit. L'enveloppe (aperçu, survol, dialogue, erreurs) vient de
	`FencedDslNodeView`, partagée avec l'autre bloc DSL.
-->
<script lang="ts">
	import FencedDslNodeView from './FencedDslNodeView.svelte';
	import TrigCircleRender from '$lib/components/markdown/nodes/TrigCircle.svelte';
	import { parseTrigCircleContent } from '$lib/ubumark/parser/trig-circle-parser';

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
	label="le cercle trigonométrique"
	parse={(texte) => parseTrigCircleContent(texte.split('\n'))}
	preview={TrigCircleRender}
	{selected}
	onSave={(texte) => updateAttributes({ content: texte })}
	onDelete={deleteNode}
/>
