/**
 * Les valeurs d'une étude de variations, écrites en LaTeX.
 *
 * Bornes, abscisses critiques, images, limites : une seule écriture pour le
 * tableau (`ubumark/builders/variation-table`) et les étapes de l'atelier,
 * sinon le tableau et le texte diraient `1 / 2` d'un côté et `\dfrac{1}{2}`
 * de l'autre (mesuré : les valeurs interdites sortent du domaine en `1 / 2`).
 *
 * @module mathAST/variations/latex
 */

import type { MathNode } from '../types';
import type { LimitValue } from './types';
import { toLatex } from '../latex-generator';
import { tidy } from '../tidy';
import { tidyCriticalAbscissa } from './critical-points';

/** `+\infty` / `-\infty`, sinon la valeur mise au propre (`1/2` → `\dfrac{1}{2}`). */
export function variationValueLatex(value: MathNode): string {
	if (value.type === 'infinity') return value.sign === 'negative' ? '-\\infty' : '+\\infty';
	try {
		const abscissa = tidyCriticalAbscissa(value);
		return toLatex(abscissa === value ? tidy(value) : abscissa);
	} catch {
		return toLatex(value);
	}
}

/** Une limite, ou `null` si elle est indéterminée. */
export function limitValueLatex(limit: LimitValue): string | null {
	if (limit === 'infinity') return '+\\infty';
	if (limit === 'negative_infinity') return '-\\infty';
	if (limit === 'indeterminate') return null;
	return variationValueLatex(limit);
}
