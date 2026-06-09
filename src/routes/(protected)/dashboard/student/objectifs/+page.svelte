<script lang="ts">
	/**
	 * Student Objectifs Page
	 * ======================
	 *
	 * UI élève Phase 3.1 — Liste des objectifs famille knowledge (capacités 6ᵉ).
	 *
	 * Spec : docs/wip/skills-referentiel-design.md §8
	 * Format visuel : ◯ Non commencé / 🟠 En cours / 🟢 Objectif atteint / ✨ Maîtrisé en profondeur
	 */

	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Target, Sparkles, CheckCircle2, Circle, LifeBuoy, ChevronRight } from 'lucide-svelte';
	import {
		formatObjectiveLevel,
		getObjectiveLevelVisual,
		type ObjectiveLevel
	} from '$lib/types/skills';
	import type { PageData } from './$types';
	import type { ObjectiveSummary } from './+page.server';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	let showNonCommence = $state(false);

	// Helpers de présentation
	function objectiveLevel(o: ObjectiveSummary): ObjectiveLevel {
		return o.rang_max_acquired;
	}

	function visualBgClass(level: ObjectiveLevel): string {
		if (level === 4) return 'bg-amber-100 dark:bg-amber-900/30';
		if (level === 3) return 'bg-green-100 dark:bg-green-900/30';
		if (level === 1 || level === 2) return 'bg-orange-100 dark:bg-orange-900/30';
		return 'bg-muted/40';
	}

	function progressBarColor(rang: ObjectiveLevel): string {
		if (rang === 4) return 'bg-amber-500';
		if (rang === 3) return 'bg-green-500';
		if (rang >= 1) return 'bg-orange-500';
		return 'bg-muted';
	}
</script>

<svelte:head>
	<title>Mes objectifs | UbuMaths</title>
</svelte:head>

<main class="container mx-auto max-w-5xl px-4 py-6">
	<!-- Header -->
	<div class="mb-6">
		<div class="flex items-center gap-3">
			<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
				<Target class="h-6 w-6 text-primary" />
			</div>
			<div>
				<h1 class="text-3xl font-bold tracking-tight">Mes objectifs</h1>
				<p class="text-muted-foreground">
					Programme 6<sup>ème</sup> — {data.stats.total} attendus à maîtriser
				</p>
			</div>
		</div>
	</div>

	<!-- Compteurs + barre de progression -->
	<Card.Root class="mb-6">
		<Card.Content class="pt-6">
			<div class="mb-4 flex flex-wrap items-center gap-3">
				<div class="flex items-center gap-1 text-lg">
					<Sparkles class="h-5 w-5 text-amber-500" />
					<span class="font-bold">{data.stats.mastery}</span>
				</div>
				<div class="flex items-center gap-1 text-lg">
					<CheckCircle2 class="h-5 w-5 text-green-500" />
					<span class="font-bold">{data.stats.atteint}</span>
				</div>
				<div class="flex items-center gap-1 text-lg">
					<Circle class="h-5 w-5 fill-orange-500 text-orange-500" />
					<span class="font-bold">{data.stats.en_cours}</span>
				</div>
				{#if data.stats.non_commence > 0}
					<div class="flex items-center gap-1 text-sm text-muted-foreground">
						<Circle class="h-4 w-4" />
						<span
							>{data.stats.non_commence} non commencé{data.stats.non_commence > 1 ? 's' : ''}</span
						>
					</div>
				{/if}
				<div class="ml-auto text-sm text-muted-foreground">
					{data.stats.mastery + data.stats.atteint}/{data.stats.total} atteints
				</div>
			</div>
			<!-- Barre de progression -->
			<div class="h-3 w-full overflow-hidden rounded-full bg-muted">
				<div class="flex h-full">
					{#if data.stats.mastery > 0}
						<div
							class="bg-amber-500"
							style="width: {(data.stats.mastery / data.stats.total) * 100}%"
						></div>
					{/if}
					{#if data.stats.atteint > 0}
						<div
							class="bg-green-500"
							style="width: {(data.stats.atteint / data.stats.total) * 100}%"
						></div>
					{/if}
					{#if data.stats.en_cours > 0}
						<div
							class="bg-orange-500"
							style="width: {(data.stats.en_cours / data.stats.total) * 100}%"
						></div>
					{/if}
				</div>
			</div>
			<!-- Badge à remédier -->
			{#if data.stats.remediation_count > 0}
				<div class="mt-4">
					<Badge variant="destructive" class="gap-1">
						<LifeBuoy class="h-4 w-4" />
						{data.stats.remediation_count} objectif{data.stats.remediation_count > 1 ? 's' : ''} à remédier
					</Badge>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Toggle non commencés -->
	{#if data.stats.non_commence > 0}
		<div class="mb-4">
			<Button variant="ghost" size="sm" onclick={() => (showNonCommence = !showNonCommence)}>
				{showNonCommence ? 'Masquer' : 'Afficher'} les objectifs non commencés ({data.stats
					.non_commence})
			</Button>
		</div>
	{/if}

	<!-- Liste par thème -->
	{#each data.themes as theme (theme.id)}
		{@const visibleObjectives = theme.objectives.filter(
			(o) => o.rang_max_acquired > 0 || showNonCommence
		)}
		{#if visibleObjectives.length > 0}
			<section class="mb-6">
				<h2 class="mb-3 text-lg font-semibold text-muted-foreground">{theme.name}</h2>
				<div class="space-y-2">
					{#each visibleObjectives as obj (obj.id)}
						{@const level = objectiveLevel(obj)}
						<a
							href="/dashboard/student/objectifs/{obj.id}"
							class="block rounded-lg transition-colors hover:bg-accent/50 focus:bg-accent focus:outline-none"
						>
							<Card.Root>
								<Card.Content class="flex items-center gap-3 p-4">
									<!-- Visuel d'état -->
									<div
										class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl {visualBgClass(
											level
										)}"
										aria-label={formatObjectiveLevel(level)}
									>
										<span>{getObjectiveLevelVisual(level)}</span>
									</div>
									<!-- Mini-barre 4 segments (capacités acquises) -->
									<div class="flex shrink-0 gap-0.5" aria-label="{obj.acquired_count}/4 capacités">
										{#each [1, 2, 3, 4] as rang (rang)}
											<div
												class="h-6 w-2 rounded-sm {rang <= obj.rang_max_acquired
													? progressBarColor(obj.rang_max_acquired)
													: 'bg-muted'}"
											></div>
										{/each}
									</div>
									<!-- Nom + badges -->
									<div class="min-w-0 flex-1">
										<div class="truncate font-medium">{obj.name}</div>
										<div class="mt-1 flex gap-2">
											{#if obj.has_remediation}
												<Badge variant="destructive" class="gap-1 text-xs">
													<LifeBuoy class="h-3 w-3" />
													À remédier
												</Badge>
											{/if}
											{#if obj.has_to_review}
												<Badge variant="outline" class="text-xs">À revoir</Badge>
											{/if}
										</div>
									</div>
									<ChevronRight class="h-5 w-5 shrink-0 text-muted-foreground" />
								</Card.Content>
							</Card.Root>
						</a>
					{/each}
				</div>
			</section>
		{/if}
	{/each}

	{#if data.stats.total === 0}
		<Card.Root>
			<Card.Content class="py-12 text-center text-muted-foreground">
				<p>Aucun objectif disponible pour le moment.</p>
			</Card.Content>
		</Card.Root>
	{/if}
</main>
