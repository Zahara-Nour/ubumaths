/**
 * Bloc ```solide (nœud `espace`, genre `solide`) — analyse du texte
 * ==================================================================
 *
 * ```solide
 * forme: pave 4 2 3
 * sommets: A B C D E F G H
 * marquer: face ABCD, arete AE, sommet G
 * cotes: cm
 * cachees: non
 * ```
 *
 * - `forme:` (obligatoire) : `cube a`, `pave l p h`, `prisme triangle b h L`,
 *   `prisme triangle-rectangle a b L`, `pyramide carree a h`,
 *   `pyramide rectangle l p h`, `pyramide triangle a h`, `cylindre r h`,
 *   `cone r h`, `boule r` ; nombres > 0 (virgule ou point), au plus 1000 et
 *   3 décimales, au plus 10 fois plus grands les uns que les autres ; cône :
 *   hauteur > 0,5 × rayon. Les dimensions sont des proportions.
 * - `sommets:` (facultatif) : un nom par sommet, dans l'ordre documenté
 *   (`solideTopology`) ; `-` : sommet sans nom.
 * - `marquer:` (facultatif) : `face ABCD` ou `face dessus` (place, sans
 *   noms), `arete AE`, `sommet G`, séparés par des virgules. Solides ronds :
 *   sommets seulement.
 * - `cotes:` : `cm`, `mm`, `m`, `oui` (sans unité), `non` ;
 *   `cachees: non` : tout en trait plein.
 * - `section:` (facultatif, lot 6) : cube, pavé `parallele ABCD 2` ou
 *   `parallele dessus 2` (distance à la face), puis `IJKL` pour nommer la
 *   section ; cylindre `perpendiculaire 2` (hauteur) ou `parallele 1`
 *   (distance à l'axe) ; boule `1` (distance au centre). Sans distance : au
 *   milieu (pavé, cylindre ⊥), par l'axe ou le centre (cylindre ‖, boule).
 * - `points:` (facultatif, polyèdres) : `I milieu AE, O centre ABCD` (centre
 *   d'une face ; cube, pavé : `centre ABCDEFGH`, le centre du solide) ; un
 *   milieu peut prendre un point déjà déclaré (`J milieu IG`). Avec `repere:`,
 *   un point par ses coordonnées : `M (1 ; 0,5 ; 1)` (au plus 3 décimales ; refusé
 *   hors du solide agrandi d'une marge).
 * - `repere:` (facultatif, polyèdres, lot 7c) : `A ; AB, AD, AE`, une origine et
 *   trois vecteurs qui en partent, pas dans un même plan, entre sommets ou points
 *   déclarés sans coordonnées, avant le premier point à coordonnées. Pas avec
 *   `section:` ni `tracer:`.
 * - `vecteurs:` (facultatif, polyèdres) : `AB, AE, u = AI`, entre points nommés
 *   (sommets, points déclarés) ; `u =` pose la lettre sur la flèche.
 * - `tracer:` (facultatif, polyèdres, geste de l'élève) : `vecteur AB + AD + AE`,
 *   puis `depuis A` pour imposer l'origine ; au plus 6 vecteurs entre points nommés
 *   ou nommés dans `vecteurs:` (`2 u - v`), coefficients entiers ou fractions
 *   irréductibles de dénominateur 2, 3 ou 4 (`2 AB`, `1/3 AE`, `3/2AB`). Refusé : vecteur nul,
 *   extrémité qui ne tombe sur aucun point cliquable (sommets nommés, points
 *   déclarés) depuis l'origine imposée, ou depuis aucun point si elle est libre.
 *   `case: N` y est posée par le générateur de questions.
 * - `tourner:` (facultatif, `oui` ou `non`, chantier `solides-3d`) : l'élève peut
 *   faire tourner la figure à l'écran. Toutes les formes, coupées (`section:`)
 *   et cotées (`cotes:`) comprises, figure à geste (`tracer:`) aussi. Une
 *   valeur mal écrite ne met PAS le bloc en erreur : phrase pour l'auteur
 *   (`rotationErrors`), figure fixe.
 *
 * Chantier `solides`, lots 3 et 6 (§ 8 et 11 du journal), ADR 0034 ; points et
 * vecteurs : chantier `solide-vecteur`, lot 1 ; `tracer:` : lot 2.
 *
 * @module ubumark/parser/solide-parser
 */

import {
	SOLIDE_FORMS,
	SOLIDE_KEYS,
	SOLIDE_MAX_DECIMALS,
	SOLIDE_MAX_DIMENSION,
	SOLIDE_MAX_DROITES,
	SOLIDE_MAX_PLANS,
	SOLIDE_MAX_POINTS,
	SOLIDE_MAX_RATIO,
	SOLIDE_MAX_TERMS,
	SOLIDE_MAX_VECTORS,
	SOLIDE_UNITS,
	type SolideDroite,
	type SolideForm,
	type SolideMark,
	type SolidePlan,
	type SolidePoint,
	type SolideRepere,
	type SolideSection,
	type SolideSpec,
	type SolideTask,
	type SolideVector,
	type SolideVectorTerm
} from '../types/espace';
import {
	DROITE_OVERHANG,
	SOLIDE_FLAT_CONE,
	SOLIDE_PLACES,
	frenchNumber,
	polyhedronVertices,
	solidePoints3,
	solideTopology,
	type Point3,
	type SolidePlace,
	type SolideTopology
} from '../utils/espace-solides';
import { isNullCombination, solideVectorPairs } from '../utils/solide-gestes';

// ============================================================================
// CONSTANTES
// ============================================================================

/** `clé: valeur` */
const KEY_LINE_REGEX = /^([A-Za-zÀ-ÿ]+)\s*:\s*(.*)$/;

const KEY_LIST = SOLIDE_KEYS.join(', ');

const DIMENSION_REGEX = /^\d+(?:[.,]\d+)?$/;

