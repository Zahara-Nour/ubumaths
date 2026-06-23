<script lang="ts">
	/**
	 * Student Competence Math — detail page
	 */

	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { ChevronLeft, Check, Circle } from '@lucide/svelte';
	import {
		formatMathCompetenceLevel,
		getMathCompetenceLevelVisual,
		type MissingForNextItem
	} from '$lib/types/skills';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	function formatMissing(item: MissingForNextItem): string {
		switch (item.kind) {
			case 'observable':
				return `${item.code} requis`;
			case 'one_of_subdim':
				return `Au moins 1 observable de ${item.letter}`;
			case 'n_of_subdim':
				return `Au moins ${item.n} des ${item.total} observables de ${item.letter}`;
			case 'one_of_codes':
				return `Au moins 1 parmi ${item.codes.join(', ')}`;
			case 'guard':
				if (item.name === 'needs_more_tasks') return "Minimum 2 tâches d'observation requises";
				if (item.name === 'confirm_with_third_task')
					return 'Confirme avec une 3ᵉ tâche pour atteindre Très bonne';
				return item.name;
		}
	}
</script>

<svelte:head>
	<title>{data.name} | Mes compétences | Chiphre</title>
</svelte:head>

<main class="container mx-auto max-w-4xl px-4 py-6">
	<div class="mb-4">
		<Button variant="ghost" size="sm" href="/dashboard/student/competences">
			<ChevronLeft class="h-4 w-4" />
			Mes compétences
		</Button>
	</div>

	<!-- Header avec niveau -->
	<div class="mb-6">
		<h1 class="text-2xl font-bold tracking-tight sm:text-3xl">{data.name}</h1>
		<p class="text-muted-foreground italic">{data.gloss_for_student}</p>
		<div class="mt-4 flex flex-wrap items-center gap-3">
			<div class="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
				<span class="text-2xl">{getMathCompetenceLevelVisual(data.niveau)}</span>
				<div>
					<div class="font-semibold">{formatMathCompetenceLevel(data.niveau)}</div>
					<div class="text-xs text-muted-foreground">
						{data.task_count} tâche{data.task_count > 1 ? 's' : ''} d'observation
					</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Transparence du verdict -->
	{#if data.validated_observables.length > 0 || data.missing_for_next.length > 0}
		<Card.Root class="mb-6">
			<Card.Header>
				<h2 class="text-lg font-semibold">Pourquoi ce niveau&nbsp;?</h2>
			</Card.Header>
			<Card.Content class="space-y-3">
				{#if data.validated_observables.length > 0}
					<div>
						<div class="mb-1 text-sm font-medium text-green-700 dark:text-green-400">
							Ce qui valide ton niveau actuel
						</div>
						<div class="flex flex-wrap gap-1.5">
							{#each data.validated_observables as code (code)}
								<Badge variant="default" class="font-mono text-xs">{code}</Badge>
							{/each}
						</div>
					</div>
				{/if}
				{#if data.missing_for_next.length > 0 && data.niveau !== 'tres_bonne'}
					<div>
						<div class="mb-1 text-sm font-medium text-amber-700 dark:text-amber-400">
							Pour atteindre le niveau supérieur, il te manque&nbsp;:
						</div>
						<ul class="space-y-1 text-sm">
							{#each data.missing_for_next as item, i (i)}
								<li class="flex items-start gap-2">
									<span class="text-amber-600">•</span>
									<span>{formatMissing(item)}</span>
								</li>
							{/each}
						</ul>
					</div>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Observables groupés par sous-dimension -->
	<Card.Root>
		<Card.Header>
			<h2 class="text-lg font-semibold">Observables détaillés</h2>
			<p class="text-sm text-muted-foreground">
				Tes observables groupés par sous-dimension. Un observable est <em>acquis</em> si ≥ 2 réussites
				dont une dominance sur les non-réussites.
			</p>
		</Card.Header>
		<Card.Content class="space-y-5">
			{#each data.subdimensions as sd (sd.letter)}
				<section>
					<h3 class="mb-2 font-semibold">
						{sd.letter} <span class="font-normal text-muted-foreground">— {sd.name}</span>
					</h3>
					<div class="space-y-1.5">
						{#each sd.observables as ob (ob.skill_id)}
							<div
								class="flex items-start gap-2 rounded-md p-2 {ob.is_acquis
									? 'bg-green-50 dark:bg-green-950/20'
									: 'bg-muted/20'}"
							>
								{#if ob.is_acquis}
									<Check class="h-4 w-4 shrink-0 text-green-600" />
								{:else}
									<Circle class="h-4 w-4 shrink-0 text-muted-foreground" />
								{/if}
								<div class="flex-1 text-sm">
									<span class="font-mono text-xs font-bold text-muted-foreground">
										{ob.observable_code}
									</span>
									<span class="ml-1">{ob.name}</span>
									{#if ob.count_plus + ob.count_minus > 0}
										<div class="mt-0.5 text-xs text-muted-foreground">
											{ob.count_plus} ✓ / {ob.count_minus} ✗
										</div>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</section>
			{/each}
		</Card.Content>
	</Card.Root>
</main>
