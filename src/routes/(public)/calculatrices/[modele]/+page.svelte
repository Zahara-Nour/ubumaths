<script lang="ts">
	import { resolve } from '$app/paths';
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import BackLink from '$lib/components/navigation/BackLink.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<SeoHead
	title="Guide {data.model.name} | Chiphre"
	description="Guide de la {data.model
		.name} niveau par niveau : touches, menus et pièges pour chaque outil du programme."
	noindex={!data.available}
/>

<div class="container mx-auto max-w-3xl p-4">
	<BackLink href="/calculatrices" label="Retour aux calculatrices" />
	<h1 class="mb-2 text-2xl font-bold">{data.model.name}</h1>
	{#if data.available}
		<p class="mb-6 text-muted-foreground">Choisis ton niveau.</p>
		<ul class="grid gap-2 sm:grid-cols-2">
			{#each data.grades as grade (grade.slug)}
				<li>
					<a
						href={resolve('/(public)/calculatrices/[modele]/[niveau]', {
							modele: data.model.slug,
							niveau: grade.slug
						})}
						class="block rounded-lg border bg-card p-3 transition-colors hover:bg-muted"
						>{grade.label}</a
					>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="text-muted-foreground">Le guide de cette calculatrice n’est pas encore prêt.</p>
	{/if}
</div>
