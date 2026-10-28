<!--
	Revue des modèles de questions (`/dev/modeles`, admin seul)
	============================================================

	Vue globale de tous les modèles en base : à gauche l'arbre programme > branche > notion >
	sous-notion et ses comptes de verdicts ; en haut les totaux et les filtres ; au centre les
	fiches du nœud choisi (ou de tout ce que les filtres retiennent), chacune avec l'aperçu de
	ses variations et son verdict « validé / à revoir » + commentaire.
	Chantier revue-modeles : docs/wip/revue-modeles-progress.md.
-->
<script lang="ts">
	// Imports
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { SvelteURLSearchParams } from 'svelte/reactivity';
	import { page } from '$app/state';
	import type { PageData } from './$types';
	import BackLink from '$lib/components/navigation/BackLink.svelte';
	import MySelect from '$lib/components/MySelect.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { Button } from '$lib/components/ui/button';
	import ReviewTree from '$lib/components/dev/ReviewTree.svelte';
	import TemplateReviewSheet from '$lib/components/dev/TemplateReviewSheet.svelte';

	// Constantes
	const MAX_UNFOLD = 20;
	const VERDICT_ITEMS = [
		{ value: 'tous', label: 'Tous les verdicts' },
		{ value: 'a_revoir', label: '🔶 À revoir' },
		{ value: 'valide', label: '✅ Validés' },
		{ value: 'sans', label: '⚪ Sans verdict' },
		{ value: 'modifie', label: 'Modifiés depuis le verdict' }
	];
	const STATUS_ITEMS = [
		{ value: 'tous', label: 'Brouillons et publiés' },
		{ value: 'draft', label: 'Brouillons' },
		{ value: 'published', label: 'Publiés' }
	];

	// Variables
	let { data }: { data: PageData } = $props();

	let openSheets = $state<Record<string, boolean>>({});

	const totals = $derived(data.totals);
	const openKeys = $derived(new Set(data.path.map((p) => p.key)));
	const hasFilter = $derived(
		data.filters.verdict !== 'tous' || data.filters.status !== 'tous' || data.filters.alertsOnly
	);

	// Functions
	/** La recherche de l'adresse actuelle, modifiée (`tous`, vide ou null retirent la clé) */
	function queryWith(changes: Record<string, string | null>): string {
		const params = new SvelteURLSearchParams(page.url.searchParams);
		for (const [k, v] of Object.entries(changes)) {
			if (v === null || v === '' || v === 'tous') params.delete(k);
			else params.set(k, v);
		}
		const query = params.toString();
		return query ? `?${query}` : '';
	}

	function setFilter(key: string, value: string | null) {
		goto(`${resolve('/(protected)/dev/modeles')}${queryWith({ [key]: value })}`, {
			keepFocus: true,
			noScroll: true
		});
	}

	function setAllSheets(open: boolean) {
		// Chaque fiche ouverte tire ses aperçus dans le navigateur : on n'en déplie que les premières
		openSheets = Object.fromEntries(data.sheets.map((s, i) => [s.row.id, open && i < MAX_UNFOLD]));
	}
</script>

<svelte:head>
	<title>Revue des modèles</title>
</svelte:head>

