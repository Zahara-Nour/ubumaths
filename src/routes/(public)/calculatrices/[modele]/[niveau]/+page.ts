/**
 * Guides calculatrices : le guide d'un modèle à un niveau (phase 0 validée le
 * 2026-10-12). Une séquence non relue sur la machine n'est montrée qu'en local.
 */

import { error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { buildGuide } from '$lib/calculatrices/guide';
import { GRADE_LABELS, GRADE_SLUGS } from '$lib/calculatrices/levels';
import { resolveGuideAddress } from '$lib/calculatrices/routing';
import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
	const address = resolveGuideAddress(params.modele, params.niveau);
	if (address.kind === 'not-found') throw error(404, 'Guide introuvable');

	const model = address.model;
	const base = {
		model: { slug: model.slug, name: model.name, keys: model.keys },
		gradeLabel: GRADE_LABELS[address.grade],
		otherGrades: model.grades.map((grade) => ({
			slug: GRADE_SLUGS[grade],
			label: GRADE_LABELS[grade]
		}))
	};

	if (address.kind === 'guide') {
		return {
			...base,
			kind: address.kind,
			guide: buildGuide(model, address.grade, { includeUnverified: dev })
		};
	}
	if (address.kind === 'grade-without-guide') {
		return { ...base, kind: address.kind, reason: address.reason };
	}
	return { ...base, kind: address.kind };
};
