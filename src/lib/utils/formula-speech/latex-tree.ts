/**
 * Arbre d'une formule LaTeX, pour la lire à voix haute (E32)
 *
 * Lecture tolérante : ce module ne valide rien, il découpe ce que les auteurs
 * écrivent vraiment (fractions, racines, exposants, indices, environnements) et
 * laisse le reste en symboles. Une formule mal formée donne un arbre partiel,
 * jamais une exception.
 *
 * Sans DOM ni MathLive : utilisable au rendu serveur et dans les tests Node.
 *
 * @module utils/formula-speech/latex-tree
 */

// Types
export type FormulaNode =
	| { kind: 'number'; integer: string; decimals: string }
	/** Un caractère (`+`, `x`) ou une commande sans argument (`\pi`) */
	| { kind: 'symbol'; value: string }
	| { kind: 'text'; value: string }
	| { kind: 'group'; children: FormulaNode[] }
	| { kind: 'command'; name: string; args: FormulaNode[][]; optional: FormulaNode[] | null }
	| {
			kind: 'scripts';
			base: FormulaNode | null;
			primes: number;
			sub: FormulaNode[] | null;
			sup: FormulaNode[] | null;
	  }
	/** `rows[ligne][cellule]` */
	| { kind: 'environment'; name: string; rows: FormulaNode[][][] };

// Constantes
/** Garde-fou : au-delà, la formule est lue comme du texte (rendu restreint, entrées géantes) */
const MAX_DEPTH = 40;

/** Commandes dont l'argument est du texte, pas des maths */
const TEXT_COMMANDS = new Set([
	'text',
	'textrm',
	'textbf',
	'textit',
	'textsf',
	'texttt',
	'textnormal',
	'mbox',
	'mathrm',
	'operatorname',
	'unit'
]);

/** Commandes de mise en forme : seul leur argument se lit */
const TRANSPARENT_COMMANDS = new Set([
	'mathbf',
	'mathbb',
	'mathcal',
	'mathit',
	'mathsf',
	'mathscr',
	'mathfrak',
	'bold',
	'boldsymbol',
	'bm',
	'boxed',
	'underline',
	'underbrace',
	'overbrace',
	'np',
	'num',
	'mathord',
	'mathbin',
	'mathrel',
	'mathop',
	'phantom'
]);

/** Commandes à ignorer : espaces, tailles de délimiteurs, styles */
const SKIPPED_COMMANDS = new Set([
	'displaystyle',
	'textstyle',
	'scriptstyle',
	'scriptscriptstyle',
	'limits',
	'nolimits',
	'big',
	'Big',
	'bigg',
	'Bigg',
	'bigl',
	'bigr',
	'Bigl',
	'Bigr',
	'biggl',
	'biggr',
	'Biggl',
	'Biggr',
	'bigm',
	'middle',
	'quad',
	'qquad',
	'enspace',
	'thinspace',
	'hline',
	'strut',
	'nobreak',
	'allowbreak',
	',',
	';',
	':',
	'!',
	' ',
	'>'
]);

/** Couleur en premier argument, contenu en second */
const COLORED_COMMANDS = new Set(['textcolor', 'colorbox', 'fcolorbox']);

const TWO_ARGUMENT_COMMANDS = new Set([
	'frac',
	'dfrac',
	'tfrac',
	'cfrac',
	'binom',
	'dbinom',
	'tbinom',
	'overset',
	'underset',
	'stackrel'
]);

const ONE_ARGUMENT_COMMANDS = new Set([
	'vec',
	'overrightarrow',
	'overleftarrow',
	'overline',
	'bar',
	'widehat',
	'hat',
	'tilde',
	'widetilde',
	'dot',
	'ddot',
	'sqrt',
	'placeholder'
]);

/** Environnements dont le premier argument décrit les colonnes */
const ENVIRONMENTS_WITH_COLUMNS = new Set(['array', 'tabular']);

// Fonctions
class LatexReader {
	private position = 0;

	constructor(private readonly source: string) {}

	/** Suite de nœuds jusqu'à `}` ; dans un environnement, aussi jusqu'à `&`, `\\` ou `\end` */
	sequence(depth: number, inEnvironment: boolean): FormulaNode[] {
		const nodes: FormulaNode[] = [];
		while (this.position < this.source.length) {
			this.skipSpaces();
			const rest = this.source.slice(this.position);
			if (rest === '' || rest.startsWith('}')) break;
			if (inEnvironment && (rest.startsWith('&') || /^\\(\\|end(?![a-zA-Z]))/.test(rest))) break;
			const node = this.scripted(depth, inEnvironment);
			if (node) nodes.push(node);
		}
		return nodes;
	}

