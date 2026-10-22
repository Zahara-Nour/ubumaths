/**
 * Le réglage « Déplacement des points » (demande de David, 2026-10-22) :
 * aimanté (par défaut, au dixième et aux entiers proches) ou fluide (au pixel
 * près, selon le zoom, sans aimantation aux entiers).
 *
 * Le pixel arrive en unités du repère (`1 / ppu`) : à 0,025, un pixel vaut un
 * quarantième d'unité, et deux décimales suffisent à suivre la souris.
 */
import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { FigureToolbox } from '../figure-tools.svelte';
import {
	DEFAULT_POINT_DRAG_MODE,
	POINT_DRAG_MODE_KEY,
	readPointDragMode,
	writePointDragMode
} from '../point-drag-mode';

type Entry = [kind: 'value' | 'point' | 'curve' | 'function', name: string, definition: string];

/** Un pixel au zoom ordinaire : 40 pixels par unité. */
const PIXEL = 0.025;
/** L'aimantation de la toile à ce zoom : 8 pixels. */
const SNAP = 8 * PIXEL;

function atelierOf(entries: Entry[], mode: 'snap' | 'fluid' = 'fluid'): Atelier {
	const atelier = new Atelier();
	for (const [kind, name, definition] of entries) {
		const done = atelier.create({ kind, name, definition }, 'text');
		if (!done.ok) throw new Error(`${name} refusé : ${done.message}`);
	}
	atelier.setPointDragMode(mode);
	return atelier;
}

/** Le point à `degrees` degrés sur le cercle de centre (cx ; cy) et de rayon r. */
function onCircle(cx: number, cy: number, r: number, degrees: number): [number, number] {
	const a = (degrees * Math.PI) / 180;
	return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
}

/** Un stockage en mémoire, comme `localStorage`. */
function memoryStorage(): Storage {
	const map = new Map<string, string>();
	return {
		get length() {
			return map.size;
		},
		clear: () => map.clear(),
		getItem: (key) => map.get(key) ?? null,
		key: (i) => [...map.keys()][i] ?? null,
		removeItem: (key) => void map.delete(key),
		setItem: (key, value) => void map.set(key, value)
	};
}

describe('le réglage : aimanté par défaut, retenu dans ce navigateur', () => {
	it('un atelier neuf glisse aimanté', () => {
		expect(new Atelier().pointDragMode).toBe('snap');
		expect(DEFAULT_POINT_DRAG_MODE).toBe('snap');
	});

	it('le choix écrit se relit ; rien d’écrit ou une valeur inconnue : aimanté', () => {
		const storage = memoryStorage();
		expect(readPointDragMode(storage)).toBe('snap');

		writePointDragMode(storage, 'fluid');
		expect(readPointDragMode(storage)).toBe('fluid');

		storage.setItem(POINT_DRAG_MODE_KEY, 'n’importe quoi');
		expect(readPointDragMode(storage)).toBe('snap');
	});

	it('un stockage refusé (mode privé) : aimanté, sans erreur', () => {
		const refusing = {
			getItem: () => {
				throw new Error('refusé');
			},
			setItem: () => {
				throw new Error('refusé');
			}
		} as unknown as Storage;

		expect(readPointDragMode(refusing)).toBe('snap');
		expect(() => writePointDragMode(refusing, 'fluid')).not.toThrow();
		expect(readPointDragMode(null)).toBe('snap');
	});
});

describe('fluide : un point par coordonnées suit la souris, au pixel près', () => {
	it('au zoom ordinaire, deux décimales : (2,37 ; −0,71)', () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);

		const done = atelier.dragPoint('A', 2.3718, -0.7146, SNAP, PIXEL);

		expect(done.ok).toBe(true);
		expect(atelier.get('A')?.definition).toBe('(2,37 ; -0,71)');
	});

	it('pas d’aimantation aux entiers : (2,98 ; 1,03) reste tel quel', () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);

		atelier.dragPoint('A', 2.98, 1.03, SNAP, PIXEL);

		expect(atelier.get('A')?.definition).toBe('(2,98 ; 1,03)');
	});

	it('zoomé (un pixel vaut 0,002) : trois décimales', () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);

		atelier.dragPoint('A', 2.37184, 0.5, 8 * 0.002, 0.002);

		expect(atelier.get('A')?.definition).toBe('(2,372 ; 0,5)');
	});

	it('dézoomé (un pixel vaut 0,1) : une décimale suffit', () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);

		atelier.dragPoint('A', 2.3718, 0.94, 0.8, 0.1);

		expect(atelier.get('A')?.definition).toBe('(2,4 ; 0,9)');
	});

	it('−0,001 s’écrit 0, jamais « -0 »', () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);

		atelier.dragPoint('A', -0.001, 3, SNAP, PIXEL);

		expect(atelier.get('A')?.definition).toBe('(0 ; 3)');
	});

	it('aimanté, le même geste reste au dixième et s’aimante aux entiers', () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']], 'snap');

		atelier.dragPoint('A', 2.3718, 1.03, SNAP, PIXEL);

		expect(atelier.get('A')?.definition).toBe('(2,4 ; 1)');
	});

	it('repasser en aimanté : le geste suivant est de nouveau aimanté', () => {
		const atelier = atelierOf([['point', 'A', '(1 ; 2)']]);
		atelier.dragPoint('A', 2.3718, -0.7146, SNAP, PIXEL);
		atelier.endGesture();

		atelier.setPointDragMode('snap');
		atelier.dragPoint('A', 2.98, 1.03, SNAP, PIXEL);

		expect(atelier.get('A')?.definition).toBe('(3 ; 1)');
	});
});

