<script lang="ts">
	/**
	 * Suivi d'un élève, vu par le professeur. Bloc « Points du programme » :
	 * par point travaillé, le badge FSRS et deux comptes de traces, corrigées
	 * (l'appli ou un adulte a jugé) et déclarées (l'élève a dit « je sais »).
	 * Aucune date (vie privée).
	 *
	 * Phase 0 : docs/wip/suivi-eleve-progress.md
	 */
	import { lore } from '$lib/config/lore';
	import { AlertCircle, RefreshCw, Clock, CheckCircle, Circle } from '@lucide/svelte';
	import BackLink from '$lib/components/navigation/BackLink.svelte';
	import InlineMarkdown from '$lib/components/markdown/InlineMarkdown.svelte';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { studentJournalHref } from '$lib/navigation/return-links';
	import type { CurriculumPointBadge } from '$lib/server/srs/curriculum-point-badge';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	type Point = PageData['points'][number];
	type Notion = { name: string | null; points: Point[] };
	type Branch = { name: string | null; notions: Notion[] };

	// Les points arrivent dans l'ordre de l'arbre : on regroupe les voisins.
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

	function badgeMeta(badge: CurriculumPointBadge) {
		return (
			{
				a_remedier: { icon: AlertCircle, color: 'text-red-600', label: 'À remédier' },
				a_renforcer: { icon: RefreshCw, color: 'text-amber-600', label: 'À renforcer' },
				en_apprentissage: { icon: Clock, color: 'text-blue-600', label: 'En apprentissage' },
				acquise_en_memoire: { icon: CheckCircle, color: 'text-emerald-600', label: 'Acquise' },
				non_commencee: { icon: Circle, color: 'text-muted-foreground', label: 'Non commencée' }
			} as const
		)[badge];
	}

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
	<BackLink href="/dashboard/teacher/classes" label="Retour aux {lore.entities.class}s" />

	<h1 class="mb-6 text-3xl font-bold tracking-tight">Suivi de {data.student.fullName}</h1>

	<Card.Root>
		<Card.Header>
			<Card.Title>Points du programme</Card.Title>
			<Card.Description>
				Les points de son niveau qu’il a travaillés, dans l’ordre du programme.
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
					{#each branches as branch (branch.name)}
						<section>
							<h2 class="mb-2 text-lg font-semibold">{branch.name ?? 'Autres points'}</h2>
							<div class="space-y-4">
								{#each branch.notions as notion (notion.name)}
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

	<p class="mt-6 text-sm">
		<a
			class="text-primary underline-offset-4 hover:underline"
			href={studentJournalHref(data.student.id, 'suivi')}
		>
			Journal des récompenses
		</a>
	</p>
</div>