	private skipSpaces(): void {
		while (/\s/.test(this.source[this.position] ?? '')) this.position += 1;
	}

	/** Un atome, puis ses primes, son indice et son exposant */
	private scripted(depth: number, inEnvironment: boolean): FormulaNode | null {
		const next = this.source[this.position];
		const base =
			next === '^' || next === '_' || next === "'" ? null : this.atom(depth, inEnvironment);
		let primes = 0;
		let sub: FormulaNode[] | null = null;
		let sup: FormulaNode[] | null = null;
		for (;;) {
			this.skipSpaces();
			const char = this.source[this.position];
			if (char === "'") {
				primes += 1;
				this.position += 1;
			} else if (char === '^') {
				this.position += 1;
				sup = [...(sup ?? []), ...this.argument(depth)];
			} else if (char === '_') {
				this.position += 1;
				sub = [...(sub ?? []), ...this.argument(depth)];
			} else break;
		}
		if (primes === 0 && sub === null && sup === null) return base;
		return { kind: 'scripts', base, primes, sub, sup };
	}

	/** Argument d'une commande : un groupe entre accolades, sinon un seul atome */
	private argument(depth: number): FormulaNode[] {
		this.skipSpaces();
		if (this.source[this.position] === '{') {
			this.position += 1;
			return this.group(depth);
		}
		if (this.position >= this.source.length || this.source[this.position] === '}') return [];
		// Sans accolades, un seul chiffre : `\frac12` est un demi
		if (/\d/.test(this.source[this.position])) {
			this.position += 1;
			return [{ kind: 'number', integer: this.source[this.position - 1], decimals: '' }];
		}
		// `\\frac\\frac\\frac…` : chaque commande nue descend d'un cran
		if (depth >= MAX_DEPTH) {
			this.position += 1;
			return [];
		}
		const node = this.atom(depth + 1, false);
		return node ? [node] : [];
	}

	/**
	 * Contenu d'un groupe dont l'accolade ouvrante vient d'être lue ; l'accolade
	 * fermante est consommée. Trop imbriqué : le reste du groupe en texte brut.
	 */
	private group(depth: number): FormulaNode[] {
		if (depth >= MAX_DEPTH) {
			const raw = this.rawGroupContent();
			return raw === '' ? [] : [{ kind: 'text', value: raw }];
		}
		const children = this.sequence(depth + 1, false);
		if (this.source[this.position] === '}') this.position += 1;
		return children;
	}

	/** Contenu brut jusqu'à l'accolade fermante du groupe en cours, consommée */
	private rawGroupContent(): string {
		let level = 1;
		const start = this.position;
		while (this.position < this.source.length) {
			const char = this.source[this.position];
			if (char === '\\') this.position += 1;
			else if (char === '{') level += 1;
			else if (char === '}') {
				level -= 1;
				if (level === 0) break;
			}
			this.position += 1;
		}
		const raw = this.source.slice(start, this.position);
		this.position = Math.min(this.position + 1, this.source.length);
		return raw;
	}

	/** Argument en texte brut (`\text{…}`, couleur, nom d'environnement) */
	private rawArgument(): string {
		this.skipSpaces();
		if (this.source[this.position] !== '{') return '';
		this.position += 1;
		return this.rawGroupContent();
	}

	/** Argument optionnel entre crochets (`\sqrt[3]{…}`) */
	private optionalArgument(depth: number): FormulaNode[] | null {
		this.skipSpaces();
		if (this.source[this.position] !== '[') return null;
		const end = this.source.indexOf(']', this.position);
		if (end === -1) return null;
		const inner = this.source.slice(this.position + 1, end);
		this.position = end + 1;
		return depth >= MAX_DEPTH ? [] : new LatexReader(inner).sequence(depth + 1, false);
	}

	private atom(depth: number, inEnvironment: boolean): FormulaNode | null {
		const char = this.source[this.position];
		if (char === '{') {
			this.position += 1;
			return { kind: 'group', children: this.group(depth) };
		}
		if (/\d/.test(char)) return this.number();
		if (char === '\\') return this.command(depth, inEnvironment);
		this.position += 1;
		// `~` est une espace insécable ; `&` hors environnement ne se lit pas
		if (char === '~' || char === '&') return null;
		return { kind: 'symbol', value: char };
	}

