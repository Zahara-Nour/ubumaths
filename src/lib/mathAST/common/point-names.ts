/**
 * Écriture des points nommés collés (`AB`, `A'B''`, `A_{1}B_{n}`, `ABC`), partagée
 * par `toLatex`, `toCustom` et `prettyPrint` : sans espace ni `\mathit`, pour que le
 * parseur LaTeX (mode longueur) les relise à l'identique. Primes avant l'indice :
 * `A'_{1}`.
 *
 * @module mathAST/common/point-names
 */

import type { PointName } from '../types';

/** Un point : sa lettre, ses primes, son indice entre accolades. */
function formatPointName(point: PointName): string {
	const index = point.index === undefined ? '' : `_{${point.index}}`;
	return point.letter + "'".repeat(point.primes) + index;
}

/** Des points collés, dans l'ordre écrit. */
export function formatPointNames(points: readonly PointName[]): string {
	return points.map(formatPointName).join('');
}
