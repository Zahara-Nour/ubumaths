<!--
	Grille de régularité (chantier `regularite`, P5) : élève × semaine depuis
	la rentrée. Une case = un palier de jours actifs, une seule couleur en
	quatre intensités ; survol ou appui = le palier, jamais le nombre exact.
	Repère des semaines de vacances dans l'en-tête.
-->
<script lang="ts">
	import { lore } from '$lib/config/lore';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import * as Card from '$lib/components/ui/card';

	// Types

	type Tier = 0 | 1 | 2 | 3;

	interface RegularityWeek {
		start: string;
		holiday: boolean;
	}
	interface RegularityStudent {
		id: string;
		display_name: string;
		tiers: Tier[];
	}
	interface RegularityGrid {
		weeks: RegularityWeek[];
		students: RegularityStudent[];
	}

	interface Props {
		classId: string;
		anonymized?: boolean;
		refreshNonce?: number;
	}

	// Constantes

	const TIER_LABELS: Record<Tier, string> = {
		0: 'aucun jour actif',
		1: '1 jour actif',
		2: '2 à 3 jours actifs',
		3: '4 jours actifs ou plus'
	};

	const LEGEND: { tier: Tier; label: string }[] = [
		{ tier: 0, label: 'aucun' },
		{ tier: 1, label: '1 jour' },
		{ tier: 2, label: '2 à 3' },
		{ tier: 3, label: '4 ou plus' }
	];

	const DAY_FORMAT = new Intl.DateTimeFormat('fr-FR', {
		day: 'numeric',
		month: 'short',
		timeZone: 'UTC'
	});
	const MONTH_FORMAT = new Intl.DateTimeFormat('fr-FR', { month: 'short', timeZone: 'UTC' });

	// Variables

	let { classId, anonymized = false, refreshNonce = 0 }: Props = $props();

	let data = $state<RegularityGrid | null>(null);
	let loading = $state(false);
	let error = $state<string | null>(null);
	/** Case appuyée (téléphone : pas de survol) */
	let picked = $state<string | null>(null);

	/** Libellé du mois au-dessus de la première semaine de chaque mois */
	const monthLabels = $derived.by(() => {
		if (!data) return [];
		return data.weeks.map((w, i) => {
			const month = w.start.slice(0, 7);
			const previous = i > 0 ? data!.weeks[i - 1].start.slice(0, 7) : null;
			return month !== previous ? MONTH_FORMAT.format(new Date(`${w.start}T00:00:00Z`)) : '';
		});
	});

	// Functions

	async function load() {
		loading = true;
		error = null;
		try {
			const res = await fetch(`/api/teacher/classes/${classId}/analytics/regularity`);
			if (!res.ok) {
				const body = await res.json().catch(() => ({}));
				error = body.error ?? `Erreur ${res.status}`;
				return;
			}
			data = (await res.json()) as RegularityGrid;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Erreur réseau';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		void classId;
		void refreshNonce;
		void load();
	});

	function weekLabel(week: RegularityWeek): string {
		const label = `semaine du ${DAY_FORMAT.format(new Date(`${week.start}T00:00:00Z`))}`;
		return week.holiday ? `${label} (vacances)` : label;
	}

	function studentDisplay(s: RegularityStudent, idx: number): string {
		return anonymized ? `${lore.entities.student} ${idx + 1}` : s.display_name;
	}

	function cellText(name: string, week: RegularityWeek, tier: Tier): string {
		return `${name} — ${weekLabel(week)} : ${TIER_LABELS[tier]}`;
	}

	function tierClass(tier: Tier): string {
		return `tier-${tier}`;
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>Régularité</Card.Title>
		<Card.Description>
			Jours actifs par semaine depuis la rentrée. Un jour est actif quand l'{lore.entities.student}
			donne au moins 5 réponses en travail autonome ; les contrôles ne comptent pas.
		</Card.Description>
	</Card.Header>

	<Card.Content>
		{#if loading && !data}
			<Skeleton class="h-40 w-full" />
		{:else if error}
			<p class="text-sm text-destructive" role="alert">
				⚠ La régularité n'a pas pu être chargée : {error}
			</p>
		{:else if !data || data.students.length === 0}
			<p class="py-8 text-center text-sm text-muted-foreground">
				Aucun {lore.entities.student} dans cette classe.
			</p>
		{:else}
			<div class="mb-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
				<span>Jours actifs dans la semaine :</span>
				{#each LEGEND as item (item.tier)}
					<span class="flex items-center gap-1">
						<span class="cell {tierClass(item.tier)}" aria-hidden="true"></span>
						{item.label}
					</span>
				{/each}
				<span class="flex items-center gap-1">
					<span class="holiday-mark" aria-hidden="true"></span>
					vacances
				</span>
			</div>

			<div class="overflow-x-auto">
				<table class="border-separate border-spacing-0.5 text-xs" aria-label="Régularité">
					<thead>
						<tr>
							<th
								scope="col"
								class="sticky left-0 z-10 bg-card px-2 py-1 text-left font-medium"
								rowspan="2">{lore.entities.student}</th
							>
							{#each data.weeks as week, i (week.start)}
								<th
									scope="col"
									class="h-4 px-0 text-left text-[0.6rem] font-normal whitespace-nowrap text-muted-foreground"
								>
									<span class="sr-only">{weekLabel(week)}</span>
									<span aria-hidden="true">{monthLabels[i]}</span>
								</th>
							{/each}
						</tr>
						<tr aria-hidden="true">
							{#each data.weeks as week (week.start)}
								<th class="h-2 px-0">
									{#if week.holiday}
										<span class="holiday-mark" title={weekLabel(week)}></span>
									{/if}
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each data.students as student, idx (student.id)}
							{@const name = studentDisplay(student, idx)}
							<tr>
								<th
									scope="row"
									class="sticky left-0 z-10 max-w-[10rem] truncate bg-card px-2 py-0.5 text-left font-medium"
								>
									{name}
								</th>
								{#each data.weeks as week, w (week.start)}
									{@const tier = student.tiers[w] ?? 0}
									{@const text = cellText(name, week, tier)}
									<td class="p-0">
										<button
											type="button"
											tabindex="-1"
											class="cell {tierClass(tier)} block"
											class:picked={picked === text}
											title={text}
											onclick={() => (picked = text)}
										>
											<span class="sr-only">{text}</span>
										</button>
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<p class="mt-2 min-h-5 text-xs text-muted-foreground" aria-live="polite">
				{picked ?? ''}
			</p>
		{/if}
	</Card.Content>
</Card.Root>

<style>
	.cell {
		display: inline-block;
		width: 0.875rem;
		height: 0.875rem;
		border-radius: 0.1875rem;
		border: 1px solid var(--color-border);
		padding: 0;
	}
	/* Une seule couleur (l'accent), quatre intensités ; 0 = case vide */
	.tier-0 {
		background: transparent;
	}
	.tier-1 {
		background: color-mix(in oklab, var(--color-primary) 25%, transparent);
		border-color: transparent;
	}
	.tier-2 {
		background: color-mix(in oklab, var(--color-primary) 60%, transparent);
		border-color: transparent;
	}
	.tier-3 {
		background: var(--color-primary);
		border-color: transparent;
	}
	.picked {
		outline: 2px solid var(--color-foreground);
		outline-offset: 1px;
	}
	.holiday-mark {
		display: inline-block;
		width: 0.875rem;
		height: 0.1875rem;
		border-radius: 9999px;
		background: var(--color-muted-foreground);
	}
</style>
