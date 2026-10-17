/**
 * Structure d'une expression — lecture en français
 * ================================================
 *
 * Lecture d'une sous-expression : `2 + 3y` → « la somme de 2 et du produit de
 * 3 par y ». Spécification : `docs/systeme/mathast/structure-expression.md`,
 * section B (B1-B15).
 *
 * La lecture est STRUCTURÉE : une suite de segments (texte, formule, mot du
 * dictionnaire), chacun rattaché à la sous-expression qu'il désigne, pour le
 * sens inverse (survoler un mot encadre sa sous-expression, Q10).
 *
 * Rattachement :
 * - un mot (« somme ») et sa formule désignent leur sous-expression ;
 * - l'article (« la », « du », « l' ») appartient au groupe qu'il introduit ;
 *   « de », « et », « par », les virgules, à celui qui énumère ;
 * - « l'opposé de » d'un terme soustrait (le signe est à la somme, Q2) et le
 *   « −3 » d'un nombre soustrait désignent le terme.
 *
 * Les clés des mots sont les identifiants du dictionnaire (`termId` de
 * `lexicon/linker.ts` : le nom, suivi du sens pour un homonyme) : la page
 * les passe telles quelles à `LexiconTerm` (`ids`). Une clé absente du
 * dictionnaire donne un mot affiché sans lien. `racine cubique`, `racine n-ième`,
 * `logarithme décimal` et `différent`, absentes du jeu de référence figé, ont été
 * ajoutées en base le 2026-10-11 (migration 20261016090300_dictionnaire_mots_lecture).
 * Garde : `reading.test.ts`, toute nouvelle clé absente le casse.
 */
import { func } from '../factory';
import { isFunction } from '../guards';
import { decimalPointToComma } from '../decimal-comma';
import { toLatex } from '../latex-generator';
import type { FunctionNode, RelationType } from '../types';
import { stripMarkers } from './markers';
import type { ExpressionStructure, StructureNode } from './types';

// Types
export type ReadingSegment =
	/** Texte de liaison : article, « de », « et », « par », « est … à » */
	| { readonly kind: 'text'; readonly text: string; readonly node: number }
	/** Nombre, lettre ou bloc, rendu comme formule (LaTeX sans marqueurs) */
	| { readonly kind: 'formula'; readonly latex: string; readonly node: number }
	/** Mot du dictionnaire : `key` = identifiant de son entrée (`termId`) */
	| { readonly kind: 'word'; readonly text: string; readonly key: string; readonly node: number };

export interface Reading {
	/** Sous-expression lue */
	readonly node: number;
	readonly segments: readonly ReadingSegment[];
}

type Article = 'le' | 'la' | "l'";
type Gender = 'm' | 'f';

/** Groupe nominal : un article (ou aucun, pour une formule), puis le reste */
interface Phrase {
	readonly article: Article | null;
	readonly gender: Gender;
	/** Sous-expression désignée par le groupe : son article lui appartient */
	readonly node: number;
	readonly body: readonly ReadingSegment[];
}

interface Word {
	readonly text: string;
	readonly key: string;
	readonly gender: Gender;
}

/** Relation lue : « est [strictement] inférieur(e) [ou égal(e)] à » */
interface RelationReading {
	readonly before: string;
	readonly adjective: Adjective;
	/** Second adjectif : « inférieur ou égal » */
	readonly second?: Adjective;
	readonly preposition: 'à' | 'de';
}

interface Adjective {
	readonly masculine: string;
	readonly feminine: string;
	readonly key: string;
}

// Constantes
const WORDS = {
	sum: { text: 'somme', key: 'somme', gender: 'f' },
	difference: { text: 'différence', key: 'différence', gender: 'f' },
	product: { text: 'produit', key: 'produit', gender: 'm' },
	quotient: { text: 'quotient', key: 'quotient', gender: 'm' },
	opposite: { text: 'opposé', key: 'opposé', gender: 'm' },
	square: { text: 'carré', key: 'carré (puissance)', gender: 'm' },
	cube: { text: 'cube', key: 'cube (puissance)', gender: 'm' },
	power: { text: 'puissance', key: 'puissance', gender: 'f' },
	squareRoot: { text: 'racine carrée', key: 'racine carrée', gender: 'f' },
	cubeRoot: { text: 'racine cubique', key: 'racine cubique', gender: 'f' },
	// L'entrée « racine » du dictionnaire est la racine carrée : clé dédiée
	root: { text: 'racine', key: 'racine n-ième', gender: 'f' },
	image: { text: 'image', key: 'image (fonction)', gender: 'f' },
	numerator: { text: 'numérateur', key: 'numérateur', gender: 'm' },
	denominator: { text: 'dénominateur', key: 'dénominateur', gender: 'm' },
	length: { text: 'longueur', key: 'longueur', gender: 'f' }
} as const satisfies Record<string, Word>;

