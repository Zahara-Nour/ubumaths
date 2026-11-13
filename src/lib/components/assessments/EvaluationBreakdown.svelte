<!--
	EvaluationBreakdown
	===================
	Bilan d'un contrôle (chantier `bilan-controle`, P6) : par question de la série,
	puis par notion du programme (de la plus fragile à la plus solide). Taux de
	réussite = points obtenus / points possibles, sur la meilleure copie de chaque
	élève.

	Props:
	- breakdown: EvaluationBreakdown - résultat de `getEvaluationBreakdown`
-->

<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import type {
		BreakdownTally,
		EvaluationBreakdown,
		NotionBreakdown
	} from '$lib/types/evaluation-breakdown';

	interface Props {
		breakdown: EvaluationBreakdown;
	}

	let { breakdown }: Props = $props();

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
		return tally.successRate === null ? '–' : `${Math.round(tally.successRate)} %`;
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
						<Table.Row>
							<Table.Cell class="font-medium">{row.title}</Table.Cell>
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
