/**
 * Les endroits où une formule peut passer à la ligne : après un `=` ou un `+`
 * écrits hors de toute accolade, de tout `\left … \right` et de tout
 * environnement (E52 de `docs/wip/ecarts-verifs-progress.md` : une étape longue
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

/**
 * La formule en morceaux à poser côte à côte, la ligne pouvant se couper entre
 * deux ; un seul morceau quand elle n'a aucun endroit où se couper.
 */
export function splitLatexAtBreaks(latex: string): string[] {
	const pieces: string[] = [];
	let depth = 0;
	let start = 0;
	let previous = '';
	let i = 0;
	while (i < latex.length) {
		const char = latex[i];
		if (char === '\\') {
			const command = /^\\([a-zA-Z]+|.)/.exec(latex.slice(i))?.[0] ?? '\\';
			if (command === '\\left' || command === '\\begin') depth++;
			if (command === '\\right' || command === '\\end') depth--;
			previous = command;
			i += command.length;
			continue;
		}
		if (char === '{') depth++;
		else if (char === '}') depth--;
		else if (
			depth === 0 &&
			BREAK_AFTER.has(char) &&
			// Un signe en tête (`+3`) ou en exposant (`x^+`) n'est pas un endroit où couper
			latex.slice(start, i).trim() !== '' &&
			previous !== '^' &&
			previous !== '_' &&
			!BREAK_AFTER.has(previous) &&
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
