<script lang="ts">
	/**
	 * Le chapitre, vu par l'élève
	 * ============================
	 *
	 * Rangé par MOMENT du cours — « Préparation », « Le cours », « Les
	 * exercices »… — et non plus par type de ressource. Dans chaque section, les
	 * cinq types se suivent dans l'ordre voulu par le professeur : l'élève
	 * descend la page au lieu de deviner dans quel onglet chercher.
	 *
	 * ⚠️ Le plan arrive DÉJÀ filtré et ordonné par `buildChapterPlan`, côté
	 * serveur. Les sections sans contenu publié n'y figurent pas : ce n'est pas
	 * une règle d'affichage mais de confidentialité — le titre d'une section est
	 * visible dès que le chapitre l'est, alors que son contenu attend sa
	 * publication. Ne pas la ré-implémenter ici, et surtout ne pas la déplacer.
	 */

	import { refreshAll } from '$app/navigation';
	import BackLink from '#lib/components/navigation/BackLink.svelte';
	import * as Card from '#lib/components/ui/card/index.ts';
	import {
		ChapterProgressIndicator,
		ChapterRevisionButton,
		ChapterSeriesCard,
		ChecklistSection
	} from '#lib/components/cours/index.ts';
	import ResourceRow from '#lib/components/cours/ResourceRow.svelte';
	import { documentKind, groupPlanItems } from '#lib/components/cours/plan-groups.ts';
	import { getChapterColorClasses } from '#lib/types/chapters.ts';
	import { BookMarked } from '@lucide/svelte';
	import WorksheetCard from '#lib/components/student/worksheets/WorksheetCard.svelte';
	import type { PageData, ActionData } from './$types';

	// Types
	type PlanItem = PageData['plan'][number]['items'][number];

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();

	let colorClasses = $derived(getChapterColorClasses(data.chapter.color));

	/**
	 * Documents et exercices s'affichent en lignes compactes, regroupées dans un
	 * même cadre ; fiches (échéance, état), objectifs (cases) et séries restent
	 * des blocs. Même rendu que le lien de consultation.
	 */
	function isRow(item: PlanItem): boolean {
		return item.kind === 'document' || item.kind === 'exercise';
	}

	/** Comme `DocumentCard` : fichier servi par `/api/documents`, Drive en lien externe. */
	function documentHrefs(doc: Extract<PlanItem, { kind: 'document' }>['document']) {
		if (doc.sourceType === 'google_drive') return { view: doc.googleDriveUrl, download: null };
		if (!doc.storagePath) return { view: null, download: null };
		return { view: `/api/documents/${doc.id}`, download: `/api/documents/${doc.id}?download` };
	}

	/** Le plan est vide tant que rien n'est publié — pas quand rien n'existe. */
	let planVide = $derived(data.plan.length === 0);

	$effect(() => {
		if (form?.success) {
			refreshAll();
		}
	});
</script>

<svelte:head>
	<title>{data.chapter.title} | Cours | Chiphre</title>
</svelte:head>

<main class="container mx-auto max-w-4xl px-4 py-6">
	<div class="mb-6">
		<BackLink href="/dashboard/student/cours" label="Retour aux cours" />
		<p class="text-sm text-muted-foreground">
			{data.className}
		</p>
	</div>

	<!-- Chapitre : un bandeau, comme sur le lien de consultation. -->
	<div class="mb-8 space-y-4 border-b-2 border-foreground pb-4">
		<!-- Sur téléphone, la progression passe sous le titre : à côté, elle l'écrase. -->
		<div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
			<div class="min-w-0 flex-1 space-y-1.5">
				<p class="text-xs font-semibold tracking-wider uppercase {colorClasses.text}">Chapitre</p>
				<h1 class="text-2xl! leading-tight! text-balance">{data.chapter.title}</h1>
				{#if data.chapter.description}
					<p class="text-muted-foreground">{data.chapter.description}</p>
				{/if}
			</div>
			<ChapterProgressIndicator progress={data.chapter.progress} />
		</div>
		{#if data.revisionDeck && data.revisionDeck.deckSize > 0}
			<ChapterRevisionButton chapterId={data.chapter.id} deck={data.revisionDeck} />
		{/if}
	</div>

	{#if data.worksheetsUnavailable}
		<!--
			Une panne de lecture ne doit pas se lire « chapitre vide » : ce message
			accuserait le professeur de n'avoir rien mis alors que la base n'a pas
			répondu.
		-->
		<Card.Root class="mb-6 border-dashed">
			<Card.Content class="py-4 text-center text-sm text-muted-foreground">
				Une partie du chapitre n'a pas pu être chargée. Réessaie dans un instant.
			</Card.Content>
		</Card.Root>
	{/if}

	{#if planVide}
		<Card.Root>
			<Card.Content class="py-12 text-center">
				<BookMarked class="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
				<p class="text-muted-foreground">Ce chapitre ne contient encore rien pour toi.</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="flex flex-col gap-6">
			{#each data.plan as section (section.id)}
				<section class="flex flex-col gap-2">
					<!--
						« Non classé » n'a pas de titre : l'élève voit les ressources, pas
						l'étiquette du rangement en cours du professeur.
					-->
					{#if section.title}
						<!-- Section : une étiquette, plus petite que les ressources qu'elle range. -->
						<h2
							class="[font-family:inherit] text-xs! leading-normal! font-semibold tracking-wider text-muted-foreground uppercase"
						>
							{section.title}
						</h2>
					{/if}

					{#each groupPlanItems(section.items, isRow) as group, groupIndex (`${section.id}-${groupIndex}`)}
						{#if group.kind === 'rows'}
							<ul class="divide-y overflow-hidden rounded-xl border bg-card">
								{#each group.items as item, itemIndex (`${section.id}-${groupIndex}-${itemIndex}`)}
									{#if item.kind === 'document'}
										{@const hrefs = documentHrefs(item.document)}
										<ResourceRow
											title={item.document.title}
											description={item.document.description}
											kind={documentKind(item.document.sourceType, item.document.mimeType)}
											href={hrefs.view}
											newTab
											downloadHref={hrefs.download}
										/>
									{:else if item.kind === 'exercise'}
										<ResourceRow
											title={item.title}
											kind="exercise"
											href="/dashboard/student/exercises/{item.exerciseId}"
										/>
									{/if}
								{/each}
							</ul>
						{:else if group.item.kind === 'worksheet'}
							<WorksheetCard worksheet={group.item.worksheet} />
						{:else if group.item.kind === 'checklist'}
							<ChecklistSection items={group.item.items} progress={data.chapter.progress} />
						{:else if group.item.kind === 'series'}
							<ChapterSeriesCard series={group.item.series} />
						{/if}
					{/each}
				</section>
			{/each}
		</div>
	{/if}
</main>
