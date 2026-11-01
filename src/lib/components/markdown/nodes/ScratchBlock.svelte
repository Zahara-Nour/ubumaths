<!--
	ScratchBlock — bloc ```scratch
	==============================

	Programme dessiné en blocs Scratch 3 (chantier `bloc-scratch`).

	Composant LÉGER, dans le chunk des pages Markdown : la vérification et le
	dessin (`scratchblocks`) sont chargés À LA DEMANDE, dans le navigateur
	seulement (le dessin mesure le texte avec un canvas). Avant, et au rendu
	serveur : le programme en texte, lisible.

	- Bloc en erreur (vide, non fermé, instruction non reconnue) : messages
	  situés pour le prof, cadre « Programme indisponible » pour l'élève.
	- Nom accessible : le texte du programme.
	- Les blocs gardent les couleurs de Scratch quel que soit le thème.

	@module components/markdown/nodes/ScratchBlock
-->
<script lang="ts">
	import { browser } from '$app/environment';
	import type { ScratchNode } from '$lib/ubumark/types/scratch';
	import { SCRATCH_UNAVAILABLE } from '$lib/ubumark/types/scratch';
	import { readAuthoringErrors } from '../authoring-errors';

	interface Props {
		node: ScratchNode;
		/** Forcer l'affichage des erreurs d'auteur ; sinon, contexte du renderer (élève par défaut) */
		showErrors?: boolean;
		class?: string;
	}

	let { node, showErrors, class: className = '' }: Props = $props();

	const authoring = readAuthoringErrors();
	let errorsVisible = $derived(showErrors ?? authoring());

	/** Le programme en une ligne, pour un lecteur d'écran */
	let accessibleName = $derived(
		`Programme Scratch : ${node.source
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line !== '')
			.join(' ; ')}`
	);

	/** Vérification et dessin, chargés seulement dans le navigateur */
	const modules = browser
		? Promise.all([
				import('$lib/ubumark/utils/scratch-check'),
				import('$lib/ubumark/utils/scratch-render')
			])
		: null;

	/** Poser le dessin dans son cadre */
	function drawing(source: string, render: (source: string) => SVGSVGElement) {
		return (element: HTMLElement) => {
			const svg = render(source);
			svg.setAttribute('aria-hidden', 'true');
			svg.classList.add('max-w-full', 'h-auto');
			element.replaceChildren(svg);
			return () => element.replaceChildren();
		};
	}
</script>

{#snippet failure(messages: string[])}
	{#if errorsVisible}
		<div
			class="scratch-erreur rounded-md border border-destructive p-3 text-sm text-foreground {className}"
		>
			<p class="font-medium text-destructive">Bloc scratch : programme non dessiné</p>
			<ul class="mt-1 list-disc pl-5">
				{#each messages as message, i (i)}
					<li>{message}</li>
				{/each}
			</ul>
		</div>
	{:else}
		<div
			class="scratch-indisponible rounded-md border border-dashed border-border p-3 text-center text-sm text-muted-foreground {className}"
		>
			{SCRATCH_UNAVAILABLE}
		</div>
	{/if}
{/snippet}

{#snippet text()}
	<pre
		class="scratch-texte my-2 overflow-x-auto rounded-md bg-muted/40 p-3 font-mono text-sm {className}"
		aria-busy="true">{node.source}</pre>
{/snippet}

{#if node.errors.length > 0}
	{@render failure(node.errors.map((e) => e.message))}
{:else if modules === null}
	{@render text()}
{:else}
	{#await modules}
		{@render text()}
	{:then [{ checkScratchProgram }, { renderScratch }]}
		{@const issues = checkScratchProgram(node.source)}
		{#if issues.length > 0}
			{@render failure(issues.map((e) => e.message))}
		{:else}
			<figure
				class="scratch-bloc my-2 max-w-full overflow-x-auto {className}"
				role="img"
				aria-label={accessibleName}
				{@attach drawing(node.source, renderScratch)}
			></figure>
		{/if}
	{:catch}
		{@render text()}
	{/await}
{/if}
