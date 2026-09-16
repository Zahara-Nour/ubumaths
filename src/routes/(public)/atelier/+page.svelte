<script lang="ts">
	/**
	 * L'atelier de recherche de l'élève.
	 *
	 * Public et sans compte : aucune donnée ne quitte le navigateur (décision
	 * figée n° 2 du cadrage). Cadrage : `docs/wip/atelier-recherche-eleve.md`.
	 *
	 * ⚠️ Une URL porteuse de contenu ouvre en **mode éphémère** : ce qui est
	 * affiché vient du lien, l'atelier personnel n'est ni lu ni écrit. C'est la
	 * garantie du §6 — recevoir un énoncé ne doit pas coûter son travail.
	 */
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import AtelierContainer from '$lib/components/atelier/AtelierContainer.svelte';
	import { Atelier } from '$lib/atelier/atelier.svelte';
	import { decodeAtelier } from '$lib/atelier/url';
	import type { AtelierState } from '$lib/atelier/persistence';

	/** La charge portée par l'URL, s'il y en a une. */
	const payload = $derived(page.url.searchParams.get('a'));

	let received = $state<AtelierState | null>(null);
	let notice = $state<string | null>(null);
	let ready = $state(false);

	/**
	 * L'atelier montré : celui du lien en mode éphémère, le sien sinon.
	 *
	 * Créé une fois pour toutes — le remplacer en cours de route viderait
	 * l'écran sous les doigts de l'élève.
	 */
	const atelier = new Atelier();

	onMount(async () => {
		if (payload === null) {
			ready = true;
			return;
		}

		const decoded = await decodeAtelier(payload);
		if (!decoded.ok) {
			// §6 E1 : on le dit, et on ouvre SON atelier — pas une page morte.
			notice = decoded.message;
			ready = true;
			return;
		}

		const report = atelier.restore(decoded.state);
		received = decoded.state;
		const perdus = decoded.dropped + report.skipped.length;
		if (perdus > 0) {
			notice = `${perdus} objet${perdus > 1 ? 's' : ''} du lien n’${perdus > 1 ? 'ont' : 'a'} pas pu être relu${perdus > 1 ? 's' : ''}.`;
		}
		ready = true;
	});
</script>

<svelte:head>
	<title>Atelier | Chiphre</title>
	<meta
		name="description"
		content="Un atelier pour chercher : calculer, tracer et explorer des données au même endroit."
	/>
</svelte:head>

<div class="page">
	{#if ready}
		<AtelierContainer {atelier} ephemeral={received !== null} {received} {notice} />
	{/if}
</div>

<style>
	.page {
		height: calc(100vh - 4rem);
	}
</style>
