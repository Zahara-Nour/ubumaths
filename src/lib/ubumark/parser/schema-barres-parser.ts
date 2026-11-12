/**
 * Bloc ```schema-barres — analyse du texte
 * ========================================
 *
 * ```schema-barres
 * Or : ? (4) ; 70 (2)
 * Argent : ? (4)
 * Bronze : ? (4) ; -80 (1,5)
 * total : 320 €
 * ```
 *
 * - Une ligne `Nom : segments` = une barre, dans l'ordre du texte. Le nom (texte
 *   libre, peut être vide : `: ? ; ?`) est écrit à gauche.
 * - Segments séparés par `;`. Un segment = `étiquette (longueur)` ou `étiquette`
 *   seule (longueur 1). Longueur décimale à virgule ou à point, de 0,1 à 50.
 *   Une étiquette qui commence par `-` est une PARTIE MANQUANTE (pointillés).
 * - `= texte` en fin de ligne : accolade horizontale sous la barre.
 * - `total : texte` (casse indifférente) : accolade verticale à droite de toutes
 *   les barres. Une barre ne peut donc pas s'appeler « total ».
 * - Au plus 6 barres et 12 segments par barre.
 *
 * Les longueurs sont écrites par le prof, jamais calculées sur les nombres.
 * Dans un modèle de question, `{{a}}` est résolu AVANT : le bloc ne lit que du
 * texte résolu. Une erreur ne fait pas disparaître le bloc (le nœud porte ses
 * phrases « Ligne N : … »). Repérage et blocs non fermés : ceux de ```partage
 * (Q63, Q66).
 *
 * @module ubumark/parser/schema-barres-parser
 */

import { specialBlockEnd } from './unclosed-block';
import {
	SCHEMA_BARRES_BARS,
	SCHEMA_BARRES_LENGTH,
	SCHEMA_BARRES_SEGMENTS,
	type SchemaBarresBar,
	type SchemaBarresBlockRange,
	type SchemaBarresNode,
	type SchemaBarresSegment
} from '../types/schema-barres';

// ============================================================================
// CONSTANTES
// ============================================================================

const BLOCK_START_REGEX = /^```schema-barres\s*$/;
const BLOCK_END_REGEX = /^```\s*$/;

/** Les mots qui ouvrent une ligne du bloc pour le repérage (les autres lignes ont toutes un `:`) */
const BLOCK_KEYS = ['total'] as const;

const LENGTH_REGEX = /^\d+(?:\.\d+)?$/;

// ============================================================================
// DÉTECTION
// ============================================================================

export function isSchemaBarresBlockStart(line: string): boolean {
	return BLOCK_START_REGEX.test(line);
}

/**
 * Blocs ```schema-barres d'une liste de lignes (indices inclusifs, clôtures
 * comprises). Fermé par un ``` qui ne fait pas lire du texte comme contenu
 * (Q66), sinon jusqu'à la première ligne vide (Q63).
 */
export function findSchemaBarresBlocks(lines: string[]): SchemaBarresBlockRange[] {
	const blocks: SchemaBarresBlockRange[] = [];
	let i = 0;
	while (i < lines.length) {
		if (isSchemaBarresBlockStart(lines[i])) {
			const { endIndex } = specialBlockEnd(
				lines,
				i,
				(line) => BLOCK_END_REGEX.test(line),
				BLOCK_KEYS
			);
			blocks.push({ startIndex: i, endIndex });
			i = endIndex;
		}
		i++;
	}
	return blocks;
}

// ============================================================================
// ANALYSE
// ============================================================================

/** Erreur d'une ligne, levée par les lecteurs de valeur */
class LineError extends Error {}

const UNCLOSED_PARENTHESIS =
	'parenthèse non fermée : écris la longueur entre parenthèses, ex. ? (4)';

/** « 1,5 » ou « 1.5 » → 1,5 ; lève si illisible, nulle, négative ou hors bornes */
function parseLength(raw: string): number {
	const text = raw.trim().replace(',', '.');
	if (/^-\d/.test(text)) throw new LineError(`longueur « ${raw.trim()} » négative`);
	if (!LENGTH_REGEX.test(text)) {
		throw new LineError(`longueur « ${raw.trim()} » illisible : un nombre, ex. ? (4) ou ? (1,5)`);
	}
	const length = Number(text);
	if (length === 0) throw new LineError('longueur nulle : une longueur est au moins 0,1');
	if (length < SCHEMA_BARRES_LENGTH.min || length > SCHEMA_BARRES_LENGTH.max) {
		throw new LineError(
			`longueur « ${raw.trim()} » hors bornes : de ${String(SCHEMA_BARRES_LENGTH.min).replace('.', ',')} à ${SCHEMA_BARRES_LENGTH.max}`
		);
	}
	return length;
}

