/**
 * FillBlanksInput — case « programme Python » (bloc ```python-a-ecrire, outil 49)
 * =============================================================================
 *
 * L'éditeur de code est prérempli par `depart:` ; « Python se charge… » tant que Pyodide
 * n'est pas prêt. La case enregistre une PRÉPARATION (contexte posé par la carte) : avant la
 * validation, le programme tourne et la valeur reçoit le code ET le verdict. Python est
 * simulé (contexte `PYTHON_CASE_RUNTIME_KEY`) : Pyodide ne se charge pas dans ce test.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FillBlanksInput from '../FillBlanksInput.svelte';
import { generateInstance } from '#lib/questions/generator/instance-generator.ts';
import type { QuestionInstance, QuestionTemplate } from '#lib/questions/types.ts';
import { templateMarkdown } from '#lib/ubumark/index.ts';
import { ANSWER_PREPARATIONS_KEY, createAnswerPreparations } from '../answer-preparations';
import {
	PYTHON_CASE_RUNTIME_KEY,
	type PythonCaseRuntime,
	type PythonRuntimeStatus
} from '../python-case-context';
import { readPythonAnswer, writePythonAnswer } from '#lib/questions/python/python-answer.ts';

// Variables
let mains: HTMLElement[] = [];

// Functions
function mainElement(): HTMLElement {
	const main = document.body.appendChild(document.createElement('main'));
	mains.push(main);
	return main;
}

afterEach(() => {
	for (const m of mains) m.remove();
	mains = [];
});

const STATEMENT = [
	'Écris la fonction `seuil`.',
	'',
	'```python-a-ecrire',
	'fonction: seuil',
	'depart: |',
	'  def seuil(A):',
	'      n = 0',
	'      return n',
	'solution: |',
	'  def seuil(A):',
	'      return 1',
	'essais: seuil(2)',
	'```'
].join('\n');

function generated(): QuestionInstance {
	const result = generateInstance(
		{
			id: 'test-python',
			title: 'Python',
			status: 'draft',
			type: 'fill_in_blanks',
			variations: [{ statement: templateMarkdown(STATEMENT) }],
			grades: ['T_SPE'],
			level: 1
		} as unknown as QuestionTemplate,
		42
	);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

function fakeRuntime(status: PythonRuntimeStatus = 'ready') {
	let current = $state<PythonRuntimeStatus>(status);
	const runtime: PythonCaseRuntime = {
		get status() {
			return current;
		},
		start: vi.fn(),
		judge: vi.fn(async () => ({
			juste: false,
			message: '`seuil(2)` : ta fonction rend 0, on attendait 1.'
		}))
	};
	return { runtime, setStatus: (s: PythonRuntimeStatus) => (current = s) };
}

async function screenOf(
	options: { values?: string[]; status?: PythonRuntimeStatus; showCorrectAnswers?: boolean } = {}
) {
	const instance = generated();
	const values = $state(options.values ?? ['']);
	const preparations = createAnswerPreparations();
	const { runtime, setStatus } = fakeRuntime(options.status);
	const screen = await render(FillBlanksInput, {
		target: mainElement(),
		props: {
			statement: instance.statement,
			blanks: instance.blanks ?? [],
			get values() {
				return values;
			},
			set values(v: string[]) {
				values.splice(0, values.length, ...v);
			},
			showCorrectAnswers: options.showCorrectAnswers ?? false
		},
		context: new Map<unknown, unknown>([
			[ANSWER_PREPARATIONS_KEY, preparations],
			[PYTHON_CASE_RUNTIME_KEY, runtime]
		])
	});
	return { root: screen.container as HTMLElement, values, preparations, runtime, setStatus };
}

describe('FillBlanksInput — case programme Python', () => {
	it('éditeur prérempli par `depart:`, Python lancé dès le montage', async () => {
		const { root, runtime } = await screenOf();
		await expect
			.poll(() => root.querySelector('.python-case .cm-content')?.textContent ?? '')
			.toContain('def seuil(A):');
		expect(runtime.start).toHaveBeenCalled();
	});

	it('« Python se charge… » tant que Pyodide n’est pas prêt', async () => {
		const { root, setStatus } = await screenOf({ status: 'loading' });
		await expect.poll(() => root.textContent).toContain('Python se charge…');
		setStatus('ready');
		await expect.poll(() => root.textContent).not.toContain('Python se charge…');
	});

	it('préparation : le programme tourne, la valeur reçoit le code et le verdict', async () => {
		const code = 'def seuil(A):\n    return 0';
		const { values, preparations, runtime } = await screenOf({
			values: [writePythonAnswer({ code, verdict: null })]
		});
		await preparations.prepareAll();
		expect(runtime.judge).toHaveBeenCalledWith(
			code,
			expect.objectContaining({ fonction: 'seuil' })
		);
		expect(readPythonAnswer(values[0])).toEqual({
			code,
			verdict: { juste: false, message: '`seuil(2)` : ta fonction rend 0, on attendait 1.' }
		});
	});

	it('rien écrit : la préparation ne lance rien, la case reste vide', async () => {
		const { values, preparations, runtime } = await screenOf();
		await preparations.prepareAll();
		expect(runtime.judge).not.toHaveBeenCalled();
		expect(values[0]).toBe('');
	});

	it('bonne réponse (corrigé) : la solution de l’auteur en bloc de code, sans éditeur', async () => {
		const { root } = await screenOf({ showCorrectAnswers: true });
		await expect.poll(() => root.textContent).toContain('return 1');
		expect(root.querySelector('.python-case .cm-editor')).toBeNull();
	});
});
