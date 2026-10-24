/**
 * Atelier — « Ouvrir dans Python » : un objet traduit en code Python
 *
 * Le pont à sens unique décidé le 2026-10-24 (`docs/systeme/atelier.md`,
 * Décisions ; phase 0 `docs/wip/atelier-python-phase0.md`) : pas d'état
 * partagé, l'élève reçoit du code qu'il lit et modifie dans `/python`.
 *
 * La règle : le code qu'un élève de lycée écrirait, ou qu'un sujet de bac lui
 * donnerait à compléter — `def f(x): return …`, une boucle `for` pour une
 * récurrence, `from math import …` pour les seuls noms utilisés.
 *
 * ⚠️ Traduit depuis l'ARBRE de la définition, jamais depuis son texte : `ax`
 * est `a·x`, et `sin` n'est pas `s·i·n`. Ce qui ne se traduit pas sans perte
 * est REFUSÉ avec sa raison, jamais approché (une valeur exacte reste exacte).
 *
 * @module atelier/to-python
 */

import type { Atelier } from './atelier.svelte';
import type { AtelierObject, FunctionObject, ListObject, SequenceObject } from './types';
import { isQualitative } from './types';
import { derivativeOf, reciprocalOf } from './names';
import { astOf, readListValue } from './parse';
import type { FunctionNode, MathNode } from '$lib/mathAST/types';
import { inverseNotationAsFunction } from '$lib/mathAST/common/function-power';
import { INDEX_VARIABLE } from '$lib/grapheur/sequence';
import LZString from 'lz-string';

// =============================================================================
// Types
// =============================================================================

export type PythonResult =
	{ readonly ok: true; readonly code: string } | { readonly ok: false; readonly message: string };

/** Un refus levé pendant la traduction, rattrapé par `pythonOf`. */
class Untranslatable extends Error {}

/** Ce que la traduction d'un objet accumule : imports, objets cités, dans l'ordre. */
interface Context {
	readonly atelier: Atelier;
	readonly imports: Set<string>;
	/** Les objets déjà écrits (ou en cours), pour n'écrire chacun qu'une fois. */
	readonly seen: Set<string>;
	/** Les blocs écrits, dépendances d'abord. */
	readonly blocks: { readonly kind: 'value' | 'def'; readonly code: string }[];
}

/** Comment écrire les noms libres d'UNE expression. */
interface Scope {
	/** La variable de l'expression (`x`, `n`) et son nom écrit (`t`, `k`). */
	readonly variable?: { readonly name: string; readonly as: string };
	/** Dans une récurrence : la suite elle-même, dont le terme de rang n est `u`. */
	readonly recurrenceOf?: string;
}

// =============================================================================
// Constantes
// =============================================================================

/** Les fonctions de l'atelier et leur nom Python (module `math`, sauf `abs`). */
const PYTHON_FUNCTIONS: Readonly<Record<string, string>> = {
	sin: 'sin',
	cos: 'cos',
	tan: 'tan',
	arcsin: 'asin',
	arccos: 'acos',
	arctan: 'atan',
	sinh: 'sinh',
	cosh: 'cosh',
	tanh: 'tanh',
	exp: 'exp',
	ln: 'log',
	log: 'log10',
	log10: 'log10',
	log2: 'log2',
	sqrt: 'sqrt',
	floor: 'floor',
	ceil: 'ceil',
	abs: 'abs'
};

/** Fonctions natives de Python : rien à importer. */
const BUILTINS: ReadonlySet<string> = new Set(['abs']);

/** Priorités Python : plus le nombre est grand, plus l'opération lie fort. */
const SUM = 1;
const PRODUCT = 2;
const UNARY = 3;
const POWER = 4;
const ATOM = 5;

const INDENT = '    ';

/** La limite de `/python?code=` (`pythonStore.generateShareUrl`), en caractères compressés. */
const MAX_COMPRESSED_LENGTH = 2000;

// =============================================================================
// Entrée
// =============================================================================

/**
 * Le code Python d'un objet de l'atelier, avec ce qu'il cite (curseurs,
 * fonctions) écrit avant lui, ou la raison du refus.
 */
export function pythonOf(atelier: Atelier, name: string): PythonResult {
	const context: Context = { atelier, imports: new Set(), seen: new Set(), blocks: [] };
	try {
		write(context, name);
	} catch (error) {
		if (error instanceof Untranslatable) return { ok: false, message: error.message };
		throw error;
	}
	return { ok: true, code: assemble(context) };
}

/**
 * L'adresse de `/python` qui ouvre ce code (`?code=`, compressé comme le partage
 * du playground), ou le refus quand elle serait trop longue.
 */
