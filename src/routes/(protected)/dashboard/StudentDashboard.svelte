<!--
	Tableau de bord de l'élève
	==========================

	Rendu par +page.svelte quand data.profile.role === 'student'.

	CE QU'IL AFFICHE :
	- boîte de réception (InboxWidget, data.inbox)
	- carte de progression (notions du programme, compétences observées : data.progression)
	- accès aux énigmes (data.riddlesSolved)
	- récompenses et avertissements de la période courante (RewardsBlock, lus dans
	  studentCache), accès aux révisions

	DONNÉES :
	- data.user, data.profile, data.academicPeriods (période courante)
	- au montage : studentCache.getRewards() et getWarnings(<période courante>)
-->

<script lang="ts">
	// `lore` n'est plus utilisé que dans les blocs commentés plus bas (sections
	// exercices et SRS). Son dernier usage vivant était le message « famille B »,
	// retiré avec les deux anciennes tuiles.
	// import { lore } from '#lib/config/lore.ts';
	import type { PageData } from './$types';
	import RewardsBlock from '#lib/components/RewardsBlock.svelte';
	import InboxWidget from '#lib/components/student-inbox/InboxWidget.svelte';
	import * as Card from '#lib/components/ui/card/index.ts';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import {
		TrendingUp,
		Sparkles,
		CheckCircle2,
		Circle,
		LifeBuoy,
		ChevronRight,
		Puzzle
	} from '@lucide/svelte';
	// import { Button } from '#lib/components/ui/button/index.ts';
	// import { formatDeadline, isDeadlinePassed, isDeadlineSoon } from '#lib/utils/dates.ts';
	// import { BookOpen, FileText, Calendar, CheckCircle } from '@lucide/svelte';
	import { studentCache } from '#lib/stores/studentDashboardCache.svelte.ts';
	import { findCurrentPeriod } from '#lib/utils/academic-period.ts';

	// Receive data from parent (+page.svelte)
	// Contains profile with student's information
	let { data }: { data: PageData } = $props();

	// Determine current academic period for warnings
	const currentPeriodId = $derived(
		findCurrentPeriod(data.academicPeriods as Parameters<typeof findCurrentPeriod>[0])
	);

	/**
	 * EFFECT: Auto-fetch student data on mount (side effects: API calls)
	 * Cache stores use SvelteMap for proper reactivity with $derived
	 */
	$effect(() => {
		if (data.user && data.profile) {
			// Fetch rewards (cache-first)
			studentCache.getRewards();
			// Fetch warnings for current period
			if (currentPeriodId) {
				studentCache.getWarnings(currentPeriodId);
			}
		}
	});
</script>

