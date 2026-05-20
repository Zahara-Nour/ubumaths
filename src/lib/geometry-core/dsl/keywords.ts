/**
 * French keywords for the geometry DSL.
 */

export const KEYWORDS = new Set([
	// Geometry constructions
	'point',
	'milieu',
	'segment',
	'droite',
	'demidroite',
	'cercle',
	'arc',
	'symetrie',
	'rotation',
	'translation',
	'homothetie',
	'similitude',
	'projection',
	'affinite',
	'inversion',
	'intersection',
	// Annotations
	'angle',
	'angle_polaire',
	'marque_segment',
	'mesure',
	'style',
	// Control flow
	'macro',
	'retourne',
	'pour',
	'dans',
	'si',
	'sinon',
	// Boolean
	'vrai',
	'faux',
	'non',
	'et',
	'ou'
]);

export function isKeyword(word: string): boolean {
	return KEYWORDS.has(word);
}
