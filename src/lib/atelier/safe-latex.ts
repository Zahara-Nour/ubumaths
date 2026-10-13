/**
 * Atelier — une formule relue du stockage peut-elle aller à MathLive ?
 *
 * La vue Calcul compose ses formules par `convertLatexToMarkup` puis `{@html}`,
 * et des commandes de MathLive écrivent des ATTRIBUTS. Mesuré le 2026-10-14
 * (MathLive 0.111.1) : `\htmlStyle{background:url(…)}{x}` rend un `style`,
 * `\class`, `\cssId`, `\htmlData` des `class`, `id`, `data-*`, `\href` un lien.
 * Le texte, lui, est échappé. Une formule relue du `localStorage` est NON
 * FIABLE : chaque commande doit être sur une **liste blanche**, sinon la formule
 * est refusée et la ligne se montre en texte, échappé par Svelte.
 *
 * Écarté : relire par `parseLatex` puis `toLatex` — 15 réponses ordinaires de
 * Calcul sur 43 ne se relisent pas (`\approx`, `\left\{`, intervalles,
 * `\mathrm`, `\mathbb{R}`), 2 reviennent réécrites.
 *
 * @module atelier/safe-latex
 */

// =============================================================================
// Constantes
// =============================================================================

/**
 * Les commandes que l'atelier écrit (relevées dans `mathAST`, `atelier`,
 * `statistics`) et les symboles mathématiques usuels. ⚠️ N'y ajouter qu'une
 * commande qui ne prend NI style, NI classe, NI adresse, NI identifiant :
 * jamais `\htmlStyle`, `\class`, `\cssId`, `\htmlId`, `\htmlData`, `\href`,
 * `\url`, `\enclose`, `\bbox`, `\color`, `\textcolor`, `\mathtip`, `\texttip`,
 * `\includegraphics`, ni ce qui fabrique ou redéfinit une commande (`\def`,
 * `\csname`, `\noexpand`…).
 */
export const MATH_COMMANDS: ReadonlySet<string> = new Set(
	`frac dfrac tfrac sqrt left right middle binom dbinom tbinom overline underline vec
	overrightarrow hat widehat bar dot ddot tilde overset underset stackrel begin end text
	textrm textit textbf mathrm mathit mathbf mathbb mathcal mathsf operatorname displaystyle
	textstyle limits nolimits times cdot div pm mp ast star circ bullet approx simeq sim equiv
	cong neq ne leq le geq ge leqslant geqslant lt gt ll gg propto parallel perp in notin ni
	subset subseteq supset supseteq cup cap setminus emptyset varnothing forall exists nexists
	to mapsto rightarrow leftarrow Rightarrow Leftarrow Leftrightarrow Longrightarrow
	Longleftarrow Longleftrightarrow iff implies land lor lnot neg not therefore because infty
	partial nabla angle measuredangle triangle degree prime ldots cdots dots vdots ddots quad
	qquad mid vert lvert rvert Vert lVert rVert lbrace rbrace lbrack rbrack langle rangle lfloor
	rfloor lceil rceil sin cos tan cot sec csc arcsin arccos arctan sinh cosh tanh coth ln log
	lg exp lim liminf limsup max min sup inf det gcd deg arg sum prod int iint oint alpha beta
	gamma delta epsilon varepsilon zeta eta theta vartheta iota kappa lambda mu nu xi omicron pi
	varpi rho varrho sigma varsigma tau upsilon phi varphi chi psi omega Gamma Delta Theta
	Lambda Xi Pi Sigma Upsilon Phi Psi Omega exponentialE imaginaryI differentialD ell hbar
	aleph Re Im wp square blacksquare diamond succ prec otimes oplus ominus odot`.split(/\s+/)
);

/** Les symboles de contrôle d'un seul caractère : accolades, espaces, `\\`, `\{`… */
const CONTROL_SYMBOLS: ReadonlySet<string> = new Set('{},;:! \\|%#&_$');

/** Les environnements de `\begin{…}` : tableaux et alignements, rien d'autre. */
export const ENVIRONMENTS: ReadonlySet<string> = new Set(
	'aligned array cases matrix pmatrix bmatrix vmatrix gathered split'.split(' ')
);

/**
 * Une commande comme MathLive la lit (son `Tokenizer`, mesuré) : des lettres et
 * des `*` (`\operatorname*`), sinon UN caractère — ou rien, en fin de formule.
 */
const COMMAND = /\\([a-zA-Z*]+|[\s\S]?)/g;

/** Après `\begin` ou `\end` : le nom de l'environnement, entre accolades. */
const ENVIRONMENT = /\\(?:begin|end)\s*\{([^{}]*)\}/g;

// =============================================================================
// Fonctions
// =============================================================================

/** Un caractère de contrôle, hors tabulation et sauts de ligne ? */
function hasControlCharacter(text: string): boolean {
	for (let i = 0; i < text.length; i++) {
		const code = text.charCodeAt(i);
		if ((code < 32 && code !== 9 && code !== 10 && code !== 13) || code === 127) return true;
	}
	return false;
}

/**
 * La formule n'emploie-t-elle QUE des commandes mathématiques connues ?
 *
 * Refusée aussi : la notation `^^5c` de TeX (MathLive la lit comme un
 * caractère, `\` compris), un `\begin` sans environnement connu, un caractère
 * de contrôle. Une formule refusée n'est jamais « réparée » : la ligne se
 * montre en texte.
 */
export function isSafeLatex(latex: string): boolean {
	if (latex.includes('^^') || hasControlCharacter(latex)) return false;
	for (const [, name] of latex.matchAll(COMMAND)) {
		const known = name.length > 1 || /[a-zA-Z]/.test(name) ? MATH_COMMANDS : CONTROL_SYMBOLS;
		if (!known.has(name)) return false;
	}
	const environments = [...latex.matchAll(ENVIRONMENT)];
	// Chaque `\begin` / `\end` doit nommer un environnement connu
	if (environments.length !== (latex.match(/\\(?:begin|end)(?![a-zA-Z*])/g) ?? []).length) {
		return false;
	}
	return environments.every(([, name]) => ENVIRONMENTS.has(name.trim()));
}
