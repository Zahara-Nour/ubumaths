/**
 * Guides calculatrices : les données des trois pages, calculées sur le SERVEUR.
 *
 * Phase 0, point 8 : une séquence non relue sur la machine ne doit pas quitter le
 * serveur en production — ni affichée, ni présente dans le JavaScript envoyé au
 * navigateur. Les `+page.server.ts` appellent ces fonctions avec
 * `includeUnverified: dev` ; les fichiers des modèles ne sont jamais importés côté client.
 */

import { buildGuide, isModelAvailable, type Guide, type GuideOptions } from './guide';
import { GRADE_LABELS, GRADE_SLUGS } from './levels';
import { MODELS, findModel } from './models';
import { resolveGuideAddress } from './routing';
import type { CalculatorModel, ModelFamily } from './types';

// ===== Types =====

export interface ModelSummary {
	slug: string;
	name: string;
	family: ModelFamily;
	available: boolean;
}

interface GradeLink {
	slug: string;
	label: string;
}

/** Ce que la page du guide reçoit du modèle : jamais ses séquences brutes */
type PublicModel = Pick<CalculatorModel, 'slug' | 'name' | 'keys' | 'systemVersion'>;

interface GuidePageBase {
	model: PublicModel;
	gradeLabel: string;
	otherGrades: GradeLink[];
}

export type GuidePageData =
	| (GuidePageBase & { kind: 'guide'; guide: Guide })
	| (GuidePageBase & { kind: 'grade-without-guide'; reason: string })
	| (GuidePageBase & { kind: 'grade-not-covered' });

// ===== Fonctions =====

export function listModels(options: GuideOptions): ModelSummary[] {
	return MODELS.map((model) => ({
		slug: model.slug,
		name: model.name,
		family: model.family,
		available: isModelAvailable(model, options)
	}));
}

/** La page d'un modèle, ou `null` pour un modèle inconnu (404) */
export function modelPage(
	slug: string,
	options: GuideOptions
): { model: { slug: string; name: string }; available: boolean; grades: GradeLink[] } | null {
	const model = findModel(slug);
	if (!model) return null;
	return {
		model: { slug: model.slug, name: model.name },
		available: isModelAvailable(model, options),
		grades: model.grades.map((grade) => ({ slug: GRADE_SLUGS[grade], label: GRADE_LABELS[grade] }))
	};
}

/** La page d'un guide, ou `null` pour une adresse inconnue (404) */
export function guidePage(
	modelSlug: string,
	gradeSlug: string,
	options: GuideOptions
): GuidePageData | null {
	const address = resolveGuideAddress(modelSlug, gradeSlug);
	if (address.kind === 'not-found') return null;

	const { model } = address;
	const base: GuidePageBase = {
		model: {
			slug: model.slug,
			name: model.name,
			keys: model.keys,
			systemVersion: model.systemVersion
		},
		gradeLabel: GRADE_LABELS[address.grade],
		otherGrades: model.grades.map((grade) => ({
			slug: GRADE_SLUGS[grade],
			label: GRADE_LABELS[grade]
		}))
	};

	if (address.kind === 'guide') {
		return { ...base, kind: 'guide', guide: buildGuide(model, address.grade, options) };
	}
	if (address.kind === 'grade-without-guide') {
		return { ...base, kind: 'grade-without-guide', reason: address.reason };
	}
	return { ...base, kind: 'grade-not-covered' };
}
