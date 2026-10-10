<!--
	Page d'admin du dictionnaire (ADR 0022, comportements 5 à 9)
	============================================================

	Chercher un mot (accents et majuscules ignorés), ouvrir sa fiche, la
	modifier, ajouter une entrée, masquer ou réafficher. Les règles de
	cohérence sont vérifiées par le serveur à chaque enregistrement.
-->
<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { searchRows, type AdminDictionaryRow } from '$lib/dictionary/admin-draft';
	import { GRADES, type GradeCode } from '$lib/types/grades';
	import { Plus, Search } from '@lucide/svelte';
	import EntryEditor from './EntryEditor.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// La page garde sa propre liste, mise à jour à chaque enregistrement
	// svelte-ignore state_referenced_locally
	let rows = $state<AdminDictionaryRow[]>(data.rows);
	let query = $state('');
	/** L'entrée ouverte : son id, `'nouvelle'`, ou rien. */
	let openId = $state<string | null>(null);

	let results = $derived(searchRows(rows, query));
	let openRow = $derived(rows.find((row) => row.id === openId) ?? null);
	let principalNames = $derived([
		...new Set(rows.filter((row) => !row.hidden && !row.derived_from).map((row) => row.term))
	]);

	function label(row: AdminDictionaryRow): string {
		return row.sense ? `${row.term} (${row.sense})` : row.term;
	}

	function handleSaved(saved: AdminDictionaryRow) {
		const index = rows.findIndex((row) => row.id === saved.id);
		if (index === -1) rows.push(saved);
		else rows[index] = saved;
		openId = saved.id;
	}
</script>

<svelte:head>
	<title>Dictionnaire — Administration — Chiphre</title>
</svelte:head>

<section class="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
	<div class="flex flex-wrap items-center justify-between gap-2">
		<h1 class="text-2xl font-bold tracking-tight">Dictionnaire</h1>
		<Button onclick={() => (openId = 'nouvelle')}>
			<Plus class="mr-1 size-4" /> Nouvelle entrée
		</Button>
	</div>

	<div class="grid gap-6 lg:grid-cols-[18rem_1fr]">
		<div class="space-y-3">
			<div class="relative">
				<Search class="absolute top-2.5 left-2 size-4 text-muted-foreground" />
				<Input
					bind:value={query}
					placeholder="Chercher un mot"
					aria-label="Chercher un mot"
					class="pl-8"
				/>
			</div>
			<p class="text-xs text-muted-foreground">
				{rows.length} entrées · {results.length} affichées
			</p>
			<ul class="max-h-[70vh] space-y-1 overflow-y-auto">
				{#each results as row (row.id)}
					<li>
						<button
							type="button"
							class="flex w-full items-center justify-between gap-2 rounded px-2 py-1 text-left text-sm hover:bg-muted"
							class:bg-muted={row.id === openId}
							onclick={() => (openId = row.id)}
						>
							<span class:text-muted-foreground={row.hidden}>{label(row)}</span>
							<span class="flex shrink-0 gap-1">
								{#if row.hidden}<Badge variant="secondary">masquée</Badge>{/if}
								<Badge variant="outline"
									>{GRADES[row.grade as GradeCode]?.shortName ?? row.grade}</Badge
								>
							</span>
						</button>
					</li>
				{/each}
			</ul>
		</div>

		<div>
			{#if openId === 'nouvelle'}
				{#key openId}
					<EntryEditor row={null} {principalNames} onsaved={handleSaved} />
				{/key}
			{:else if openRow}
				{#key `${openRow.id}|${openRow.updated_at}`}
					<EntryEditor row={openRow} {principalNames} onsaved={handleSaved} />
				{/key}
			{:else}
				<p class="text-muted-foreground">Choisissez un mot dans la liste, ou ajoutez une entrée.</p>
			{/if}
		</div>
	</div>
</section>
