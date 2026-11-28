<!--
	@component LazyMount

	Ne dessine son contenu qu'à l'approche de l'écran (une fois pour toutes) : les cartes d'une
	longue série, tirées dans le navigateur, ne se calculent pas toutes au chargement. Sans
	IntersectionObserver, le contenu est dessiné tout de suite.
-->
<script lang="ts">
	// Imports
	import type { Snippet } from 'svelte';

	// Types
	interface Props {
		children: Snippet;
		/** Hauteur réservée avant le dessin, pour que la page ne saute pas */
		minHeight?: string;
	}

	// Constantes
	/** Marge d'avance : le contenu se dessine un peu avant d'entrer à l'écran */
	const ROOT_MARGIN = '800px 0px';

	// Variables
	let { children, minHeight = '12rem' }: Props = $props();

	let visible = $state(false);

	// Functions
	/** Attachment : observe l'élément jusqu'à sa première apparition */
	function watch(element: HTMLDivElement) {
		if (typeof IntersectionObserver === 'undefined') {
			visible = true;
			return;
		}
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((e) => e.isIntersecting)) {
					visible = true;
					observer.disconnect();
				}
			},
			{ rootMargin: ROOT_MARGIN }
		);
		observer.observe(element);
		return () => observer.disconnect();
	}
</script>

<div {@attach watch} style:min-height={visible ? undefined : minHeight}>
	{#if visible}
		{@render children()}
	{/if}
</div>
