/**
 * Réponse d'élève sans danger à l'affichage (revue de la PR #643)
 * ===============================================================
 *
 * Le résultat attendu d'une évaluation est lu par le PROFESSEUR : la réponse
 * d'un élève y est rendue chez un autre utilisateur. Elle est donc neutralisée
 * DANS la structure, avant tout décor :
 * - en formule : seules les commandes d'une LISTE BLANCHE restent (une commande
 *   inconnue peut être un alias qui fabrique un lien, une image, un style, une
 *   macro ou une case) ; `$` retirés (ils fermeraient la formule) ; une seule
 *   ligne ;
 * - en texte : chaque caractère de syntaxe markdown / ubumark remplacé par son
 *   sosie typographique (pleine chasse), qu'aucun analyseur ne lit — plus sûr
 *   qu'un `\` d'échappement, dont le support dépend de l'analyseur.
 *
 * Pur ; ne lève jamais.
 */

// Constantes
/**
 * LISTE BLANCHE des commandes LaTeX qu'une réponse d'élève peut garder. Une liste
 * noire a manqué deux alias de MathLive en deux audits de la PR #643 (`\style`,
 * puis `\enclose`, qui recopie `mathbackground`/`padding` dans `style=`) : seul
 * ce qui est connu inoffensif passe. Aucune de ces commandes ne prend de style,
 * de couleur, de dimension, de lien ni de macro.
 *
 * Mesurée (lot 2, 2026-10-02) sur :
 * - les réponses attendues réelles (`expectedAnswer` des modèles,
 *   `expectedAnswer`/`expectedAnswerLatex` des instances générées) et les
 *   réponses des specs : `docs/relecture`, `scripts/questions`, fixtures de prod
 *   (test « corpus » de `student-answer-safety.render.test.ts`) ;
 * - les sorties de `toLatex` et de `unitWritingToLatex` (unités) ;
 * - ce que l'élève produit au clavier MathLive 0.110 : clavier virtuel par
 *   défaut (123, symboles, grec) et raccourcis de saisie.
 */
