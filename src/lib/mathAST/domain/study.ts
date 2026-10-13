/**
 * L'ensemble d'étude écrit après `dans` (`.variations x^2 dans [0 ; +∞[`).
 *
 * Lu par `parseStudentDomain`, le parseur des ensembles d'élève (intervalles,
 * bornes infinies, réunions, `ℝ \ {0}`), puis restreint au domaine de
 * l'expression quand il se calcule : `computeVariations` prend le domaine
 * fourni TEL QUEL, sans le croiser avec celui de la fonction.
 *
 * C'est aussi par ce mot que l'atelier transmet l'ensemble d'une fonction
 * définie sur un intervalle (lot 2 de `docs/wip/atelier-intervalle-phase0.md`).
 *
 * @module mathAST/domain/study
 */

import type { MathNode } from '../types';
import type { Domain } from './types';
import { parseStudentDomain } from './validation/parse-student-domain';
import { computeDomain, normalizeExcludedPoints } from './compute';
import { intersect, isEmpty } from './algebra';

export type StudyDomain =
	{ readonly ok: true; readonly domain: Domain } | { readonly ok: false; readonly message: string };

export const UNREADABLE_STUDY_DOMAIN =
	"Je n'ai pas su lire l'ensemble après « dans » : écris par exemple dans [0 ; +∞[.";

/** L'ensemble d'étude, restreint au domaine de l'expression, ou le refus en français. */
export function studyDomain(written: string, expression: MathNode, variable: string): StudyDomain {
	const read = parseStudentDomain(written, variable);
	if (!read.success) return { ok: false, message: UNREADABLE_STUDY_DOMAIN };
	const natural = computeDomain(expression, variable);
	const domain =
		natural.unresolved === undefined
			? normalizeExcludedPoints(intersect(read.domain, natural.domain))
			: read.domain;
	if (isEmpty(domain)) {
		return { ok: false, message: "L'ensemble d'étude est vide : la fonction n'y est pas définie." };
	}
	return { ok: true, domain };
}
