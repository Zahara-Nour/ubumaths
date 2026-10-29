<script lang="ts">
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import BackLink from '$lib/components/navigation/BackLink.svelte';
	import InlineMarkdown from '$lib/components/markdown/InlineMarkdown.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';
	import { GRADES } from '$lib/types/grades';
	import { termLabel } from '$lib/dictionary/glossary-page';
	import { resolve } from '$app/paths';
	import type { GradedField } from '$lib/dictionary/model';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// ===== Functions =====

	/** Chaque contenu avec son niveau : la page montre la progression entière, du premier niveau au dernier. */
	function byGrade(field: GradedField | undefined): { grade: string; content: string }[] {
		return (field?.items ?? []).map((item) => ({
			grade: GRADES[item.grade].displayName,
			content: item.content
		}));
	}

	// ===== Derived =====

	let term = $derived(data.term);
	let definitions = $derived(byGrade(term.definitions));
	let exemples = $derived(byGrade(term.exemples));
</script>

<SeoHead title="{termLabel(term)} : définition | Chiphre" description={data.description} />

<div class="mx-auto max-w-3xl p-4 md:p-6">
	<BackLink href="/glossaire" label="Retour au glossaire" />

	<h1 class="mt-2 text-3xl font-bold text-foreground">
		{term.term}{#if term.sense}<span class="ml-2 text-xl font-normal text-muted-foreground italic"
				>({term.sense})</span
			>{/if}
	</h1>

	<div class="mt-3 flex flex-wrap items-center gap-2">
		<Badge variant="secondary">{GRADES[term.grade].displayName}</Badge>
		{#each term.tags as tag (tag)}
			<Badge variant="outline" class="text-xs">{tag}</Badge>
		{/each}
	</div>

	<Separator class="my-6" />

	<div class="space-y-6">
		{#if data.cited}
			<p class="text-muted-foreground">
				Voir :
				<a
					href={resolve(`/glossaire/${data.cited.slug}`)}
					class="font-medium text-primary underline"
				>
					{termLabel(data.cited.term)}
				</a>
			</p>
		{/if}

		{#if definitions.length > 0}
			<section>
				<h2 class="mb-2 text-lg font-semibold">
					Définition{definitions.length > 1 ? 's' : ''}
				</h2>
				<dl class="space-y-3">
					{#each definitions as def, i (i)}
						<div>
							<dt class="text-xs font-medium text-muted-foreground">{def.grade}</dt>
							<dd><InlineMarkdown content={def.content} /></dd>
						</div>
					{/each}
				</dl>
			</section>
		{/if}

		{#if exemples.length > 0}
			<section>
				<h2 class="mb-2 text-lg font-semibold">Exemple{exemples.length > 1 ? 's' : ''}</h2>
				<dl class="space-y-3">
					{#each exemples as ex, i (i)}
						<div>
							<dt class="text-xs font-medium text-muted-foreground">{ex.grade}</dt>
							<dd><InlineMarkdown content={ex.content} /></dd>
						</div>
					{/each}
				</dl>
			</section>
		{/if}

		{#if term.history}
			<section>
				<h2 class="mb-2 text-lg font-semibold">Histoire</h2>
				<InlineMarkdown content={term.history} />
			</section>
		{/if}

		{#if term.synonyms && term.synonyms.length > 0}
			<section>
				<h2 class="mb-2 text-lg font-semibold">Synonymes</h2>
				<p>{term.synonyms.join(', ')}</p>
			</section>
		{/if}

		{#if term.seeAlso}
			<section>
				<h2 class="mb-2 text-lg font-semibold">Voir aussi</h2>
				<a href={resolve(term.seeAlso.path)} class="text-primary underline">{term.seeAlso.label}</a>
			</section>
		{/if}
	</div>
</div>
