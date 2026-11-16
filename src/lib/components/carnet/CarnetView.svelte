<!--
	Carnet de liaison (ADR 0040) — le contenu, le même pour le parent et pour
	l'élève (Q15) : régularité des 5 dernières semaines (palier, jamais le
	nombre exact ni les jours, Q25), révisions en retard, évaluations faites ou
	non (JAMAIS la note), liens du cahier et du cours de la classe.

	Ton neutre (B2) : pas de rouge, pas d'alarme. Le carnet arrive déjà filtré
	par le serveur (`$lib/validation/carnet`) ; ne rien y ajouter ici.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import * as Card from '$lib/components/ui/card';
	import { BookOpen, CalendarCheck, NotebookText, RotateCcw } from '@lucide/svelte';
	import type { Carnet, CarnetEvaluation, CarnetLevel, CarnetWeek } from '$lib/validation/carnet';

	// Types

	interface Props {
		carnet: Carnet;
	}

	// Constantes

	/** Nombre de barres pleines sur trois, par palier */
	const LEVEL_BARS: Record<CarnetLevel, number> = { '0': 0, '1': 1, '2-3': 2, '4+': 3 };

	const LEVEL_LABELS: Record<CarnetLevel, string> = {
		'0': 'aucun jour de travail',
		'1': '1 jour de travail',
		'2-3': '2 à 3 jours de travail',
		'4+': '4 jours de travail ou plus'
	};

	const WEEK_FORMAT = new Intl.DateTimeFormat('fr-FR', {
		day: 'numeric',
		month: 'short',
		timeZone: 'UTC'
	});

	const DEADLINE_FORMAT = new Intl.DateTimeFormat('fr-FR', {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		timeZone: 'Europe/Paris'
	});

	// Variables

	let { carnet }: Props = $props();

	/** La plus récente en haut : c'est celle qu'on vient voir */
	const weeks = $derived([...carnet.weeks].reverse());

	const now = Date.now();

	const upcoming = $derived(carnet.evaluations.filter((e) => isUpcoming(e)));
	const past = $derived(carnet.evaluations.filter((e) => !isUpcoming(e)));

	const links = $derived(
		carnet.classes.flatMap((c) => [
			...(c.journal_token
				? [
						{
							kind: 'cahier' as const,
							token: c.journal_token,
							label: `Cahier de textes — ${c.name}`
						}
					]
				: []),
			...(c.course_token
				? [{ kind: 'cours' as const, token: c.course_token, label: `Cours — ${c.name}` }]
				: [])
		])
	);

	// Functions

	function isUpcoming(e: CarnetEvaluation): boolean {
		if (e.deadline === null) return !e.done;
		return new Date(e.deadline).getTime() > now;
	}

	function weekLabel(week: CarnetWeek, index: number): string {
		if (index === 0) return 'Cette semaine';
		return `Semaine du ${WEEK_FORMAT.format(new Date(`${week.week_start}T00:00:00Z`))}`;
	}

	function levelText(week: CarnetWeek, index: number): string {
		if (week.level === '0' && index === 0) return 'Pas encore de travail cette semaine';
		const text = LEVEL_LABELS[week.level];
		return text.charAt(0).toUpperCase() + text.slice(1);
	}

	function evaluationTitle(e: CarnetEvaluation): string {
		return e.title?.trim() || 'Évaluation';
	}
</script>

