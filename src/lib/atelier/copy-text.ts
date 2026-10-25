/**
 * Atelier — ce que copie le bouton « Copier » d'une ligne de Calcul
 *
 * Phase 0 `docs/archive/wip/atelier-copier-phase0.md` (décisions de David, 2026-10-15) :
 * la réponse seule, en texte lisible ; le LaTeX au menu.
 *
 * Le texte vient du LaTeX de la ligne, propre partout — pas de son texte, qui
 * est souvent la sortie du terminal (`.résoudre` y met toute sa trace), ni de
 * MathLive, dont la conversion écrit `(1)/(2)` et `k m` (mesuré le 2026-10-15).
 * La conversion ne connaît que les commandes que l'atelier écrit : une autre
 * (tableau, environnement) rend `null`, et c'est le LaTeX qui est copié.
 *
 * @module atelier/copy-text
 */

import type { Entry } from './desk.svelte';

// =============================================================================
// Types
// =============================================================================

/** Ce qu'une ligne donne à copier. `asLatex` : le texte n'a pas su s'écrire, c'est le LaTeX. */
export interface CopiedAnswer {
	readonly text: string;
	readonly latex?: string;
	readonly asLatex?: true;
}

type Token =
	| { readonly type: 'command'; readonly name: string }
	| { readonly type: 'text'; readonly value: string; readonly command: string }
	| { readonly type: 'char'; readonly value: string }
	| { readonly type: 'open' }
	| { readonly type: 'close' }
	| { readonly type: 'sup' }
	| { readonly type: 'sub' };

/**
 * Un morceau du texte : `atom` se colle à ses voisins (`2x`, `f(x)`), `op` et
 * `sep` s'entourent d'espaces (`x + 1`, `]2 ; 3[`), `open` / `close` sont des
 * délimiteurs (`\left(`), `space` une espace du LaTeX (`~`, `\,`).
 */
type Piece =
	| { kind: 'atom'; text: string; fraction?: boolean; func?: boolean; root?: boolean }
	| { kind: 'op'; text: string }
	| { kind: 'sep'; text: string }
	| { kind: 'open'; text: string }
	| { kind: 'close'; text: string }
	| { kind: 'space' };

/** La formule sort de ce que la conversion sait écrire. */
class Unreadable extends Error {}

// =============================================================================
// Constantes
// =============================================================================

/** Les commandes dont l'argument est du texte, lu tel quel (`\mathrm{km}`, `\text{ ou }`). */
const TEXT_COMMANDS = new Set([
	'text',
	'textrm',
	'textit',
	'textbf',
	'mathrm',
	'mathit',
	'mathbf',
	'mathsf',
	'mbox',
	'operatorname'
]);

const FUNCTIONS = new Set(
	'sin cos tan cot sec csc arcsin arccos arctan sinh cosh tanh coth ln log lg exp lim liminf limsup max min sup inf det gcd deg arg'.split(
		' '
	)
);

const IGNORED = new Set(['limits', 'nolimits', 'displaystyle', 'textstyle', '!']);

const SPACES = new Set([',', ';', ':', ' ', 'quad', 'qquad']);

