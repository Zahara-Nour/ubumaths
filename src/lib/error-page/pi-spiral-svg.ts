/**
 * La spirale de π en texte SVG, pour une page rendue sans Svelte : la page de
 * maintenance (`src/lib/server/maintenance.ts`), servie avant toute
 * l'application. Même géométrie que `PiSpiral.svelte`, via `spiralGlyphs`.
 *
 * @module lib/error-page/pi-spiral-svg
 */

import { PI_DECIMALS } from './pi-decimals';
import { spiralGlyphs } from './pi-spiral';

/**
 * Le `<svg>` de la spirale ; les chiffres du code portent la classe
 * `highlighted`, à colorer par la page.
 *
 * @param highlightPosition Rang du premier chiffre du code, `null` pour aucun.
 */
export function piSpiralSvg(highlightPosition: number | null, className = 'pi-spiral'): string {
	const texts = spiralGlyphs(PI_DECIMALS, highlightPosition)
		.map(
			(glyph) =>
				`<text transform="rotate(${glyph.rotate})" y="${glyph.y}" font-size="${glyph.size}"${
					glyph.highlighted ? ' class="highlighted"' : ''
				}>${glyph.char}</text>`
		)
		.join('');
	return `<svg viewBox="-500 -500 1000 1000" class="${className}" aria-hidden="true" focusable="false"><g text-anchor="middle" fill="currentColor">${texts}</g></svg>`;
}
