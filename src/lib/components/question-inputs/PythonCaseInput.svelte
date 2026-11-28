<!--
	@component
	Case « programme Python » (bloc ```python-a-ecrire, outil 49) : un éditeur de code prérempli
	par `depart:`, librement modifiable. « Valider » attend la préparation de la case (registre
	de la carte, `answer-preparations.ts`) : le programme tourne dans le navigateur (Pyodide),
	comparé à la solution de l'auteur sur chaque essai, et la valeur reçoit le code ET le
	verdict (`writePythonAnswer`). Le juge de la case ne fait que lire ce verdict.

	- Tant que Pyodide n'est pas prêt : « Python se charge… ».
	- Après la validation : le message du verdict (premier essai raté, erreur de syntaxe…).
	- Sans réponse attendue (énoncé d'aperçu) : rien n'est jugé, la valeur reste sans verdict.
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import PythonEditor from '#lib/components/python/PythonEditor.svelte';
	import type { CompletionProvider } from '#lib/shared/python/index.ts';
	import type { PythonAEcrireSpec } from '#lib/ubumark/types/python-a-ecrire.ts';
	import {
		readExpectedPythonAnswer,
		readPythonAnswer,
		writePythonAnswer
	} from '#lib/questions/python/python-answer.ts';
	import { readAnswerPreparations } from './answer-preparations';
	import { readPythonCaseRuntime, type PythonCaseRuntime } from './python-case-context';

	// Types
	interface Props {
		spec: PythonAEcrireSpec;
		/** Réponse attendue de la case (fonction, solution, essais) ; absente : rien à juger */
		expected?: string;
		/** Valeur de la case : code + verdict (`writePythonAnswer`), '' tant que rien n'est écrit */
		value: string;
		/** Verdict de la case : null tant que la réponse n'est pas validée */
		isCorrect: boolean | null;
		disabled: boolean;
		onChange: (value: string) => void;
	}

	// Constantes
	/** Pas d'autocomplétion dans une question (sinon repli sur le terrain de jeu Python) */
	const NO_COMPLETION: CompletionProvider = { requestCompletion: async () => [] };

	// Variables
	let { spec, expected, value, isCorrect, disabled, onChange }: Props = $props();

	const preparations = readAnswerPreparations();
	let runtime = $state<PythonCaseRuntime | null>(readPythonCaseRuntime() ?? null);
	// Code de l'éditeur, pris une fois : celui de la valeur (carte remontée), sinon le départ de
	// l'auteur ; ensuite l'éditeur le change
	// svelte-ignore state_referenced_locally
	const initialCode = readPythonAnswer(value)?.code ?? spec.depart;
	let code = $state(initialCode);
	let running = $state(false);
	// Runtime partagé chargé à la demande (absent du contexte) : « Valider » l'attend
	let runtimeLoading: Promise<void> | null = null;
	let importFailed = $state(false);

	let status = $derived(importFailed ? 'error' : (runtime?.status ?? 'idle'));
	let locked = $derived(disabled || running || isCorrect !== null);
	let message = $derived(
		isCorrect === false ? readPythonAnswer(value)?.verdict?.message : undefined
	);

	// Functions
	/** Frappe dans l'éditeur : la valeur porte le nouveau code, sans verdict */
	function handleEdit(next: string) {
		if (next === code) return;
		code = next;
		onChange(next.trim() === '' ? '' : writePythonAnswer({ code: next, verdict: null }));
	}

	/** Avant la validation : le programme tourne, la valeur reçoit son verdict */
	async function prepare(): Promise<void> {
		if (runtime === null && runtimeLoading !== null) await runtimeLoading;
		if (disabled || isCorrect !== null || runtime === null) return;
		const answer = readPythonAnswer(value);
		const attendu = expected === undefined ? null : readExpectedPythonAnswer(expected);
		if (answer === null || answer.verdict !== null || attendu === null) return;
		running = true;
		try {
			const verdict = await runtime.judge(answer.code, attendu);
			onChange(writePythonAnswer({ code: answer.code, verdict }));
		} finally {
			running = false;
		}
	}

	onMount(() => {
		const unregister = preparations?.register(prepare);
		if (runtime !== null) {
			runtime.start();
		} else {
			// Runtime partagé chargé à la demande : l'exécuteur et Pyodide ne viennent qu'ici
			runtimeLoading = import('./python-case-runtime.svelte.ts')
				.then(({ sharedPythonCaseRuntime }) => {
					runtime = sharedPythonCaseRuntime;
					sharedPythonCaseRuntime.start();
				})
				.catch((error: unknown) => {
					// Hors ligne, déploiement changé : la case le dit, la carte reste utilisable
					console.error('[PythonCaseInput] Chargement de Python en échec :', error);
					importFailed = true;
				});
		}
		return () => unregister?.();
	});
</script>

<div class="python-case my-3 flex flex-col gap-2" data-python-case>
	<!-- Verrouillé (validé, programme en cours) : `inert`, l'éditeur ne change pas son readOnly après coup -->
	<div
		class="h-64 overflow-hidden rounded-md border border-border"
		class:opacity-80={locked}
		inert={locked}
	>
		<PythonEditor bind:value={() => code, handleEdit} executor={NO_COMPLETION} />
	</div>
	{#if running}
		<p class="text-sm text-muted-foreground" role="status">Ton programme tourne…</p>
	{:else if status === 'loading' && isCorrect === null}
		<p class="text-sm text-muted-foreground" role="status">Python se charge…</p>
	{:else if status === 'error' && isCorrect === null}
		<p class="text-sm text-destructive" role="status">Python n’a pas pu se charger.</p>
	{/if}
	{#if message}
		<p class="text-sm text-destructive">{message}</p>
	{/if}
</div>
