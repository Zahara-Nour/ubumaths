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

	import { invalidateAll } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import {
		ChapterProgressIndicator,
		DocumentCard,
		ChecklistSection,
		ChapterQuiz
	} from '$lib/components/cours';
	import { getChapterColorClasses } from '$lib/types/chapters';
	import { ArrowLeft, BookMarked, HelpCircle } from '@lucide/svelte';
	import WorksheetCard from '$lib/components/student/worksheets/WorksheetCard.svelte';
	import type { PageData, ActionData } from './$types';

	interface Props {
		data: PageData;
		form: ActionData;
	}

	let { data, form }: Props = $props();

	let colorClasses = $derived(getChapterColorClasses(data.chapter.color));

	/** Le plan est vide tant que rien n'est publié — pas quand rien n'existe. */
	let planVide = $derived(data.plan.length === 0);

	$effect(() => {
		if (form?.success) {
			invalidateAll();
		}
	});
</script>

<svelte:head>
	<title>{data.chapter.title} | Cours | Chiphre</title>
</svelte:head>

<main class="container mx-auto max-w-4xl px-4 py-6">
	<div class="mb-6">
		<Button variant="ghost" href="/dashboard/student/cours" class="mb-2 -ml-2">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Retour aux cours
		</Button>
		<p class="text-sm text-muted-foreground">
			{data.className}
		</p>
	</div>

	<Card.Root class="mb-6 {colorClasses.border} border-2">
		<Card.Header class={colorClasses.bg}>
			<div class="flex items-start justify-between gap-4">
				<div class="flex-1">
					<div class="mb-2 flex items-center gap-2">
						<BookMarked class="h-6 w-6 {colorClasses.text}" />
						<Card.Title class="text-2xl">{data.chapter.title}</Card.Title>
					</div>
					{#if data.chapter.description}
						<Card.Description class="text-base">
							{data.chapter.description}
						</Card.Description>
					{/if}
				</div>
				<ChapterProgressIndicator progress={data.chapter.progress} />
			</div>
		</Card.Header>
	</Card.Root>

	{#if data.quizUnreadable || data.worksheetsUnavailable}
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
		<div class="space-y-10">
			{#each data.plan as section (section.id)}
				<section class="space-y-4">
					<!--
						« Non classé » n'a pas de titre : l'élève voit les ressources, pas
						l'étiquette du rangement en cours du professeur.
					-->
					{#if section.title}
						<h2 class="border-b pb-2 text-xl font-semibold">{section.title}</h2>
					{/if}

					{#each section.items as item, index (`${section.id}-${index}`)}
						{#if item.kind === 'document'}
							<DocumentCard document={item.document} />
						{:else if item.kind === 'exercise'}
							<Card.Root class="transition-shadow hover:shadow-md">
								<Card.Content class="flex items-center justify-between p-4">
									<h3 class="flex-1 font-medium">{item.title}</h3>
									<Button
										href="/dashboard/student/exercises/{item.exerciseId}"
										variant="outline"
										size="sm"
									>
										Ouvrir
									</Button>
								</Card.Content>
							</Card.Root>
						{:else if item.kind === 'worksheet'}
							<WorksheetCard worksheet={item.worksheet} />
						{:else if item.kind === 'checklist'}
							<ChecklistSection items={item.items} progress={data.chapter.progress} />
						{:else if item.kind === 'quiz'}
							{@const idsDeLaSection = new Set(item.questions.map((q) => q.id))}
							{#if item.questions.some((q) => data.quizInstances[q.id])}
								<ChapterQuiz
									chapterId={data.chapter.id}
									questions={item.questions}
									instances={data.quizInstances}
									unavailable={data.quizUnavailable.filter((u) =>
										idsDeLaSection.has(u.quizQuestionId)
									)}
								/>
							{:else}
								<!--
									Aucune question jouable ici. Le dire plutôt que de laisser un
									blanc : « rien ne s'affiche » enverrait l'élève et le
									professeur chercher au mauvais endroit.
								-->
								<Card.Root>
									<Card.Content class="py-8 text-center text-sm text-muted-foreground">
										<HelpCircle class="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
										Le quiz de cette partie n'est pas disponible pour le moment.
									</Card.Content>
								</Card.Root>
							{/if}
						{/if}
					{/each}
				</section>
			{/each}
		</div>
	{/if}
</main>
