/**
 * Vague 4 : règles d'écriture littérale, puissances, valeur absolue, affine, limites
 * ==================================================================================
 *
 * Classement : docs/archive/wip/corrections-manquantes-frontiere.md, codes N-OPPOSE-EXPR,
 * N-PUISS-DEF, N-IDREM, N-ECRIT-PRODUIT, N-NEUTRE-ABS, N-FACT-COMMUN, N-VOCAB-OP,
 * N-ABS, N-PUISS-NEG, N-PUISS10, N-PARENTH, N-RACINE-AFF, N-SIGNE-AFF, N-VOCAB-AFF,
 * N-NOTSCI, N-LIM-OPS (28 modèles). Rappel de la règle, puis application à
 * l'expression tirée. Deux lots selon le statut en prod (lecture seule, 2026-09-29) :
 * `vague4-brouillons` (25 `draft`) et `vague4-publies` (3 `published`).
 *
 * Réponses littérales : vérifiées par le chemin d'équivalence de `verify.ts`. Restent
 * rouges (notes ⚑) : opposé (opération dans la phrase), facteur commun (la réponse
 * n'est pas la fin d'un calcul), traduction de phrases (pas de bloc posé), racine
 * affine (chaîne d'équations) ; l'import les écarte tant qu'elles sont rouges.
 */

import type { Lot, LotEntry, WrittenCorrection } from '../lib/lot';
import { alignBlock, colored, inline } from '../lib/palette';
import { CONCLUSION_SOLUTION } from './signes';

// ============================================================================
// TYPES
// ============================================================================

interface Vague4Entry extends LotEntry {
	status: 'draft' | 'published';
}

// ============================================================================
// HELPERS
// ============================================================================

const O = (latex: string) => colored('transformed', latex);
const B = (latex: string) => colored('intermediate', latex);
const G = (latex: string) => colored('conclusion', latex);

function shared(steps: string[], notes: string[] = []): () => WrittenCorrection {
	return () => ({ steps: { shared: steps }, notes });
}

function byVariation(steps: string[][], notes: string[] = []): () => WrittenCorrection {
	return () => ({ steps: { byVariation: steps }, notes });
}

function entry(
	templateId: string,
	code: string,
	status: Vague4Entry['status'],
	written: () => WrittenCorrection
): Vague4Entry {
	return { templateId, classe: 'N', code, status, written };
}

const LITERAL_NOTE =
	'Réponse littérale : chaîne vérifiée par équivalence (`areEquivalent`, zéro faux positif) ; l’équivalence ne contrôle pas la FORME (réduite ou non).';
const OPERATION_IN_TEXT_NOTE =
	'⚑ Vérificateur : l’opération (« l’opposé de ») est dans la phrase, pas dans l’expression posée A ; le calcul part de −(A), non équivalent à A → rouge.';
const FACTOR_NOTE =
	'⚑ Vérificateur : la réponse est UN FACTEUR, pas la fin d’un calcul (la factorisation finit sur le produit) → rouge.';
const NO_BLOCK_NOTE =
	'⚑ Vérificateur : ni variable d’expression ni bloc `$$…$$` dans l’énoncé (phrase à traduire) : point de départ invérifiable → rouge.';
const EQUATION_NOTE =
	'⚑ Vérificateur : le seul bloc de l’énoncé est une égalité `f(x) = …` et la résolution enchaîne des ÉQUATIONS, pas des égalités de valeurs → rouge.';

// ============================================================================
// RULES
// ============================================================================

const RULE_OPPOSE =
	"**Opposé d'une expression.** On obtient l'opposé d'une expression en changeant le signe de " +
	'chacun de ses termes : $-(a + b) = -a - b$.';
const RULE_PARENTH =
	'**Suppression des parenthèses.** Des parenthèses précédées du signe $+$ s’enlèvent sans rien ' +
	'changer ; précédées du signe $-$, on les enlève en changeant le signe de chaque terme.';
const RULE_POWER =
	"**Définition d'une puissance.** Pour un entier $n \\geq 2$, $a^n = a \\times a \\times \\cdots " +
	'\\times a$ : le nombre $a$ est multiplié $n$ fois par lui-même ($n$ facteurs).';
const RULE_IDREM =
	'**Identité remarquable.** $(a + b)(a - b) = a^2 - b^2$ : le produit de la somme par la ' +
	'différence de deux termes est la différence de leurs carrés.';
const RULE_WRITE_PRODUCT =
	"**Convention d'écriture.** On peut supprimer le signe $\\times$ devant une lettre ou une " +
	'parenthèse ; le nombre s’écrit alors en premier.';
const RULE_NEUTRAL =
	'**Produit par $1$ ou par $0$.** Multiplier par $1$ ne change pas un nombre ($1$ est neutre) ; ' +
	'multiplier par $0$ donne toujours $0$ ($0$ est absorbant).';
const RULE_COMMON =
	'**Facteur commun.** Un facteur commun est un facteur présent dans CHAQUE terme de la somme ' +
	'(ou de la différence).';
const RULE_VOCAB =
	'**Vocabulaire.** Une somme est le résultat d’une addition, une différence celui d’une ' +
	'soustraction, un produit celui d’une multiplication, un quotient celui d’une division.';
const RULE_VOCAB_ORDER =
	'**Vocabulaire.** Somme ($+$), différence ($-$), produit ($\\times$), quotient ($:$). ' +
	'L’opération nommée EN PREMIER dans la phrase est la DERNIÈRE effectuée.';
const RULE_ABS =
	'**Valeur absolue.** La valeur absolue d’un nombre est sa distance à zéro : $|a| = a$ si ' +
	'$a \\geq 0$, et $|a| = -a$ (son opposé) si $a < 0$.';
const RULE_NEG_POWER =
	'**Exposant négatif.** Pour $a \\neq 0$ : $a^{-n} = \\dfrac{1}{a^n}$. En particulier, ' +
	'$a^{-1} = \\dfrac{1}{a}$ est l’inverse de $a$.';
