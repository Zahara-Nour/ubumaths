<script lang="ts">
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import { resolve } from '$app/paths';
	import InlineMarkdown from '$lib/components/markdown/InlineMarkdown.svelte';
	import ShtamFooter from './ShtamFooter.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<SeoHead
	title="Le Shtam — Chiphre"
	description="Le Shtam, gazette parodique du Royaume : les fausses nouvelles des Mathres, chacune suivie de son vrai du faux."
/>

<div class="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-10 sm:px-6">
	<header class="flex flex-col items-center gap-2 border-y-4 border-double py-6 text-center">
		<h1 class="serif text-5xl font-bold tracking-tight sm:text-6xl">Le Shtam</h1>
		<div class="eyebrow text-muted-foreground">La gazette du Royaume · les maths à l’envers</div>
	</header>

	{#if data.articles.length === 0}
		<div class="text-center text-muted-foreground italic" data-testid="shtam-empty">
			Aucune nouvelle aujourd’hui. La Rédaction enquête.
		</div>
	{:else}
		<ol class="flex flex-col divide-y" data-testid="shtam-articles">
			{#each data.articles as article (article.slug)}
				<li class="flex flex-col gap-2 py-6 first:pt-0">
					<div class="text-xs text-muted-foreground">
						<span class="eyebrow">{article.almanachDate}</span> · {article.gregorianDate}
					</div>
					<h2 class="serif text-2xl leading-snug font-semibold">
						<a
							href={resolve('/(public)/shtam/[slug]', { slug: article.slug })}
							class="rounded-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
						>
							{article.title}
						</a>
					</h2>
					<div class="text-muted-foreground"><InlineMarkdown content={article.lede} /></div>
					<div class="text-sm italic">Par {article.byline}</div>
				</li>
			{/each}
		</ol>
	{/if}

	<ShtamFooter />
</div>

<style>
	.serif {
		font-family: 'Lora', Georgia, 'Times New Roman', serif;
	}
	.eyebrow {
		letter-spacing: 0.18em;
		text-transform: uppercase;
	}
</style>
