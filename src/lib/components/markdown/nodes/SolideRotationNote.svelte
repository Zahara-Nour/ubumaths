<!--
	SolideRotationNote — `tourner:` mal écrit ou pas encore pris en charge
	======================================================================

	Message pour l'AUTEUR (jamais pour l'élève) au-dessus d'un ```solide ou d'un
	```cubes dont la ligne `tourner:` ne peut pas être suivie : la figure se
	dessine quand même, fixe (chantier `solides-3d`, lots 2 et 6 ;
	`EspaceNode.rotationErrors`).

	@module components/markdown/nodes/SolideRotationNote
-->
<script lang="ts">
	import type { EspaceNode } from '#lib/ubumark/types/espace.ts';
	import { readAuthoringErrors } from '../authoring-errors';

	interface Props {
		node: EspaceNode;
		/** Forcer l'affichage ; sinon, contexte du renderer (élève par défaut) */
		showErrors?: boolean;
	}

	let { node, showErrors }: Props = $props();

	const authoring = readAuthoringErrors();
	let visible = $derived(showErrors ?? authoring());
	let messages = $derived(node.rotationErrors ?? []);
</script>

{#if visible && messages.length > 0}
	<div
		class="solide-rotation-note my-2 rounded-md border border-destructive p-3 text-sm text-foreground"
	>
		<p class="font-medium text-destructive">Bloc {node.genre} : la figure ne tournera pas</p>
		<ul class="mt-1 list-disc pl-5">
			{#each messages as message, i (i)}
				<li>{message}</li>
			{/each}
		</ul>
	</div>
{/if}
