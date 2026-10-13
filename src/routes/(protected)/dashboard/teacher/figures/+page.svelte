<script lang="ts">
	import { afterNavigate, goto } from '$app/navigation';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import MySelect from '$lib/components/MySelect.svelte';
	import { Plus } from '@lucide/svelte';
	import { getGradeSelectItems } from '$lib/utils/grades';
	import { GRADES, type GradeCode } from '$lib/types/grades';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const ALL = 'all';
	const LIST_PATH = '/dashboard/teacher/figures';
	const gradeItems = [{ value: ALL, label: 'Tous les niveaux' }, ...getGradeSelectItems()];
	const scopeItems = [
		{ value: ALL, label: 'Toutes les figures' },
		{ value: 'mine', label: 'Mes figures' },
		{ value: 'public', label: 'Figures publiques' }
	];

	// Copie de travail des filtres : ils ne s'appliquent qu'à l'envoi
	// svelte-ignore state_referenced_locally
	const initialFilters = data.filters;
	let grade = $state<string>(initialFilters.grade ?? ALL);
	let scope = $state<string>(initialFilters.scope ?? ALL);
	let q = $state(initialFilters.q ?? '');
	let tags = $state<string[]>([...initialFilters.tags]);

	// Précédent / Suivant ou le lien du menu réutilisent la page : les champs
	// reprennent les filtres de la nouvelle adresse
	afterNavigate(() => {
		grade = data.filters.grade ?? ALL;
		scope = data.filters.scope ?? ALL;
		q = data.filters.q ?? '';
		tags = [...data.filters.tags];
	});

	const tagItems = $derived(data.tagNames.map((name) => ({ value: name, label: name })));
	const hasFilters = $derived(
		data.filters.grade !== undefined ||
			data.filters.scope !== undefined ||
			data.filters.q !== undefined ||
			data.filters.tags.length > 0
	);

	function gradeLabel(code: string): string {
		return GRADES[code as GradeCode]?.displayName ?? code;
	}

	function handleFilter() {
		const params = new URLSearchParams();
		if (grade !== ALL) params.set('grade', grade);
		if (scope !== ALL) params.set('scope', scope);
		if (q.trim()) params.set('q', q.trim());
		for (const tag of tags) params.append('tag', tag);
		const query = params.toString();
		goto(query ? `${LIST_PATH}?${query}` : LIST_PATH, { keepFocus: true }).then(() => {});
	}

	function handleReset() {
		grade = ALL;
		scope = ALL;
		q = '';
		tags = [];
		goto(LIST_PATH).then(() => {});
	}
</script>

<svelte:head>
	<title>Figures géométriques | Chiphre</title>
</svelte:head>

<div class="container mx-auto max-w-5xl px-4 py-8">
	<div class="mb-6 flex flex-wrap items-start justify-between gap-4">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Figures géométriques</h1>
			<p class="mt-1 text-muted-foreground">
				Figures écrites dans le langage de géométrie, avec leurs curseurs.
			</p>
		</div>
		<Button href="{LIST_PATH}/new">
			<Plus class="mr-2 h-4 w-4" />
			Nouvelle figure
		</Button>
	</div>

	<form
		class="mb-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4"
		onsubmit={(e) => {
			e.preventDefault();
			handleFilter();
		}}
	>
		<Input
			type="search"
			bind:value={q}
			maxlength={100}
			placeholder="Chercher dans les titres et descriptions"
			aria-label="Chercher dans les titres et descriptions"
			class="lg:col-span-2"
		/>
		<MySelect
			type="single"
			bind:value={grade}
			items={gradeItems}
			triggerAriaLabel="Niveau : {gradeItems.find((item) => item.value === grade)?.label}"
		/>
		<MySelect
			type="single"
			bind:value={scope}
			items={scopeItems}
			triggerAriaLabel="Portée : {scopeItems.find((item) => item.value === scope)?.label}"
		/>
		<MySelect
			type="multiple"
			bind:value={tags}
			items={tagItems}
			placeholder="Tous les tags"
			triggerAriaLabel={tags.length > 0 ? `Tags (au moins un) : ${tags.join(', ')}` : 'Tags : tous'}
		/>
		<div class="flex gap-2 lg:col-span-3">
			<Button type="submit">Filtrer</Button>
			{#if hasFilters}
				<Button type="button" variant="outline" onclick={handleReset}>Effacer les filtres</Button>
			{/if}
		</div>
	</form>

	{#if data.figures.length === 0}
		<p class="rounded-md border border-dashed p-8 text-center text-muted-foreground">
			{hasFilters ? 'Aucune figure ne correspond à ces filtres.' : 'Aucune figure pour le moment.'}
		</p>
	{:else}
		{#if data.figures.length >= data.limit}
			<p class="mb-3 text-sm text-muted-foreground">
				Seules les {data.limit} figures les plus récentes sont affichées : affiner les filtres pour trouver
				les autres.
			</p>
		{/if}
		<ul class="space-y-3">
			{#each data.figures as figure (figure.id)}
				<li>
					<Card.Root>
						<Card.Content class="flex flex-wrap items-start justify-between gap-3 pt-6">
							<div class="min-w-0 space-y-1">
								<h2 class="text-lg font-semibold">{figure.title}</h2>
								{#if figure.description}
									<p class="line-clamp-2 text-sm text-muted-foreground">{figure.description}</p>
								{/if}
								<div class="flex flex-wrap gap-1">
									<Badge variant={figure.is_public ? 'default' : 'secondary'}>
										{figure.is_public ? 'Publique' : 'Privée'}
									</Badge>
									{#each figure.grades as code (code)}
										<Badge variant="outline">{gradeLabel(code)}</Badge>
									{/each}
									{#each figure.tags as tag (tag)}
										<Badge variant="outline" class="text-muted-foreground">#{tag}</Badge>
									{/each}
								</div>
							</div>
							<div class="flex gap-2">
								{#if figure.is_public}
									<Button variant="outline" size="sm" href="/figures/{figure.id}">Voir</Button>
								{/if}
								{#if figure.author_id === data.userId}
									<Button size="sm" href="{LIST_PATH}/{figure.id}/edit">Modifier</Button>
								{/if}
							</div>
						</Card.Content>
					</Card.Root>
				</li>
			{/each}
		</ul>
	{/if}
</div>
