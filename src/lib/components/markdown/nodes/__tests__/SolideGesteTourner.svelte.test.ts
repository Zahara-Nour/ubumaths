/**
 * Vecteur à tracer sur un solide que l'on peut tourner (```solide + `tracer:` +
 * `tourner: oui`) — chantier `solides-3d`, lot 5 (journal, § 12, comportements
 * 38 à 52) : toucher un point = poser, glisser = tourner.
 *
 * Rendu dans <main> : décor réel de l'application (`app.css` y impose des règles).
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import SolideGeste from '../SolideGeste.svelte';
import { parseEspaceContent } from '#lib/ubumark/parser/espace-parser.ts';

let mains: HTMLElement[] = [];
function mainElement(): HTMLElement {
	const main = document.body.appendChild(document.createElement('main'));
	mains.push(main);
	return main;
}
afterEach(() => {
	for (const m of mains) m.remove();
	mains = [];
});

const CUBE = ['forme: cube 2', 'sommets: A B C D E F G H'];
const node = (...lines: string[]) => parseEspaceContent(lines.join('\n'), 'solide');
const turning = () => node(...CUBE, 'tracer: vecteur AB + AD', 'tourner: oui');

const figures = (root: Element) => [...root.querySelectorAll<SVGSVGElement>('svg.solide-figure')];
const traits = (svg: Element) =>
	[...svg.querySelectorAll('polyline')].map((l) => l.getAttribute('points')).join(' | ');
const points = (root: Element) => [
	...root.querySelectorAll<SVGElement>('.solide-geste [role="button"].solide-cliquable')
];
const point = (root: Element, name: string) =>
	points(root).find((p) => p.getAttribute('aria-label')?.startsWith(`Point ${name}`))!;
const button = (root: Element, name: string) =>
	[...root.querySelectorAll<HTMLButtonElement>('.solide-geste button')].find(
		(b) => b.textContent?.trim() === name
	);
const resetButtons = (root: Element) =>
	[...root.querySelectorAll('button')].filter((b) => b.textContent?.includes('Vue de départ'));
const arrowPlace = (root: Element) => {
	const line = root.querySelector('.solide-fleche-eleve line');
	return line === null ? null : ['x1', 'y1', 'x2', 'y2'].map((a) => line.getAttribute(a)).join(',');
};

function answerProbe(initial = '') {
	const probe = { value: initial, changes: [] as string[] };
	return {
		probe,
		answer: () => ({
			value: probe.value,
			isCorrect: null,
			disabled: false,
			onChange: (value: string) => {
				probe.value = value;
				probe.changes.push(value);
			}
		})
	};
}

/** Glissement parti de `from` (un point, ou la figure) ; le clic que le navigateur envoie ensuite */
function drag(from: Element, dx: number, dy: number, thenClick = false) {
	const box = from.getBoundingClientRect();
	const x = box.left + box.width / 2;
	const y = box.top + box.height / 2;
	const event = (type: string, clientX: number, clientY: number) =>
		from.dispatchEvent(
			new PointerEvent(type, {
				pointerId: 7,
				isPrimary: true,
				button: 0,
				clientX,
				clientY,
				bubbles: true
			})
		);
	event('pointerdown', x, y);
	event('pointermove', x + dx / 2, y + dy / 2);
	event('pointermove', x + dx, y + dy);
	event('pointerup', x + dx, y + dy);
	if (thenClick) {
		from.dispatchEvent(
			new MouseEvent('click', { bubbles: true, clientX: x + dx, clientY: y + dy })
		);
	}
}

describe('SolideGeste — sans tourner: (comportement 38)', () => {
	it('rien ne change : ni clavier sur la figure, ni bouton, ni consigne', async () => {
		const screen = await render(SolideGeste, {
			target: mainElement(),
			props: { node: node(...CUBE, 'tracer: vecteur AB + AD'), answer: answerProbe().answer() }
		});
		const svg = figures(screen.container)[0];
		expect(svg.hasAttribute('tabindex')).toBe(false);
		expect(getComputedStyle(svg).touchAction).not.toBe('none');
		expect(resetButtons(screen.container)).toHaveLength(0);
		expect(screen.container.textContent).not.toContain('Figure à tourner');
		// Le glissement ne tourne rien
		const before = traits(svg);
		drag(svg, 120, 30);
		await new Promise((r) => setTimeout(r, 100));
		expect(traits(svg)).toBe(before);
	});
});

