<script lang="ts">
	/**
	 * Onglet « Ce que je sais faire » — le programme de l'élève, par branche > notion.
	 *
	 * Format visuel : ◯ non commencé / 🟠 en cours / 🟢 atteint. Le niveau d'une
	 * notion vient de `notionLevel()` — la MÊME fonction que l'agrégation serveur,
	 * pour que le compteur de l'onglet et celui de la tuile du dashboard ne
	 * puissent pas diverger.
	 */

	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { CheckCircle2, Circle, LifeBuoy, ChevronRight, Hourglass } from '@lucide/svelte';
	import {
		formatNotionLevel,
		getNotionLevelVisual,
		notionLevel,
		type NotionLevel
	} from '$lib/types/skills';
	import CapacityFsrsBadge from '$lib/components/srs/CapacityFsrsBadge.svelte';
	import { formatGradeForDisplay, isValidGradeCode } from '$lib/utils/grades';
	import type { NotionsProgression } from '$lib/server/progression/student-progression';
	import { notionHref } from '$lib/navigation/return-links';

	let {
		notions,
		competencesObserved = false
	}: { notions: NotionsProgression; competencesObserved?: boolean } = $props();

	let showNonCommence = $state(false);

	const stats = $derived(notions.stats);

	// Le niveau réel de l'élève, jamais une mention codée en dur.
	const gradeLabel = $derived(
		notions.grade && isValidGradeCode(notions.grade) ? formatGradeForDisplay(notions.grade) : null
	);

	function visualBgClass(level: NotionLevel): string {
		if (level === 'atteint') return 'bg-green-100 dark:bg-green-900/30';
		if (level === 'en_cours') return 'bg-orange-100 dark:bg-orange-900/30';
		return 'bg-muted/40';
	}
</script>

{#if !notions.hasProgramme}
	<!--
		Pas de programme à montrer : élève sans niveau (le cas réel), ou niveau sans
		aucun point. On le DIT : une page vide laisse croire à une panne, et un
		« 0 sur 0 » laisse croire à un échec.
	-->
	<Card.Root>
		<Card.Content class="py-12 text-center">
			<Hourglass class="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-40" />
			<p class="mb-1 font-medium">
				{#if notions.grade === null}
					Ton niveau n'est pas renseigné : demande à ton professeur.
				{:else}
					Le programme {gradeLabel ? `de ${gradeLabel}` : 'de ton niveau'} n'est pas encore disponible
					ici.
				{/if}
			</p>
			{#if competencesObserved}
				<!-- Ne renvoyer vers l'autre onglet que s'il a de la matière. -->
				<p class="text-sm text-muted-foreground">
					En attendant, l'onglet « Ma façon de faire des maths » a de quoi te répondre.
				</p>
			{/if}
		</Card.Content>
	</Card.Root>
{:else}
	<!-- Compteurs + barre de progression -->
	<Card.Root class="mb-6">
		<Card.Content class="pt-6">
			<p class="mb-4 text-sm text-muted-foreground">
				{#if gradeLabel}
					Programme de {gradeLabel} — {stats.total} notion{stats.total > 1 ? 's' : ''}.
				{:else}
					{stats.total} notion{stats.total > 1 ? 's' : ''}.
				{/if}
			</p>
			<div class="mb-4 flex flex-wrap items-center gap-3">
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
						<span>{stats.non_commence} non commencée{stats.non_commence > 1 ? 's' : ''}</span>
					</div>
				{/if}
				<div class="ml-auto text-sm text-muted-foreground">
					{stats.atteint}/{stats.total} atteinte{stats.atteint > 1 ? 's' : ''}
				</div>
			</div>
			<div class="h-3 w-full overflow-hidden rounded-full bg-muted">
				<div class="flex h-full">
					{#if stats.atteint > 0}
						<div class="bg-green-500" style="width: {(stats.atteint / stats.total) * 100}%"></div>
					{/if}
					{#if stats.en_cours > 0}
						<div class="bg-orange-500" style="width: {(stats.en_cours / stats.total) * 100}%"></div>
					{/if}
				</div>
			</div>
			{#if stats.remediation_count > 0}
				<div class="mt-4">
					<Badge variant="destructive" class="gap-1">
						<LifeBuoy class="h-4 w-4" />
						{stats.remediation_count} notion{stats.remediation_count > 1 ? 's' : ''} à remédier
					</Badge>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Mini-cartes par branche -->
	{#if notions.branches.length > 1}
		<div class="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
			{#each notions.branches as branch (branch.id)}
				{@const branchAtteint = branch.notions.filter((n) => notionLevel(n) === 'atteint').length}
				{@const branchTotal = branch.notions.length}
				{@const branchRatio = branchTotal > 0 ? branchAtteint / branchTotal : 0}
				<a
					href="#branche-{branch.id}"
					class="block rounded-md border bg-card p-2 text-xs hover:bg-accent/50 focus:bg-accent focus:outline-none"
				>
					<div class="mb-1 truncate font-medium" title={branch.name}>{branch.name}</div>
					<div class="text-muted-foreground">{branchAtteint}/{branchTotal} atteintes</div>
					<div class="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
						<div class="h-full bg-green-500" style="width: {branchRatio * 100}%"></div>
					</div>
				</a>
			{/each}
		</div>
	{/if}

	<!-- Toggle non commencées -->
	{#if stats.non_commence > 0}
		<div class="mb-4">
			<Button variant="ghost" size="sm" onclick={() => (showNonCommence = !showNonCommence)}>
				{showNonCommence ? 'Masquer' : 'Afficher'} les notions non commencées ({stats.non_commence})
			</Button>
		</div>
	{/if}

	<!-- Liste par branche -->
	{#each notions.branches as branch (branch.id)}
		{@const visibleNotions = branch.notions.filter(
			(n) => notionLevel(n) !== 'non_commence' || showNonCommence
		)}
		{#if visibleNotions.length > 0}
			<section id="branche-{branch.id}" class="mb-6 scroll-mt-4">
				<h2 class="mb-3 text-lg font-semibold text-muted-foreground">{branch.name}</h2>
				<div class="space-y-2">
					{#each visibleNotions as notion (notion.id)}
						{@const level = notionLevel(notion)}
						<a
							href={notionHref(notion.id)}
							class="block rounded-lg transition-colors hover:bg-accent/50 focus:bg-accent focus:outline-none"
						>
							<Card.Root>
								<Card.Content class="flex items-center gap-3 p-4">
									<div
										class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-xl {visualBgClass(
											level
										)}"
										aria-label={formatNotionLevel(level)}
									>
										<span>{getNotionLevelVisual(level)}</span>
									</div>
									<span
										class="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 font-mono text-xs tabular-nums"
										aria-label="{notion.acquired_count}/{notion.total_count} acquis"
									>
										{notion.acquired_count}/{notion.total_count}
									</span>
									<div class="min-w-0 flex-1">
										<div class="truncate font-medium">{notion.name}</div>
										<div class="mt-1 flex gap-2">
											{#if notion.has_remediation}
												<Badge variant="destructive" class="gap-1 text-xs">
													<LifeBuoy class="h-3 w-3" />
													À remédier
												</Badge>
											{/if}
											<CapacityFsrsBadge badge={notion.fsrs_badge} showLabel />
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