/** Fonctions usuelles lues par leur nom : « le sinus de x » */
const FUNCTION_WORDS: Partial<Record<string, Word>> = {
	sin: { text: 'sinus', key: 'sinus', gender: 'm' },
	cos: { text: 'cosinus', key: 'cosinus', gender: 'm' },
	tan: { text: 'tangente', key: 'tangente (trigonométrie)', gender: 'f' },
	// L'entrée « logarithme » du dictionnaire est le logarithme népérien
	ln: { text: 'logarithme népérien', key: 'logarithme', gender: 'm' },
	log: { text: 'logarithme décimal', key: 'logarithme décimal', gender: 'm' },
	exp: { text: 'exponentielle', key: 'exponentielle', gender: 'f' },
	abs: { text: 'valeur absolue', key: 'valeur absolue', gender: 'f' },
	floor: { text: 'partie entière', key: 'partie entière', gender: 'f' }
};

const EQUAL: Adjective = { masculine: 'égal', feminine: 'égale', key: 'égal' };
const LOWER: Adjective = { masculine: 'inférieur', feminine: 'inférieure', key: 'inférieur' };
const GREATER: Adjective = { masculine: 'supérieur', feminine: 'supérieure', key: 'supérieur' };
const DIFFERENT: Adjective = {
	masculine: 'différent',
	feminine: 'différente',
	key: 'différent'
};

/** Toutes les clés que la lecture peut produire (garde contre le dictionnaire) */
export const READING_WORD_KEYS: readonly string[] = [
	...Object.values(WORDS),
	...Object.values(FUNCTION_WORDS),
	EQUAL,
	LOWER,
	GREATER,
	DIFFERENT
].flatMap((w) => (w ? [w.key] : []));

/** Relations lues ; les autres (∈, ⊂, ≈…) : la relation entière en formule */
const RELATIONS: Partial<Record<RelationType, RelationReading>> = {
	'=': { before: 'est ', adjective: EQUAL, preposition: 'à' },
	'!=': { before: 'est ', adjective: DIFFERENT, preposition: 'de' },
	'<': { before: 'est strictement ', adjective: LOWER, preposition: 'à' },
	'<=': { before: 'est ', adjective: LOWER, second: EQUAL, preposition: 'à' },
	'>': { before: 'est strictement ', adjective: GREATER, preposition: 'à' },
	'>=': { before: 'est ', adjective: GREATER, second: EQUAL, preposition: 'à' }
};

/** Voyelle ou h (muet, supposé) : « l'opposé », « l'image » */
const ELIDING = /^[aeiouyhéèêëàâîïôöûù]/i;

// Fonctions
/**
 * Lecture en français de la sous-expression `nodeId` (par défaut l'expression
 * entière). Ne lève pas sur une structure de `buildStructure` ; un bloc sans
 * lecture prévue est lu comme une formule.
 */
export function readingOf(
	structure: ExpressionStructure,
	nodeId: number = structure.root
): Reading {
	const reader = createReader(structure);
	return { node: nodeId, segments: merge(introduce(null, reader(nodeId), nodeId)) };
}

/**
 * Texte brut d'une lecture (tests, journaux, texte de secours) : les formules
 * y gardent leur LaTeX, avec `−` pour `-` et la virgule nue pour `{,}`.
 * L'affichage, lui, rend les formules.
 */
export function readingPlainText(reading: Reading): string {
	return reading.segments
		.map((s) => (s.kind === 'formula' ? s.latex.replace(/-/g, '−').replaceAll('{,}', ',') : s.text))
		.join('');
}

