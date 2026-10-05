<script lang="ts">
	import { resolve } from '$app/paths';
	import InlineMarkdown from '$lib/components/markdown/InlineMarkdown.svelte';
	import MarkdownRenderer from '$lib/components/markdown/MarkdownRenderer.svelte';
	import ShtamFooter from '../ShtamFooter.svelte';
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import JsonLd from '$lib/seo/JsonLd.svelte';
	import { DEFAULT_OG_IMAGE, SITE_NAME, SITE_URL, absoluteUrl, toPlainText } from '$lib/seo/site';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const article = $derived(data.article);
	const description = $derived(toPlainText(article.lede));
	// Article satirique (schema.org SatiricalArticle) : la parodie est dite aux moteurs
	const jsonLd = $derived({
		'@context': 'https://schema.org',
		'@type': 'SatiricalArticle',
		headline: article.title.slice(0, 110),
		description,
		datePublished: article.date,
		inLanguage: 'fr',
		url: absoluteUrl(`/shtam/${article.slug}`),
		image: absoluteUrl(DEFAULT_OG_IMAGE),
		author: { '@type': 'Person', name: article.byline },
		publisher: {
			'@type': 'Organization',
			name: SITE_NAME,
			url: SITE_URL,
			logo: { '@type': 'ImageObject', url: absoluteUrl('/apple-touch-icon.png') }
		},
		isPartOf: { '@type': 'Periodical', name: 'Le Shtam', url: absoluteUrl('/shtam') }
	});
</script>

<SeoHead title="{article.title} — Le Shtam" {description} type="article" />
<JsonLd data={jsonLd} />

<article class="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 py-10 sm:px-6">
	<a
		href={resolve('/shtam')}
		class="serif self-start rounded-sm text-lg font-bold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
	>
		← Le Shtam
	</a>

	<header class="flex flex-col gap-3 border-b pb-6">
		<div class="text-xs text-muted-foreground">
			<span class="eyebrow">{article.almanachDate}</span> · {article.gregorianDate}
		</div>
		<h1 class="serif text-3xl leading-tight font-bold sm:text-4xl">{article.title}</h1>
		<div class="text-lg text-muted-foreground"><InlineMarkdown content={article.lede} /></div>
		<div class="text-sm italic">Par {article.byline}</div>
	</header>

	<MarkdownRenderer content={article.body} />

	<!-- Voix de l'Académie : un bloc à part, jamais mêlé à l'article (Compendium §IX) -->
	<aside
		aria-labelledby="vrai-du-faux"
		class="rounded-lg border-l-4 border-primary bg-muted/50 px-5 py-4"
		data-testid="shtam-truth"
	>
		<h2 id="vrai-du-faux" class="mb-2 text-lg font-semibold">Le vrai du faux</h2>
		<MarkdownRenderer content={article.truth} />
	</aside>

	<ShtamFooter />
</article>

<style>
	.serif {
		font-family: 'Lora', Georgia, 'Times New Roman', serif;
	}
	.eyebrow {
		letter-spacing: 0.18em;
		text-transform: uppercase;
	}
</style>
