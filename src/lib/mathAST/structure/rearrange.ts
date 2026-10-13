/**
 * Structure d'une expression — déplacer une partie dans son groupe
 * ================================================================
 *
 * Le glisser-déposer de l'outil « Structure d'une expression » : un terme se
 * déplace dans sa somme, un facteur dans son produit, un membre d'une égalité
 * de l'autre côté du « = ». Fonctions pures sur le LaTeX marqué d'une structure
 * (`\class{ubs-n<id>}{…}`) : les marqueurs de toutes les sous-expressions
 * restent en place, la formule réécrite reste explorable.
 *
 * Spécification (section E) et décisions de David (G1 à G11) :
 * `docs/systeme/mathast/structure-expression.md`.
 */
import type { Sign } from '../flatten';
import { MARKER_PREFIX, stripMarkers } from './markers';
import type { ExpressionStructure, StructureNode } from './types';

// Types
/** Une partie du groupe, telle qu'elle est écrite (marqueur compris) */
export interface MovablePart {
	readonly id: number;
	/** Signe d'un terme dans sa somme ; toujours `+` pour un facteur ou un membre */
	readonly sign: Sign;
	/** `\class{ubs-n<id>}{…}` */
	readonly marked: string;
	/**
	 * Écrite entre parenthèses par l'écriture usuelle (`toLatex`), pas tapées :
	 * `2 × (−3)` saisi `2×-3`. Elles la suivent partout.
	 */
	readonly wrapped: boolean;
	/**
	 * Quotient en ligne (`12 : 3`, `x ÷ 2`) : facteur d'un produit posé ailleurs
	 * qu'en tête, il prend des parenthèses (`2 × 12 : 3` se relirait `(2 × 12) : 3`).
	 */
	readonly inlineQuotient: boolean;
}

/** Une somme et ses termes, un produit et ses facteurs, une égalité et ses deux membres */
export interface MovableGroup {
	readonly kind: 'sum' | 'product' | 'equality';
	readonly id: number;
	/** Dans l'ordre d'écriture */
	readonly parts: readonly MovablePart[];
	/** Signe de multiplication là où il en faut un : `\cdot` si le produit l'emploie, sinon `\times` */
	readonly timesSign: string;
	/** Élève de 6e ou avant : le signe de multiplication est toujours écrit (E5.4) */
	readonly alwaysTimes: boolean;
}

export interface RearrangeOptions {
	/**
	 * Élève de 6e ou avant (`needsParenthesesAdvice`) : pas de terme négatif, une
	 * somme qui contient une soustraction est figée (G6) ; pas de calcul
	 * littéral, le signe × est toujours écrit (E5.4). Absent : 5e et après.
	 */
	readonly beforeFifthGrade?: boolean;
}

/** Pendant le glisser : un espace (en em) avant la partie k, et la partie saisie */
export interface GroupLayout {
	/** `gaps[k]` : avant la partie k ; `gaps[parts.length]` : à la fin ; 0 ou absent : rien */
	readonly gaps?: readonly number[];
	/** LaTeX de la partie saisie (marqueurs retirés) : donne sa hauteur aux espaces */
	readonly phantom?: string;
}

/** Position d'un marqueur dans un LaTeX : `start` … `{` contenu `}` … `end` */
export interface MarkerBlock {
	readonly start: number;
	readonly contentStart: number;
	readonly contentEnd: number;
	readonly end: number;
}

// Constantes
/** Classe d'un espace ouvert pendant le glisser : `ubs-gap<place>` */
export const GAP_CLASS_PREFIX = 'ubs-gap';
const LEFT_PAREN = '\\left(';
const RIGHT_PAREN = '\\right)';
const TIMES = ' \\times ';
const CDOT = ' \\cdot ';
/** En dessous, un espace n'est pas écrit (il serait invisible) */
const MIN_GAP_EM = 0.0005;

// Fonctions
/**
 * Le groupe dans lequel la sous-expression `partId` peut se déplacer, ou `null` :
 * ni terme, ni facteur, ni membre d'une égalité à deux membres (E1.2, E3.7), ou
 * somme figée pour un élève de 6e ou avant (G6).
 */