function createReader(structure: ExpressionStructure): (id: number) => Phrase {
	const nodes = structure.nodes;
	const latexOf = (node: StructureNode) => stripMarkers(node.latex);

	function read(id: number): Phrase {
		const node = nodes[id];
		const children = node.children;
		switch (node.kind) {
			case 'number':
			case 'letter':
			case 'constant':
			case 'other':
				return formula(latexOf(node), id);
			case 'length':
				// « la longueur AB » : mot et formule désignent la longueur (un bloc)
				return headed(WORDS.length, id, [text(' ', id), ...formula(latexOf(node), id).body]);
			case 'parentheses':
				// B11 : les parenthèses ne se lisent pas
				return read(children[0]);
			case 'opposite': {
				// Nombre négatif : lu signé (−3), comme dans une somme (B5)
				const operand = nodes[children[0]];
				if (operand.kind === 'number') return formula(`-${latexOf(operand)}`, id);
				return headed(WORDS.opposite, id, [
					text(' ', id),
					...introduce('de', read(operand.id), id)
				]);
			}
			case 'sum': {
				const terms = children.map((child, i) => readTerm(child, node.signs[i]));
				return headed(WORDS.sum, id, [text(' ', id), ...enumerate(terms, id)]);
			}
			case 'difference':
				// B3, Q13 : exactement deux termes, le second soustrait, lu sans signe
				return headed(WORDS.difference, id, [text(' ', id), ...enumerate(children.map(read), id)]);
			case 'product':
				return readProduct(children, id);
			case 'quotient':
				return readQuotient(children, id);
			case 'power': {
				const [base, exponent] = children.map((child) => nodes[child]);
				return powerOf(base, exponent, id);
			}
			case 'root':
				return readRoot(node);
			case 'function':
				return readFunction(node);
			case 'relation':
				return readRelation(node);
		}
	}

	/** Terme d'une somme : signé s'il est un nombre (B4, B5), sinon « l'opposé de » (B15) */
	function readTerm(id: number, sign: '+' | '-'): Phrase {
		const term = nodes[id];
		if (sign === '+') return read(id);
		if (term.kind === 'number') return formula(`-${latexOf(term)}`, id);
		return headed(WORDS.opposite, id, [text(' ', id), ...introduce('de', read(id), id)]);
	}

	/**
	 * « le produit de a par b » pour deux facteurs, « de a, b et c » au-delà
	 * (B6). Un facteur dont la lecture contient déjà « par » : « le produit de A
	 * et de B », « de A, de B et de C » (Q20).
	 */
	function readProduct(children: readonly number[], id: number): Phrase {
		const factors = children.map(read);
		const nested = factors.some(containsBy);
		const body =
			factors.length === 2 && !nested
				? byPhrase(factors[0], factors[1], id)
				: enumerate(factors, id, nested);
		return headed(WORDS.product, id, [text(' ', id), ...body]);
	}

	/**
	 * « le quotient de a par b » (B7). Un numérateur ou un dénominateur dont la
	 * lecture contient déjà « par » : « le quotient dont le numérateur est A et
	 * le dénominateur B » (Q20).
	 */
	function readQuotient(children: readonly number[], id: number): Phrase {
		const [numeratorId, denominatorId] = children;
		const [numerator, denominator] = [read(numeratorId), read(denominatorId)];
		if (!containsBy(numerator) && !containsBy(denominator)) {
			return headed(WORDS.quotient, id, [text(' ', id), ...byPhrase(numerator, denominator, id)]);
		}
		return headed(WORDS.quotient, id, [
			text(' dont ', id),
			...introduce(null, headed(WORDS.numerator, numeratorId, []), id),
			text(' est ', id),
			...introduce(null, numerator, id),
			text(' et ', id),
			...introduce(null, headed(WORDS.denominator, denominatorId, []), id),
			text(' ', id),
			...introduce(null, denominator, id)
		]);
	}

	/** « de a par b » */
	function byPhrase(left: Phrase, right: Phrase, owner: number): ReadingSegment[] {
		return [
			...introduce('de', left, owner),
			text(' par ', owner),
			...introduce(null, right, owner)
		];
	}

	/**
	 * Exposant 2 : carré ; 3 : cube (B9), sauf en base 10 (Q17). Base et
	 * exposant nombre (signé pour l'exposant) ou lettre seuls : « x puissance 4 »,
	 * « x puissance n » (B9). Sinon : « la puissance 4 de la somme de a et b »,
	 * « la puissance n + 1 de 2 » (Q16). Exposant en formule.
	 */
	function powerOf(baseNode: StructureNode, exponent: StructureNode, owner: number): Phrase {
		const latex = latexOf(exponent);
		const base = read(baseNode.id);
		const baseTen = baseNode.kind === 'number' && latexOf(baseNode) === '10';
		const named = baseTen ? null : squareOrCube(latex, base, owner);
		if (named) return named;
		const exponentFormula: ReadingSegment = { kind: 'formula', latex, node: exponent.id };
		const simpleBase = isSingle(baseNode);
		const simpleExponent =
			isSingle(exponent) ||
			(exponent.kind === 'opposite' && nodes[exponent.children[0]].kind === 'number');
		if (simpleBase && simpleExponent) {
			return {
				...base,
				body: [
					...base.body,
					text(' ', owner),
					word(WORDS.power, owner),
					text(' ', owner),
					exponentFormula
				]
			};
		}
		return headed(WORDS.power, owner, [
			text(' ', owner),
			exponentFormula,
			text(' ', owner),
			...introduce('de', base, owner)
		]);
	}

	function readRoot(node: StructureNode): Phrase {
		const id = node.id;
		const radicand =
			nodes[node.children.find((c) => nodes[c].role === 'radicand') ?? node.children[0]];
		const index = node.children.map((c) => nodes[c]).find((c) => c.role === 'index');
		const of = [text(' ', id), ...introduce('de', read(radicand.id), id)];
		if (!index) return headed(WORDS.squareRoot, id, of);
		if (latexOf(index) === '3') return headed(WORDS.cubeRoot, id, of);
		// « la racine d'indice 4 de x »
		return headed(WORDS.root, id, [
			text(" d'indice ", id),
			{ kind: 'formula', latex: latexOf(index), node: index.id },
			...of
		]);
	}

	function readFunction(node: StructureNode): Phrase {
		const id = node.id;
		const ast = node.ast;
		// Fonction sans argument (`f'`), ou forme inattendue : un bloc
		if (!isFunction(ast) || node.children.length === 0) return formula(latexOf(node), id);

		const named = FUNCTION_WORDS[ast.name];
		const plain = !ast.base && !ast.derivativeOrder && !ast.isInverse;
		if (named && plain && node.children.length === 1) {
			const phrase = headed(named, id, [
				text(' ', id),
				...introduce('de', read(node.children[0]), id)
			]);
			if (!ast.power) return phrase;
			// `\sin^2 x` : le carré du sinus de x ; `\sin^{-1}` (réciproque ou
			// inverse ?) et les autres : en formule
			return (
				squareOrCube(decimalPointToComma(toLatex(ast.power)), phrase, id) ??
				formula(latexOf(node), id)
			);
		}
		if (isUserFunction(ast)) {
			// B13 : « l'image de x par f » (f, f', f⁻¹ écrits par toLatex)
			const head = decimalPointToComma(
				toLatex(
					func(ast.name, [], {
						power: ast.power,
						base: ast.base,
						derivativeOrder: ast.derivativeOrder,
						isInverse: ast.isInverse
					})
				)
			);
			return headed(WORDS.image, id, [
				text(' ', id),
				...enumerate(node.children.map(read), id),
				text(' par ', id),
				{ kind: 'formula', latex: head, node: id }
			]);
		}
		// min, max, pgcd, sinh… : pas de lecture prévue
		return formula(latexOf(node), id);
	}

	/**
	 * B12 : « la somme … est égale à 7 ». Encadrement : chaque membre est le
	 * sujet du suivant (« 1 est inférieur à x, qui est inférieur à 3 »).
	 */
	function readRelation(node: StructureNode): Phrase {
		const id = node.id;
		if (node.kind !== 'relation') return formula(latexOf(node), id);
		const readings = node.relations.map((r) => RELATIONS[r]);
		if (readings.some((r) => r === undefined) || node.children.length < 2) {
			return formula(latexOf(node), id);
		}
		const sides = node.children.map(read);
		const body: ReadingSegment[] = [...introduce(null, sides[0], id)];
		readings.forEach((relation, i) => {
			if (!relation) return;
			const subject = sides[i];
			if (i > 0) body.push(text(', qui ', id));
			else body.push(text(' ', id));
			body.push(text(relation.before, id), word(agree(relation.adjective, subject.gender), id));
			if (relation.second) {
				body.push(text(' ou ', id), word(agree(relation.second, subject.gender), id));
			}
			body.push(text(' ', id), ...introduce(relation.preposition, sides[i + 1], id));
		});
		return { article: null, gender: 'm', node: id, body };
	}

	return read;
}

