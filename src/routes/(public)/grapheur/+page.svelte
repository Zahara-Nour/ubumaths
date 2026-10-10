<script lang="ts">
	import SeoHead from '$lib/seo/SeoHead.svelte';
	/**
	 * `/grapheur` — l'atelier, ouvert sur le graphique.
	 *
	 * Décisions de David (phase 0 `docs/archive/wip/atelier-grapheur-phase0.md`, G1/G2) :
	 * l'atelier est l'entrée unique, et cette adresse continue de marcher (favoris,
	 * liens notés). Elle ouvre l'atelier PERSONNEL sur la vue Graphe, « Mes objets »
	 * visible ; un atelier vide reçoit une carte `f` prête à taper (B3).
	 *
	 * `/grapheur?f=x^2-3x+1` est l'entrée « projection » (B4, B5) et
	 * `/grapheur?a=…` un atelier partagé depuis cette page (revue du lot 6, B1) :
	 * tous deux ÉPHÉMÈRES — l'atelier personnel n'est ni lu ni écrit. Un lien
	 * abîmé le dit et ouvre l'atelier personnel (B6).
	 */
	import { page } from '$app/state';
	import AtelierContainer from '$lib/components/atelier/AtelierContainer.svelte';
	import { Atelier } from '$lib/atelier/atelier.svelte';
	import { openLink } from '$lib/atelier/grapheur-link';
	import type { AtelierState } from '$lib/atelier/persistence';

	interface Opened {
		atelier: Atelier;
		received: AtelierState | null;
		notice: string | null;
	}

	/**
	 * Ce que l'adresse ouvre — relu quand elle change : passer d'un lien à un
	 * autre sans recharger la page doit changer l'écran (revue du lot 6, M1).
	 * Navigateur seulement : le décodage d'un lien `?a=` est asynchrone.
	 */
	let opened = $state<Opened | null>(null);

	$effect(() => {
		const search = page.url.search;
		let cancelled = false;
		openLink(new URLSearchParams(search)).then((link) => {
			if (cancelled) return;
			if (link.kind === 'received') {
				opened = { atelier: link.atelier, received: link.state, notice: link.notice };
			} else {
				// Un lien abîmé ne donne pas une page morte : on le dit, et SON
				// atelier s'ouvre (§6 E1, B6)
				opened = {
					atelier: new Atelier(),
					received: null,
					notice: link.kind === 'invalid' ? `${link.message} Voici ton atelier.` : null
				};
			}
		});
		return () => {
			cancelled = true;
		};
	});
</script>

<SeoHead
	title="Grapheur | Chiphre"
	description="Tracer des fonctions et des suites, les dériver, étudier leurs variations : le grapheur de l’atelier."
/>

<div class="page">
	{#if opened}
		{#key opened}
			<AtelierContainer
				atelier={opened.atelier}
				ephemeral={opened.received !== null}
				received={opened.received}
				notice={opened.notice}
				view="graphe"
				startWith={opened.received === null ? 'function' : undefined}
				heading="Grapheur"
			/>
		{/key}
	{/if}
</div>

<style>
	.page {
		height: calc(100vh - 4rem);
	}
</style>