	/** Chiffres, virgule décimale (`{,}` ou `.`) et espaces de groupement (`12\,345`) */
	private number(): FormulaNode {
		let integer = '';
		let decimals = '';
		let inDecimals = false;
		for (;;) {
			const rest = this.source.slice(this.position);
			const digits = /^\d+/.exec(rest);
			if (digits) {
				if (inDecimals) decimals += digits[0];
				else integer += digits[0];
				this.position += digits[0].length;
				continue;
			}
			const separator = /^(\{,\}|\.)(?=\d)/.exec(rest);
			if (separator && !inDecimals) {
				inDecimals = true;
				this.position += separator[0].length;
				continue;
			}
			const grouping = /^(\\,|\\ |~|\{\\,\})(?=\d{3}(?!\d))/.exec(rest);
			if (grouping) {
				this.position += grouping[0].length;
				continue;
			}
			break;
		}
		return { kind: 'number', integer, decimals };
	}

	private command(depth: number, inEnvironment: boolean): FormulaNode | null {
		this.position += 1; // la contre-oblique
		const letters = /^[a-zA-Z]+/.exec(this.source.slice(this.position));
		const name = letters ? letters[0] : (this.source[this.position] ?? '');
		this.position += name.length;

		if (name === '') return null;
		if (name === '\\') return inEnvironment ? null : { kind: 'symbol', value: '\\\\' };
		if (name === 'left' || name === 'right') {
			// `\left.` et `\right.` : délimiteur invisible
			this.skipSpaces();
			if (this.source[this.position] === '.') this.position += 1;
			return null;
		}
		if (SKIPPED_COMMANDS.has(name)) return null;
		if (name === 'color') {
			this.rawArgument();
			return null;
		}
		if (name === 'begin') return this.environment(depth);
		if (name === 'end') {
			this.rawArgument();
			return null;
		}
		if (TEXT_COMMANDS.has(name)) return { kind: 'text', value: this.rawArgument() };
		if (COLORED_COMMANDS.has(name)) {
			this.rawArgument();
			if (name === 'fcolorbox') this.rawArgument();
			return { kind: 'group', children: this.argument(depth) };
		}
		if (TRANSPARENT_COMMANDS.has(name)) return { kind: 'group', children: this.argument(depth) };
		if (TWO_ARGUMENT_COMMANDS.has(name)) {
			const first = this.argument(depth);
			return { kind: 'command', name, args: [first, this.argument(depth)], optional: null };
		}
		if (ONE_ARGUMENT_COMMANDS.has(name)) {
			const optional = this.optionalArgument(depth);
			return { kind: 'command', name, args: [this.argument(depth)], optional };
		}
		return { kind: 'symbol', value: `\\${name}` };
	}

	private environment(depth: number): FormulaNode {
		const name = this.rawArgument().replace(/\*$/, '');
		if (ENVIRONMENTS_WITH_COLUMNS.has(name)) this.rawArgument();
		const rows: FormulaNode[][][] = [[]];
		while (this.position < this.source.length) {
			const cell = depth >= MAX_DEPTH ? [] : this.sequence(depth + 1, true);
			rows[rows.length - 1].push(cell);
			const rest = this.source.slice(this.position);
			if (rest.startsWith('&')) this.position += 1;
			else if (rest.startsWith('\\\\')) {
				this.position += 2;
				this.optionalArgument(depth); // `\\[2pt]`
				rows.push([]);
			} else if (rest.startsWith('\\end')) {
				this.position += 4;
				this.rawArgument();
				break;
			} else if (rest.startsWith('}')) {
				this.position += 1; // accolade orpheline : on avance
			} else break;
		}
		const filled = rows.filter((row) => row.some((cell) => cell.length > 0));
		return { kind: 'environment', name, rows: filled };
	}

	/** Une accolade fermante orpheline arrête `sequence` : on la saute pour lire la suite */
	all(): FormulaNode[] {
		const nodes: FormulaNode[] = [];
		while (this.position < this.source.length) {
			nodes.push(...this.sequence(0, false));
			if (this.source[this.position] === '}') this.position += 1;
		}
		return nodes;
	}
}

/**
 * Découper une formule LaTeX en arbre. Une entrée démesurée peut lever
 * (pile, mémoire) : l'appelant borne la taille et rattrape.
 */
export function parseLatexForSpeech(latex: string): FormulaNode[] {
	// `\lim\limits_{…}` : sans `\limits`, l'indice reste attaché à `\lim`
	return new LatexReader(latex.replace(/\\(no)?limits(?![a-zA-Z])/g, '')).all();
}
