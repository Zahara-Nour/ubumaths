/**
 * Lecture en français d'une formule, pour les lecteurs d'écran (E32)
 *
 * MathLive ne sait lire une formule qu'en anglais. Ce module écrit le texte
 * qu'un élève entend : « pi sur 12 », « x au carré », « racine carrée de 2 ».
 *
 * Règle des tournures (validée par David le 2026-11-24) : une forme simple se
 * dit d'un trait (« 3 sur 4 ») ; une forme composée annonce son début et sa fin
 * (« fraction, x plus 1, sur, x moins 2, fin de fraction »), sinon on ne sait
 * plus où elle s'arrête. Un symbole inconnu est dit par son nom.
 *
 * Fonction pure : ni DOM ni MathLive.
 *
 * @module utils/formula-speech/french
 */

import { parseLatexForSpeech, type FormulaNode } from './latex-tree.ts';

// Types
/** Un mot à dire, ou une pause (virgule à l'écrit) */
type Spoken = string | typeof PAUSE;

// Constantes
/** Objet et non `Symbol` : dans un tableau, TypeScript élargit un symbole en `symbol` */
const PAUSE = { pause: true } as const;

/** Caractères et commandes sans argument : ce qui se dit */
const WORDS: Record<string, string> = {
	'+': 'plus',
	'-': 'moins',
	'−': 'moins',
	'*': 'fois',
	'×': 'fois',
	'\\times': 'fois',
	'\\cdot': 'fois',
	'÷': 'divisé par',
	'/': 'sur',
	'\\div': 'divisé par',
	'=': 'égale',
	'<': 'inférieur à',
	'>': 'supérieur à',
	'\\lt': 'inférieur à',
	'\\gt': 'supérieur à',
	'≤': 'inférieur ou égal à',
	'≥': 'supérieur ou égal à',
	'\\le': 'inférieur ou égal à',
	'\\leq': 'inférieur ou égal à',
	'\\leqslant': 'inférieur ou égal à',
	'\\ge': 'supérieur ou égal à',
	'\\geq': 'supérieur ou égal à',
	'\\geqslant': 'supérieur ou égal à',
	'≠': 'différent de',
	'\\neq': 'différent de',
	'\\ne': 'différent de',
	'≈': 'environ égal à',
	'\\approx': 'environ égal à',
	'\\simeq': 'environ égal à',
	'\\equiv': 'congru à',
	'\\sim': 'suit',
	'\\propto': 'proportionnel à',
	'\\pm': 'plus ou moins',
	'\\mp': 'moins ou plus',
	'±': 'plus ou moins',
	'\\iff': 'équivaut à',
	'\\Leftrightarrow': 'équivaut à',
	'\\Longleftrightarrow': 'équivaut à',
	'\\lrArr': 'équivaut à',
	'\\leftrightarrow': 'équivaut à',
	'\\Rightarrow': 'implique',
	'\\Longrightarrow': 'implique',
	'\\implies': 'implique',
	'\\Leftarrow': 'est impliqué par',
	'\\to': 'tend vers',
	'\\rightarrow': 'flèche vers la droite',
	'\\longrightarrow': 'flèche vers la droite',
	'\\leftarrow': 'flèche vers la gauche',
	'\\uparrow': 'flèche vers le haut',
	'\\downarrow': 'flèche vers le bas',
	'\\nearrow': 'flèche montante',
	'\\searrow': 'flèche descendante',
	'\\mapsto': 'a pour image',
	'\\in': 'appartient à',
	'∈': 'appartient à',
	'\\notin': 'n’appartient pas à',
	'\\ni': 'contient',
	'\\subset': 'inclus dans',
	'\\subseteq': 'inclus dans',
	'\\cup': 'union',
	'\\cap': 'inter',
	'\\setminus': 'privé de',
	'\\backslash': 'privé de',
	'\\varnothing': 'ensemble vide',
	'\\emptyset': 'ensemble vide',
	'\\forall': 'pour tout',
	'\\exists': 'il existe',
	'\\neg': 'non',
	'\\not': 'non',
	'\\land': 'et',
	'\\lor': 'ou',
	'\\perp': 'perpendiculaire à',
	'\\parallel': 'parallèle à',
	'\\infty': 'l’infini',
	'∞': 'l’infini',
	'\\circ': 'rond',
	'\\degree': 'degrés',
	'°': 'degrés',
	'\\%': 'pour cent',
	'%': 'pour cent',
	'\\prime': 'prime',
	'!': 'factorielle',
	',': 'virgule',
	';': 'point-virgule',
	':': 'deux-points',
	'\\colon': 'deux-points',
	'.': 'point',
	'?': 'point d’interrogation',
	'|': 'barre verticale',
	'\\vert': 'barre verticale',
	'\\mid': 'sachant',
	'\\lvert': 'valeur absolue de',
	'\\rvert': 'fin de valeur absolue',
	'\\|': 'double barre',
	'\\Vert': 'double barre',
	'\\lVert': 'double barre',
	'\\rVert': 'double barre',
	'\\{': 'ouvrir l’accolade',
	'\\}': 'fermer l’accolade',
	'\\lbrace': 'ouvrir l’accolade',
	'\\rbrace': 'fermer l’accolade',
	'\\lbrack': 'ouvrir le crochet',
	'\\rbrack': 'fermer le crochet',
	'\\langle': 'ouvrir le chevron',
	'\\rangle': 'fermer le chevron',
	'\\ldots': 'points de suspension',
	'\\cdots': 'points de suspension',
	'\\dots': 'points de suspension',
	'\\vdots': 'points de suspension',
	'…': 'points de suspension',
	'\\ell': 'l',
	'\\exponentialE': 'e',
	'\\imaginaryI': 'i',
	'\\differentialD': 'd',
	'\\partial': 'd rond',
	'\\nabla': 'nabla',
	'\\square': 'carré',
	'\\triangle': 'triangle',
	'\\angle': 'angle',
	'\\star': 'étoile',
	'\\ast': 'fois',
	'\\bullet': 'point',
	'\\$': 'dollar',
	'\\&': 'et',
	'\\#': 'dièse',
	'\\_': 'tiret bas',
	'€': 'euros',
	'\\euro': 'euros',
	'\\\\': '',
	// Lettres grecques
	'\\alpha': 'alpha',
	'\\beta': 'bêta',
	'\\gamma': 'gamma',
	'\\Gamma': 'gamma',
	'\\delta': 'delta',
	'\\Delta': 'delta',
	'\\epsilon': 'epsilon',
	'\\varepsilon': 'epsilon',
	'\\zeta': 'zêta',
	'\\eta': 'êta',
	'\\theta': 'thêta',
	'\\Theta': 'thêta',
	'\\vartheta': 'thêta',
	'\\iota': 'iota',
	'\\kappa': 'kappa',
	'\\lambda': 'lambda',
	'\\Lambda': 'lambda',
	'\\mu': 'mu',
	'\\nu': 'nu',
	'\\xi': 'xi',
	'\\pi': 'pi',
	π: 'pi',
	'\\Pi': 'pi',
	'\\rho': 'rhô',
	'\\sigma': 'sigma',
	'\\Sigma': 'sigma',
	'\\tau': 'tau',
	'\\phi': 'phi',
	'\\varphi': 'phi',
	'\\Phi': 'phi',
	'\\chi': 'khi',
	'\\psi': 'psi',
	'\\Psi': 'psi',
	'\\omega': 'oméga',
	'\\Omega': 'oméga',
	// Ensembles de nombres écrits d'une commande
	'\\N': 'N',
	'\\Z': 'Z',
	'\\Q': 'Q',
	'\\R': 'R',
	'\\C': 'C',
	'\\D': 'D'
};

