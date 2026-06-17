<script lang="ts">
	/**
	 * Programme Deck Page — vue élève du deck auto-managé.
	 *
	 * 4 sections automatiques calculées depuis l'état FSRS :
	 *   🆘 À remédier / 🔁 À renforcer / ⏳ En apprentissage / ✅ Acquise en mémoire
	 *
	 * Cf. docs/ref/srs/architecture.md §5.2
	 */

	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import {
		AlertCircle,
		RefreshCw,
		Clock,
		CheckCircle,
		ChevronLeft,
		PlayCircle,
		Target
	} from '@lucide/svelte';
	import type { PageData } from './$types';
	import type { ProgrammeBadge } from './+page.server';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	const sectionIconMap: Record<ProgrammeBadge, typeof AlertCircle> = {
		a_remedier: AlertCircle,
		a_renforcer: RefreshCw,
		en_apprentissage: Clock,
		acquise_en_memoire: CheckCircle
	};

	const sectionColorMap: Record<ProgrammeBadge, string> = {
		a_remedier: 'text-red-600 dark:text-red-400',
		a_renforcer: 'text-amber-600 dark:text-amber-400',
		en_apprentissage: 'text-blue-600 dark:text-blue-400',
		acquise_en_memoire: 'text-emerald-600 dark:text-emerald-400'
	};

	const sectionStateFilter: Record<ProgrammeBadge, string> = {
		a_remedier: 'learning,relearning',
		a_renforcer: 'review',
		en_apprentissage: '',
		acquise_en_memoire: ''
	};

	function isActionableSection(badge: ProgrammeBadge): boolean {
		return badge === 'a_remedier' || badge === 'a_renforcer';
	}

	function relativeDate(iso: string | null): string {
		if (!iso) return '—';
		const date = new Date(iso);
		const diffMs = date.getTime() - Date.now();
		const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
		if (diffDays === 0) return "aujourd'hui";
		if (diffDays === -1) return 'hier';
		if (diffDays === 1) return 'demain';
		if (diffDays < 0) return `il y a ${-diffDays} jour${-diffDays > 1 ? 's' : ''}`;
		return `dans ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
	}
</script>

<svelte:head>
	<title>Programme | Mes révisions | UbuMaths</title>
</svelte:head>

<main class="container mx-auto max-w-4xl px-4 py-6">
	<div class="mb-4">
		<Button variant="ghost" size="sm" href="/dashboard/revisions">
			<ChevronLeft class="h-4 w-4" />
			Mes révisions
		</Button>
	</div>

	<header class="mb-6 flex items-start gap-3">
		<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
			<Target class="h-6 w-6 text-primary" />
		</div>
		<div class="flex-1">
			<h1 class="text-2xl font-bold tracking-tight sm:text-3xl">Programme</h1>
			<p class="text-muted-foreground">
				Tes capacités à retravailler — mises à jour automatiquement après chaque entraînement.
			</p>
			<div class="mt-2 text-sm text-muted-foreground">
				{data.totalCards} carte{data.totalCards > 1 ? 's' : ''} au total
			</div>
		</div>
	</header>

	{#if !data.exists || data.totalCards === 0}
		<Card.Root>
			<Card.Content class="py-12 text-center">
				<p class="mb-4 text-muted-foreground">
					Tu n'as pas encore travaillé de capacité tagué dans le référentiel.<br />
					Va t'entraîner pour faire apparaître tes premières cartes ici.
				</p>
				<Button href="/dashboard/student/objectifs">Voir mes objectifs</Button>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="space-y-6">
			{#each data.sections as section (section.badge)}
				{@const Icon = sectionIconMap[section.badge]}
				{@const iconClass = sectionColorMap[section.badge]}
				{@const stateFilter = sectionStateFilter[section.badge]}
				{@const sessionHref = data.deckId
					? `/dashboard/revisions/decks/${data.deckId}/study${stateFilter ? `?states=${stateFilter}` : ''}`
					: '#'}
				<section>
					<div class="mb-3 flex items-center justify-between">
						<div class="flex items-center gap-2">
							<Icon class="h-5 w-5 {iconClass}" />
							<h2 class="text-lg font-semibold">{section.title}</h2>
							<Badge variant="outline" class="text-xs">
								{section.cards.length}
							</Badge>
						</div>
						{#if isActionableSection(section.badge) && section.cards.length > 0}
							<Button size="sm" href={sessionHref} class="gap-1">
								<PlayCircle class="h-4 w-4" />
								Lancer une session
							</Button>
						{/if}
					</div>

					{#if section.cards.length === 0}
						<p class="text-sm text-muted-foreground italic">Aucune carte dans cette section.</p>
					{:else}
						<div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
							{#each section.cards as card (card.cardId)}
								<Card.Root>
									<Card.Content class="p-3">
										<div class="mb-1 text-sm font-medium">
											{card.templateName ?? 'Variation sans nom'}
										</div>
										{#if card.objectiveName}
											<a
												href="/dashboard/student/objectifs/{card.objectiveId}"
												class="block text-xs text-muted-foreground hover:underline"
											>
												Objectif : {card.objectiveName}
											</a>
										{/if}
										<div class="mt-1 text-xs text-muted-foreground">
											Prochaine review : {relativeDate(card.nextReview)}
										</div>
									</Card.Content>
								</Card.Root>
							{/each}
						</div>
					{/if}
				</section>
			{/each}
		</div>
	{/if}
</main>
