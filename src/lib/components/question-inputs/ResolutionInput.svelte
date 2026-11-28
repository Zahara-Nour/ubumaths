<!--
	@component
	Case « résolution » (outil 55) : l'élève écrit les équations successives, une par
	ligne (3x = 12, puis x = 4). Entrée sur une ligne écrite ajoute une ligne dessous
	(sur une ligne vide : la règle commune, valider la question), la croix retire une ligne. Les lignes voyagent dans UNE valeur de case
	(`formatResolutionAnswer`). Une fois la réponse validée, chaque ligne porte ✓ ou ✗
	(`judgeResolutionAnswer`) — jamais pendant la saisie (décision de David, 2026-11-28).
-->
<script lang="ts">
	import { tick } from 'svelte';
	import { on } from 'svelte/events';
	import type { Attachment } from 'svelte/attachments';
	import { Check, Plus, X } from '@lucide/svelte';
	import type { MathfieldElement } from 'mathlive';
	import MathField from '#lib/components/MathField.svelte';
	import {
		formatResolutionAnswer,
		parseResolutionAnswer
	} from '#lib/questions/resolution/resolution-lines.ts';
	import {
		judgeResolutionAnswer,
		type ResolutionBlankFields,
		type ResolutionLineMark
	} from '#lib/questions/resolution/resolution-answer.ts';

	// Types
	interface Props {
		/** Valeur de la case : les lignes séparées par `\\` */
		value: string;
		/** Verdict de la case : null tant que la réponse n'est pas validée */
		isCorrect: boolean | null;
		disabled: boolean;
		/** Numéro de la case (1, 2…), pour les libellés lus à voix haute */
		caseNumber: number;
		/** Équation de l'énoncé, inconnue : absentes d'une évaluation notée (pas de marques) */
		fields: ResolutionBlankFields;
		onChange: (value: string) => void;
	}

	// Variables
	let { value, isCorrect, disabled, caseNumber, fields, onChange }: Props = $props();

	/** Lignes tapées, vides comprises (une ligne vide ne part pas dans la valeur) */
	let draft = $state<string[]>(['']);
	/** Valeur de la case vue au dernier geste (undefined avant le premier) */
	let seenValue = $state<string | undefined>(undefined);
	let elements = $state<(MathfieldElement | undefined)[]>([]);

	// Lignes affichées : le brouillon tant que la valeur est celle qu'il a écrite, ou
	// celle d'avant (parent pas encore à jour) ; sinon (réponse effacée, carte suivante,
	// copie relue) les lignes de la valeur
	let lines = $derived(
		value === seenValue || value === formatResolutionAnswer(draft) ? draft : linesOf(value)
	);

	// Une fois validée : une marque par ligne ÉCRITE, rapportée aux lignes affichées
	let marks = $derived.by((): (ResolutionLineMark | undefined)[] => {
		if (isCorrect === null || !fields.equation) return [];
		const written = judgeResolutionAnswer(value, fields).lines;
		let k = 0;
		return lines.map((line) => (line.trim() ? written[k++] : undefined));
	});

	// Functions
	function linesOf(text: string): string[] {
		const written = parseResolutionAnswer(text);
		return written.length > 0 ? written : [''];
	}

	/** Nouvelles lignes : brouillon, puis valeur de la case si elle change */
	function commit(next: string[]) {
		seenValue = value;
		draft = next.length > 0 ? next : [''];
		const answer = formatResolutionAnswer(draft);
		if (answer !== value) onChange(answer);
	}

	function update(index: number, text: string) {
		commit(lines.map((line, k) => (k === index ? text : line)));
	}

	async function addLineAfter(index: number) {
		commit([...lines.slice(0, index + 1), '', ...lines.slice(index + 1)]);
		await tick();
		elements[index + 1]?.focus();
	}

	async function removeLine(index: number) {
		commit(lines.filter((_, k) => k !== index));
		await tick();
		elements[Math.max(0, index - 1)]?.focus();
	}

	/**
	 * Entrée dans une ligne : MathLive émet `beforeinput` (`insertLineBreak`), touche
	 * physique comme clavier virtuel. Ligne écrite → une ligne dessous, ici, avant
	 * `FillBlanksInput` ; ligne vide → la règle commune d'Entrée (valider la question, ou
	 * aller à la première case vide)
	 */
	function handleBeforeInput(event: InputEvent, index: number) {
		// WebKit retire parfois `inputType` : MathLive le recopie dans `data`
		if (event.inputType !== 'insertLineBreak' && event.data !== 'insertLineBreak') return;
		if (disabled || !lines[index]?.trim()) return;
		event.preventDefault();
		event.stopPropagation();
		void addLineAfter(index);
	}

	/**
	 * Écouteur NATIF sur la ligne : `onbeforeinput` est délégué par Svelte à la racine,
	 * et l'écouteur de `FillBlanksInput` (sur son conteneur) passerait avant lui
	 */
	function enterKey(index: number): Attachment<HTMLElement> {
		return (node) =>
			on(node, 'beforeinput', (event) => {
				if (event instanceof InputEvent) handleBeforeInput(event, index);
			});
	}

	function markLabel(mark: ResolutionLineMark | undefined): string {
		if (mark === 'ok') return 'ligne juste';
		if (mark === 'not-equivalent') return "pas les mêmes solutions que la ligne d'avant";
		if (mark === 'unreadable') return 'ligne illisible';
		return '';
	}
