/**
 * Bloc ```monnaie — analyse du texte
 * ==================================
 *
 * ```monnaie
 * billets: 20 10 10 ; 1×50
 * pièces: 3×2 1 ;
 * disposition: rangé | mélangé
 * légendes: Léa ; Tom
 * taille: 6cm
 * ```
 *
 * - `billets:` (5, 10, 20, 50, 100) et `pièces:` (1, 2), en euros : au moins
 *   l'une des deux, ou `montant:` (0 à 100, le bloc choisit les coupures,
 *   « le moins d'objets »), jamais mêlé aux deux autres. Une liste `20 10 10`
 *   ou une forme comptée `2×10` (`x` et `*` valent `×`) ; un ensemble par
 *   valeur séparée par `;` (1 à 3), vide admis ; une ligne absente vaut
 *   « aucun ». 100 € et 30 objets au plus par ensemble.
 * - Le reste est facultatif ; une clé inconnue ou une valeur hors liste est
 *   une erreur située, jamais un réglage ignoré. Centimes (`50c`) et billets
 *   de 200 et 500 € : « pas encore disponible » (CE1, plus tard).
 *
 * Dans un modèle de question, `{{n}}` est résolu AVANT : le bloc ne lit que
 * des nombres. Une erreur ne fait pas disparaître le bloc (le nœud porte ses
 * messages). Repérage et blocs non fermés : ceux de ```collection.
 *
 * Phase 0 : `docs/archive/wip/monnaie-progress.md`.
 *
 * @module ubumark/parser/monnaie-parser
 */

import { specialBlockEnd } from './unclosed-block';
import {
	MONNAIE_CAPTION_MAX,
	MONNAIE_COINS,
	MONNAIE_LAYOUTS,
	MONNAIE_LIMITS,
	MONNAIE_MAX_SETS,
	MONNAIE_NOTES,
	MONNAIE_RESERVED_NOTES,
	MONNAIE_SIZE_CM,
	type MonnaieBlockRange,
	type MonnaieIssue,
	type MonnaieLayout,
	type MonnaieNode,
	type MonnaieSet
} from '../types/monnaie';

// ============================================================================
// CONSTANTES
// ============================================================================

const MONNAIE_BLOCK_START_REGEX = /^```monnaie\s*$/;
const BLOCK_END_REGEX = /^```\s*$/;

/** `clé: valeur` */
const KEY_LINE_REGEX = /^([A-Za-zÀ-ÿ]+)\s*:\s*(.*)$/;

/** Un nombre entier écrit en chiffres */
const INTEGER_REGEX = /^\d+$/;

/** Des centimes : `50c`, `50 c`, `0,50` */
const CENTS_REGEX = /^\d+\s*c$|^\d+[.,]\d+$/i;

/** `3cm`, `2,5 cm` */
const SIZE_REGEX = /^(\d+(?:[.,]\d+)?)\s*cm$/i;

/** Les clés du bloc : une ligne qui commence par l'une d'elles n'est jamais du texte (Q66) */
const BLOCK_KEYS = [
	'billets',
	'pièces',
	'pieces',
	'montant',
	'disposition',
	'légendes',
	'legendes',
	'taille'
] as const;

type Key = 'billets' | 'pièces' | 'montant' | 'disposition' | 'légendes' | 'taille';

const KEY_NAMES: Key[] = ['billets', 'pièces', 'montant', 'disposition', 'légendes', 'taille'];

/** Toutes les coupures, de la plus grande à la plus petite (décomposition de `montant:`) */
const DENOMINATIONS = [...MONNAIE_NOTES, ...MONNAIE_COINS];

const EXISTING = `pièces : ${[...MONNAIE_COINS].reverse().join(', ')} ; billets : ${[...MONNAIE_NOTES].reverse().join(', ')}`;

// ============================================================================
// DÉTECTION
// ============================================================================

export function isMonnaieBlockStart(line: string): boolean {
	return MONNAIE_BLOCK_START_REGEX.test(line);
}

/**
 * Blocs ```monnaie d'une liste de lignes (indices inclusifs, clôtures comprises).
 * Fermé par un ``` qui ne fait pas lire du texte comme contenu (Q66), sinon
 * jusqu'à la première ligne vide (Q63).
 */
