import { describe, it, expect } from 'vitest';
import MATH_DICTIONARY, {
	getAllTerms,
	getTermsByTag,
	getTermsByTagAndGrade,
	getTermsForGrade,
	gradeMetBy,
	isTermVisibleTo,
	resolveGradedField,
	type MathTerm
} from '../math-dictionary-fr';
import { readFileSync } from 'node:fs';
import { GRADE_CODES, GRADES, type GradeCode } from '$lib/types/grades';
import { hasAccessToGrade } from '$lib/utils/grades';

/**
 * Niveaux validés par David (lot 0b, 2026-10-09) : copie figée de docs/wip/lexique/lot0b-niveaux.md,
 * mise à jour par le lot 0c pour les entrées qu'il a reprises (voir le champ `source` du JSON).
 */
interface ValidatedLevels {
	principaux: { term: string; sense: string | null; grade: string; niveauxDefinitions: string[] }[];
	derives: { term: string; grade: string }[];
}
const LOT_0B: ValidatedLevels = JSON.parse(
	readFileSync('tests/fixtures/lexique/niveaux-lot0b.json', 'utf-8')
);

/** Définitions validées par David (lot 0c, 2026-10-09) : copie figée de docs/wip/lexique/lot0c-definitions.md. */
interface ValidatedDefinitions {
	entrees: {
		term: string;
		sense: string | null;
		grade: string;
		derivedFrom?: string | null;
		keepDefs: boolean;
		definitions?: { grade: string; content: string }[];
		synonymesRetires: string[];
	}[];
}
const LOT_0C: ValidatedDefinitions = JSON.parse(
	readFileSync('tests/fixtures/lexique/definitions-lot0c.json', 'utf-8')
);

/** Mots ajoutés et validés par David (lot 0d-1, 2026-10-09) : copie figée de docs/wip/lexique/lot0d-mots.md. */
interface AddedWords {
	entrees: {
		term: string;
		sense: string | null;
		grade: string;
		definitions: { grade: string; content: string }[];
	}[];
	synonymes: { term: string; ajouts: string[] }[];
}
const LOT_0D: AddedWords = JSON.parse(
	readFileSync('tests/fixtures/lexique/mots-lot0d.json', 'utf-8')
);

/** Verbes de consigne et mots jamais soulignés (lot 0e, 2026-10-09) : copie figée de docs/wip/lexique/lot0e-consignes.md. */
interface Consignes {
	verbes: {
		term: string;
		grade: string;
		definitions: { grade: string; content: string }[];
		forms: string[];
	}[];
	formes: { term: string; forms: string[]; synonyms: string[] }[];
	exclus: string[];
	consignesEnProd: string[];
}
const LOT_0E: Consignes = JSON.parse(
	readFileSync('tests/fixtures/lexique/consignes-lot0e.json', 'utf-8')
);

/** Mots, synonymes et étiquettes d'homonymes validés par David (lot 0f, 2026-10-09) : copie figée de docs/wip/lexique/lot0f-mots.md. */
interface MissingWords {
	entrees: {
		term: string;
		sense: string | null;
		grade: string;
		definitions: { grade: string; content: string }[];
		synonyms: string[];
	}[];
	renvois: { term: string; grade: string; derivedFrom: string }[];
	synonymes: { term: string; ajouts: string[] }[];
	etiquettes: { term: string; sense: string }[];
	supprimees: { term: string; content: string }[];
	definitionsAjoutees: { term: string; definitions: { grade: string; content: string }[] }[];
	exclus: string[];
	orthographe: { avant: string[]; apres: string[] };
	formulesSansAccent: string[];
	minute: string[];
	repereSynonymeRetire: string;
}
const LOT_0F: MissingWords = JSON.parse(
	readFileSync('tests/fixtures/lexique/mots-lot0f.json', 'utf-8')
);

/** Mots partagés entre les filières de 1re (lot 0g, 2026-10-09) : copie figée de docs/wip/lexique/lot0g-filieres.md. */
interface SharedWords {
	termes: { term: string; sense: string | null; sharedWith: string[] }[];
	definitions: { term: string; sense: string | null; grade: string; sharedWith: string[] }[];
}
const LOT_0G: SharedWords = JSON.parse(
	readFileSync('tests/fixtures/lexique/filieres-lot0g.json', 'utf-8')
);

/** Minuscules, accents retirés : « Unité » et « unite » sont le même mot. */
function normalizeName(text: string): string {
	return text
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim();
}

