import { beforeEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import SpecialPoints from '../SpecialPoints.svelte';
import { grapheurStore } from '$lib/stores/grapheur.svelte';
import { createTransformer } from '$lib/grapheur/viewport';
import type { Viewport } from '$lib/grapheur/types';

const viewport: Viewport = { xMin: -10, xMax: 10, yMin: -10, yMax: 10 };

function renderPoints() {
	grapheurStore.setViewport(viewport);

	return render(SpecialPoints, {
		transformer: createTransformer(viewport, 800, 800)
	});
}

function titles(container: Element, selector: string): string[] {
	return [...container.querySelectorAll(selector)].map(
		(el) => el.querySelector('title')?.textContent ?? ''
	);
}

/**
 * `analyzeFunction()` sait passer par l'analyse exacte de mathAST, mais le
 * composant ne lui donnait que l'évaluateur compilé : le chemin exact était
 * écrit, testé, et jamais emprunté par l'application.
 */
describe('SpecialPoints', () => {
	beforeEach(() => {
		grapheurStore.fullReset();
	});

	it('affiche le sommet d’une parabole', () => {
		grapheurStore.addFunction('x^2-2');
		const { container } = renderPoints();

		const markers = container.querySelectorAll('path.extremum-marker');
		expect(markers).toHaveLength(1);
		expect(titles(container, 'path.extremum-marker')[0]).toContain('Min');
	});

	it('affiche les deux zéros de x²−2', () => {
		grapheurStore.addFunction('x^2-2');
		const { container } = renderPoints();

		expect(container.querySelectorAll('path.root-marker')).toHaveLength(2);
	});

	/**
	 * `<title>` ne porte que du texte, donc pas de LaTeX : la valeur exacte y est
	 * écrite en syntaxe custom. C'est ce qu'un lecteur d'écran annonce.
	 */
	it('écrit la valeur exacte dans l’étiquette d’un zéro', () => {
		grapheurStore.addFunction('x^2-2');
		const { container } = renderPoints();

		const labels = titles(container, 'path.root-marker');
		expect(labels).toHaveLength(2);
		expect(labels.some((l) => l.includes('sqrt(2)'))).toBe(true);
		expect(labels.every((l) => !l.includes('1.414'))).toBe(true);
	});

	it('écrit l’ordonnée exacte et réduite d’un extremum', () => {
		grapheurStore.addFunction('x^2-2');
		const { container } = renderPoints();

		expect(titles(container, 'path.extremum-marker')[0]).toBe('Min : (0 ; -2)');
	});

	it('retombe sur la valeur approchée quand il n’y a pas d’exacte', () => {
		grapheurStore.addFunction('e^x-x-2');
		const { container } = renderPoints();

		const labels = titles(container, 'path.root-marker');
		expect(labels.length).toBeGreaterThan(0);
		expect(labels.every((l) => /\d/.test(l))).toBe(true);
	});

	it('n’invente pas de zéro pour (x-1)²', () => {
		grapheurStore.addFunction('(x-1)^2');
		const { container } = renderPoints();

		const labels = titles(container, 'path.root-marker');
		expect(labels).toHaveLength(1);
		// Le zéro est trouvé exactement : « 1 », et non l'arrondi « 1.000 ».
		expect(labels[0]).toBe('Zéro : x = 1');
	});

	/**
	 * Quand le curseur approche un marqueur, `CurveHover` s'y accroche et prend
	 * le relais : il pose `snappedPoint`, et le marqueur statique s'efface pour
	 * ne pas doubler l'affichage. C'est pourquoi ces marqueurs n'ont pas
	 * d'infobulle à eux — elle serait inatteignable — et pourquoi la forme
	 * rendue (√2) se lit dans l'infobulle du survol.
	 */
	it('s’efface au profit du survol quand celui-ci s’y accroche', () => {
		grapheurStore.addFunction('x^2-2');
		grapheurStore.setSnappedPoint({
			x: Math.SQRT2,
			y: 0,
			type: 'root',
			functionIds: [grapheurStore.functions[0].id]
		});

		const { container } = renderPoints();

		// Le zéro en −√2 reste, celui en +√2 laisse la place au survol.
		expect(container.querySelectorAll('path.root-marker')).toHaveLength(1);
		expect(titles(container, 'path.root-marker')[0]).toContain('-sqrt(2)');
	});

	it('n’analyse rien pendant une interaction', () => {
		grapheurStore.addFunction('x^2-2');
		grapheurStore.setInteracting(true);
		const { container } = renderPoints();

		expect(container.querySelectorAll('path.root-marker')).toHaveLength(0);
		grapheurStore.setInteracting(false);
	});
});