/** Fonctions nommées : suivies d'une parenthèse, elles se disent « … de » */
const NAMED_FUNCTIONS: Record<string, string> = {
	'\\ln': 'logarithme népérien',
	'\\log': 'logarithme',
	'\\exp': 'exponentielle',
	'\\cos': 'cosinus',
	'\\sin': 'sinus',
	'\\tan': 'tangente',
	'\\cosh': 'cosinus hyperbolique',
	'\\sinh': 'sinus hyperbolique',
	'\\tanh': 'tangente hyperbolique',
	'\\arccos': 'arc cosinus',
	'\\arcsin': 'arc sinus',
	'\\arctan': 'arc tangente',
	'\\min': 'minimum',
	'\\max': 'maximum',
	'\\det': 'déterminant',
	'\\gcd': 'PGCD',
	'\\lim': 'limite'
};

/** Lettres qui nomment d'ordinaire une fonction : `f(x)` se dit « f de x » */
const FUNCTION_LETTERS = new Set(['f', 'g', 'h', 'F', 'G', 'H', 'P', 'u', 'v']);

const BIG_OPERATORS = new Set(['\\lim', '\\sum', '\\prod', '\\int']);

const PRIMES = ['', 'prime', 'seconde', 'tierce'];

/** `1^{er}`, `2^{nde}` : un rang, pas une puissance */
const ORDINAL_SUFFIXES = new Set([
	'er',
	're',
	'ère',
	'ere',
	'nd',
	'nde',
	'ème',
	'eme',
	'ième',
	'ieme'
]);

