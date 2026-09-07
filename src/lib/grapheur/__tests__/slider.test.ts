import { describe, expect, it } from 'vitest';
import { fromSliderIndex, SLIDER_STEPS, toSliderIndex } from '../slider';

/**
 * bits-ui valide la valeur d'un curseur contre une liste de valeurs permises,
 * comparée avec `===`. Un pas flottant tiré d'une fenêtre zoomée n'en produit
 * aucune qui corresponde : le composant réécrit alors la valeur à chaque
 * changement, et le pouce repart en arrière sous la souris.
 *
 * Piloter le curseur en entiers supprime la cause. Ce que ces tests
 * verrouillent, c'est l'aller-retour : une position doit se retrouver
 * elle-même après conversion.
 */
describe('positions de curseur', () => {
	const windows: [number, number][] = [
		[-10, 10],
		[-1, 1],
		[0, 1],
		[-7.328164, 3.914772],
		[1e-6, 3e-6],
		[-1000, 250]
	];

	it('l’aller-retour est stable, quelle que soit la fenêtre', () => {
		for (const [min, max] of windows) {
			for (let i = 0; i <= SLIDER_STEPS; i += 7) {
				expect(toSliderIndex(fromSliderIndex(i, min, max), min, max)).toBe(i);
			}
		}
	});

	it('place les bornes aux extrémités', () => {
		for (const [min, max] of windows) {
			expect(toSliderIndex(min, min, max)).toBe(0);
			expect(toSliderIndex(max, min, max)).toBe(SLIDER_STEPS);
			// La valeur est arrondie pour rester lisible : on demande qu'elle reste
			// à moins d'un cran de la borne, pas qu'elle l'égale au bit près.
			const step = (max - min) / SLIDER_STEPS;
			expect(Math.abs(fromSliderIndex(0, min, max) - min)).toBeLessThan(step);
			expect(Math.abs(fromSliderIndex(SLIDER_STEPS, min, max) - max)).toBeLessThan(step);
		}
	});

	it('rend une valeur lisible plutôt qu’un flottant à rallonge', () => {
		expect(fromSliderIndex(200, -10, 10)).toBe(0);
		expect(fromSliderIndex(210, -10, 10)).toBe(0.5);
	});

	it('borne une valeur hors de la fenêtre au lieu de sortir du curseur', () => {
		expect(toSliderIndex(50, -10, 10)).toBe(SLIDER_STEPS);
		expect(toSliderIndex(-50, -10, 10)).toBe(0);
	});

	it('ne divise pas par zéro sur une fenêtre dégénérée', () => {
		expect(toSliderIndex(1, 5, 5)).toBe(0);
		expect(fromSliderIndex(200, 5, 5)).toBe(5);
	});
});