const RULE_POWER10 =
	'**Puissances de $10$.** Pour $n \\geq 1$, $10^n$ s’écrit $1$ suivi de $n$ zéros ; $10^0 = 1$.';
const RULE_SCI =
	'**Notation scientifique.** Un nombre s’écrit $a \\times 10^n$ avec $1 \\leq a < 10$ et $n$ ' +
	'entier relatif. Quand la virgule se déplace de $k$ rangs vers la droite, $n = -k$ ; vers la ' +
	'gauche, $n = k$.';
const RULE_ROOT =
	'**Racine d’une fonction affine.** $f(x) = ax + b$ (avec $a \\neq 0$) s’annule pour la solution ' +
	'de l’équation $ax + b = 0$, c’est-à-dire $x = -\\dfrac{b}{a}$.';
const RULE_SIGN_AFF =
	'**Signe de $ax + b$.** La fonction s’annule en $x_0 = -\\dfrac{b}{a}$. À droite de $x_0$, ' +
	'$ax + b$ a le signe de $a$ ; à gauche, le signe contraire.';
const RULE_VOCAB_AFF =
	'**Vocabulaire.** Dans $f(x) = ax + b$, le nombre $a$ qui multiplie $x$ est le coefficient ' +
	'directeur ; le nombre $b$ seul est l’ordonnée à l’origine (la valeur de $f(0)$).';

// ============================================================================
// N-OPPOSE-EXPR / N-PARENTH
// ============================================================================

const opposeSingle = (term: string): string[] => [
	RULE_OPPOSE,
	`On change le signe du terme ${inline(O(term))}.`,
	alignBlock([`-\\left( ${O(term)} \\right) &= {{solution}}`])
];

const OPPOSE_843 = [
	RULE_OPPOSE,
	`On change le signe de chaque terme : ${inline(O('{{eval:pr}}'))} devient ` +
		`${inline(B('{{eval:-(p)r}}'))} et ${inline(O('{{eval:q;+}}'))} devient ` +
		`${inline(B('{{eval:-(q);+}}'))}.`,
	alignBlock([`-\\left( ${O('{{eval:pr}}')}${O('{{eval:q;+}}')} \\right) &= {{solution}}`])
];

const OPPOSE_34E = [
	opposeSingle('{{eval:ax}}'),
	[
		RULE_OPPOSE,
		`On change le signe de chaque terme : ${inline(O('x'))} devient ${inline(B('-x'))} et ` +
			`${inline(O('{{eval:b;+}}'))} devient ${inline(B('{{eval:-(b);+}}'))}.`,
		alignBlock([`-\\left( ${O('x')}${O('{{eval:b;+}}')} \\right) &= {{solution}}`])
	],
	[
		RULE_OPPOSE,
		`On change le signe de chaque terme : ${inline(O('{{b}}'))} devient ` +
			`${inline(B('{{eval:-(b)}}'))} et ${inline(O('-x'))} devient ${inline(B('+x'))}.`,
		alignBlock([`-\\left( ${O('{{b}}')} ${O('- x')} \\right) &= {{solution}}`])
	]
];

const PARENTH_C32 = [
	[
		RULE_PARENTH,
		`Les parenthèses sont précédées du signe ${inline(B('+'))} : on les enlève sans changer les termes.`,
		alignBlock([
			`{{eval:qk}} ${B('+')} \\left( ${O('{{eval:rm}}')}${O('{{eval:s;+}}')} \\right) &= {{solution}}`
		])
	],
	[
		RULE_PARENTH,
		`Les parenthèses sont précédées du signe ${inline(B('-'))} : ${inline(O('{{eval:rm}}'))} ` +
			`devient ${inline(G('{{eval:-(r)m}}'))} et ${inline(O('{{eval:s;+}}'))} devient ` +
			`${inline(G('{{eval:-(s);+}}'))}.`,
		alignBlock([
			`{{eval:qk}} ${B('-')} \\left( ${O('{{eval:rm}}')}${O('{{eval:s;+}}')} \\right) &= {{solution}}`
		])
	]
];

// ============================================================================
// N-PUISS-DEF / N-PUISS-NEG / N-PUISS10 / N-NOTSCI
// ============================================================================

const product = (factor: string, n: number) => Array(n).fill(O(factor)).join(' \\times ');

function powerFromProduct(factor: string, n: number): string[] {
	return [
		RULE_POWER,
		`Le facteur ${inline(O(factor))} est écrit ${inline(B(String(n)))} fois : c’est ` +
			`${inline(`${factor}^{${B(String(n))}}`)}.`,
		alignBlock([`${product(factor, n)} &= {{solution}}`])
	];
}

function productFromPower(factor: string, n: number): string[] {
	return [
		RULE_POWER,
		`L’exposant ${inline(B(String(n)))} indique ${n} facteurs égaux à ${inline(O(factor))}.`,
		alignBlock([`${O(factor)}^{${B(String(n))}} &= ${Array(n).fill(factor).join(' \\times ')}`])
	];
}

const NEG_POWER_651 = [
	[
		RULE_NEG_POWER,
		`${inline(`${O('{{a}}')}^{-1}`)} est l’inverse de ${inline(O('{{a}}'))}.`,
		alignBlock([`${O('{{a}}')}^{-1} &= {{solution}}`])
	],
	[
		RULE_NEG_POWER,
		`${inline(`\\left( \\dfrac{1}{${O('{{a}}')}} \\right)^{-1}`)} est l’inverse de ` +
			`${inline(`\\dfrac{1}{${O('{{a}}')}}`)} : diviser $1$ par une fraction, c’est multiplier ` +
			`par son inverse.`,
		alignBlock([
			`\\left( \\dfrac{1}{${O('{{a}}')}} \\right)^{-1} &= \\dfrac{1}{\\dfrac{1}{${O('{{a}}')}}}`,
			'&= {{solution}}'
		])
	],
	[
		RULE_NEG_POWER,
		`${inline(`\\left( \\dfrac{{{a}}}{{{b}}} \\right)^{-1}`)} est l’inverse de ` +
			`${inline('\\dfrac{{{a}}}{{{b}}}')} : on échange le numérateur et le dénominateur.`,
		alignBlock([
			`\\left( \\dfrac{${O('{{a}}')}}{${B('{{b}}')}} \\right)^{-1} &= \\dfrac{1}{\\dfrac{${O('{{a}}')}}{${B('{{b}}')}}}`,
			'&= {{solution}}'
		])
	]
];