/** Un nom de sommet : une majuscule, puis des primes ou un nombre (A, A', O1) */
const NAME_REGEX = /^[A-Z](?:'+|\d+)?$/;
const NAMES_IN_TEXT_REGEX = /[A-Z](?:'+|\d+)?/g;

/** Un nom de vecteur : une minuscule, puis éventuellement un chiffre (u, v, u1) */
const VECTOR_NAME_REGEX = /^[a-z]\d?$/;

/** Un nom de droite : une minuscule, puis éventuellement ' ou un chiffre (d, d', d1) */
const DROITE_NAME_REGEX = /^[a-z](?:'|\d)?$/;

/** Un nom de plan : une majuscule, puis éventuellement ' ou un chiffre (P, P', P1) */
const PLAN_NAME_REGEX = /^[A-Z](?:'|\d)?$/;

/**
 * Un terme de `tracer:` : signe, coefficient (`2`, `1/3`), puis deux noms de
 * points (`AB`) ou le nom d'un vecteur de `vecteurs:` (`u`, `w1`)
 */
const TERM_REGEX =
	/^([+-])?\s*(?:(\d+)\s*(?:\/\s*(\d+))?)?\s*((?:[A-Z](?:'+|\d+)?)+|[a-z]\d?(?![A-Za-z\d]))\s*/;

/** Dénominateurs admis dans `tracer:` (D-SV2 : fractions simples) */
const TRACER_DENOMINATORS = [1, 2, 3, 4];

const TRACER_USAGE = 'ex. tracer: vecteur AB + AD + AE, ou … depuis A';

/** Deux points plus proches que cela sont confondus (vecteur nul, milieu d'un point avec lui-même) */
const SAME_POINT = 1e-9;

/** Une coordonnée d'un point : un nombre, négatif ou non (`1`, `0,5`, `-0.25`) */
const COORDINATE_REGEX = /^-?\d+(?:[.,]\d+)?$/;

const REPERE_USAGE = 'ex. repere: A ; AB, AD, AE';

/** Un point est sur une droite quand il en est à moins de cette part de la plus grande dimension */
const SAME_LINE = 1e-9;

const FIRST_WORDS = ['cube', 'pave', 'prisme', 'pyramide', 'cylindre', 'cone', 'boule'];
const PRISM_BASES = ['triangle', 'triangle-rectangle'];
const PYRAMID_BASES = ['carree', 'rectangle', 'triangle'];

/** Ce que mesure chaque dimension, pour les messages */
const DIMENSION_HINTS: Record<SolideForm, string> = {
	cube: 'côté',
	pave: 'longueur largeur hauteur',
	'prisme-triangle': 'base hauteur longueur',
	'prisme-triangle-rectangle': 'côté côté longueur',
	'pyramide-carree': 'côté hauteur',
	'pyramide-rectangle': 'longueur largeur hauteur',
	'pyramide-triangle': 'côté hauteur',
	cylindre: 'rayon hauteur',
	cone: 'rayon hauteur',
	boule: 'rayon'
};

/** Écritures de `section:` permises, pour les messages */
const SECTION_USAGES = {
	box: 'section: parallele ABCD 2, ou parallele dessus 2 ; IJKL à la fin nomme la section',
	cylindre: 'section: perpendiculaire 2 (hauteur) ou section: parallele 1 (distance à l’axe)',
	boule: 'section: 1 (distance au centre)'
};

/** Sommets de la section d'un pavé : ceux d'une face */
const SECTION_VERTEX_COUNT = 4;

const PLACE_LABELS: Record<SolidePlace, string> = {
	devant: 'face de devant',
	derriere: 'face de derrière',
	dessus: 'face du dessus',
	dessous: 'face du dessous',
	gauche: 'face de gauche',
	droite: 'face de droite'
};

// ============================================================================
// FONCTIONS
// ============================================================================

/** Retire les accents et les majuscules */
function plain(text: string): string {
	return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** La forme et ses dimensions ; une phrase d'erreur sinon */
export function readForm(value: string): { form: SolideForm; dims: number[] } | string {
	const words = value.split(/\s+/).filter((w) => w !== '');
	const first = plain(words[0] ?? '');
	if (!FIRST_WORDS.includes(first)) {
		return `forme « ${words[0] ?? ''} » inconnue (formes possibles : ${FIRST_WORDS.join(', ')})`;
	}
	let form: SolideForm;
	let rest: string[];
	if (first === 'prisme' || first === 'pyramide') {
		const bases = first === 'prisme' ? PRISM_BASES : PYRAMID_BASES;
		const base = plain(words[1] ?? '');
		if (!bases.includes(base)) {
			return `${first} « ${words[1] ?? ''} » : base inconnue (bases possibles : ${bases.join(', ')})`;
		}
		form = `${first}-${base}` as SolideForm;
		rest = words.slice(2);
	} else {
		form = first as SolideForm;
		rest = words.slice(1);
	}
	const count = SOLIDE_FORMS[form];
	const topology = solideTopology(form);
	const usage = `forme: ${words.slice(0, words.length - rest.length).join(' ')} ${DIMENSION_HINTS[form]}`;
	if (rest.length !== count) {
		return `${topology.indefinite} a ${count} dimension${count > 1 ? 's' : ''} (${usage})`;
	}
	const bad = rest.find((w) => !DIMENSION_REGEX.test(w) || Number(w.replace(',', '.')) === 0);
	if (bad !== undefined) {
		return `« ${bad} » : une dimension est un nombre positif (ex. 4 ou 2,5)`;
	}
	const tooPrecise = rest.find((w) => (w.split(/[.,]/)[1]?.length ?? 0) > SOLIDE_MAX_DECIMALS);
	if (tooPrecise !== undefined) {
		return `« ${tooPrecise} » : au plus ${SOLIDE_MAX_DECIMALS} chiffres après la virgule`;
	}
	const dims = rest.map((w) => Number(w.replace(',', '.')));
	const tooBig = rest.find((_, i) => !(dims[i] <= SOLIDE_MAX_DIMENSION));
	if (tooBig !== undefined) {
		return `« ${tooBig.length > 12 ? `${tooBig.slice(0, 12)}…` : tooBig} » : une dimension vaut au plus ${SOLIDE_MAX_DIMENSION} (ce sont des proportions)`;
	}
	if (form === 'cone' && dims[1] <= SOLIDE_FLAT_CONE * dims[0]) {
		return `cône trop plat : sa hauteur doit dépasser ${String(SOLIDE_FLAT_CONE).replace('.', ',')} fois son rayon (sinon son sommet ne se voit pas)`;
	}
	if (Math.max(...dims) / Math.min(...dims) > SOLIDE_MAX_RATIO) {
		return `dimensions trop différentes (plus de ${SOLIDE_MAX_RATIO} fois plus grandes les unes que les autres)`;
	}
	return { form, dims };
}

/** Les noms de `sommets:` ; une phrase d'erreur sinon */
function readNames(value: string, topology: SolideTopology): (string | null)[] | string {
	const items = value.split(/[\s,]+/).filter((w) => w !== '');
	const count = topology.vertexCount;
	if (items.length !== count) {
		const what = topology.curved
			? `se nomme par ${count} point${count > 1 ? 's' : ''}`
			: `a ${count} sommets`;
		return `${topology.indefinite} ${what} : ${count} nom${count > 1 ? 's' : ''} attendu${count > 1 ? 's' : ''} (- pour un sommet sans nom)`;
	}
	const names: (string | null)[] = [];
	for (const item of items) {
		if (item === '-') {
			names.push(null);
			continue;
		}
		if (!NAME_REGEX.test(item)) {
			return `« ${item} » : un nom de sommet est une majuscule, puis éventuellement ' ou un nombre (A, A', O1)`;
		}
		if (names.includes(item)) return `« ${item} » deux fois : chaque sommet a son nom`;
		names.push(item);
	}
	return names;
}

/** Les sommets désignés par un texte (« ABCD », « [AE] ») ; une phrase d'erreur sinon */
function verticesOf(text: string, names: (string | null)[] | null): number[] | string {
	const bare = text.replace(/[[\]()\s]/g, '');
	const written = bare.match(NAMES_IN_TEXT_REGEX) ?? [];
	if (written.join('') !== bare || written.length === 0) {
		return `« ${text} » : écris les noms des sommets (ex. face ABCD, arete AE, sommet G)`;
	}
	if (names === null) return `nomme les sommets (sommets:) pour marquer ${bare}`;
	const vertices: number[] = [];
	for (const name of written) {
		const index = names.indexOf(name);
		if (index < 0) return `aucun sommet ne s’appelle ${name}`;
		vertices.push(index);
	}
	return vertices;
}

const sameSet = (a: number[], b: number[]) =>
	a.length === b.length && a.every((v) => b.includes(v));

/** Une marque de `marquer:` ; une phrase d'erreur sinon */
function readMark(
	item: string,
	topology: SolideTopology,
	names: (string | null)[] | null
): SolideMark | string {
	const match = /^(\S+)\s*(.*)$/.exec(item.trim());
	const kind = plain(match?.[1] ?? '');
	const what = (match?.[2] ?? '').trim();
	if (!['face', 'arete', 'sommet'].includes(kind) || what === '') {
		return `marquer « ${item.trim()} » non compris (ex. face ABCD, face dessus, arete AE, sommet G)`;
	}
	if (topology.curved && kind !== 'sommet') {
		return `sur ${topology.indefinite}, seuls les sommets nommés se marquent (ex. marquer: sommet O)`;
	}
	if (kind === 'face') {
		const face = readFace(what, topology, names);
		if (typeof face === 'string') return face;
		// La face dans l'ordre de la topologie (le tour du polygone), pas l'ordre écrit
		const vertices = topology.faces.find((f) => sameSet(f, face.vertices)) ?? face.vertices;
		return { kind: 'face', vertices, label: face.label };
	}
	const vertices = verticesOf(what, names);
	if (typeof vertices === 'string') return vertices;
	const written = what.replace(/[[\]()\s]/g, '');
	if (kind === 'sommet') {
		if (vertices.length !== 1) return `sommet « ${what} » : un seul nom (ex. sommet G)`;
		return { kind: 'sommet', vertex: vertices[0], label: `sommet ${written}` };
	}
	if (kind === 'arete') {
		const edge = topology.edges.find((e) => sameSet([...e], vertices));
		if (edge === undefined) return `[${written}] n’est pas une arête ${topology.ofThe}`;
		return { kind: 'arete', vertices: edge, label: `arête [${written}]` };
	}
	return `marquer « ${item.trim()} » non compris`;
}

/**
 * Une face désignée par sa place (`dessus`) ou ses noms (`ABCD`) ; sommets dans
 * l'ordre écrit (ordre de la topologie pour une place) ; une phrase d'erreur sinon
 */
function readFace(
	what: string,
	topology: SolideTopology,
	names: (string | null)[] | null
): { vertices: number[]; label: string } | string {
	if ((SOLIDE_PLACES as readonly string[]).includes(plain(what))) {
		const place = plain(what) as SolidePlace;
		const face = topology.places[place];
		if (face === undefined) {
			return `${topology.indefinite} n’a pas de ${PLACE_LABELS[place]} (désigne-la par ses sommets)`;
		}
		return { vertices: face, label: PLACE_LABELS[place] };
	}
	const vertices = verticesOf(what, names);
	if (typeof vertices === 'string') return vertices;
	const written = what.replace(/[[\]()\s]/g, '');
	if (!topology.faces.some((f) => sameSet(f, vertices))) {
		return `${written} n’est pas une face ${topology.ofThe}`;
	}
	return { vertices, label: `face ${written}` };
}

/** « du pavé » → « le pavé », « de la boule » → « la boule » */
const theOf = (topology: SolideTopology) =>
	topology.ofThe.replace(/^du /, 'le ').replace(/^de la /, 'la ');

const readDistance = (word: string | undefined) =>
	word !== undefined &&
	DIMENSION_REGEX.test(word) &&
	(word.split(/[.,]/)[1]?.length ?? 0) <= SOLIDE_MAX_DECIMALS
		? Number(word.replace(',', '.'))
		: null;

/**
 * La face dans l'ordre de son tour (sens direct ou inverse, à partir de n'importe
 * quel sommet) : `ACBD` n'en est pas un, la section serait croisée
 */
function inTourOrder(vertices: number[], topology: SolideTopology): boolean {
	const face = topology.faces.find((f) => sameSet(f, vertices));
	if (face === undefined) return false;
	const n = face.length;
	const start = face.indexOf(vertices[0]);
	const forward = vertices.every((v, i) => face[(start + i) % n] === v);
	const backward = vertices.every((v, i) => face[(start - i + n) % n] === v);
	return forward || backward;
}

/** Les noms des sommets de la section d'un pavé (« IJKL ») ; une phrase d'erreur sinon */
function readSectionNames(text: string, names: (string | null)[] | null): string[] | string {
	const written = text.match(NAMES_IN_TEXT_REGEX) ?? [];
	if (written.join('') !== text) return `« ${text} » non compris (${SECTION_USAGES.box})`;
	if (written.length !== SECTION_VERTEX_COUNT) {
		return `la section a ${SECTION_VERTEX_COUNT} sommets : ${SECTION_VERTEX_COUNT} noms attendus (ex. IJKL)`;
	}
	for (const [i, name] of written.entries()) {
		if (written.indexOf(name) !== i) return `« ${name} » deux fois : chaque sommet a son nom`;
		if (names?.includes(name)) return `« ${name} » est déjà le nom d’un sommet du solide`;
	}
	return written;
}

/** Le plan de `section:` ; une phrase d'erreur sinon */
function readSection(
	value: string,
	shape: { form: SolideForm; dims: number[] },
	topology: SolideTopology,
	names: (string | null)[] | null
): SolideSection | string {
	const words = value.split(/\s+/).filter((w) => w !== '');
	const the = theOf(topology);
	const shown = value === '' ? 'vide' : `« ${value} »`;
	const outside = (max: number) =>
		`le plan ne coupe pas ${the} : distance entre 0 et ${String(max).replace('.', ',')} (exclus)`;

	if (shape.form === 'cube' || shape.form === 'pave') {
		if (plain(words[0] ?? '') !== 'parallele' || words[1] === undefined || words.length > 4) {
			return `section ${shown} non comprise (${SECTION_USAGES.box})`;
		}
		const face = readFace(words[1], topology, names);
		if (typeof face === 'string') return face;
		if (!inTourOrder(face.vertices, topology)) {
			return `${words[1]} : écris les sommets de la face dans l’ordre du tour (ex. ABCD, pas ACBD)`;
		}
		// Profondeur : longueur de l'arête qui part de la face vers la face opposée
		const points = polyhedronVertices(shape.form, shape.dims);
		const [v] = face.vertices;
		const edge = topology.edges.find(
			(e) => e.includes(v) && !face.vertices.includes(e[0] === v ? e[1] : e[0])
		);
		const w = edge === undefined ? v : edge[0] === v ? edge[1] : edge[0];
		const depth = Math.hypot(
			points[w].x - points[v].x,
			points[w].y - points[v].y,
			points[w].z - points[v].z
		);
		let rest = words.slice(2);
		let distance = depth / 2;
		const read = readDistance(rest[0]);
		if (read !== null) {
			distance = read;
			rest = rest.slice(1);
		}
		if (!(distance > 0 && distance < depth)) return outside(depth);
		let sectionNames: string[] | null = null;
		if (rest.length > 1) return `section ${shown} non comprise (${SECTION_USAGES.box})`;
		if (rest.length === 1) {
			const read = readSectionNames(rest[0], names);
			if (typeof read === 'string') return read;
			sectionNames = read;
		}
		return { kind: 'face', face: face.vertices, distance, names: sectionNames, label: face.label };
	}

	if (shape.form === 'cylindre') {
		const kind = plain(words[0] ?? '');
		const distance = words[1] === undefined ? null : readDistance(words[1]);
		if (
			(kind !== 'perpendiculaire' && kind !== 'parallele') ||
			words.length > 2 ||
			(words[1] !== undefined && distance === null)
		) {
			return `section ${shown} non comprise (${SECTION_USAGES.cylindre})`;
		}
		const [r, h] = shape.dims;
		if (kind === 'perpendiculaire') {
			const d = distance ?? h / 2;
			if (!(d > 0 && d < h)) return outside(h);
			return { kind, distance: d };
		}
		const d = distance ?? 0;
		if (d >= r) {
			const max = String(r).replace('.', ',');
			return `le plan ne coupe pas ${the} : distance à l’axe de 0 à ${max} (${max} exclu)`;
		}
		return { kind, distance: d };
	}

	if (shape.form === 'boule') {
		const [r] = shape.dims;
		const plainValue = plain(value);
		const distance = plainValue === '' || plainValue === 'oui' ? 0 : readDistance(value);
		if (distance === null) return `section ${shown} non comprise (${SECTION_USAGES.boule})`;
		if (distance >= r) {
			const max = String(r).replace('.', ',');
			return `le plan ne coupe pas ${the} : distance au centre de 0 à ${max} (${max} exclu)`;
		}
		return { kind: 'boule', distance };
	}

	return `section : cube, pavé, cylindre ou boule (pas ${topology.indefinite})`;
}

/** Les points nommés d'un texte (« AE », « [AE] »), indices dans `known` ; une phrase d'erreur sinon */
function namedPoints(text: string, known: string[]): number[] | string {
	const bare = text.replace(/[[\]()\s]/g, '');
	const written = bare.match(NAMES_IN_TEXT_REGEX) ?? [];
	if (written.join('') !== bare || written.length === 0) {
		return `« ${text.trim()} » : écris les noms des points (ex. AE)`;
	}
	const indices: number[] = [];
	for (const name of written) {
		const index = known.indexOf(name);
		if (index < 0) return `aucun point ne s’appelle ${name}`;
		indices.push(index);
	}
	return indices;
}

/** Plus grand diviseur commun de deux entiers positifs */
const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

const samePosition = (a: Point3, b: Point3) =>
	Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < SAME_POINT;

/** Les éléments d'une liste séparés par des virgules, hors parenthèses (`M (1 ; 0,5 ; 1), I milieu AE`) */
function splitItems(value: string): string[] {
	const items: string[] = [];
	let depth = 0;
	let current = '';
	for (const char of value) {
		if (char === '(') depth++;
		if (char === ')') depth = Math.max(0, depth - 1);
		if (char === ',' && depth === 0) {
			items.push(current);
			current = '';
		} else current += char;
	}
	items.push(current);
	return items.filter((i) => i.trim() !== '');
}

/** Un élément de `points:` qui donne des coordonnées : un nom, puis une parenthèse */
const coordsItem = (item: string) => /^([^\s(]+)\s*\((.*)$/.exec(item.trim());

/** Les noms des points de `points:` donnés par leurs coordonnées, et de ceux déclarés après le premier d'entre eux */
function pointsAfterCoords(value: string): { coords: string[]; later: string[] } {
	const coords: string[] = [];
	const later: string[] = [];
	for (const item of splitItems(value)) {
		const match = coordsItem(item);
		if (match !== null) coords.push(match[1]);
		else if (coords.length > 0) later.push(item.trim().split(/\s+/)[0]);
	}
	return { coords, later };
}

/**
 * Le repère de `repere:` (`A ; AB, AD, AE`) ; une phrase d'erreur sinon.
 * `points` : les points déclarés avant le premier point à coordonnées
 */
function readRepere(
	value: string,
	shape: { form: SolideForm; dims: number[] },
	names: (string | null)[],
	points: SolidePoint[],
	after: { coords: string[]; later: string[] }
): SolideRepere | string {
	const inner = /^\((.*)\)$/.exec(value.trim())?.[1] ?? value;
	const parts = inner.split(';');
	if (parts.length !== 2 || parts[0].trim() === '') {
		return `repère « ${value} » non compris (${REPERE_USAGE})`;
	}
	const known = [...names.map((n) => n ?? ''), ...points.map((p) => p.name)];
	const at = solidePoints3(shape.form, shape.dims, points);
	/** Les points nommés, ou pourquoi le repère ne peut pas s'appuyer sur l'un d'eux */
	const pointsOf = (text: string): number[] | string => {
		const written = text.replace(/[[\]()\s]/g, '').match(NAMES_IN_TEXT_REGEX) ?? [];
		const byCoords = written.find((n) => after.coords.includes(n));
		if (byCoords !== undefined) {
			return `${byCoords} est donné par ses coordonnées : le repère ne peut pas s’appuyer sur lui`;
		}
		const late = written.find((n) => after.later.includes(n));
		if (late !== undefined) {
			return `déclare ${late} avant les points donnés par leurs coordonnées, pour que le repère s’appuie sur lui`;
		}
		return namedPoints(text, known);
	};
	const origin = pointsOf(parts[0]);
	if (typeof origin === 'string') return origin;
	if (origin.length !== 1) {
		return `origine « ${parts[0].trim()} » : un seul point (${REPERE_USAGE})`;
	}
	const items = parts[1].split(',').filter((i) => i.trim() !== '');
	if (items.length !== 3) return `un repère de l’espace a trois vecteurs (${REPERE_USAGE})`;
	const axes: number[] = [];
	for (const item of items) {
		const refs = pointsOf(item);
		if (typeof refs === 'string') return refs;
		const written = refs.map((i) => known[i]).join('');
		if (refs.length !== 2) {
			return `« ${item.trim()} » : un vecteur se désigne par deux points (ex. AB)`;
		}
		if (samePosition(at[refs[0]], at[refs[1]])) {
			return `${written} : vecteur nul (origine et extrémité confondues)`;
		}
		if (refs[0] !== origin[0]) {
			return `${written} : chaque vecteur du repère part de ${known[origin[0]]}, son origine (${REPERE_USAGE})`;
		}
		axes.push(refs[1]);
	}
	// Volume du pavé porté par les trois vecteurs, rapporté à la taille du solide : nul, ils sont dans un même plan
	const o = at[origin[0]];
	const [u, v, w] = axes.map((i) => ({ x: at[i].x - o.x, y: at[i].y - o.y, z: at[i].z - o.z }));
	const volume =
		u.x * (v.y * w.z - v.z * w.y) - u.y * (v.x * w.z - v.z * w.x) + u.z * (v.x * w.y - v.y * w.x);
	const size = Math.max(...shape.dims);
	if (Math.abs(volume) < size ** 3 * SAME_LINE) {
		return 'les trois vecteurs sont dans un même plan : ils ne font pas un repère de l’espace';
	}
	return { origin: origin[0], axes: [axes[0], axes[1], axes[2]] };
}

/**
 * Les points de `points:` ; une phrase d'erreur sinon. `frame` : le repère, lu
 * avec les points déclarés jusque-là ; `'absent'` : pas de `repere:` ; `'failed'` :
 * mal écrit, erreur déjà dite (rendu : null, sans phrase de plus)
 */
function readPoints(
	value: string,
	shape: { form: SolideForm; dims: number[] },
	topology: SolideTopology,
	names: (string | null)[],
	frame: (declared: SolidePoint[]) => SolideRepere | 'absent' | 'failed'
): SolidePoint[] | string | null {
	const items = splitItems(value);
	if (items.length > SOLIDE_MAX_POINTS) return `au plus ${SOLIDE_MAX_POINTS} points`;
	const known = names.map((n) => n ?? '');
	const points: SolidePoint[] = [];
	const usage = 'ex. I milieu AE, O centre ABCD';
	const coordsUsage = 'ex. M (1 ; 0,5 ; 1)';
	const box = polyhedronVertices(shape.form, shape.dims);
	const margin = DROITE_OVERHANG * Math.max(...shape.dims);
	for (const item of items) {
		const byCoords = coordsItem(item);
		const match = byCoords === null ? /^(\S+)\s+(\S+)\s*(.*)$/.exec(item.trim()) : null;
		const name = byCoords?.[1] ?? match?.[1] ?? item.trim();
		const kind = plain(match?.[2] ?? '');
		if (byCoords === null && (match === null || (kind !== 'milieu' && kind !== 'centre'))) {
			return `point « ${item.trim()} » non compris (${usage})`;
		}
		if (byCoords !== null && !byCoords[2].trim().endsWith(')')) {
			return `point « ${item.trim()} » non compris (${coordsUsage})`;
		}
		if (!NAME_REGEX.test(name)) {
			return `« ${name} » : un nom de point est une majuscule, puis éventuellement ' ou un nombre (I, I', O1)`;
		}
		if (names.includes(name)) return `« ${name} » est déjà le nom d’un sommet`;
		if (points.some((p) => p.name === name))
			return `« ${name} » deux fois : chaque point a son nom`;
		if (byCoords !== null) {
			const written = byCoords[2]
				.trim()
				.slice(0, -1)
				.split(';')
				.map((w) => w.trim().replace(/−/g, '-'));
			if (written.length !== 3) return `${name} : trois coordonnées (${coordsUsage})`;
			const bad = written.find((w) => !COORDINATE_REGEX.test(w));
			if (bad !== undefined) {
				return `« ${bad} » : une coordonnée est un nombre (${coordsUsage})`;
			}
			const tooPrecise = written.find(
				(w) => (w.split(/[.,]/)[1]?.length ?? 0) > SOLIDE_MAX_DECIMALS
			);
			if (tooPrecise !== undefined) {
				return `« ${tooPrecise} » : au plus ${SOLIDE_MAX_DECIMALS} chiffres après la virgule`;
			}
			const repere = frame(points.filter((p) => p.coords === undefined));
			if (repere === 'failed') return null;
			if (repere === 'absent') {
				return `${name} : des coordonnées demandent un repère (repere:, ${REPERE_USAGE})`;
			}
			const values = written.map((w) => Number(w.replace(',', '.')));
			const shown = `(${values.map((v) => frenchNumber(v).replace('-', '−')).join(' ; ')})`;
			const point: SolidePoint = {
				name,
				of: [],
				label: `de coordonnées ${shown}`,
				coords: { ...repere, values: [values[0], values[1], values[2]] }
			};
			const at = solidePoints3(shape.form, shape.dims, [...points, point]);
			const p = at[at.length - 1];
			const outside = (['x', 'y', 'z'] as const).some((axis) => {
				const all = box.map((vertex) => vertex[axis]);
				return p[axis] < Math.min(...all) - margin || p[axis] > Math.max(...all) + margin;
			});
			if (outside) {
				return `${name} ${shown} tombe hors de la figure : un point reste dans le solide, ou tout près`;
			}
			points.push(point);
			known.push(name);
			continue;
		}
		if (match === null) continue;
		if (match[3].trim() === '') return `${kind} de quels points ? (${usage})`;
		const refs = namedPoints(match[3], known);
		if (typeof refs === 'string') return refs;
		// Un point répété fausserait l'isobarycentre (centre ABCDEFGA n'est pas le centre du cube)
		const twice = refs.find((r, i) => refs.indexOf(r) !== i);
		if (twice !== undefined && kind === 'centre')
			return `« ${known[twice]} » deux fois dans ${kind} ${match[3].trim()}`;
		const written = refs.map((i) => known[i]).join('');
		if (kind === 'milieu') {
			if (refs.length !== 2) return `milieu de deux points (ex. ${name} milieu AE)`;
			const at = solidePoints3(shape.form, shape.dims, points);
			if (samePosition(at[refs[0]], at[refs[1]])) {
				return `milieu de deux points distincts (${written} : un seul point)`;
			}
			points.push({ name, of: refs, label: `milieu de [${written}]` });
		} else {
			const allVertices = sameSet(refs, [...Array(topology.vertexCount).keys()]);
			if (allVertices && (shape.form === 'cube' || shape.form === 'pave')) {
				points.push({
					name,
					of: [...refs].sort((a, b) => a - b),
					label: `centre ${topology.ofThe}`
				});
				known.push(name);
				continue;
			}
			const face = topology.faces.find((f) => sameSet(f, refs));
			if (face === undefined) return `${written} n’est pas une face ${topology.ofThe}`;
			points.push({
				name,
				of: face,
				label: `centre de ${face.map((i) => known[i]).join('')}`
			});
		}
		known.push(name);
	}
	return points;
}

/** Les vecteurs de `vecteurs:` ; une phrase d'erreur sinon */
function readVectors(
	value: string,
	shape: { form: SolideForm; dims: number[] },
	names: (string | null)[],
	points: SolidePoint[]
): SolideVector[] | string {
	const items = value.split(',').filter((i) => i.trim() !== '');
	if (items.length > SOLIDE_MAX_VECTORS) return `au plus ${SOLIDE_MAX_VECTORS} vecteurs`;
	const known = [...names.map((n) => n ?? ''), ...points.map((p) => p.name)];
	const at = solidePoints3(shape.form, shape.dims, points);
	const vectors: SolideVector[] = [];
	for (const item of items) {
		const match = /^(?:([^=]+)=)?(.*)$/.exec(item.trim());
		const name = match?.[1]?.trim() ?? null;
		const what = (match?.[2] ?? '').trim();
		if (name !== null) {
			if (!VECTOR_NAME_REGEX.test(name)) {
				return `« ${name} » : un nom de vecteur est une minuscule, puis éventuellement un chiffre (u, v, u1)`;
			}
			if (vectors.some((v) => v.name === name)) {
				return `« ${name} » deux fois : chaque vecteur a son nom`;
			}
		}
		const refs = namedPoints(what, known);
		if (typeof refs === 'string') return refs;
		if (refs.length !== 2) return `« ${what} » : un vecteur se désigne par deux points (ex. AB)`;
		if (samePosition(at[refs[0]], at[refs[1]])) {
			return `${what.replace(/[[\]()\s]/g, '')} : vecteur nul (origine et extrémité confondues)`;
		}
		vectors.push({ from: refs[0], to: refs[1], name });
	}
	return vectors;
}

/** Les droites de `droites:` ; une phrase d'erreur sinon */
function readDroites(
	value: string,
	shape: { form: SolideForm; dims: number[] },
	names: (string | null)[],
	points: SolidePoint[],
	vectors: SolideVector[]
): SolideDroite[] | string {
	const items = value.split(',').filter((i) => i.trim() !== '');
	if (items.length > SOLIDE_MAX_DROITES) return `au plus ${SOLIDE_MAX_DROITES} droites`;
	const known = [...names.map((n) => n ?? ''), ...points.map((p) => p.name)];
	const at = solidePoints3(shape.form, shape.dims, points);
	const size = Math.max(...shape.dims);
	/** Le point p est-il sur la droite (a b) ? (distance à la droite, rapportée à la taille du solide) */
	const onLine = (p: Point3, a: Point3, b: Point3) => {
		const u = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
		const w = { x: p.x - a.x, y: p.y - a.y, z: p.z - a.z };
		const cross = Math.hypot(u.y * w.z - u.z * w.y, u.z * w.x - u.x * w.z, u.x * w.y - u.y * w.x);
		return cross / Math.hypot(u.x, u.y, u.z) < size * SAME_LINE;
	};
	const droites: SolideDroite[] = [];
	for (const item of items) {
		const match = /^(?:([^=]+)=)?(.*)$/.exec(item.trim());
		const name = match?.[1]?.trim().replace(/’/g, "'") ?? null;
		const what = (match?.[2] ?? '').trim();
		if (name !== null) {
			if (!DROITE_NAME_REGEX.test(name)) {
				return `« ${name} » : un nom de droite est une minuscule, puis éventuellement ' ou un chiffre (d, d', d1)`;
			}
			if (droites.some((d) => d.name === name)) {
				return `« ${name} » deux fois : chaque droite a son nom`;
			}
			if (vectors.some((v) => v.name === name)) {
				return `« ${name} » est déjà le nom d’un vecteur`;
			}
		}
		const refs = namedPoints(what, known);
		if (typeof refs === 'string') return refs;
		const written = `(${refs.map((i) => known[i]).join('')})`;
		if (refs.length !== 2) return `« ${what} » : une droite se désigne par deux points (ex. (AG))`;
		if (samePosition(at[refs[0]], at[refs[1]])) {
			return `${written} : une droite passe par deux points distincts`;
		}
		const same = droites.find(
			(d) => onLine(at[refs[0]], at[d.from], at[d.to]) && onLine(at[refs[1]], at[d.from], at[d.to])
		);
		if (same !== undefined) {
			return `${written} et (${known[same.from]}${known[same.to]}) : c’est la même droite`;
		}
		droites.push({ from: refs[0], to: refs[1], name });
	}
	return droites;
}

/** Les plans de `plans:` ; une phrase d'erreur sinon */
function readPlans(
	value: string,
	shape: { form: SolideForm; dims: number[] },
	names: (string | null)[],
	points: SolidePoint[]
): SolidePlan[] | string {
	const items = value.split(',').filter((i) => i.trim() !== '');
	if (items.length > SOLIDE_MAX_PLANS) return `au plus ${SOLIDE_MAX_PLANS} plans`;
	const known = [...names.map((n) => n ?? ''), ...points.map((p) => p.name)];
	const at = solidePoints3(shape.form, shape.dims, points);
	const size = Math.max(...shape.dims);
	/** La normale du plan (a b c), de longueur 1 ; null : les trois points sont alignés */
	const normalOf = (a: Point3, b: Point3, c: Point3): Point3 | null => {
		const u = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z };
		const v = { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z };
		const n = { x: u.y * v.z - u.z * v.y, y: u.z * v.x - u.x * v.z, z: u.x * v.y - u.y * v.x };
		const length = Math.hypot(n.x, n.y, n.z);
		// Aire du triangle rapportée à la taille du solide : nulle, ils sont alignés
		if (length < size * size * SAME_LINE) return null;
		return { x: n.x / length, y: n.y / length, z: n.z / length };
	};
	const plans: SolidePlan[] = [];
	for (const item of items) {
		const match = /^(?:([^=]+)=)?(.*)$/.exec(item.trim());
		const name = match?.[1]?.trim().replace(/’/g, "'") ?? null;
		const what = (match?.[2] ?? '').trim();
		if (name !== null) {
			if (!PLAN_NAME_REGEX.test(name)) {
				return `« ${name} » : un nom de plan est une majuscule, puis éventuellement ' ou un chiffre (P, P', P1)`;
			}
			if (plans.some((p) => p.name === name)) {
				return `« ${name} » deux fois : chaque plan a son nom`;
			}
			if (known.includes(name)) return `« ${name} » est déjà le nom d’un point`;
		}
		const refs = namedPoints(what, known);
		if (typeof refs === 'string') return refs;
		const written = `(${refs.map((i) => known[i]).join('')})`;
		if (refs.length !== 3) return `« ${what} » : un plan se désigne par trois points (ex. (BDE))`;
		const [a, b, c] = refs;
		if (normalOf(at[a], at[b], at[c]) === null) {
			return `${written} : les trois points sont alignés, ils ne donnent pas un plan`;
		}
		const same = plans.find((plan) => {
			const [p, q, r] = plan.through.map((i) => at[i]);
			const normal = normalOf(p, q, r);
			return (
				normal !== null &&
				[a, b, c].every((i) => {
					const w = { x: at[i].x - p.x, y: at[i].y - p.y, z: at[i].z - p.z };
					return Math.abs(w.x * normal.x + w.y * normal.y + w.z * normal.z) < size * SAME_LINE;
				})
			);
		});
		if (same !== undefined) {
			return `${written} et (${same.through.map((i) => known[i]).join('')}) : c’est le même plan`;
		}
		plans.push({ through: [a, b, c], name });
	}
	return plans;
}

/** La combinaison de `tracer:` et son origine imposée ; une phrase d'erreur sinon */
function readTask(
	value: string,
	shape: { form: SolideForm; dims: number[] },
	names: (string | null)[],
	points: SolidePoint[],
	vectors: SolideVector[]
): SolideTask | string {
	const match = /^vecteur\s+(.*?)(?:\s+depuis\s+(\S+))?$/i.exec(value.trim());
	if (match === null || match[1].trim() === '') {
		return `tracer « ${value} » non compris (tracer: vecteur AB + AD, ou … depuis A)`;
	}
	const known = [...names.map((n) => n ?? ''), ...points.map((p) => p.name)];
	const at = solidePoints3(shape.form, shape.dims, points);
	const terms: SolideVectorTerm[] = [];
	let rest = match[1].trim();
	while (rest !== '') {
		const term = TERM_REGEX.exec(rest);
		if (term === null || (terms.length > 0 && term[1] === undefined)) {
			return `vecteur « ${match[1].trim()} » non compris (${TRACER_USAGE})`;
		}
		// Pas de zéro en tête (01/2, 1/04) : la phrase de l'élève reprend l'écriture de l'auteur
		if (term[3] !== undefined && (/^0\d/.test(term[2] ?? '') || /^0\d/.test(term[3]))) {
			return `coefficient ${term[2]}/${term[3]} : écrire ${Number(term[2])}/${Number(term[3])}`;
		}
		const numerator = term[2] === undefined ? 1 : Number(term[2]);
		const denominator = term[3] === undefined ? 1 : Number(term[3]);
		if (!TRACER_DENOMINATORS.includes(denominator)) {
			return `coefficient ${term[2]}/${term[3]} : coefficients entiers ou fractions de dénominateur 2, 3 ou 4 (ex. 1/2 AE, 2/3 AB)`;
		}
		if (numerator === 0) return `coefficient nul devant ${term[4]}`;
		// La phrase de l'élève reprend l'écriture de l'auteur : pas de 2/4 dans une correction
		const divisor = gcd(numerator, denominator);
		if (term[3] !== undefined && (divisor !== 1 || denominator === 1)) {
			const n = numerator / divisor;
			const d = denominator / divisor;
			return `coefficient ${term[2]}/${term[3]} : écrire ${d === 1 ? n : `${n}/${d}`}`;
		}
		const sign = term[1] === '-' ? -1 : 1;
		const coef = (sign * numerator) / denominator;
		if (VECTOR_NAME_REGEX.test(term[4])) {
			const named = vectors.find((v) => v.name === term[4]);
			if (named === undefined) return `${term[4]} : aucun vecteur de ce nom dans vecteurs:`;
			terms.push({ coef, from: named.from, to: named.to, name: term[4] });
		} else {
			const refs = namedPoints(term[4], known);
			if (typeof refs === 'string') return refs;
			if (refs.length !== 2)
				return `« ${term[4]} » : un vecteur se désigne par deux points (ex. AB)`;
			if (samePosition(at[refs[0]], at[refs[1]])) {
				return `${term[4]} : vecteur nul (origine et extrémité confondues)`;
			}
			terms.push({ coef, from: refs[0], to: refs[1] });
		}
		rest = rest.slice(term[0].length);
	}
	if (terms.length > SOLIDE_MAX_TERMS) return `au plus ${SOLIDE_MAX_TERMS} vecteurs à additionner`;
	let origin: number | null = null;
	if (match[2] !== undefined) {
		const refs = namedPoints(match[2], known);
		if (typeof refs === 'string') return `depuis ${match[2]} : ${refs}`;
		if (refs.length !== 1) return `depuis « ${match[2]} » : un seul point (ex. depuis A)`;
		origin = refs[0];
	}
	const geometry = { ...shape, names, points };
	if (isNullCombination(geometry, terms)) {
		return 'la combinaison est le vecteur nul : l’élève n’a rien à tracer';
	}
	const task: SolideTask = { kind: 'vecteur', terms, origin };
	if (solideVectorPairs(geometry, task).length === 0) {
		return origin === null
			? 'l’extrémité ne tombe sur aucun point du solide, quelle que soit l’origine (points possibles : sommets nommés, points déclarés)'
			: `depuis ${known[origin]}, l’extrémité ne tombe sur aucun point du solide (points possibles : sommets nommés, points déclarés)`;
	}
	return task;
}

/**
 * Analyser le texte d'un bloc ```solide (sans les clôtures).
 * Ligne 1 = première ligne après ```solide.
 */
export function parseSolideContent(source: string): {
	spec: SolideSpec | null;
	errors: string[];
	/** Geste dans une question : sa case, posée par le générateur (`case: N`) */
	caseIndex?: number;
	/** Phrases pour l'auteur sur `tourner:` ; la figure se dessine, fixe */
	rotationErrors?: string[];
} {
	const errors: string[] = [];
	const fail = (line: number, message: string) => errors.push(`Ligne ${line} : ${message}`);
	const seen = new Map<string, { line: number; value: string }>();

	source.split('\n').forEach((line, index) => {
		const text = line.trim();
		if (text === '') return;
		const lineNo = index + 1;
		const match = KEY_LINE_REGEX.exec(text);
		if (!match) {
			fail(lineNo, `ligne « ${text} » non comprise (attendu : clé: valeur, ex. forme: cube 3)`);
			return;
		}
		const key = plain(match[1]);
		if (!(SOLIDE_KEYS as readonly string[]).includes(key)) {
			fail(lineNo, `clé « ${match[1]} » inconnue (clés possibles : ${KEY_LIST})`);
			return;
		}
		const previous = seen.get(key);
		if (previous !== undefined) {
			fail(lineNo, `« ${key} » déjà donnée ligne ${previous.line}`);
			return;
		}
		seen.set(key, { line: lineNo, value: match[2].trim() });
	});

	const formEntry = seen.get('forme');
	if (formEntry === undefined) {
		fail(1, 'il manque la forme (ex. forme: pave 4 2 3)');
		return { spec: null, errors };
	}
	const shape = readForm(formEntry.value);
	if (typeof shape === 'string') {
		fail(formEntry.line, shape);
		return { spec: null, errors };
	}
	const topology = solideTopology(shape.form);

	let names: (string | null)[] | null = null;
	const namesEntry = seen.get('sommets');
	if (namesEntry !== undefined) {
		const read = readNames(namesEntry.value, topology);
		if (typeof read === 'string') fail(namesEntry.line, read);
		else names = read;
	}

	const marks: SolideMark[] = [];
	const marksEntry = seen.get('marquer');
	// Des noms faux rendent toute marque illisible : une seule erreur, celle des noms
	if (marksEntry !== undefined && (namesEntry === undefined || names !== null)) {
		for (const item of marksEntry.value.split(',').filter((i) => i.trim() !== '')) {
			const mark = readMark(item, topology, names);
			if (typeof mark === 'string') fail(marksEntry.line, mark);
			else marks.push(mark);
		}
	}

	let cotes: SolideSpec['cotes'] = null;
	const cotesEntry = seen.get('cotes');
	if (cotesEntry !== undefined) {
		const value = plain(cotesEntry.value);
		if ((SOLIDE_UNITS as readonly string[]).includes(value)) {
			cotes = { unit: value as (typeof SOLIDE_UNITS)[number] };
		} else if (value === 'oui') {
			cotes = { unit: '' };
		} else if (value !== 'non') {
			fail(
				cotesEntry.line,
				`cotes « ${cotesEntry.value} » : valeurs possibles ${SOLIDE_UNITS.join(', ')}, oui, non`
			);
		}
	}

	let hidden = true;
	const hiddenEntry = seen.get('cachees');
	if (hiddenEntry !== undefined) {
		const value = plain(hiddenEntry.value);
		if (value === 'non') hidden = false;
		else if (value !== 'oui')
			fail(hiddenEntry.line, `cachees « ${hiddenEntry.value} » : oui ou non`);
	}

	let section: SolideSection | null = null;
	const sectionEntry = seen.get('section');
	if (sectionEntry !== undefined && (namesEntry === undefined || names !== null)) {
		const read = readSection(sectionEntry.value, shape, topology, names);
		if (typeof read === 'string') fail(sectionEntry.line, read);
		else section = read;
	}

	// Points et vecteurs : polyèdres nommés ; des noms faux rendent tout illisible (une erreur, celle des noms)
	const pointsEntry = seen.get('points');
	const vectorsEntry = seen.get('vecteurs');
	let points: SolidePoint[] = [];
	let vectors: SolideVector[] = [];
	const needs = (
		entry: { line: number },
		what: 'points' | 'vecteurs' | 'droites' | 'plans' | 'repere' | 'tracer'
	): boolean => {
		if (topology.curved) {
			fail(entry.line, `${what} : polyèdres seulement (pas ${topology.indefinite})`);
			return false;
		}
		if (namesEntry === undefined) {
			const purpose = {
				points: 'déclarer des points',
				vecteurs: 'dessiner des vecteurs',
				droites: 'dessiner des droites',
				plans: 'dessiner des plans',
				repere: 'poser un repère',
				tracer: 'faire tracer un vecteur'
			}[what];
			fail(entry.line, `nomme les sommets (sommets:) pour ${purpose}`);
			return false;
		}
		return names !== null;
	};
	// Repère (`repere:`, chantier `solides-3d`, lot 7c) : lu à la demande, au premier point
	// donné par ses coordonnées (il s'appuie sur les points déclarés avant), sinon après les points
	const repereEntry = seen.get('repere');
	let repere: SolideRepere | undefined;
	let repereAsked = false;
	const frame = (declared: SolidePoint[]): SolideRepere | 'absent' | 'failed' => {
		if (repereEntry === undefined) return 'absent';
		if (!repereAsked) {
			repereAsked = true;
			// Pas dans ce lot : le plan de coupe et le geste (comportement 83)
			for (const other of ['section', 'tracer'] as const) {
				if (seen.has(other)) fail(repereEntry.line, `repere: ne va pas encore avec ${other}:`);
			}
			if (needs(repereEntry, 'repere') && names !== null) {
				const read = readRepere(
					repereEntry.value,
					shape,
					names,
					declared,
					pointsAfterCoords(pointsEntry?.value ?? '')
				);
				if (typeof read === 'string') fail(repereEntry.line, read);
				else repere = read;
			}
		}
		return repere ?? 'failed';
	};
	let pointsRead = true;
	if (pointsEntry !== undefined) {
		pointsRead = false;
		if (needs(pointsEntry, 'points') && names !== null) {
			const read = readPoints(pointsEntry.value, shape, topology, names, frame);
			if (typeof read === 'string') fail(pointsEntry.line, read);
			else if (read !== null) {
				points = read;
				pointsRead = true;
			}
		}
	}
	// Des points faux rendent le repère illisible : une seule erreur, celle des points
	if (pointsRead) frame(points.filter((p) => p.coords === undefined));
	// `tracer:` peut nommer un vecteur de `vecteurs:` : une ligne fausse ne doit pas en ajouter une seconde
	let vectorsRead = true;
	if (vectorsEntry !== undefined) {
		vectorsRead = false;
		if (needs(vectorsEntry, 'vecteurs') && names !== null && pointsRead) {
			const read = readVectors(vectorsEntry.value, shape, names, points);
			if (typeof read === 'string') fail(vectorsEntry.line, read);
			else {
				vectors = read;
				vectorsRead = true;
			}
		}
	}
	// Droites (`droites:`, chantier `solides-3d`, lot 7a) : par deux points nommés
	const droitesEntry = seen.get('droites');
	let droites: SolideDroite[] = [];
	if (droitesEntry !== undefined) {
		// Pas dans ce lot : le plan de coupe et le geste (comportement 83)
		for (const other of ['section', 'tracer'] as const) {
			if (seen.has(other)) fail(droitesEntry.line, `droites: ne va pas encore avec ${other}:`);
		}
		if (needs(droitesEntry, 'droites') && names !== null && pointsRead && vectorsRead) {
			const read = readDroites(droitesEntry.value, shape, names, points, vectors);
			if (typeof read === 'string') fail(droitesEntry.line, read);
			else droites = read;
		}
	}
	// Plans (`plans:`, chantier `solides-3d`, lot 7b) : par trois points nommés
	const plansEntry = seen.get('plans');
	let plans: SolidePlan[] = [];
	if (plansEntry !== undefined) {
		// Pas dans ce lot : le plan de coupe et le geste (comportement 83)
		for (const other of ['section', 'tracer'] as const) {
			if (seen.has(other)) fail(plansEntry.line, `plans: ne va pas encore avec ${other}:`);
		}
		if (needs(plansEntry, 'plans') && names !== null && pointsRead) {
			const read = readPlans(plansEntry.value, shape, names, points);
			if (typeof read === 'string') fail(plansEntry.line, read);
			else plans = read;
		}
	}
	// Geste (`tracer:`) : sur les points nommés, comme `vecteurs:`
	const tracerEntry = seen.get('tracer');
	let task: SolideTask | undefined;
	if (
		tracerEntry !== undefined &&
		needs(tracerEntry, 'tracer') &&
		names !== null &&
		pointsRead &&
		vectorsRead
	) {
		const read = readTask(tracerEntry.value, shape, names, points, vectors);
		if (typeof read === 'string') fail(tracerEntry.line, read);
		else task = read;
	}
	const caseEntry = seen.get('case');
	let caseIndex: number | undefined;
	if (caseEntry !== undefined) {
		if (/^\d+$/.test(caseEntry.value)) caseIndex = Number(caseEntry.value);
		else fail(caseEntry.line, `case « ${caseEntry.value} » : numéro de case entier`);
		if (tracerEntry === undefined) fail(caseEntry.line, 'case: sans objet sans tracer:');
	}
	const withCase = caseIndex === undefined ? {} : { caseIndex };

	const taken = points.find((p) => section?.kind === 'face' && section.names?.includes(p.name));
	if (taken !== undefined && sectionEntry !== undefined) {
		fail(sectionEntry.line, `« ${taken.name} » est déjà le nom d’un point (points:)`);
	}

	if (errors.length > 0) return { spec: null, errors, ...withCase };

	// Rotation : une ligne `tourner:` fausse laisse la figure fixe, sans mettre le bloc en erreur
	const turnEntry = seen.get('tourner');
	let rotate = false;
	let rotationErrors: string[] | undefined;
	if (turnEntry !== undefined) {
		const value = plain(turnEntry.value);
		if (value !== 'oui' && value !== 'non') {
			rotationErrors = [`Ligne ${turnEntry.line} : tourner « ${turnEntry.value} » : oui ou non`];
		} else rotate = value === 'oui';
	}
	return {
		...withCase,
		...(rotationErrors !== undefined && { rotationErrors }),
		spec: {
			kind: 'solide',
			form: shape.form,
			dims: shape.dims,
			names,
			marks,
			cotes,
			hidden,
			section,
			points,
			vectors,
			...(droites.length > 0 && { droites }),
			...(plans.length > 0 && { plans }),
			...(repere !== undefined && { repere }),
			...(task !== undefined && { task }),
			...(rotate && { rotate: true as const })
		},
		errors
	};
}