describe('SolideGeste — tourner: oui', () => {
	it('au repos : points à toucher, boutons, consigne ; nom accessible complété (39, 51)', async () => {
		const screen = await render(SolideGeste, {
			target: mainElement(),
			props: { node: turning(), answer: answerProbe().answer() }
		});
		const root = screen.container;
		const svg = figures(root)[0];
		expect(points(root)).toHaveLength(8);
		expect(button(root, 'Origine')).toBeDefined();
		expect(button(root, 'Effacer')).toBeDefined();
		expect(svg.getAttribute('tabindex')).toBe('0');
		expect(getComputedStyle(svg).touchAction).toBe('none');
		const label = svg.getAttribute('aria-label') ?? '';
		expect(label).toContain('figure que l’on peut tourner');
		expect(label).toContain('points à toucher');
		expect(label).not.toMatch(/cube/i);
		expect(root.textContent).toContain('Figure à tourner');
		expect(resetButtons(root)).toHaveLength(0);
	});

	it('toucher sans glisser pose le point ; la figure ne tourne pas (40)', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(SolideGeste, {
			target: mainElement(),
			props: { node: turning(), answer: answer() }
		});
		const root = screen.container;
		const before = traits(figures(root)[0]);
		await userEvent.click(point(root, 'A'));
		await expect.poll(() => probe.value).toBe('A/');
		await userEvent.click(point(root, 'C'));
		await expect.poll(() => probe.value).toBe('A/C');
		expect(traits(figures(root)[0])).toBe(before);
		expect(resetButtons(root)).toHaveLength(0);
	});

	it('glisser depuis un point tourne la figure et ne pose rien (41)', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(SolideGeste, {
			target: mainElement(),
			props: { node: turning(), answer: answer() }
		});
		const root = screen.container;
		const before = traits(figures(root)[0]);
		drag(point(root, 'A'), 120, 30, true);
		await expect.poll(() => resetButtons(root)).toHaveLength(1);
		expect(traits(figures(root)[0])).not.toBe(before);
		expect(probe.changes).toEqual([]);
		// Les huit points restent à toucher (43)
		expect(points(root)).toHaveLength(8);
		// Le toucher suivant pose de nouveau
		await userEvent.click(point(root, 'B'));
		await expect.poll(() => probe.value).toBe('B/');
	});

	it('la flèche suit la rotation ; tourner ne change pas la réponse (42, 46)', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(SolideGeste, {
			target: mainElement(),
			props: { node: turning(), answer: answer() }
		});
		const root = screen.container;
		await userEvent.click(point(root, 'A'));
		await userEvent.click(point(root, 'C'));
		await expect.poll(() => arrowPlace(root)).not.toBeNull();
		const before = arrowPlace(root);
		drag(figures(root)[0], 120, 30);
		await expect.poll(() => arrowPlace(root)).not.toBe(before);
		expect(probe.value).toBe('A/C');
		expect(probe.changes).toEqual(['A/', 'A/C']);
	});

	it('« Vue de départ » garde la flèche ; « Effacer » garde la vue (44)', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(SolideGeste, {
			target: mainElement(),
			props: { node: turning(), answer: answer() }
		});
		const root = screen.container;
		const rest = traits(figures(root)[0]);
		await userEvent.click(point(root, 'A'));
		await userEvent.click(point(root, 'C'));
		await expect.poll(() => arrowPlace(root)).not.toBeNull();
		const arrowAtRest = arrowPlace(root);
		drag(figures(root)[0], 120, 30);
		await expect.poll(() => resetButtons(root)).toHaveLength(1);

		resetButtons(root)[0].click();
		await expect.poll(() => resetButtons(root)).toHaveLength(0);
		expect(traits(figures(root)[0])).toBe(rest);
		expect(arrowPlace(root)).toBe(arrowAtRest);
		expect(probe.value).toBe('A/C');

		drag(figures(root)[0], 120, 30);
		await expect.poll(() => resetButtons(root)).toHaveLength(1);
		const turned = traits(figures(root)[0]);
		button(root, 'Effacer')!.click();
		await expect.poll(() => probe.value).toBe('');
		expect(arrowPlace(root)).toBeNull();
		expect(resetButtons(root)).toHaveLength(1);
		expect(traits(figures(root)[0])).toBe(turned);
	});

	it('clavier : sur un point, les flèches tournent, Entrée pose, Échap ramène (45)', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(SolideGeste, {
			target: mainElement(),
			props: { node: turning(), answer: answer() }
		});
		const root = screen.container;
		const rest = traits(figures(root)[0]);
		point(root, 'A').focus();
		await userEvent.keyboard('{ArrowLeft}');
		await expect.poll(() => resetButtons(root)).toHaveLength(1);
		expect(traits(figures(root)[0])).not.toBe(rest);
		expect(probe.changes).toEqual([]);
		await userEvent.keyboard('{Enter}');
		await expect.poll(() => probe.value).toBe('A/');
		await userEvent.keyboard('{Escape}');
		await expect.poll(() => resetButtons(root)).toHaveLength(0);
		await expect.poll(() => traits(figures(root)[0])).toBe(rest);
		expect(probe.value).toBe('A/');
	});

	it('origine imposée : A reste posée sous toutes les vues (49)', async () => {
		const { probe, answer } = answerProbe();
		const screen = await render(SolideGeste, {
			target: mainElement(),
			props: {
				node: node(...CUBE, 'tracer: vecteur AB + AD depuis A', 'tourner: oui'),
				answer: answer()
			}
		});
		const root = screen.container;
		drag(figures(root)[0], 120, 30);
		await expect.poll(() => resetButtons(root)).toHaveLength(1);
		expect(root.querySelectorAll('.solide-origine')).toHaveLength(1);
		expect(points(root)).toHaveLength(7);
		await userEvent.click(point(root, 'C'));
		await expect.poll(() => probe.value).toBe('A/C');
	});

	it('après la correction : les deux figures tournent, chacune de son côté ; rien ne se pose (47)', async () => {
		const changes: string[] = [];
		const screen = await render(SolideGeste, {
			target: mainElement(),
			props: {
				node: turning(),
				answer: {
					value: 'A/B',
					isCorrect: false,
					disabled: true,
					onChange: (v: string) => changes.push(v)
				}
			}
		});
		const root = screen.container;
		const [student, correction] = figures(root);
		expect(student.getAttribute('tabindex')).toBe('0');
		expect(correction.getAttribute('tabindex')).toBe('0');
		expect(root.querySelectorAll('.solide-fleche-juste')).toHaveLength(1);
		const studentRest = traits(student);
		const correctionRest = traits(correction);
		const justeRest = ['x1', 'y1', 'x2', 'y2']
			.map((a) => root.querySelector('.solide-fleche-juste line')!.getAttribute(a))
			.join(',');
		drag(correction, 120, 30);
		await expect.poll(() => resetButtons(root)).toHaveLength(1);
		expect(traits(figures(root)[1])).not.toBe(correctionRest);
		expect(traits(figures(root)[0])).toBe(studentRest);
		expect(
			['x1', 'y1', 'x2', 'y2']
				.map((a) => root.querySelector('.solide-fleche-juste line')!.getAttribute(a))
				.join(',')
		).not.toBe(justeRest);
		drag(figures(root)[0], -80, 20);
		await expect.poll(() => resetButtons(root)).toHaveLength(2);
		point(root, 'C').dispatchEvent(new MouseEvent('click', { bubbles: true }));
		await new Promise((r) => setTimeout(r, 50));
		expect(changes).toEqual([]);
	});

	it('la bonne réponse seule (`solution`) tourne aussi', async () => {
		const screen = await render(SolideGeste, {
			target: mainElement(),
			props: { node: turning(), solution: true }
		});
		const root = screen.container;
		const before = traits(figures(root)[0]);
		expect(points(root)).toHaveLength(0);
		drag(figures(root)[0], 120, 30);
		await expect.poll(() => resetButtons(root)).toHaveLength(1);
		expect(traits(figures(root)[0])).not.toBe(before);
	});

	it('deux points presque au même endroit : le toucher entre les deux pose celui de devant (48)', async () => {
		// Pavé peu profond (4 × 1 × 3) : après une flèche à droite et une vers le haut, la vue est
		// presque de face — D est à moins de 2 mm de A, derrière lui
		const { probe, answer } = answerProbe();
		const screen = await render(SolideGeste, {
			target: mainElement(),
			props: {
				node: node(
					'forme: pave 4 1 3',
					'sommets: A B C D E F G H',
					'tracer: vecteur AB + AD',
					'tourner: oui'
				),
				answer: answer()
			}
		});
		const root = screen.container;
		figures(root)[0].focus();
		await userEvent.keyboard('{ArrowRight}{ArrowUp}');
		// Fin du passage à la vue droite
		await new Promise((r) => setTimeout(r, 500));
		const a = point(root, 'A').getBoundingClientRect();
		const d = point(root, 'D').getBoundingClientRect();
		const gap = Math.hypot(a.left - d.left, a.top - d.top);
		expect(gap).toBeLessThan(a.width / 2);
		// Le doigt entre les deux, sur la zone de D : aussi près de l'un que de l'autre, A est devant
		await userEvent.click(point(root, 'D'), {
			position: { x: d.width / 2 + (a.left - d.left) / 2, y: d.height / 2 + (a.top - d.top) / 2 }
		});
		await expect.poll(() => probe.value).toBe('A/');
		// Au clavier, D reste D
		point(root, 'D').focus();
		await userEvent.keyboard('{Enter}');
		await expect.poll(() => probe.value).toBe('A/D');
	});

	it('un autre bloc repart de la vue de départ (50)', async () => {
		const screen = await render(SolideGeste, {
			target: mainElement(),
			props: { node: turning(), answer: answerProbe().answer() }
		});
		const root = screen.container;
		drag(figures(root)[0], 120, 30);
		await expect.poll(() => resetButtons(root)).toHaveLength(1);
		await screen.rerender({
			node: node(...CUBE, 'tracer: vecteur AB + AE', 'tourner: oui'),
			answer: answerProbe().answer()
		});
		await expect.poll(() => resetButtons(root)).toHaveLength(0);
	});
});