const NEG_POWER_153 = [
	RULE_NEG_POWER,
	`L’exposant ${inline(O('-{{b}}'))} est négatif : ${inline(`{{a}}^{${O('-{{b}}')}}`)} est ` +
		`l’inverse de ${inline(`{{a}}^{${B('{{b}}')}}`)}.`,
	alignBlock([`{{a}}^{${O('-{{b}}')}} &= {{solution}}`])
];

const POWER10_AC0 = [
	RULE_POWER10,
	`${inline(`10^{${O('{{a}}')}}`)} s’écrit ${inline(B('{{eval:10^a}}'))}` +
		`{{if:a>0| ($1$ suivi de ${inline(O('{{a}}'))} zéro{{if:a>1|s|}})|}} ; on multiplie ensuite par ` +
		`${inline('{{b}}')}.`,
	alignBlock([
		`{{b}} \\times 10^{${O('{{a}}')}} &= {{b}} \\times ${B('{{eval:10^a}}')}`,
		'&= {{solution}}'
	])
];

const POWER10_AE8 = [
	RULE_POWER10,
	`${inline('{{eval:b*10^a}}')} s’écrit ${inline('{{b}}')} suivi de ${inline(O('{{a}}'))} ` +
		`zéro{{if:a>1|s|}} : c’est ${inline('{{b}}')} fois ${inline(B('{{eval:10^a}}'))}, et ` +
		`${inline(`${B('{{eval:10^a}}')} = 10^{${O('{{a}}')}}`)}.`,
	alignBlock([`{{eval:b*10^a}} &= {{b}} \\times ${B('{{eval:10^a}}')}`, '&= {{solution}}'])
];

const SCI_953 = [
	RULE_SCI,
	`Le premier chiffre non nul est ${inline(O('{{a}}'))} : la virgule se place juste après lui, ` +
		`ce qui donne la mantisse ${inline(`m = ${O('{{a}}{,}{{c}}')}`)}, comprise entre $1$ et $10$. ` +
		`La virgule s’est déplacée de ${inline(B('{{eval:abs(d)}}'))} rang{{if:abs(d)>1|s|}} vers la ` +
		`{{if:d<0|droite|gauche}} : l’exposant est ${inline(`n = ${G('{{d}}')}`)}.`,
	alignBlock([
		`{{expression1}} &= ${O('{{a}}{,}{{c}}')} \\times ${B('{{eval:10^d}}')}`,
		`&= ${O('{{a}}{,}{{c}}')} \\times 10^{${G('{{d}}')}}`
	])
];

// ============================================================================
// N-IDREM / N-ECRIT-PRODUIT / N-NEUTRE-ABS / N-FACT-COMMUN
// ============================================================================

function idremDevelop(first: string, second: string, swapped: boolean): string[] {
	const sum = `\\left( ${O(first)} + ${B(second)} \\right)`;
	const diff = `\\left( ${O(first)} - ${B(second)} \\right)`;
	return [
		RULE_IDREM,
		`Ici, le premier terme est ${inline(O(first))} et le second ${inline(B(second))}.`,
		alignBlock([
			`${swapped ? diff + sum : sum + diff} &= ${O(first)}^2 - ${B(second)}^2`,
			'&= {{solution}}'
		])
	];
}

const IDREM_FF8 = [
	[
		RULE_IDREM,
		`On lit l’égalité de droite à gauche : ${inline('{{eval:a^2}}')} est le carré de ` +
			`${inline(O('{{a}}'))} ; c’est une différence de deux carrés.`,
		alignBlock([`{{eval:a^2}} - {{c}}^2 &= ${O('{{a}}')}^2 - ${B('{{c}}')}^2`, '&= {{solution}}'])
	],
	[
		RULE_IDREM,
		`On lit l’égalité de droite à gauche : ${inline('{{eval:a^2}}')} est le carré de ` +
			`${inline(B('{{a}}'))} ; c’est une différence de deux carrés.`,
		alignBlock([`{{c}}^2 - {{eval:a^2}} &= ${O('{{c}}')}^2 - ${B('{{a}}')}^2`, '&= {{solution}}'])
	]
];

const WRITE_077 = [
	[
		RULE_WRITE_PRODUCT,
		`Le signe ${inline(O('\\times'))} est devant la lettre ${inline('{{p}}')} : on le supprime.`,
		alignBlock([`{{q}} ${O('\\times')} {{p}} &= {{solution}}`])
	],
	[
		RULE_WRITE_PRODUCT,
		`On échange les facteurs pour écrire le nombre ${inline(B('{{q}}'))} en premier, puis on ` +
			`supprime le signe ${inline(O('\\times'))}.`,
		alignBlock([
			`{{p}} \\times ${B('{{q}}')} &= ${B('{{q}}')} ${O('\\times')} {{p}}`,
			'&= {{solution}}'
		])
	]
];

function write33b(factor: string, a: string, b: string, factorFirst: boolean): string[] {
	const bracket = `\\left( {{${a}}} + {{${b}}} \\right)`;
	if (factorFirst) {
		return [
			RULE_WRITE_PRODUCT,
			`Le signe ${inline(O('\\times'))} est devant une parenthèse : on le supprime.`,
			alignBlock([`{{${factor}}} ${O('\\times')} ${bracket} &= {{solution}}`])
		];
	}
	return [
		RULE_WRITE_PRODUCT,
		`On échange les facteurs pour écrire le nombre ${inline(B(`{{${factor}}}`))} en premier, ` +
			`puis on supprime le signe ${inline(O('\\times'))}.`,
		alignBlock([
			`${bracket} \\times ${B(`{{${factor}}}`)} &= ${B(`{{${factor}}}`)} ${O('\\times')} ${bracket}`,
			'&= {{solution}}'
		])
	];
}

