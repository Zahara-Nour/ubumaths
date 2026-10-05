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
 * - en formule trop longue ou trop imbriquée (rendu de plusieurs Mo, page du
 *   professeur bloquée) : son début en texte inerte.
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
 *   défaut (123, symboles, grec) et raccourcis de saisie ;
 * - `\binom` / `\dbinom` / `\tbinom` (2026-10-05) : réponse de dénombrement acceptée
 *   (`acceptCombinatorialNotation`), deux arguments comme `\frac`.
 */
// prettier-ignore
const ALLOWED_COMMANDS: ReadonlySet<string> = new Set([
	// Fractions, racines, opérations
	'frac', 'dfrac', 'tfrac', 'binom', 'dbinom', 'tbinom', 'sqrt', 'times', 'cdot', 'cdotp',
	'div', 'pm', 'mp', 'ast', 'star',
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

/**
 * Seul environnement admis : le vecteur en colonne de l'onglet « Vecteur » du
 * clavier (case « vecteur ») et la matrice de l'onglet « Matrice » (case
 * « matrice »). Écrit exactement `\begin{pmatrix}` / `\end{pmatrix}` ; toute
 * autre forme (`array`, `bmatrix`, `pmatrix*[r]`, espace avant l'accolade) est retirée.
 */
const ALLOWED_ENVIRONMENT = /^(begin|end)\{pmatrix\}/;

/**
 * Passages à la ligne admis dans TOUTE la formule (2026-10-05, case « matrice ») :
 * 6 lignes au plus, matrice d'adjacence d'un graphe à 6 sommets. Un plafond par
 * colonne (2, avant) laissait la hauteur se MULTIPLIER par imbrication ; un
 * plafond global la borne : hauteur ≤ 6 lignes de contenu. Lignes en masse = page
 * démesurée.
 */
const MAX_ROW_BREAKS = 5;

/** `&` admis par ligne d'une matrice : 6 colonnes au plus (450 colonnes rendaient 55em de large) */
const MAX_ROW_SEPARATORS = 5;

/**
 * `&` admis dans TOUTE la formule, matrice ou non (audit du 2026-10-05) : une 6 × 6.
 * Filet si le filtre se trompe sur la matrice ouverte (`\end{pmatrix}` caché dans
 * un argument `[…]` que MathLive lit autrement).
 */
const MAX_TOTAL_SEPARATORS = MAX_ROW_SEPARATORS * (MAX_ROW_BREAKS + 1);

/**
 * Bornes de rendu (mesurées le 2026-10-05, MathLive 0.110 `convertLatexToMarkup`).
 * Avec des commandes ADMISES, la taille du rendu explose :
 * - `\left(\dfrac{…}{1}\right)` imbriqué : la hauteur DOUBLE à chaque niveau
 *   (délimiteur symétrique autour d'un contenu qui ne l'est pas) — 12 niveaux,
 *   4 096em et 4 Mo de HTML. Sans accolades (`\left(\dfrac1\left(…`), même effet ;
 * - `\sqrt\sqrt…x` (sans accolades) : HTML quadratique, 2,9 Mo pour 1 000 caractères.
 * Le premier plafond borne l'exposant, le second la profondeur de toute structure
 * (accolades, `\left…\right`, colonne, arguments de fraction / racine / accent,
 * AVEC ou SANS accolades). Au-delà, la réponse est montrée en texte inerte.
 *
 * Corpus (test « corpus » de `student-answer-safety.render.test.ts`, > 20 000
 * réponses) : profondeur 7 au plus (plafond 12), 1 `\left` imbriqué au plus
 * (plafond 3), 428 caractères (plafond 1 000). Pire cas admis mesuré : 34em, 84 Ko.
 */
const MAX_LEFT_DEPTH = 3;
const MAX_STRUCTURE_DEPTH = 12;
/**
 * Niveaux comptés pour un `\left…\right` ou une colonne `pmatrix` : leur hauteur
 * croît plus vite que celle d'un argument (double, ou trois lignes) — avec un
 * seul niveau, 3 `\left` autour de 6 colonnes rendaient 126em.
 */
const TALL_LEVEL = 2;
/** Longueur de la réponse (l'envoi en admet 2 000 : `MAX_ANSWER_LENGTH`) */
const MAX_LATEX_LENGTH = 1_000;
/** Début montré d'une réponse hors bornes */
const INERT_PREVIEW_LENGTH = 120;

/**
 * Arguments obligatoires des commandes admises qui imbriquent leur contenu
 * (pris dans `{…}` ou, sans accolades, le jeton suivant). `binom` : pas admis
 * aujourd'hui, compté d'avance.
 */
// prettier-ignore
const STRUCTURE_ARITY: Readonly<Record<string, number>> = {
	frac: 2, dfrac: 2, tfrac: 2, binom: 2, dbinom: 2, tbinom: 2, sqrt: 1,
	overline: 1, underline: 1, overrightarrow: 1, overleftarrow: 1, overleftrightarrow: 1,
	underrightarrow: 1, underleftarrow: 1, underleftrightarrow: 1, overlinesegment: 1,
	underlinesegment: 1, overbrace: 1, underbrace: 1, overgroup: 1, undergroup: 1, vec: 1,
	widehat: 1, hat: 1, bar: 1, tilde: 1, dot: 1, ddot: 1, acute: 1, grave: 1, breve: 1,
	check: 1, mathring: 1, text: 1, textrm: 1, mathrm: 1, mathbf: 1, mathit: 1, mathfrak: 1,
	mathbb: 1, operatorname: 1, unit: 1, char: 1
};

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
	// Matrices ouvertes : profondeur de groupe de leur `\begin` (accolades et
	// `\left…\right`) et `&` déjà gardés dans leur ligne courante. `\\` n'est
	// admis qu'à l'intérieur. Un `\end` à une AUTRE profondeur (`{\end{pmatrix}}`,
	// `\text{\end{pmatrix}}`, `\left(\end{pmatrix}\right)`) ne ferme rien pour
	// MathLive : il est retiré (audit du 2026-10-05 : 965 colonnes, 116em).
	const openColumns: { depth: number; separators: number }[] = [];
	let depth = 0;
	let breaks = 0;
	let separators = 0;
	while (i < latex.length) {
		const c = latex[i];
		if (c !== '\\') {
			// Séparateur de colonnes : plafonné par ligne de matrice et pour la formule
			if (c === '&') {
				const top = openColumns.at(-1);
				const rowFull = top !== undefined && top.separators >= MAX_ROW_SEPARATORS;
				if (!rowFull && separators < MAX_TOTAL_SEPARATORS) {
					out += c;
					separators++;
					if (top) top.separators++;
				}
				i++;
				continue;
			}
			if (c === '{') depth++;
			else if (c === '}') depth = Math.max(0, depth - 1);
			out += c;
			i++;
			continue;
		}
		const environment = ALLOWED_ENVIRONMENT.exec(latex.slice(i + 1));
		if (environment) {
			i += 1 + environment[0].length;
			if (environment[1] === 'begin') {
				openColumns.push({ depth, separators: 0 });
			} else {
				const top = openColumns.at(-1);
				// Fin dans un autre groupe que le début : MathLive reste dans la matrice
				if (top && top.depth !== depth) continue;
				openColumns.pop();
			}
			out += `\\${environment[0]}`;
			continue;
		}
		// Passage à la ligne DANS une matrice : gardé (plafonné), son option d'espacement
		// `[…]` toujours retirée — MathLive la lit derrière tout blanc (tabulation, insécable…)
		if (latex[i + 1] === '\\' && openColumns.length > 0) {
			if (breaks < MAX_ROW_BREAKS) {
				out += '\\\\';
				breaks++;
				// Nouvelle ligne : ses `&` sont recomptés
				openColumns[openColumns.length - 1].separators = 0;
			}
			let j = i + 2;
			while (/\s/.test(latex[j] ?? '')) j++;
			i = latex[j] === '[' ? groupEnd(latex, j) : i + 2;
			continue;
		}
		const name = /^[a-zA-Z]+/.exec(latex.slice(i + 1))?.[0];
		if (name) {
			i += 1 + name.length;
			if (ALLOWED_COMMANDS.has(name)) {
				// `\left…\right` : un groupe pour MathLive, comme `{…}`
				if (name === 'left') depth++;
				else if (name === 'right') depth = Math.max(0, depth - 1);
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
 * Profondeur d'imbrication d'une formule : niveaux de structure (accolades,
 * argument d'une commande de `STRUCTURE_ARITY` — avec ou sans accolades —, et
 * `TALL_LEVEL` niveaux par `\left…\right` ou colonne `pmatrix`) et nombre de
 * `\left` imbriqués. La lecture s'arrête dès qu'un des deux dépasse son plafond :
 * la pile d'appels reste bornée.
 */
function latexNesting(latex: string): { structure: number; left: number } {
	let i = 0;
	let structure = 0;
	let left = 0;
	const exceeded = () => structure > MAX_STRUCTURE_DEPTH || left > MAX_LEFT_DEPTH;
	const commandName = () => /^[a-zA-Z]+/.exec(latex.slice(i + 1, i + 40))?.[0] ?? '';
	const skipSpaces = () => {
		while (latex[i] === ' ') i++;
	};
	// Délimiteur de `\left` / `\right` : `(`, `\{`, `\langle`…
	const skipDelimiter = () => {
		skipSpaces();
		if (latex[i] !== '\\') i++;
		else i += 1 + (commandName().length || 1);
	};

	type Until = '}' | ']' | 'right' | 'end' | null;
	/** Un élément à la profondeur `depth` ; `true` = fin de la suite `until` */
	function item(depth: number, lefts: number, until: Until): boolean {
		const c = latex[i];
		if (c === '}') {
			i++;
			return until === '}';
		}
		if (c === ']' && until === ']') {
			i++;
			return true;
		}
		if (c === '{') {
			i++;
			sequence(depth + 1, lefts, '}');
			return false;
		}
		if (c !== '\\') {
			i++;
			return false;
		}
		const name = commandName();
		if (!name) {
			i += 2;
			return false;
		}
		i += 1 + name.length;
		if (name === 'left') {
			skipDelimiter();
			sequence(depth + TALL_LEVEL, lefts + 1, 'right');
			return false;
		}
		if (name === 'right') {
			skipDelimiter();
			return until === 'right';
		}
		if (name === 'begin' || name === 'end') {
			i += /^\{[^}]*\}/.exec(latex.slice(i, i + 40))?.[0].length ?? 0;
			if (name === 'end') return until === 'end';
			sequence(depth + TALL_LEVEL, lefts, 'end');
			return false;
		}
		skipSpaces();
		if (name === 'sqrt' && latex[i] === '[') {
			i++;
			sequence(depth + 1, lefts, ']');
		}
		for (let k = 0; k < (STRUCTURE_ARITY[name] ?? 0) && !exceeded(); k++) {
			argument(depth + 1, lefts);
		}
		return false;
	}

	/** Argument d'une commande : `{…}` (un seul niveau) ou le jeton suivant */
	function argument(depth: number, lefts: number): void {
		skipSpaces();
		const c = latex[i];
		if (c === undefined || c === '}' || c === ']') return;
		if (c === '{') {
			i++;
			sequence(depth, lefts, '}');
			return;
		}
		const name = c === '\\' ? commandName() : '';
		if (name === 'right' || name === 'end') return;
		structure = Math.max(structure, depth);
		item(depth, lefts, null);
	}

	function sequence(depth: number, lefts: number, until: Until): void {
		structure = Math.max(structure, depth);
		left = Math.max(left, lefts);
		while (i < latex.length && !exceeded()) {
			if (item(depth, lefts, until)) return;
		}
	}

	sequence(0, 0, null);
	return { structure, left };
}

/** Réponse hors bornes : son début en texte inerte (aucune structure à rendre) */
function inertLatex(latex: string): string {
	const preview = latex.slice(0, INERT_PREVIEW_LENGTH);
	const ellipsis = latex.length > INERT_PREVIEW_LENGTH ? '…' : '';
	return String.raw`\text{${escapeStudentText(preview)}${ellipsis}}`;
}

/**
 * Réponse en formule : seules les commandes de la liste blanche restent ; une
 * commande retirée laisse ses arguments `{…}` en texte inerte et perd ses
 * options `[…]`. `$` retirés (ils fermeraient la formule) ; une seule ligne.
 * Trop longue ou trop imbriquée (rendu géant, cf. `MAX_LEFT_DEPTH`) : son début
 * en texte inerte.
 */
export function neutralizeStudentLatex(latex: string): string {
	const line = String(latex).replace(/[\r\n]+/g, ' ');
	if (line.length > MAX_LATEX_LENGTH) return inertLatex(line);
	let safe = line
		.replace(/\$/g, '')
		// `%` nu ouvre un commentaire LaTeX : la suite de la formule disparaîtrait.
		// Échappé en `\%`, il s'affiche pareil (« 33% » reste « 33 % »). Nu = précédé
		// d'un nombre PAIR de `\` : `\\%` (passage à la ligne puis %) l'est aussi
		// (audit du 2026-10-05), `\%` déjà échappé ne l'est pas.
		.replace(/(?<!\\)((?:\\\\)*)%/g, '$1\\%');
	// Jusqu'au point fixe : un retrait peut accoler `\text` et `color`
	for (let previous = ''; previous !== safe; ) {
		previous = safe;
		safe = keepAllowedCommands(safe);
	}
	return isTooDeep(safe) ? inertLatex(safe) : safe;
}

/** Imbrication au-delà des plafonds (`MAX_STRUCTURE_DEPTH`, `MAX_LEFT_DEPTH`) */
function isTooDeep(latex: string): boolean {
	const nesting = latexNesting(latex);
	return nesting.structure > MAX_STRUCTURE_DEPTH || nesting.left > MAX_LEFT_DEPTH;
}

/**
 * Formule hors bornes de rendu (mêmes plafonds que `neutralizeStudentLatex`) :
 * trop longue (`MAX_LATEX_LENGTH`) ou trop imbriquée. Mesurée sur la formule
 * BRUTE, sans filtrage : sert au rendu restreint (chat, messages, signalements,
 * carnets d'élèves lus par autrui), où une formule hors bornes n'est jamais
 * donnée à MathLive (rendu de plusieurs Mo, page du lecteur bloquée).
 */
export function exceedsMathNestingLimits(latex: string): boolean {
	// Blancs (saut de ligne, tabulation) lus comme des espaces : `\left` puis
	// son délimiteur sur la ligne suivante reste un `\left`
	const line = String(latex).replace(/\s/g, ' ');
	return line.length > MAX_LATEX_LENGTH || isTooDeep(line);
}

/** Réponse en texte : aucun lien, image, formule, case ni mise en forme fabricable */
export function escapeStudentText(text: string): string {
	return String(text)
		.replace(/[\r\n]+/g, ' ')
		.replace(TEXT_SYNTAX, (c) => TEXT_LOOKALIKES[c] ?? c)
		.replace(/=(?==)/g, '＝');
}