export function findMonnaieBlocks(lines: string[]): MonnaieBlockRange[] {
	const blocks: MonnaieBlockRange[] = [];
	let i = 0;
	while (i < lines.length) {
		if (isMonnaieBlockStart(lines[i])) {
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

/** `2.5` → `2,5`, pour les messages à l'auteur */
function frenchNumber(value: number): string {
	return String(value).replace('.', ',');
}

/** Retire les accents (`pièces` = `pieces`) */
function plain(text: string): string {
	return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

function normalizeKey(raw: string): Key | null {
	const key = plain(raw);
	return KEY_NAMES.find((k) => plain(k) === key) ?? null;
}

function oneOf<T extends string>(raw: string, allowed: readonly T[], key: string): T {
	const found = allowed.find((value) => plain(value) === plain(raw));
	if (found === undefined) {
		throw new LineError(`${key} « ${raw} » : valeurs possibles ${allowed.join(', ')}`);
	}
	return found;
}

/** Les parts d'une ligne séparées par `;` : une par ensemble */
function splitSets(value: string): string[] {
	const parts = value.split(';').map((part) => part.trim());
	if (parts.length > MONNAIE_MAX_SETS) {
		throw new LineError(`${parts.length} valeurs : au plus ${MONNAIE_MAX_SETS} ensembles par bloc`);
	}
	return parts;
}

/** Une coupure écrite (`10`, `10€`) : sa valeur, vérifiée du bon genre */
function readDenomination(raw: string, kind: 'billets' | 'pièces'): number {
	const text = raw.replace(/€$/, '').trim();
	if (CENTS_REGEX.test(text)) {
		throw new LineError(`« ${raw} » : centimes pas encore disponibles (euros entiers seulement)`);
	}
	if (!INTEGER_REGEX.test(text)) {
		throw new LineError(`« ${raw} » : écris la valeur en euros, ex. ${kind}: 10 5`);
	}
	const value = Number(text);
	const isNote = (MONNAIE_NOTES as readonly number[]).includes(value);
	const isCoin = (MONNAIE_COINS as readonly number[]).includes(value);
	if ((MONNAIE_RESERVED_NOTES as readonly number[]).includes(value)) {
		throw new LineError(`billet de ${value} € : pas encore disponible (${EXISTING})`);
	}
	if (kind === 'billets' && isCoin) {
		throw new LineError(
			`${value} € est une pièce : écris-la dans pièces: (forme comptée : quantité d'abord, ex. 3×2)`
		);
	}
	if (kind === 'pièces' && isNote) {
		throw new LineError(
			`${value} € est un billet : écris-le dans billets: (forme comptée : quantité d'abord, ex. 2×10)`
		);
	}
	if (!isNote && !isCoin) throw new LineError(`${value} € n'existe pas (${EXISTING})`);
	return value;
}

/**
 * Les coupures d'une ligne `billets:` ou `pièces:`, par ensemble, de la plus
 * grande à la plus petite : `20 10 10`, `2×10 1×20`, `{{n}}×2 1`.
 */
function parseDenominations(value: string, kind: 'billets' | 'pièces'): number[][] {
	return splitSets(value).map((part) => {
		const tokens = part
			.replace(/\s*[×xX*]\s*/g, '×')
			.split(/\s+/)
			// `10 €` : le signe seul ne compte pas
			.filter((token) => token !== '' && token !== '€');
		const values: number[] = [];
		for (const token of tokens) {
			const counted = /^([^×]+)×(.+)$/.exec(token);
			const count = counted ? counted[1] : '1';
			if (!INTEGER_REGEX.test(count)) {
				throw new LineError(`quantité « ${count} » : écris un nombre entier, ex. 3×2`);
			}
			if (Number(count) > MONNAIE_LIMITS.objects) {
				throw new LineError(`${count} objets : ${MONNAIE_LIMITS.objects} au plus par ensemble`);
			}
			const denomination = readDenomination(counted ? counted[2] : token, kind);
			for (let i = 0; i < Number(count); i++) values.push(denomination);
		}
		return values.sort((a, b) => b - a);
	});
}

/** Des montants `48 ; 30`, chacun entier de 0 à 100 */
function parseAmounts(value: string): number[] {
	return splitSets(value).map((part) => {
		const text = part.replace(/€$/, '').trim();
		if (CENTS_REGEX.test(text)) {
			throw new LineError(`montant « ${part} » : centimes pas encore disponibles`);
		}
		if (!INTEGER_REGEX.test(text) || Number(text) > MONNAIE_LIMITS.total) {
			throw new LineError(
				`montant « ${part} » : écris un nombre entier d'euros de 0 à ${MONNAIE_LIMITS.total}`
			);
		}
		return Number(text);
	});
}

/** `montant:` → les coupures « le moins d'objets » (méthode gloutonne, exacte pour l'euro) */
export function decomposeAmount(amount: number): MonnaieSet {
	const notes: number[] = [];
	const coins: number[] = [];
	let rest = amount;
	for (const value of DENOMINATIONS) {
		while (rest >= value) {
			((MONNAIE_NOTES as readonly number[]).includes(value) ? notes : coins).push(value);
			rest -= value;
		}
	}
	return { notes, coins };
}

function parseCaptions(value: string): string[] {
	const captions = value.split(';').map((part) => part.trim());
	const tooLong = captions.find((caption) => caption.length > MONNAIE_CAPTION_MAX);
	if (tooLong !== undefined) {
		throw new LineError(
			`légende « ${tooLong.slice(0, 20)}… » trop longue (${MONNAIE_CAPTION_MAX} caractères au plus)`
		);
	}
	return captions;
}

function parseSize(value: string): number {
	const size = SIZE_REGEX.exec(value);
	if (!size)
		throw new LineError(`taille « ${value} » : écris un nombre de centimètres, ex. taille: 6cm`);
	const cm = Number(size[1].replace(',', '.'));
	if (cm < MONNAIE_SIZE_CM.min || cm > MONNAIE_SIZE_CM.max) {
		throw new LineError(
			`taille ${size[1]} cm : choisis entre ${frenchNumber(MONNAIE_SIZE_CM.min)} et ${frenchNumber(MONNAIE_SIZE_CM.max)} cm`
		);
	}
	return cm;
}

/**
 * Analyser le texte d'un bloc (sans les clôtures).
 * Ligne 1 = première ligne après ```monnaie.
 */
export function parseMonnaieContent(source: string): MonnaieNode {
	const lines = source.split('\n');
	const errors: MonnaieIssue[] = [];
	const fail = (line: number, message: string) =>
		errors.push({ message: `Ligne ${line} : ${message}`, line });

	let notes: number[][] | null = null;
	let coins: number[][] | null = null;
	let coinsLine = 1;
	let amounts: number[] | null = null;
	let captions: string[] | null = null;
	let captionsLine = 1;
	let layout: MonnaieLayout = 'rangé';
	let sizeCm: number | null = null;
	const seen = new Map<Key, number>();

	lines.forEach((line, index) => {
		const text = line.trim();
		if (text === '') return;
		const lineNo = index + 1;
		const match = KEY_LINE_REGEX.exec(text);
		if (!match) {
			fail(lineNo, `ligne « ${text} » non comprise (attendu : clé: valeur, ex. billets: 10 5)`);
			return;
		}
		const key = normalizeKey(match[1]);
		const value = match[2].trim();
		if (key === null) {
			fail(lineNo, `clé « ${match[1]} » inconnue (clés possibles : ${KEY_NAMES.join(', ')})`);
			return;
		}
		const previous = seen.get(key);
		if (previous !== undefined) {
			fail(lineNo, `« ${key} » déjà donnée ligne ${previous}`);
			return;
		}
		seen.set(key, lineNo);

		try {
			switch (key) {
				case 'billets':
					notes = parseDenominations(value, 'billets');
					break;
				case 'pièces':
					coins = parseDenominations(value, 'pièces');
					coinsLine = lineNo;
					break;
				case 'montant':
					amounts = parseAmounts(value);
					break;
				case 'légendes':
					captions = parseCaptions(value);
					captionsLine = lineNo;
					break;
				case 'disposition':
					layout = oneOf(value, MONNAIE_LAYOUTS, 'disposition');
					break;
				case 'taille':
					sizeCm = parseSize(value);
					break;
			}
		} catch (e) {
			if (!(e instanceof LineError)) throw e;
			fail(lineNo, e.message);
		}
	});

	// Les vérifications qui croisent deux lignes, une fois tout lu
	const readNotes = notes as number[][] | null;
	const readCoins = coins as number[][] | null;
	const readAmounts = amounts as number[] | null;
	const readCaptions = captions as string[] | null;
	const amountLine = seen.get('montant');
	let sets: MonnaieSet[] | null = null;
	if (amountLine !== undefined && (seen.has('billets') || seen.has('pièces'))) {
		fail(amountLine, 'montant: ou billets: et pièces:, pas les deux');
	} else if (amountLine === undefined && !seen.has('billets') && !seen.has('pièces')) {
		fail(1, 'rien à dessiner : écris billets:, pièces: ou montant: (ex. billets: 10 5)');
	} else if (errors.length === 0) {
		if (readNotes !== null && readCoins !== null && readNotes.length !== readCoins.length) {
			fail(
				coinsLine,
				`billets : ${readNotes.length} ensemble(s), pièces : ${readCoins.length} : une valeur par ensemble (séparées par ;)`
			);
		} else if (readAmounts !== null) {
			sets = readAmounts.map(decomposeAmount);
		} else {
			const count = (readNotes ?? readCoins ?? []).length;
			sets = Array.from({ length: count }, (_, i) => ({
				notes: readNotes?.[i] ?? [],
				coins: readCoins?.[i] ?? []
			}));
			const line = seen.get('pièces') ?? seen.get('billets') ?? 1;
			sets.forEach((set, i) => {
				const where = sets!.length > 1 ? ` (ensemble ${i + 1})` : '';
				const total = [...set.notes, ...set.coins].reduce((sum, v) => sum + v, 0);
				const objects = set.notes.length + set.coins.length;
				if (total > MONNAIE_LIMITS.total) {
					fail(line, `${total} €${where} : ${MONNAIE_LIMITS.total} € au plus`);
				} else if (objects > MONNAIE_LIMITS.objects) {
					fail(line, `${objects} objets${where} : ${MONNAIE_LIMITS.objects} au plus`);
				}
			});
		}
		if (sets !== null && readCaptions !== null && readCaptions.length !== sets.length) {
			fail(
				captionsLine,
				`${readCaptions.length} légende(s) pour ${sets.length} ensemble(s) : une légende par ensemble`
			);
		}
	}

	if (errors.length > 0 || sets === null) {
		return { type: 'monnaie', source, spec: null, errors };
	}
	return {
		type: 'monnaie',
		source,
		spec: { sets, captions: readCaptions, layout, sizeCm },
		errors
	};
}

/**
 * Analyser un bloc repéré dans les lignes d'un document : `end` EXCLU, la
 * fence de fin pour un bloc fermé, la ligne qui suit le bloc sinon.
 */
export function parseMonnaie(
	lines: string[],
	startIndex: number,
	end: number
): { node: MonnaieNode } {
	const body = lines.slice(startIndex + 1, end);
	const node = parseMonnaieContent(body.join('\n'));
	const closed = end > startIndex && BLOCK_END_REGEX.test(lines[end] ?? '');
	if (closed) return { node };
	return {
		node: {
			...node,
			errors: [
				...node.errors,
				{
					message: `Ligne ${body.length + 1} : bloc non fermé (\`\`\` manquant après la dernière ligne)`,
					line: body.length + 1
				}
			]
		}
	};
}

/**
 * Taille d'un ensemble dans un CHOIX de QCM imprimé (série figée) : `taille:`
 * ajoutée aux blocs ```monnaie qui n'en donnent pas. À l'écran, c'est le CSS
 * du choix qui réduit le dessin.
 */
export function withChoiceMonnaieSize(markdown: string): string {
	const lines = markdown.split('\n');
	const blocks = findMonnaieBlocks(lines);
	for (const { startIndex, endIndex } of [...blocks].reverse()) {
		const body = lines.slice(startIndex + 1, endIndex + 1);
		if (body.some((line) => /^\s*taille\s*:/i.test(line))) continue;
		lines.splice(startIndex + 1, 0, `taille: ${MONNAIE_SIZE_CM.choice}cm`);
	}
	return lines.join('\n');
}