<div class="mx-auto max-w-7xl space-y-4 px-4 py-6">
	<header class="space-y-1">
		<BackLink href="/dev" label="Retour aux pages de dev" />
		<h1 class="text-2xl font-bold">Revue des modèles de questions</h1>
		<p class="text-sm text-muted-foreground">
			{totals.total} modèles en base · ✅ {totals.valide} validés · 🔶 {totals.aRevoir} à revoir · ⚪
			{totals.none} sans verdict
			{#if totals.changed > 0}· {totals.changed} modifiés depuis leur verdict{/if}
			<span class="block text-xs">
				Dans l'arbre, un modèle tagué dans deux programmes compte dans chacun.
			</span>
		</p>
	</header>

	<div class="flex flex-wrap items-center gap-3">
		<MySelect
			items={VERDICT_ITEMS}
			value={data.filters.verdict}
			onValueChange={(v: string) => setFilter('verdict', v)}
			triggerAriaLabel="Filtre des verdicts : {VERDICT_ITEMS.find(
				(i) => i.value === data.filters.verdict
			)?.label}"
			fitContent
		/>
		<MySelect
			items={STATUS_ITEMS}
			value={data.filters.status}
			onValueChange={(v: string) => setFilter('statut', v)}
			triggerAriaLabel="Filtre des statuts : {STATUS_ITEMS.find(
				(i) => i.value === data.filters.status
			)?.label}"
			fitContent
		/>
		<MyCheckbox
			checked={data.filters.alertsOnly}
			onchange={(c) => setFilter('alertes', c ? '1' : null)}
			label="Avec alerte seulement"
		/>
		{#if hasFilter || data.nodeKey}
			<a class="text-sm underline" href={resolve('/(protected)/dev/modeles')}>Tout effacer</a>
		{/if}
	</div>

	<div class="grid gap-4 md:grid-cols-[minmax(16rem,22rem)_1fr]">
		<nav aria-label="Arbre des modèles" class="max-h-[80vh] overflow-y-auto rounded-lg border p-2">
			<ReviewTree
				nodes={data.tree}
				{openKeys}
				selectedKey={data.nodeKey}
				queryFor={(key) => queryWith({ noeud: key })}
			/>
		</nav>

		<main class="min-w-0 space-y-3">
			{#if !data.nodeFound}
				<p class="text-sm text-destructive">Ce nœud n'existe plus : choisir dans l'arbre.</p>
			{:else if data.path.length > 0}
				<p class="text-sm">
					{#each data.path as step, i (step.key)}
						{#if i > 0}<span class="text-muted-foreground"> › </span>{/if}
						<a
							class="underline"
							href="{resolve('/(protected)/dev/modeles')}{queryWith({ noeud: step.key })}"
							>{step.name}</a
						>
					{/each}
					<span class="text-muted-foreground"> — {data.selectedCount} modèle(s)</span>
				</p>
			{:else if hasFilter}
				<p class="text-sm">
					Tous les programmes — {data.selectedCount} modèle(s) retenus par les filtres
				</p>
			{:else}
				<p class="text-sm text-muted-foreground">
					Choisir un programme ou une notion dans l'arbre, ou poser un filtre (par exemple « À
					revoir ») pour lister les modèles de tous les programmes.
				</p>
			{/if}

			{#if data.tooMany}
				<p class="rounded bg-warning/10 p-2 text-sm">
					{data.selectedCount} modèles : seuls les {data.maxSheets} premiers sont affichés. Choisir une
					notion plus fine ou poser un filtre pour voir les autres.
				</p>
			{/if}
			{#if data.pointBoundsCount === 0}
				<p class="rounded bg-destructive/10 p-2 text-sm text-destructive">
					Aucune borne de point chargée : les fichiers de docs/systeme/programmes/bornes/ ont-ils
					bougé ?
				</p>
			{/if}
			{#if data.sheetsError}
				<p class="rounded bg-destructive/10 p-2 text-sm text-destructive">{data.sheetsError}</p>
			{/if}

			{#if data.sheets.length > 0}
				<div class="flex gap-2">
					<Button variant="outline" size="sm" onclick={() => setAllSheets(true)}
						>{data.sheets.length > MAX_UNFOLD
							? `Déplier les ${MAX_UNFOLD} premières`
							: 'Tout déplier'}</Button
					>
					<Button variant="outline" size="sm" onclick={() => setAllSheets(false)}
						>Tout replier</Button
					>
				</div>
			{/if}
			{#each data.sheets as sheet (sheet.row.id)}
				<TemplateReviewSheet
					row={sheet.row}
					points={sheet.points}
					review={sheet.review}
					alerts={sheet.alerts}
					nodePath={sheet.nodePath}
					bind:open={() => openSheets[sheet.row.id] ?? false, (v) => (openSheets[sheet.row.id] = v)}
				/>
			{/each}
		</main>
	</div>
</div>
