<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { ChevronDown, FileDown, TriangleAlert } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { toaster } from '$lib/stores/toaster.svelte';
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import BackLink from '$lib/components/navigation/BackLink.svelte';
	import GuideTaskCard from '$lib/components/calculatrices/GuideTaskCard.svelte';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import { Badge } from '$lib/components/ui/badge';
	import { GRADE_LABELS } from '$lib/calculatrices/levels';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const title = $derived(`${data.model.name} — ${data.gradeLabel}`);
	let isGeneratingPdf = $state(false);

	const isEmpty = $derived(
		data.kind === 'guide' && data.guide.own.length === 0 && data.guide.recalls.length === 0
	);

	/** Fiche PDF : compilée dans le navigateur, chargée au clic seulement (page légère) */
	async function downloadPdf() {
		if (data.kind !== 'guide') return;
		isGeneratingPdf = true;
		try {
			const [{ generateGuideTypst }, { generateAndDownloadPdf }] = await Promise.all([
				import('$lib/calculatrices/typst'),
				import('$lib/typst/pdf-generator')
			]);
			const guide = data.guide;
			const result = await generateAndDownloadPdf(
				() => generateGuideTypst({ guide, model: data.model, gradeLabel: data.gradeLabel }),
				`guide-${data.model.slug}-${page.params.niveau}.pdf`
			);
			if (!result.success) {
				toaster.error('La fiche PDF n’a pas pu être créée.');
				console.error('[calculatrices] PDF', result.error);
			}
		} catch (cause) {
			// Import à la volée impossible (hors ligne, nouveau déploiement) : le dire
			toaster.error('La fiche PDF n’a pas pu être créée. Recharge la page et réessaie.');
			console.error('[calculatrices] PDF', cause);
		} finally {
			isGeneratingPdf = false;
		}
	}
</script>

<SeoHead
	title="Guide {title} | Chiphre"
	description="Où trouver chaque outil du programme de {data.gradeLabel} sur la {data.model
		.name} : touches, menus et pièges."
	noindex={data.kind !== 'guide' || isEmpty}
/>

<div class="container mx-auto max-w-3xl p-4">
	<BackLink href="/calculatrices/{data.model.slug}" label="Retour à la {data.model.name}" />
	<div class="mb-4 flex flex-wrap items-center justify-between gap-3">
		<h1 class="text-2xl font-bold">{title}</h1>
		{#if data.kind === 'guide' && !isEmpty}
			<Button variant="outline" onclick={downloadPdf} disabled={isGeneratingPdf}>
				<FileDown class="size-4" aria-hidden="true" />
				{isGeneratingPdf ? 'Création de la fiche…' : 'Télécharger la fiche PDF'}
			</Button>
		{/if}
	</div>

	{#if data.kind === 'guide'}
		{#if isEmpty}
			<p class="text-muted-foreground">Ce guide n’est pas encore prêt.</p>
		{:else}
			{#if data.guide.own.length > 0}
				<section class="mb-8 space-y-3" aria-labelledby="niveau">
					<h2 id="niveau" class="text-lg font-semibold">Nouveau en {data.gradeLabel}</h2>
					{#each data.guide.own as entry (entry.task.id)}
						<GuideTaskCard {entry} keys={data.model.keys} modelName={data.model.name} />
					{/each}
				</section>
			{/if}

			{#if data.guide.recalls.length > 0}
				<section class="mb-8 space-y-2" aria-labelledby="rappels">
					<h2 id="rappels" class="text-lg font-semibold">Rappels des années précédentes</h2>
					{#each data.guide.recalls as recall (recall.grade)}
						<Collapsible.Root class="rounded-lg border">
							<Collapsible.Trigger
								class="group flex w-full items-center justify-between p-3 text-left font-medium"
							>
								{GRADE_LABELS[recall.grade]}
								<ChevronDown
									class="size-4 transition-transform group-data-[state=open]:rotate-180"
									aria-hidden="true"
								/>
							</Collapsible.Trigger>
							<Collapsible.Content class="space-y-3 p-3 pt-0">
								{#each recall.entries as entry (entry.task.id)}
									<GuideTaskCard {entry} keys={data.model.keys} modelName={data.model.name} />
								{/each}
							</Collapsible.Content>
						</Collapsible.Root>
					{/each}
				</section>
			{/if}

			{#if data.guide.pitfalls.length > 0}
				<section class="space-y-3" aria-labelledby="pieges">
					<h2 id="pieges" class="flex items-center gap-2 text-lg font-semibold">
						<TriangleAlert class="size-5 text-amber-600" aria-hidden="true" />
						Les pièges
					</h2>
					{#each data.guide.pitfalls as pitfall (pitfall.id)}
						<div class="rounded-lg border border-amber-300 bg-amber-50 p-4 dark:bg-amber-950/40">
							<div class="mb-1 flex flex-wrap items-center gap-2">
								<h3 class="font-semibold">{pitfall.title}</h3>
								{#if !pitfall.verifiedOnDevice}
									<Badge variant="outline">Non relu sur la machine</Badge>
								{/if}
							</div>
							<p class="text-sm">{pitfall.explanation}</p>
						</div>
					{/each}
				</section>
			{/if}
		{/if}
	{:else}
		<p class="mb-4">
			{#if data.kind === 'grade-without-guide'}
				{data.reason}
			{:else}
				La {data.model.name} n’a pas de guide pour ce niveau.
			{/if}
		</p>
		{#if data.otherGrades.length > 0}
			<p class="mb-2 text-muted-foreground">Niveaux disponibles :</p>
			<ul class="flex flex-wrap gap-2">
				{#each data.otherGrades as grade (grade.slug)}
					<li>
						<a
							href={resolve('/(public)/calculatrices/[modele]/[niveau]', {
								modele: data.model.slug,
								niveau: grade.slug
							})}
							class="inline-block rounded-md border px-3 py-1.5 hover:bg-muted">{grade.label}</a
						>
					</li>
				{/each}
			</ul>
		{/if}
	{/if}
</div>
