<script lang="ts">
	import { resolve } from '$app/paths';
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const FAMILIES = [
		{ family: 'college', title: 'Collège' },
		{ family: 'lycee', title: 'Lycée' }
	] as const;
</script>

<SeoHead
	title="Guides calculatrices | Chiphre"
	description="Comment faire chaque calcul du programme sur ta calculatrice (NumWorks, Casio, TI), du collège à la terminale : touches, menus et pièges."
/>

<div class="container mx-auto max-w-3xl p-4">
	<h1 class="mb-2 text-2xl font-bold">Guides calculatrices</h1>
	<p class="mb-6 text-muted-foreground">
		Choisis ta calculatrice : pour chaque niveau, le guide te dit où trouver chaque outil du
		programme, touche par touche, et les pièges à éviter.
	</p>

	{#each FAMILIES as { family, title } (family)}
		<section class="mb-6" aria-labelledby="famille-{family}">
			<h2 id="famille-{family}" class="mb-3 text-lg font-semibold">{title}</h2>
			<ul class="grid gap-3 sm:grid-cols-2">
				{#each data.models.filter((model) => model.family === family) as model (model.slug)}
					<li>
						{#if model.available}
							<a
								href={resolve('/(public)/calculatrices/[modele]', { modele: model.slug })}
								class="block rounded-lg border bg-card p-4 font-medium transition-colors hover:bg-muted"
								>{model.name}</a
							>
						{:else}
							<div
								class="flex items-center justify-between rounded-lg border border-dashed p-4 text-muted-foreground"
							>
								<span>{model.name}</span>
								<Badge variant="outline">Bientôt</Badge>
							</div>
						{/if}
					</li>
				{/each}
			</ul>
		</section>
	{/each}
</div>