/** Exposant 2 : « le carré de … » ; 3 : « le cube de … » ; sinon `null` */
function squareOrCube(exponent: string, base: Phrase, owner: number): Phrase | null {
	const w = exponent === '2' ? WORDS.square : exponent === '3' ? WORDS.cube : null;
	return w ? headed(w, owner, [text(' ', owner), ...introduce('de', base, owner)]) : null;
}

/** Nombre ou lettre seul (`e`, `π` compris) */
function isSingle(node: StructureNode): boolean {
	return node.kind === 'number' || node.kind === 'letter' || node.kind === 'constant';
}

/** Fonction définie par l'élève ou l'auteur : une lettre (`f`, `g`, `h`) */
function isUserFunction(ast: FunctionNode): boolean {
	return /^[a-zA-Z]$/.test(ast.name);
}

function agree(adjective: Adjective, gender: Gender): Word {
	return {
		text: gender === 'f' ? adjective.feminine : adjective.masculine,
		key: adjective.key,
		gender
	};
}

function text(value: string, node: number): ReadingSegment {
	return { kind: 'text', text: value, node };
}

function word(w: Word, node: number): ReadingSegment {
	return { kind: 'word', text: w.text, key: w.key, node };
}

function formula(latex: string, node: number): Phrase {
	return { article: null, gender: 'm', node, body: [{ kind: 'formula', latex, node }] };
}