const NEUTRAL_6FB = [
	[
		RULE_NEUTRAL,
		`${inline('1{{p}}')} signifie ${inline(`${O('1')} \\times {{p}}`)} : multiplier par ` +
			`${inline(O('1'))} ne change rien.`,
		alignBlock([`1{{p}} &= ${O('1')} \\times {{p}}`, '&= {{solution}}'])
	],
	[
		RULE_NEUTRAL,
		`${inline('0{{p}}')} signifie ${inline(`${O('0')} \\times {{p}}`)} : multiplier par ` +
			`${inline(O('0'))} donne $0$, quelle que soit la valeur de ${inline('{{p}}')}.`,
		alignBlock([`0{{p}} &= ${O('0')} \\times {{p}}`, '&= {{solution}}'])
	]
];

function neutralHole(factor: number): string[] {
	return [
		RULE_NEUTRAL,
		`{{if:a=0|Le produit vaut ${inline(B('0'))} alors que ${inline(`${factor}`)} n’est pas nul : ` +
			`le nombre cherché est ${inline(G('0'))}, l’élément absorbant.|}}` +
			`{{if:a=1|Le produit ${inline(B(`${factor}`))} est égal à ${inline(`${factor}`)} : on a ` +
			`multiplié par ${inline(G('1'))}, l’élément neutre.|}}` +
			`{{if:a>1|Le produit ${inline(B(`{{eval:a*${factor}}}`))} n’est égal ni à $0$ ni à ` +
			`${inline(`${factor}`)} : on cherche combien de fois ${inline(`${factor}`)} il contient, par ` +
			`une division.|}}`,
		alignBlock([`? &= ${B(`{{eval:a*${factor}}}`)} : ${factor}`, '&= {{solution}}'])
	];
}

/** 294c4316 : `x*y ± z*w`, le facteur commun est le nombre `a` */
function common294(left: [string, string], sign: '+' | '-', right: [string, string]): string[] {
	const show = ([x, y]: [string, string]) =>
		`${x === 'a' ? O('{{a}}') : `{{${x}}}`} \\times ${y === 'a' ? O('{{a}}') : `{{${y}}}`}`;
	return [
		RULE_COMMON,
		`Dans ${inline(show(left))} et dans ${inline(show(right))}, le facteur ${inline(O('{{a}}'))} ` +
			`apparaît dans chaque terme.`,
		alignBlock([
			`${show(left)} ${sign} ${show(right)} &= ${O('{{a}}')} \\times \\left( {{b}} ${sign} {{c}} \\right)`
		]),
		`Un facteur commun est donc ${inline('{{solution}}')} (tout diviseur de ${inline('{{a}}')} ` +
			`autre que $1$ convient aussi).`
	];
}

const COMMON_294 = [
	common294(['a', 'b'], '+', ['a', 'c']),
	common294(['b', 'a'], '+', ['a', 'c']),
	common294(['a', 'b'], '+', ['c', 'a']),
	common294(['b', 'a'], '+', ['c', 'a']),
	common294(['a', 'b'], '-', ['a', 'c']),
	common294(['b', 'a'], '-', ['a', 'c']),
	common294(['a', 'b'], '-', ['c', 'a']),
	common294(['b', 'a'], '-', ['c', 'a'])
];

/** e66089e0 : termes écrits comme l'énoncé ; `target` = facteur commun (a nombre, c lettre) */
function commonE66(terms: [string, '+' | '-', string], target: 'a' | 'c'): string[] {
	const color = (term: string) =>
		term.replace(new RegExp(`\\{\\{${target}\\}\\}`), O(`{{${target}}}`));
	const [first, sign, second] = terms;
	const what = target === 'a' ? 'le nombre' : 'la lettre';
	return [
		RULE_COMMON,
		`Dans ${inline(color(first))} et dans ${inline(color(second))}, ${what} ` +
			`${inline(O(`{{${target}}}`))} apparaît dans chaque terme.`,
		alignBlock([
			`${color(first)} ${sign} ${color(second)} &= ${O(`{{${target}}}`)} \\times \\left( \\cdots \\right)`
		]),
		`Un facteur commun est donc ${inline('{{solution}}')}.`
	];
}

const COMMON_E66 = [
	commonE66(['{{a}} \\times {{b}}', '+', '{{a}}{{c}}'], 'a'),
	commonE66(['{{a}}{{c}}', '+', '{{a}} \\times {{b}}'], 'a'),
	commonE66(['{{a}}{{c}}', '+', '{{a}}{{d}}'], 'a'),
	commonE66(['{{a}}{{c}}', '-', '{{a}}{{d}}'], 'a'),
	commonE66(['{{a}} \\times {{b}}', '-', '{{a}}{{c}}'], 'a'),
	commonE66(['{{a}}{{c}}', '-', '{{a}} \\times {{b}}'], 'a'),
	commonE66(['{{a}}{{c}}', '+', '{{b}}{{c}}'], 'c'),
	commonE66(['{{a}}{{c}}', '-', '{{b}}{{c}}'], 'c'),
	commonE66(['{{d}}{{c}}', '+', '{{a}}{{c}}'], 'c'),
	commonE66(['{{c}}{{d}}', '+', '{{a}}{{c}}'], 'c'),
	commonE66(['{{d}}{{c}}', '-', '{{a}}{{c}}'], 'c'),
	commonE66(['{{c}}{{d}}', '-', '{{a}}{{c}}'], 'c')
];

// ============================================================================
// N-VOCAB-OP
// ============================================================================

const vocabSimple = (word: string, op: string): string[] => [
	RULE_VOCAB,
	`${word} est le résultat d’une ${op} : on écrit les deux nombres dans l’ordre de la phrase.`,
	`L’expression est ${inline('{{solution}}')}.`
];