export function movableGroupOf(
	structure: ExpressionStructure,
	partId: number,
	options: RearrangeOptions = {}
): MovableGroup | null {
	const part: StructureNode | undefined = structure.nodes[partId];
	if (!part || part.parent === null) return null;
	const group = structure.nodes[part.parent];
	const beforeFifthGrade = options.beforeFifthGrade ?? false;
	switch (group.kind) {
		case 'sum':
		case 'difference':
			if (part.role !== 'term') return null;
			// G6 : à ce niveau, pas de terme négatif
			if (beforeFifthGrade && group.signs.includes('-')) return null;
			return collect(structure, group, 'sum', group.signs, beforeFifthGrade);
		case 'product':
			return part.role === 'factor'
				? collect(structure, group, 'product', null, beforeFifthGrade)
				: null;
		case 'relation': {
			const isEquality = group.relations.length === 1 && group.relations[0] === '=';
			return isEquality ? collect(structure, group, 'equality', null, beforeFifthGrade) : null;
		}
		default:
			return null;
	}
}

/** Les parties du groupe, retrouvées dans son LaTeX marqué */
function collect(
	structure: ExpressionStructure,
	node: StructureNode,
	kind: MovableGroup['kind'],
	signs: readonly Sign[] | null,
	beforeFifthGrade: boolean
): MovableGroup {
	const content = node.latex;
	const parts: MovablePart[] = [];
	let written = '';
	let cursor = 0;
	node.children.forEach((childId, i) => {
		const block = findMarkerBlock(content.slice(cursor), childId);
		if (!block) throw new Error(`partie ${childId} introuvable dans ${node.id}`);
		const before = content.slice(cursor, cursor + block.start);
		const wrapped = before.trimEnd().endsWith(LEFT_PAREN);
		written += before;
		parts.push({
			id: childId,
			sign: signs ? signs[i] : '+',
			marked: content.slice(cursor + block.start, cursor + block.end),
			wrapped,
			inlineQuotient: isInlineQuotient(structure, childId)
		});
		cursor += block.end;
		if (wrapped) {
			// `wrapIf` écrit ` \right)` juste après le marqueur
			const close = content.indexOf(RIGHT_PAREN, cursor);
			if (close < 0) throw new Error(`parenthèse fermante introuvable après ${childId}`);
			cursor = close + RIGHT_PAREN.length;
		}
	});
	return {
		kind,
		id: node.id,
		parts,
		timesSign: written.includes('\\cdot') ? CDOT : TIMES,
		alwaysTimes: beforeFifthGrade
	};
}

/** `12 : 3`, `x ÷ 2`, `a / b` : un quotient écrit en ligne (pas une fraction) */
function isInlineQuotient(structure: ExpressionStructure, id: number): boolean {
	const node = structure.nodes[id];
	if (node.kind !== 'quotient') return false;
	return structure.nodes[node.children[0]]?.role === 'dividend';
}

/** Le marqueur de la sous-expression `id` dans `latex`, ou `null` */
export function findMarkerBlock(latex: string, id: number): MarkerBlock | null {
	const opening = `\\class{${MARKER_PREFIX}${id}}{`;
	const start = latex.indexOf(opening);
	if (start < 0) return null;
	const contentStart = start + opening.length;
	let depth = 1;
	for (let i = contentStart; i < latex.length; i++) {
		const c = latex[i];
		// `\{` et `\}` sont des accolades écrites, pas des groupes
		if (c === '\\') {
			i++;
			continue;
		}
		if (c === '{') depth++;
		if (c === '}') {
			depth--;
			if (depth === 0) return { start, contentStart, contentEnd: i, end: i + 1 };
		}
	}
	return null;
}

/**
 * L'expression entière (LaTeX marqué) après avoir posé la partie `from` du
 * groupe en position `to`. Posée à sa place : rien ne change, pas même un
 * signe × superflu, ce n'est pas un déplacement (E3.8). Part toujours de
 * `structure.latex` : pour un second déplacement, relire d'abord le résultat
 * (`structureFromLatex`).
 */
export function movedLatex(
	structure: ExpressionStructure,
	group: MovableGroup,
	from: number,
	to: number
): string {
	if (from === to) return structure.latex;
	return expressionLatex(structure, group, reorder(group.parts, from, to));
}

/**
 * L'expression entière (LaTeX marqué), le groupe écrit avec les parties `parts`
 * et, pendant le glisser, les espaces de `layout` : la formule redessinée à
 * chaque image.
 */
export function expressionLatex(
	structure: ExpressionStructure,
	group: MovableGroup,
	parts: readonly MovablePart[],
	layout: GroupLayout = {}
): string {
	return replaceContent(structure.latex, group.id, groupLatex(group, parts, layout));
}

/** Les parties sans la partie `from` */
export function withoutPart(parts: readonly MovablePart[], from: number): MovablePart[] {
	return parts.filter((_, i) => i !== from);
}