/**
 * Au-delà, la formule est rendue en texte brut : la lecture coûte au pire le
 * carré de la longueur (`f(f(f(…`), et ce code tourne sur toutes les pages.
 */
const MAX_SPOKEN_LENGTH = 4000;

/** Environnements qui alignent un calcul : les `&` ne séparent rien à l'oral */
const ALIGNED_ENVIRONMENTS = new Set([
	'aligned',
	'align',
	'split',
	'gather',
	'gathered',
	'alignedat'
]);

// Fonctions
function isSymbol(node: FormulaNode | undefined, ...values: string[]): boolean {
	return node?.kind === 'symbol' && values.includes(node.value);
}

function isMinus(node: FormulaNode | undefined): boolean {
	return isSymbol(node, '-', '−', '+');
}

/** Simple : un nombre, une lettre, un symbole, éventuellement signé — se dit d'un trait */
function isSimple(nodes: FormulaNode[]): boolean {
	if (nodes.length === 2 && isMinus(nodes[0])) return isSimple([nodes[1]]);
	if (nodes.length !== 1) return false;
	const [node] = nodes;
	if (node.kind === 'number' || node.kind === 'text') return true;
	if (node.kind === 'group') return isSimple(node.children);
	if (node.kind === 'symbol') return !['(', ')', '[', ']'].includes(node.value);
	return false;
}

/** Seulement des lettres : `\overline{AB}` se dit « A B barre » */
function isLetters(nodes: FormulaNode[]): boolean {
	return (
		nodes.length > 0 &&
		nodes.every((node) => node.kind === 'symbol' && /^[a-zA-Z]$/.test(node.value))
	);
}

function isVector(node: FormulaNode | undefined): boolean {
	return node?.kind === 'command' && (node.name === 'vec' || node.name === 'overrightarrow');
}

/** Une forme composée : son nom, son contenu entre deux pauses, puis sa fin */
function enclosed(opening: string, content: Spoken[], closing: string): Spoken[] {
	return [opening, PAUSE, ...content, PAUSE, closing, PAUSE];
}

function speakNumber(node: Extract<FormulaNode, { kind: 'number' }>): Spoken[] {
	return node.decimals === '' ? [node.integer] : [node.integer, 'virgule', node.decimals];
}

