/**
 * Guides calculatrices : les modèles. Un modèle sans séquence est annoncé « bientôt ».
 * Pilote : NumWorks (décision de David, 2026-10-12).
 */

import { GUIDE_GRADES } from '../levels';
import type { CalculatorModel } from '../types';
import { NUMWORKS } from './numworks';

const COLLEGE_GRADES = ['6', '5', '4', '3'] as const;

/** Modèle annoncé, pas encore rédigé */
function upcoming(slug: string, name: string, family: CalculatorModel['family']): CalculatorModel {
	return {
		slug,
		name,
		family,
		grades: family === 'college' ? COLLEGE_GRADES : GUIDE_GRADES,
		keys: {},
		sequences: [],
		pitfalls: []
	};
}

export const MODELS: readonly CalculatorModel[] = [
	upcoming('casio-fx-92', 'Casio fx-92+ Spéciale Collège', 'college'),
	upcoming('ti-college-plus', 'TI-Collège Plus', 'college'),
	NUMWORKS,
	upcoming('casio-graph-35', 'Casio Graph 35+E II', 'lycee'),
	upcoming('casio-graph-90', 'Casio Graph 90+E', 'lycee'),
	upcoming('ti-83-premium', 'TI-83 Premium CE', 'lycee'),
	upcoming('ti-82-advanced', 'TI-82 Advanced', 'lycee')
];

export function findModel(slug: string): CalculatorModel | undefined {
	return MODELS.find((model) => model.slug === slug);
}
