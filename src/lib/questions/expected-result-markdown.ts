/**
 * Résultat attendu : décor de l'ÉCRAN (chantier « résultat attendu », lot 2)
 * ==========================================================================
 *
 * Traduit la structure de `buildExpectedResult` (statuts sémantiques, aucune
 * couleur) en markdown que `MarkdownRenderer` sait rendre : couleurs par
 * variables CSS (`\textcolor{var(--expected-…)}`, posées par
 * `ExpectedResultView` à partir des tokens), solution encadrée (`\bbox`).
 *
 * SÉCURITÉ (audit de la PR #643, exigence du lot 2) : toute valeur
 * `context: 'math'` est écrite DANS une formule `$…$`, jamais dans le texte
 * markdown — sinon `[clic](https://…)` tapé dans une case math redeviendrait un
 * lien chez le professeur. Une valeur `text` est rendue en `\text{…}` (formule
 * aussi), après `escapeStudentText`. Les accolades sont équilibrées : une
 * valeur ne referme jamais le décor qui l'entoure.
 *
 * Pur ; ne lève jamais.
 */

import { fillMarkdown, type ExpectedFill, type ExpectedStatus } from './expected-result';
import { escapeStudentText, neutralizeStudentLatex } from './student-answer-safety';

// Constantes
/** Libellé accessible de chaque statut : le statut n'est jamais porté par la couleur seule */
export const EXPECTED_STATUS_LABEL: Record<ExpectedStatus, string> = {
	correct: 'juste',
	unoptimal: 'forme à améliorer',
	incorrect: 'faux',
	empty: 'sans réponse',
	solution: 'réponse attendue',
	neutral: ''
};

/** Variable CSS de chaque statut (définies par `ExpectedResultView`) ; neutre : couleur du texte */
const STATUS_COLOR: Record<ExpectedStatus, string | null> = {
	correct: 'var(--expected-correct)',
	solution: 'var(--expected-correct)',
	unoptimal: 'var(--expected-unoptimal)',
	incorrect: 'var(--expected-incorrect)',
	empty: 'var(--expected-empty)',
	neutral: null
};

/** Case sans valeur : pointillés, comme sur une fiche */
const EMPTY_FILL_LATEX = String.raw`\text{……}`;

// Functions
/**
 * Accolades équilibrées : `}` orphelines retirées, `}` manquantes ajoutées, `\`
 * final retiré (il échapperait l'accolade du décor). `\{` et `\}` sont des
 * caractères, pas des groupes.
 */
export function balanceBraces(latex: string): string {
	let out = '';
	let depth = 0;
	for (let i = 0; i < latex.length; i++) {
		const c = latex[i];
		if (c === '\\') {
			// Commande ou caractère échappé : recopié tel quel ; `\` final retiré
			if (i + 1 < latex.length) out += c + latex[++i];
			continue;
		}
		if (c === '{') depth++;
		if (c === '}') {
			if (depth === 0) continue;
			depth--;
		}
		out += c;
	}
	return out + '}'.repeat(depth);
}

/**
 * LaTeX coloré selon le statut ; `boxed` : encadré de la même couleur (solution,
 * juste). `\boxed` garderait un cadre noir : `\bbox` prend la couleur du statut ;
 * épaisseur et arrondi en `px` : un décimal (`0.06em`) deviendrait `0{,}06` (locale fr).
 * Coins arrondis : demande de David (2026-10-02).
 */
export function colorLatex(latex: string, status: ExpectedStatus, boxed = false): string {
	const body = balanceBraces(latex);
	const color = STATUS_COLOR[status];
	const framed = boxed
		? String.raw`\bbox[border:1px solid ${color ?? 'currentColor'}; border-radius:4px]{${body}}`
		: body;
	return color ? String.raw`\textcolor{${color}}{${framed}}` : framed;
}

/** Texte (réponse ou solution) en formule : syntaxe neutralisée, puis `\text{…}` */
export function textToLatex(text: string): string {
	return String.raw`\text{${escapeStudentText(text)}}`;
}

/** LaTeX d'une case : sa valeur dans son contexte, colorée selon son statut */
export function fillLatex(fill: ExpectedFill, boxed = false): string {
	const value =
		fill.value === null || fill.value.trim() === ''
			? EMPTY_FILL_LATEX
			: fill.context === 'math'
				? fill.value
				: textToLatex(fill.value);
	return colorLatex(value, fill.status, boxed);
}

/**
 * Décor d'une case DANS un énoncé : dans une formule, le LaTeX tel quel ; hors
 * formule (`{{blank:N}}`, ou `\placeholder` égaré dans le texte), une formule
 * `$…$` à part entière — quel que soit le contexte de la case : une valeur math
 * n'est JAMAIS écrite dans le texte markdown (audit de la PR #643, lot 2).
 * Défaut défensif : hors formule.
 */