const SYMBOLS: Readonly<Record<string, string>> = {
	pi: 'π',
	infty: '∞',
	exponentialE: 'e',
	imaginaryI: 'i',
	differentialD: 'd',
	partial: '∂',
	emptyset: '∅',
	varnothing: '∅',
	ldots: '…',
	dots: '…',
	cdots: '⋯',
	degree: '°',
	prime: '′',
	ell: 'ℓ',
	forall: '∀',
	exists: '∃',
	nexists: '∄',
	neg: '¬',
	lnot: '¬',
	angle: '∠',
	triangle: '△',
	square: '□',
	'{': '{',
	'}': '}',
	'%': '%',
	'#': '#',
	'&': '&',
	_: '_',
	$: '$',
	lbrace: '{',
	rbrace: '}',
	lbrack: '[',
	rbrack: ']',
	langle: '⟨',
	rangle: '⟩',
	vert: '|',
	lvert: '|',
	rvert: '|',
	mid: '|',
	Vert: '‖',
	lVert: '‖',
	rVert: '‖',
	lfloor: '⌊',
	rfloor: '⌋',
	lceil: '⌈',
	rceil: '⌉',
	alpha: 'α',
	beta: 'β',
	gamma: 'γ',
	delta: 'δ',
	epsilon: 'ε',
	varepsilon: 'ε',
	zeta: 'ζ',
	eta: 'η',
	theta: 'θ',
	vartheta: 'ϑ',
	iota: 'ι',
	kappa: 'κ',
	lambda: 'λ',
	mu: 'μ',
	nu: 'ν',
	xi: 'ξ',
	omicron: 'ο',
	varpi: 'ϖ',
	rho: 'ρ',
	varrho: 'ϱ',
	sigma: 'σ',
	varsigma: 'ς',
	tau: 'τ',
	upsilon: 'υ',
	phi: 'φ',
	varphi: 'φ',
	chi: 'χ',
	psi: 'ψ',
	omega: 'ω',
	Gamma: 'Γ',
	Delta: 'Δ',
	Theta: 'Θ',
	Lambda: 'Λ',
	Xi: 'Ξ',
	Pi: 'Π',
	Sigma: 'Σ',
	Upsilon: 'Υ',
	Phi: 'Φ',
	Psi: 'Ψ',
	Omega: 'Ω'
};

const OPERATORS: Readonly<Record<string, string>> = {
	times: '×',
	cdot: '·',
	div: '÷',
	pm: '±',
	mp: '∓',
	ast: '∗',
	approx: '≈',
	simeq: '≃',
	sim: '∼',
	equiv: '≡',
	cong: '≅',
	neq: '≠',
	ne: '≠',
	leq: '≤',
	le: '≤',
	leqslant: '≤',
	geq: '≥',
	ge: '≥',
	geqslant: '≥',
	lt: '<',
	gt: '>',
	ll: '≪',
	gg: '≫',
	propto: '∝',
	parallel: '∥',
	perp: '⊥',
	in: '∈',
	notin: '∉',
	ni: '∋',
	subset: '⊂',
	subseteq: '⊆',
	supset: '⊃',
	supseteq: '⊇',
	cup: '∪',
	cap: '∩',
	setminus: '∖',
	to: '→',
	rightarrow: '→',
	mapsto: '↦',
	leftarrow: '←',
	Rightarrow: '⇒',
	implies: '⇒',
	Leftarrow: '⇐',
	Leftrightarrow: '⇔',
	iff: '⇔',
	Longrightarrow: '⟹',
	land: '∧',
	lor: '∨',
	circ: '∘',
	therefore: '∴',
	because: '∵'
};

const DOUBLE_STRUCK: Readonly<Record<string, string>> = {
	N: 'ℕ',
	Z: 'ℤ',
	Q: 'ℚ',
	R: 'ℝ',
	C: 'ℂ'
};

/** Les accents posés sur une lettre : le caractère combinant Unicode. */
const ACCENTS: Readonly<Record<string, string>> = {
	overline: '̅',
	bar: '̄',
	vec: '⃗',
	overrightarrow: '⃗',
	hat: '̂',
	widehat: '̂',
	dot: '̇',
	ddot: '̈',
	tilde: '̃'
};

const SUPERSCRIPTS: Readonly<Record<string, string>> = {
	...Object.fromEntries([...'0123456789'].map((d, i) => [d, '⁰¹²³⁴⁵⁶⁷⁸⁹'[i]])),
	'+': '⁺',
	'−': '⁻',
	'-': '⁻',
	'=': '⁼',
	'(': '⁽',
	')': '⁾',
	'∘': '°',
	a: 'ᵃ',
	b: 'ᵇ',
	c: 'ᶜ',
	d: 'ᵈ',
	e: 'ᵉ',
	f: 'ᶠ',
	g: 'ᵍ',
	h: 'ʰ',
	i: 'ⁱ',
	j: 'ʲ',
	k: 'ᵏ',
	l: 'ˡ',
	m: 'ᵐ',
	n: 'ⁿ',
	o: 'ᵒ',
	p: 'ᵖ',
	r: 'ʳ',
	s: 'ˢ',
	t: 'ᵗ',
	u: 'ᵘ',
	v: 'ᵛ',
	w: 'ʷ',
	x: 'ˣ',
	y: 'ʸ',
	z: 'ᶻ'
};

