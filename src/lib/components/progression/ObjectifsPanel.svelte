<script lang="ts">
	/**
	 * Onglet « Ce que je sais faire » — contenus du programme de l'élève.
	 *
	 * Format visuel : ◯ non commencé / 🟠 en cours / 🟢 atteint / ✨ maîtrisé.
	 * Le niveau d'un objectif vient de `objectiveLevel()` — la MÊME fonction que
	 * l'agrégation serveur, pour que le compteur de l'onglet et celui de la
	 * tuile du dashboard ne puissent pas diverger.
	 */

	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import {
		Sparkles,
		CheckCircle2,
		Circle,
		LifeBuoy,
		ChevronRight,
		Hourglass
	} from '@lucide/svelte';
	import {
		formatObjectiveLevel,
		getObjectiveLevelVisual,
		objectiveLevel,
		type ObjectiveLevel
	} from '$lib/types/skills';
	import CapacityFsrsBadge from '$lib/components/srs/CapacityFsrsBadge.svelte';
	import { formatGradeForDisplay, isValidGradeCode } from '$lib/utils/grades';
	import type { ObjectivesProgression } from '$lib/server/progression/student-progression';

	let { objectives }: { objectives: ObjectivesProgression } = $props();

	let showNonCommence = $state(false);

	const stats = $derived(objectives.stats);

	// Le niveau réel de l'élève, jamais une mention codée en dur.
	const gradeLabel = $derived(
		objectives.grade && isValidGradeCode(objectives.grade)
			? formatGradeForDisplay(objectives.grade)
			: null
	);

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