const VOCAB_5D5 = [
	vocabSimple('Une somme', 'addition'),
	vocabSimple('Un produit', 'multiplication'),
	vocabSimple('Une différence', 'soustraction'),
	vocabSimple('Un quotient', 'division')
];

const VOCAB_78F = [
	[
		RULE_VOCAB_ORDER,
		`La phrase commence par ${B('« la somme »')} : la dernière opération est une addition. ` +
			`Son premier terme est ${O('« le produit de')} ${inline(O('{{a}}'))} ${O('par')} ` +
			`${inline(O('{{c}}'))}${O(' »')}, soit ${inline(O('{{a}} \\times {{c}}'))} ; le second est ` +
			`${inline('{{b}}')}. La multiplication est prioritaire : pas de parenthèses.`,
		`L’expression est ${inline('{{solution}}')}.`
	],
	[
		RULE_VOCAB_ORDER,
		`La phrase commence par ${B('« le produit »')} : la dernière opération est une ` +
			`multiplication. Son second facteur est la différence ${inline(O('{{b}} - {{c}}'))}, à ` +
			`calculer AVANT : on la met entre parenthèses.`,
		`L’expression est ${inline('{{solution}}')}.`
	],
	[
		RULE_VOCAB_ORDER,
		`La phrase commence par ${B('« la différence »')} : la dernière opération est une ` +
			`soustraction. Son second terme est le quotient ${inline(O('{{b}} : {{c}}'))} ; la division ` +
			`est prioritaire : pas de parenthèses.`,
		`L’expression est ${inline('{{solution}}')}.`
	],
	[
		RULE_VOCAB_ORDER,
		`La phrase commence par ${B('« le quotient »')} : la dernière opération est une division. ` +
			`Son dividende est la somme ${inline(O('{{a}} + {{c}}'))}, à calculer AVANT : on la met ` +
			`entre parenthèses.`,
		`L’expression est ${inline('{{solution}}')}.`
	]
];

// ============================================================================
// N-ABS
// ============================================================================

const ABS_226 = [
	RULE_ABS,
	`{{if:a<0|${inline(O('{{a}}'))} est négatif : sa valeur absolue est son opposé, ` +
		`${inline(`-\\left( ${O('{{a}}')} \\right) = {{solution}}`)}.|` +
		`${inline(O('{{a}}'))} est positif ou nul : sa valeur absolue est lui-même.}}`,
	alignBlock([`{\\left| ${O('{{a}}')} \\right|} &= {{solution}}`])
];

function absFixed(inner: string, negative: boolean, opposite: string): string[] {
	return [
		RULE_ABS,
		negative
			? `${inline(O(inner))} est négatif : sa valeur absolue est son opposé, ${inline(opposite)}.`
			: `${inline(O(inner))} est positif : sa valeur absolue est lui-même.`,
		alignBlock([`{\\left| ${O(inner)} \\right|} &= {{solution}}`])
	];
}

const ABS_D54 = [
	absFixed('\\dfrac{{{a}}}{{{b}}}', false, ''),
	absFixed('-\\dfrac{{{a}}}{{{b}}}', true, '\\dfrac{{{a}}}{{{b}}}'),
	absFixed('\\sqrt{{{c}}}', false, ''),
	absFixed('-\\sqrt{{{c}}}', true, '\\sqrt{{{c}}}'),
	absFixed('{{d}}', false, ''),
	absFixed('-{{d}}', true, '{{d}}')
];

// ============================================================================
// FONCTIONS AFFINES
// ============================================================================

const ROOT_2BD = (display: string): string[] => [
	RULE_ROOT,
	`On résout ${inline(`${display} = 0`)} : on isole ${inline(O('x'))}.`,
	alignBlock([
		`${display} &= 0`,
		`{{a}}${O('x')} &= {{eval:-(b)}}`,
		`${O('x')} &= \\dfrac{{{eval:-(b)}}}{{{a}}}`,
		`${O('x')} &= {{solution}}`
	]),
	`La fonction ${inline('f')} s’annule pour ${inline(G('x = {{solution}}'))}.`
];

/** PGCD, pour la racine en fraction irréductible */
function gcd(a: number, b: number): number {
	return b === 0 ? Math.abs(a) : gcd(b, a % b);
}

function rootLatex(a: number, b: number): string {
	const num = -b;
	if (num === 0) return '0';
	const g = gcd(num, a);
	let n = num / g;
	let d = a / g;
	if (d < 0) {
		n = -n;
		d = -d;
	}
	if (d === 1) return String(n);
	return n < 0 ? `-\\dfrac{${-n}}{${d}}` : `\\dfrac{${n}}{${d}}`;
}

/** bba95c2d : `f(x)=-6x+7` → coefficients */
function parseAffine(expression: string): { a: number; b: number } {
	const match = expression.replace(/\s/g, '').match(/^f\(x\)=([+-]?\d*)x([+-]\d+)?$/);
	if (!match) throw new Error(`fonction affine illisible : ${expression}`);
	const raw = match[1];
	const a = raw === '' || raw === '+' ? 1 : raw === '-' ? -1 : Number(raw);
	return { a, b: match[2] ? Number(match[2]) : 0 };
}

function signAffine(expression: string): string[] {
	const { a, b } = parseAffine(expression);
	const root = rootLatex(a, b);
	const positive = a > 0;
	const aText = a === 1 ? '1' : a === -1 ? '-1' : String(a);
	return [
		RULE_SIGN_AFF,
		`Ici ${inline(`a = ${O(aText)}`)} est ${positive ? 'positif' : 'négatif'} et ${inline('f')} ` +
			`s’annule en ${inline(`x_0 = ${B(root)}`)}. À droite de ${inline(B(root))}, ` +
			`${inline('f(x)')} est ${inline(G(`\\text{${positive ? 'positive' : 'négative'}}`))} ; ` +
			`à gauche, ${inline(G(`\\text{${positive ? 'négative' : 'positive'}}`))}.`,
		`Le bon tableau est donc :\n\n{{solution}}`
	];
}