function speakSymbol(value: string): Spoken[] {
	if (value === '(') return [PAUSE, 'ouvrir la parenthèse', PAUSE];
	if (value === ')') return [PAUSE, 'fermer la parenthèse', PAUSE];
	if (value === '[') return [PAUSE, 'crochet ouvrant', PAUSE];
	if (value === ']') return [PAUSE, 'crochet fermant', PAUSE];
	if (value in NAMED_FUNCTIONS) return [NAMED_FUNCTIONS[value]];
	if (value in WORDS) return WORDS[value] === '' ? [PAUSE] : [WORDS[value]];
	// Commande inconnue : son nom, sans la contre-oblique
	return [value.startsWith('\\') ? value.slice(1) : value];
}

function speakFraction(numerator: FormulaNode[], denominator: FormulaNode[]): Spoken[] {
	const top = speakSequence(numerator);
	const bottom = speakSequence(denominator);
	if (isSimple(numerator) && isSimple(denominator)) return [...top, 'sur', ...bottom];
	return enclosed('fraction', [...top, PAUSE, 'sur', PAUSE, ...bottom], 'fin de fraction');
}

function speakRoot(index: FormulaNode[] | null, body: FormulaNode[]): Spoken[] {
	const spokenIndex = index ? toText(speakSequence(index)) : '2';
	const name =
		spokenIndex === '2' || spokenIndex === ''
			? 'racine carrée de'
			: spokenIndex === '3'
				? 'racine cubique de'
				: `racine ${spokenIndex}-ième de`;
	const content = speakSequence(body);
	return isSimple(body) ? [name, ...content] : enclosed(name, content, 'fin de racine');
}

function speakCommand(node: Extract<FormulaNode, { kind: 'command' }>): Spoken[] {
	const [first = [], second = []] = node.args;
	switch (node.name) {
		case 'frac':
		case 'dfrac':
		case 'tfrac':
		case 'cfrac':
			return speakFraction(first, second);
		case 'binom':
		case 'dbinom':
		case 'tbinom':
			return isSimple(first) && isSimple(second)
				? [...speakSequence(second), 'parmi', ...speakSequence(first)]
				: enclosed(
						'coefficient binomial',
						[...speakSequence(second), PAUSE, 'parmi', PAUSE, ...speakSequence(first)],
						'fin du coefficient'
					);
		case 'sqrt':
			return speakRoot(node.optional, first);
		case 'vec':
		case 'overrightarrow':
		case 'overleftarrow':
			return ['vecteur', ...speakSequence(first)];
		case 'widehat':
			return ['angle', ...speakSequence(first)];
		case 'overline':
		case 'bar':
			return isSimple(first) || isLetters(first)
				? [...speakSequence(first), 'barre']
				: enclosed('barre de', speakSequence(first), 'fin de barre');
		case 'hat':
			return [...speakSequence(first), 'chapeau'];
		case 'placeholder':
			return first.length > 0 ? speakSequence(first) : ['case à compléter'];
		case 'overset':
		case 'underset':
		case 'stackrel':
			return speakSequence(second);
		default:
			return speakSequence(first);
	}
}

function speakPower(sup: FormulaNode[]): Spoken[] {
	if (sup.length === 1 && isSymbol(sup[0], '\\circ', '°', '\\degree')) return ['degrés'];
	if (sup.length > 0 && sup.every((node) => isSymbol(node, '\\prime'))) {
		return [PRIMES[sup.length] ?? 'prime'];
	}
	// `\\mathbb{R}^*` : R étoile
	if (sup.length === 1 && isSymbol(sup[0], '*', '\\ast', '\\star')) return ['étoile'];
	// `0^+` : à droite de 0
	if (sup.length === 1 && isSymbol(sup[0], '+')) return ['plus'];
	if (sup.length === 1 && isSymbol(sup[0], '-', '−')) return ['moins'];
	const content = speakSequence(sup);
	const text = toText(content);
	if (text === '2') return ['au carré'];
	if (text === '3') return ['au cube'];
	return isSimple(sup)
		? ['puissance', ...content]
		: enclosed('puissance', content, 'fin de puissance');
}