const SUBSCRIPTS: Readonly<Record<string, string>> = {
	...Object.fromEntries([...'0123456789'].map((d, i) => [d, '₀₁₂₃₄₅₆₇₈₉'[i]])),
	'+': '₊',
	'−': '₋',
	'-': '₋',
	'=': '₌',
	'(': '₍',
	')': '₎',
	a: 'ₐ',
	e: 'ₑ',
	h: 'ₕ',
	i: 'ᵢ',
	j: 'ⱼ',
	k: 'ₖ',
	l: 'ₗ',
	m: 'ₘ',
	n: 'ₙ',
	o: 'ₒ',
	p: 'ₚ',
	r: 'ᵣ',
	s: 'ₛ',
	t: 'ₜ',
	u: 'ᵤ',
	v: 'ᵥ',
	x: 'ₓ'
};

/** Ce qui ouvre : un signe moins qui suit est un opposé (`(−2`, `]−∞`, `{−1`). */
const OPENERS = new Set(['(', '[', ']', '{']);

// =============================================================================
// Lecture du LaTeX
// =============================================================================

function tokenize(latex: string): Token[] {
	const tokens: Token[] = [];
	let i = 0;
	while (i < latex.length) {
		const char = latex[i];
		if (char === '\\') {
			const match = /^\\([A-Za-z]+|[\s\S])/.exec(latex.slice(i));
			if (match === null) throw new Unreadable();
			i += match[0].length;
			if (TEXT_COMMANDS.has(match[1])) {
				const read = rawGroup(latex, i);
				tokens.push({ type: 'text', value: read.value, command: match[1] });
				i = read.end;
			} else {
				tokens.push({ type: 'command', name: match[1] });
			}
			continue;
		}
		i += 1;
		if (char === '{') tokens.push({ type: 'open' });
		else if (char === '}') tokens.push({ type: 'close' });
		else if (char === '^') tokens.push({ type: 'sup' });
		else if (char === '_') tokens.push({ type: 'sub' });
		// Une espace du source ne compte pas en mathématiques ; `~` est une espace
		else if (/\s/.test(char)) continue;
		else tokens.push({ type: 'char', value: char });
	}
	return tokens;
}

/** L'argument `{…}` d'une commande de texte, lu tel quel (sans commande dedans). */
function rawGroup(latex: string, from: number): { value: string; end: number } {
	let i = from;
	while (latex[i] === ' ') i++;
	if (latex[i] !== '{') throw new Unreadable();
	const close = latex.indexOf('}', i);
	const value = close === -1 ? '' : latex.slice(i + 1, close);
	if (close === -1 || value.includes('\\') || value.includes('{')) throw new Unreadable();
	return { value, end: close + 1 };
}

class Reader {
	#position = 0;

	constructor(private readonly tokens: readonly Token[]) {}

	get done(): boolean {
		return this.#position >= this.tokens.length;
	}

