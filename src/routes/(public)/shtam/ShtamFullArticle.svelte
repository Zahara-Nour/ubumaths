<!-- Un article en entier, sur une page intérieure du journal : corps en colonnes, puis son vrai du faux -->
<script lang="ts">
	import { resolve } from '$app/paths';
	import InlineMarkdown from '$lib/components/markdown/InlineMarkdown.svelte';
	import MarkdownRenderer from '$lib/components/markdown/MarkdownRenderer.svelte';
	import type { ShtamArticleView } from '$lib/server/shtam/present';

	// Types

	interface Props {
		article: ShtamArticleView;
	}

	// Props

	let { article }: Props = $props();
</script>

<article id={article.slug} class="flex scroll-mt-6 flex-col gap-4" data-testid="shtam-full-article">
	<header class="flex flex-col gap-2">
		<div class="text-xs text-muted-foreground">
			<span class="eyebrow">{article.almanachDate}</span> · {article.gregorianDate}
		</div>
		<h2 class="serif text-3xl leading-tight font-bold">{article.title}</h2>
		<div class="serif text-lg text-muted-foreground italic">
			<InlineMarkdown content={article.lede} />
		</div>
		<div class="flex flex-wrap items-baseline justify-between gap-2 text-sm">
			<span class="italic">Par {article.byline}</span>
			<a
				href={resolve('/(public)/shtam/[slug]', { slug: article.slug })}
				class="rounded-sm text-muted-foreground underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
			>
				Page de l’article
			</a>
		</div>
	</header>

	<div class="columns-journal">
		<MarkdownRenderer content={article.body} />
	</div>

	<!-- Voix de l'Académie : un bloc à part, jamais mêlé à l'article (Compendium §IX) -->
	<aside
		aria-labelledby="vrai-du-faux-{article.slug}"
		class="rounded-lg border-l-4 border-primary bg-muted/50 px-5 py-4"
	>
		<h3 id="vrai-du-faux-{article.slug}" class="mb-2 text-lg font-semibold">Le vrai du faux</h3>
		<MarkdownRenderer content={article.truth} />
	</aside>
</article>

<style>
	.serif {
		font-family: 'Lora', Georgia, 'Times New Roman', serif;
	}
	.eyebrow {
		letter-spacing: 0.18em;
		text-transform: uppercase;
	}
	/* Deux colonnes de journal dès qu'il y a la place ; les figures ne se coupent pas */
	@media (min-width: 48rem) {
		.columns-journal {
			column-count: 2;
			column-gap: 2rem;
			column-rule: 1px solid var(--color-border);
			text-align: justify;
			hyphens: auto;
		}
		.columns-journal :global(img),
		.columns-journal :global(figure),
		.columns-journal :global(table) {
			break-inside: avoid;
		}
	}
</style>
