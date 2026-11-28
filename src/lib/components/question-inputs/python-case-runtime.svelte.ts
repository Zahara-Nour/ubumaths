/**
 * Runtime Python partagé des cases « programme Python » (outil 49)
 * ================================================================
 *
 * Un seul `PlaygroundExecutor` (worker Pyodide des exercices Python) pour toutes les cases de
 * la page, créé à la première case montée. Chargé à la demande par la case (import
 * dynamique) : une page sans case Python ne télécharge ni l'exécuteur ni Pyodide.
 *
 * Boucle sans fin : le délai du fil principal rend la main, mais le worker reste bloqué dans
 * la boucle ; il est alors détruit et remplacé (Pyodide se recharge, depuis le cache du
 * navigateur).
 *
 * @module components/question-inputs/python-case-runtime
 */

import { PlaygroundExecutor } from '#lib/shared/python/index.ts';
import { judgePythonCase, PYTHON_NOT_STARTED } from '#lib/questions/python/judge-python-case.ts';
import type { PythonExpected, PythonVerdict } from '#lib/questions/python/python-answer.ts';
import type { PythonCaseRuntime, PythonRuntimeStatus } from './python-case-context';

/** Attente de Pyodide la plus longue avant de dire « Python n'a pas pu se lancer » */
const READY_TIMEOUT_MS = 60_000;
const READY_POLL_MS = 100;

class SharedPythonCaseRuntime implements PythonCaseRuntime {
	#executor = $state<PlaygroundExecutor | null>(null);

	get status(): PythonRuntimeStatus {
		const executor = this.#executor;
		if (executor === null) return 'idle';
		if (executor.state === 'error') return 'error';
		if (executor.state === 'ready' || executor.state === 'executing') return 'ready';
		return 'loading';
	}

	start(): void {
		if (this.#executor !== null) return;
		const executor = new PlaygroundExecutor();
		executor.initPyodide();
		this.#executor = executor;
	}

	async judge(code: string, expected: PythonExpected): Promise<PythonVerdict> {
		this.start();
		if (!(await this.#whenReady())) return { juste: false, message: PYTHON_NOT_STARTED };
		const executor = this.#executor;
		if (executor === null) return { juste: false, message: PYTHON_NOT_STARTED };
		return judgePythonCase(code, expected, executor, { onStuck: () => this.#replace() });
	}

	/** Prêt, ou faux après une erreur de chargement ou le délai */
	async #whenReady(): Promise<boolean> {
		const deadline = Date.now() + READY_TIMEOUT_MS;
		while (Date.now() < deadline) {
			const status = this.status;
			if (status === 'ready') return true;
			if (status === 'error') return false;
			await new Promise((resolve) => setTimeout(resolve, READY_POLL_MS));
		}
		return false;
	}

	/** Worker bloqué dans une boucle sans fin : détruit, remplacé */
	#replace(): void {
		this.#executor?.destroy();
		this.#executor = null;
		this.start();
	}
}

/** Le runtime de la page */
export const sharedPythonCaseRuntime: PythonCaseRuntime = new SharedPythonCaseRuntime();