/** Les parties, la partie `from` posée en position `to` (0 : en tête) */
export function reorder(parts: readonly MovablePart[], from: number, to: number): MovablePart[] {
	const remaining = withoutPart(parts, from);
	return [...remaining.slice(0, to), parts[from], ...remaining.slice(to)];
}

/**
 * Le groupe écrit avec les parties `parts`, dans cet ordre. Pendant le glisser,
 * `layout` y ouvre des espaces repérés par la classe `ubs-gap<k>`, à la hauteur
 * de la partie saisie ; dans un produit ou une égalité, l'espace s'ouvre avant
 * le signe.
 */
export function groupLatex(
	group: MovableGroup,
	parts: readonly MovablePart[],
	layout: GroupLayout = {}
): string {
	const { gaps = [], phantom = '' } = layout;
	let latex = '';
	for (let k = 0; k <= parts.length; k++) {
		const gap = gaps[k] ?? 0;
		const open = gap > MIN_GAP_EM;
		if (open) latex += gapLatex(gap, k, phantom);
		if (k === parts.length) continue;
		const written = piece(group, parts, k);
		// Un « − » en tête précédé d'un espace deviendrait binaire (+20 px mesurés) :
		// groupé, il reste collé à son terme (`{-3}` : même largeur que `-3`)
		const leadingMinus = group.kind === 'sum' && k === 0 && parts[0].sign === '-';
		latex += leadingMinus && open ? `{${written}}` : written;
	}
	return latex;
}

/** Ce que porte la carte de la partie saisie : un terme avec son « − », un facteur ou un membre seul */
export function cardLatex(group: MovableGroup, part: MovablePart): string {
	return piece(group, [part], 0);
}

/** La partie k telle que le groupe l'écrit, précédée de son signe */
function piece(group: MovableGroup, parts: readonly MovablePart[], k: number): string {
	const part = parts[k];
	const wrapped = part.wrapped || (group.kind === 'product' && k > 0 && part.inlineQuotient);
	const written = wrapped ? `${LEFT_PAREN} ${part.marked} ${RIGHT_PAREN}` : part.marked;
	switch (group.kind) {
		case 'sum': {
			// G4 : le signe suit le terme ; un « + » en tête disparaît
			if (k === 0) return `${part.sign === '-' ? '-' : ''}${written}`;
			return `${part.sign === '-' ? ' - ' : ' + '}${written}`;
		}
		case 'product':
			return k === 0 ? written : `${factorSeparator(group, part, wrapped)}${written}`;
		case 'equality':
			return k === 0 ? written : ` = ${written}`;
	}
}

/**
 * Devant un facteur, décision G11 de David (option A) : le signe seulement où il
 * est obligatoire, devant un nombre ou une fraction (`x × 2`, pas `x2` ;
 * `2 × 1/2`, pas un nombre mixte), rien ailleurs (`2x`, `3(x + 1)`), même si
 * l'élève l'avait écrit (`3 × a × b` → `3ab`). Sans mémoire : un aller-retour
 * rend l'écriture de départ. 6e ou avant : toujours le signe (E5.4).
 */
function factorSeparator(group: MovableGroup, right: MovablePart, wrapped: boolean): string {
	if (group.alwaysTimes) return group.timesSign;
	if (wrapped) return ' ';
	return /^(\d|\.|\\d?frac)/.test(stripMarkers(right.marked)) ? group.timesSign : ' ';
}

/**
 * Un espace de `width` em. `\mathord{}` : l'opérateur qui le suit reste un « + »
 * ou un « − » binaire (espacé). Mesuré (Chromium et WebKit) : 0,44 px de plus
 * qu'aucun espace dès qu'il existe, invisible ; la classe et `\vphantom`
 * (largeur nulle) n'y changent rien.
 */
function gapLatex(width: number, slot: number, phantom: string): string {
	// Sans marqueurs : un `ubs-n<id>` en double tromperait le repérage au pointeur
	const height = phantom ? `\\vphantom{${stripMarkers(phantom)}}` : '';
	return `\\mathord{\\class{${GAP_CLASS_PREFIX}${slot}}{\\hspace{${width.toFixed(3)}em}${height}}}`;
}

/** Remplace le contenu du marqueur `id` */
function replaceContent(latex: string, id: number, content: string): string {
	const block = findMarkerBlock(latex, id);
	if (!block) return latex;
	return latex.slice(0, block.contentStart) + content + latex.slice(block.contentEnd);
}
