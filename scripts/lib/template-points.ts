/**
 * Rattachement d'un modèle à ses points du référentiel — logique pure
 * ===================================================================
 *
 * Utilisé par `scripts/create-questions.ts`. Un fichier JSON de modèle peut porter un champ
 * facultatif `"points": ["1SPE-135", …]` (codes de `curriculum_points`). Ce champ n'est PAS
 * une colonne de `question_templates` : il est retiré du modèle avant `checkTemplate` (dont le
 * schéma Zod strict le refuserait) et avant l'écriture. Les liens vivent dans
 * `question_template_points (template_id, point_id)`.
 *
 * Aucune lecture ni écriture ici : le script résout les codes en une requête, puis confie
 * le contrôle (`checkPointCodes`) et le calcul des liens (`planPointLinks`) à ce module.
 */

import { z } from 'zod';

// Types

/** Point actif résolu en base : son niveau vient de objective → theme (`curriculum_themes.grade`) */
export interface ResolvedPoint {
	id: string;
	code: string;
	grade: string;
}

/** Lien déjà en base (le code est lu par jointure, même si le point a été archivé depuis) */
export interface ExistingLink {
	pointId: string;
	code: string;
}

export type ExtractResult =
	| { ok: true; template: Record<string, unknown>; codes: string[] | null }
	| { ok: false; error: string };

export interface FilePoints {
	file: string;
	/** `null` : le fichier n'a pas de champ `points` (aucun lien lu ni touché) */
	codes: string[] | null;
	grades: string[];
}

export interface PointLinkPlan {
	/** Codes du fichier sans lien en base */
	toAdd: string[];
	/** Codes du fichier déjà liés */
	present: string[];
	/** Liens en base absents du fichier (supprimés seulement avec `--remplacer-points`) */
	extra: ExistingLink[];
}

// Constantes

export const MAX_POINTS_PER_TEMPLATE = 20;

const pointsFieldSchema = z
	.array(
		z.string().min(1, 'code vide').max(40, 'code trop long').regex(/^\S+$/, 'code avec espace')
	)
	.max(MAX_POINTS_PER_TEMPLATE, `au plus ${MAX_POINTS_PER_TEMPLATE} codes`);

// Fonctions

/** Lit et retire le champ `points` d'un modèle brut ; rend le modèle sans ce champ */
export function extractTemplatePoints(raw: unknown, file: string): ExtractResult {
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
		return { ok: false, error: `${file} : le fichier doit contenir un objet JSON` };
	}
	const { points, ...template } = raw as Record<string, unknown>;
	if (points === undefined) return { ok: true, template, codes: null };

	const parsed = pointsFieldSchema.safeParse(points);
	if (!parsed.success) {
		const issue = parsed.error.issues[0];
		return {
			ok: false,
			error: `${file} : champ « points » invalide — ${issue.message} (attendu : tableau de codes, ex. ["1SPE-135"])`
		};
	}
	const doublons = parsed.data.filter((code, i) => parsed.data.indexOf(code) !== i);
	if (doublons.length > 0) {
		return {
			ok: false,
			error: `${file} : champ « points » — code en double : ${[...new Set(doublons)].join(', ')}`
		};
	}
	return { ok: true, template, codes: parsed.data };
}

/**
 * Contrôle de tous les fichiers à la fois : code inconnu ou archivé (absent de `resolved`,
 * qui ne contient que les points actifs) et niveau du point absent de `grades` du modèle.
 * Rend toutes les erreurs (vide si tout va bien).
 */
export function checkPointCodes(
	files: FilePoints[],
	resolved: ReadonlyMap<string, ResolvedPoint>
): string[] {
	const erreurs: string[] = [];
	for (const { file, codes, grades } of files) {
		for (const code of codes ?? []) {
			const point = resolved.get(code);
			if (!point) {
				erreurs.push(`${file} : point « ${code} » inconnu ou archivé`);
			} else if (!grades.includes(point.grade)) {
				erreurs.push(
					`${file} : point « ${code} » de niveau ${point.grade}, absent de grades [${grades.join(', ')}]`
				);
			}
		}
	}
	return erreurs;
}

/** Liens voulus par le fichier vs liens en base */
export function planPointLinks(wanted: string[], existing: ExistingLink[]): PointLinkPlan {
	const enBase = new Set(existing.map((lien) => lien.code));
	const voulus = new Set(wanted);
	return {
		toAdd: wanted.filter((code) => !enBase.has(code)),
		present: wanted.filter((code) => enBase.has(code)),
		extra: existing.filter((lien) => !voulus.has(lien.code))
	};
}