function speakIndex(sub: FormulaNode[]): Spoken[] {
	// `\\mathbb{R}_+` : R plus
	if (sub.length === 1 && isSymbol(sub[0], '+')) return ['plus'];
	if (sub.length === 1 && isSymbol(sub[0], '-', '−')) return ['moins'];
	if (sub.length === 1 && isSymbol(sub[0], '*', '\\ast', '\\star')) return ['étoile'];
	const content = speakSequence(sub);
	return isSimple(sub) ? ['indice', ...content] : enclosed('indice', content, 'fin d’indice');
}

/** Limite, somme, produit, intégrale : leurs bornes font partie de la phrase */
function speakBigOperator(
	operator: string,
	sub: FormulaNode[] | null,
	sup: FormulaNode[] | null
): Spoken[] | null {
	// Seulement pour un grand opérateur : lues ici pour toute base, les bornes le seraient deux
	// fois par niveau d'exposant, soit 2^n lectures pour `x^{x^{x^{…}}}`
	if (!BIG_OPERATORS.has(operator)) return null;
	const from = sub ? speakSequence(sub) : null;
	const to = sup ? speakSequence(sup) : null;
	switch (operator) {
		case '\\lim':
			return from ? ['limite quand', ...from, 'de'] : ['limite de'];
		case '\\sum':
		case '\\prod': {
			const name = operator === '\\sum' ? 'somme' : 'produit';
			if (from && to) return [name, 'pour', ...from, 'jusqu’à', ...to, 'de'];
			return from ? [name, 'pour', ...from, 'de'] : [name, 'de'];
		}
		case '\\int':
			return from && to ? ['intégrale de', ...from, 'à', ...to, 'de'] : ['intégrale de'];
		default:
			return null;
	}
}

/** Suffixe d'un rang (`er` de `1^{er}`), ou `null` si l'exposant est une vraie puissance */
function ordinalSuffix(node: Extract<FormulaNode, { kind: 'scripts' }>): string | null {
	if (node.base?.kind !== 'number' || node.base.decimals !== '') return null;
	if (node.sub !== null || node.primes > 0 || node.sup === null) return null;
	const suffix = node.sup
		.map((part) => (part.kind === 'text' || part.kind === 'symbol' ? part.value.trim() : '\\'))
		.join('');
	return ORDINAL_SUFFIXES.has(suffix) ? suffix : null;
}

function speakScripts(node: Extract<FormulaNode, { kind: 'scripts' }>): Spoken[] {
	if (node.base?.kind === 'symbol') {
		const bigOperator = speakBigOperator(node.base.value, node.sub, node.sup);
		if (bigOperator) return bigOperator;
	}
	const ordinal = ordinalSuffix(node);
	if (ordinal !== null && node.base?.kind === 'number') return [`${node.base.integer}${ordinal}`];
	const spoken: Spoken[] = node.base ? speakNode(node.base) : [];
	if (node.primes > 0) spoken.push(PRIMES[node.primes] ?? 'prime');
	if (node.sub) spoken.push(...speakIndex(node.sub));
	if (node.sup) spoken.push(...speakPower(node.sup));
	return spoken;
}

function speakEnvironment(node: Extract<FormulaNode, { kind: 'environment' }>): Spoken[] {
	const aligned = ALIGNED_ENVIRONMENTS.has(node.name);
	const rows = node.rows.map((row) =>
		row.flatMap((cell, i) =>
			i > 0 && !aligned ? [PAUSE, ...speakSequence(cell)] : speakSequence(cell)
		)
	);
	const content = rows.flatMap((row, i) => (i > 0 ? [PAUSE, 'puis', PAUSE, ...row] : row));
	if (aligned) return [...content, PAUSE];
	if (node.name === 'cases') return enclosed('système', content, 'fin du système');
	return node.name.endsWith('matrix')
		? enclosed('matrice', content, 'fin de matrice')
		: enclosed('tableau', content, 'fin du tableau');
}

