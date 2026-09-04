import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import SequencePlot from '../SequencePlot.svelte';
import { parseSequence } from '$lib/grapheur/sequence';
import { createTransformer } from '$lib/grapheur/viewport';
import type { SequencePlottable, Viewport } from '$lib/grapheur/types';

/**
 * Le diagramme en escalier est la fonctionnalité qui justifie de greffer les
 * suites sur le grapheur : il ne doit apparaître que là où il a un sens (une
 * récurrence d'ordre 1 dont f ne dépend pas du rang).
 */
describe('SequencePlot', () => {
	const viewport: Viewport = { xMin: -2, xMax: 12, yMin: -2, yMax: 12 };
	const transformer = createTransformer(viewport, 700, 700);

	function sequence(overrides: Partial<SequencePlottable> = {}): SequencePlottable {
		const mode = overrides.mode ?? 'recurrence';
		const latex = overrides.latex ?? '0.5u_n+3';
		const parsed = parseSequence(latex, mode, overrides.name ?? 'u');

		return {
			id: '44444444-4444-4444-8444-444444444444',
			type: 'sequence',
			name: 'u',
			mode,
			latex,
			ast: parsed.ast ?? undefined,
			parseError: parsed.error ?? undefined,
			usesIndex: parsed.usesIndex,
			firstIndex: 0,
			firstTerm: 8,
			representation: 'cobweb',
			cobwebSteps: 10,
			color: '#0000ff',
			visible: true,
			lineWidth: 2,
			lineStyle: 'solid',
			...overrides
		};
	}

	function renderPlot(overrides: Partial<SequencePlottable> = {}) {
		return render(SequencePlot, {
			sequence: sequence(overrides),
			viewport,
			transformer
		});
	}

	it('trace un point par terme visible', () => {
		const { container } = renderPlot({
			mode: 'explicit',
			latex: 'n',
			firstTerm: null,
			representation: 'ranks'
		});

		// n de 0 à 11 tient dans la fenêtre, n = 12 sort par le haut (yMax = 12
		// est inclus, donc 0..12 sauf ceux dont l'ordonnée dépasse).
		const points = container.querySelectorAll('circle.sequence-point');
		expect(points.length).toBeGreaterThan(5);
	});

	it('dessine l’escalier et la droite y = x pour une récurrence', () => {
		const { container } = renderPlot();

		expect(container.querySelector('path.cobweb-path')).not.toBeNull();
		expect(container.querySelector('path.cobweb-function')).not.toBeNull();
		expect(container.querySelector('line.identity-line')).not.toBeNull();
	});

	it('n’affiche pas d’escalier en représentation « rangs »', () => {
		const { container } = renderPlot({ representation: 'ranks' });

		expect(container.querySelector('path.cobweb-path')).toBeNull();
		expect(container.querySelector('line.identity-line')).toBeNull();
		expect(container.querySelectorAll('circle.sequence-point').length).toBeGreaterThan(0);
	});

	it('n’affiche pas d’escalier pour une suite explicite', () => {
		const { container } = renderPlot({
			mode: 'explicit',
			latex: '3n+2',
			firstTerm: null,
			representation: 'cobweb'
		});

		expect(container.querySelector('path.cobweb-path')).toBeNull();
	});

	it('n’affiche pas d’escalier quand f dépend du rang', () => {
		const { container } = renderPlot({ latex: 'u_n+n', representation: 'cobweb' });

		// Repli automatique sur le nuage de rangs, faute d'escalier possible.
		expect(container.querySelector('path.cobweb-path')).toBeNull();
		expect(container.querySelectorAll('circle.sequence-point').length).toBeGreaterThan(0);
	});

	it('n’affiche aucun point en représentation « escalier »', () => {
		// Les deux représentations s'excluent : en escalier l'abscisse porte u_n et
		// non le rang, donc superposer le nuage (n, u_n) mettrait deux axes des
		// abscisses incompatibles sur la même grille.
		const { container } = renderPlot({ representation: 'cobweb' });

		expect(container.querySelector('path.cobweb-path')).not.toBeNull();
		expect(container.querySelectorAll('circle.sequence-point').length).toBe(0);
	});

	it('ne tronque pas l’escalier sur la largeur de la fenêtre', () => {
		// Régression : les termes étaient calculés jusqu'à ceil(viewport.xMax), or
		// l'escalier vit dans le plan (u_n, u_{n+1}) et n'a rien à voir avec les
		// rangs affichés — un zoom sur x ∈ [-2 ; 3] réduisait silencieusement
		// l'escalier à 3 marches au lieu des 20 demandées.
		const etroit: Viewport = { xMin: -2, xMax: 3, yMin: -2, yMax: 12 };

		const { container } = render(SequencePlot, {
			sequence: sequence({ cobwebSteps: 20 }),
			viewport: etroit,
			transformer: createTransformer(etroit, 700, 700)
		});

		const d = container.querySelector('path.cobweb-path')?.getAttribute('d') ?? '';

		// Un escalier de k marches = 1 point d'ancrage + 2k segments.
		expect((d.match(/L/g) ?? []).length).toBe(40);
	});

	it('ne rend rien quand la suite est masquée', () => {
		const { container } = renderPlot({ visible: false });

		expect(container.querySelector('g.sequence-plot')).toBeNull();
	});
});
