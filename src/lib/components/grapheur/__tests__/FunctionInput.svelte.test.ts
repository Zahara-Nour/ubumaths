// La feuille globale porte Tailwind : sans elle, `flex`, `w-16` et `shrink-0`
// n'ont aucun effet et la mise en page ne peut pas être mesurée.
import '../../../../app.css';
import { beforeEach, describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FunctionPanel from '../FunctionPanel.svelte';
import { grapheurStore } from '$lib/stores/grapheur.svelte';
import { isExplicitFunction } from '$lib/grapheur/types';
import type { ExplicitFunction } from '$lib/grapheur/types';

function functionById(id: string): ExplicitFunction {
	const found = grapheurStore.functions.find((p) => p.id === id);
	if (!found || !isExplicitFunction(found)) throw new Error('fonction introuvable');
	return found;
}

/**
 * bits-ui relit `getBoundingClientRect()` du curseur à **chaque**
 * `pointermove`, et en déduit la valeur à partir de `clientX`. Si la largeur du
 * curseur change pendant le glissement, la même position de souris donne une
 * valeur différente — et le pouce recule.
 *
 * C'est ce qui arrivait : la valeur affichée à côté du curseur n'avait pas de
 * largeur fixe, et passait de « -8.7 » à « -10 » à « 0.5 ». Chaque cran
 * redimensionnait son voisin.
 */
describe('FunctionInput — le curseur de tangente garde une largeur stable', () => {
	beforeEach(() => {
		grapheurStore.fullReset();
		grapheurStore.setViewport({ xMin: -10, xMax: 10, yMin: -10, yMax: 10 });
	});

	function renderWithTangent() {
		const id = grapheurStore.addFunction('x^3-3x');
		grapheurStore.updateFunction(id, { tangentAt: 0 });

		// Le panneau lit le store : le composant suit donc les changements de
		// valeur, ce qu'un instantané de la fonction ne ferait pas.
		const { container } = render(FunctionPanel);
		// Le conteneur de test n'a pas de largeur propre ; on en donne une au
		// panneau — surtout pas au curseur, dont la largeur est ce qu'on mesure.
		(container.querySelector('.function-panel') as HTMLElement).style.width = '460px';

		return { id, container };
	}

	it('la largeur du curseur ne dépend pas de la valeur affichée', async () => {
		const { id, container } = renderWithTangent();
		const slider = container.querySelector('[aria-label="Abscisse du point de tangence"]')!;

		const widths = new Set<number>();
		for (const value of [0, -10, 9.875, -0.05, 5, -9.999]) {
			grapheurStore.updateFunction(id, { tangentAt: value });
			await new Promise((r) => setTimeout(r, 20));
			widths.add(Math.round(slider.getBoundingClientRect().width));
		}

		expect([...widths]).toHaveLength(1);
	});

	it('le curseur occupe une largeur exploitable', () => {
		const { container } = renderWithTangent();
		const slider = container.querySelector('[aria-label="Abscisse du point de tangence"]')!;

		expect(slider.getBoundingClientRect().width).toBeGreaterThan(100);
	});
});