describe('fluide : un point sur un objet suit la souris, au pixel près', () => {
	it('sur un grand cercle : 37,4° au lieu de 37°', () => {
		const atelier = atelierOf([
			['point', 'O', '(0 ; 0)'],
			['curve', 'c', 'cercle(O ; 5)'],
			['point', 'M', 'point_sur(c ; 0)']
		]);
		const [x, y] = onCircle(0, 0, 5, 37.4);

		atelier.dragPoint('M', x, y, SNAP, PIXEL);

		expect(atelier.get('M')?.definition).toBe('point_sur(c ; 37,4)');
	});

	it('aimanté, le même geste reste au degré', () => {
		const atelier = atelierOf(
			[
				['point', 'O', '(0 ; 0)'],
				['curve', 'c', 'cercle(O ; 5)'],
				['point', 'M', 'point_sur(c ; 0)']
			],
			'snap'
		);
		const [x, y] = onCircle(0, 0, 5, 37.4);

		atelier.dragPoint('M', x, y, SNAP, PIXEL);

		expect(atelier.get('M')?.definition).toBe('point_sur(c ; 37)');
	});

	it('sur un petit cercle, le degré tombe déjà sous le pixel : il reste entier', () => {
		const atelier = atelierOf([
			['point', 'O', '(0 ; 0)'],
			['curve', 'c', 'cercle(O ; 1)'],
			['point', 'M', 'point_sur(c ; 0)']
		]);
		const [x, y] = onCircle(0, 0, 1, 37.4);

		atelier.dragPoint('M', x, y, SNAP, PIXEL);

		expect(atelier.get('M')?.definition).toBe('point_sur(c ; 37)');
	});

	it('sur la courbe d’une fonction : l’abscisse au pixel près', () => {
		const atelier = atelierOf([
			['function', 'f', 'x^2'],
			['point', 'M', 'point_sur(f ; 1)']
		]);

		atelier.dragPoint('M', 2.03, 0, SNAP, PIXEL);

		expect(atelier.get('M')?.definition).toBe('point_sur(f ; 2,03)');
	});

	it('sur un segment, la position reste dans [0 ; 1]', () => {
		const atelier = atelierOf([
			['point', 'A', '(0 ; 0)'],
			['point', 'B', '(4 ; 0)'],
			['curve', 's', '[AB]'],
			['point', 'M', 'point_sur(s ; 0,3)']
		]);

		atelier.dragPoint('M', 9, 0, SNAP, PIXEL);

		expect(atelier.get('M')?.definition).toBe('point_sur(s ; 1)');
	});
});

describe('fluide : l’outil Point pose au pixel près', () => {
	function bench(lines: readonly string[], mode: 'snap' | 'fluid') {
		const atelier = new Atelier();
		const desk = new CalcDesk(atelier);
		for (const line of lines) desk.submit(line);
		atelier.setPointDragMode(mode);
		const toolbox = new FigureToolbox(atelier, (line) => desk.write(line)?.failed === false);
		const written = () => desk.entries.slice(lines.length).map((e) => e.label);
		toolbox.select('point');
		return { toolbox, written };
	}

	it('un clic dans le vide écrit A = (1,52 ; 2,04)', () => {
		const { toolbox, written } = bench([], 'fluid');

		toolbox.click(1.5218, 2.0391, null, SNAP, { objects: [], radius: SNAP, pixel: PIXEL });

		expect(written()).toEqual(['A = (1,52 ; 2,04)']);
	});

	it('aimanté, le même clic écrit A = (1,5 ; 2)', () => {
		const { toolbox, written } = bench([], 'snap');

		toolbox.click(1.5218, 2.0391, null, SNAP, { objects: [], radius: SNAP, pixel: PIXEL });

		expect(written()).toEqual(['A = (1,5 ; 2)']);
	});

	it('un clic sur un grand cercle : point_sur au pixel près', () => {
		const { toolbox, written } = bench(['O = (0 ; 0)', 'c = cercle(O ; 5)'], 'fluid');
		const [x, y] = onCircle(0, 0, 5, 37.4);

		toolbox.click(x, y, null, SNAP, { objects: ['c'], radius: SNAP, pixel: PIXEL });

		expect(written()).toEqual(['A = point_sur(c ; 37,4)']);
	});

	it('aimanté, le même clic reste au degré', () => {
		const { toolbox, written } = bench(['O = (0 ; 0)', 'c = cercle(O ; 5)'], 'snap');
		const [x, y] = onCircle(0, 0, 5, 37.4);

		toolbox.click(x, y, null, SNAP, { objects: ['c'], radius: SNAP, pixel: PIXEL });

		expect(written()).toEqual(['A = point_sur(c ; 37)']);
	});
});