function parseSegment(raw: string): SchemaBarresSegment {
	const text = raw.trim();
	if (text === '') {
		throw new LineError('segment vide : retire le « ; » en trop ou écris son étiquette');
	}
	const open = text.lastIndexOf('(');
	const close = text.lastIndexOf(')');
	let label = text;
	let length = 1;
	if (open !== -1 || close !== -1) {
		if (open === -1 || close < open || close !== text.length - 1) {
			throw new LineError(UNCLOSED_PARENTHESIS);
		}
		label = text.slice(0, open).trim();
		length = parseLength(text.slice(open + 1, close));
	}
	const missing = label.startsWith('-');
	if (missing) label = label.slice(1).trim();
	return { label, length, missing };
}

/**
 * Analyser le texte d'un bloc (sans les clôtures).
 * Ligne 1 = première ligne après ```schema-barres.
 */
export function parseSchemaBarresContent(source: string): SchemaBarresNode {
	const lines = source.split('\n');
	const errors: string[] = [];
	const bars: SchemaBarresBar[] = [];
	let total: string | undefined;
	let totalLine = 0;
	let tooManyBarsSaid = false;
	const fail = (line: number, message: string) => errors.push(`Ligne ${line} : ${message}`);

	lines.forEach((line, index) => {
		const text = line.trim();
		if (text === '') return;
		const lineNo = index + 1;
		const colon = text.indexOf(':');
		if (colon === -1) {
			fail(lineNo, 'écris le nom de la barre, puis « : », puis ses segments.');
			return;
		}
		const name = text.slice(0, colon).trim();
		const rest = text.slice(colon + 1).trim();

		if (name.toLowerCase() === 'total') {
			if (total !== undefined || totalLine > 0) {
				fail(lineNo, `« total » est déjà écrit ligne ${totalLine} : une seule accolade de total`);
			} else if (rest === '') {
				totalLine = lineNo;
				fail(lineNo, 'écris le texte du total après « total : », ex. total : 320 €');
			} else {
				total = rest;
				totalLine = lineNo;
			}
			return;
		}

		try {
			const equals = rest.indexOf('=');
			const segmentsText = equals === -1 ? rest : rest.slice(0, equals);
			const brace = equals === -1 ? undefined : rest.slice(equals + 1).trim();
			if (brace === '') {
				throw new LineError('« = » sans texte : écris le texte de l’accolade, ex. = 9 €');
			}
			const parts = segmentsText.split(';');
			if (parts.length > SCHEMA_BARRES_SEGMENTS.max) {
				throw new LineError(`au plus ${SCHEMA_BARRES_SEGMENTS.max} segments par barre`);
			}
			const segments = parts.map(parseSegment);
			if (segments.every((s) => s.missing)) {
				throw new LineError(
					`la barre « ${name} » n’a que des parties manquantes : écris au moins un segment plein`
				);
			}
			if (bars.length >= SCHEMA_BARRES_BARS.max) {
				if (!tooManyBarsSaid) {
					tooManyBarsSaid = true;
					throw new LineError(`au plus ${SCHEMA_BARRES_BARS.max} barres`);
				}
				return;
			}
			bars.push({ name, segments, ...(brace !== undefined && { brace }) });
		} catch (e) {
			if (!(e instanceof LineError)) throw e;
			fail(lineNo, e.message);
		}
	});

	if (bars.length === 0 && errors.length === 0) {
		fail(1, 'écris au moins une barre, ex. Or : ? (4) ; 70 (2)');
	}

	if (errors.length > 0) return { type: 'schema-barres', source, spec: null, errors };
	return {
		type: 'schema-barres',
		source,
		spec: { bars, ...(total !== undefined && { total }) },
		errors
	};
}

/**
 * Analyser un bloc repéré dans les lignes d'un document : `end` EXCLU, la
 * fence de fin pour un bloc fermé, la ligne qui suit le bloc sinon.
 */
export function parseSchemaBarres(
	lines: string[],
	startIndex: number,
	end: number
): { node: SchemaBarresNode } {
	const body = lines.slice(startIndex + 1, end);
	const node = parseSchemaBarresContent(body.join('\n'));
	const closed = end > startIndex && BLOCK_END_REGEX.test(lines[end] ?? '');
	if (closed) return { node };
	return {
		node: {
			...node,
			errors: [
				...node.errors,
				`Ligne ${body.length + 1} : bloc non fermé (\`\`\` manquant après la dernière ligne)`
			]
		}
	};
}
