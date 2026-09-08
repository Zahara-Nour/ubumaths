<!--
	Recherche globale — page prof
	=============================

	Un champ, des filtres par type, des résultats cliquables. Les URL viennent
	toutes du registre `$lib/resources` : c'est ici que la phase 1 commence à
	payer, puisque la page ne connaît aucune route.

	La recherche est un GET : le formulaire navigue, le serveur cherche. Pas de
	fetch client, pas d'état à resynchroniser, et une URL partageable.
-->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Input } from '$lib/components/ui/input';
	import { Search } from '@lucide/svelte';
	import { untrack } from 'svelte';
	import { RESOURCE_KINDS, type ResourceKind } from '$lib/resources/kinds';
	import { RESOURCE_REGISTRY, resolveResource } from '$lib/resources';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Le champ texte n'est pas piloté : le formulaire est un GET, le navigateur
	// gère la saisie, et `data.query` en fournit la valeur initiale à chaque
	// navigation. Un $state ici ne capturerait que la première valeur.
	//
	// Les filtres, eux, ont besoin d'être réactifs pour l'affichage des boutons.
	// `untrack` dit explicitement qu'on veut la valeur d'arrivée, pas un suivi.
	let selectedKinds = $state<ResourceKind[]>(untrack(() => [...data.kinds] as ResourceKind[]));
	let selectedTags = $state<string[]>(untrack(() => [...data.tags]));

	const kindsParam = $derived(selectedKinds.join(','));
	const tagsParam = $derived(selectedTags.join(','));

	/** Un type sélectionné se retire, un type absent s'ajoute. */
	function toggleKind(kind: ResourceKind) {
		selectedKinds = selectedKinds.includes(kind)
			? selectedKinds.filter((k) => k !== kind)
			: [...selectedKinds, kind];
	}

	/**
	 * Le rôle est figé à 'teacher' : cette page vit sous /dashboard/teacher, dont
	 * le layout refuse les autres rôles.
	 */
	function linkFor(row: PageData['results'][number]) {
		return resolveResource(row.kind, row.id, {
			role: 'teacher',
			label: row.title,
			context: { slug: row.slug ?? undefined }
		});
	}
</script>

<svelte:head><title>Recherche — Chiphre</title></svelte:head>

<div class="mx-auto w-full max-w-4xl space-y-6 p-4">
	<div>
		<h1 class="text-2xl font-bold">Recherche</h1>
		<p class="text-sm text-muted-foreground">
			Cherche par titre, par métadonnées ou par tag dans tes exercices, questions, évaluations,
			chapitres et documents. Un tag seul suffit.
		</p>
	</div>

	<form method="GET" class="space-y-3">
		<div class="flex gap-2">
			<Input
				type="search"
				name="q"
				value={data.query}
				placeholder="Fractions, Pythagore, pourcentages…"
				maxlength={100}
				class="flex-1"
				aria-label="Termes de recherche"
			/>
			<Button type="submit">
				<Search class="mr-2 h-4 w-4" />
				Chercher
			</Button>
		</div>

		<!-- Les filtres voyagent dans l'URL avec la requête. -->
		<input type="hidden" name="kinds" value={kindsParam} />
		<input type="hidden" name="tags" value={tagsParam} />

		{#if selectedTags.length > 0}
			<div class="flex flex-wrap items-center gap-2">
				<span class="text-sm text-muted-foreground">Tags :</span>
				{#each selectedTags as tag (tag)}
					<Button
						type="button"
						variant="secondary"
						size="sm"
						onclick={() => (selectedTags = selectedTags.filter((t) => t !== tag))}
						aria-label="Retirer le tag {tag}"
					>
						#{tag} ×
					</Button>
				{/each}
			</div>
		{/if}

		<div class="flex flex-wrap gap-2">
			{#each RESOURCE_KINDS as kind (kind)}
				{@const active = selectedKinds.includes(kind)}
				<Button
					type="button"
					variant={active ? 'default' : 'outline'}
					size="sm"
					onclick={() => toggleKind(kind)}
					aria-pressed={active}
				>
					{RESOURCE_REGISTRY[kind].label}
				</Button>
			{/each}
			{#if selectedKinds.length > 0}
				<Button type="button" variant="ghost" size="sm" onclick={() => (selectedKinds = [])}>
					Tout afficher
				</Button>
			{/if}
		</div>
	</form>

	{#if data.error}
		<p class="text-sm text-destructive">{data.error}</p>
	{:else if data.searched && data.results.length === 0}
		<p class="text-sm text-muted-foreground">Aucun résultat pour « {data.query} ».</p>
	{:else if data.results.length > 0}
		<p class="text-sm text-muted-foreground">
			{data.results.length} résultat{data.results.length > 1 ? 's' : ''}
		</p>

		<div class="space-y-2">
			{#each data.results as row (row.kind + row.id)}
				{@const link = linkFor(row)}
				{@const Icon = link.icon}
				<Card.Root>
					<Card.Content class="flex items-start gap-3 p-4">
						<Icon class="mt-0.5 h-5 w-5 flex-shrink-0 text-muted-foreground" />
						<div class="min-w-0 flex-1">
							{#if link.url}
								<!-- `link.url` sort déjà du resolve() de SvelteKit (cf. le registre) :
								     le rewrapper préfixerait `base` deux fois. -->
								<a href={link.url} class="font-medium text-primary hover:underline">{row.title}</a>
							{:else}
								<!-- Pas de page pour ce type : on affiche, on ne promet pas un lien mort. -->
								<span class="font-medium">{row.title}</span>
							{/if}
							{#if row.subtitle}
								<p class="truncate text-sm text-muted-foreground">{row.subtitle}</p>
							{/if}
						</div>
						<div class="flex flex-shrink-0 flex-wrap items-center gap-1">
							<Badge variant="secondary">{link.kindLabel}</Badge>
							{#if row.status === 'draft'}
								<Badge variant="outline">Brouillon</Badge>
							{/if}
							{#each row.grades ?? [] as grade (grade)}
								<Badge variant="outline">{grade}</Badge>
							{/each}
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>
