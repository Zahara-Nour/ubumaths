<!--
	Tableau de régularité (chantier `regularite`, P5) : élève × semaine. Une
	case = un palier de jours actifs, une seule couleur en quatre intensités ;
	survol, appui ou clavier = le palier en toutes lettres, jamais le nombre
	exact. Repère des semaines de vacances dans l'en-tête. Partagé par la grille
	de la classe et par le suivi d'un élève.
-->
<script lang="ts">
	import { lore } from '$lib/config/lore';

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
	interface Props {
		weeks: RegularityWeek[];
		students: RegularityStudent[];
		anonymized?: boolean;
		/** Libellé de la colonne des noms */
		label?: string;
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

	let { weeks, students, anonymized = false, label = lore.entities.student }: Props = $props();

	/** Case choisie (appui, clic ou clavier) : ligne et colonne */
	let picked = $state<{ row: number; col: number } | null>(null);
	/** Case qui reçoit le focus au Tab (une seule : les flèches parcourent la grille) */
	let active = $state({ row: 0, col: 0 });
	let gridEl = $state<HTMLTableElement | null>(null);

	/** Libellé du mois au-dessus de la première semaine de chaque mois */
	const monthLabels = $derived(
		weeks.map((w, i) => {
			const month = w.start.slice(0, 7);
			const previous = i > 0 ? weeks[i - 1].start.slice(0, 7) : null;
			return month !== previous ? MONTH_FORMAT.format(new Date(`${w.start}T00:00:00Z`)) : '';
		})
	);

	// Functions

	function pick(row: number, col: number) {
		picked = { row, col };
		active = { row, col };
	}

	/** Flèches, Début, Fin : déplacent le focus d'une case à l'autre */
	function onCellKeydown(event: KeyboardEvent, row: number, col: number) {
		const lastRow = students.length - 1;
		const lastCol = weeks.length - 1;
		const moves: Record<string, [number, number]> = {
			ArrowRight: [row, Math.min(col + 1, lastCol)],
			ArrowLeft: [row, Math.max(col - 1, 0)],
			ArrowDown: [Math.min(row + 1, lastRow), col],
			ArrowUp: [Math.max(row - 1, 0), col],
			Home: [row, 0],
			End: [row, lastCol]
		};
		const target = moves[event.key];
		if (!target) return;
		event.preventDefault();
		const [r, c] = target;
		pick(r, c);
		gridEl?.querySelector<HTMLButtonElement>(`[data-cell="${r}-${c}"]`)?.focus();
	}

	function pickedText(): string {
		if (!picked) return '';
		const student = students[picked.row];
		const week = weeks[picked.col];
		if (!student || !week) return '';
		return cellText(studentDisplay(student, picked.row), week, student.tiers[picked.col] ?? 0);
	}

	function weekLabel(week: RegularityWeek): string {
		const text = `semaine du ${DAY_FORMAT.format(new Date(`${week.start}T00:00:00Z`))}`;
		return week.holiday ? `${text} (vacances)` : text;
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
	<table
		bind:this={gridEl}
		class="border-separate border-spacing-0.5 text-xs"
		aria-label="Régularité"
	>
		<thead>
			<tr>
				<th
					scope="col"
					class="sticky left-0 z-10 bg-card px-2 py-1 text-left font-medium"
					rowspan="2">{label}</th
				>
				{#each weeks as week, i (week.start)}
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
				{#each weeks as week (week.start)}
					<th class="h-2 px-0">
						{#if week.holiday}
							<span class="holiday-mark" title={weekLabel(week)}></span>
						{/if}
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each students as student, idx (student.id)}
				{@const name = studentDisplay(student, idx)}
				<tr>
					<th
						scope="row"
						class="sticky left-0 z-10 max-w-[10rem] truncate bg-card px-2 py-0.5 text-left font-medium"
					>
						{name}
					</th>
					{#each weeks as week, w (week.start)}
						{@const tier = student.tiers[w] ?? 0}
						{@const text = cellText(name, week, tier)}
						<td class="p-0">
							<button
								type="button"
								tabindex={active.row === idx && active.col === w ? 0 : -1}
								data-cell="{idx}-{w}"
								class="cell {tierClass(tier)} block"
								class:picked={picked?.row === idx && picked?.col === w}
								title={text}
								onclick={() => pick(idx, w)}
								onfocus={() => pick(idx, w)}
								onkeydown={(e) => onCellKeydown(e, idx, w)}
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
	{pickedText()}
</p>

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
	.picked,
	.cell:focus-visible {
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