/** Groupe introduit par un mot du dictionnaire : article accordé, élidé devant voyelle */
function headed(w: Word, node: number, rest: readonly ReadingSegment[]): Phrase {
	const article: Article = ELIDING.test(w.text) ? "l'" : w.gender === 'f' ? 'la' : 'le';
	return { article, gender: w.gender, node, body: [word(w, node), ...rest] };
}

/**
 * Le groupe précédé de « de » ou « à », contractions faites : « du », « au »,
 * « de la », « de l' ». L'article (contracté ou non) appartient
 * au groupe ; la préposition seule, à `owner`.
 */
function introduce(
	preposition: 'de' | 'à' | null,
	phrase: Phrase,
	owner: number
): ReadingSegment[] {
	const { article, node, body } = phrase;
	const articleText = article === "l'" ? article : article ? `${article} ` : '';
	if (preposition === null) return article ? [text(articleText, node), ...body] : [...body];
	if (article === 'le') return [text(preposition === 'de' ? 'du ' : 'au ', node), ...body];
	const prepositionSegment = text(`${preposition} `, owner);
	return article
		? [prepositionSegment, text(articleText, node), ...body]
		: [prepositionSegment, ...body];
}

/**
 * « de a, b et c » ; dès qu'un élément commence par un article, chacun est
 * introduit par « de » (B1 : « de 2 et du produit », B12 : « du produit … et de 3 »).
 */
function enumerate(
	phrases: readonly Phrase[],
	owner: number,
	forceDe: boolean = false
): ReadingSegment[] {
	const everyDe = forceDe || phrases.some((p) => p.article !== null);
	const segments: ReadingSegment[] = [];
	phrases.forEach((phrase, i) => {
		if (i > 0) segments.push(text(i === phrases.length - 1 ? ' et ' : ', ', owner));
		segments.push(...introduce(i === 0 || everyDe ? 'de' : null, phrase, owner));
	});
	return segments;
}

/** La lecture contient déjà « par » (produit, quotient, image) : Q20 */
function containsBy(phrase: Phrase): boolean {
	return phrase.body.some((s) => s.kind === 'text' && s.text.includes(' par '));
}

/** Fusionne deux morceaux de texte voisins rattachés à la même sous-expression */
function merge(segments: readonly ReadingSegment[]): ReadingSegment[] {
	const out: ReadingSegment[] = [];
	for (const segment of segments) {
		const last = out[out.length - 1];
		if (last?.kind === 'text' && segment.kind === 'text' && last.node === segment.node) {
			out[out.length - 1] = text(last.text + segment.text, last.node);
		} else if (segment.kind !== 'text' || segment.text !== '') {
			out.push(segment);
		}
	}
	return out;
}
