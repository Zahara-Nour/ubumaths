<!--
	Vitrine : les blocs ubumark (`/demo/blocs`)
	===========================================

	Neuf blocs rangés par niveau (primaire, collège, lycée), chacun avec le texte
	qu'écrit le prof replié sous « Voir ce qu'écrit le prof ». Les exemples sont
	ceux du catalogue (`$lib/block-catalog/showcase`) ; la syntaxe complète reste
	sur `/aide-ecriture/blocs` (chantier catalogue-blocs, PR 2).
-->
<script lang="ts">
	import { demoSeo } from '$lib/seo/demo-pages';
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import BackLink from '$lib/components/navigation/BackLink.svelte';
	import MarkdownRenderer from '$lib/components/markdown/MarkdownRenderer.svelte';
	import * as Card from '$lib/components/ui/card';
	import { SHOWCASE_ITEMS, SHOWCASE_SECTIONS, showcaseSource } from '$lib/block-catalog/showcase';
</script>

<SeoHead {...demoSeo('/demo/blocs')} />

<div class="mx-auto max-w-6xl space-y-8 px-4 py-8">
	<BackLink href="/demo" label="Retour aux démonstrations" />

	<header class="space-y-2">
		<h1 class="text-2xl font-bold">Les blocs du prof</h1>
		<div class="text-muted-foreground">
			Le prof écrit quelques lignes, l’élève voit l’horloge, le diagramme ou le tableau, et la fiche
			PDF aussi. Ouvrez « Voir ce qu’écrit le prof » sous chaque bloc.
		</div>
	</header>

	{#each SHOWCASE_SECTIONS as section (section.level)}
		<section class="space-y-4">
			<h2 class="text-xl font-bold">{section.title}</h2>
			<div class="grid gap-6 lg:grid-cols-3">
				{#each SHOWCASE_ITEMS.filter((item) => item.level === section.level) as item (item.title)}
					{@const source = showcaseSource(item)}
					<Card.Root class="overflow-hidden">
						<Card.Header class="pb-2">
							<h3 class="text-lg font-semibold">{item.title}</h3>
							<Card.Description>{item.text}</Card.Description>
						</Card.Header>
						<Card.Content class="space-y-3">
							<div
								class="flex min-h-32 items-center justify-center overflow-x-auto"
								data-block-render
							>
								<MarkdownRenderer content={source} />
							</div>
							<details class="rounded-md border bg-muted/50">
								<summary class="cursor-pointer px-3 py-2 text-sm font-medium text-muted-foreground">
									Voir ce qu’écrit le prof
								</summary>
								<pre class="overflow-x-auto px-3 pb-3 font-mono text-[13px] leading-relaxed"><code
										>{source}</code
									></pre>
							</details>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		</section>
	{/each}
</div>
