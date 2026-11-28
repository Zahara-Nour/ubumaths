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

	Mise en page (2026-11-23) : chapitre en bandeau, section en étiquette,
	documents et fiches en lignes compactes (`ResourceRow`, regroupées par
	`groupPlanItems`). Réutilise `ChapterSeriesCard` (l'entraînement libre
	n'exige pas de compte). Fiches et objectifs ont leur
	rendu propre : `WorksheetCard` et `ChecklistSection` supposent un élève
	connecté (échéance, cases à cocher).
-->
<script lang="ts">
	import * as Card from '#lib/components/ui/card/index.ts';
	import { ChapterSeriesCard } from '#lib/components/cours/index.ts';
	import ResourceRow from '#lib/components/cours/ResourceRow.svelte';
	import { documentKind, groupPlanItems } from '#lib/components/cours/plan-groups.ts';
	import { getChapterColorClasses, type ChapterColor } from '#lib/types/chapters.ts';
	import { GRADES, isGradeCode } from '#lib/types/grades.ts';
	import { Target } from '@lucide/svelte';
	import type { PageData } from './$types';

	// Types
	type PlanItem = PageData['course']['chapters'][number]['plan'][number]['items'][number];
	type PublicDocument = Extract<PlanItem, { kind: 'document' }>['document'];

	let { data }: { data: PageData } = $props();

	/** Le niveau en toutes lettres (« 1ère spécialité maths ») ; un code inconnu reste tel quel. */
	const niveau = $derived(
		data.course.classGrade && isGradeCode(data.course.classGrade)
			? GRADES[data.course.classGrade].displayName
			: data.course.classGrade
	);
	const title = $derived(niveau ? `${data.course.className} · ${niveau}` : data.course.className);

	/** Les fichiers passent par le serveur (URL signée courte) ; Drive reste externe. */
	function documentHrefs(doc: PublicDocument) {
		if (doc.sourceType === 'google_drive') {
			return { view: doc.googleDriveUrl, download: null };
		}
		const base = `/cours/${data.token}/document/${doc.id}`;
		return { view: base, download: `${base}?download` };
	}

	/** Documents et fiches s'affichent en lignes ; objectifs et séries restent des blocs. */
	function isRow(item: PlanItem): boolean {
		return item.kind === 'document' || item.kind === 'worksheet';
	}

	/** « 4 ressources » : ce que contient un chapitre, pour le sommaire. */
	function nombreDeRessources(chapter: PageData['course']['chapters'][number]): string {
		const n = chapter.plan.reduce((total, section) => total + section.items.length, 0);
		return n > 1 ? `${n} ressources` : `${n} ressource`;
	}
</script>

<svelte:head>
	<title>Cours — {title}</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="mx-auto flex w-full max-w-3xl flex-col gap-10 p-4">
	<header class="space-y-1">
		<h1 class="text-3xl! leading-tight!">Cours de mathématiques</h1>
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
			<ol class="flex flex-col gap-2">
				{#each data.course.chapters as chapter, index (chapter.id)}
					<li>
						<a
							href="#chapitre-{chapter.id}"
							class="flex items-center gap-3 rounded-xl border bg-card px-3.5 py-3 transition-colors hover:bg-muted/60 focus-visible:outline-2 focus-visible:outline-ring"
						>
							<span
								class="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-semibold text-primary tabular-nums"
							>
								{index + 1}
							</span>
							<span class="min-w-0 flex-1 font-medium">{chapter.title}</span>
							<span class="text-sm whitespace-nowrap text-muted-foreground">
								{nombreDeRessources(chapter)}
							</span>
						</a>
					</li>
				{/each}
			</ol>
		</nav>

		{#each data.course.chapters as chapter, index (chapter.id)}
			{@const colorClasses = getChapterColorClasses(chapter.color as ChapterColor | null)}
			<section id="chapitre-{chapter.id}" class="flex scroll-mt-4 flex-col gap-6">
				<!-- Chapitre : un bandeau, pour qu'on voie qu'on change de chapitre. -->
				<div class="space-y-1.5 border-b-2 border-foreground pb-3.5">
					<p class="text-xs font-semibold tracking-wider uppercase {colorClasses.text}">
						Chapitre {index + 1}
					</p>
					<h2 class="text-2xl! leading-tight! text-balance">{chapter.title}</h2>
					{#if chapter.description}
						<p class="text-muted-foreground">{chapter.description}</p>
					{/if}
				</div>

				{#if chapter.plan.length === 0}
					<p class="text-sm text-muted-foreground">Ce chapitre ne contient encore rien.</p>
				{:else}
					{#each chapter.plan as section (section.id)}
						<div class="flex flex-col gap-2">
							<!-- « Non classé » n'a pas de titre : on voit les ressources, pas l'étiquette. -->
							{#if section.title}
								<!-- Section : une étiquette, plus petite que les ressources qu'elle range. -->
								<h3
									class="[font-family:inherit] text-xs! leading-normal! font-semibold tracking-wider text-muted-foreground uppercase"
								>
									{section.title}
								</h3>
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
											{:else if item.kind === 'worksheet'}
												<ResourceRow
													title={item.title}
													kind="worksheet"
													href="/cours/{data.token}/fiche/{item.worksheetId}"
												/>
											{/if}
										{/each}
									</ul>
								{:else if group.item.kind === 'checklist'}
									<!-- Texte seul : sans compte, aucune progression à cocher. -->
									<Card.Root>
										<Card.Content class="space-y-2 p-4">
											<div class="flex items-center gap-2 text-sm font-medium">
												<Target class="h-4 w-4" aria-hidden="true" />
												Objectifs
											</div>
											<ul class="list-disc space-y-1 pl-6 text-sm">
												{#each group.item.items as objectif (objectif.id)}
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
								{:else if group.item.kind === 'series'}
									<ChapterSeriesCard series={group.item.series} />
								{/if}
							{/each}
						</div>
					{/each}
				{/if}
			</section>
		{/each}
	{/if}

	<p class="text-center text-xs text-muted-foreground">
		Lien de consultation. Il ne permet pas de rejoindre la classe ni de se connecter.
	</p>
</div>
