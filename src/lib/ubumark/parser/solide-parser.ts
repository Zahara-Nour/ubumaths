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
 *
 * Chantier `solides`, lots 3 et 6 (§ 8 et 11 du journal), ADR 0034.
 *
 * @module ubumark/parser/solide-parser
 */

import {
	SOLIDE_FORMS,
	SOLIDE_KEYS,
	SOLIDE_MAX_DECIMALS,
	SOLIDE_MAX_DIMENSION,
	SOLIDE_MAX_RATIO,
	SOLIDE_UNITS,
	type SolideForm,
	type SolideMark,
	type SolideSection,
	type SolideSpec
} from '../types/espace';
import {
	SOLIDE_FLAT_CONE,
	SOLIDE_PLACES,
	polyhedronVertices,
	solideTopology,
	type SolidePlace,
	type SolideTopology
} from '../utils/espace-solides';

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
	word !== undefined && DIMENSION_REGEX.test(word) ? Number(word.replace(',', '.')) : null;

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
	const outside = (max: number) =>
		`le plan ne coupe pas ${the} : distance entre 0 et ${String(max).replace('.', ',')} (exclus)`;

	if (shape.form === 'cube' || shape.form === 'pave') {
		if (plain(words[0] ?? '') !== 'parallele' || words[1] === undefined || words.length > 4) {
			return `section « ${value} » non comprise (${SECTION_USAGES.box})`;
		}
		const face = readFace(words[1], topology, names);
		if (typeof face === 'string') return face;
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
		if (rest.length > 1) return `section « ${value} » non comprise (${SECTION_USAGES.box})`;
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
			return `section « ${value} » non comprise (${SECTION_USAGES.cylindre})`;
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
		if (distance === null) return `section « ${value} » non comprise (${SECTION_USAGES.boule})`;
		if (distance >= r) {
			const max = String(r).replace('.', ',');
			return `le plan ne coupe pas ${the} : distance au centre de 0 à ${max} (${max} exclu)`;
		}
		return { kind: 'boule', distance };
	}

	return `section : cube, pavé, cylindre ou boule (pas ${topology.indefinite})`;
}

/**
 * Analyser le texte d'un bloc ```solide (sans les clôtures).
 * Ligne 1 = première ligne après ```solide.
 */
export function parseSolideContent(source: string): {
	spec: SolideSpec | null;
	errors: string[];
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

	if (errors.length > 0) return { spec: null, errors };
	return {
		spec: {
			kind: 'solide',
			form: shape.form,
			dims: shape.dims,
			names,
			marks,
			cotes,
			hidden,
			section
		},
		errors
	};
}