const VOCAB_AFF_2D2 = [
	[
		RULE_VOCAB_AFF,
		`Le nombre ${inline(O('{{a}}'))} multiplie ${inline('x')} : c’est ${CONCLUSION_SOLUTION}.`
	],
	[
		RULE_VOCAB_AFF,
		`Le nombre ${inline(O('{{b}}'))} est seul, il ne multiplie pas ${inline('x')} : c’est ` +
			`${CONCLUSION_SOLUTION}.`
	],
	[
		RULE_VOCAB_AFF,
		`Le nombre ${inline(O('{{a}}'))} multiplie ${inline('x')} (même écrit en second) : c’est ` +
			`${CONCLUSION_SOLUTION}.`
	],
	[
		RULE_VOCAB_AFF,
		`Le nombre ${inline(O('{{b}}'))} est seul (même écrit en premier), il ne multiplie pas ` +
			`${inline('x')} : c’est ${CONCLUSION_SOLUTION}.`
	]
];

// ============================================================================
// N-LIM-OPS
// ============================================================================

const LIM_QUOTIENT_INF =
	'**Quotient de deux limites infinies.** $\\dfrac{\\infty}{\\infty}$ est une forme ' +
	'indéterminée : on ne peut pas conclure sans transformer l’expression.';
const LIM_PRODUCT_ZERO =
	'**Produit d’une limite infinie par une limite nulle.** $\\infty \\times 0$ est une forme ' +
	'indéterminée.';
const LIM_SUM_OPPOSITE =
	'**Somme de deux limites infinies.** Deux infinis de MÊME signe s’ajoutent (le résultat est cet ' +
	'infini) ; $(+\\infty) + (-\\infty)$ est une forme indéterminée. Une différence est la somme ' +
	'avec l’opposé : $(+\\infty) - (-\\infty) = (+\\infty) + (+\\infty)$.';
const LIM_SUM_FINITE =
	'**Somme d’une limite infinie et d’un nombre.** Ajouter un nombre fixe à une quantité ' +
	'infiniment grande ne change pas sa limite infinie.';
const LIM_FINITE_OVER_INF =
	'**Nombre (ou $0$) divisé par une limite infinie.** Diviser un nombre fixe par une quantité ' +
	'infiniment grande donne une quantité qui tend vers $0$.';
const LIM_OVER_ZERO =
	'**Division par une limite nulle.** Diviser par une quantité qui tend vers $0$ en gardant un ' +
	'signe ($0^+$ : positive, $0^-$ : négative) donne une limite infinie ; son signe suit la règle ' +
	'des signes.';
const LIM_PRODUCT_INF =
	'**Produit (ou quotient) avec une limite infinie.** Le résultat est infini (sauf avec $0$) ; ' +
	'son signe suit la règle des signes.';

type Lim = { rule: string; why: string };

const signsWhy = (same: boolean) =>
	`Les deux termes sont de ${inline(B(`\\text{${same ? 'même signe' : 'signes contraires'}}`))} : ` +
	`le résultat est ${inline(G(same ? '+\\infty' : '-\\infty'))}.`;
const FI_WHY = `C’est une ${inline(G('\\text{forme indéterminée}'))}.`;
const ZERO_WHY = `Le résultat tend vers ${inline(G('0'))}.`;

const LIM_07B: Lim[] = [
	{ rule: LIM_QUOTIENT_INF, why: FI_WHY },
	{ rule: LIM_QUOTIENT_INF, why: FI_WHY },
	{ rule: LIM_QUOTIENT_INF, why: FI_WHY },
	{ rule: LIM_QUOTIENT_INF, why: FI_WHY },
	{ rule: LIM_FINITE_OVER_INF, why: ZERO_WHY },
	{ rule: LIM_FINITE_OVER_INF, why: ZERO_WHY },
	{ rule: LIM_OVER_ZERO, why: signsWhy(true) },
	{ rule: LIM_OVER_ZERO, why: signsWhy(false) },
	{ rule: LIM_OVER_ZERO, why: signsWhy(false) },
	{ rule: LIM_OVER_ZERO, why: signsWhy(true) },
	{ rule: LIM_FINITE_OVER_INF, why: ZERO_WHY },
	{ rule: LIM_FINITE_OVER_INF, why: ZERO_WHY },
	{ rule: LIM_FINITE_OVER_INF, why: ZERO_WHY },
	{ rule: LIM_FINITE_OVER_INF, why: ZERO_WHY },
	{ rule: LIM_PRODUCT_INF, why: signsWhy(true) },
	{ rule: LIM_PRODUCT_INF, why: signsWhy(false) },
	{ rule: LIM_PRODUCT_INF, why: signsWhy(false) },
	{ rule: LIM_PRODUCT_INF, why: signsWhy(true) },
	{ rule: LIM_PRODUCT_ZERO, why: FI_WHY },
	{ rule: LIM_PRODUCT_ZERO, why: FI_WHY },
	{ rule: LIM_PRODUCT_INF, why: signsWhy(true) },
	{ rule: LIM_PRODUCT_INF, why: signsWhy(false) },
	{ rule: LIM_PRODUCT_INF, why: signsWhy(true) },
	{ rule: LIM_PRODUCT_INF, why: signsWhy(false) },
	{ rule: LIM_PRODUCT_INF, why: signsWhy(true) },
	{ rule: LIM_PRODUCT_INF, why: signsWhy(false) },
	{ rule: LIM_PRODUCT_INF, why: signsWhy(false) },
	{ rule: LIM_PRODUCT_INF, why: signsWhy(true) },
	{
		rule: LIM_SUM_OPPOSITE,
		why: `Deux infinis de même signe : le résultat est ${inline(G('+\\infty'))}.`
	},
	{ rule: LIM_SUM_OPPOSITE, why: `Deux infinis de signes contraires : ${FI_WHY}` },
	{
		rule: LIM_SUM_OPPOSITE,
		why: `Deux infinis de même signe : le résultat est ${inline(G('-\\infty'))}.`
	},
	{ rule: LIM_SUM_OPPOSITE, why: `Deux infinis de signes contraires : ${FI_WHY}` },
	{ rule: LIM_SUM_OPPOSITE, why: `C’est $(+\\infty) + (-\\infty)$ : ${FI_WHY}` },
	{
		rule: LIM_SUM_OPPOSITE,
		why: `C’est $(+\\infty) + (+\\infty)$ : le résultat est ${inline(G('+\\infty'))}.`
	},
	{ rule: LIM_SUM_OPPOSITE, why: `C’est $(-\\infty) + (+\\infty)$ : ${FI_WHY}` },
	{
		rule: LIM_SUM_OPPOSITE,
		why: `C’est $(-\\infty) + (-\\infty)$ : le résultat est ${inline(G('-\\infty'))}.`
	},
	{ rule: LIM_SUM_FINITE, why: `Le résultat est ${inline(G('+\\infty'))}.` },
	{ rule: LIM_SUM_FINITE, why: `Le résultat est ${inline(G('-\\infty'))}.` },
	{ rule: LIM_OVER_ZERO, why: signsWhy(true) },
	{ rule: LIM_OVER_ZERO, why: signsWhy(false) },
	{ rule: LIM_OVER_ZERO, why: signsWhy(false) },
	{ rule: LIM_OVER_ZERO, why: signsWhy(true) }
];

