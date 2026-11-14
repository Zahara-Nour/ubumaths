import { afterEach, describe, expect, it, vi } from 'vitest';

import { JsExecutor } from '../js-executor.svelte';

// Une boucle infinie bloque le worker : son propre délai (setTimeout) ne se déclenche jamais et
// il ne lit plus aucun message, `cancel` compris. Seul `terminate()` l'arrête ; sans cela, toutes
// les exécutions suivantes restaient sans réponse.
describe('JsExecutor : boucle infinie', () => {
	let executeur: JsExecutor | null = null;

	afterEach(() => {
		vi.useRealTimers();
		executeur?.destroy();
		executeur = null;
	});

	it('le délai dépassé arrête le worker, et la console répond de nouveau ensuite', async () => {
		executeur = new JsExecutor();
		const ex = executeur;
		ex.init();
		await vi.waitFor(() => expect(ex.isReady).toBe(true), { timeout: 10_000 });

		vi.useFakeTimers();
		ex.execute('while (true) {}');
		vi.advanceTimersByTime(12_001);
		expect(ex.stderr).toMatch(/lai d'ex/);
		vi.useRealTimers();

		await vi.waitFor(() => expect(ex.isReady).toBe(true), { timeout: 10_000 });
		ex.execute('console.log("encore là");');
		await vi.waitFor(() => expect(ex.stdout).toBe('encore là'), { timeout: 5_000 });
	});
});