	next(): Token {
		const token = this.tokens[this.#position++];
		if (token === undefined) throw new Unreadable();
		return token;
	}

	peek(): Token | undefined {
		return this.tokens[this.#position];
	}

	/** Une suite de morceaux, jusqu'à la fin ou jusqu'à `}` (consommée). */
	sequence(inGroup: boolean): Piece[] {
		const pieces: Piece[] = [];
		while (!this.done) {
			const token = this.next();
			if (token.type === 'close') {
				if (!inGroup) throw new Unreadable();
				return pieces;
			}
			this.#read(token, pieces);
		}
		if (inGroup) throw new Unreadable();
		return pieces;
	}

	/** L'argument d'une commande : un groupe `{…}` ou un seul jeton. */
	argument(): Piece[] {
		const token = this.next();
		if (token.type === 'open') return this.sequence(true);
		const pieces: Piece[] = [];
		this.#read(token, pieces);
		return pieces;
	}

	#read(token: Token, pieces: Piece[]): void {
		switch (token.type) {
			case 'open': {
				const group = this.sequence(true);
				// `{,}` : la virgule décimale (`2{,}5`)
				const decimal = group.length === 1 && group[0].kind === 'sep' && group[0].text === ',';
				pieces.push(...(decimal ? [{ kind: 'atom' as const, text: ',' }] : group));
				return;
			}
			case 'close':
				throw new Unreadable();
			case 'sup':
			case 'sub':
				this.#script(token.type, pieces);
				return;
			case 'text':
				pieces.push(
					token.command === 'operatorname'
						? { kind: 'atom', text: token.value, func: true }
						: { kind: 'atom', text: token.value }
				);
				return;
			case 'char':
				this.#char(token.value, pieces);
				return;
			case 'command':
				this.#command(token.name, pieces);
		}
	}

	#char(char: string, pieces: Piece[]): void {
		if (char === '+' || char === '=' || char === '<' || char === '>') {
			pieces.push({ kind: 'op', text: char });
		} else if (char === '-') {
			pieces.push({ kind: 'op', text: '−' });
		} else if (char === ',' || char === ';' || char === ':') {
			pieces.push({ kind: 'sep', text: char });
		} else if (char === '~') {
			pieces.push({ kind: 'space' });
		} else if (char === "'") {
			attach(pieces, '′');
		} else if (char === '*') {
			pieces.push({ kind: 'op', text: '×' });
		} else {
			pieces.push({ kind: 'atom', text: char });
		}
	}

