/**
 * Structure d'une expression — types
 * ==================================
 *
 * L'arbre de structure est l'arbre que voit l'élève, pas l'arbre binaire du
 * parseur : une somme a n termes, un produit n facteurs, la sous-expression
 * parenthésée inclut ses parenthèses. Chaque nœud est une « sous-expression »
 * (vocabulaire de l'élève, CONTEXT.md) ; le mot « nœud » reste dans le code.
 */
import type { Sign } from '../flatten';
import type { MathNode, RelationType } from '../types';

// Types
/** Genre d'une sous-expression */
export type StructureKind =
	| 'sum'
	| 'difference'
	| 'product'
	| 'quotient'
	| 'opposite'
	| 'power'
	| 'root'
	| 'function'
	| 'parentheses'
	| 'relation'
	| 'number'
	| 'letter'
	/** Longueur d'un segment (`AB`, mode `capitalPairs: 'length'`) : un bloc, comme une lettre */
	| 'length'
	| 'constant'
	/** Tout le reste (grandeur, indice, factorielle, limite…) : un bloc sans sous-structure */
	| 'other';

/** Rôle d'une sous-expression dans celle qui la contient */
export type StructureRole =
	| 'term'
	| 'factor'
	/** Fraction `\frac` */
	| 'numerator'
	| 'denominator'
	/** Quotient en ligne (`÷`, `/`, `:`) */
	| 'dividend'
	| 'divisor'
	/** Ce dont on prend l'opposé */
	| 'operand'
	| 'base'
	| 'exponent'
	| 'radicand'
	| 'index'
	/** Argument d'une fonction appliquée */
	| 'argument'
	/** Contenu de parenthèses */
	| 'content'
	/** Membres d'une relation à deux membres */
	| 'left-side'
	| 'right-side'
	/** Membre d'un encadrement (`1 < x < 3`) */
	| 'side';

interface StructureNodeBase {
	/** Identifiant stable : rang dans `ExpressionStructure.nodes` (ordre préfixe) */
	readonly id: number;
	readonly parent: number | null;
	/** `null` pour l'expression entière */
	readonly role: StructureRole | null;
	/** Identifiants des sous-expressions directes, dans l'ordre de lecture */
	readonly children: readonly number[];
	/** Nœud de l'AST représenté (une somme aplatie : la racine de la chaîne) */
	readonly ast: MathNode;
	/** LaTeX de la sous-expression, avec les marqueurs de ses descendants */
	readonly latex: string;
}

/**
 * Somme aplatie. À l'écran, les signes appartiennent à la somme (ils sont hors
 * des marqueurs des termes) ; `signs[i]` est le signe du terme `children[i]`,
 * pour la lecture : `5 − 3 + x` → termes 5, 3, x, signes +, −, +.
 * `difference` : exactement deux termes, le second soustrait (`5 − 3`).
 */
export interface SumStructureNode extends StructureNodeBase {
	readonly kind: 'sum' | 'difference';
	readonly signs: readonly Sign[];
}

/** Relation ou encadrement : `relations[i]` sépare les membres i et i + 1 */
export interface RelationStructureNode extends StructureNodeBase {
	readonly kind: 'relation';
	readonly relations: readonly RelationType[];
}

export interface PlainStructureNode extends StructureNodeBase {
	readonly kind: Exclude<StructureKind, 'sum' | 'difference' | 'relation'>;
}

export type StructureNode = SumStructureNode | RelationStructureNode | PlainStructureNode;

export interface ExpressionStructure {
	/**
	 * LaTeX de l'expression où chaque sous-expression est enveloppée dans
	 * `\class{ubs-n<id>}{…}`, imbriqués comme l'arbre (sauf l'exposant d'une base
	 * qui finit par un délimiteur, `(x + 1)²` : logé dans le marqueur de sa base
	 * pour que MathLive le place comme l'écriture usuelle). Rendu identique à
	 * `toLatex` de l'expression.
	 */
	readonly latex: string;
	readonly nodes: readonly StructureNode[];
	/** Identifiant de l'expression entière (toujours 0) */
	readonly root: number;
}

/**
 * - `empty` : rien à montrer (A12) ;
 * - `unrecognized` : expression non reconnue ou incomplète (A13) ;
 * - `figureName` : un nom de figure (`ABC`, mode longueur) n'a pas de lecture ;
 *   `message` dit pourquoi (décision Q-A du chantier « longueurs de segments ») ;
 * - `ok` : la structure.
 */
export type StructureResult =
	| { readonly status: 'empty' }
	| { readonly status: 'unrecognized' }
	| { readonly status: 'figureName'; readonly message: string }
	| { readonly status: 'ok'; readonly structure: ExpressionStructure };
