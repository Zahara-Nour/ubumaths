<script lang="ts">
	/**
	 * Suivi d'un élève, vu par le professeur. Quatre blocs, chacun lu à part :
	 *   - Points du programme : par point travaillé, le badge FSRS et deux
	 *     comptes de traces, corrigées (l'appli ou un adulte a jugé) et déclarées
	 *     (l'élève a dit « je sais ») ;
	 *   - Contrôles : meilleure note ou statut, lien vers les résultats ;
	 *   - Régularité : sa ligne de la grille C (paliers par semaine) ;
	 *   - Compétences : son niveau dans chacune.
	 * Aucune date d'activité (vie privée).
	 *
	 * Phase 0 : docs/wip/suivi-eleve-progress.md
	 */
	import { lore } from '$lib/config/lore';
	import BackLink from '$lib/components/navigation/BackLink.svelte';
	import InlineMarkdown from '$lib/components/markdown/InlineMarkdown.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import {
		evaluationResultsHref,
		studentFollowUpReturn,
		studentJournalHref
	} from '$lib/navigation/return-links';
	import { badgeMeta } from '$lib/components/teacher/analytics/curriculum-point-badge-meta';
	import RegularityTable from '$lib/components/teacher/analytics/RegularityTable.svelte';
	import { formatGrade, type StudentEvaluationStatus } from '$lib/types/evaluation';
	import { formatMathCompetenceLevel, getMathCompetenceLevelVisual } from '$lib/types/skills';
	import { page } from '$app/state';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const STATUS_LABELS: Record<StudentEvaluationStatus, string> = {
		not_started: 'Pas commencé',
		in_progress: 'En cours',
		completed: 'Rendu',
		expired: 'Non rendu, date limite passée'
	};

	// Deux parents : la liste des classes, ou l'analytique d'une classe (grille A)
	const back = $derived(studentFollowUpReturn(page.url.searchParams));

	// La ligne de régularité, au format du tableau partagé avec la grille C
	const regularityRows = $derived(
		data.regularity
			? [{ id: data.student.id, display_name: data.student.fullName, tiers: data.regularity.tiers }]
			: []
	);

	type Point = PageData['points'][number];
	type Notion = { name: string | null; points: Point[] };
	type Branch = { name: string | null; notions: Notion[] };

	// Les points arrivent dans l'ordre de l'arbre : on regroupe les voisins. Un même
	// nom peut revenir plus loin (notions homonymes) : les listes sont clées par position.
	const branches = $derived.by(() => {
		const result: Branch[] = [];
		for (const point of data.points) {
			let branch = result[result.length - 1];
			if (!branch || branch.name !== point.branch_name) {
				branch = { name: point.branch_name, notions: [] };
				result.push(branch);
			}
			let notion = branch.notions[branch.notions.length - 1];
			if (!notion || notion.name !== point.notion_name) {
				notion = { name: point.notion_name, points: [] };
				branch.notions.push(notion);
			}
			notion.points.push(point);
		}
		return result;
	});

	function countPhrase(label: string, count: { done: number; succeeded: number }): string {
		const succeeded = count.succeeded > 1 ? 'réussies' : 'réussie';
		return `${label} : ${count.succeeded} ${succeeded} sur ${count.done}`;
	}

	// « Corrigé : 4 réussies sur 6 · Déclaré : 3 réussies sur 3 », une moitié à 0 omise.
	function countsText(point: Point): string {
		const parts: string[] = [];
		if (point.proved.done > 0) parts.push(countPhrase('Corrigé', point.proved));
		if (point.declared.done > 0) parts.push(countPhrase('Déclaré', point.declared));
		return parts.join(' · ');
	}
</script>

