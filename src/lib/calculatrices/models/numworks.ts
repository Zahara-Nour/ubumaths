/**
 * NumWorks (N0110 / N0120), système Epsilon v26.
 *
 * Sources : manuel officiel (v20, en retard), notes de version 21 à 26, code source
 * d'Epsilon (cloné dans extern/numworks-epsilon du dépôt principal). Brouillon sourcé :
 * docs/wip/guides-calculatrices-numworks.md. Rien n'est montré en production tant que
 * David ne l'a pas relu sur la machine (`verifiedOnDevice`).
 */

import type { CalculatorModel } from '../types';
import { GUIDE_GRADES } from '../levels';

export const NUMWORKS: CalculatorModel = {
	slug: 'numworks',
	name: 'NumWorks',
	family: 'lycee',
	grades: GUIDE_GRADES,
	systemVersion: '26',
	keys: {},
	sequences: [],
	pitfalls: []
};