export function pythonPageOf(
	code: string
): { readonly ok: true; readonly url: string } | { readonly ok: false; readonly message: string } {
	const compressed = LZString.compressToEncodedURIComponent(code);
	if (compressed.length > MAX_COMPRESSED_LENGTH) {
		return { ok: false, message: 'Trop long pour être ouvert dans Python.' };
	}
	return { ok: true, url: `/python?code=${compressed}` };
}

/** Imports en tête, puis les valeurs groupées, puis chaque définition. */
function assemble(context: Context): string {
	const parts: string[] = [];
	if (context.imports.size > 0) {
		parts.push(`from math import ${[...context.imports].sort().join(', ')}\n`);
	}
	let values: string[] = [];
	for (const block of context.blocks) {
		if (block.kind === 'value') {
			values.push(block.code);
			continue;
		}
		if (values.length > 0) parts.push(values.join(''));
		values = [];
		parts.push(block.code);
	}
	if (values.length > 0) parts.push(values.join(''));
	return parts.join('\n');
}

// =============================================================================
// Les objets
// =============================================================================

/** Écrire un objet (une seule fois), ses dépendances d'abord. */
function write(context: Context, name: string): void {
	if (context.seen.has(name)) return;
	context.seen.add(name);

	const object = context.atelier.get(name);
	if (object === undefined) throw new Untranslatable(`« ${name} » n'existe pas dans l'atelier.`);
	if (derivativeOf(name) !== null) {
		throw new Untranslatable(
			'Une dérivée ne s’ouvre pas dans Python : copie sa formule dans une nouvelle fonction.'
		);
	}
	if (reciprocalOf(name) !== null) {
		throw new Untranslatable('Une réciproque ne s’ouvre pas dans Python.');
	}
	refuseBlocked(object);

	switch (object.kind) {
		case 'value':
			writeValue(context, object);
			return;
		case 'function':
			writeFunction(context, object);
			return;
		case 'sequence':
			writeSequence(context, object);
			return;
		case 'list':
			writeList(context, object);
			return;
		default:
			throw new Untranslatable('Les points et les courbes ne s’ouvrent pas dans Python.');
	}
}

/** Un objet qui ne peut rien produire n'a rien à traduire : son message dit pourquoi. */
function refuseBlocked(object: AtelierObject): void {
	if (object.status === 'incomplete') {
		throw new Untranslatable(`« ${object.name} » n’a pas encore de définition.`);
	}
	if (object.status === 'pending' || object.status === 'error') {
		throw new Untranslatable(object.message ?? `« ${object.name} » ne peut rien produire.`);
	}
}

function treeOf(context: Context, object: AtelierObject): MathNode {
	const ast = context.atelier.definitionAst(object);
	if (ast === null) throw new Untranslatable(`« ${object.definition} » ne se lit pas.`);
	return ast;
}

function writeValue(context: Context, object: AtelierObject): void {
	if (object.kind === 'value' && object.unit !== undefined) {
		throw new Untranslatable(
			`« ${object.name} » est une grandeur en ${object.unit} : Python ne connaît pas les unités.`
		);
	}
	const expression = python(context, treeOf(context, object), {});
	// Un curseur : un NOMBRE tapé, que l'élève fait glisser. `b = 3a + 1` a un
	// curseur aussi, mais sa valeur suit `a` : pas de commentaire.
	const isSlider = object.kind === 'value' && readListValue(object.definition) !== null;
	const comment = isSlider ? '  # curseur de l’atelier' : '';
	context.blocks.push({ kind: 'value', code: `${object.name} = ${expression}${comment}\n` });
}

function writeFunction(context: Context, object: FunctionObject): void {
	if (object.interval !== undefined) {
		throw new Untranslatable(
			`« ${object.name} » est définie sur un intervalle : Python ne garde pas l’intervalle.`
		);
	}
	const letter = object.letter ?? object.variable;
	const body = python(context, treeOf(context, object), {
		variable: { name: object.variable, as: letter }
	});
	context.blocks.push({
		kind: 'def',
		code: `def ${object.name}(${letter}):\n${INDENT}return ${body}\n`
	});
}

function writeSequence(context: Context, object: SequenceObject): void {
	const ast = treeOf(context, object);
	if (object.mode === 'explicit') {
		const body = python(context, ast, { variable: { name: INDEX_VARIABLE, as: INDEX_VARIABLE } });
		context.blocks.push({
			kind: 'def',
			code: `def ${object.name}(${INDEX_VARIABLE}):\n${INDENT}return ${body}\n`
		});
		return;
	}

	// Récurrence : la boucle des sujets de bac, le terme courant porte le nom de la suite
	const first = firstTermCode(context, object);
	const step = python(context, ast, {
		variable: { name: INDEX_VARIABLE, as: 'k' },
		recurrenceOf: object.name
	});
	const range =
		object.firstIndex === 0 ? INDEX_VARIABLE : `${object.firstIndex}, ${INDEX_VARIABLE}`;
	const u = object.name;
	context.blocks.push({
		kind: 'def',
		code:
			`def ${u}(${INDEX_VARIABLE}):\n` +
			`${INDENT}${u} = ${first}\n` +
			`${INDENT}for k in range(${range}):\n` +
			`${INDENT}${INDENT}${u} = ${step}\n` +
			`${INDENT}return ${u}\n`
	});
}

