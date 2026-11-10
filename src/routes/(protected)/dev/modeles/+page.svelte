<!--
	Revue des modèles de questions (`/dev/modeles`, admin seul)
	============================================================

	Vue globale de tous les modèles en base : à gauche l'arbre programme > branche > notion >
	sous-notion et ses comptes de verdicts ; en haut les totaux et les filtres ; au centre les
	fiches de la série choisie (dans son ordre), du nœud choisi, ou de tout ce que les filtres
	retiennent (titre, point, verdict, statut, alertes), chacune avec l'aperçu de ses variations et
	son verdict « validé / à revoir » + commentaire.
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
	import { Input } from '$lib/components/ui/input';
	import {
		MAX_POINT_INPUT,
		MAX_TITLE_SEARCH,
		parsePointCode
	} from '$lib/questions/template-review';
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
	// Code de point mal formé : aide sous la case, sans quitter la page (le serveur le refuserait)
	let pointHelp = $state<string | null>(null);

	const totals = $derived(data.totals);
	const openKeys = $derived(new Set(data.path.map((p) => p.key)));
	const seriesItems = $derived([{ value: 'tous', label: 'Aucune série' }, ...data.seriesItems]);
	const hasFilter = $derived(
		data.filters.verdict !== 'tous' ||
			data.filters.status !== 'tous' ||
			data.filters.alertsOnly ||
			data.filters.title !== '' ||
			data.filters.point !== null
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

	function setPoint(raw: string) {
		const value = raw.trim();
		if (value !== '' && parsePointCode(value) === null) {
			pointHelp = `« ${value} » n'est pas un code de point (forme attendue : 1SPE-213)`;
			return;
		}
		pointHelp = null;
		setFilter('point', value);
	}

	function setAllSheets(open: boolean) {
		// Chaque fiche ouverte tire ses aperçus dans le navigateur : on n'en déplie que les premières
		openSheets = Object.fromEntries(data.sheets.map((s, i) => [s.key, open && i < MAX_UNFOLD]));
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
		<Input
			class="w-56"
			placeholder="Chercher dans le titre"
			aria-label="Chercher dans le titre (Entrée pour filtrer)"
			maxlength={MAX_TITLE_SEARCH}
			value={data.filters.title}
			onchange={(e) => setFilter('titre', e.currentTarget.value.trim())}
		/>
		<Input
			class="w-36"
			placeholder="Point (1SPE-213)"
			aria-label="Code du point du programme (Entrée pour filtrer)"
			maxlength={MAX_POINT_INPUT}
			value={data.filters.point ?? ''}
			aria-invalid={pointHelp !== null}
			aria-describedby={pointHelp ? 'point-help' : undefined}
			onchange={(e) => setPoint(e.currentTarget.value)}
		/>
		{#if data.seriesItems.length > 0}
			<MySelect
				items={seriesItems}
				value={data.seriesId ?? 'tous'}
				onValueChange={(v: string) => setFilter('serie', v)}
				triggerAriaLabel="Série : {seriesItems.find((i) => i.value === (data.seriesId ?? 'tous'))
					?.label}"
				fitContent
			/>
		{/if}
		{#if hasFilter || data.nodeKey || data.seriesId}
			<a class="text-sm underline" href={resolve('/(protected)/dev/modeles')}>Tout effacer</a>
		{/if}
	</div>
	{#if pointHelp}
		<p id="point-help" class="text-sm text-destructive">{pointHelp}</p>
	{/if}

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
			{#if data.pointUnknown}
				<p class="rounded bg-warning/10 p-2 text-sm">
					Point inconnu : {data.filters.point} n'est pas un point du programme en base.
				</p>
			{/if}
			{#if data.seriesId}
				{#if !data.series}
					<p class="text-sm text-destructive">Cette série n'existe plus : en choisir une autre.</p>
				{:else if !data.series.readable}
					<p class="text-sm text-destructive">
						La composition de la série « {data.series.title} » est illisible.
					</p>
				{:else}
					<p class="text-sm">
						Série « {data.series.title} » — {data.selectedCount} modèle(s){hasFilter
							? ' retenus par les filtres'
							: ''}
					</p>
				{/if}
			{:else if !data.nodeFound}
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

			{#if data.selectedCount === 0 && (hasFilter || data.nodeKey || data.series?.readable)}
				<p class="text-sm text-muted-foreground">
					{data.filters.point && !data.pointUnknown
						? `Aucun modèle sur le point ${data.filters.point}${data.nodeKey || data.seriesId ? ' ici' : ''}.`
						: 'Aucun modèle ne correspond.'}
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
			{#each data.sheets as entry (entry.key)}
				{#if entry.sheet}
					<TemplateReviewSheet
						row={entry.sheet.row}
						points={entry.sheet.points}
						review={entry.sheet.review}
						alerts={entry.sheet.alerts}
						nodePath={entry.sheet.nodePath}
						seriesLine={entry.seriesLine}
						bind:open={() => openSheets[entry.key] ?? false, (v) => (openSheets[entry.key] = v)}
					/>
				{:else if !data.sheetsError}
					<p class="rounded-lg border border-dashed p-3 text-sm text-destructive">
						Modèle introuvable ({entry.templateId.slice(0, 8)}…){entry.seriesLine
							? ` — × ${entry.seriesLine.quantity} · ${entry.seriesLine.delay} s`
							: ''}
					</p>
				{/if}
			{/each}
		</main>
	</div>
</div>
