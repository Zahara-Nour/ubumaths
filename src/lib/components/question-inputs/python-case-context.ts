/**
 * Python d'une case « programme Python » (outil 49) — contexte
 * ============================================================
 *
 * La case demande à un « runtime » de lancer Pyodide et de juger le programme. Par défaut,
 * le runtime partagé de la page (`python-case-runtime.svelte.ts`, un seul worker pour toutes
 * les cases), chargé à la demande ; un test pose le sien par ce contexte.
 *
 * @module components/question-inputs/python-case-context
 */

import { getContext, hasContext } from 'svelte';
import type { PythonExpected, PythonVerdict } from '#lib/questions/python/python-answer.ts';

/** idle : pas lancé ; loading : Pyodide se charge ; ready : prêt ; error : chargement raté */
export type PythonRuntimeStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface PythonCaseRuntime {
	/** État de Python (réactif dans le runtime partagé) */
	readonly status: PythonRuntimeStatus;
	/** Lance le chargement de Pyodide s'il ne l'est pas */
	start(): void;
	/** Juge un programme (attend que Python soit prêt) ; ne lève jamais */
	judge(code: string, expected: PythonExpected): Promise<PythonVerdict>;
}

export const PYTHON_CASE_RUNTIME_KEY = Symbol('python-case-runtime');

/** Le runtime posé par le contexte (tests) ; absent : le runtime partagé */
export function readPythonCaseRuntime(): PythonCaseRuntime | undefined {
	return hasContext(PYTHON_CASE_RUNTIME_KEY)
		? getContext<PythonCaseRuntime>(PYTHON_CASE_RUNTIME_KEY)
		: undefined;
}