/** Le premier terme : un nombre écrit, ou le nom d'une valeur (qui part avec la suite). */
function firstTermCode(context: Context, object: SequenceObject): string {
	const cited = context.atelier.get(object.firstTerm);
	if (cited !== undefined) {
		write(context, cited.name);
		return cited.name;
	}
	const ast = astOf(object.firstTerm, 'text');
	if (ast === null)
		throw new Untranslatable(`Le premier terme « ${object.firstTerm} » ne se lit pas.`);
	return python(context, ast, {});
}

function writeList(context: Context, object: ListObject): void {
	if (isQualitative(object)) {
		throw new Untranslatable(
			`« ${object.name} » contient des mots : seule une liste de nombres s’ouvre dans Python.`
		);
	}
	const entries = object.definition.split(';').map((entry) => entry.trim());
	const filled = entries.filter((entry) => entry !== '');
	// Les cases vides finales ne sont pas rangées : seules celles du milieu comptent
	const gaps = entries.length - filled.length;
	// Une case calculée par une formule (`=A1+1`) : sa valeur, la formule cite la grille
	const computed = filled.some((entry) => entry.startsWith('=') || readListValue(entry) === null);
	const items = computed
		? object.values.map((value) => String(value))
		: filled.map((entry) => listEntry(context, entry));
	const note =
		gaps === 0
			? ''
			: `# ${gaps} case${gaps > 1 ? 's' : ''} vide${gaps > 1 ? 's' : ''} retirée${gaps > 1 ? 's' : ''}\n`;
	context.blocks.push({ kind: 'value', code: `${note}${object.name} = [${items.join(', ')}]\n` });
}

/** Une entrée de liste : `0,5` → `0.5`, `1/4` reste `1/4`. */
function listEntry(context: Context, entry: string): string {
	const ast = astOf(entry.replace(/(\d),(\d)/g, '$1.$2'), 'text');
	if (ast === null) throw new Untranslatable(`« ${entry} » ne se lit pas.`);
	return python(context, ast, {});
}

// =============================================================================
// Les expressions
// =============================================================================

/** L'expression Python d'un arbre. */
function python(context: Context, node: MathNode, scope: Scope): string {
	return expression(context, node, scope).code;
}

/** Une expression et sa priorité, pour ne mettre que les parenthèses utiles. */
interface Written {
	readonly code: string;
	readonly precedence: number;
}

/** `inner` entre parenthèses s'il lie moins fort que `needed`. */
function wrap(inner: Written, needed: number): string {
	return inner.precedence < needed ? `(${inner.code})` : inner.code;
}

function expression(context: Context, node: MathNode, scope: Scope): Written {
	const sub = (child: MathNode) => expression(context, child, scope);

	switch (node.type) {
		case 'number':
			return { code: node.value.replace(',', '.'), precedence: ATOM };
		case 'variable':
			return { code: variableName(context, node.name, scope), precedence: ATOM };
		case 'constant':
			context.imports.add(node.constant === 'pi' ? 'pi' : 'e');
			return { code: node.constant === 'pi' ? 'pi' : 'e', precedence: ATOM };
		case 'delimiter':
			return sub(node.content);
		case 'positive':
			return sub(node.operand);
		case 'addition': {
			const right = sub(node.right);
			// `a + (-b)` s'écrit `a + (-b)` : Python le lit, et l'élève voit son écriture
			return {
				code: `${wrap(sub(node.left), SUM)} + ${wrap(right, right.precedence === UNARY ? ATOM : SUM)}`,
				precedence: SUM
			};
		}
		case 'subtraction':
			return {
				code: `${wrap(sub(node.left), SUM)} - ${wrap(sub(node.right), PRODUCT)}`,
				precedence: SUM
			};
		case 'multiplication':
			return {
				code: `${wrap(sub(node.left), PRODUCT)}*${wrap(sub(node.right), UNARY + 1)}`,
				precedence: PRODUCT
			};
		case 'division':
			return {
				code: `${wrap(sub(node.numerator), PRODUCT)}/${wrap(sub(node.denominator), UNARY + 1)}`,
				precedence: PRODUCT
			};
		case 'opposite':
			return { code: `-${wrap(sub(node.operand), PRODUCT)}`, precedence: UNARY };
		case 'percentage':
			return { code: `${wrap(sub(node.operand), PRODUCT)}/100`, precedence: PRODUCT };
		case 'superscript':
			// `e^u` s'écrit `exp(u)` : l'écriture des sujets, et `e**u` demanderait d'importer e
			if (node.base.type === 'constant' && node.base.constant !== 'pi') {
				context.imports.add('exp');
				return { code: `exp(${python(context, node.superscript, scope)})`, precedence: ATOM };
			}
			// `**` lie plus fort que le moins unaire, à droite : `(-x)**2`, `2**-x`
			return {
				code: `${wrap(sub(node.base), ATOM)}**${wrap(sub(node.superscript), UNARY)}`,
				precedence: POWER
			};
		case 'subscript':
			return { code: subscripted(context, node, scope), precedence: ATOM };
		case 'function':
			return { code: call(context, node, scope), precedence: ATOM };
		case 'piecewise':
			throw new Untranslatable('Une fonction par morceaux ne s’ouvre pas dans Python.');
		default:
			throw new Untranslatable(`Cette écriture ne s’ouvre pas dans Python (${node.type}).`);
	}
}