function speakNode(node: FormulaNode): Spoken[] {
	switch (node.kind) {
		case 'number':
			return speakNumber(node);
		case 'symbol':
			return speakSymbol(node.value);
		case 'text':
			return [node.value];
		case 'group':
			return speakSequence(node.children);
		case 'command':
			return speakCommand(node);
		case 'scripts':
			return speakScripts(node);
		case 'environment':
			return speakEnvironment(node);
	}
}

/** `f`, `f'`, `f_1`, `\ln` : ce qui, devant une parenthèse, se dit « … de » */
function isFunctionName(node: FormulaNode): boolean {
	if (node.kind === 'symbol')
		return FUNCTION_LETTERS.has(node.value) || node.value in NAMED_FUNCTIONS;
	if (node.kind === 'scripts' && node.base?.kind === 'symbol') {
		if (node.base.value in NAMED_FUNCTIONS) return node.sub === null;
		return (
			/^[a-zA-Z]$/.test(node.base.value) &&
			(node.primes > 0 || FUNCTION_LETTERS.has(node.base.value))
		);
	}
	return false;
}

/** Position de la parenthèse qui ferme celle ouverte en `start` ; -1 si elle manque */
function closingParenthesis(nodes: FormulaNode[], start: number): number {
	let level = 0;
	for (let i = start + 1; i < nodes.length; i += 1) {
		if (isSymbol(nodes[i], '(')) level += 1;
		else if (isSymbol(nodes[i], ')')) {
			if (level === 0) return i;
			level -= 1;
		}
	}
	return -1;
}

/** Position du premier crochet (ou de la parenthèse d'une demi-droite) après `start`, hors parenthèses */
function closingBracket(nodes: FormulaNode[], start: number): number {
	let level = 0;
	for (let i = start + 1; i < nodes.length; i += 1) {
		if (isSymbol(nodes[i], '(')) level += 1;
		else if (isSymbol(nodes[i], ')')) {
			if (level === 0) return i;
			level -= 1;
		} else if (level === 0 && isSymbol(nodes[i], '[', ']')) return i;
	}
	return -1;
}

/**
 * Intervalle, segment ou demi-droite commençant en `start` (`[2;5[`, `]-\infty;3]`, `[AB]`, `[AB)`).
 * Rend sa lecture et la position de son crochet fermant, ou `null`.
 */
function speakBracketed(
	nodes: FormulaNode[],
	start: number
): { spoken: Spoken[]; end: number } | null {
	if (!isSymbol(nodes[start], '[', ']')) return null;
	const end = closingBracket(nodes, start);
	if (end === -1) return null;
	const inside = nodes.slice(start + 1, end);
	const opening = (nodes[start] as { value: string }).value;
	const closing = (nodes[end] as { value: string }).value;
	const separators = inside.flatMap((node, i) => (isSymbol(node, ';', ',') ? [i] : []));
	const twoPoints =
		inside.length === 2 &&
		inside.every((node) => node.kind === 'symbol' && /^[A-Z]$/.test(node.value));
	// `[AB)` : une demi-droite
	if (closing === ')') {
		return opening === '[' && twoPoints
			? { spoken: ['demi-droite', ...speakSequence(inside), PAUSE], end }
			: null;
	}
	if (separators.length === 1) {
		const lower = inside.slice(0, separators[0]);
		const upper = inside.slice(separators[0] + 1);
		if (lower.length === 0 || upper.length === 0) return null;
		const spoken: Spoken[] = [
			'intervalle',
			opening === '[' ? 'fermé en' : 'ouvert en',
			...speakSequence(lower),
			PAUSE,
			closing === ']' ? 'fermé en' : 'ouvert en',
			...speakSequence(upper),
			PAUSE
		];
		return { spoken, end };
	}
	// `[AB]` : un segment
	const isSegment = opening === '[' && closing === ']' && twoPoints;
	return isSegment ? { spoken: ['segment', ...speakSequence(inside), PAUSE], end } : null;
}