describe('math-dictionary-fr', () => {
	// -----------------------------------------------------------------------
	// Data integrity
	// -----------------------------------------------------------------------

	it('should have at least 200 terms', () => {
		expect(MATH_DICTIONARY.length).toBeGreaterThanOrEqual(200);
	});

	it('should have no duplicate terms (term + sense)', () => {
		const keys = MATH_DICTIONARY.map((t) => `${t.term}|${t.sense ?? ''}`);
		const unique = new Set(keys);
		const duplicates = keys.filter((k, i) => keys.indexOf(k) !== i);
		expect(duplicates).toEqual([]);
		expect(unique.size).toBe(keys.length);
	});

	it('should have valid GradeCode for every term', () => {
		const validCodes = new Set<string>(GRADE_CODES);
		for (const term of MATH_DICTIONARY) {
			expect(validCodes.has(term.grade), `"${term.term}" has invalid grade "${term.grade}"`).toBe(
				true
			);
		}
	});

	it('should have at least 1 tag for every term', () => {
		for (const term of MATH_DICTIONARY) {
			expect(term.tags.length, `"${term.term}" has no tags`).toBeGreaterThanOrEqual(1);
		}
	});

	it('should have non-empty definitions for principal terms', () => {
		for (const term of MATH_DICTIONARY) {
			if (term.derivedFrom) continue;
			expect(term.definitions?.items.length, `"${term.term}" has no definitions`).toBeGreaterThan(
				0
			);
			for (const item of term.definitions?.items ?? []) {
				expect(
					item.content?.trim().length,
					`"${term.term}" has empty definition content`
				).toBeGreaterThan(0);
			}
		}
	});

	it('should have valid GradeCode in definition items', () => {
		const validCodes = new Set<string>(GRADE_CODES);
		for (const term of MATH_DICTIONARY) {
			for (const item of term.definitions?.items ?? []) {
				expect(
					validCodes.has(item.grade),
					`"${term.term}" definition has invalid grade "${item.grade}"`
				).toBe(true);
			}
		}
	});

	it('should have no duplicate terms, ignoring accents and case', () => {
		const keys = MATH_DICTIONARY.map(
			(t) => `${normalizeName(t.term)}|${normalizeName(t.sense ?? '')}`
		);
		const duplicates = keys.filter((k, i) => keys.indexOf(k) !== i);
		expect(duplicates).toEqual([]);
	});

	// -----------------------------------------------------------------------
	// Niveaux des définitions
	// -----------------------------------------------------------------------
	// Le refactor GradedField du 2026-04-19 avait rangé chaque définition au
	// niveau de l'entrée précédente : « moyenne » (6e) n'avait de définition
	// qu'en Terminale, et la fiche du glossaire restait vide en 6e.

	it('should show a definition to every reader who has access to the term', () => {
		const hidden: string[] = [];
		for (const term of MATH_DICTIONARY) {
			if (term.derivedFrom || !term.definitions) continue;
			for (const reader of GRADE_CODES) {
				if (!isTermVisibleTo(term, reader)) continue;
				if (resolveGradedField(term.definitions, reader).length === 0) {
					hidden.push(`${term.term} (${term.grade}) caché en ${reader}`);
				}
			}
		}
		expect(hidden).toEqual([]);
	});

	it('should start definitions at the term grade, then go up', () => {
		const misplaced: string[] = [];
		for (const term of MATH_DICTIONARY) {
			const items = term.definitions?.items ?? [];
			if (items.length === 0) continue;
			if (items[0].grade !== term.grade) {
				misplaced.push(`${term.term} : terme ${term.grade}, définition ${items[0].grade}`);
			}
			for (let i = 1; i < items.length; i++) {
				const previous = items[i - 1].grade;
				const current = items[i].grade;
				if (current === previous || !hasAccessToGrade(current, previous)) {
					misplaced.push(`${term.term} : ${previous} puis ${current}`);
				}
			}
		}
		expect(misplaced).toEqual([]);
	});

	it('should never place an example before its term', () => {
		const early: string[] = [];
		for (const term of MATH_DICTIONARY) {
			for (const item of term.exemples?.items ?? []) {
				if (!hasAccessToGrade(item.grade, term.grade)) {
					early.push(`${term.term} : terme ${term.grade}, exemple ${item.grade}`);
				}
			}
		}
		expect(early).toEqual([]);
	});

	// Un terme est rangé au niveau de sa première mention au BO ; un sens plus
	// simple employé plus tôt ajoute une définition au lieu de déplacer l'ancienne.
	it('should place each reviewed term at the level validated in lot 0b', () => {
		// Une copie vide ou tronquée ne doit pas passer en silence
		// 221 et 15 au lot 0b ; le lot 0c a fait d'« exponentielle » un renvoi
		expect(LOT_0B.principaux).toHaveLength(220);
		expect(LOT_0B.derives).toHaveLength(16);
		const wrong: string[] = [];
		for (const expected of LOT_0B.principaux) {
			const term = MATH_DICTIONARY.find(
				(t) => t.term === expected.term && (t.sense ?? null) === expected.sense && !t.derivedFrom
			);
			if (!term) {
				wrong.push(`${expected.term} : introuvable`);
				continue;
			}
			const levels = (term.definitions?.items ?? []).map((item) => item.grade).join(', ');
			const expectedLevels = expected.niveauxDefinitions.join(', ');
			if (term.grade !== expected.grade || levels !== expectedLevels) {
				wrong.push(
					`${expected.term} : ${term.grade} [${levels}], attendu ${expected.grade} [${expectedLevels}]`
				);
			}
		}
		for (const expected of LOT_0B.derives) {
			const term = MATH_DICTIONARY.find((t) => t.term === expected.term && t.derivedFrom);
			if (term?.grade !== expected.grade) {
				const found = term?.grade ?? 'introuvable';
				wrong.push(`${expected.term} (dérivé) : ${found}, attendu ${expected.grade}`);
			}
		}
		expect(wrong).toEqual([]);
	});

	// Les définitions affichées aux élèves sont celles que David a relues une à
	// une : une modification non relue doit faire échouer ce test.
	it('should carry the definitions validated in lot 0c, word for word', () => {
		expect(LOT_0C.entrees).toHaveLength(116);
		const wrong: string[] = [];
		for (const expected of LOT_0C.entrees) {
			const term = MATH_DICTIONARY.find(
				(t) => t.term === expected.term && (t.sense ?? null) === expected.sense
			);
			if (!term) {
				wrong.push(`${expected.term} : introuvable`);
				continue;
			}
			if (term.grade !== expected.grade) {
				wrong.push(`${expected.term} : niveau ${term.grade}, attendu ${expected.grade}`);
			}
			// Sans clé `derivedFrom`, une entrée qui garde ses définitions reste un terme principal
			const expectedTarget =
				'derivedFrom' in expected
					? expected.derivedFrom
					: expected.keepDefs
						? term.derivedFrom
						: null;
			if ((term.derivedFrom ?? null) !== (expectedTarget ?? null)) {
				wrong.push(
					`${expected.term} : renvoi ${term.derivedFrom ?? 'aucun'}, attendu ${expectedTarget ?? 'aucun'}`
				);
			}
			if (!expected.keepDefs) {
				const actual = (term.definitions?.items ?? []).map((i) => `${i.grade} : ${i.content}`);
				const wanted = (expected.definitions ?? []).map((i) => `${i.grade} : ${i.content}`);
				const index = wanted.findIndex((line, i) => actual[i] !== line);
				if (index !== -1 || actual.length !== wanted.length) {
					const at = index === -1 ? wanted.length : index;
					wrong.push(
						`${expected.term} : définition ${at + 1} « ${actual[at] ?? '—'} », attendu « ${wanted[at] ?? '—'} »`
					);
				}
			}
			for (const removed of expected.synonymesRetires) {
				if (term.synonyms?.includes(removed))
					wrong.push(`${expected.term} : synonyme « ${removed} »`);
			}
		}
		expect(wrong).toEqual([]);
	});

	// Mots que le programme officiel donne à apprendre, homonymes et notions des
	// classes actuelles : chaque texte a été relu par David.
	it('should contain the words added in lot 0d, word for word', () => {
		expect(LOT_0D.entrees).toHaveLength(83);
		expect(LOT_0D.synonymes).toHaveLength(5);
		const wrong: string[] = [];
		for (const expected of LOT_0D.entrees) {
			const term = MATH_DICTIONARY.find(
				(t) => t.term === expected.term && (t.sense ?? null) === expected.sense && !t.derivedFrom
			);
			if (!term) {
				wrong.push(`${expected.term} : introuvable`);
				continue;
			}
			if (term.grade !== expected.grade) {
				wrong.push(`${expected.term} : niveau ${term.grade}, attendu ${expected.grade}`);
			}
			const actual = (term.definitions?.items ?? []).map((i) => `${i.grade} : ${i.content}`);
			const wanted = expected.definitions.map((i) => `${i.grade} : ${i.content}`);
			if (actual.join('\n') !== wanted.join('\n')) {
				wrong.push(
					`${expected.term} : « ${actual.join(' / ')} », attendu « ${wanted.join(' / ')} »`
				);
			}
		}
		for (const expected of LOT_0D.synonymes) {
			// Les cinq termes n'ont pas de sens : un homonyme ajouté plus tard ne doit pas être visé
			const term = MATH_DICTIONARY.find(
				(t) => t.term === expected.term && !t.sense && !t.derivedFrom
			);
			if (!term) {
				wrong.push(`${expected.term} : introuvable`);
				continue;
			}
			for (const synonym of expected.ajouts) {
				if (!term.synonyms?.includes(synonym)) {
					wrong.push(`${expected.term} : synonyme « ${synonym} » absent`);
				}
			}
		}
		expect(wrong).toEqual([]);
	});

	// « Calculer » donne un résultat numérique, « exprimer » une expression
	// littérale : les verbes de consigne ont des définitions relues par David.
	it('should carry the consigne verbs validated in lot 0e, word for word', () => {
		expect(LOT_0E.verbes).toHaveLength(8);
		expect(LOT_0E.formes).toHaveLength(13);
		const wrong: string[] = [];
		for (const expected of LOT_0E.verbes) {
			const term = MATH_DICTIONARY.find((t) => t.term === expected.term && !t.sense);
			if (!term || term.derivedFrom) {
				wrong.push(`${expected.term} : ${term ? 'encore un renvoi' : 'introuvable'}`);
				continue;
			}
			if (term.grade !== expected.grade) {
				wrong.push(`${expected.term} : niveau ${term.grade}, attendu ${expected.grade}`);
			}
			const actual = (term.definitions?.items ?? []).map((i) => `${i.grade} : ${i.content}`);
			const wanted = expected.definitions.map((i) => `${i.grade} : ${i.content}`);
			if (actual.join('\n') !== wanted.join('\n')) wrong.push(`${expected.term} : définitions`);
			if ((term.forms ?? []).join(', ') !== expected.forms.join(', ')) {
				wrong.push(`${expected.term} : formes ${term.forms?.join(', ') ?? 'aucune'}`);
			}
		}
		for (const expected of LOT_0E.formes) {
			const term = MATH_DICTIONARY.find((t) => t.term === expected.term && !t.sense);
			if ((term?.forms ?? []).join(', ') !== expected.forms.join(', ')) {
				wrong.push(`${expected.term} : formes ${term?.forms?.join(', ') ?? 'aucune'}`);
			}
			for (const synonym of expected.synonyms) {
				if (!term?.synonyms?.includes(synonym))
					wrong.push(`${expected.term} : synonyme « ${synonym} »`);
			}
		}
		expect(wrong).toEqual([]);
	});

	// Une forme qui désignerait deux entrées, ou qui serait déjà le nom d'un
	// terme, rendrait le repérage des mots ambigu.
	it('should give each conjugated form to a single entry', () => {
		const names = new Set(
			MATH_DICTIONARY.flatMap((t) => [t.term, ...(t.synonyms ?? [])]).map(normalizeName)
		);
		const seen = new Map<string, string>();
		const wrong: string[] = [];
		for (const term of MATH_DICTIONARY) {
			for (const form of term.forms ?? []) {
				const key = normalizeName(form);
				if (names.has(key)) wrong.push(`« ${form} » (${term.term}) est déjà un terme`);
				const owner = seen.get(key);
				if (owner) wrong.push(`« ${form} » : ${owner} et ${term.term}`);
				seen.set(key, term.term);
			}
		}
		expect(wrong).toEqual([]);
	});

	it('should recognise the consignes measured in published questions on 2026-10-09', () => {
		const forms = new Set(MATH_DICTIONARY.flatMap((t) => t.forms ?? []).map(normalizeName));
		const missing = LOT_0E.consignesEnProd.filter((c) => !forms.has(normalizeName(c)));
		expect(missing).toEqual([]);
	});

	// Liste fermée : un mot ne devient « jamais souligné » que par décision de David.
	it('should never auto-link exactly the closed list of common words', () => {
		const excluded = MATH_DICTIONARY.filter((t) => t.autoLink === false).map((t) =>
			t.sense ? `${t.term} (${t.sense})` : t.term
		);
		expect(excluded.sort()).toEqual([...LOT_0E.exclus, ...LOT_0F.exclus].sort());
	});

	// Mots manquants du programme officiel, synonymes et étiquettes d'homonymes :
	// chaque texte a été relu par David.
	it('should contain the words validated in lot 0f, word for word', () => {
		expect(LOT_0F.entrees).toHaveLength(138);
		expect(LOT_0F.renvois).toHaveLength(3);
		expect(LOT_0F.synonymes).toHaveLength(13);
		expect(LOT_0F.etiquettes).toHaveLength(12);
		expect(LOT_0F.supprimees).toHaveLength(1);
		expect(LOT_0F.definitionsAjoutees).toHaveLength(3);
		expect(LOT_0F.exclus).toHaveLength(3);
		expect(LOT_0F.orthographe.avant).toHaveLength(2);
		expect(LOT_0F.orthographe.apres).toHaveLength(2);
		expect(LOT_0F.formulesSansAccent).toHaveLength(2);
		const wrong: string[] = [];
		const lines = (items: { grade: string; content: string }[]) =>
			items.map((i) => `${i.grade} : ${i.content}`);
		for (const expected of LOT_0F.entrees) {
			const term = MATH_DICTIONARY.find(
				(t) => t.term === expected.term && (t.sense ?? null) === expected.sense && !t.derivedFrom
			);
			if (!term) {
				wrong.push(`${expected.term} : introuvable`);
				continue;
			}
			if (term.grade !== expected.grade) {
				wrong.push(`${expected.term} : niveau ${term.grade}, attendu ${expected.grade}`);
			}
			const actual = lines(term.definitions?.items ?? []).join('\n');
			if (actual !== lines(expected.definitions).join('\n')) {
				wrong.push(`${expected.term} : définitions « ${actual} »`);
			}
			for (const synonym of expected.synonyms) {
				if (!term.synonyms?.includes(synonym))
					wrong.push(`${expected.term} : synonyme « ${synonym} » absent`);
			}
		}
		for (const expected of LOT_0F.renvois) {
			const term = MATH_DICTIONARY.find((t) => t.term === expected.term);
			if (term?.derivedFrom !== expected.derivedFrom || term.grade !== expected.grade) {
				wrong.push(`${expected.term} : renvoi ${term?.derivedFrom ?? 'introuvable'}`);
			}
		}
		for (const expected of LOT_0F.synonymes) {
			const term = MATH_DICTIONARY.find(
				(t) => t.term === expected.term && !t.sense && !t.derivedFrom
			);
			for (const synonym of expected.ajouts) {
				if (!term?.synonyms?.includes(synonym))
					wrong.push(`${expected.term} : synonyme « ${synonym} » absent`);
			}
		}
		for (const expected of LOT_0F.etiquettes) {
			if (!MATH_DICTIONARY.some((t) => t.term === expected.term && t.sense === expected.sense)) {
				wrong.push(`${expected.term} (${expected.sense}) : introuvable`);
			}
		}
		for (const removed of LOT_0F.supprimees) {
			const still = MATH_DICTIONARY.some(
				(t) =>
					t.term === removed.term && t.definitions?.items.some((i) => i.content === removed.content)
			);
			if (still) wrong.push(`${removed.term} : doublon « ${removed.content} » encore là`);
		}
		for (const expected of LOT_0F.definitionsAjoutees) {
			const term = MATH_DICTIONARY.find((t) => t.term === expected.term && !t.sense);
			const tail = lines(term?.definitions?.items ?? []).slice(-expected.definitions.length);
			if (tail.join('\n') !== lines(expected.definitions).join('\n')) {
				wrong.push(`${expected.term} : définitions ajoutées absentes`);
			}
		}
		// Orthographe du BO (« évènement ») et accents dans les formules
		const names = MATH_DICTIONARY.map((t) => t.term);
		for (const old of LOT_0F.orthographe.avant)
			if (names.includes(old)) wrong.push(`« ${old} » : ancienne orthographe`);
		for (const now of LOT_0F.orthographe.apres)
			if (!names.includes(now)) wrong.push(`« ${now} » : introuvable`);
		// Nom, sens, synonymes, formes, définitions et exemples : partout
		for (const term of MATH_DICTIONARY) {
			if (JSON.stringify(term).includes('événement')) wrong.push(`${term.term} : « événement »`);
			for (const item of term.definitions?.items ?? []) {
				for (const unaccented of LOT_0F.formulesSansAccent)
					if (item.content.includes(unaccented)) wrong.push(`${term.term} : ${unaccented}`);
			}
		}
		const minute = MATH_DICTIONARY.find((t) => t.term === 'minute');
		const minuteLevels = (minute?.definitions?.items ?? []).map((i) => i.grade);
		if (minuteLevels.join() !== LOT_0F.minute.join()) {
			wrong.push(`minute : niveaux ${minuteLevels.join(', ')}`);
		}
		const repere = MATH_DICTIONARY.find((t) => t.term === 'repère');
		if (repere?.synonyms?.includes(LOT_0F.repereSynonymeRetire)) {
			wrong.push(`repère : synonyme « ${LOT_0F.repereSynonymeRetire} »`);
		}
		expect(wrong).toEqual([]);
	});

	// Un mot à plusieurs sens se lit « carré (géométrie) » ou « carré (puissance) » :
	// une entrée sans étiquette à côté d'une autre ne dit pas de quel sens elle parle.
	it('should label every entry of a word that has several meanings', () => {
		const principals = MATH_DICTIONARY.filter((t) => !t.derivedFrom);
		const unlabeled = principals.filter(
			(t) => !t.sense && principals.some((other) => other !== t && other.term === t.term)
		);
		expect(unlabeled.map((t) => t.term)).toEqual([]);
	});

	// Sinon, dans le glossaire, la fiche d'un renvoi (« Voir : X ») n'a aucune
	// définition à montrer au niveau du lecteur.
	it('should never place a derived term before the term it points to', () => {
		const early: string[] = [];
		for (const term of MATH_DICTIONARY) {
			if (!term.derivedFrom) continue;
			const target = MATH_DICTIONARY.find((t) => t.term === term.derivedFrom && !t.derivedFrom);
			if (!target) continue;
			// Chaque lecteur du renvoi, filières parallèles comprises, doit pouvoir lire sa cible
			for (const reader of GRADE_CODES) {
				if (isTermVisibleTo(term, reader) && !isTermVisibleTo(target, reader)) {
					early.push(`${term.term} → ${target.term} : cible cachée en ${reader}`);
				}
			}
		}
		expect(early).toEqual([]);
	});

	// La 1re spé, la 1re générale et la 1re techno ne se voient pas l'une l'autre :
	// un mot de 1re spé que nomme aussi le programme de 1re générale lui était caché.
	describe('mots partagés entre les filières de 1re (lot 0g)', () => {
		const find = (term: string, sense: string | null = null) => {
			const found = MATH_DICTIONARY.find(
				(t) => t.term === term && (t.sense ?? null) === sense && !t.derivedFrom
			);
			if (!found) throw new Error(`${term} : introuvable`);
			return found;
		};
		const label = (term: string, sense: string | null) => (sense ? `${term} (${sense})` : term);
		const definitionsOf = (term: MathTerm) => term.definitions ?? { items: [] };

		it('should share exactly the validated words, and nothing else', () => {
			expect(LOT_0G.termes).toHaveLength(25);
			expect(LOT_0G.definitions).toHaveLength(7);
			const sharedTerms = MATH_DICTIONARY.filter((t) => t.sharedWith).map(
				(t) => `${label(t.term, t.sense ?? null)} → ${t.sharedWith?.join(', ')}`
			);
			expect(sharedTerms.sort()).toEqual(
				LOT_0G.termes.map((e) => `${label(e.term, e.sense)} → ${e.sharedWith.join(', ')}`).sort()
			);
			// Une entrée partagée partage aussi sa définition de son propre niveau
			const expectedItems = [
				...LOT_0G.termes.map((e) => ({ ...e, grade: null as string | null })),
				...LOT_0G.definitions
			].flatMap((e) => {
				const term = MATH_DICTIONARY.find(
					(t) => t.term === e.term && (t.sense ?? null) === e.sense
				);
				if (!term?.definitions) return [];
				const grade = e.grade ?? term.grade;
				return [`${label(e.term, e.sense)} [${grade}] → ${e.sharedWith.join(', ')}`];
			});
			const sharedItems = MATH_DICTIONARY.flatMap((t) =>
				(t.definitions?.items ?? [])
					.filter((i) => i.sharedWith)
					.map(
						(i) => `${label(t.term, t.sense ?? null)} [${i.grade}] → ${i.sharedWith?.join(', ')}`
					)
			);
			expect(sharedItems.sort()).toEqual(expectedItems.sort());
		});

		it('should let a 1re générale student read « seuil » and its definition', () => {
			const seuil = find('seuil');
			expect(getTermsForGrade('1_GEN')).toContain(seuil);
			expect(resolveGradedField(definitionsOf(seuil), '1_GEN')).toHaveLength(1);
		});

		it('should follow the grade hierarchy: Tle comp. reads what 1re générale reads', () => {
			expect(getTermsForGrade('T_COMP')).toContain(find('seuil'));
			expect(getTermsForGrade('T_TECHNO')).toContain(find('dérivée'));
		});

		it('should let a 1re spé student read « croissance linéaire »', () => {
			const term = find('croissance linéaire');
			expect(getTermsForGrade('1_SPE')).toContain(term);
			expect(resolveGradedField(definitionsOf(term), '1_SPE')).toHaveLength(1);
		});

		it('should show both definitions of « terme (suite) » to a 1re générale student', () => {
			const term = find('terme', 'suite');
			expect(resolveGradedField(definitionsOf(term), '1_GEN')).toHaveLength(2);
		});

		it('should never show a Tle spé definition to another branch of 1re', () => {
			const echantillon = find('échantillon');
			expect(resolveGradedField(definitionsOf(echantillon), '1_TECHNO')).toEqual([
				definitionsOf(echantillon).items[0].content
			]);
			expect(getTermsForGrade('1_GEN')).not.toContain(echantillon);
		});

		// Le glossaire affiche ce niveau : « 1ère spécialité » ferait croire à un élève
		// de 1re techno que le mot n'est pas pour lui
		it('should tell at which level a reader meets a shared word', () => {
			expect(gradeMetBy(find('nombre dérivé'), '1_TECHNO')).toBe('1_TECHNO');
			expect(gradeMetBy(find('nombre dérivé'), '1_SPE')).toBe('1_SPE');
			expect(gradeMetBy(find('seuil'), 'T_COMP')).toBe('1_GEN');
			expect(gradeMetBy(find('croissance linéaire'), 'T_SPE')).toBe('1_SPE');
			expect(gradeMetBy(find('seuil'), '2')).toBeUndefined();
		});

		it('should still hide « seuil » from a 2de student', () => {
			expect(getTermsForGrade('2')).not.toContain(find('seuil'));
		});

		// Ni un niveau qui voit déjà le contenu (inutile), ni un niveau d'une autre année
		// (une définition de Tle spé lue en 1re générale serait un changement de niveau
		// déguisé) : seulement une filière parallèle de la même année
		it('should only share with parallel branches of the same year', () => {
			const wrong: string[] = [];
			const check = (where: string, grade: GradeCode, sharedWith: GradeCode[] = []) => {
				for (const other of sharedWith) {
					const sameYear = GRADES[other].schoolYear === GRADES[grade].schoolYear;
					if (!sameYear || hasAccessToGrade(other, grade) || hasAccessToGrade(grade, other)) {
						wrong.push(`${where} [${grade}] partagé avec ${other}`);
					}
				}
			};
			for (const term of MATH_DICTIONARY) {
				check(term.term, term.grade, term.sharedWith);
				for (const item of term.definitions?.items ?? []) {
					check(`${term.term}, définition`, item.grade, item.sharedWith);
				}
			}
			expect(wrong).toEqual([]);
		});
	});

	it('should have valid derivedFrom references', () => {
		// Un renvoi pointe vers un terme principal : « solution » → « solution (équation) »,
		// jamais vers lui-même ni vers un autre renvoi
		const termNames = new Set(MATH_DICTIONARY.filter((t) => !t.derivedFrom).map((t) => t.term));
		for (const term of MATH_DICTIONARY) {
			if (term.derivedFrom) {
				expect(
					termNames.has(term.derivedFrom),
					`"${term.term}" derives from "${term.derivedFrom}" which does not exist`
				).toBe(true);
			}
		}
	});

	it('should have lowercase tags', () => {
		for (const term of MATH_DICTIONARY) {
			for (const tag of term.tags) {
				expect(tag, `tag "${tag}" on "${term.term}" is not lowercase`).toBe(tag.toLowerCase());
			}
		}
	});

	// -----------------------------------------------------------------------
	// Theme coverage
	// -----------------------------------------------------------------------

	it('should cover all 12+ themes', () => {
		const allTags = new Set(MATH_DICTIONARY.flatMap((t) => t.tags));
		const expectedThemes = [
			'entiers',
			'décimaux',
			'calcul-littéral',
			'fractions',
			'grandeurs',
			'fonctions',
			'relatifs',
			'proportionnalité',
			'puissances',
			'suites',
			'racines-carrees',
			'probabilités'
		];
		for (const theme of expectedThemes) {
			expect(allTags.has(theme), `missing theme: ${theme}`).toBe(true);
		}
	});

	// -----------------------------------------------------------------------
	// resolveGradedField
	// -----------------------------------------------------------------------

	describe('resolveGradedField', () => {
		it('should return all items for cumulative mode (default)', () => {
			const field = {
				items: [
					{ grade: 'CP' as const, content: 'Base' },
					{ grade: '6' as const, content: 'Complément 6ème' },
					{ grade: '3' as const, content: 'Complément 3ème' }
				]
			};
			const result = resolveGradedField(field, '3');
			expect(result).toEqual(['Base', 'Complément 6ème', 'Complément 3ème']);
		});

		it('should filter by grade accessibility', () => {
			const field = {
				items: [
					{ grade: 'CP' as const, content: 'Base' },
					{ grade: '6' as const, content: 'Complément 6ème' },
					{ grade: 'T_SPE' as const, content: 'Complément Tale' }
				]
			};
			const result = resolveGradedField(field, '6');
			expect(result).toEqual(['Base', 'Complément 6ème']);
		});

		it('should return only last item for discriminant mode', () => {
			const field = {
				mode: 'discriminant' as const,
				items: [
					{ grade: 'CP' as const, content: 'Simple' },
					{ grade: '6' as const, content: 'Détaillé' },
					{ grade: '3' as const, content: 'Avancé' }
				]
			};
			const result = resolveGradedField(field, '3');
			expect(result).toEqual(['Avancé']);
		});

		it('should return empty for inaccessible grade', () => {
			const field = {
				items: [{ grade: 'T_SPE' as const, content: 'Terminale only' }]
			};
			const result = resolveGradedField(field, '6');
			expect(result).toEqual([]);
		});
	});

	// -----------------------------------------------------------------------
	// getTermsForGrade
	// -----------------------------------------------------------------------

	describe('getTermsForGrade', () => {
		it('should return CP terms for grade CP', () => {
			const terms = getTermsForGrade('CP');
			expect(terms.length).toBeGreaterThan(0);
			for (const t of terms) {
				expect(t.grade).toBe('CP');
			}
		});

		it('should return CP through 6e terms for grade 6', () => {
			const terms = getTermsForGrade('6');
			expect(terms.some((t) => t.grade === 'CP')).toBe(true);
			expect(terms.some((t) => t.grade === '6')).toBe(true);
			expect(terms.some((t) => t.grade === '5')).toBe(false);
		});

		it('should include more terms at higher grades', () => {
			const cpTerms = getTermsForGrade('CP');
			const cm2Terms = getTermsForGrade('CM2');
			const sixTerms = getTermsForGrade('6');
			const troisTerms = getTermsForGrade('3');
			expect(cm2Terms.length).toBeGreaterThan(cpTerms.length);
			expect(sixTerms.length).toBeGreaterThan(cm2Terms.length);
			expect(troisTerms.length).toBeGreaterThan(sixTerms.length);
		});
	});

	// -----------------------------------------------------------------------
	// getTermsByTag
	// -----------------------------------------------------------------------

	describe('getTermsByTag', () => {
		it('should return terms for "arithmétique"', () => {
			const terms = getTermsByTag('arithmétique');
			expect(terms.length).toBeGreaterThan(0);
			for (const t of terms) {
				expect(t.tags).toContain('arithmétique');
			}
		});

		it('should return terms for "géométrie"', () => {
			const terms = getTermsByTag('géométrie');
			expect(terms.length).toBeGreaterThan(0);
		});

		it('should return empty array for unknown tag', () => {
			const terms = getTermsByTag('nonexistent-tag-xyz');
			expect(terms).toEqual([]);
		});
	});

	// -----------------------------------------------------------------------
	// getTermsByTagAndGrade
	// -----------------------------------------------------------------------

	describe('getTermsByTagAndGrade', () => {
		it('should return a subset of getTermsByTag', () => {
			const allGeometrie = getTermsByTag('géométrie');
			const geometrie4 = getTermsByTagAndGrade('géométrie', '4');
			expect(geometrie4.length).toBeGreaterThan(0);
			expect(geometrie4.length).toBeLessThanOrEqual(allGeometrie.length);
			for (const t of geometrie4) {
				expect(allGeometrie).toContainEqual(t);
			}
		});

		it('should respect grade filtering', () => {
			const terms = getTermsByTagAndGrade('fonctions', '6');
			for (const t of terms) {
				expect(t.tags).toContain('fonctions');
			}
			expect(terms.some((t) => t.term === 'fonction')).toBe(false);
		});
	});

	// -----------------------------------------------------------------------
	// getAllTerms
	// -----------------------------------------------------------------------

	describe('getAllTerms', () => {
		it('should return all terms', () => {
			const all = getAllTerms();
			expect(all.length).toBe(MATH_DICTIONARY.length);
		});

		it('should return a copy (not the original array)', () => {
			const all = getAllTerms();
			all.push({
				term: 'test',
				tags: ['test'],
				definitions: { items: [{ grade: 'CP', content: 'test' }] },
				grade: 'CP'
			} satisfies MathTerm);
			expect(getAllTerms().length).toBe(MATH_DICTIONARY.length);
		});
	});
});
