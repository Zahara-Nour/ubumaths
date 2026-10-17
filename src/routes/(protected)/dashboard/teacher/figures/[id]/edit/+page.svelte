<script lang="ts">
	import BackLink from '$lib/components/navigation/BackLink.svelte';
	import StoredFigureForm from '$lib/components/geometry/StoredFigureForm.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const LIST_HREF = '/dashboard/teacher/figures';
</script>

<svelte:head>
	<title>Modifier la figure | Chiphre</title>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<div class="mb-6">
		<BackLink href={LIST_HREF} label="Retour aux figures" />
		<h1 class="text-3xl font-bold tracking-tight">Modifier la figure</h1>
		{#if data.figure.is_public}
			<a href="/figures/{data.figure.id}" class="text-sm text-primary underline">
				Voir la page publique
			</a>
		{/if}
	</div>

	{#key data.figure.id}
		<StoredFigureForm initial={data.figure} listHref={LIST_HREF} deletable />
	{/key}
</div>
