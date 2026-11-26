/**
 * Les endroits où une formule peut passer à la ligne : après un `=` ou un `+`
 * écrits hors de toute accolade, de tout `\left … \right` et de tout
 * environnement (E52 de `docs/archive/wip/ecarts-verifs/ecarts-verifs-progress.md` : une étape longue
 * d'une démonstration à ranger était coupée au bord de son étiquette, à 360 px).
 *
 * Chaque morceau garde son opérateur au bout, suivi de l'espace que MathLive
 * mettrait après lui au milieu de la formule et qu'il retire en fin de morceau
 * (mesuré : `a=\;` puis `b` a la largeur de `a=b`) : `\;` après `=`, `\:` après `+`.
 * Une parenthèse simple `(` ne compte pas : la ligne peut se couper dedans, comme
 * dans un manuel (« (MI + IA)·(MI + IB) » se coupe après un des `+`).
 *
 * @module utils/latex-break-points
 */

/** Opérateurs après lesquels la ligne peut se couper, et l'espace qui les suit */
const BREAK_AFTER = new Map([
	['=', '\\;'],
	['+', '\\:']
]);

/** Délimiteurs commandes qui ouvrent ou ferment un groupe où l'on ne coupe pas */
const OPENERS = new Set(['\\left', '\\begin', '\\{', '\\lbrace', '\\langle']);
const CLOSERS = new Set(['\\right', '\\end', '\\}', '\\rbrace', '\\rangle']);

/**
 * Après ces signes, un `+` est un signe (`(+3)`, `a\cdot+b`, `a=+b`) : on ne coupe
 * pas. Les commandes d'opérateurs et de relations comptent comme eux.
 */
const SIGN_CONTEXT = new Set(['(', '[', ',', ';', ':', '<', '>', '^', '_', '=', '+', '-']);
const OPERATOR_COMMANDS = new Set([
	'\\cdot',
	'\\times',
	'\\div',
	'\\pm',
	'\\mp',
	'\\le',
	'\\leq',
	'\\leqslant',
	'\\ge',
	'\\geq',
	'\\geqslant',
	'\\lt',
	'\\gt',
	'\\ne',
	'\\neq',
	'\\approx',
	'\\in',
	'\\to',
	'\\Rightarrow',
	'\\Leftrightarrow',
	'\\iff'
]);

/**
 * La formule en morceaux à poser côte à côte, la ligne pouvant se couper entre
 * deux ; un seul morceau quand elle n'a aucun endroit où se couper.
 */
export function splitLatexAtBreaks(latex: string): string[] {
	const pieces: string[] = [];
	// Accolades, \left … \right, environnements, \{ … \}
	let depth = 0;
	// Argument optionnel d'une commande : `\sqrt[n+1]`, `\xrightarrow[a+b]`
	let optional = 0;
	let start = 0;
	let previous = '';
	let i = 0;
	while (i < latex.length) {
		const char = latex[i];
		if (char === '\\') {
			const command = /^\\([a-zA-Z]+|.)/.exec(latex.slice(i))?.[0] ?? '\\';
			if (OPENERS.has(command)) depth++;
			if (CLOSERS.has(command)) depth--;
			previous = command;
			i += command.length;
			continue;
		}
		// Un `[` collé à une commande ouvre son argument optionnel ; ailleurs, c'est
		// un crochet d'intervalle (`]0 ; +\infty[`), qui peut rester dépareillé
		if (char === '[' && /^\\[a-zA-Z]+$/.test(previous)) optional++;
		else if (char === ']' && optional > 0) optional--;
		else if (char === '{') depth++;
		else if (char === '}') depth--;
		else if (
			depth === 0 &&
			optional === 0 &&
			BREAK_AFTER.has(char) &&
			// Un signe (`+3`, `(+3)`, `x^+`, `a\cdot+b`) n'est pas un endroit où couper
			latex.slice(start, i).trim() !== '' &&
			!SIGN_CONTEXT.has(previous) &&
			!OPERATOR_COMMANDS.has(previous) &&
			latex.slice(i + 1).trim() !== ''
		) {
			pieces.push(`${latex.slice(start, i + 1)}${BREAK_AFTER.get(char)}`);
			start = i + 1;
		}
		if (char.trim() !== '') previous = char;
		i++;
	}
	pieces.push(latex.slice(start));
	return pieces.map((piece) => piece.trim()).filter((piece) => piece !== '');
}
