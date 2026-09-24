/**
 * Unit System - Student Input Normalization
 * ==========================================
 *
 * Ramène la saisie MathLive d'un élève, pour un trou À UNITÉ, à la forme
 * canonique `valeur\unit{écriture}` que lit `parseLatexQuantity`.
 *
 * Aucun champ élève ne produit `\unit{...}` : MathLive écrit `5\operatorname{\mathrm{km}}`,
 * `\frac{90\operatorname{\mathrm{km}}}{h}`, `20\degree C`, `5\min`, `3m.s^{-1}`…
 * (chaînes mesurées le 2026-09-24, cf. le test `student-quantity-input.test.ts`).
 *
 * Découpage volontairement simple :
 *   1. une tête numérique (signe, chiffres, virgule ou point décimal, fraction
 *      de nombres, notation scientifique `a\cdot10^{n}`) ;
 *   2. le reste est l'écriture de l'unité, nettoyée de ses habillages LaTeX.
 * C'est `parseUnitExpression` (règle unique, `docs/ref/notation-unites.md`) qui
 * décide ensuite si l'écriture est une unité : rien n'est deviné ici. `5ms`
 * reste la milliseconde, `5xyz` devient `5\unit{xyz}`, refusé par le parseur.
 *
 * ⚠️ À n'appliquer qu'à la réponse ÉLÈVE d'un trou à unité : dans un trou
 * algébrique, `5km` est le produit 5·k·m.
 *
 * @module questions/units/student-input
 */

// ============================================================================
// CONSTANTES
// ============================================================================

/** Commandes dont on ne garde que le contenu : `\operatorname{\mathrm{km}}` → `km` */
const WRAPPER_COMMANDS = ['operatorname', 'mathrm', 'text', 'textrm', 'mathit', 'textit'];

/** Commandes d'espacement LaTeX, remplacées par une espace ordinaire */
const SPACING_PATTERN =
	/\\(?:qquad|quad|enspace|thinspace|medspace|thickspace|negthinspace|[,;:>! ])|~/g;

/** Degré : `^{\circ}`, `^\circ`, `\degree`, `\circ` → `°` */
const DEGREE_PATTERN =
	/\^\s*\{\s*\\circ\s*\}|\^\s*\\circ(?![A-Za-z])|\\degree(?![A-Za-z])|\\circ(?![A-Za-z])/g;

/**
 * Tête numérique : signe, entier ou décimal (virgule ou point), puis
 * éventuellement `\cdot 10^{n}` / `\times 10^{n}` (notation scientifique).
 */
// Milliers séparés par une espace (`12 500`, après remplacement de `\,`) avant
// l'entier nu : sinon `12\,500 m` se coupait après 12 (« Unité inconnue : 500 m »)
const NUMBER_SOURCE = String.raw`[+-]?(?:\d{1,3}(?: \d{3})+|\d+)(?:[.,]\d+)?`;
const SCIENTIFIC_SOURCE = String.raw`\s*(?:\\cdot|\\times)\s*10\^(?:\{[+-]?\d+\}|[+-]?\d)`;
const NUMERIC_HEAD = new RegExp(String.raw`^\s*(${NUMBER_SOURCE}(?:${SCIENTIFIC_SOURCE})?)`);

/** Tête en fraction de nombres : `\frac{3}{2}` */
const FRACTION_HEAD = new RegExp(
	String.raw`^\s*([+-]?\\frac\{\s*${NUMBER_SOURCE}\s*\}\{\s*${NUMBER_SOURCE}\s*\})`
);

/** Caractères qui signalent qu'une unité a été tapée (sinon : saisie laissée telle quelle) */
const UNIT_CHARACTER = /[A-Za-z°€$Ωμ]/;

// ============================================================================
// ACCOLADES
// ============================================================================

/**
 * Lit un groupe `{...}` équilibré qui commence à `start` (qui doit être `{`).
 * Retourne son contenu et l'indice qui suit l'accolade fermante, ou null.
 */
function readGroup(str: string, start: number): { content: string; end: number } | null {
	if (str[start] !== '{') return null;
	let depth = 0;
	for (let i = start; i < str.length; i++) {
		if (str[i] === '{') depth++;
		else if (str[i] === '}') {
			depth--;
			if (depth === 0) return { content: str.slice(start + 1, i), end: i + 1 };
		}
	}
	return null;
}

/**
 * Remplace `\cmd{contenu}` par `contenu` pour les commandes d'habillage,
 * accolades imbriquées comprises (`\operatorname{\mathrm{km}}`).
 */
function unwrapCommands(str: string): string {
	const pattern = new RegExp(String.raw`\\(?:${WRAPPER_COMMANDS.join('|')})(?![A-Za-z])\s*`);
	let result = str;
	let match = pattern.exec(result);
	// Un habillage à la fois, en reprenant du début : les groupes imbriqués se déplient
	while (match !== null) {
		const group = readGroup(result, match.index + match[0].length);
		if (!group) break;
		// Une espace de chaque côté : `\mathrm{m}\cdot\mathrm{s}` ne doit pas se
		// recoller en `m\cdots` (commande inconnue)
		result = result.slice(0, match.index) + ` ${group.content} ` + result.slice(group.end);
		match = pattern.exec(result);
	}
	return result;
}

/**
 * Si `str` est exactement `\frac{A}{B}`, retourne A et B ; sinon null.
 */
function splitWholeFraction(str: string): { numerator: string; denominator: string } | null {
	const trimmed = str.trim();
	if (!trimmed.startsWith('\\frac')) return null;
	const numerator = readGroup(trimmed, '\\frac'.length);
	if (!numerator) return null;
	const denominator = readGroup(trimmed, numerator.end);
	if (!denominator || denominator.end !== trimmed.length) return null;
	return { numerator: numerator.content, denominator: denominator.content };
}

