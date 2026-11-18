<!--
	Carnet de liaison (ADR 0040) — le contenu, le même pour le parent et pour
	l'élève (Q15) : régularité en une rangée de cases, une par semaine, comme une
	ligne de la grille du professeur (`RegularityTable`, chantier
	`carnet-heatmap`) : un palier, jamais le nombre exact ni les jours (Q25) ;
	révisions en retard, évaluations faites ou non (JAMAIS la note), liens du
	cahier et du cours de la classe.

	Liens de la classe en `noreferrer` : la page du carnet a le jeton dans son
	adresse, et une navigation vers le même site envoie l'adresse complète.

	Ton neutre (B2) : pas de rouge, pas d'alarme. Le carnet arrive déjà filtré
	par le serveur (`#lib/validation/carnet.ts`) ; ne rien y ajouter ici.
-->
<script lang="ts">
	import { resolve } from '$app/paths';
	import * as Card from '#lib/components/ui/card/index.ts';
	import RegularityTable from '#lib/components/teacher/analytics/RegularityTable.svelte';
	import { BookOpen, CalendarCheck, NotebookText, RotateCcw } from '@lucide/svelte';
	import type { Carnet, CarnetEvaluation, CarnetLevel } from '#lib/validation/carnet.ts';

	// Types

	interface Props {
		carnet: Carnet;
	}

	// Constantes

	/** Palier du carnet → intensité de la case de `RegularityTable` */
	const LEVEL_TIERS: Record<CarnetLevel, 0 | 1 | 2 | 3> = { '0': 0, '1': 1, '2-3': 2, '4+': 3 };

	const DEADLINE_FORMAT = new Intl.DateTimeFormat('fr-FR', {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		timeZone: 'Europe/Paris'
	});

	// Variables

	let { carnet }: Props = $props();

	/** La plus ancienne à gauche, comme la grille du professeur */
	const weeks = $derived(carnet.weeks.map((w) => ({ start: w.week_start, holiday: w.holiday })));
	/** Une seule rangée : celle de l'élève (son prénom est en titre de page) */
	const rows = $derived([
		{ id: 'carnet', display_name: '', tiers: carnet.weeks.map((w) => LEVEL_TIERS[w.level]) }
	]);

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
				<RegularityTable {weeks} students={rows} showNames={false} unit="travail" scrollToEnd />
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
								<a href={resolve(`cahier/${link.token}`)} rel="noreferrer" class="link"
									>{link.label}</a
								>
							{:else}
								<a href={resolve(`cours/${link.token}`)} rel="noreferrer" class="link"
									>{link.label}</a
								>
							{/if}
						</li>
					{/each}
				</ul>
			</Card.Content>
		</Card.Root>
	{/if}
</div>

<style>
	.link {
		font-size: 0.875rem;
		color: var(--color-primary);
		text-underline-offset: 4px;
	}
	.link:hover {
		text-decoration: underline;
	}
</style>