<svelte:head>
	<title>Suivi de {data.student.fullName} | Chiphre</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-6">
	<BackLink href={back.href} label={back.label} />

	<h1 class="mb-6 text-3xl font-bold tracking-tight">Suivi de {data.student.fullName}</h1>

	<Card.Root>
		<Card.Header>
			<Card.Title>Points du programme</Card.Title>
			<Card.Description>
				Les points de son niveau déjà travaillés, dans l’ordre du programme.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if data.pointsError}
				<p class="text-sm text-destructive">
					Les points du programme n’ont pas pu être lus. Réessaie dans un moment.
				</p>
			{:else if branches.length === 0}
				<p class="py-6 text-center text-sm text-muted-foreground">Pas encore de point travaillé.</p>
			{:else}
				<div class="space-y-6">
					{#each branches as branch, branchIndex (branchIndex)}
						<section>
							<h2 class="mb-2 text-lg font-semibold">{branch.name ?? 'Autres points'}</h2>
							<div class="space-y-4">
								{#each branch.notions as notion, notionIndex (notionIndex)}
									<div>
										<h3 class="mb-1 text-sm font-medium text-muted-foreground">
											{notion.name ?? 'Sans notion'}
										</h3>
										<ul class="divide-y divide-border/50">
											{#each notion.points as point (point.id)}
												{@const meta = badgeMeta(point.badge)}
												{@const counts = countsText(point)}
												<li class="flex items-start gap-3 py-2">
													<span class="mt-0.5 shrink-0 {meta.color}" title={meta.label}>
														<meta.icon class="h-4 w-4" aria-label={meta.label} />
													</span>
													<div class="min-w-0 flex-1">
														<p class="text-sm"><InlineMarkdown content={point.name} /></p>
														{#if counts || point.onlyDeclared}
															<p
																class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"
															>
																{#if counts}<span>{counts}</span>{/if}
																{#if point.onlyDeclared}
																	<Badge variant="outline" class="text-[0.65rem]"
																		>seulement déclaré</Badge
																	>
																{/if}
															</p>
														{/if}
													</div>
												</li>
											{/each}
										</ul>
									</div>
								{/each}
							</div>
						</section>
					{/each}
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root class="mt-6">
		<Card.Header>
			<Card.Title>Contrôles</Card.Title>
			<Card.Description>Sa meilleure note à chaque contrôle qui lui est assigné.</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if data.evaluationsError}
				<p class="text-sm text-destructive">
					Les contrôles n’ont pas pu être lus. Réessaie dans un moment.
				</p>
			{:else if data.evaluations.length === 0}
				<p class="py-6 text-center text-sm text-muted-foreground">Aucun contrôle assigné.</p>
			{:else}
				<ul class="divide-y divide-border/50">
					{#each data.evaluations as evaluation (evaluation.evaluation_id)}
						<li class="flex items-center justify-between gap-3 py-2 text-sm">
							<a
								class="min-w-0 truncate text-primary underline-offset-4 hover:underline"
								href={evaluationResultsHref(evaluation.evaluation_id, data.student.id)}
								>{evaluation.title}</a
							>
							<span class="shrink-0 font-medium">
								{#if evaluation.best_grade !== null}
									{formatGrade(evaluation.best_grade)}
								{:else}
									<span class="font-normal text-muted-foreground"
										>{STATUS_LABELS[evaluation.status]}</span
									>
								{/if}
							</span>
						</li>
					{/each}
				</ul>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root class="mt-6">
		<Card.Header>
			<Card.Title>Régularité</Card.Title>
			<Card.Description>
				Jours actifs par semaine depuis la rentrée. Un jour est actif quand l'{lore.entities
					.student} donne au moins 5 réponses en travail autonome ; les contrôles ne comptent pas.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if !data.regularity}
				<p class="text-sm text-destructive">
					La régularité n’a pas pu être lue. Réessaie dans un moment.
				</p>
			{:else}
				<RegularityTable weeks={data.regularity.weeks} students={regularityRows} />
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root class="mt-6">
		<Card.Header>
			<Card.Title>Compétences</Card.Title>
			<Card.Description>Son niveau dans chaque compétence.</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if data.competencesError}
				<p class="text-sm text-destructive">
					Les compétences n’ont pas pu être lues. Réessaie dans un moment.
				</p>
			{:else if data.competences.length === 0}
				<p class="py-6 text-center text-sm text-muted-foreground">Aucune compétence.</p>
			{:else}
				<ul class="divide-y divide-border/50">
					{#each data.competences as competence (competence.id)}
						{@const label = competence.level
							? formatMathCompetenceLevel(competence.level)
							: 'pas encore évaluée'}
						<li class="flex items-center justify-between gap-3 py-2 text-sm">
							<span>{competence.name}</span>
							<span class="flex shrink-0 items-center gap-2 text-muted-foreground">
								<span aria-hidden="true"
									>{competence.level ? getMathCompetenceLevelVisual(competence.level) : '◯'}</span
								>
								{label}
							</span>
						</li>
					{/each}
				</ul>
			{/if}
		</Card.Content>
	</Card.Root>

	<p class="mt-6 text-sm">
		<a
			class="text-primary underline-offset-4 hover:underline"
			href={studentJournalHref(data.student.id, 'suivi')}
		>
			Journal des récompenses
		</a>
	</p>
</div>
