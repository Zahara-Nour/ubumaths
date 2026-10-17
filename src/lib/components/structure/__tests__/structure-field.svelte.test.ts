/**
 * Champ de formule — écrire, explorer, déplacer (spécification F du glisser-déposer)
 * ==================================================================================
 *
 * `docs/wip/structure-glisser-deposer-progress.md`, spécification F (validée par
 * David le 2026-10-14) : survol (règles A, cadres imbriqués), clic court pour
 * écrire, appui puis mouvement pour déplacer, « Annuler », réglages, 6e,
 * barre de fraction, mode tactile.
 *
 * Les gestes sont des `PointerEvent` envoyés au champ, comme dans les tests du
 * grapheur ; le passage à la vraie souris est vérifié à part (Playwright).
 */
import { beforeAll, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
// Comme la page : polices et classes du rendu MathLive
import '$lib/utils/mathlive-styles';
import { MARKER_PREFIX, stripMarkers, structureFromLatex } from '$lib/mathAST/structure';
import StructureFieldHarness from './StructureFieldHarness.svelte';

// Types
type HarnessProps = {
	latex: string;
	readerGrade?: string | null;
	structure?: boolean;
	reading?: boolean;
	move?: boolean;
	touch?: boolean;
};

beforeAll(async () => {
	// MathLive : import dynamique dans les tests client (docs/pratiques/tests.md § Pièges)
	await import('mathlive');
});

// Fonctions
async function renderField(props: HarnessProps) {
	const result = await render(StructureFieldHarness, props);
	const stage = () => result.container.querySelector<HTMLElement>('[data-field-stage]');
	await expect.poll(() => stage()?.querySelector('.ML__latex') ?? null).not.toBeNull();
	return { ...result, stage };
}

function latexOf(container: HTMLElement): string {
	return container.querySelector('[data-testid="latex"]')?.textContent ?? '';
}

/** L'identifiant de la sous-expression qui s'écrit `text` (sans marqueurs) */
function idOf(latex: string, text: string): number {
	const result = structureFromLatex(latex);
	if (result.status !== 'ok') throw new Error(`non reconnue : ${latex}`);
	const node = result.structure.nodes.find((n) => stripMarkers(n.latex) === text);
	if (!node) throw new Error(`pas de « ${text} »`);
	return node.id;
}

/** Zone des caractères d'une sous-expression rendue */
function rectOf(container: HTMLElement, id: number): DOMRect {
	const element = container.querySelector(`[data-field-stage] .${MARKER_PREFIX}${id}`);
	if (!element) throw new Error(`marqueur ${id} absent`);
	const range = document.createRange();
	range.selectNodeContents(element);
	return range.getBoundingClientRect();
}

function pointer(type: string, x: number, y: number, target: Element) {
	target.dispatchEvent(
		new PointerEvent(type, {
			clientX: x,
			clientY: y,
			bubbles: true,
			pointerId: 1,
			pointerType: 'mouse',
			button: 0,
			isPrimary: true
		})
	);
}

function framedId(container: HTMLElement): string | null {
	return container.querySelector('[data-field]')?.getAttribute('data-framed-id') ?? null;
}

/** Appui en (x, y), mouvement par petits pas jusqu'à (toX, y), relâché */
async function dragTo(target: Element, x: number, y: number, toX: number) {
	pointer('pointermove', x, y, target);
	pointer('pointerdown', x, y, target);
	for (let i = 1; i <= 12; i++) {
		pointer('pointermove', x + ((toX - x) * i) / 12, y, target);
		await new Promise((resolve) => requestAnimationFrame(resolve));
	}
	await new Promise((resolve) => setTimeout(resolve, 250));
	pointer('pointerup', toX, y, target);
}

describe('F2 — survol : règles A, cadres imbriqués', () => {
	it('sur x : x est encadré ; sur la bordure de 2x : 2x, avec le fond de sa somme', async () => {
		const { container } = await renderField({ latex: '2x+1' });
		const field = container.querySelector('[data-field]');
		if (!field) throw new Error('champ absent');
		const x = rectOf(container, idOf('2x+1', 'x'));
		pointer('pointermove', x.left + x.width / 2, x.top + x.height / 2, field);
		await expect.poll(() => framedId(container)).toBe(String(idOf('2x+1', 'x')));

		const twoX = rectOf(container, idOf('2x+1', '2 x'));
		pointer('pointermove', twoX.left - 4, twoX.top + twoX.height / 2, field);
		await expect.poll(() => framedId(container)).toBe(String(idOf('2x+1', '2 x')));
		await expect
			.poll(() => container.querySelector('.group-frame:not([hidden])')?.textContent ?? '')
			.toContain('somme · 2 termes');
	});

	it('sur le « + » : la somme entière, sans fond de groupe (elle ne se déplace pas)', async () => {
		const { container } = await renderField({ latex: '2x+1' });
		const field = container.querySelector('[data-field]');
		if (!field) throw new Error('champ absent');
		const twoX = rectOf(container, idOf('2x+1', '2 x'));
		const one = rectOf(container, idOf('2x+1', '1'));
		pointer('pointermove', (twoX.right + one.left) / 2, twoX.top + twoX.height / 2, field);
		await expect.poll(() => framedId(container)).toBe(String(idOf('2x+1', '2 x + 1')));
		expect(container.querySelector('.group-frame:not([hidden])')).toBeNull();
	});

	it('barre de fraction : un cadre du numérateur ne descend pas sous la barre', async () => {
		const latex = String.raw`\frac{2+x}{3}`;
		const { container } = await renderField({ latex });
		const field = container.querySelector('[data-field]');
		const line = container.querySelector('[data-field-stage] .ML__frac-line');
		if (!field || !line) throw new Error('champ ou barre absents');
		const bar = line.getBoundingClientRect();
		const two = rectOf(container, idOf(latex, '2'));
		pointer('pointermove', two.left + two.width / 2, two.top + 4, field);
		await expect.poll(() => framedId(container)).toBe(String(idOf(latex, '2')));
		const frame = container
			.querySelector('.structure-frame:not([hidden])')
			?.getBoundingClientRect();
		expect(frame?.bottom).toBeLessThanOrEqual(bar.top);
	});
});

describe('F2/F4 — appui puis mouvement : déplacer', () => {
	it('2x + 1 : 1 glissé en tête → 1 + 2x', async () => {
		const { container } = await renderField({ latex: '2x+1' });
		const field = container.querySelector('[data-field]');
		if (!field) throw new Error('champ absent');
		const one = rectOf(container, idOf('2x+1', '1'));
		const twoX = rectOf(container, idOf('2x+1', '2 x'));
		await dragTo(field, one.left + one.width / 2, one.top + one.height / 2, twoX.left - 10);
		await expect.poll(() => latexOf(container)).toBe('1 + 2 x');
	});

	it('appui hors de toute partie, puis mouvement : rien ne change', async () => {
		const { container } = await renderField({ latex: '2x+1' });
		const field = container.querySelector('[data-field]');
		if (!field) throw new Error('champ absent');
		const twoX = rectOf(container, idOf('2x+1', '2 x'));
		const one = rectOf(container, idOf('2x+1', '1'));
		const plusX = (twoX.right + one.left) / 2;
		await dragTo(field, plusX, twoX.top + twoX.height / 2, plusX + 60);
		await new Promise((resolve) => setTimeout(resolve, 300));
		expect(latexOf(container)).toBe('2x+1');
	});

	it('réglage « déplacer » décoché : rien ne part', async () => {
		const { container } = await renderField({ latex: '2x+1', move: false });
		const field = container.querySelector('[data-field]');
		if (!field) throw new Error('champ absent');
		const one = rectOf(container, idOf('2x+1', '1'));
		const twoX = rectOf(container, idOf('2x+1', '2 x'));
		await dragTo(field, one.left + one.width / 2, one.top + one.height / 2, twoX.left - 10);
		await new Promise((resolve) => setTimeout(resolve, 300));
		expect(latexOf(container)).toBe('2x+1');
	});
});

/** Appui, mouvement jusqu'à (toX, y), puis `finish` à la place du relâcher */
async function dragThen(target: Element, x: number, y: number, toX: number, finish: () => void) {
	pointer('pointermove', x, y, target);
	pointer('pointerdown', x, y, target);
	for (let i = 1; i <= 12; i++) {
		pointer('pointermove', x + ((toX - x) * i) / 12, y, target);
		await new Promise((resolve) => requestAnimationFrame(resolve));
	}
	await new Promise((resolve) => setTimeout(resolve, 200));
	finish();
	await new Promise((resolve) => setTimeout(resolve, 300));
}

describe('F4 — un déplacement interrompu ne change rien (E2.5)', () => {
	it('Échap pendant le glisser : la partie revient à sa place', async () => {
		const { container } = await renderField({ latex: '2x+1' });
		const field = container.querySelector('[data-field]');
		if (!field) throw new Error('champ absent');
		const one = rectOf(container, idOf('2x+1', '1'));
		const twoX = rectOf(container, idOf('2x+1', '2 x'));
		await dragThen(field, one.left + one.width / 2, one.top + one.height / 2, twoX.left - 10, () =>
			window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
		);
		expect(latexOf(container)).toBe('2x+1');
	});

	it('geste annulé par le système (pointercancel) : rien ne change', async () => {
		const { container } = await renderField({ latex: '2x+1' });
		const field = container.querySelector('[data-field]');
		if (!field) throw new Error('champ absent');
		const one = rectOf(container, idOf('2x+1', '1'));
		const twoX = rectOf(container, idOf('2x+1', '2 x'));
		await dragThen(field, one.left + one.width / 2, one.top + one.height / 2, twoX.left - 10, () =>
			pointer('pointercancel', twoX.left - 10, one.top + one.height / 2, field)
		);
		expect(latexOf(container)).toBe('2x+1');
	});
});

describe('F5 — Annuler', () => {
	it('revient au déplacement précédent ; grisé quand il n’y a rien à annuler', async () => {
		const { container } = await renderField({ latex: '2x+1' });
		const field = container.querySelector('[data-field]');
		const undo = () => container.querySelector<HTMLButtonElement>('[data-undo]');
		if (!field) throw new Error('champ absent');
		expect(undo()?.disabled).toBe(true);
		const one = rectOf(container, idOf('2x+1', '1'));
		const twoX = rectOf(container, idOf('2x+1', '2 x'));
		await dragTo(field, one.left + one.width / 2, one.top + one.height / 2, twoX.left - 10);
		await expect.poll(() => latexOf(container)).toBe('1 + 2 x');
		await expect.poll(() => undo()?.disabled).toBe(false);
		undo()?.click();
		await expect.poll(() => latexOf(container)).toBe('2x+1');
		await expect.poll(() => undo()?.disabled).toBe(true);
	});
});

describe('F5 — une saisie vide l’historique', () => {
	it('après un déplacement, une frappe : « Annuler » grisé', async () => {
		const { container } = await renderField({ latex: '2x+1' });
		const field = container.querySelector('[data-field]');
		const undo = () => container.querySelector<HTMLButtonElement>('[data-undo]');
		if (!field) throw new Error('champ absent');
		const one = rectOf(container, idOf('2x+1', '1'));
		const twoX = rectOf(container, idOf('2x+1', '2 x'));
		await dragTo(field, one.left + one.width / 2, one.top + one.height / 2, twoX.left - 10);
		await expect.poll(() => undo()?.disabled).toBe(false);
		const plus = rectOf(container, idOf('1 + 2 x', '1'));
		pointer('pointerdown', plus.left + 2, plus.top + 4, field);
		pointer('pointerup', plus.left + 2, plus.top + 4, field);
		const editor = () => container.querySelector<HTMLElement & { value: string }>('math-field');
		await expect.poll(() => editor()).not.toBeNull();
		const mf = editor();
		if (!mf) throw new Error('saisie absente');
		mf.value = '1+2x+3';
		mf.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		await expect.poll(() => latexOf(container)).toBe('1+2x+3');
		expect(undo()?.disabled).toBe(true);
	});
});

describe('clavier : le champ s’atteint et s’écrit sans souris', () => {
	it('focusable ; Entrée ouvre la saisie', async () => {
		const { container } = await renderField({ latex: '2x+1' });
		const field = container.querySelector<HTMLElement>('[data-field]');
		if (!field) throw new Error('champ absent');
		expect(field.tabIndex).toBe(0);
		field.focus();
		field.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		await expect.poll(() => container.querySelector('math-field')).not.toBeNull();
	});
});

describe('F2 — clic court : écrire', () => {
	it('le champ de saisie s’ouvre ; Entrée garde ce qu’on a écrit', async () => {
		const { container } = await renderField({ latex: '2x+1' });
		const field = container.querySelector('[data-field]');
		if (!field) throw new Error('champ absent');
		const x = rectOf(container, idOf('2x+1', 'x'));
		const cx = x.left + x.width / 2;
		const cy = x.top + x.height / 2;
		pointer('pointermove', cx, cy, field);
		pointer('pointerdown', cx, cy, field);
		pointer('pointerup', cx, cy, field);
		const editor = () => container.querySelector<HTMLElement & { value: string }>('math-field');
		await expect.poll(() => editor()).not.toBeNull();
		const mf = editor();
		if (!mf) throw new Error('saisie absente');
		mf.value = '2x+5';
		mf.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
		await expect.poll(() => latexOf(container)).toBe('2x+5');
		await expect.poll(() => editor()).toBeNull();
	});

	it('Échap : rien ne change', async () => {
		const { container } = await renderField({ latex: '2x+1' });
		const field = container.querySelector('[data-field]');
		if (!field) throw new Error('champ absent');
		const x = rectOf(container, idOf('2x+1', 'x'));
		pointer('pointerdown', x.left + 2, x.top + 4, field);
		pointer('pointerup', x.left + 2, x.top + 4, field);
		const editor = () => container.querySelector<HTMLElement & { value: string }>('math-field');
		await expect.poll(() => editor()).not.toBeNull();
		const mf = editor();
		if (!mf) throw new Error('saisie absente');
		mf.value = '9';
		mf.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
		await expect.poll(() => editor()).toBeNull();
		expect(latexOf(container)).toBe('2x+1');
	});
});

describe('F1 — réglages', () => {
	it('« structure » décoché : un champ ordinaire, aucun cadre', async () => {
		const { container } = await renderField({ latex: '2x+1', structure: false, move: false });
		const field = container.querySelector('[data-field]');
		if (!field) throw new Error('champ absent');
		const rect = field.getBoundingClientRect();
		pointer('pointermove', rect.left + rect.width / 2, rect.top + rect.height / 2, field);
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(container.querySelector('.structure-frame:not([hidden])')).toBeNull();
	});

	it('« lecture » : la phrase en français sous la formule, seulement si cochée', async () => {
		const withReading = await renderField({ latex: '2x+1', reading: true });
		await expect
			.poll(() => withReading.container.querySelector('[data-reading="whole"]')?.textContent ?? '')
			.toContain('somme');
		const without = await renderField({ latex: '2x+1', reading: false });
		expect(without.container.querySelector('[data-reading="whole"]')).toBeNull();
	});
});

describe('F7 — élève de 6e ou avant', () => {
	it('une somme qui contient une soustraction ne se déplace pas', async () => {
		const { container } = await renderField({ latex: '12-4', readerGrade: '6' });
		const field = container.querySelector('[data-field]');
		if (!field) throw new Error('champ absent');
		const four = rectOf(container, idOf('12-4', '4'));
		const twelve = rectOf(container, idOf('12-4', '12'));
		await dragTo(field, four.left + four.width / 2, four.top + four.height / 2, twelve.left - 10);
		await new Promise((resolve) => setTimeout(resolve, 300));
		expect(latexOf(container)).toBe('12-4');
	});

	it('une somme d’additions seules se déplace', async () => {
		const { container } = await renderField({ latex: '2+3', readerGrade: '6' });
		const field = container.querySelector('[data-field]');
		if (!field) throw new Error('champ absent');
		const three = rectOf(container, idOf('2+3', '3'));
		const two = rectOf(container, idOf('2+3', '2'));
		await dragTo(field, three.left + three.width / 2, three.top + three.height / 2, two.left - 10);
		await expect.poll(() => latexOf(container)).toBe('3 + 2');
	});
});

describe('F3 — mode tactile : les cadres restent après un lâcher sur place', () => {
	it('appui, petit mouvement, lâcher : toujours 6 cadres', async () => {
		const { container } = await renderField({ latex: '2x+3y', touch: true });
		const field = container.querySelector('[data-field]');
		if (!field) throw new Error('champ absent');
		await expect.poll(() => container.querySelectorAll('.part-outline').length).toBe(6);
		const y = rectOf(container, idOf('2x+3y', 'y'));
		await dragTo(field, y.left + y.width / 2, y.top + y.height / 2, y.left + y.width / 2 + 8);
		await new Promise((resolve) => setTimeout(resolve, 300));
		expect(latexOf(container)).toBe('2x+3y');
		await expect.poll(() => container.querySelectorAll('.part-outline').length).toBe(6);
	});
});

describe('F3 — mode tactile', () => {
	it('les cadres des parties déplaçables sont visibles, la formule est écartée', async () => {
		const mouse = await renderField({ latex: '2x+3y' });
		const width = (c: HTMLElement) =>
			c.querySelector('[data-field-stage] .ML__latex')?.getBoundingClientRect().width ?? 0;
		const mouseWidth = width(mouse.container);
		const touch = await renderField({ latex: '2x+3y', touch: true });
		// 2x, 2, x, 3y, 3, y
		await expect.poll(() => touch.container.querySelectorAll('.part-outline').length).toBe(6);
		expect(width(touch.container)).toBeGreaterThan(mouseWidth);
	});
});
