/**
 * Rattachement d'un modèle à ses points du référentiel — logique pure
 * ===================================================================
 *
 * Utilisé par `scripts/create-questions.ts` et `scripts/link-template-points.ts` (les accès
 * base communs sont dans `template-points-db.ts`). Un fichier JSON de modèle peut porter un champ
 * facultatif `"points": ["1SPE-135", …]` (codes de `curriculum_points`). Ce champ n'est PAS
 * une colonne de `question_templates` : il est retiré du modèle avant `checkTemplate` (dont le
 * schéma Zod strict le refuserait) et avant l'écriture. Les liens vivent dans
 * `question_template_points (template_id, point_id)`.
 *
 * Aucune lecture ni écriture ici : le script résout les codes en une requête, puis confie
 * le contrôle (`checkPointCodes`) et le calcul des liens (`planPointLinks`) à ce module.
 */

import { z } from 'zod';
import { GRADE_CODES } from '../../src/lib/types/grades';

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

/** Une ligne du mapping de `link-template-points.ts` */
export interface MappingEntry {
	id: string;
	codes: string[];
	/** Niveaux voulus (absent : ceux en base sont gardés) ; appliqués seulement avec `--niveaux` */
	grades?: string[];
}

export type MappingResult = { ok: true; entries: MappingEntry[] } | { ok: false; error: string };

/** `add` : liens à écrire ; `nothing` : tout est déjà là ; `refused` : modèle publié sans drapeau */
export type LinkAction = 'add' | 'nothing' | 'refused';

/** Changement de `grades` d'un modèle : `target` = grades contre lesquels contrôler les points */
export type GradeChange =
	| { kind: 'same'; target: string[] }
	| { kind: 'change'; from: string[]; target: string[] }
	| { kind: 'refused'; reason: string };

export interface GradeChangeInput {
	status: string;
	dbGrades: string[];
	/** `grades` du mapping (absent : rien à changer) */
	wanted: string[] | undefined;
	/** Drapeau `--niveaux` */
	niveaux: boolean;
	/** Drapeau `--liens-publies` */
	liensPublies: boolean;
}

// Constantes

export const MAX_POINTS_PER_TEMPLATE = 20;
export const MAX_MAPPING_ENTRIES = 500;
export const MAX_GRADES_PER_ENTRY = 4;

const pointCodeSchema = z
	.string()
	.min(1, 'code vide')
	.max(40, 'code trop long')
	.regex(/^\S+$/, 'code avec espace');

const pointsFieldSchema = z
	.array(pointCodeSchema)
	.max(MAX_POINTS_PER_TEMPLATE, `au plus ${MAX_POINTS_PER_TEMPLATE} codes`);

const mappingSchema = z
	.array(
		z
			.object({
				id: z.string().uuid('id qui n’est pas un uuid'),
				points: pointsFieldSchema.min(1, 'au moins un code'),
				grades: z
					.array(z.enum(GRADE_CODES, { message: 'code de niveau inconnu (cf. GRADE_CODES)' }))
					.min(1, 'grades vide')
					.max(MAX_GRADES_PER_ENTRY, `au plus ${MAX_GRADES_PER_ENTRY} niveaux`)
					.optional()
			})
			.strict()
	)
	.min(1, 'mapping vide')
	.max(MAX_MAPPING_ENTRIES, `au plus ${MAX_MAPPING_ENTRIES} entrées`);

// Fonctions

