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
 * - `billets:` (5, 10, 20, 50, 100, 200, 500 €) et `pièces:` (1, 2 € ; 1, 2,
 *   5, 10, 20, 50 c écrites `50c` ou `50 c`) : au moins l'une des deux, ou
 *   `montant:` (0 à 1 000 €, écrit `3,45`, `3 € 45 c` ou `345c` ; le bloc
 *   choisit les coupures, « le moins d'objets »), jamais mêlé aux deux autres.
 *   Une liste `20 10 10` ou une forme comptée `2×10` (`x` et `*` valent `×`) ;
 *   un ensemble par valeur séparée par `;` (1 à 3), vide admis ; une ligne
 *   absente vaut « aucun ». 1 000 € et 30 objets au plus par ensemble.
 * - Le reste est facultatif ; une clé inconnue ou une valeur hors liste est
 *   une erreur située, jamais un réglage ignoré. Les valeurs du nœud sont en
 *   euros (`0.5` = 50 c), les calculs en centimes (`utils/monnaie-valeurs.ts`).
 * - `construire: 35` ou `construire: 3,45` (1 c à 1 000 €) : l'élève construit
 *   la somme sur un plan vide, avec les coupures de `réserve: 1 2 5 10 20`
 *   (défaut : 1, 2, 5, 10, 20, 50 €, et les six pièces de centimes si la somme
 *   en a) ; `billets:`, `pièces:`, `montant:`, `légendes:` et `disposition:`
 *   sont alors sans objet. Une somme infaisable avec la réserve en 30 objets au
 *   plus est une erreur. `case: N` est posée par le générateur de questions,
 *   jamais par l'auteur (chantier `docs/wip/construire-progress.md` § 6).
 *
 * Dans un modèle de question, `{{n}}` est résolu AVANT : le bloc ne lit que
 * des nombres. Une erreur ne fait pas disparaître le bloc (le nœud porte ses
 * messages). Repérage et blocs non fermés : ceux de ```collection.
 *
 * Phase 0 : `docs/archive/wip/monnaie-progress.md`.
 *
 * @module ubumark/parser/monnaie-parser
 */

import { unnestedLine } from './nested-line';
import { specialBlockEnd } from './unclosed-block';
import { isMaskedValue } from '../utils/masked-value';
import { DEFAULT_RESERVE, fewestObjects } from '../utils/monnaie-construire';
import {
	amountWords,
	denominationLabel,
	denominationList,
	fromCents,
	isCents,
	readAmount,
	toCents
} from '../utils/monnaie-valeurs';
import {
	MONNAIE_BUILD_RANGE,
	MONNAIE_CAPTION_MAX,
	MONNAIE_CENT_COINS,
	MONNAIE_COINS,
	MONNAIE_LAYOUTS,
	MONNAIE_LIMITS,
	MONNAIE_MAX_SETS,
	MONNAIE_NOTES,
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

/** `3cm`, `2,5 cm` */
const SIZE_REGEX = /^(\d+(?:[.,]\d+)?)\s*cm$/i;

/**
 * Les clés du bloc : une ligne qui commence par l'une d'elles n'est jamais du texte (Q66).
 * Sans `construire:`, `réserve:`, `case:` : leurs valeurs ont toujours un chiffre, déjà
 * reconnu ; les ajouter ferait avaler à un bloc non fermé un paragraphe « Construire… »
 */
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

type Key =
	| 'billets'
	| 'pièces'
	| 'montant'
	| 'disposition'
	| 'légendes'
	| 'taille'
	| 'construire'
	| 'réserve'
	| 'case';

const KEY_NAMES: Key[] = [
	'billets',
	'pièces',
	'montant',
	'disposition',
	'légendes',
	'taille',
	'construire',
	'réserve',
	'case'
];

/** Clés sans objet sur un bloc à construire, et pourquoi */
const NOT_WITH_BUILD: Partial<Record<Key, string>> = {
	billets: ' (l’élève part d’un plan vide)',
	pièces: ' (l’élève part d’un plan vide)',
	montant: ' (l’élève part d’un plan vide)',
	disposition: ' (les coupures se rangent d’office)',
	légendes: ''
};

/** Toutes les coupures, de la plus grande à la plus petite (décomposition de `montant:`) */
const DENOMINATIONS = [...MONNAIE_NOTES, ...MONNAIE_COINS];

const EXISTING = `pièces : ${denominationList(MONNAIE_COINS)} ; billets : ${denominationList(MONNAIE_NOTES)}`;

/** Un montant calculé resté en fraction : `{{eval:345/100}}` donne `\dfrac{69}{20}` (revue M1) */
const FRACTION_REGEX = /\\[dt]?frac\b/;

const FRACTION_HINT =
	'une fraction n’est pas un montant ; écris {{eval:…;d}} pour un résultat décimal, ex. {{eval:p/100;d}}';

/** Plafond d'un ensemble, en centimes */
const MAX_CENTS = MONNAIE_LIMITS.total * 100;

/** `50 c` → `50c` : la valeur et son unité restent un seul mot */
function joinCents(text: string): string {
	return text.replace(/(\d)\s+c\b/gi, '$1c');
}

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
	return findMonnaieBlockSpans(lines).map(({ startIndex, endIndex }) => ({
		startIndex,
		endIndex
	}));
}

/**
 * Les mêmes blocs, avec leur fermeture : `endIndex` est la fence de fin d'un bloc
 * fermé, la dernière ligne d'un bloc non fermé
 */
export function findMonnaieBlockSpans(
	lines: string[]
): (MonnaieBlockRange & { closed: boolean })[] {
	const blocks: (MonnaieBlockRange & { closed: boolean })[] = [];
	let i = 0;
	while (i < lines.length) {
		if (isMonnaieBlockStart(lines[i])) {
			const { endIndex, closed } = specialBlockEnd(
				lines,
				i,
				(line) => BLOCK_END_REGEX.test(line),
				BLOCK_KEYS
			);
			blocks.push({ startIndex: i, endIndex, closed });
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

/** Une coupure écrite (`10`, `10€`, `50c`) : sa valeur en euros, vérifiée du bon genre */
function readDenomination(raw: string, kind: 'billets' | 'pièces' | 'réserve'): number {
	const cents = readAmount(raw);
	if (cents === null) {
		throw new LineError(`« ${raw} » : écris la valeur en euros ou en centimes, ex. ${kind}: 10 5`);
	}
	const value = fromCents(cents);
	const isNote = (MONNAIE_NOTES as readonly number[]).includes(value);
	const isCoin = (MONNAIE_COINS as readonly number[]).includes(value);
	const label = isCents(value) ? denominationLabel(value) : amountWords(cents);
	if (kind === 'billets' && isCoin) {
		throw new LineError(
			`${label} est une pièce : écris-la dans pièces: (forme comptée : quantité d'abord, ex. 3×2)`
		);
	}
	if (kind === 'pièces' && isNote) {
		// `pièces: 5` : l'auteur voulait peut-être 5 centimes (revue M2)
		const centsCoin = (MONNAIE_COINS as readonly number[]).includes(fromCents(value));
		throw new LineError(
			`${label} est un billet : écris-le dans billets: (forme comptée : quantité d'abord, ex. 2×10)` +
				(centsCoin ? ` ; pour ${value} centimes, écris ${value}c` : '')
		);
	}
	if (!isNote && !isCoin) throw new LineError(`${label} n'existe pas (${EXISTING})`);
	return value;
}

