/**
 * Bloc ```scratch — vérification des instructions
 * ===============================================
 *
 * Lit le programme avec `scratchblocks`, en FRANÇAIS seulement (décision du
 * 2026-11-01 : un auteur écrit en français), et rend les messages situés pour
 * l'auteur : instruction non reconnue (dessinée en rouge « obsolète » par la
 * bibliothèque), « fin » en trop, « sinon » sans « si ».
 *
 * Module LOURD (la syntaxe et le dictionnaire français) : jamais importé par le
 * parseur Markdown ; chargé à la demande par le rendu, et par les scripts de
 * vérification (`check:ubumark`).
 *
 * @module ubumark/utils/scratch-check
 */

import { loadLanguages, parse } from 'scratchblocks/syntax/index.js';
import type { ScratchBlock, ScratchDocument, ScratchScript } from 'scratchblocks/syntax/index.js';
import fr from 'scratchblocks/locales/fr.json';
import type { ScratchIssue } from '../types/scratch';

// ============================================================================
// CONSTANTES
// ============================================================================

/** Langue des programmes : le français seul */
export const SCRATCH_LANGUAGES = ['fr'];

/** Catégorie que donne `scratchblocks` à une instruction qu'il ne connaît pas */
const UNKNOWN_CATEGORY = 'obsolete';
/** « fin » resté seul : aucune boucle ni « si » ne l'a consommé */
const STRAY_END_ID = 'scratchblocks:end';
/** « sinon » resté seul : aucun « si … alors » ne l'a consommé */
const STRAY_ELSE_ID = 'CONTROL_ELSE';

// ============================================================================
// VARIABLES
// ============================================================================

let languageLoaded = false;

// ============================================================================
// FONCTIONS
// ============================================================================

/** Charger le dictionnaire français une seule fois */
function ensureLanguage(): void {
	if (languageLoaded) return;
	loadLanguages({ fr });
	languageLoaded = true;
}

/** Lire un programme en français (syntaxe des `scratchblocks`) */
export function parseScratchProgram(source: string): ScratchDocument {
	ensureLanguage();
	return parse(source, { languages: SCRATCH_LANGUAGES });
}

/** Texte d'une ligne, pour la comparer à celui que rend `stringify()` */
function normalizeLine(text: string): string {
	return text
		.replace(/\s+::.*$/, '')
		.replace(/\s+/g, ' ')
		.trim();
}

/** Une ligne sans son commentaire `// …` (ignoré par la bibliothèque) */
function stripComment(line: string): string {
	return line.replace(/(^|\s)\/\/.*$/, '');
}

/** Ce qui ne va pas dans une instruction, ou null */
function problemOf(block: ScratchBlock, text: string): string | null {
	if (block.info.id === STRAY_END_ID) return '« fin » en trop (aucune boucle ni « si » à fermer)';
	if (block.info.id === STRAY_ELSE_ID) return '« sinon » sans « si … alors » au-dessus';
	if (block.info.category === UNKNOWN_CATEGORY) return `instruction « ${text} » non reconnue`;
	return null;
}

/**
 * Messages situés pour l'auteur ; vide si le programme se lit entièrement.
 * Ligne 1 = première ligne après ```scratch.
 *
 * Les lignes sont retrouvées en suivant la structure : une instruction par
 * ligne, dans l'ordre de lecture ; dans une boucle ou un « si », les
 * instructions de chaque bouche, un « sinon » entre deux bouches, puis le
 * « fin » qui la ferme (absent en fin de programme : la bibliothèque ferme
 * d'elle-même).
 */
export function checkScratchProgram(source: string): ScratchIssue[] {
	if (source.trim() === '') return [];
	// Lignes comparées comme les lit la bibliothèque : commentaire `//` retiré, casse ignorée
	const lines = source.split('\n').map((line) => normalizeLine(stripComment(line)).toLowerCase());
	const issues: ScratchIssue[] = [];
	let cursor = 0;

	/** Prochaine ligne non vide, sans l'avancer */
	const peek = (): number => {
		let k = cursor;
		while (k < lines.length && lines[k] === '') k++;
		return k;
	};
	/** Consommer la prochaine ligne non vide si elle vaut `word` */
	const consume = (word: string) => {
		const k = peek();
		if (lines[k] === word) cursor = k + 1;
	};

	/** Contrôler une instruction et les instructions posées dans ses entrées */
	const check = (block: ScratchBlock, lineIndex: number) => {
		const text = normalizeLine(block.stringify().split('\n')[0]);
		const problem = problemOf(block, text);
		if (problem !== null) {
			issues.push(
				lineIndex < lines.length
					? { message: `Ligne ${lineIndex + 1} : ${problem}`, line: lineIndex + 1 }
					: { message: problem }
			);
		}
		for (const child of block.children) {
			if (child.isBlock) check(child as ScratchBlock, lineIndex);
		}
	};

	const visitStack = (block: ScratchBlock) => {
		const lineIndex = peek();
		cursor = lineIndex + 1;
		check(block, lineIndex);
		const mouths = block.children.filter(
			(child): child is ScratchScript => child.isScript === true
		);
		mouths.forEach((mouth, index) => {
			if (index > 0) consume('sinon');
			for (const inner of mouth.blocks) visitStack(inner);
		});
		if (mouths.length > 0) consume('fin');
	};

	for (const script of parseScratchProgram(source).scripts) {
		for (const block of script.blocks) visitStack(block);
	}
	return issues;
}
