<script lang="ts">
	import SeoHead from '$lib/seo/SeoHead.svelte';
	/**
	 * L'atelier de recherche de l'élève.
	 *
	 * Public et sans compte : aucune donnée ne quitte le navigateur (décision
	 * figée n° 2 du cadrage). Cadrage : `docs/wip/atelier-recherche-eleve.md`.
	 *
	 * ⚠️ Une URL porteuse de contenu (`?a=`, `?f=`) ouvre en **mode éphémère** :
	 * ce qui est affiché vient du lien, l'atelier personnel n'est ni lu ni écrit.
	 * C'est la garantie du §6 — recevoir un énoncé ne doit pas coûter son travail.
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
	title="Atelier | Chiphre"
	description="Un atelier pour chercher : calculer, tracer et explorer des données au même endroit."
/>

<div class="page">
	{#if opened}
		{#key opened}
			<AtelierContainer
				atelier={opened.atelier}
				ephemeral={opened.received !== null}
				received={opened.received}
				notice={opened.notice}
				heading="Atelier"
			/>
		{/key}
	{/if}
</div>

<style>
	.page {
		height: calc(100vh - 4rem);
	}
</style>