const LIM_STEPS = LIM_07B.map(({ rule, why }) => [rule, why, 'Réponse : {{solution}}']);

// ============================================================================
// ENTRIES
// ============================================================================

const SIGN_AFF_EXPRESSIONS = [
	'f(x)=-6x+7',
	'f(x)=-9x-1',
	'f(x)=-5x+9',
	'f(x)=3x+3',
	'f(x)=7x-8',
	'f(x)=-2x-4',
	'f(x)=6x+8',
	'f(x)=4x+9',
	'f(x)=-7x+2',
	'f(x)=2x+5',
	'f(x)=8x-1',
	'f(x)=-4x',
	'f(x)=-5x-1',
	'f(x)=-x+7',
	'f(x)=x-8',
	'f(x)=-7x+6',
	'f(x)=x',
	'f(x)=-3x+4',
	'f(x)=-5x-5',
	'f(x)=5x-7'
];

export const VAGUE4_ENTRIES: Vague4Entry[] = [
	// N-OPPOSE-EXPR
	entry(
		'aeb86af9-7bf1-440a-be17-735a41b5ce46',
		'N-OPPOSE-EXPR',
		'draft',
		shared(opposeSingle('{{eval:pq}}'), [OPERATION_IN_TEXT_NOTE])
	),
	entry(
		'843c3186-afc6-4ccd-83f7-beab64d3e420',
		'N-OPPOSE-EXPR',
		'draft',
		shared(OPPOSE_843, [OPERATION_IN_TEXT_NOTE])
	),
	entry(
		'34e569e7-7834-456f-8e48-65b2a1183030',
		'N-OPPOSE-EXPR',
		'draft',
		byVariation(OPPOSE_34E, [OPERATION_IN_TEXT_NOTE])
	),
	// N-PARENTH
	entry(
		'c32ebff9-7e10-400e-bc06-c376f6991ea8',
		'N-PARENTH',
		'draft',
		byVariation(PARENTH_C32, [LITERAL_NOTE])
	),
	// N-IDREM
	entry(
		'a6a6c491-be89-4a81-8a9d-6412c2396f2d',
		'N-IDREM',
		'draft',
		byVariation(
			[
				idremDevelop('{{a}}', '{{b}}', false),
				idremDevelop('{{a}}', '{{b}}', true),
				idremDevelop('{{b}}', '{{a}}', false),
				idremDevelop('{{b}}', '{{a}}', true)
			],
			[LITERAL_NOTE]
		)
	),
	entry(
		'ff8082bd-fe4d-4747-bddc-19eced72839f',
		'N-IDREM',
		'draft',
		byVariation(IDREM_FF8, [
			LITERAL_NOTE,
			'⚑ Modèle : la variable `b` est déclarée mais jamais utilisée.'
		])
	),
	// N-PUISS-DEF
	entry(
		'7410800b-83d3-40a3-8a2d-dc4b16a4679d',
		'N-PUISS-DEF',
		'draft',
		byVariation(
			[2, 3].map((n) => powerFromProduct('{{p}}', n)),
			[LITERAL_NOTE]
		)
	),
	entry(
		'd9f2003b-d028-4bcb-b5ab-2fe93933c5b4',
		'N-PUISS-DEF',
		'draft',
		byVariation(
			[2, 3, 4, 5, 6, 7].map((n) => powerFromProduct('{{a}}', n)),
			[LITERAL_NOTE]
		)
	),
	entry(
		'3fe98dd9-7545-4287-8301-7d87e8c1976f',
		'N-PUISS-DEF',
		'draft',
		byVariation(
			[2, 3, 4, 5, 6, 7].map((n) => productFromPower('{{a}}', n)),
			[LITERAL_NOTE]
		)
	),
	// N-ECRIT-PRODUIT
	entry(
		'077c01e0-0c8a-4ff9-a57e-279ec35659ec',
		'N-ECRIT-PRODUIT',
		'draft',
		byVariation(WRITE_077, [LITERAL_NOTE])
	),
	entry(
		'33b1b496-0de3-47bb-b19a-ff016fd08ef5',
		'N-ECRIT-PRODUIT',
		'draft',
		byVariation(
			[
				write33b('r', 'p', 'q', true),
				write33b('r', 'p', 's', true),
				write33b('t', 'p', 'q', true),
				write33b('t', 'p', 's', true),
				write33b('t', 'p', 'q', false),
				write33b('t', 'p', 's', false)
			],
			[
				LITERAL_NOTE,
				'⚑ Modèle : variations 0-1, le facteur `r` est une LETTRE (a|b|c|x|y) — `r` peut valoir `p`.'
			]
		)
	),
	// N-NEUTRE-ABS
	entry(
		'6fbf1ab2-c476-4a6c-bd98-ce2c58d8c459',
		'N-NEUTRE-ABS',
		'draft',
		byVariation(NEUTRAL_6FB, [LITERAL_NOTE])
	),
	entry(
		'1af7263e-bb3a-4e81-8503-a08b7c31db25',
		'N-NEUTRE-ABS',
		'published',
		byVariation([neutralHole(50), neutralHole(25)])
	),
	// N-FACT-COMMUN
	entry(
		'294c4316-d2c9-4894-9c3c-c2b24fdffc99',
		'N-FACT-COMMUN',
		'draft',
		byVariation(COMMON_294, [FACTOR_NOTE])
	),
	entry(
		'e66089e0-b7bd-49fe-a968-9a8df3d325fd',
		'N-FACT-COMMUN',
		'draft',
		byVariation(COMMON_E66, [FACTOR_NOTE])
	),
	// N-VOCAB-OP
	entry(
		'5d515eb1-c8f8-4678-b4bd-f9ab3f34713f',
		'N-VOCAB-OP',
		'published',
		byVariation(VOCAB_5D5, [NO_BLOCK_NOTE])
	),
	entry(
		'78feafed-650f-44e0-a2c3-1e677809722b',
		'N-VOCAB-OP',
		'published',
		byVariation(VOCAB_78F, [NO_BLOCK_NOTE])
	),
	// N-ABS
	entry('226e5b3b-fad4-4c99-92cb-42e123014055', 'N-ABS', 'draft', shared(ABS_226)),
	entry('d540f96e-6656-434f-bdbd-72347a2232a9', 'N-ABS', 'draft', byVariation(ABS_D54)),
	// N-PUISS-NEG
	entry('65110463-afc0-4dfd-91b3-977fd7402de7', 'N-PUISS-NEG', 'draft', byVariation(NEG_POWER_651)),
	entry(
		'15368b02-73cc-4f0d-b978-fa0d0848eb03',
		'N-PUISS-NEG',
		'draft',
		shared(NEG_POWER_153, [LITERAL_NOTE])
	),
	// N-PUISS10
	entry('ac0e5b62-b6bc-4a82-85c4-d1b25a9d4d69', 'N-PUISS10', 'draft', shared(POWER10_AC0)),
	entry('ae8ad17a-39ad-486b-aea5-6d1a61f2a885', 'N-PUISS10', 'draft', shared(POWER10_AE8)),
	// N-NOTSCI
	entry('953574d4-e345-4a5d-9435-7faecc3ff7ac', 'N-NOTSCI', 'draft', shared(SCI_953)),
	// Fonctions affines
	entry(
		'2bdb3db6-8ef7-43af-aa7a-2332e34d2a01',
		'N-RACINE-AFF',
		'draft',
		byVariation(
			[ROOT_2BD('{{a}}x{{eval:b;+}}'), ROOT_2BD('{{b}}{{eval:a;+}}x')],
			[
				EQUATION_NOTE,
				'Rédigée à la main : le pipeline pedagogical-solve/linear (mode B) produit des étapes, pas le style maison `align`.'
			]
		)
	),
	entry(
		'bba95c2d-033b-4648-944d-102a3c2c386d',
		'N-SIGNE-AFF',
		'draft',
		byVariation(SIGN_AFF_EXPRESSIONS.map(signAffine), [
			'Coefficients relus dans la variable d’expression de chaque variation (fonctions fixes).'
		])
	),
	entry('2d29792b-f7d7-4950-90db-9530ca3b02c4', 'N-VOCAB-AFF', 'draft', byVariation(VOCAB_AFF_2D2)),
	// N-LIM-OPS
	entry('07bce646-6a88-4b7c-aaf6-fe07ffa63ed6', 'N-LIM-OPS', 'draft', byVariation(LIM_STEPS))
];

