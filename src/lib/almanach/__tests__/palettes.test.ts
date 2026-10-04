import { describe, expect, it } from 'vitest';
import { contrastRatio } from '$lib/theme/author-color';
import { MONTH_NAMES, civilToPataphysical } from '../calendar';
import { MONTH_PALETTES, UBU_BODY_COLOR, ambianceMonthIndex, paletteCssVars } from '../palettes';

describe('palettes des mois', () => {
	it('une palette par mois', () => {
		expect(MONTH_PALETTES).toHaveLength(MONTH_NAMES.length);
	});

	it('Ambraire garde les traits actuels de l’accueil (#ffcf33)', () => {
		expect(MONTH_PALETTES[0].light.stroke).toBe('#ffcf33');
		expect(MONTH_PALETTES[0].dark.stroke).toBe('#ffcf33');
	});

	it.each(MONTH_NAMES.map((name, i) => [name, i] as const))(
		'%s : traits ≥ 3:1 sur le corps noir d’Ubu, en clair et en sombre',
		(_name, i) => {
			for (const mode of ['light', 'dark'] as const) {
				const ratio = contrastRatio(MONTH_PALETTES[i][mode].stroke, UBU_BODY_COLOR);
				expect(ratio).toBeGreaterThanOrEqual(3);
			}
		}
	);

	it('le corps d’Ubu dans l’accueil est bien #080808', async () => {
		const { readFileSync } = await import('node:fs');
		const page = readFileSync('src/routes/(public)/+page.svelte', 'utf8');
		expect(page).toContain(`fill="${UBU_BODY_COLOR}"`);
		// Plus aucun trait figé en dur : ils suivent la variable du mois
		expect(page).not.toContain('stroke="#ffcf33"');
	});
});

describe('ambianceMonthIndex', () => {
	it('un jour de mois prend son mois', () => {
		expect(ambianceMonthIndex(civilToPataphysical(2026, 5, 22))).toBe(5);
	});

	it('la Cloche prend Auguste, le Surnuméraire prend Déglaçose (mois précédent)', () => {
		expect(ambianceMonthIndex(civilToPataphysical(2026, 8, 22))).toBe(6);
		expect(ambianceMonthIndex(civilToPataphysical(2028, 3, 18))).toBe(3);
	});
});

describe('paletteCssVars', () => {
	it('enveloppe clair et sombre dans light-dark(), sauf valeur identique', () => {
		const vars = paletteCssVars(1);
		expect(vars.halo1).toBe('light-dark(rgba(147,197,253,.50), rgba(96,165,250,.45))');
		expect(vars.stroke).toBe('#cfe8ff');
	});
});
