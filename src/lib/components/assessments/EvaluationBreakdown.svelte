<!--
	EvaluationBreakdown
	===================
	Bilan d'un contrôle (chantier `bilan-controle`, P6) : par question de la série,
	puis par notion du programme (de la plus fragile à la plus solide). Taux de
	réussite = points obtenus / points possibles, sur la meilleure copie de chaque
	élève.

	Chaque ligne « par question » s'ouvre (si `evaluationId` est fourni) : les
	erreurs de la classe sur cette question, lues au PREMIER dépliage seulement
	(chantier `erreurs-frequentes`). Les noms des élèves sont rendus en texte.

	Une question dont la durée est sans doute trop courte (chantier
	`durees-trop-courtes`, P7) porte une marque et une phrase (« 7 élèves sur 10
	n'ont rien répondu dans les 20 s ») ; aucun nom.

	Props:
	- breakdown: EvaluationBreakdown - résultat de `getEvaluationBreakdown`
	- evaluationId?: string - le contrôle ; sans lui, les lignes ne s'ouvrent pas
-->

<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import QuestionErrorsPanel from './QuestionErrorsPanel.svelte';
	import { ChevronRight, Timer } from '@lucide/svelte';
	import {
		QUESTION_ERRORS_MESSAGE,
		TOO_SHORT_LABEL,
		tooShortSentence,
		type BreakdownTally,
		type EvaluationBreakdown,
		type EvaluationQuestionErrors,
		type NotionBreakdown,
		type QuestionBreakdown
	} from '$lib/types/evaluation-breakdown';

	interface Props {
		breakdown: EvaluationBreakdown;
		evaluationId?: string;
	}

	/** Chargement d'une ligne : en cours, lu, ou en échec */
	type RowState =
		| { phase: 'loading' }
		| { phase: 'error' }
		| { phase: 'done'; errors: Extract<EvaluationQuestionErrors, { status: 'ok' }> };

	let { breakdown, evaluationId }: Props = $props();

	let openRows = $state<Record<string, boolean>>({});
	let rowStates = $state<Record<string, RowState>>({});

	const ok = $derived(breakdown.status === 'ok' ? breakdown : null);
	const hasCopies = $derived(ok !== null && ok.copies > 0);

	const copiesLabel = $derived.by(() => {
		if (!ok) return '';
		const n = ok.copies;
		return `${n} copie${n > 1 ? 's' : ''} comptée${n > 1 ? 's' : ''} (la meilleure de chaque élève)`;
	});

	const lateLabel = $derived.by(() => {
		const n = ok?.lateCopies ?? 0;
		if (n === 0) return '';
		return n > 1
			? `${n} copies rendues en retard, non comptées`
			: '1 copie rendue en retard, non comptée';
	});

	const questionsDescription = $derived(
		[hasCopies ? copiesLabel : '', lateLabel].filter(Boolean).join(' · ')
	);

	function rate(tally: BreakdownTally): string {
		return tally.successRate === null ? '–' : `${Math.round(tally.successRate)}\u00a0%`;
	}

	async function loadErrors(templateId: string): Promise<void> {
		rowStates[templateId] = { phase: 'loading' };
		try {
			const response = await fetch(
				`/dashboard/teacher/assessments/${evaluationId}/results/question-errors?template=${encodeURIComponent(templateId)}`
			);
			const body = (await response.json()) as EvaluationQuestionErrors;
			rowStates[templateId] =
				response.ok && body.status === 'ok' ? { phase: 'done', errors: body } : { phase: 'error' };
		} catch {
			rowStates[templateId] = { phase: 'error' };
		}
	}

	function toggleRow(templateId: string): void {
		openRows[templateId] = !openRows[templateId];
		// Lecture au premier dépliage seulement (un échec se relit au dépliage suivant)
		if (
			openRows[templateId] &&
			(!rowStates[templateId] || rowStates[templateId].phase === 'error')
		) {
			void loadErrors(templateId);
		}
	}

	function notionLabel(row: NotionBreakdown): string {
		return row.branch ? `${row.branch} › ${row.notion}` : row.notion;
	}
</script>

{#snippet counts(tally: BreakdownTally)}
	<Table.Cell class="text-center tabular-nums">{tally.correct}</Table.Cell>
	<Table.Cell class="text-center tabular-nums">{tally.partial}</Table.Cell>
	<Table.Cell class="text-center tabular-nums">{tally.incorrect}</Table.Cell>
	<Table.Cell class="text-center tabular-nums">{tally.empty}</Table.Cell>
{/snippet}

{#snippet rateCell(tally: BreakdownTally)}
	<Table.Cell>
		<div class="flex items-center gap-2">
			<span class="w-12 text-right font-medium tabular-nums">{rate(tally)}</span>
			<div
				class="hidden h-2 w-24 overflow-hidden rounded-full bg-muted sm:block"
				aria-hidden="true"
			>
				<div class="h-full bg-primary" style:width="{tally.successRate ?? 0}%"></div>
			</div>
		</div>
	</Table.Cell>
{/snippet}

{#snippet countHeads()}
	<Table.Head class="text-center">Juste</Table.Head>
	<Table.Head class="text-center">Partiel</Table.Head>
	<Table.Head class="text-center">Faux</Table.Head>
	<Table.Head class="text-center">Sans réponse</Table.Head>
{/snippet}

{#snippet errorsPanel(panel: RowState | undefined)}
	{#if !panel || panel.phase === 'loading'}
		<p class="py-3 text-muted-foreground" role="status">Chargement des erreurs…</p>
	{:else if panel.phase === 'error'}
		<p class="py-3 text-destructive" role="alert">{QUESTION_ERRORS_MESSAGE}</p>
	{:else}
		<QuestionErrorsPanel errors={panel.errors} />
	{/if}
{/snippet}

{#snippet tooShortMark(row: QuestionBreakdown)}
	{#if row.timing?.tooShort}
		<!-- Couleur d'accent sur l'icône seule : le texte garde le contraste du tableau -->
		<p class="mt-1 flex items-start gap-1 text-sm font-normal">
			<Timer class="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
			<span><strong>{TOO_SHORT_LABEL}</strong> · {tooShortSentence(row.timing)}</span>
		</p>
	{/if}
{/snippet}

{#snippet state()}
	{#if breakdown.status === 'error'}
		<p class="py-6 text-center text-destructive">{breakdown.message}</p>
	{:else}
		<p class="py-6 text-center text-muted-foreground">Pas encore de copie rendue</p>
	{/if}
{/snippet}

<Card.Root class="mb-8" data-testid="bilan-questions">
	<Card.Header>
		<Card.Title>Bilan par question</Card.Title>
		{#if questionsDescription}
			<Card.Description>{questionsDescription}</Card.Description>
		{/if}
	</Card.Header>
	<Card.Content>
		{#if ok && hasCopies}
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Question</Table.Head>
						<Table.Head>Réussite</Table.Head>
						{@render countHeads()}
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each ok.questions as row (row.templateId ?? '')}
						{@const templateId = row.templateId}
						{@const expandable = evaluationId !== undefined && templateId !== null}
						<Table.Row>
							<Table.Cell class="font-medium">
								{#if expandable && templateId}
									<button
										type="button"
										class="flex items-center gap-1 text-left hover:underline"
										aria-expanded={openRows[templateId] === true}
										aria-controls="erreurs-{templateId}"
										onclick={() => toggleRow(templateId)}
									>
										<ChevronRight
											class="h-4 w-4 shrink-0 transition-transform {openRows[templateId]
												? 'rotate-90'
												: ''}"
											aria-hidden="true"
										/>
										{row.title}
									</button>
								{:else}
									{row.title}
								{/if}
								{@render tooShortMark(row)}
							</Table.Cell>
							{@render rateCell(row)}
							{@render counts(row)}
						</Table.Row>
						{#if expandable && templateId && openRows[templateId]}
							<Table.Row>
								<Table.Cell colspan={6} class="bg-muted/30" id="erreurs-{templateId}">
									{@render errorsPanel(rowStates[templateId])}
								</Table.Cell>
							</Table.Row>
						{/if}
					{/each}
				</Table.Body>
			</Table.Root>
		{:else}
			{@render state()}
		{/if}
	</Card.Content>
</Card.Root>

<Card.Root class="mb-8" data-testid="bilan-notions">
	<Card.Header>
		<Card.Title>Bilan par notion</Card.Title>
		{#if hasCopies}
			<Card.Description>
				De la plus fragile à la plus solide ; une question qui travaille plusieurs notions compte
				dans chacune.
			</Card.Description>
		{/if}
	</Card.Header>
	<Card.Content>
		{#if ok && hasCopies}
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Notion</Table.Head>
						<Table.Head>Réussite</Table.Head>
						{@render countHeads()}
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each ok.notions as row (row.notionId ?? '')}
						<Table.Row>
							<Table.Cell class="font-medium">{notionLabel(row)}</Table.Cell>
							{@render rateCell(row)}
							{@render counts(row)}
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		{:else}
			{@render state()}
		{/if}
	</Card.Content>
</Card.Root>
