/**
 * La garde des `render` non attendus
 * ==================================
 *
 * Un `render` de vitest-browser-svelte 3 sans `await` monte quand même le
 * composant : le test passe, rien ne rougit. Ce qui est gardé ici : la garde
 * voit chaque forme d'oubli, et n'accuse pas un appel correct.
 */

import { describe, it, expect } from 'vitest';
import { findUnawaitedRender } from '../check-await-render';

const IMPORT = "import { render } from 'vitest-browser-svelte';\n";

describe('findUnawaitedRender — les oublis', () => {
	it('voit un render non attendu', () => {
		const src = `${IMPORT}it('x', async () => { const s = render(C); });`;
		expect(findUnawaitedRender(src)).toHaveLength(1);
	});

	it('voit un render sur plusieurs lignes (là où un grep par ligne échoue)', () => {
		const src = `${IMPORT}it('x', async () => {\n\tconst s =\n\t\trender(C, {\n\t\t\tprops: {}\n\t\t});\n});`;
		expect(findUnawaitedRender(src)).toEqual([{ line: 4, text: 'render(C, {' }]);
	});

	it('voit un import renommé', () => {
		const src = `import { render as monter } from 'vitest-browser-svelte';\nit('x', async () => { monter(C); });`;
		expect(findUnawaitedRender(src)).toHaveLength(1);
	});

	it('voit un render étalé dans un objet', () => {
		const src = `${IMPORT}function open() { return { ...render(C), extra: 1 }; }`;
		expect(findUnawaitedRender(src)).toHaveLength(1);
	});

	it('voit un unmount déstructuré non attendu', () => {
		const src = `${IMPORT}it('x', async () => { const { unmount } = await render(C); unmount(); });`;
		expect(findUnawaitedRender(src)).toHaveLength(1);
	});
});

describe('findUnawaitedRender — pas de fausse accusation', () => {
	it('accepte await render(…)', () => {
		const src = `${IMPORT}it('x', async () => { const s = await render(C); });`;
		expect(findUnawaitedRender(src)).toEqual([]);
	});

	it('accepte (await render(…)).container', () => {
		const src = `${IMPORT}it('x', async () => { const c = (await render(C)).container; });`;
		expect(findUnawaitedRender(src)).toEqual([]);
	});

	it('accepte await unmount() et await rerender(…)', () => {
		const src = `${IMPORT}it('x', async () => { const v = await render(C); await v.rerender({}); await v.unmount(); });`;
		expect(findUnawaitedRender(src)).toEqual([]);
	});

	it('ignore un render qui ne vient pas de vitest-browser-svelte', () => {
		const src = `import { render } from 'svelte/server';\nconst html = render(C);`;
		expect(findUnawaitedRender(src)).toEqual([]);
	});

	it('ignore l’unmount de svelte dans un fichier qui importe aussi render', () => {
		const src = `${IMPORT}import { mount, unmount } from 'svelte';\nconst app = mount(C, { target });\nunmount(app);`;
		expect(findUnawaitedRender(src)).toEqual([]);
	});

	it('ignore un fichier sans vitest-browser-svelte, même avec un unmount', () => {
		const src = `import { mount, unmount } from 'svelte';\nconst app = mount(C, { target });\nunmount(app);`;
		expect(findUnawaitedRender(src)).toEqual([]);
	});
});
