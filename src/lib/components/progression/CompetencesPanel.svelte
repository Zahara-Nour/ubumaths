<script lang="ts">
	/**
	 * Onglet « Ma façon de faire des maths » — les 6 compétences du socle.
	 *
	 * ⚠️ Aucun mot de la doc interne ici. « Famille B » est un alias de
	 * spécification : l'élève n'a aucun moyen de le décoder, et le lire dans son
	 * tableau de bord lui apprend seulement qu'on ne s'adresse pas à lui.
	 */

	import { lore } from '$lib/config/lore';
	import * as Card from '$lib/components/ui/card';
	import { ChevronRight, Compass } from '@lucide/svelte';
	import {
		formatMathCompetenceLevel,
		getMathCompetenceLevelVisual,
		isCompetenceObserved,
		type MathCompetenceLevel
	} from '$lib/types/skills';
	import type { CompetencesProgression } from '$lib/server/progression/student-progression';

	let { competences }: { competences: CompetencesProgression } = $props();

	function bgClass(niveau: MathCompetenceLevel): string {
		if (niveau === 'tres_bonne') return 'bg-amber-100 dark:bg-amber-900/30';
		if (niveau === 'satisfaisante') return 'bg-green-100 dark:bg-green-900/30';
		if (niveau === 'fragile') return 'bg-orange-100 dark:bg-orange-900/30';
		return 'bg-muted/40';
	}
</script>

<p class="mb-4 text-sm text-muted-foreground">
	Six façons de faire des maths, les mêmes de la 6<sup>e</sup> à la terminale. Elles s'observent sur
	des problèmes ouverts, pas sur des exercices d'application.
</p>

{#if competences.stats.with_data === 0}
	<Card.Root>
		<Card.Content class="py-10 text-center text-muted-foreground">
			<Compass class="mx-auto mb-3 h-10 w-10 opacity-40" />
			<p class="mb-1 font-medium text-foreground">Pas encore d'observation.</p>
			<p class="text-sm">
				Ton {lore.entities.teacher} remplira cette page lors de tâches dédiées : problèmes ouverts, modélisation,
				débats mathématiques.
			</p>
		</Card.Content>
	</Card.Root>
{:else}
	<div class="space-y-2">
		{#each competences.items as comp (comp.id)}
			<!-- Même définition que `with_data` côté serveur : une seule source. -->
			{@const observee = isCompetenceObserved(comp)}
			<a
				href="/dashboard/student/competences/{comp.code}"
				class="block rounded-lg transition-colors hover:bg-accent/50 focus:bg-accent focus:outline-none"
			>
				<Card.Root>
					<Card.Content class="flex items-center gap-3 p-4">
						<div
							class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl {observee
								? bgClass(comp.niveau)
								: 'bg-muted/40'}"
							aria-label={observee ? formatMathCompetenceLevel(comp.niveau) : 'Pas encore observée'}
						>
							<span>{observee ? getMathCompetenceLevelVisual(comp.niveau) : '◯'}</span>
						</div>
						<div class="min-w-0 flex-1">
							<div class="font-semibold">{comp.name}</div>
							<div class="text-xs text-muted-foreground italic">{comp.gloss_for_student}</div>
							<div class="mt-1 text-sm">
								{#if observee}
									{formatMathCompetenceLevel(comp.niveau)}
									<span class="text-xs text-muted-foreground">
										· {comp.task_count} tâche{comp.task_count > 1 ? 's' : ''}
									</span>
								{:else}
									<!-- Sans observation, il n'y a pas de niveau « insuffisant » :
										 il n'y a pas de mesure. Ne pas rendre un jugement. -->
									<span class="text-muted-foreground">Pas encore observée</span>
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