// prettier-ignore
const ALLOWED_COMMANDS: ReadonlySet<string> = new Set([
	// Fractions, racines, opérations
	'frac', 'dfrac', 'tfrac', 'sqrt', 'times', 'cdot', 'cdotp', 'div', 'pm', 'mp', 'ast', 'star',
	'circ', 'bullet', 'slash', 'backslash', 'setminus', 'smallsetminus', 'bmod', 'pmod',
	'oplus', 'ominus', 'otimes', 'odot', 'oslash', 'ltimes', 'rtimes',
	// Relations
	'le', 'leq', 'leqslant', 'ge', 'geq', 'geqslant', 'ne', 'neq', 'lt', 'gt', 'll', 'gg',
	'approx', 'equiv', 'cong', 'sim', 'simeq', 'propto', 'doteq', 'doteqdot', 'questeq',
	'coloneq', 'prec', 'preceq', 'succ', 'succeq', 'parallel', 'perp',
	// Ensembles et logique
	'in', 'notin', 'ni', 'owns', 'subset', 'subseteq', 'subsetneq', 'subsetneqq',
	'varsubsetneq', 'nsubset', 'nsubseteq', 'supset', 'supseteq', 'supsetneq', 'supsetneqq',
	'nsupset', 'nsupseteq', 'cup', 'cap', 'bigcup', 'bigcap', 'emptyset', 'varnothing',
	'complement', 'mathbb', 'forall', 'exists', 'nexists', 'neg', 'lnot', 'land', 'lor',
	'wedge', 'vee', 'bigwedge', 'bigvee', 'barwedge', 'veebar', 'curlywedge', 'curlyvee',
	'top', 'bot', 'models', 'vdash', 'dashv', 'therefore', 'because', 'not',
	// Flèches
	'to', 'gets', 'mapsto', 'rightarrow', 'leftarrow', 'leftrightarrow', 'Rightarrow',
	'Leftarrow', 'Leftrightarrow', 'longrightarrow', 'longleftarrow', 'Longrightarrow',
	'implies', 'impliedby', 'iff', 'roundimplies', 'biconditional', 'uparrow', 'downarrow',
	'lArr', 'larr', 'lrArr', 'leftrightarrows', 'twoheadrightarrow', 'twoheadrightarrowtail',
	'rightarrowtail',
	// Délimiteurs
	'left', 'right', 'lbrace', 'rbrace', 'lbrack', 'rbrack', 'langle', 'rangle', 'vert',
	'Vert', 'lvert', 'rvert', 'lVert', 'rVert', 'lceil', 'rceil', 'lfloor', 'rfloor',
	// Espaces, points
	'quad', 'qquad', 'ldots', 'cdots', 'dots', 'vdots', 'ddots', 'ldotp', 'colon', 'Colon',
	// Texte, polices, unités
	'text', 'textrm', 'mathrm', 'mathbf', 'mathit', 'mathfrak', 'operatorname', 'unit', 'char',
	// Fonctions
	'sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'arcsin', 'arccos', 'arctan', 'sinh', 'cosh',
	'tanh', 'coth', 'ln', 'log', 'lg', 'exp', 'lim', 'liminf', 'limsup', 'min', 'max', 'gcd',
	'det', 'arg', 'Re', 'Im',
	// Grands opérateurs, analyse
	'sum', 'prod', 'int', 'iint', 'iiint', 'oint', 'oiint', 'oiiint', 'intop', 'smallint',
	'intclockwise', 'intctrclockwise', 'varointclockwise', 'ointctrclockwise', 'partial',
	'nabla', 'infty', 'differentialD', 'diffD', 'exponentialE', 'imaginaryI', 'imaginaryJ',
	// Accents, géométrie
	'prime', 'doubleprime', 'degree', 'overline', 'underline', 'overrightarrow',
	'overleftarrow', 'overleftrightarrow', 'underrightarrow', 'underleftarrow',
	'underleftrightarrow', 'overlinesegment', 'underlinesegment', 'overbrace', 'underbrace',
	'overgroup', 'undergroup', 'vec', 'widehat', 'hat', 'bar', 'tilde', 'dot', 'ddot',
	'acute', 'grave', 'breve', 'check', 'mathring', 'bigcirc', 'circledcirc', 'circleddash',
	'square', 'diamond', 'bowtie', 'aleph',
	// Lettres grecques
	'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'varepsilon', 'zeta', 'eta', 'theta',
	'vartheta', 'iota', 'kappa', 'varkappa', 'lambda', 'mu', 'nu', 'xi', 'omicron', 'pi',
	'varpi', 'rho', 'varrho', 'sigma', 'varsigma', 'tau', 'upsilon', 'phi', 'varphi', 'chi',
	'psi', 'omega', 'Gamma', 'Delta', 'Theta', 'Lambda', 'Xi', 'Pi', 'Sigma', 'Upsilon', 'Phi',
	'Psi', 'Omega', 'Kappa'
]);

/** Caractères qu'un `\` peut précéder (espaces, accolades, `%`, `|`) */
const ALLOWED_ESCAPED: ReadonlySet<string> = new Set([',', ';', ':', '!', ' ', '{', '}', '%', '|']);

