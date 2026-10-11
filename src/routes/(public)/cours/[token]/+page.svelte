<!--
	« Mon cours » public (ADR 0025)
	===============================

	Ce que voit un élève ou une famille sans compte : les chapitres visibles
	d'une classe et, pour chacun, son plan — sections dans l'ordre du
	professeur, contenus publiés seulement. Rien d'autre : pas de navigation
	vers le reste de l'application, pas de connexion suggérée, pas d'exercice
	noté, pas de révision, pas de progression.

	Le plan arrive DÉJÀ rangé par le serveur (`buildPublicCourseView`) ; la base
	n'a rendu que ce qui est publié. Ne rien filtrer ici.

	Réutilise `DocumentCard` (adresses du lien imposées) et `ChapterSeriesCard`
	(l'entraînement libre n'exige pas de compte). Fiches et objectifs ont leur
	rendu propre : `WorksheetCard` et `ChecklistSection` supposent un élève
	connecté (échéance, cases à cocher).
-->
<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { ChapterSeriesCard, DocumentCard } from '$lib/components/cours';
	import { getChapterColorClasses, type ChapterColor } from '$lib/types/chapters';
	import { BookMarked, FileText, Target } from '@lucide/svelte';
	import type { PageData } from './$types';

	type PlanItem = PageData['course']['chapters'][number]['plan'][number]['items'][number];
	type PublicDocument = Extract<PlanItem, { kind: 'document' }>['document'];

	let { data }: { data: PageData } = $props();

	const title = $derived(
		data.course.classGrade
			? `${data.course.className} · ${data.course.classGrade}`
			: data.course.className
	);

	/** Les fichiers passent par le serveur (URL signée courte) ; Drive reste externe. */
	function documentHrefs(doc: PublicDocument) {
		if (doc.sourceType === 'google_drive') {
			return { view: doc.googleDriveUrl, download: null };
		}
		const base = `/cours/${data.token}/document/${doc.id}`;
		return { view: base, download: `${base}?download` };
	}
</script>

<svelte:head>
	<title>Cours — {title}</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="mx-auto w-full max-w-4xl space-y-8 p-4">
	<header class="space-y-1">
		<h1 class="text-2xl font-bold">Cours</h1>
		<p class="text-muted-foreground">{title}</p>
	</header>

	{#if data.course.chapters.length === 0}
		<Card.Root>
			<Card.Content class="p-6 text-center text-muted-foreground">
				Aucun chapitre publié pour l'instant.
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- Sommaire : un chapitre se retrouve sans faire défiler toute la page. -->
		<nav aria-label="Chapitres">
			<ol class="space-y-1">
				{#each data.course.chapters as chapter (chapter.id)}
					<li>
						<a href="#chapitre-{chapter.id}" class="underline-offset-4 hover:underline">
							{chapter.title}
						</a>
					</li>
				{/each}
			</ol>
		</nav>

		{#each data.course.chapters as chapter (chapter.id)}
			{@const colorClasses = getChapterColorClasses(chapter.color as ChapterColor | null)}
			<section id="chapitre-{chapter.id}" class="scroll-mt-4 space-y-6">
				<Card.Root class="{colorClasses.border} border-2">
					<Card.Header class={colorClasses.bg}>
						<div class="flex items-center gap-2">
							<BookMarked class="h-6 w-6 {colorClasses.text}" />
							<h2 class="text-xl font-semibold">{chapter.title}</h2>
						</div>
						{#if chapter.description}
							<Card.Description class="text-base">{chapter.description}</Card.Description>
						{/if}
					</Card.Header>
				</Card.Root>

				{#if chapter.plan.length === 0}
					<p class="text-sm text-muted-foreground">Ce chapitre ne contient encore rien.</p>
				{:else}
					<div class="space-y-8">
						{#each chapter.plan as section (section.id)}
							<div class="space-y-4">
								<!-- « Non classé » n'a pas de titre : on voit les ressources, pas l'étiquette. -->
								{#if section.title}
									<h3 class="border-b pb-2 text-lg font-semibold">{section.title}</h3>
								{/if}

								{#each section.items as item, index (`${section.id}-${index}`)}
									{#if item.kind === 'document'}
										<DocumentCard document={item.document} hrefs={documentHrefs(item.document)} />
									{:else if item.kind === 'worksheet'}
										<Card.Root class="transition-shadow hover:shadow-md">
											<Card.Content class="flex items-center gap-3 p-4">
												<FileText
													class="h-5 w-5 shrink-0 text-muted-foreground"
													aria-hidden="true"
												/>
												<span class="min-w-0 flex-1 font-medium">{item.title}</span>
												<Button
													href="/cours/{data.token}/fiche/{item.worksheetId}"
													variant="outline"
													size="sm"
												>
													Ouvrir
												</Button>
											</Card.Content>
										</Card.Root>
									{:else if item.kind === 'checklist'}
										<!-- Texte seul : sans compte, aucune progression à cocher. -->
										<Card.Root>
											<Card.Content class="space-y-2 p-4">
												<div class="flex items-center gap-2 text-sm font-medium">
													<Target class="h-4 w-4" aria-hidden="true" />
													Objectifs
												</div>
												<ul class="list-disc space-y-1 pl-6 text-sm">
													{#each item.items as objectif (objectif.id)}
														<li>
															{objectif.content}
															{#if objectif.description}
																<span class="block text-muted-foreground">
																	{objectif.description}
																</span>
															{/if}
														</li>
													{/each}
												</ul>
											</Card.Content>
										</Card.Root>
									{:else if item.kind === 'series'}
										<ChapterSeriesCard series={item.series} />
									{/if}
								{/each}
							</div>
						{/each}
					</div>
				{/if}
			</section>
		{/each}
	{/if}

	<p class="pt-2 text-center text-xs text-muted-foreground">
		Lien de consultation. Il ne permet pas de rejoindre la classe ni de se connecter.
	</p>
</div>
