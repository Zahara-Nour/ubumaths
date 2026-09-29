/**
 * Fichiers d'un lot : `docs/corrections/<lot>/`
 * =============================================
 *
 * - `_modeles.json` : instantané des lignes `question_templates` du lot, lues en
 *   prod (LECTURE SEULE) ou depuis un JSON local ; vérification et aperçu
 *   travaillent dessus, sans base ;
 * - `<id>.json` : une proposition par modèle ;
 * - `APERCU.md` : l'aperçu à relire sur GitHub.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { format, resolveConfig } from 'prettier';
import { z } from 'zod';
import type { QuestionTemplate } from '../../../src/lib/questions/types';
import {
	toQuestionTemplate,
	type QuestionTemplateRow
} from '../../../src/lib/types/question-template';
import { parseProposal, type Proposal } from './proposal';

// ============================================================================
// CONSTANTS
// ============================================================================

export const CORRECTIONS_ROOT = 'docs/corrections';
const SNAPSHOT_FILE = '_modeles.json';

/** Ligne `question_templates` relue d'un fichier : les champs utiles sont contrôlés */
const rowSchema = z
	.object({
		id: z.string().uuid(),
		title: z.string(),
		theme: z.string(),
		domain: z.string(),
		level: z.number(),
		status: z.string(),
		grades: z.array(z.string()),
		variations: z.array(z.record(z.string(), z.unknown())).min(1)
	})
	.passthrough();

// ============================================================================
// FUNCTIONS
// ============================================================================

export function lotDir(lot: string): string {
	return join(CORRECTIONS_ROOT, lot);
}

export function proposalPath(lot: string, templateId: string): string {
	return join(lotDir(lot), `${templateId}.json`);
}

/** Lignes brutes validées (tableau JSON de lignes `question_templates`) */
export function parseRows(raw: unknown, origin: string): QuestionTemplateRow[] {
	const result = z.array(rowSchema).safeParse(raw);
	if (!result.success) {
		const issue = result.error.issues[0];
		throw new Error(`${origin} : ${issue.path.join('.')} : ${issue.message}`);
	}
	return result.data as unknown as QuestionTemplateRow[];
}

/**
 * Écrit un fichier généré tel que le hook pre-commit (prettier) le laisserait :
 * régénérer un lot inchangé ne produit alors aucun diff.
 */
export async function writeFormatted(path: string, content: string): Promise<string> {
	const options = (await resolveConfig(path)) ?? {};
	writeFileSync(path, await format(content, { ...options, filepath: path }));
	return path;
}

/** Colonnes qui portent un identifiant d'utilisateur (`created_by`, `user_id`…) */
export function isUserIdField(key: string): boolean {
	return /(^|_)by$|(^|_)user_id$|^(owner|author|teacher|student)_id$/.test(key);
}

/**
 * Ligne publiable dans le dépôt : sans identifiant d'utilisateur (RGPD — un
 * instantané commité n'a pas à dire QUI a créé le modèle).
 */
export function withoutUserIds(row: QuestionTemplateRow): QuestionTemplateRow {
	return Object.fromEntries(
		Object.entries(row).filter(([key]) => !isUserIdField(key))
	) as QuestionTemplateRow;
}

export async function writeSnapshot(lot: string, rows: QuestionTemplateRow[]): Promise<string> {
	mkdirSync(lotDir(lot), { recursive: true });
	return writeFormatted(
		join(lotDir(lot), SNAPSHOT_FILE),
		JSON.stringify(rows.map(withoutUserIds), null, 2)
	);
}

export function readSnapshotRows(lot: string): QuestionTemplateRow[] {
	const path = join(lotDir(lot), SNAPSHOT_FILE);
	if (!existsSync(path)) {
		throw new Error(`${path} absent : lancer d'abord \`pnpm corrections:generate ${lot}\``);
	}
	return parseRows(JSON.parse(readFileSync(path, 'utf8')), path);
}

export function readSnapshot(lot: string): Map<string, QuestionTemplate> {
	return new Map(readSnapshotRows(lot).map((row) => [row.id, toQuestionTemplate(row)]));
}

export async function writeProposal(lot: string, proposal: Proposal): Promise<string> {
	return writeFormatted(proposalPath(lot, proposal.templateId), JSON.stringify(proposal));
}

export function readProposal(lot: string, templateId: string): Proposal {
	const path = proposalPath(lot, templateId);
	return parseProposal(JSON.parse(readFileSync(path, 'utf8')), path);
}
