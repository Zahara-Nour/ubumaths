<!--
	SignTableAnswer — tableau de signes à compléter dans le résultat attendu
	========================================================================

	Copie corrigée, verso de la carte flash, bonne réponse affichée (chantier
	`docs/wip/tableau-signes-progress.md`, PR 4) : le tableau lui-même, chaque
	cellule cachée remplie (phase 0, point 5) —
	- juste : la réponse de l'élève, en vert ;
	- forme à améliorer : sa réponse en ambre, la bonne dessous ;
	- fausse : sa réponse barrée en rouge, la bonne dessous en vert ;
	- vide : la bonne réponse en vert, cadre en pointillés ;
	- sans réponse (R9) : la bonne réponse en vert.

	Les réponses attendues viennent des cases (`cells`), jamais du bloc : en
	évaluation notée, l'énoncé est masqué (`??1`, `?` seul). Le statut n'est jamais
	porté par la couleur seule : chaque cellule a son libellé en toutes lettres.

	SÉCURITÉ : la réponse de l'élève arrive neutralisée (`expected-result`) ; un
	jeton inconnu est rendu en nœud texte, jamais en markdown.

	@module components/questions/SignTableAnswer
-->
<script lang="ts">
	import VariationTable from '$lib/components/markdown/nodes/VariationTable.svelte';
	import { parseVariationTableContent } from '$lib/ubumark/parser/variation-table-parser';
	import type { HiddenCell, HiddenCellKind } from '$lib/ubumark/types/variation-table';
	import type { ExpectedSignCell } from '$lib/questions/expected-result';
	import { EXPECTED_STATUS_LABEL } from '$lib/questions/expected-result-markdown';

	interface Props {
		/** Texte du bloc ```variation, sans `case:` */
		source: string;
		/** Cellules cachées, dans l'ordre de lecture du tableau */
		cells: readonly ExpectedSignCell[];
	}

	let { source, cells }: Props = $props();

	const node = $derived(parseVariationTableContent(source.split('\n')).node);

	/** Ce que l'écran montre d'un signe ou d'une marque */
	const TOKEN_TEXT: Record<string, string> = {
		'+': '+',
		'-': '−',
		z: '0',
		'||': '‖',
		rien: 'rien'
	};

	/** Ce qu'un lecteur d'écran entend d'un signe ou d'une marque */
	const TOKEN_SPOKEN: Record<string, string> = {
		'+': 'plus',
		'-': 'moins',
		z: 'zéro',
		'||': 'double barre',
		rien: 'rien'
	};

	function spoken(kind: HiddenCellKind, value: string): string {
		return kind === 'valeur' ? value : (TOKEN_SPOKEN[value] ?? value);
	}

	/** Libellé d'une cellule : sa case, sa réponse, son statut, la bonne réponse si besoin */
	function cellLabel(cell: ExpectedSignCell): string {
		const parts = [`Case ${cell.index + 1}`];
		if (cell.student !== null) parts.push(`ta réponse : ${spoken(cell.cellule, cell.student)}`);
		parts.push(EXPECTED_STATUS_LABEL[cell.status]);
		if (cell.status !== 'correct') parts.push(`attendu : ${spoken(cell.cellule, cell.expected)}`);
		return parts.join(', ');
	}

	/** Bonne réponse montrée sous celle de l'élève (fausse, forme, vide) */
	const showsExpected = (cell: ExpectedSignCell) =>
		cell.status === 'incorrect' || cell.status === 'unoptimal' || cell.student === null;
</script>

{#snippet value(kind: HiddenCellKind, text: string)}
	{#if kind === 'valeur'}
		<math-span>{text}</math-span>
	{:else if TOKEN_TEXT[text] !== undefined}
		<span class="token" class:token-rien={text === 'rien'}>{TOKEN_TEXT[text]}</span>
	{:else}
		<span class="token">{text}</span>
	{/if}
{/snippet}

{#if node}
	<div class="sign-table-answer" data-sign-table-answer>
		<VariationTable {node}>
			{#snippet cell(hidden: HiddenCell)}
				{@const answer = cells[hidden.index]}
				{#if answer}
					<span
						class="answer-cell"
						data-sign-cell={answer.index}
						data-status={answer.status}
						title={cellLabel(answer)}
					>
						<span class="sr-only">{cellLabel(answer)}</span>
						{#if answer.student !== null}
							<span
								class="student"
								class:tone-correct={answer.status === 'correct'}
								class:tone-unoptimal={answer.status === 'unoptimal'}
								class:tone-incorrect={answer.status === 'incorrect'}
								data-student
								aria-hidden="true"
							>
								{@render value(answer.cellule, answer.student)}
							</span>
						{/if}
						{#if showsExpected(answer)}
							<span
								class="expected tone-solution"
								class:was-empty={answer.status === 'empty'}
								data-expected
								aria-hidden="true"
							>
								{@render value(answer.cellule, answer.expected)}
							</span>
						{/if}
					</span>
				{/if}
			{/snippet}
		</VariationTable>
	</div>
{/if}

<style>
	.answer-cell {
		display: inline-flex;
		flex-direction: column;
		align-items: center;
		gap: 0.1rem;
		line-height: 1.1;
	}

	.student,
	.expected {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		min-width: 1.4em;
		padding: 0 0.15em;
		border-radius: 4px;
	}

	.expected {
		border: 1.5px solid currentColor;
	}

	.expected.was-empty {
		border-style: dashed;
	}

	.tone-incorrect {
		text-decoration: line-through;
	}

	.token {
		font-weight: 600;
	}

	.token-rien {
		font-size: 0.75em;
		font-style: italic;
		font-weight: 400;
	}

	/* Couleurs posées par ExpectedResultView ; repli sur les tokens hors de lui */
	.tone-correct,
	.tone-solution {
		color: var(--expected-correct, var(--color-green-700, #15803d));
	}

	.tone-incorrect {
		color: var(--expected-incorrect, var(--color-red-700, #b91c1c));
	}

	.tone-unoptimal {
		color: var(--expected-unoptimal, var(--color-amber-700, #b45309));
	}
</style>
