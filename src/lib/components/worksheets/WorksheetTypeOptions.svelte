<!--
	Options du type de fiche (ADR 0030)
	===================================

	Le type de la fiche décide de l'en-tête du PDF ; ce composant ne montre que
	les options du type choisi (`TYPE_OPTION_KEYS`), plus « Mélanger les
	exercices », commune à tous. Utilisé à la création de la fiche et sur sa page
	(MetadataCards) : une seule liste d'options.

	Composant contrôlé : chaque changement remonte par `onchange(clé, valeur)`.
-->
<script lang="ts">
	import { lore } from '$lib/config/lore';
	import { Input } from '$lib/components/ui/input';
	import MySelect from '$lib/components/MySelect.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { ANSWER_FRAME_MODES, CALCULATOR_RULES, isIsoDate } from '$lib/types/worksheets';
	import type {
		AnswerFrameMode,
		CalculatorRule,
		WorksheetConfig,
		WorksheetType
	} from '$lib/types/worksheets';
	import {
		TYPE_OPTION_KEYS,
		type TypeOptionKey,
		type WorksheetOptionKey
	} from '$lib/worksheets/worksheet-header';

	interface Props {
		type: WorksheetType;
		config: WorksheetConfig | null | undefined;
		/** Faux : lecture seule */
		editable?: boolean;
		onchange?: (key: WorksheetOptionKey, value: boolean | string | undefined) => void;
	}

	let { type, config, editable = true, onchange }: Props = $props();

	const CALCULATOR_LABELS: Record<CalculatorRule, string> = {
		allowed: 'Autorisée',
		forbidden: 'Interdite'
	};
	// « Non précisée » permet de retirer la mention de l'en-tête après l'avoir choisie
	const CALCULATOR_UNSPECIFIED = 'unspecified';
	const calculatorItems = [
		{ value: CALCULATOR_UNSPECIFIED, label: 'Non précisée' },
		...CALCULATOR_RULES.map((rule) => ({ value: rule, label: CALCULATOR_LABELS[rule] }))
	];

	// Réponses sur le sujet : où se placent les cadres (lot 3), défaut « question »
	const ANSWER_FRAME_LABELS: Record<AnswerFrameMode, string> = {
		question: 'Après chaque question',
		exercise: "Après l'exercice"
	};
	const answerFrameItems = ANSWER_FRAME_MODES.map((mode) => ({
		value: mode,
		label: ANSWER_FRAME_LABELS[mode]
	}));

	let offered = $derived(TYPE_OPTION_KEYS[type] ?? []);

	function offers(key: TypeOptionKey): boolean {
		return offered.includes(key);
	}

	function handleCalculator(value: string) {
		const rule = CALCULATOR_RULES.find((r) => r === value);
		onchange?.('calculator', rule);
	}

	function handleAnswerFrames(value: string) {
		const mode = ANSWER_FRAME_MODES.find((m) => m === value);
		if (mode) onchange?.('answer_frames', mode);
	}

	function handleDueDate(value: string) {
		// Champ vidé : plus de date de rendu ; date incomplète : rien n'est envoyé
		if (value === '') onchange?.('due_date', undefined);
		else if (isIsoDate(value)) onchange?.('due_date', value);
	}
</script>

<div class="space-y-3 text-sm">
	{#if offers('show_student_name')}
		<MyCheckbox
			checked={config?.show_student_name === true}
			onchange={(v) => onchange?.('show_student_name', v)}
			disabled={!editable}
			label="Nom de l'élève"
		/>
	{/if}

	{#if offers('show_points')}
		<MyCheckbox
			checked={config?.show_points === true}
			onchange={(v) => onchange?.('show_points', v)}
			disabled={!editable}
			label="Points par {lore.learning.exercise} et total"
		/>
	{/if}

	{#if type === 'exam'}
		<p class="text-xs text-muted-foreground">
			Points par {lore.learning.exercise} et total : toujours imprimés. Durée : celle de la fiche.
		</p>
	{/if}

	{#if offers('calculator')}
		<div>
			<p class="mb-1 text-xs text-muted-foreground">Calculatrice</p>
			<MySelect
				type="single"
				value={config?.calculator ?? CALCULATOR_UNSPECIFIED}
				onchange={handleCalculator}
				items={calculatorItems}
				placeholder="Non précisée"
				triggerAriaLabel="Calculatrice autorisée ou interdite"
				disabled={!editable}
			/>
		</div>
	{/if}

	{#if offers('answers_on_sheet')}
		<MyCheckbox
			checked={config?.answers_on_sheet === true}
			onchange={(v) => onchange?.('answers_on_sheet', v)}
			disabled={!editable}
			label="Réponses sur le sujet"
		/>
		{#if config?.answers_on_sheet === true}
			<div class="ml-6">
				<p class="mb-1 text-xs text-muted-foreground">Cadres</p>
				<MySelect
					type="single"
					value={config?.answer_frames ?? 'question'}
					onchange={handleAnswerFrames}
					items={answerFrameItems}
					triggerAriaLabel="Place des cadres de réponse"
					disabled={!editable}
				/>
			</div>
		{/if}
	{/if}

	{#if offers('due_date')}
		<div>
			<label for="worksheet-due-date" class="mb-1 block text-xs text-muted-foreground">
				Date de rendu
			</label>
			<Input
				id="worksheet-due-date"
				type="date"
				class="w-44"
				value={config?.due_date ?? ''}
				oninput={(e) => handleDueDate(e.currentTarget.value)}
				disabled={!editable}
			/>
		</div>
	{/if}

	<MyCheckbox
		checked={config?.shuffle_exercises === true}
		onchange={(v) => onchange?.('shuffle_exercises', v)}
		disabled={!editable}
		label="Mélanger les {lore.learning.exercise}s"
	/>
</div>