/** Caractère de syntaxe → sosie inerte */
const TEXT_LOOKALIKES: Record<string, string> = {
	'\\': '＼',
	'[': '［',
	']': '］',
	'(': '（',
	')': '）',
	'*': '∗',
	_: '＿',
	'`': 'ˋ',
	$: '＄',
	'<': '‹',
	'>': '›',
	'{': '｛',
	'}': '｝',
	'~': '∼',
	'#': '＃',
	'@': '＠',
	'|': '｜',
	// `%` ouvre un commentaire LaTeX dans `\\text{…}` : la suite de la formule disparaîtrait
	'%': '٪'
};
const TEXT_SYNTAX = /[\\[\]()*_`$<>{}~#@|%]/g;

// Functions
/**
 * Fin d'un groupe ouvert en `start` (`{…}` ou `[…]`) : indice juste après son
 * délimiteur fermant, ou fin de chaîne s'il n'est pas fermé. Accolades et
 * crochets imbriqués comptés ; `\x` est un caractère, pas un délimiteur.
 */
function groupEnd(latex: string, start: number): number {
	const open = latex[start];
	const close = open === '{' ? '}' : ']';
	let depth = 0;
	let braces = 0;
	for (let i = start; i < latex.length; i++) {
		const c = latex[i];
		if (c === '\\') {
			i++;
			continue;
		}
		if (open === '[') {
			if (c === '{') braces++;
			else if (c === '}') braces = Math.max(0, braces - 1);
			if (braces > 0) continue;
		}
		if (c === open) depth++;
		else if (c === close && --depth === 0) return i + 1;
	}
	return latex.length;
}

/**
 * Arguments d'une commande retirée : chaque `{…}` gardé (filtré, en texte
 * inerte), chaque `[…]` (options : styles, dimensions) supprimé — y compris
 * APRÈS un argument (`\enclose{box}[mathbackground=…]{3}`).
 */
function strippedArguments(latex: string, from: number): { kept: string; end: number } {
	let kept = '';
	let i = from;
	for (;;) {
		let j = i;
		while (latex[j] === ' ') j++;
		if (latex[j] === '[') {
			i = groupEnd(latex, j);
		} else if (latex[j] === '{') {
			const end = groupEnd(latex, j);
			const closed = latex[end - 1] === '}' && end - 1 > j;
			kept += `{${keepAllowedCommands(latex.slice(j + 1, closed ? end - 1 : end))}}`;
			i = end;
		} else {
			return { kept, end: i };
		}
	}
}

/** Une passe : commandes hors liste blanche retirées (nom et options), le reste recopié */
function keepAllowedCommands(latex: string): string {
	let out = '';
	let i = 0;
	while (i < latex.length) {
		const c = latex[i];
		if (c !== '\\') {
			out += c;
			i++;
			continue;
		}
		const name = /^[a-zA-Z]+/.exec(latex.slice(i + 1))?.[0];
		if (name) {
			i += 1 + name.length;
			if (ALLOWED_COMMANDS.has(name)) {
				out += `\\${name}`;
				continue;
			}
			const { kept, end } = strippedArguments(latex, i);
			out += kept;
			i = end;
			continue;
		}
		const next = latex[i + 1];
		if (next !== undefined && ALLOWED_ESCAPED.has(next)) {
			out += `\\${next}`;
			i += 2;
			continue;
		}
		// `\` seul (ou devant un caractère hors liste) : retiré, le caractère reste
		i++;
	}
	return out;
}

/**
 * Réponse en formule : seules les commandes de la liste blanche restent ; une
 * commande retirée laisse ses arguments `{…}` en texte inerte et perd ses
 * options `[…]`. `$` retirés (ils fermeraient la formule) ; une seule ligne.
 */
export function neutralizeStudentLatex(latex: string): string {
	let safe = String(latex)
		.replace(/[\r\n]+/g, ' ')
		.replace(/\$/g, '')
		// `%` nu ouvre un commentaire LaTeX : la suite de la formule disparaîtrait.
		// Échappé en `\%`, il s'affiche pareil (« 33% » reste « 33 % »).
		.replace(/(?<!\\)%/g, '\\%');
	// Jusqu'au point fixe : un retrait peut accoler `\text` et `color`
	for (let previous = ''; previous !== safe; ) {
		previous = safe;
		safe = keepAllowedCommands(safe);
	}
	return safe;
}

/** Réponse en texte : aucun lien, image, formule, case ni mise en forme fabricable */
export function escapeStudentText(text: string): string {
	return String(text)
		.replace(/[\r\n]+/g, ' ')
		.replace(TEXT_SYNTAX, (c) => TEXT_LOOKALIKES[c] ?? c)
		.replace(/=(?==)/g, '＝');
}