<div class="space-y-4">
	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2 text-lg">
				<CalendarCheck class="size-5 text-muted-foreground" aria-hidden="true" />
				Régularité
			</Card.Title>
			<Card.Description>
				Jours de travail par semaine. Un jour compte quand au moins 5 réponses sont données en
				travail personnel (exercices, révisions) ; les contrôles ne comptent pas.
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if weeks.length === 0}
				<p class="text-sm text-muted-foreground">Pas encore de travail cette semaine.</p>
			{:else}
				<ul class="divide-y divide-border">
					{#each weeks as week, i (week.week_start)}
						{@const bars = LEVEL_BARS[week.level]}
						<li class="flex flex-wrap items-center gap-x-3 gap-y-1 py-2" data-level={week.level}>
							<span class="w-36 shrink-0 text-sm font-medium">
								{weekLabel(week, i)}
								{#if week.holiday}
									<span class="ml-1 text-xs font-normal text-muted-foreground">(vacances)</span>
								{/if}
							</span>
							<span class="flex gap-1" aria-hidden="true">
								{#each [1, 2, 3] as n (n)}
									<span class="bar" class:filled={n <= bars}></span>
								{/each}
							</span>
							<span class="text-sm text-muted-foreground">{levelText(week, i)}</span>
						</li>
					{/each}
				</ul>
			{/if}
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2 text-lg">
				<RotateCcw class="size-5 text-muted-foreground" aria-hidden="true" />
				Révisions
			</Card.Title>
		</Card.Header>
		<Card.Content>
			<p class="text-sm" data-testid="carnet-revisions">
				{#if carnet.revisions.overdue === 0}
					Les révisions sont à jour.
				{:else if carnet.revisions.overdue === 1}
					1 révision en retard.
				{:else}
					{carnet.revisions.overdue} révisions en retard.
				{/if}
			</p>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title class="flex items-center gap-2 text-lg">
				<NotebookText class="size-5 text-muted-foreground" aria-hidden="true" />
				Évaluations
			</Card.Title>
			<Card.Description>Faites ou non ; les notes ne figurent pas dans le carnet.</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-4">
			{#if carnet.evaluations.length === 0}
				<p class="text-sm text-muted-foreground">Aucune évaluation ces dernières semaines.</p>
			{/if}
			{#if upcoming.length > 0}
				<section aria-labelledby="carnet-eval-a-venir">
					<h3 id="carnet-eval-a-venir" class="mb-1 text-sm font-semibold">À venir</h3>
					<ul class="space-y-1">
						{#each upcoming as e, i (i)}
							<li class="flex flex-wrap justify-between gap-x-3 text-sm">
								<span>
									{evaluationTitle(e)}
									{#if e.deadline}
										<span class="text-muted-foreground">
											— pour le {DEADLINE_FORMAT.format(new Date(e.deadline))}
										</span>
									{/if}
								</span>
								<span class="text-muted-foreground">{e.done ? 'faite' : 'à faire'}</span>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
			{#if past.length > 0}
				<section aria-labelledby="carnet-eval-passees">
					<h3 id="carnet-eval-passees" class="mb-1 text-sm font-semibold">Passées</h3>
					<ul class="space-y-1">
						{#each past as e, i (i)}
							<li class="flex flex-wrap justify-between gap-x-3 text-sm">
								<span>
									{evaluationTitle(e)}
									{#if e.deadline}
										<span class="text-muted-foreground">
											— échéance le {DEADLINE_FORMAT.format(new Date(e.deadline))}
										</span>
									{/if}
								</span>
								<span class={e.done ? 'text-foreground' : 'text-muted-foreground'}>
									{e.done ? 'faite' : 'non faite'}
								</span>
							</li>
						{/each}
					</ul>
				</section>
			{/if}
		</Card.Content>
	</Card.Root>

	{#if links.length > 0}
		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2 text-lg">
					<BookOpen class="size-5 text-muted-foreground" aria-hidden="true" />
					La classe
				</Card.Title>
			</Card.Header>
			<Card.Content>
				<ul class="space-y-1">
					{#each links as link (`${link.kind}-${link.token}`)}
						<li>
							{#if link.kind === 'cahier'}
								<a href={resolve(`/cahier/${link.token}`)} class="link">{link.label}</a>
							{:else}
								<a href={resolve(`/cours/${link.token}`)} class="link">{link.label}</a>
							{/if}
						</li>
					{/each}
				</ul>
			</Card.Content>
		</Card.Root>
	{/if}
</div>

<style>
	/* Une seule couleur (l'accent) ; une barre vide reste discrète, jamais rouge */
	.bar {
		display: inline-block;
		width: 1.25rem;
		height: 0.5rem;
		border-radius: 9999px;
		background: var(--color-muted);
	}
	.bar.filled {
		background: var(--color-primary);
	}
	.link {
		font-size: 0.875rem;
		color: var(--color-primary);
		text-underline-offset: 4px;
	}
	.link:hover {
		text-decoration: underline;
	}
</style>