// ============================================================================
// LOTS
// ============================================================================

/** Modèles CLOS : rédigés mais rouges au vérificateur, hors de tout lot importable */
export const CLOTURE: { templateId: string; code: string; reason: string }[] = [
	...[
		'aeb86af9-7bf1-440a-be17-735a41b5ce46',
		'843c3186-afc6-4ccd-83f7-beab64d3e420',
		'34e569e7-7834-456f-8e48-65b2a1183030'
	].map((templateId) => ({ templateId, code: 'N-OPPOSE-EXPR', reason: OPERATION_IN_TEXT_NOTE })),
	...['294c4316-d2c9-4894-9c3c-c2b24fdffc99', 'e66089e0-b7bd-49fe-a968-9a8df3d325fd'].map(
		(templateId) => ({ templateId, code: 'N-FACT-COMMUN', reason: FACTOR_NOTE })
	),
	...['5d515eb1-c8f8-4678-b4bd-f9ab3f34713f', '78feafed-650f-44e0-a2c3-1e677809722b'].map(
		(templateId) => ({ templateId, code: 'N-VOCAB-OP', reason: NO_BLOCK_NOTE })
	),
	{
		templateId: '2bdb3db6-8ef7-43af-aa7a-2332e34d2a01',
		code: 'N-RACINE-AFF',
		reason: EQUATION_NOTE
	}
];

const isClosed = (entry: LotEntry) => CLOTURE.some((c) => c.templateId === entry.templateId);

export const VAGUE4_DRAFTS_LOT: Lot = {
	name: 'vague4-brouillons',
	description: 'Vague 4, modèles en brouillon verts au vérificateur (19)',
	entries: VAGUE4_ENTRIES.filter((e) => e.status === 'draft' && !isClosed(e))
};

export const VAGUE4_PUBLISHED_LOT: Lot = {
	name: 'vague4-publies',
	description: 'Vague 4, modèle publié vert au vérificateur (1af7263e)',
	entries: VAGUE4_ENTRIES.filter((e) => e.status === 'published' && !isClosed(e))
};