export function decorateFill(fill: ExpectedFill, inFormula = false): string {
	const latex = fillLatex(fill);
	return inFormula ? latex : `$${latex}$`;
}

/** Énoncé rempli (solutions, ou cases de l'élève) */
export function filledMarkdown(markdown: string, fills: readonly ExpectedFill[]): string {
	return fillMarkdown(markdown, fills, decorateFill);
}

/** Formule en ligne : `$…$`, accolades équilibrées */
export function inlineMath(latex: string): string {
	return `$${balanceBraces(latex)}$`;
}

/**
 * R1 : `lhs = réponse` (juste : encadré vert ; forme : réponse en ambre) ou
 * `lhs ≠ réponse` (≠ et réponse en rouge).
 */
export function comparisonMarkdown(lhs: string, relation: '=' | '≠', answer: ExpectedFill): string {
	const left = balanceBraces(lhs);
	if (relation === '≠') {
		return inlineMath(
			`${left} ${colorLatex(String.raw`\neq`, 'incorrect')} ${fillLatex({ ...answer, status: 'incorrect' })}`
		);
	}
	if (answer.status === 'correct') {
		const plain = fillLatex({ ...answer, status: 'neutral' });
		return inlineMath(colorLatex(`${left} = ${plain}`, 'correct', true));
	}
	return inlineMath(`${left} = ${fillLatex(answer)}`);
}

/**
 * Valeur de l'élève placée dans un environnement aligné : ses `&` deviendraient
 * des colonnes et ses `\\` des lignes — ils sont rendus inertes (`\&`, espace).
 */
function inertForAlignment(latex: string): string {
	// `$` déjà retiré en amont (neutralisation) ; retiré encore ici, par défense
	return latex
		.replace(/\$/g, '')
		.replace(/\\\\/g, ' ')
		.replace(/(?<!\\)&/g, String.raw`\&`);
}

/**
 * R1 avec solution (faux, forme non optimale) : UN bloc aligné sur la relation,
 * façon TinyMath — `lhs ≠ réponse` (ou `= réponse` ambre), puis `= solution`
 * encadrée, le `=` sous le `≠`. Réponse neutralisée en amont, rééquilibrée ici.
 */
export function alignedComparisonMarkdown(
	lhs: string,
	relation: '=' | '≠',
	answer: ExpectedFill,
	solutionLatex: string
): string {
	const left = balanceBraces(lhs);
	const value = answer.value === null ? null : inertForAlignment(answer.value);
	const first =
		relation === '≠'
			? `${left} &\\mathrel{${colorLatex(String.raw`\neq`, 'incorrect')}} ` +
				fillLatex({ ...answer, value, status: 'incorrect' })
			: `${left} &= ${fillLatex({ ...answer, value })}`;
	// La solution peut être la réponse de l'élève (rulesSuffice + forme) : inerte aussi
	const second = `&= ${colorLatex(inertForAlignment(solutionLatex), 'solution', true)}`;
	return inlineMath(
		String.raw`\begin{aligned}` + `${first} \\\\ ${second}` + String.raw`\end{aligned}`
	);
}

/**
 * R1 : la solution, encadrée en vert. Après une comparaison : `= 8` ; seule
 * (case vide) : `3 + 5 = 8`, pour que la ligne se lise sans l'énoncé.
 */
export function solutionMarkdown(lhs: string, latex: string, withLhs: boolean): string {
	const value = colorLatex(latex, 'solution', true);
	return inlineMath(withLhs ? `${balanceBraces(lhs)} = ${value}` : `= ${value}`);
}

export interface RemarkSegment {
	math: boolean;
	value: string;
}

/**
 * Remarque découpée en texte et formules : le texte est rendu TEL QUEL (jamais
 * en markdown), chaque formule `$…$` / `$$…$$` en formule neutralisée. Un
 * message du validateur peut citer la réponse de l'élève.
 */
export function remarkSegments(text: string): RemarkSegment[] {
	const segments: RemarkSegment[] = [];
	let last = 0;
	for (const m of text.matchAll(/\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g)) {
		const start = m.index ?? 0;
		if (start > last) segments.push({ math: false, value: text.slice(last, start) });
		segments.push({ math: true, value: inlineMath(neutralizeStudentLatex(m[1] ?? m[2])) });
		last = start + m[0].length;
	}
	if (last < text.length) segments.push({ math: false, value: text.slice(last) });
	return segments;
}

/** Réponse attendue seule (R8, R10) : une formule, ou du texte en formule */
export function expectedOnlyMarkdown(value: string, context: 'math' | 'text'): string {
	return inlineMath(colorLatex(context === 'math' ? value : textToLatex(value), 'solution', true));
}
