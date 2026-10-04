<script lang="ts">
	/**
	 * `/grapheur` — l'atelier, ouvert sur le graphique.
	 *
	 * Décisions de David (phase 0 `docs/wip/atelier-grapheur-phase0.md`, G1/G2) :
	 * l'atelier est l'entrée unique, et cette adresse continue de marcher (favoris,
	 * liens notés). Elle ouvre l'atelier PERSONNEL sur la vue Graphe, « Mes objets »
	 * ouvert ; un atelier vide reçoit une carte `f` prête à taper (B3).
	 *
	 * Un lien `/grapheur?f=x^2-3x+1` est l'entrée « projection » (B4, B5) : ces
	 * seules courbes, dans un atelier ÉPHÉMÈRE — l'atelier personnel n'est ni lu
	 * ni écrit. Un lien abîmé le dit et ouvre l'atelier personnel (B6).
	 */
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import AtelierContainer from '$lib/components/atelier/AtelierContainer.svelte';
	import { Atelier } from '$lib/atelier/atelier.svelte';
	import { atelierFromCurves, curvesFromLink } from '$lib/atelier/grapheur-link';
	import type { AtelierState } from '$lib/atelier/persistence';

	let atelier = $state<Atelier>(new Atelier());
	let received = $state<AtelierState | null>(null);
	let notice = $state<string | null>(null);
	let ready = $state(false);

	onMount(() => {
		const link = curvesFromLink(page.url.searchParams);
		if (link.kind === 'invalid') {
			notice = `${link.message} Voici ton atelier.`;
		} else if (link.kind === 'curves') {
			const built = atelierFromCurves(link.definitions);
			if (built.ok) {
				atelier = built.atelier;
				// Sa présence fait le mode éphémère, et le bandeau qui dit que
				// l'atelier personnel n'est pas touché (ShareBar)
				received = built.atelier.serialize();
			} else {
				notice = `${built.message} Voici ton atelier.`;
			}
		}
		ready = true;
	});
</script>

<svelte:head>
	<title>Grapheur | Chiphre</title>
	<meta
		name="description"
		content="Tracer des fonctions et des suites, les dériver, étudier leurs variations : le grapheur de l’atelier."
	/>
</svelte:head>

<div class="page">
	{#if ready}
		<AtelierContainer
			{atelier}
			ephemeral={received !== null}
			{received}
			{notice}
			view="graphe"
			startWith={received === null ? 'function' : undefined}
		/>
	{/if}
</div>

<style>
	.page {
		height: calc(100vh - 4rem);
	}
</style>
