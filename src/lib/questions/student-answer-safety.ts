/**
 * Réponse d'élève sans danger à l'affichage (revue de la PR #643)
 * ===============================================================
 *
 * Le résultat attendu d'une évaluation est lu par le PROFESSEUR : la réponse
 * d'un élève y est rendue chez un autre utilisateur. Elle est donc neutralisée
 * DANS la structure, avant tout décor :
 * - en formule : commandes qui fabriquent un lien, une image, une classe, un
 *   style, une macro ou une case retirées ; `$` retirés (ils fermeraient la
 *   formule) ; une seule ligne ;
 * - en texte : chaque caractère de syntaxe markdown / ubumark remplacé par son
 *   sosie typographique (pleine chasse), qu'aucun analyseur ne lit — plus sûr
 *   qu'un `\` d'échappement, dont le support dépend de l'analyseur.
 *
 * Pur ; ne lève jamais.
 */

// Constantes
/** Commandes LaTeX interdites dans une réponse d'élève affichée */
const FORBIDDEN_LATEX_COMMAND =
	/\\(?:href|url|htmlData|htmlClass|htmlStyle|htmlId|class|cssId|includegraphics|def|gdef|edef|xdef|let|newcommand|renewcommand|providecommand|DeclareMathOperator|csname|endcsname|placeholder|mathtip|texttip|toggle|tooltip)(?![a-zA-Z])/g;

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
	'|': '｜'
};
const TEXT_SYNTAX = /[\\[\]()*_`$<>{}~#@|]/g;

// Functions
/** Réponse en formule : LaTeX conservé, sauf ce qui sort de la formule ou fabrique un lien */
export function neutralizeStudentLatex(latex: string): string {
	let safe = String(latex)
		.replace(/[\r\n]+/g, ' ')
		.replace(/\$/g, '');
	// Jusqu'au point fixe : `\hr\hrefef` redevient `\href` après un retrait
	for (let previous = ''; previous !== safe; ) {
		previous = safe;
		safe = safe.replace(FORBIDDEN_LATEX_COMMAND, '');
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