/**
 * Les coupures d'une ligne `billets:` ou `pièces:`, par ensemble, de la plus
 * grande à la plus petite : `20 10 10`, `2×10 1×20`, `{{n}}×2 1`.
 */
function parseDenominations(value: string, kind: 'billets' | 'pièces'): number[][] {
	return splitSets(value).map((part) => {
		const tokens = joinCents(part)
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

/** Des montants `48 ; 3,45 ; 60c`, chacun de 0 à 1 000 €, en euros */
function parseAmounts(value: string): number[] {
	return splitSets(value).map((part) => {
		const cents = readAmount(part);
		if (cents === null && FRACTION_REGEX.test(part)) {
			throw new LineError(`montant « ${part} » : ${FRACTION_HINT}`);
		}
		if (cents === null) {
			throw new LineError(
				`montant « ${part} » : écris un montant en euros et centimes, ex. 3,45 ou 3 € 45 c (2 chiffres après la virgule au plus)`
			);
		}
		if (cents > MAX_CENTS) {
			throw new LineError(`montant « ${part} » : de 0 à ${amountWords(MAX_CENTS)} au plus`);
		}
		return fromCents(cents);
	});
}

/** Coupures permises (`réserve: 1 2 5 10`) : existantes, une fois chacune, de la plus grande à la plus petite */
function parseReserve(value: string): number[] {
	const tokens = joinCents(value)
		.split(/\s+/)
		.filter((token) => token !== '' && token !== '€');
	if (tokens.length === 0) {
		throw new LineError('réserve vide : écris les coupures permises, ex. réserve: 1 2 5 10');
	}
	const values: number[] = [];
	for (const token of tokens) {
		const denomination = readDenomination(token, 'réserve');
		if (values.includes(denomination)) {
			throw new LineError(`réserve : ${denominationLabel(denomination)} écrit deux fois`);
		}
		values.push(denomination);
	}
	return values.sort((a, b) => b - a);
}

/** Somme à construire, de 1 c à 1 000 €, en euros */
function parseBuild(value: string): number {
	const cents = readAmount(value);
	if (cents === null && FRACTION_REGEX.test(value)) {
		throw new LineError(`construire « ${value} » : ${FRACTION_HINT}`);
	}
	const { min, max } = MONNAIE_BUILD_RANGE;
	if (cents === null || cents < toCents(min) || cents > toCents(max)) {
		throw new LineError(
			`construire « ${value} » : écris une somme de ${amountWords(toCents(min))} à ${amountWords(toCents(max))}, ex. 35 ou 3,45`
		);
	}
	return fromCents(cents);
}

/**
 * Réserve d'un `construire:` sans `réserve:` : 1 à 50 €, plus les six pièces de
 * centimes si la somme en a (décision 5). Somme masquée (évaluation notée) : celle
 * d'aujourd'hui, l'énoncé masqué écrit sa réserve s'il le faut (`masked-statement.ts`).
 */
export function defaultReserve(build: number | undefined): number[] {
	const withCents = build !== undefined && toCents(build) % 100 !== 0;
	return withCents ? [...DEFAULT_RESERVE, ...MONNAIE_CENT_COINS] : [...DEFAULT_RESERVE];
}

/** `montant:` (en euros) → les coupures « le moins d'objets » (méthode gloutonne, exacte pour l'euro) */
export function decomposeAmount(amount: number): MonnaieSet {
	const notes: number[] = [];
	const coins: number[] = [];
	let rest = toCents(amount);
	for (const value of DENOMINATIONS) {
		const cents = toCents(value);
		while (rest >= cents) {
			((MONNAIE_NOTES as readonly number[]).includes(value) ? notes : coins).push(value);
			rest -= cents;
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
	let build: number | undefined;
	let masked = false;
	let reserve: number[] | undefined;
	let caseIndex: number | undefined;
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
			fail(
				lineNo,
				`clé « ${match[1]} » inconnue (clés possibles : ${KEY_NAMES.filter((k) => k !== 'case').join(', ')})`
			);
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
				case 'construire':
					// Énoncé d'une évaluation notée : remplacée par la plus petite coupure (`masked-value.ts`)
					masked = isMaskedValue(value);
					build = masked ? 0 : parseBuild(value);
					break;
				case 'réserve':
					reserve = parseReserve(value);
					break;
				case 'case':
					if (!INTEGER_REGEX.test(value)) {
						throw new LineError(`case « ${value} » : numéro de case entier`);
					}
					caseIndex = Number(value);
					break;
			}
		} catch (e) {
			if (!(e instanceof LineError)) throw e;
			fail(lineNo, e.message);
		}
	});

	// Bloc à construire : plan vide, aucun ensemble dessiné (lues dans le forEach :
	// TS les croit encore à leur valeur initiale)
	const writtenBuild = masked ? undefined : (build as number | undefined);
	const readReserve = (reserve as number[] | undefined) ?? defaultReserve(writtenBuild);
	const readBuild = masked ? Math.min(...readReserve) : writtenBuild;
	const readCase = caseIndex as number | undefined;
	const buildLine = seen.get('construire');
	if (buildLine !== undefined) {
		for (const [key, why] of Object.entries(NOT_WITH_BUILD) as [Key, string][]) {
			const line = seen.get(key);
			if (line !== undefined) fail(line, `${key} : sans objet avec construire:${why}`);
		}
		if (errors.length === 0 && readBuild !== undefined && !masked) {
			const objects = fewestObjects(readBuild, readReserve);
			const listed = `(${denominationList(readReserve)})`;
			const sum = amountWords(toCents(readBuild));
			if (objects === Infinity) {
				fail(buildLine, `${sum} ne se fait pas avec la réserve ${listed}`);
			} else if (objects > MONNAIE_LIMITS.objects) {
				fail(
					buildLine,
					`${sum} demande plus de ${MONNAIE_LIMITS.objects} objets avec la réserve ${listed}`
				);
			}
		}
		if (errors.length > 0 || readBuild === undefined) {
			return { type: 'monnaie', source, spec: null, errors };
		}
		return {
			type: 'monnaie',
			source,
			spec: {
				sets: [],
				captions: null,
				layout: 'rangé',
				sizeCm,
				build: readBuild,
				reserve: readReserve
			},
			errors,
			...(readCase !== undefined && { caseIndex: readCase })
		};
	}
	for (const key of ['réserve', 'case'] as const) {
		const line = seen.get(key);
		if (line !== undefined) fail(line, `${key}: sans objet sans construire:`);
	}

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
				const total = [...set.notes, ...set.coins].reduce((sum, v) => sum + toCents(v), 0);
				const objects = set.notes.length + set.coins.length;
				if (total > MAX_CENTS) {
					fail(line, `${amountWords(total)}${where} : ${amountWords(MAX_CENTS)} au plus`);
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
 * Un texte contient-il un bloc ```monnaie à construire (en retrait ou cité
 * compris : le générateur dira qu'il doit être au premier niveau) ?
 */
export function hasMonnaieToBuild(markdown: string): boolean {
	return findBuildMonnaies(markdown).length > 0;
}

/**
 * Blocs ```monnaie à construire d'un texte, délimités comme le parseur (une
 * ligne vide suivie d'une clé reste dans un bloc fermé, Q66) ; en retrait ou
 * cités compris (`nested`) : le générateur les refuse.
 */
export function findBuildMonnaies(markdown: string): {
	startIndex: number;
	body: string[];
	closed: boolean;
	nested: boolean;
}[] {
	const lines = markdown.split('\n');
	const plain = lines.map(unnestedLine);
	return findMonnaieBlockSpans(plain).flatMap(({ startIndex, endIndex, closed }) => {
		const body = plain.slice(startIndex + 1, closed ? endIndex : endIndex + 1);
		if (!body.some((line) => /^construire\s*:/i.test(line))) return [];
		return [{ startIndex, body, closed, nested: lines[startIndex] !== plain[startIndex] }];
	});
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