	#command(name: string, pieces: Piece[]): void {
		if (IGNORED.has(name)) return;
		if (SPACES.has(name)) {
			pieces.push({ kind: 'space' });
			return;
		}
		if (name === 'frac' || name === 'dfrac' || name === 'tfrac') {
			const numerator = render(this.argument());
			const denominator = render(this.argument());
			// Le dénominateur : un seul facteur, sinon entre parenthèses — `1/2√x`
			// se lit (1/2)·√x (revue : `.dériver sqrt(x)`)
			const below = isSingleFactor(denominator) ? denominator : `(${denominator})`;
			pieces.push({ kind: 'atom', text: `${grouped(numerator)}/${below}`, fraction: true });
			return;
		}
		if (name === 'sqrt') {
			this.#root(pieces);
			return;
		}
		if (name === 'left' || name === 'right' || name === 'middle') {
			const delimiter = this.#delimiter();
			if (delimiter === '') return;
			const kind = name === 'left' ? 'open' : name === 'right' ? 'close' : 'atom';
			pieces.push({ kind, text: delimiter });
			return;
		}
		if (name === 'mathbb') {
			const letter = render(this.argument());
			const symbol = DOUBLE_STRUCK[letter];
			if (symbol === undefined) throw new Unreadable();
			pieces.push({ kind: 'atom', text: symbol });
			return;
		}
		if (ACCENTS[name] !== undefined) {
			const base = render(this.argument());
			pieces.push({ kind: 'atom', text: [...base].map((c) => c + ACCENTS[name]).join('') });
			return;
		}
		if (FUNCTIONS.has(name)) {
			pieces.push({ kind: 'atom', text: name, func: true });
			return;
		}
		if (SYMBOLS[name] !== undefined) {
			pieces.push({ kind: 'atom', text: SYMBOLS[name] });
			return;
		}
		if (OPERATORS[name] !== undefined) {
			pieces.push({ kind: 'op', text: OPERATORS[name] });
			return;
		}
		// Tableau, environnement, commande qui pose un style… : le LaTeX sera copié
		throw new Unreadable();
	}

	/** `\sqrt{2}` → `√2`, `\sqrt{x + 1}` → `√(x + 1)`, `\sqrt[3]{x}` → `∛x`. */
	#root(pieces: Piece[]): void {
		let index = '';
		const next = this.peek();
		if (next?.type === 'char' && next.value === '[') {
			this.next();
			const parts: Piece[] = [];
			for (let token = this.next(); !(token.type === 'char' && token.value === ']');) {
				this.#read(token, parts);
				token = this.next();
			}
			index = render(parts);
		}
		const base = render(this.argument());
		const sign =
			index === '' || index === '2' ? '√' : index === '3' ? '∛' : index === '4' ? '∜' : null;
		if (sign === null) throw new Unreadable();
		// Un radicande d'un seul chiffre ou d'une seule lettre, sinon entre
		// parenthèses : `√x²` vaudrait aussi (√x)² (revue)
		const bare = /^(?:[\d,.]+|\p{L})$/u.test(base);
		pieces.push({ kind: 'atom', text: `${sign}${bare ? base : `(${base})`}`, root: true });
	}

	/** Le délimiteur après `\left` / `\right` ; `.` ne s'écrit pas. */
	#delimiter(): string {
		const token = this.next();
		if (token.type === 'char') return token.value === '.' ? '' : token.value;
		if (token.type === 'command' && SYMBOLS[token.name] !== undefined) return SYMBOLS[token.name];
		throw new Unreadable();
	}

	/** Exposant et indice : en caractères Unicode quand ils existent, sinon `^(…)`. */
	#script(type: 'sup' | 'sub', pieces: Piece[]): void {
		const last = pieces.at(-1);
		const script = render(this.argument(), true);
		// `\lim_{x \to +∞}` : écrit à la suite, `lim x→+∞`
		if (type === 'sub' && last?.kind === 'atom' && last.func === true) {
			last.text += ` ${script}`;
			pieces.push({ kind: 'space' });
			return;
		}
		const table = type === 'sup' ? SUPERSCRIPTS : SUBSCRIPTS;
		const chars = [...script];
		const mapped = chars.every((c) => table[c] !== undefined)
			? chars.map((c) => table[c]).join('')
			: `${type === 'sup' ? '^' : '_'}${chars.length === 1 ? script : `(${script})`}`;
		attach(pieces, mapped);
	}
}

/** Coller au morceau d'avant (exposant, prime) ; seul, un atome. */
function attach(pieces: Piece[], text: string): void {
	const last = pieces.at(-1);
	if (last !== undefined && (last.kind === 'atom' || last.kind === 'close')) {
		// Un exposant sur une racine : `(√x)²`, jamais `√x²` (revue)
		if (last.kind === 'atom' && last.root === true) {
			last.text = `(${last.text})`;
			last.root = false;
		}
		last.text += text;
		if (last.kind === 'atom') last.fraction = false;
	} else {
		pieces.push({ kind: 'atom', text });
	}
}

/** Un membre sans espace ni opération (le signe de tête permis) : pas de parenthèses. */
function isSimple(text: string): boolean {
	return !/\s/.test(text) && !/[+×·/=−]/.test(text.slice(1));
}

/** Superscripts, indices et prime collés à un facteur. */
const MARKS = `${Object.values(SUPERSCRIPTS).join('')}${Object.values(SUBSCRIPTS).join('')}′`;

/**
 * Un seul facteur : un nombre, une lettre ou une racine (avec ses exposants et
 * indices), un appel de fonction, une parenthèse. `2x`, `2√x` n'en sont pas.
 */
function isSingleFactor(text: string): boolean {
	const marks = `[${MARKS.replace(/[\]\\^-]/g, '\\$&')}]*`;
	return new RegExp(
		`^−?(?:[\\d,.]+|√?[\\p{L}\\d]|[√∛∜]?\\(.*\\)|\\p{L}+\\(.*\\))${marks}$`,
		'u'
	).test(text);
}