<div class="space-y-6">
	<!-- WORK INBOX WIDGET: urgent assignments (late + this week) -->
	{#if data.inbox}
		<InboxWidget inbox={data.inbox} maxItems={5} />
	{/if}

	<!--
		TUILE « MA PROGRESSION »
		=======================
		Une seule tuile pour les deux axes. Avant, deux tuiles côte à côte —
		mêmes icônes, mêmes couleurs, même barre, aucune glose — que David
		lui-même n'arrivait pas à distinguer.

		Elle disparaît quand il n'y a RIEN à résumer : ni programme pour le
		niveau de l'élève, ni compétence observée. L'entrée de menu, elle, reste :
		la page explique alors franchement pourquoi c'est vide.
	-->
	{#if data.progression && (data.progression.notions.hasProgramme || data.progression.competences.stats.with_data > 0)}
		{@const objs = data.progression.notions.stats}
		{@const comps = data.progression.competences.stats}
		<a
			href="/dashboard/student/progression"
			class="group block rounded-xl focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:outline-none"
		>
			<Card.Root class="transition-colors group-hover:bg-accent/50">
				<Card.Content class="p-4">
					<div class="mb-3 flex items-center gap-2">
						<TrendingUp class="h-5 w-5 text-primary" />
						<h3 class="font-semibold">Ma progression</h3>
						<ChevronRight class="ml-auto h-4 w-4 text-muted-foreground" />
					</div>

					{#if data.progression.notions.hasProgramme}
						<div class="mb-3">
							<div class="mb-1 flex items-center gap-3 text-sm">
								<span class="text-xs font-medium text-muted-foreground">Ce que je sais faire</span>
								<span class="flex items-center gap-1">
									<CheckCircle2 class="h-4 w-4 text-green-500" />
									<strong>{objs.atteint}</strong>
								</span>
								<span class="flex items-center gap-1">
									<Circle class="h-4 w-4 fill-orange-500 text-orange-500" />
									<strong>{objs.en_cours}</strong>
								</span>
								<span class="ml-auto text-xs text-muted-foreground">
									{objs.atteint}/{objs.total} notions atteintes
								</span>
							</div>
							<div class="h-2 w-full overflow-hidden rounded-full bg-muted">
								<div class="flex h-full">
									{#if objs.atteint > 0}
										<div
											class="bg-green-500"
											style="width: {(objs.atteint / objs.total) * 100}%"
										></div>
									{/if}
									{#if objs.en_cours > 0}
										<div
											class="bg-orange-500"
											style="width: {(objs.en_cours / objs.total) * 100}%"
										></div>
									{/if}
								</div>
							</div>
						</div>
					{/if}

					{#if comps.with_data > 0}
						<div class="flex items-center gap-3 text-sm">
							<span class="text-xs font-medium text-muted-foreground">
								Ma façon de faire des maths
							</span>
							<span class="flex items-center gap-1">
								<Sparkles class="h-4 w-4 text-amber-500" />
								<strong>{comps.tres_bonne}</strong>
							</span>
							<span class="flex items-center gap-1">
								<CheckCircle2 class="h-4 w-4 text-green-500" />
								<strong>{comps.satisfaisante}</strong>
							</span>
							<span class="flex items-center gap-1">
								<Circle class="h-4 w-4 fill-orange-500 text-orange-500" />
								<strong>{comps.fragile}</strong>
							</span>
							<span class="ml-auto text-xs text-muted-foreground">
								{comps.with_data}/{comps.total} observées
							</span>
						</div>
					{/if}

					{#if objs.remediation_count > 0}
						<div class="mt-3">
							<Badge variant="destructive" class="gap-1 text-xs">
								<LifeBuoy class="h-3 w-3" />
								{objs.remediation_count} à remédier
							</Badge>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</a>
	{/if}

	<!--
		TUILE « ÉNIGMES » : seule entrée vers les énigmes (#1121). Le libellé ne promet
		pas d'énigme du jour : certains jours n'en ont pas.
		Survol et focus : la carte, opaque, recouvre le fond du lien ; le survol
		colore donc la carte (group-hover) et le focus est un anneau autour du lien.
	-->
	<a
		href="/dashboard/student/riddles"
		class="group block rounded-xl focus-visible:ring-4 focus-visible:ring-ring/30 focus-visible:outline-none"
	>
		<Card.Root class="transition-colors group-hover:bg-accent/50">
			<Card.Content class="flex items-center gap-2 p-4">
				<Puzzle class="h-5 w-5 text-primary" />
				<h3 class="font-semibold">Énigmes</h3>
				<span class="text-sm text-muted-foreground">
					{#if data.riddlesSolved > 0}
						{data.riddlesSolved} résolue{data.riddlesSolved > 1 ? 's' : ''}
					{:else}
						Découvre les énigmes
					{/if}
				</span>
				<ChevronRight class="ml-auto h-4 w-4 text-muted-foreground" />
			</Card.Content>
		</Card.Root>
	</a>

	<!-- REWARDS BLOCK -->
	<!--
		Summary of rewards: Gidouilles, VIP Cards, and Riddles
		NOTE: RewardsBlock now derives gidouilles and vipCards from studentCache
		Only studentId and periodId are passed as props
	-->
	<RewardsBlock studentId={data.profile.id} periodId={currentPeriodId} />

	<!-- SRS REVISIONS SECTION -->
	<!-- Quick access to spaced repetition system -->
	<!-- <div class="rounded-lg bg-card shadow">
		<div class="border-b border-border px-6 py-4">
			<div class="flex items-center justify-between">
				<h3 class="text-lg font-semibold text-foreground">Révisions Espacées (SRS)</h3>
				<a href="/dashboard/revisions" data-sveltekit-preload-data="hover">
					<Button size="sm">
						<BookOpen class="mr-2 h-4 w-4" />
						Voir mes decks
					</Button>
				</a>
			</div>
		</div>
		<div class="p-6">
			<p class="text-muted-foreground">
				Système de révision espacée pour mémoriser durablement vos concepts mathématiques.
			</p>
			<div class="mt-4 grid gap-3 md:grid-cols-3">
				<div class="rounded-lg border bg-muted/20 p-4">
					<p class="text-sm font-medium text-muted-foreground">Decks</p>
					<p class="mt-1 text-2xl font-bold">-</p>
				</div>
				<div class="rounded-lg border bg-primary/10 p-4">
					<p class="text-sm font-medium text-muted-foreground">À réviser aujourd'hui</p>
					<p class="mt-1 text-2xl font-bold text-primary">-</p>
				</div>
				<div class="rounded-lg border bg-muted/20 p-4">
					<p class="text-sm font-medium text-muted-foreground">Cartes maîtrisées</p>
					<p class="mt-1 text-2xl font-bold">-</p>
				</div>
			</div>
		</div>
	</div> -->
</div>