/** Une lettre : la variable de l'expression, ou un objet cité (écrit avant). */
function variableName(context: Context, name: string, scope: Scope): string {
	if (scope.variable !== undefined && name === scope.variable.name) return scope.variable.as;
	if (context.atelier.get(name) === undefined) {
		throw new Untranslatable(`« ${name} » n'a pas de valeur dans l'atelier.`);
	}
	write(context, name);
	return name;
}

/**
 * `u_n` : le terme courant dans une récurrence ; `v_n`, `v_{n+1}` : l'appel d'une
 * autre suite ; `a_1` : un nom d'objet.
 */
function subscripted(
	context: Context,
	node: Extract<MathNode, { type: 'subscript' }>,
	scope: Scope
): string {
	if (node.base.type !== 'variable') {
		throw new Untranslatable('Cette écriture indicée ne s’ouvre pas dans Python.');
	}
	const base = node.base.name;
	const index = node.subscript;
	if (index.type === 'number' && /^\d+$/.test(index.value)) {
		const name = `${base}_${index.value}`;
		if (context.atelier.get(name) !== undefined) {
			write(context, name);
			return name;
		}
	}
	if (scope.recurrenceOf === base) return currentTerm(base, index);
	if (context.atelier.get(base) === undefined) {
		throw new Untranslatable(`« ${base} » n'existe pas dans l'atelier.`);
	}
	write(context, base);
	return `${base}(${python(context, index, scope)})`;
}

/** Le terme de rang n d'une récurrence : seul `u_n` / `u(n)` est permis (ordre 1). */
function currentTerm(name: string, index: MathNode): string {
	if (index.type !== 'variable' || index.name !== INDEX_VARIABLE) {
		throw new Untranslatable(
			`Seul « ${name}(n) » est accepté : une récurrence d'ordre 1 ne décale pas le rang.`
		);
	}
	return name;
}

/** Un appel : une fonction usuelle (importée), ou un objet de l'atelier. */
function call(context: Context, node: FunctionNode, scope: Scope): string {
	const reciprocal = inverseNotationAsFunction(node);
	if (reciprocal !== null && reciprocal !== undefined) return python(context, reciprocal, scope);
	if (node.derivativeOrder !== undefined || node.isInverse) {
		throw new Untranslatable(
			'Une dérivée ou une réciproque citée ne s’ouvre pas dans Python : écris sa formule.'
		);
	}

	const args = () => node.args.map((arg) => python(context, arg, scope)).join(', ');
	const power = (code: string) =>
		node.power === undefined
			? code
			: `${code}**${wrap(expression(context, node.power, scope), UNARY)}`;

	// Un objet de l'atelier : f(x), u(n) — ou le terme courant d'une récurrence
	if (scope.recurrenceOf === node.name && node.args.length === 1) {
		return power(currentTerm(node.name, node.args[0]));
	}
	if (context.atelier.get(node.name) !== undefined) {
		write(context, node.name);
		return power(`${node.name}(${args()})`);
	}

	if (node.base !== undefined) {
		// log en base b : log(x, b) ; racine n-ième : pas d'écriture Python sans perte
		if (node.name === 'log' || node.name === 'ln') {
			context.imports.add('log');
			return power(`log(${args()}, ${python(context, node.base, scope)})`);
		}
		throw new Untranslatable('Une racine n-ième ne s’ouvre pas dans Python.');
	}

	const pythonName = PYTHON_FUNCTIONS[node.name];
	if (pythonName === undefined) {
		throw new Untranslatable(`La fonction « ${node.name} » ne s’ouvre pas dans Python.`);
	}
	if (!BUILTINS.has(pythonName)) context.imports.add(pythonName);
	return power(`${pythonName}(${args()})`);
}
