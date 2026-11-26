/**
 * Bloc ```solide — scènes figées
 *
 * Chantier `solides-3d` (ADR 0045) : la projection cavalière et le calcul des
 * arêtes cachées passent par le moteur de vue (`utils/espace-vue.ts`), qui sait
 * aussi tourner la figure. Une figure qui ne tourne pas doit rester STRICTEMENT
 * celle d'avant : ces instantanés, pris avant le moteur, fixent chaque trait,
 * chaque point et chaque étiquette, au milliardième de centimètre : au-delà, le
 * dernier chiffre d'un cosinus dépend de la machine (cône : écart de 1e-15
 * entre le Mac et la CI, sur du code que le chantier ne touche pas).
 */

import { describe, expect, it } from 'vitest';
import { parseEspaceContent } from '#lib/ubumark/parser/espace-parser.ts';
import type { SolideSpec } from '#lib/ubumark/types/espace.ts';
import { buildSolideScene } from '#lib/ubumark/utils/espace-solides.ts';

// ============================================================================
// CONSTANTES
// ============================================================================

/** Blocs témoins : chaque forme, puis chaque réglage qui passe par la projection */
const BLOCS: Record<string, string[]> = {
	cube: ['forme: cube 3', 'sommets: A B C D E F G H'],
	pavé: ['forme: pave 4 2 3', 'sommets: A B C D E F G H'],
	'pavé très profond': ['forme: pave 2 9 1'],
	'prisme à base isocèle': ['forme: prisme triangle 3 2 5', 'sommets: A B C D E F'],
	'prisme à base rectangle': ['forme: prisme triangle-rectangle 3 4 6', 'sommets: A B C D E F'],
	'pyramide carrée': ['forme: pyramide carree 3 4', 'sommets: S A B C D'],
	'pyramide rectangle': ['forme: pyramide rectangle 4 2 3', 'sommets: S A B C D'],
	tétraèdre: ['forme: pyramide triangle 3 4', 'sommets: S A B C'],
	'tétraèdre plat': ['forme: pyramide triangle 4 1', 'sommets: S A B C'],
	cylindre: ['forme: cylindre 2 4', "sommets: O O'"],
	cône: ['forme: cone 2 4', 'sommets: S O'],
	boule: ['forme: boule 2', 'sommets: O'],
	'marques sur un cube': [
		'forme: cube 3',
		'sommets: A B C D E F G H',
		'marquer: face BCGF, arete AE, sommet H, face dessous'
	],
	'arêtes cachées en trait plein': ['forme: pave 4 2 3', 'cachees: non'],
	'pavé coté': ['forme: pave 5 2 3', 'cotes: cm'],
	'prisme coté': ['forme: prisme triangle 3 2 5', 'cotes: cm'],
	'pyramide cotée': ['forme: pyramide rectangle 4 2 3', 'sommets: S A B C D', 'cotes: cm'],
	'tétraèdre coté': ['forme: pyramide triangle 3 4', 'cotes: oui'],
	'section d’un pavé': [
		'forme: pave 4 2 3',
		'sommets: A B C D E F G H',
		'section: parallele ABCD 2 IJKL',
		'cotes: cm'
	],
	'section par la place': ['forme: cube 3', 'section: parallele droite 1'],
	'points et vecteurs': [
		'forme: pave 4 2 3',
		'sommets: A B C D E F G H',
		'points: I milieu AE, O centre ABCD, K centre ABCDEFGH',
		'vecteurs: AG, u = AE, w1 = IO'
	],
	'vecteurs d’une pyramide': [
		'forme: pyramide carree 3 4',
		'sommets: S A B C D',
		'points: O centre ABCD',
		'vecteurs: SO, v = AB'
	]
};

// ============================================================================
// FONCTIONS
// ============================================================================

/** La scène, chaque nombre arrondi à 9 chiffres après la virgule */
function rounded(value: unknown): unknown {
	if (typeof value === 'number') return Math.round(value * 1e9) / 1e9 + 0;
	if (Array.isArray(value)) return value.map(rounded);
	if (value !== null && typeof value === 'object') {
		return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, rounded(v)]));
	}
	return value;
}

// ============================================================================
// TESTS
// ============================================================================

describe('solide — scènes figées (vue de départ, avant et après le moteur de vue)', () => {
	for (const [name, lines] of Object.entries(BLOCS)) {
		it(name, () => {
			const node = parseEspaceContent(lines.join('\n'), 'solide');
			expect(node.errors).toEqual([]);
			expect(rounded(buildSolideScene(node.spec as SolideSpec))).toMatchSnapshot();
		});
	}
});