{#if !objectives.hasReferentiel}
	<!--
		Le référentiel ne couvre pas encore ce niveau (1ʳᵉ générale, terminale, ou
		élève sans niveau renseigné). On le DIT : une page vide laisse croire à une
		panne, et un « 0 sur 0 » laisse croire à un échec.
	-->
	<Card.Root>
		<Card.Content class="py-12 text-center">
			<Hourglass class="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-40" />
			<p class="mb-1 font-medium">
				Le programme {gradeLabel ? `de ${gradeLabel}` : 'de ton niveau'} n'est pas encore disponible
				ici.
			</p>
			<p class="text-sm text-muted-foreground">
				Il arrivera. En attendant, l'onglet « Ma façon de faire des maths » reste à jour.
			</p>
		</Card.Content>
	</Card.Root>
{:else}
	<!-- Compteurs + barre de progression -->
	<Card.Root class="mb-6">
		<Card.Content class="pt-6">
			<p class="mb-4 text-sm text-muted-foreground">
				{#if gradeLabel}
					Programme de {gradeLabel} — {stats.total} objectif{stats.total > 1 ? 's' : ''} à atteindre.
				{:else}
					{stats.total} objectif{stats.total > 1 ? 's' : ''} à atteindre.
				{/if}
			</p>
			<div class="mb-4 flex flex-wrap items-center gap-3">
				<div class="flex items-center gap-1 text-lg">
					<Sparkles class="h-5 w-5 text-amber-500" />
					<span class="font-bold">{stats.mastery}</span>
				</div>
				<div class="flex items-center gap-1 text-lg">
					<CheckCircle2 class="h-5 w-5 text-green-500" />
					<span class="font-bold">{stats.atteint}</span>
				</div>
				<div class="flex items-center gap-1 text-lg">
					<Circle class="h-5 w-5 fill-orange-500 text-orange-500" />
					<span class="font-bold">{stats.en_cours}</span>
				</div>
				{#if stats.non_commence > 0}
					<div class="flex items-center gap-1 text-sm text-muted-foreground">
						<Circle class="h-4 w-4" />
						<span>{stats.non_commence} non commencé{stats.non_commence > 1 ? 's' : ''}</span>
					</div>
				{/if}
				{#if stats.total > 0}
					<div class="ml-auto text-sm text-muted-foreground">
						{stats.mastery + stats.atteint}/{stats.total} atteints
					</div>
				{/if}
			</div>
			{#if stats.total > 0}
				<div class="h-3 w-full overflow-hidden rounded-full bg-muted">
					<div class="flex h-full">
						{#if stats.mastery > 0}
							<div class="bg-amber-500" style="width: {(stats.mastery / stats.total) * 100}%"></div>
						{/if}
						{#if stats.atteint > 0}
							<div class="bg-green-500" style="width: {(stats.atteint / stats.total) * 100}%"></div>
						{/if}
						{#if stats.en_cours > 0}
							<div
								class="bg-orange-500"
								style="width: {(stats.en_cours / stats.total) * 100}%"
							></div>
						{/if}
					</div>
				</div>
			{/if}
			{#if stats.remediation_count > 0}
				<div class="mt-4">
					<Badge variant="destructive" class="gap-1">
						<LifeBuoy class="h-4 w-4" />
						{stats.remediation_count} objectif{stats.remediation_count > 1 ? 's' : ''} à remédier
					</Badge>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Mini-cartes par thème -->
	{#if objectives.themes.length > 1}
		<div class="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
			{#each objectives.themes as theme (theme.id)}
				{@const themeAtteint = theme.objectives.filter((o) => objectiveLevel(o) >= 3).length}
				{@const themeTotal = theme.objectives.length}
				{@const themeRatio = themeTotal > 0 ? themeAtteint / themeTotal : 0}
				<a
					href="#theme-{theme.id}"
					class="block rounded-md border bg-card p-2 text-xs hover:bg-accent/50 focus:bg-accent focus:outline-none"
				>
					<div class="mb-1 truncate font-medium" title={theme.name}>{theme.name}</div>
					<div class="text-muted-foreground">{themeAtteint}/{themeTotal} atteints</div>
					<div class="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
						<div
							class="h-full {themeRatio === 1
								? 'bg-amber-500'
								: themeRatio > 0
									? 'bg-green-500'
									: 'bg-muted'}"
							style="width: {themeRatio * 100}%"
						></div>
					</div>
				</a>
			{/each}
		</div>
	{/if}

	<!-- Toggle non commencés -->
	{#if stats.non_commence > 0}
		<div class="mb-4">
			<Button variant="ghost" size="sm" onclick={() => (showNonCommence = !showNonCommence)}>
				{showNonCommence ? 'Masquer' : 'Afficher'} les objectifs non commencés ({stats.non_commence})
			</Button>
		</div>
	{/if}

	<!-- Liste par thème -->
	{#each objectives.themes as theme (theme.id)}
		{@const visibleObjectives = theme.objectives.filter(
			(o) => objectiveLevel(o) > 0 || showNonCommence
		)}
		{#if visibleObjectives.length > 0}
			<section id="theme-{theme.id}" class="mb-6 scroll-mt-4">
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
									<div
										class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl {visualBgClass(
											level
										)}"
										aria-label={formatObjectiveLevel(level)}
									>
										<span>{getObjectiveLevelVisual(level)}</span>
									</div>
									<!-- Objectif à échelle : mini-barre 4 segments (rang atteint).
										 Sans échelle : compteur n/m des points acquis. -->
									<div
										class="flex shrink-0 gap-0.5"
										aria-label="{obj.acquired_count}/{obj.total_count} acquis"
									>
										{#if obj.has_scale}
											{#each [1, 2, 3, 4] as rang (rang)}
												<div
													class="h-6 w-2 rounded-sm {rang <= obj.rang_max_acquired
														? progressBarColor(obj.rang_max_acquired)
														: 'bg-muted'}"
												></div>
											{/each}
										{:else}
											<span
												class="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs tabular-nums"
											>
												{obj.acquired_count}/{obj.total_count}
											</span>
										{/if}
									</div>
									<div class="min-w-0 flex-1">
										<div class="truncate font-medium">{obj.name}</div>
										<div class="mt-1 flex gap-2">
											{#if obj.has_remediation}
												<Badge variant="destructive" class="gap-1 text-xs">
													<LifeBuoy class="h-3 w-3" />
													À remédier
												</Badge>
											{/if}
											<CapacityFsrsBadge badge={obj.fsrs_badge} showLabel />
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
{/if}
