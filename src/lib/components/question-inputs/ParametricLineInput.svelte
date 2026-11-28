<!--
	@component
	Case « droite paramétrique » (outil 64) : trois lignes `x =`, `y =`, `z =`, une
	expression du paramètre sur chacune, dans une accolade comme au tableau. Les lignes
	voyagent dans UNE valeur de case (`formatParametricAnswer`), vides comprises. La
	réponse est jugée « même droite » une fois validée (`answer-validator.ts`).
-->
<script lang="ts">
	import type { MathfieldElement } from 'mathlive';
	import MathField from '#lib/components/MathField.svelte';
	import {
		formatParametricAnswer,
		PARAMETRIC_COORDINATES,
		parseParametricAnswer
	} from '#lib/questions/parametric/parametric-lines.ts';

	// Types
	interface Props {
		/** Valeur de la case : `x=…\\y=…\\z=…` */
		value: string;
		/** Verdict de la case : null tant que la réponse n'est pas validée */
		isCorrect: boolean | null;
		disabled: boolean;
		/** Numéro de la case (1, 2…), pour les libellés lus à voix haute */
		caseNumber: number;
		onChange: (value: string) => void;
	}

	// Variables
	let { value, isCorrect, disabled, caseNumber, onChange }: Props = $props();

	/** Lignes tapées, vides comprises */
	let draft = $state<string[]>(linesOf(''));
	/** Valeur de la case vue au dernier geste (undefined avant le premier) */
	let seenValue = $state<string | undefined>(undefined);

	// Lignes affichées : le brouillon tant que la valeur est celle qu'il a écrite, ou celle
	// d'avant (parent pas encore à jour) ; sinon (réponse effacée, carte suivante, copie
	// relue) les lignes de la valeur
	let lines = $derived(value === seenValue || value === answerOf(draft) ? draft : linesOf(value));

	// Ligne où « aller à la première case vide » met le curseur : la première vide, sinon la
	// dernière (sélecteur de `focusSlot`, `FillBlanksInput`)
	let focusLine = $derived.by(() => {
		const empty = lines.findIndex((line) => !line.trim());
		return empty >= 0 ? empty : lines.length - 1;
	});

	// Functions
	/** Une expression par coordonnée, lue dans la valeur de la case */
	function linesOf(text: string): string[] {
		const written = parseParametricAnswer(text);
		return PARAMETRIC_COORDINATES.map((_, k) => written[k] ?? '');
	}

	/** Valeur de la case : vide si rien n'est écrit */
	function answerOf(next: readonly string[]): string {
		return next.every((line) => !line.trim()) ? '' : formatParametricAnswer(next);
	}

	function update(index: number, text: string) {
		seenValue = value;
		draft = lines.map((line, k) => (k === index ? text : line));
		const answer = answerOf(draft);
		if (answer !== value) onChange(answer);
	}
</script>

<div
	class="parametrique"
	data-construire-case={caseNumber - 1}
	data-etat={isCorrect === null ? undefined : isCorrect ? 'ok' : 'faux'}
>
	<span class="parametrique-accolade" aria-hidden="true">{'{'}</span>
	<ol class="parametrique-lignes">
		{#each PARAMETRIC_COORDINATES as name, index (name)}
			<li class="parametrique-ligne">
				<span class="parametrique-nom" aria-hidden="true">
					<i>{name}</i>&nbsp;=
				</span>
				<div class="parametrique-champ">
					<MathField
						value={lines[index]}
						oninput={(event: Event) =>
							update(index, (event.currentTarget as MathfieldElement).value)}
						{...disabled ? { 'read-only': true } : {}}
						{...index === focusLine ? { 'data-parametrique-focus': '' } : {}}
						aria-label={`Case ${caseNumber}, ${name} =`}
					/>
				</div>
			</li>
		{/each}
	</ol>
</div>

<style>
	.parametrique {
		display: flex;
		align-items: stretch;
		gap: 0.25rem;
		margin: 0.5rem 0;
		max-width: 100%;
	}

	.parametrique-accolade {
		display: flex;
		align-items: center;
		font-size: 4.5rem;
		font-weight: 200;
		line-height: 1;
		color: var(--color-muted-foreground);
	}

	.parametrique-lignes {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		margin: 0;
		padding: 0;
		list-style: none;
		width: min(100%, 18rem);
	}

	.parametrique-ligne {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.parametrique-nom {
		flex: none;
		width: 2.5rem;
		font-family: var(--font-serif, 'Times New Roman', serif);
		font-size: 1.25rem;
	}

	.parametrique-champ {
		flex: 1;
		min-width: 0;
		border: 1.5px solid var(--color-border);
		border-radius: 0.375rem;
		background: var(--color-background);
	}

	.parametrique-champ :global(math-field) {
		width: 100%;
		min-height: 2.75rem;
		padding: 0.25rem 0.5rem;
		font-size: 1.25rem;
		border: none;
		background: transparent;
	}

	.parametrique[data-etat='ok'] .parametrique-champ {
		border: 2px solid var(--color-success);
		background: color-mix(in oklab, var(--color-success) 10%, transparent);
	}

	.parametrique[data-etat='faux'] .parametrique-champ {
		border: 2px solid var(--color-destructive);
		background: color-mix(in oklab, var(--color-destructive) 12%, transparent);
	}
</style>