// ============================================================================
// ÉCRITURE DE L'UNITÉ
// ============================================================================

/**
 * Nettoie l'écriture d'une unité : produits `\cdot`/`\times` → `.`, espaces
 * autour des opérateurs retirées, `\frac{u}{v}` → `u/v`.
 *
 * Les espaces restantes à l'INTÉRIEUR de l'unité sont conservées : le parseur
 * les refuse (`m s` n'est ni `m.s` ni `ms`).
 */
function cleanUnitWriting(writing: string): string {
	const fraction = splitWholeFraction(writing);
	if (fraction) {
		const numerator = cleanUnitWriting(fraction.numerator);
		const denominator = cleanUnitWriting(fraction.denominator);
		// Un produit au dénominateur se met entre parenthèses : kg/(m.s)
		const wrapped = /[.*]/.test(denominator) ? `(${denominator})` : denominator;
		return `${numerator}/${wrapped}`;
	}

	return writing
		.replace(/\\(?:cdot|times)(?![A-Za-z])/g, '.')
		.replace(/\s*([./*^])\s*/g, '$1')
		.trim();
}

// ============================================================================
// FONCTION PRINCIPALE
// ============================================================================

/** Une saisie découpée : tête numérique (telle que tapée, espaces comprises) et unité */
interface StudentQuantityParts {
	head: string;
	writing: string;
}

/**
 * Découpe la saisie d'un élève (trou à unité) en tête numérique et écriture
 * d'unité nettoyée ; null si ce n'est pas un nombre suivi d'une unité.
 */
function splitStudentQuantity(latex: string): StudentQuantityParts | null {
	// Habillages et notations sans ambiguïté
	const cleaned = unwrapCommands(latex)
		.replace(/\{,\}/g, ',')
		// Groupe vide : support du degré (`{}^{\circ}`, forme affichée de °) ou
		// séparateur anti-espacement (`1{}000`) ; il ne porte aucun sens
		.replace(/\{\s*\}/g, '')
		.replace(/\\min(?![A-Za-z])/g, 'min')
		.replace(/\\euro(?![A-Za-z])/g, '€')
		.replace(DEGREE_PATTERN, '°')
		.replace(SPACING_PATTERN, ' ')
		.replace(/°\s+/g, '°')
		.replace(/ {2,}/g, ' ')
		.trim();

	// MathLive range le nombre DANS le numérateur : \frac{90km}{h} = 90 km/h
	const fraction = splitWholeFraction(cleaned);
	if (fraction) {
		const numeratorHead = fraction.numerator.trim().match(NUMERIC_HEAD);
		if (numeratorHead) {
			const numeratorUnit = fraction.numerator.trim().slice(numeratorHead[0].length).trim();
			if (UNIT_CHARACTER.test(numeratorUnit)) {
				return {
					head: numeratorHead[1].trim(),
					writing: cleanUnitWriting(`\\frac{${numeratorUnit}}{${fraction.denominator}}`)
				};
			}
		}
	}

	const head = cleaned.match(FRACTION_HEAD) ?? cleaned.match(NUMERIC_HEAD);
	if (!head) return null;

	const rest = cleaned.slice(head[0].length).trim();
	if (!UNIT_CHARACTER.test(rest)) return null;

	return { head: head[1].trim(), writing: cleanUnitWriting(rest) };
}

/**
 * Ramène la saisie LaTeX d'un élève (trou à unité) à `valeur\unit{écriture}`.
 *
 * Contrat :
 * - déjà canonique (contient `\unit{`) → rendue telle quelle (espaces de bord retirées) ;
 * - pas de tête numérique, ou rien qui ressemble à une unité après elle
 *   (`5`, `2+3`, `x`) → rendue telle quelle (sans dimension pour le parseur) ;
 * - sinon → `valeur\unit{écriture}`, la valeur en écriture simple (`12500`,
 *   `2,5` : ce que lit `parseLatexQuantity`), l'écriture nettoyée mais jamais
 *   réinterprétée : c'est `parseLatexQuantity` qui accepte ou refuse.
 *
 * @example
 * normalizeStudentQuantity('5\\operatorname{\\mathrm{km}}') // '5\\unit{km}'
 * normalizeStudentQuantity('\\frac{90\\operatorname{\\mathrm{km}}}{h}') // '90\\unit{km/h}'
 * normalizeStudentQuantity('12\\,500\\,\\mathrm{m}') // '12500\\unit{m}'
 * normalizeStudentQuantity('5ms') // '5\\unit{ms}' (milliseconde)
 */
export function normalizeStudentQuantity(latex: string): string {
	if (typeof latex !== 'string') return latex;
	const original = latex.trim();
	if (original === '' || original.includes('\\unit{')) return original;

	const parts = splitStudentQuantity(original);
	if (!parts) return original;
	return `${parts.head.replace(/ /g, '')}\\unit{${parts.writing}}`;
}

/**
 * La partie numérique de la saisie d'un élève (trou à unité), en LaTeX, pour
 * le contrôle de FORME : `2{,}5`, `12\\,500` — et non `2,5` ou `12500`, que le
 * contrôle de forme refuse ou juge mal espacés. Null si la saisie n'est pas un
 * nombre suivi d'une unité (l'appelant garde alors son propre découpage).
 */
export function studentNumericLatex(latex: string): string | null {
	if (typeof latex !== 'string' || latex.includes('\\unit{')) return null;
	const parts = splitStudentQuantity(latex.trim());
	if (!parts) return null;
	return parts.head.replace(/,/g, '{,}').replace(/ /g, '\\,');
}
