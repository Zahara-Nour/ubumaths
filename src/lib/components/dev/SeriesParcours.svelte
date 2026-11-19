<!--
	@component SeriesParcours

	Parcours d'une série dans la revue `/dev/modeles` (chantier parcours-serie) : pour juger la
	progression, repérer un modèle qui manque ou une variation à scinder. En tête, les totaux,
	le rendu élève commun à toutes les cartes et « ↻ tout retirer » ; une rangée par modèle dans
	l'ordre de la série ; puis les modèles des mêmes notions et du même niveau absents de la série,
	et les points de ces notions sans aucun modèle.
-->
<script lang="ts">
	// Imports
	import type { QuestionTemplateRow } from '#lib/types/question-template.ts';
	import type { SheetPoint, TemplateReview } from '#lib/questions/template-review.ts';
	import type { PreviewTab } from '#lib/components/questions/QuestionPreviewTabs.svelte';
	import ParcoursRow from '#lib/components/dev/ParcoursRow.svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { RefreshCw } from '@lucide/svelte';

	// Types
	interface ParcoursEntry {
		key: string;
		templateId: string;
		seriesLine: { quantity: number; delay: number } | null;
		sheet: {
			row: QuestionTemplateRow;
			points: SheetPoint[];
			review: TemplateReview | null;
			alerts: string[];
		} | null;
	}

	interface Props {
		title: string;
		parcours: {
			questions: number;
			duration: string;
			grade: string;
			notions: string[];
			neighbourCount: number;
			missingPoints: { code: string; name: string }[];
		};
		entries: ParcoursEntry[];
		neighbours: ParcoursEntry[];
		/** Des filtres sont posés : la série et les voisins sont filtrés */
		filtered: boolean;
		/** Lecture des fiches en échec (la page le dit déjà) */
		sheetsError: boolean;
	}

	// Constantes
	const TABS: { value: PreviewTab; label: string }[] = [
		{ value: 'flashcard', label: 'Flash-card' },
		{ value: 'training', label: 'Contrôle blanc' },
		{ value: 'classroom', label: 'En classe' }
	];
	/** Graine du premier tirage : la page s'ouvre toujours sur les mêmes exemples */
	const FIRST_SEED = 7;

	// Variables
	let { title, parcours, entries, neighbours, filtered, sheetsError }: Props = $props();

	let tab = $state<PreviewTab>('flashcard');
	let firstSeed = $state(FIRST_SEED);

	const notionsLabel = $derived(parcours.notions.join(', '));

	// Functions
	function redrawAll() {
		firstSeed = Math.floor(Math.random() * 1000000);
	}
</script>

<section class="space-y-3" aria-label="Parcours de la série">
	<div
		class="sticky top-0 z-10 flex flex-wrap items-center gap-3 rounded-lg border bg-background/95 p-3 backdrop-blur"
	>
		<div class="min-w-0 flex-1">
			<p class="font-semibold">Série « {title} »</p>
			<p class="text-sm text-muted-foreground">
				{parcours.questions} question{parcours.questions > 1 ? 's' : ''} · {parcours.duration} ·
				{entries.length} modèle{entries.length > 1 ? 's' : ''}{filtered
					? ' retenus par les filtres'
					: ''}
			</p>
		</div>
		<div class="flex flex-wrap gap-1" role="group" aria-label="Rendu des cartes">
			{#each TABS as t (t.value)}
				<Button
					size="sm"
					variant={tab === t.value ? 'default' : 'outline'}
					aria-pressed={tab === t.value}
					onclick={() => (tab = t.value)}>{t.label}</Button
				>
			{/each}
		</div>
		<Button variant="outline" size="sm" onclick={redrawAll}>
			<RefreshCw class="mr-1 h-4 w-4" aria-hidden="true" />
			Tout retirer
		</Button>
	</div>

	{#if entries.length === 0}
		<p class="text-sm text-muted-foreground">
			{filtered
				? 'Aucun modèle de la série ne passe les filtres.'
				: "Cette série n'a aucun modèle."}
		</p>
	{/if}

	{#each entries as entry, i (entry.key)}
		{#if entry.sheet}
			<ParcoursRow
				row={entry.sheet.row}
				review={entry.sheet.review}
				alerts={entry.sheet.alerts}
				rank={i + 1}
				anchor={entry.key}
				seriesLine={entry.seriesLine}
				{tab}
				{firstSeed}
			/>
		{:else if !sheetsError}
			<p class="rounded-lg border border-dashed bg-muted p-3 text-sm text-muted-foreground">
				{i + 1}. Modèle introuvable ({entry.templateId.slice(0, 8)}…){entry.seriesLine
					? ` — × ${entry.seriesLine.quantity} · ${entry.seriesLine.delay} s`
					: ''}
			</p>
		{/if}
	{/each}

	<section class="space-y-3 border-t pt-4" aria-labelledby="ailleurs-titre">
		<h2 id="ailleurs-titre" class="text-lg font-semibold">Ailleurs dans les mêmes notions</h2>
		<p class="text-sm text-muted-foreground">
			{#if parcours.notions.length === 0}
				Aucun modèle de la série n'est rangé dans une notion : rien à chercher autour.
			{:else}
				Modèles de {parcours.grade} rangés dans {notionsLabel}, absents de la série{filtered
					? ' (filtres appliqués)'
					: ''}.
			{/if}
		</p>
		{#if parcours.notions.length > 0 && parcours.neighbourCount === 0}
			<p class="text-sm">Rien d'autre dans ces notions.</p>
		{/if}
		{#if parcours.neighbourCount > neighbours.length}
			<p class="rounded bg-warning/10 p-2 text-sm">
				{#if neighbours.length === 0}
					{parcours.neighbourCount} modèles, non affichés : la série occupe déjà toute la page. Poser
					un filtre pour les voir.
				{:else}
					{parcours.neighbourCount} modèles : seuls les {neighbours.length} premiers sont affichés. Poser
					un filtre pour voir les autres.
				{/if}
			</p>
		{/if}
		{#each neighbours as entry (entry.key)}
			{#if entry.sheet}
				<ParcoursRow
					row={entry.sheet.row}
					review={entry.sheet.review}
					alerts={entry.sheet.alerts}
					pointCodes={entry.sheet.points.map((p) => p.code)}
					anchor={entry.key}
					{tab}
					{firstSeed}
				/>
			{/if}
		{/each}
	</section>

	{#if parcours.notions.length > 0}
		<section class="space-y-2 border-t pt-4" aria-labelledby="points-titre">
			<h2 id="points-titre" class="text-lg font-semibold">Points sans aucun modèle</h2>
			{#if parcours.missingPoints.length === 0}
				<p class="text-sm">
					Rien d'autre dans ces notions : chaque point de {parcours.grade} a au moins un modèle.
				</p>
			{:else}
				<ul class="space-y-1 text-sm">
					{#each parcours.missingPoints as point (point.code)}
						<li><span class="font-mono">{point.code}</span> — {point.name}</li>
					{/each}
				</ul>
			{/if}
		</section>
	{/if}
</section>