function isSimpleFraction(node: FormulaNode): boolean {
	return (
		node.kind === 'command' &&
		['frac', 'dfrac', 'tfrac', 'cfrac'].includes(node.name) &&
		isSimple(node.args[0] ?? []) &&
		isSimple(node.args[1] ?? [])
	);
}

/** Ce qui se colle au dénominateur à l'oral : une lettre, un nombre, une autre forme */
function startsTerm(node: FormulaNode | undefined): boolean {
	if (node === undefined) return false;
	if (node.kind !== 'symbol') return true;
	return /^[a-zA-Z]$/.test(node.value) || node.value === '\\pi';
}

function speakSequence(nodes: FormulaNode[]): Spoken[] {
	const spoken: Spoken[] = [];
	for (let i = 0; i < nodes.length; i += 1) {
		const node = nodes[i];

		const bracketed = speakBracketed(nodes, i);
		if (bracketed) {
			spoken.push(...bracketed.spoken);
			i = bracketed.end;
			continue;
		}

		// `f(x)` : « f de x » ; `f(x+1)` garde ses parenthèses, dites
		if (isFunctionName(node) && isSymbol(nodes[i + 1], '(')) {
			const end = closingParenthesis(nodes, i + 1);
			if (end !== -1) {
				spoken.push(...speakNode(node), 'de');
				if (isSimple(nodes.slice(i + 2, end))) {
					spoken.push(...speakSequence(nodes.slice(i + 2, end)));
					i = end;
				}
				continue;
			}
		}

		// `\ln 2` : « logarithme népérien de 2 »
		if (node.kind === 'symbol' && node.value in NAMED_FUNCTIONS && i + 1 < nodes.length) {
			spoken.push(NAMED_FUNCTIONS[node.value], 'de');
			continue;
		}

		// Entre deux vecteurs, le point est le produit scalaire
		if (isSymbol(node, '\\cdot') && isVector(nodes[i - 1]) && isVector(nodes[i + 1])) {
			spoken.push('scalaire');
			continue;
		}

		spoken.push(...speakNode(node));

		// `\\frac{2}{3}x` : sans pause, on entendrait 2 sur (3 x)
		if (isSimpleFraction(node) && startsTerm(nodes[i + 1])) spoken.push(PAUSE);
	}
	return spoken;
}

/** Mots séparés par une espace, pauses rendues par une virgule ; rien qui ressemble à une balise */
function toText(spoken: Spoken[]): string {
	let text = '';
	let pending = false;
	for (const part of spoken) {
		if (typeof part !== 'string') {
			pending = text !== '';
			continue;
		}
		const word = part
			.replace(/[<>\\{}]/g, ' ')
			.replace(/\s+/g, ' ')
			.trim();
		if (word === '') continue;
		text += (pending ? ', ' : text === '' ? '' : ' ') + word;
		pending = false;
	}
	return text;
}

/** Repli : la formule telle qu'écrite, sans rien qui ressemble à une balise ou une commande */
function plainText(latex: string): string {
	return toText([latex.slice(0, MAX_SPOKEN_LENGTH)]);
}

/** Ce qu'un lecteur d'écran doit dire d'une formule LaTeX, en français. Ne lève jamais. */
export function speakLatexInFrench(latex: string): string {
	if (latex.length > MAX_SPOKEN_LENGTH) return plainText(latex);
	try {
		return toText(speakSequence(parseLatexForSpeech(latex)));
	} catch {
		// Formule démesurée (pile) : mieux vaut son texte qu'une page cassée
		return plainText(latex);
	}
}
