<script lang="ts">
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import { resolve } from '$app/paths';
	import InlineMarkdown from '$lib/components/markdown/InlineMarkdown.svelte';
	import MarkdownRenderer from '$lib/components/markdown/MarkdownRenderer.svelte';
	import ShtamFooter from './ShtamFooter.svelte';
	import ShtamFullArticle from './ShtamFullArticle.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// Functions

	/** Paramètre d'une page du journal : la une n'en a pas */
	const pageQuery = (page: number): string => (page > 1 ? `?page=${page}` : '');

	const pageLabel = (page: number): string => (page === 1 ? 'La une' : `Page ${page}`);
</script>

<SeoHead
	title={data.page === 1 ? 'Le Shtam — Chiphre' : `Le Shtam, page ${data.page} — Chiphre`}
	description="Le Shtam, gazette parodique du Royaume : les fausses nouvelles des Mathres, chacune suivie de son vrai du faux."
	noindex={data.page > 1}
/>

<div class="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6">
	{#if data.kind === 'une'}
		<header class="flex flex-col" data-testid="shtam-masthead">
			<div
				class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b pb-1 text-xs text-muted-foreground"
			>
				<span class="eyebrow">N° {data.edition.number}</span>
				<span>
					<span class="eyebrow">{data.edition.almanachDate}</span> · {data.edition.gregorianDate}
				</span>
				<span class="eyebrow">Prix : 1 gidouille</span>
			</div>
			<h1 class="serif py-3 text-center text-6xl font-bold tracking-tight sm:text-8xl">Le Shtam</h1>
			<div
				class="eyebrow border-y-4 border-double py-1.5 text-center text-xs text-muted-foreground"
			>
				La gazette du Royaume · les maths à l’envers
			</div>
		</header>

		{#if data.une === null}
			<div class="text-center text-muted-foreground italic" data-testid="shtam-empty">
				Aucune nouvelle aujourd’hui. La Rédaction enquête.
			</div>
		{:else}
			<article class="flex flex-col gap-4" data-testid="shtam-une">
				<h2 class="serif text-center text-3xl leading-tight font-bold text-balance sm:text-5xl">
					<a
						href="{resolve('/shtam')}{pageQuery(data.une.page)}#{data.une.slug}"
						class="rounded-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
					>
						{data.une.title}
					</a>
				</h2>
				<div
					class="serif mx-auto max-w-3xl text-center text-lg text-muted-foreground italic sm:text-xl"
				>
					<InlineMarkdown content={data.une.lede} />
				</div>
				<div class="text-center text-sm">
					<span class="italic">Par {data.une.byline}</span>
					<span class="text-muted-foreground">
						· <span class="eyebrow text-xs">{data.une.almanachDate}</span>
					</span>
				</div>
				{#if data.une.image}
					<div class="mx-auto w-full max-w-2xl">
						<MarkdownRenderer content={data.une.image} />
					</div>
				{/if}
				<div class="columns-journal border-t pt-4">
					<MarkdownRenderer content={data.une.excerpt} />
				</div>
				<a
					href="{resolve('/shtam')}{pageQuery(data.une.page)}#{data.une.slug}"
					class="serif self-end rounded-sm font-semibold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
				>
					Lire la suite, page {data.une.page} →
				</a>
			</article>

			{#if data.teasers.length > 0}
				<ol
					class="grid gap-6 border-t-4 border-double pt-6 sm:grid-cols-3 sm:gap-0 sm:divide-x"
					data-testid="shtam-teasers"
				>
					{#each data.teasers as teaser (teaser.slug)}
						<li class="flex flex-col gap-2 sm:px-5 sm:first:pl-0 sm:last:pr-0">
							<div class="eyebrow text-xs text-muted-foreground">{teaser.almanachDate}</div>
							<h3 class="serif text-xl leading-snug font-semibold">
								<a
									href="{resolve('/shtam')}{pageQuery(teaser.page)}#{teaser.slug}"
									class="rounded-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
								>
									{teaser.title}
								</a>
							</h3>
							<div class="text-sm text-muted-foreground">
								<InlineMarkdown content={teaser.lede} />
							</div>
							<div class="text-sm italic">Par {teaser.byline} · suite page {teaser.page}</div>
						</li>
					{/each}
				</ol>
			{/if}
		{/if}
	{:else}
		<header
			class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b-4 border-double pb-2"
		>
			<h1 class="serif text-3xl font-bold">
				<a
					href={resolve('/shtam')}
					class="rounded-sm underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
				>
					Le Shtam
				</a>
			</h1>
			<span class="text-xs text-muted-foreground">
				<span class="eyebrow">N° {data.edition.number}</span> ·
				<span class="eyebrow">{data.edition.almanachDate}</span>
			</span>
			<span class="eyebrow text-xs">Page {data.page}</span>
		</header>

		<div class="flex flex-col gap-10">
			{#each data.articles as article, i (article.slug)}
				{#if i > 0}<hr class="border-t-4 border-double" />{/if}
				<ShtamFullArticle {article} />
			{/each}
		</div>
	{/if}

	{#if data.pageCount > 1}
		<nav
			aria-label="Pages du journal"
			class="serif flex items-center justify-between gap-4 border-t pt-4"
			data-testid="shtam-pages"
		>
			{#if data.page > 1}
				<a
					href="{resolve('/shtam')}{pageQuery(data.page - 1)}"
					class="rounded-sm font-semibold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
				>
					← {pageLabel(data.page - 1)}
				</a>
			{:else}
				<span></span>
			{/if}
			<span class="text-sm text-muted-foreground">Page {data.page} sur {data.pageCount}</span>
			{#if data.page < data.pageCount}
				<a
					href="{resolve('/shtam')}{pageQuery(data.page + 1)}"
					class="rounded-sm font-semibold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
				>
					{pageLabel(data.page + 1)} →
				</a>
			{:else}
				<span></span>
			{/if}
		</nav>
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
	/* Deux colonnes de journal dès qu'il y a la place */
	@media (min-width: 48rem) {
		.columns-journal {
			column-count: 2;
			column-gap: 2rem;
			column-rule: 1px solid var(--color-border);
			text-align: justify;
			hyphens: auto;
		}
	}
</style>