</script>

<div class="resolution" data-construire-case={caseNumber - 1}>
	<ol class="resolution-lignes">
		{#each lines as line, index (index)}
			{@const mark = marks[index]}
			<li class="resolution-ligne" data-etat={mark}>
				<div class="resolution-champ" {@attach enterKey(index)}>
					<MathField
						value={line}
						bind:element={elements[index]}
						oninput={(event: Event) =>
							update(index, (event.currentTarget as MathfieldElement).value)}
						{...disabled ? { 'read-only': true } : {}}
						aria-label={`Case ${caseNumber}, ligne ${index + 1}`}
					/>
				</div>
				{#if mark}
					<span class="resolution-marque" role="img" aria-label={markLabel(mark)}>
						{#if mark === 'ok'}<Check size={20} />{:else}<X size={20} />{/if}
					</span>
				{:else if !disabled && lines.length > 1}
					<button
						type="button"
						class="resolution-retirer"
						aria-label={`Retirer la ligne ${index + 1}`}
						onclick={() => removeLine(index)}
					>
						<X size={18} />
					</button>
				{/if}
			</li>
		{/each}
	</ol>
	{#if !disabled}
		<button type="button" class="resolution-ajouter" onclick={() => addLineAfter(lines.length - 1)}>
			<Plus size={16} /> Ajouter une ligne
		</button>
	{/if}
</div>

<style>
	.resolution {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		gap: 0.5rem;
		margin: 0.5rem 0;
		max-width: 100%;
	}

	.resolution-lignes {
		display: flex;
		flex-direction: column;
		gap: 0.375rem;
		margin: 0;
		padding: 0;
		list-style: none;
		width: min(100%, 22rem);
	}

	.resolution-ligne {
		display: flex;
		align-items: center;
		gap: 0.375rem;
	}

	.resolution-champ {
		flex: 1;
		min-width: 0;
		border: 1.5px solid var(--color-border);
		border-radius: 0.375rem;
		background: var(--color-background);
	}

	.resolution-champ :global(math-field) {
		width: 100%;
		min-height: 2.75rem;
		padding: 0.25rem 0.5rem;
		font-size: 1.25rem;
		border: none;
		background: transparent;
	}

	.resolution-ligne[data-etat='ok'] .resolution-champ {
		border: 2px solid var(--color-success);
		background: color-mix(in oklab, var(--color-success) 10%, transparent);
	}

	.resolution-ligne[data-etat='not-equivalent'] .resolution-champ,
	.resolution-ligne[data-etat='unreadable'] .resolution-champ {
		border: 2px solid var(--color-destructive);
		background: color-mix(in oklab, var(--color-destructive) 12%, transparent);
	}

	.resolution-marque {
		display: inline-flex;
		width: 2.75rem;
		justify-content: center;
	}

	.resolution-ligne[data-etat='ok'] .resolution-marque {
		color: var(--color-success);
	}

	.resolution-ligne[data-etat='not-equivalent'] .resolution-marque,
	.resolution-ligne[data-etat='unreadable'] .resolution-marque {
		color: var(--color-destructive);
	}

	/* Cibles tactiles de 44 px */
	.resolution-retirer {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 2.75rem;
		height: 2.75rem;
		border: none;
		border-radius: 0.375rem;
		background: transparent;
		color: var(--color-muted-foreground);
		touch-action: manipulation;
	}

	.resolution-retirer:hover {
		background: var(--color-muted);
	}

	.resolution-ajouter {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		min-height: 2.75rem;
		padding: 0 0.75rem;
		border: 1px dashed var(--color-border);
		border-radius: 0.375rem;
		background: var(--color-background);
		color: var(--color-foreground);
		touch-action: manipulation;
	}

	.resolution-ajouter:hover {
		background: var(--color-muted);
	}

	.resolution-retirer:focus-visible,
	.resolution-ajouter:focus-visible {
		outline: 2px solid var(--color-ring);
		outline-offset: 1px;
	}
</style>
