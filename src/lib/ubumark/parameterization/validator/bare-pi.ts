/**
 * `pi` nu dans les calculs d'un modèle
 * ====================================
 *
 * Le parseur maison lit `pi` comme p × i (les lettres grecques s'écrivent `\pi`,
 * comme `\alpha`). Les calculs d'un modèle — `{{eval:…}}`, `conditions`, expressions de
 * variables `eval:…`, condition `{{if:…}}` du bon choix d'un QCM — lisaient pourtant `pi`
 * comme π
 * (tolérance `BARE_PI`, du 2026-10-02 au chantier lecture-grandeurs). Ils sont
 * désormais refusés ; ce module les repère, les réécrit `\pi` sans changer la valeur
 * calculée, et rédige le refus.
 *
 * Seul un `pi` ISOLÉ compte : ni au sein d'un mot (`pin`, `api`, `pièce`), ni après
 * un antislash (`\pi` est déjà la constante).
 */

// ============================================================================
// TYPES
// ============================================================================

/** Un calcul qui contient `pi` nu, avec sa place dans le modèle */
export interface BarePiOccurrence {
	/** Chemin du champ (`variations[0].variables[2].expression`) */
	path: string;
	/** Le champ tel qu'écrit (texte qui contient le `{{eval:…}}`, condition, expression) */
	calculation: string;
	/** Nombre de `pi` nus dans ce calcul */
	count: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** `pi` isolé, hors mot (lettres accentuées comprises) et hors `\pi` */
export const BARE_PI = /(?<![\p{L}\\])pi(?!\p{L})/gu;

const EVAL_OPEN = '{{eval:';
/** Bon choix d'un QCM par condition, la forme que lit `resolveConditionalChoice` */
const CONDITIONAL_CHOICE = /^\{\{if:(.+)\|([^|{}]*)\|([^|{}]*)\}\}$/;

// ============================================================================
// FUNCTIONS
// ============================================================================

/** Nombre de `pi` nus d'un calcul */
export function countBarePi(calculation: string): number {
	return calculation.match(BARE_PI)?.length ?? 0;
}

/**
 * Raison du refus d'un calcul qui écrit `pi` nu (`{{eval:…}}`, condition), `undefined`
 * sinon. Lu p × i, il donnerait une valeur fausse sans erreur dès que p est tirée.
 */
export function barePiRefusal(calculation: string): string | undefined {
	if (countBarePi(calculation) === 0) return undefined;
	return `« ${calculation} » : « pi » sans antislash se lit p × i ; écris \\pi pour la constante π, ou p*i pour le produit`;
}

/** Indice de la fin (exclue) du jeton `{{…}}` ouvert en `start`, accolades équilibrées */
function tokenEnd(text: string, start: number): number {
	let depth = 0;
	for (let at = start; at < text.length; at++) {
		if (text[at] === '{') depth++;
		else if (text[at] === '}') {
			depth--;
			if (depth === 0) return at + 1;
		}
	}
	// Non fermé : tout le reste, plus les deux accolades que l'appelant retire
	return text.length + 2;
}

/**
 * Plages de calcul d'un texte d'auteur : contenu des `{{eval:…}}`. La condition d'un
 * `{{if:…}}` d'énoncé ou de corrigé n'en est pas une : `pi` n'y a jamais été π (nom
 * inconnu, la condition est laissée au navigateur ou refusée en mode strict). Seul le
 * bon choix d'un QCM la calcule (`conditionalChoiceRange`).
 */
function calculationRanges(text: string): [number, number][] {
	const ranges: [number, number][] = [];
	let at = text.indexOf(EVAL_OPEN);
	while (at !== -1) {
		ranges.push([at + EVAL_OPEN.length, tokenEnd(text, at) - 2]);
		at = text.indexOf(EVAL_OPEN, at + 1);
	}
	return ranges;
}

/** Le texte avec chaque `pi` nu des plages réécrit `\pi`, et le nombre de réécritures */
function rewriteRanges(text: string, ranges: [number, number][]): { text: string; count: number } {
	const marks = new Set<number>();
	for (const [from, to] of ranges) {
		for (const match of text.slice(from, to).matchAll(BARE_PI)) marks.add(from + match.index);
	}
	if (marks.size === 0) return { text, count: 0 };
	let result = '';
	for (let at = 0; at < text.length; at++) result += marks.has(at) ? '\\' + text[at] : text[at];
	return { text: result, count: marks.size };
}

/**
 * Champ lu ENTIER comme un calcul : condition de `conditions`, expression de variable
 * `eval:…` (une liste ou un texte, `{{pi|e}}`, reste du texte : seuls ses `{{eval:…}}`).
 */
function isWholeCalculation(path: string[], value: string): boolean {
	const key = path.at(-1);
	const parent = path.at(-2);
	return (
		(parent === 'conditions' && /^\d+$/.test(key ?? '')) ||
		(key === 'expression' && path.at(-3) === 'variables' && value.trimStart().startsWith('eval:'))
	);
}

/** Condition d'un bon choix de QCM `{{if:condition|A|B}}` (`correctChoiceIndex`) */
function conditionalChoiceRange(path: string[], value: string): [number, number] | undefined {
	if (!path.includes('correctChoiceIndex')) return undefined;
	const match = CONDITIONAL_CHOICE.exec(value.trim());
	if (!match) return undefined;
	const from = value.indexOf('{{if:') + '{{if:'.length;
	return [from, from + match[1].length];
}

function displayPath(path: string[]): string {
	return path.reduce(
		(acc, key) => (/^\d+$/.test(key) ? `${acc}[${key}]` : acc ? `${acc}.${key}` : key),
		''
	);
}

/** Parcourt une valeur JSON et réécrit ses calculs ; `occurrences` reçoit ce qui change */
function walk(value: unknown, path: string[], occurrences: BarePiOccurrence[]): unknown {
	if (typeof value === 'string') {
		const choice = conditionalChoiceRange(path, value);
		const ranges: [number, number][] = isWholeCalculation(path, value)
			? [[0, value.length]]
			: [...calculationRanges(value), ...(choice ? [choice] : [])];
		const { text, count } = rewriteRanges(value, ranges);
		if (count > 0) occurrences.push({ path: displayPath(path), calculation: value, count });
		return text;
	}
	if (Array.isArray(value))
		return value.map((item, i) => walk(item, [...path, String(i)], occurrences));
	if (value !== null && typeof value === 'object') {
		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => [key, walk(item, [...path, key], occurrences)])
		);
	}
	return value;
}

/**
 * Les calculs d'une valeur JSON (modèle, variation, `shared`…) qui contiennent `pi`
 * nu, et la même valeur où chacun est réécrit `\pi`. Les noms de champs suivent le
 * modèle en camelCase comme en base (`variables[].expression`, `conditions[]`).
 */
export function rewriteBarePi<T>(value: T): { value: T; occurrences: BarePiOccurrence[] } {
	const occurrences: BarePiOccurrence[] = [];
	const rewritten = walk(value, [], occurrences) as T;
	return { value: rewritten, occurrences };
}