/** Valeurs répétées d'une liste (vide si aucune) */
function doublonsDe(valeurs: string[]): string[] {
	return [...new Set(valeurs.filter((v, i) => valeurs.indexOf(v) !== i))];
}

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
	const doublons = doublonsDe(parsed.data);
	if (doublons.length > 0) {
		return {
			ok: false,
			error: `${file} : champ « points » — code en double : ${doublons.join(', ')}`
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

/** `grades` comparés comme des ensembles : l'ordre (et un doublon) ne compte pas */
export function sameGrades(a: readonly string[], b: readonly string[]): boolean {
	const ea = new Set(a);
	const eb = new Set(b);
	return ea.size === eb.size && [...ea].every((g) => eb.has(g));
}

/** Ligne de simulation : liens à ajouter, déjà présents, et en base absents du fichier */
export function describeLinkPlan(plan: PointLinkPlan, remplacer: boolean): string {
	const parties: string[] = [];
	if (plan.toAdd.length) parties.push(`+${plan.toAdd.length} à ajouter (${plan.toAdd.join(', ')})`);
	if (plan.present.length) parties.push(`${plan.present.length} déjà présents`);
	if (plan.extra.length) {
		const codes = plan.extra.map((l) => l.code).join(', ');
		parties.push(
			remplacer
				? `-${plan.extra.length} à supprimer (${codes})`
				: `${plan.extra.length} en base absents du fichier, gardés (${codes})`
		);
	}
	return `liens : ${parties.length ? parties.join(' ; ') : 'aucun'}`;
}

/** Mapping `[{ id, points }]` de `link-template-points.ts`, validé en entier (Zod strict) */
export function parseMapping(raw: unknown): MappingResult {
	const parsed = mappingSchema.safeParse(raw);
	if (!parsed.success) {
		const issue = parsed.error.issues[0];
		const index = issue.path[0];
		const ou = typeof index === 'number' ? `entrée ${index + 1} : ` : '';
		return {
			ok: false,
			error: `mapping invalide — ${ou}${issue.message} (attendu : [{ "id": "<uuid>", "points": ["1SPE-050"], "grades"?: ["1_SPE"] }])`
		};
	}
	const entries: MappingEntry[] = [];
	for (const [i, { id, points, grades }] of parsed.data.entries()) {
		const doublons = doublonsDe(points);
		if (doublons.length > 0) {
			return {
				ok: false,
				error: `mapping invalide — entrée ${i + 1} : code en double : ${doublons.join(', ')}`
			};
		}
		if (grades === undefined) {
			entries.push({ id, codes: points });
			continue;
		}
		const niveauxEnDouble = doublonsDe(grades);
		if (niveauxEnDouble.length > 0) {
			return {
				ok: false,
				error: `mapping invalide — entrée ${i + 1} : niveau en double : ${niveauxEnDouble.join(', ')}`
			};
		}
		entries.push({ id, codes: points, grades });
	}
	const idsEnDouble = doublonsDe(entries.map((e) => e.id));
	if (idsEnDouble.length > 0) {
		return { ok: false, error: `mapping invalide — id en double : ${idsEnDouble.join(', ')}` };
	}
	return { ok: true, entries };
}

/** Ajout seulement : un modèle non brouillon n'est touché qu'avec `--liens-publies` */
export function decideLinkAction(
	status: string,
	publishedAllowed: boolean,
	plan: PointLinkPlan
): LinkAction {
	if (plan.toAdd.length === 0) return 'nothing';
	if (status !== 'draft' && !publishedAllowed) return 'refused';
	return 'add';
}

/** `[1_SPE] → [2]` : grades comme on les lit dans la simulation */
function listeDeNiveaux(grades: readonly string[]): string {
	return `[${grades.join(', ')}]`;
}

/**
 * Changement de `grades` voulu par le mapping. Différents de la base : refusé sans `--niveaux`
 * (le drapeau doit être explicite), et, sur un modèle non brouillon, sans `--liens-publies`.
 */
export function planGradeChange(input: GradeChangeInput): GradeChange {
	const { status, dbGrades, wanted, niveaux, liensPublies } = input;
	if (wanted === undefined || sameGrades(dbGrades, wanted)) {
		return { kind: 'same', target: dbGrades };
	}
	const avantApres = `${listeDeNiveaux(dbGrades)} en base, ${listeDeNiveaux(wanted)} dans le mapping`;
	if (!niveaux) {
		return { kind: 'refused', reason: `grades différents (${avantApres}) — --niveaux requis` };
	}
	if (status !== 'draft' && !liensPublies) {
		return {
			kind: 'refused',
			reason: `modèle ${status}, grades à changer (${avantApres}) — --liens-publies requis`
		};
	}
	return { kind: 'change', from: dbGrades, target: wanted };
}

/** Ligne de simulation d'un changement de niveau */
export function describeGradeChange(from: readonly string[], to: readonly string[]): string {
	return `grades : ${listeDeNiveaux(from)} → ${listeDeNiveaux(to)}`;
}
