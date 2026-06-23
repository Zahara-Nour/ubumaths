<script lang="ts">
	/**
	 * Student Competences Math — list page
	 */

	import * as Card from '$lib/components/ui/card';
	import { Brain, ChevronRight } from '@lucide/svelte';
	import {
		formatMathCompetenceLevel,
		getMathCompetenceLevelVisual,
		type MathCompetenceLevel
	} from '$lib/types/skills';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	function bgClass(n: MathCompetenceLevel): string {
		if (n === 'tres_bonne') return 'bg-amber-100 dark:bg-amber-900/30';
		if (n === 'satisfaisante') return 'bg-green-100 dark:bg-green-900/30';
		if (n === 'fragile') return 'bg-orange-100 dark:bg-orange-900/30';
		return 'bg-muted/40';
	}
</script>

<svelte:head>
	<title>Mes compétences mathématiques | Chiphre</title>
</svelte:head>

<main class="container mx-auto max-w-4xl px-4 py-6">
	<div class="mb-6 flex items-center gap-3">
		<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
			<Brain class="h-6 w-6 text-primary" />
		</div>
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Mes compétences mathématiques</h1>
			<p class="text-muted-foreground">
				Les 6 compétences transversales du socle — évaluées par ton prof sur des tâches à prise
				d'initiative
			</p>
		</div>
	</div>

	{#if data.items.every((i) => i.task_count === 0)}
		<Card.Root>
			<Card.Content class="py-10 text-center text-muted-foreground">
				<Brain class="mx-auto mb-3 h-10 w-10 opacity-40" />
				<p>
					Aucune évaluation famille B saisie pour le moment. Ton prof commencera à coder tes
					compétences lors de tâches dédiées (problèmes ouverts, modélisation, débats…).
				</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="space-y-2">
			{#each data.items as comp (comp.id)}
				<a
					href="/dashboard/student/competences/{comp.code}"
					class="block rounded-lg transition-colors hover:bg-accent/50 focus:bg-accent focus:outline-none"
				>
					<Card.Root>
						<Card.Content class="flex items-center gap-3 p-4">
							<div
								class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl {bgClass(
									comp.niveau
								)}"
								aria-label={formatMathCompetenceLevel(comp.niveau)}
							>
								<span>{getMathCompetenceLevelVisual(comp.niveau)}</span>
							</div>
							<div class="min-w-0 flex-1">
								<div class="font-semibold">{comp.name}</div>
								<div class="text-xs text-muted-foreground italic">{comp.gloss_for_student}</div>
								<div class="mt-1 text-sm">
									{formatMathCompetenceLevel(comp.niveau)}
									{#if comp.task_count > 0}
										<span class="text-xs text-muted-foreground">
											· {comp.task_count} tâche{comp.task_count > 1 ? 's' : ''}
										</span>
									{/if}
								</div>
							</div>
							<ChevronRight class="h-5 w-5 shrink-0 text-muted-foreground" />
						</Card.Content>
					</Card.Root>
				</a>
			{/each}
		</div>
	{/if}
</main>
