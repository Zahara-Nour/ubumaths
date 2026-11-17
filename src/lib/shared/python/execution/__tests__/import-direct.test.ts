import { describe, expect, it } from 'vitest';

// Blockly charge l'exécuteur Python par import direct du fichier, sans passer par le barrel
// `$lib/shared/python`. base-executor importait ce barrel, qui ré-exporte notebook-executor :
// `class NotebookExecutor extends BasePythonExecutor` s'évaluait avant BasePythonExecutor →
// « Cannot access 'BasePythonExecutor' before initialization ».
describe('exécuteurs Python importés directement', () => {
	it('playground-executor se charge sans passer par le barrel', async () => {
		const mod = await import('../playground-executor.svelte');
		expect(typeof mod.PlaygroundExecutor).toBe('function');
	});
});
