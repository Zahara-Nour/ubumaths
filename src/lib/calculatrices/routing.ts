/**
 * Guides calculatrices : ce que donne une adresse /calculatrices/<modele>/<niveau>.
 * Phase 0, points 10 (modèle sans guide à ce niveau), 11 (niveau sans guide) et 12
 * (adresse inconnue → 404).
 */

import type { GradeCode } from '$lib/types/grades';
import {
	NO_GUIDE_REASONS,
	gradeFromSlug,
	isGuideGrade,
	type GradeWithoutGuide,
	type GuideGrade
} from './levels';
import { findModel } from './models';
import type { CalculatorModel } from './types';

// ===== Types =====

export type GuideAddress =
	| { kind: 'guide'; model: CalculatorModel; grade: GuideGrade }
	| {
			kind: 'grade-without-guide';
			model: CalculatorModel;
			grade: GradeWithoutGuide;
			reason: string;
	  }
	| { kind: 'grade-not-covered'; model: CalculatorModel; grade: GuideGrade }
	| { kind: 'not-found' };

// ===== Fonctions =====

export function resolveGuideAddress(modelSlug: string, gradeSlug: string): GuideAddress {
	const model = findModel(modelSlug);
	const grade: GradeCode | undefined = gradeFromSlug(gradeSlug);
	if (!model || !grade) return { kind: 'not-found' };
	if (!isGuideGrade(grade)) {
		return { kind: 'grade-without-guide', model, grade, reason: NO_GUIDE_REASONS[grade] };
	}
	if (!model.grades.includes(grade)) return { kind: 'grade-not-covered', model, grade };
	return { kind: 'guide', model, grade };
}