function grouped(text: string): string {
	return isSimple(text) ? text : `(${text})`;
}

// =============================================================================
// Écriture du texte
// =============================================================================

function endsWithLetterOrDigit(text: string): boolean {
	return /[\p{L}\p{N}′]$/u.test(text);
}

function startsWithLetterOrDigit(text: string): boolean {
	return /^[\p{L}\p{N}]/u.test(text);
}

/**
 * Les morceaux en texte. `compact` : sans espaces autour des opérations (un
 * exposant, l'indice de `lim`).
 */
function render(pieces: readonly Piece[], compact = false): string {
	let out = '';
	let previous: Piece | null = null;
	for (const [index, piece] of pieces.entries()) {
		if (piece.kind === 'space') {
			out += ' ';
			continue;
		}
		if (piece.kind === 'op') {
			const unary =
				(piece.text === '−' || piece.text === '+' || piece.text === '±') &&
				(previous === null ||
					previous.kind === 'op' ||
					previous.kind === 'sep' ||
					previous.kind === 'open' ||
					(previous.kind === 'atom' && OPENERS.has(previous.text)));
			out += unary || compact ? piece.text : ` ${piece.text} `;
		} else if (piece.kind === 'sep') {
			out += compact ? piece.text : piece.text === ',' ? ', ' : ` ${piece.text} `;
		} else if (piece.kind === 'atom') {
			const next = pieces[index + 1];
			// Une fraction collée à ce qui suit ou précède : entre parenthèses, `(1/3)x³`
			const juxtaposed =
				piece.fraction === true &&
				((next !== undefined &&
					(next.kind === 'open' || (next.kind === 'atom' && !OPENERS.has(next.text)))) ||
					(previous?.kind === 'atom' && endsWithLetterOrDigit(previous.text)));
			const text = juxtaposed ? `(${piece.text})` : piece.text;
			// Une fonction se détache d'une lettre ou d'un nombre : `2x sin(x)`, `ln x`
			const spaced =
				previous?.kind === 'atom' &&
				((piece.func === true && endsWithLetterOrDigit(previous.text)) ||
					(previous.func === true && startsWithLetterOrDigit(text)));
			// Une racine suivie d'un facteur : `√2·x`, sinon `√2x` se lirait √(2x)
			const afterRoot =
				previous?.kind === 'atom' && previous.root === true && startsWithLetterOrDigit(text);
			out += spaced ? ` ${text}` : afterRoot ? `·${text}` : text;
		} else {
			out += piece.text;
		}
		previous = piece;
	}
	return out
		.replace(/\s+/g, ' ')
		.replace(/\s+,/g, ',')
		.replace(/\(\s+/g, '(')
		.replace(/\s+\)/g, ')')
		.trim();
}

// =============================================================================
// Fonctions
// =============================================================================

/** Le texte lisible d'un LaTeX de l'atelier, ou `null` s'il sort de ce qu'on sait écrire. */
export function readableText(latex: string): string | null {
	try {
		return render(new Reader(tokenize(latex)).sequence(false));
	} catch (error) {
		if (error instanceof Unreadable) return null;
		throw error;
	}
}

/**
 * Ce que copie une ligne : la réponse affichée (la valeur approchée si le
 * bouton ≈ a basculé, son « = » de tête retiré), ou `null` sur un refus ou une
 * définition. Une ligne sans formule (`.stats`) donne son texte, sans LaTeX.
 */
export function answerToCopy(entry: Entry, showingAlternative: boolean): CopiedAnswer | null {
	if (entry.failed || entry.result?.kind === 'definition') return null;
	const shown =
		showingAlternative && entry.alternative !== undefined ? entry.alternative.latex : entry.latex;
	if (shown !== undefined) {
		const latex = shown.replace(/^\s*=\s*/, '');
		const text = readableText(latex);
		return text === null ? { text: latex, latex, asLatex: true } : { text, latex };
	}
	if (entry.result === undefined || entry.text.trim() === '') return null;
	return { text: entry.text };
}
