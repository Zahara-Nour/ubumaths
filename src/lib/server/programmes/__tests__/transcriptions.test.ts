/**
 * Transcriptions des programmes officiels (2026-10-24).
 *
 *   - tous les niveaux qui ont des maths sont transcrits, titrés comme le BO ;
 *   - un niveau de cycle n'a que sa partie de chaque domaine (titre du niveau
 *     tel que le BO l'écrit, jamais celui d'un autre niveau du cycle) ;
 *   - le texte ne crée aucun nœud interactif ou accidentel (trou, #hashtag,
 *     @mention, renvoi d'aide, bloc de code) : c'est du texte à lire ;
 *   - la terminale générale non plus (pas de programme) ;
 *   - chaque fichier de transcriptions/ est un morceau d'au moins un niveau
 *     (un nom mal écrit rendrait le niveau muet, « pas encore disponible »).
 */
import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { OFFICIAL_PROGRAMMES } from '$lib/programmes/official-programmes';
import { parseMarkdown } from '$lib/ubumark';
import { GRADE_CODES, type GradeCode } from '$lib/types/grades';
import { getTranscription } from '../transcriptions';

// Constantes

/** Les niveaux qui ont des maths, tous transcrits */
const TRANSCRIBED = GRADE_CODES.filter((grade) => grade !== 'T_GEN');

/** Le titre de chaque niveau de cycle dans le BO, par cycle */
const CYCLE_LEVEL_HEADINGS: readonly (readonly [GradeCode, string])[][] = [
	[
		['CP', 'Cours préparatoire'],
		['CE1', 'Cours élémentaire première année'],
		['CE2', 'Cours élémentaire deuxième année']
	],
	[
		['CM1', 'Cours moyen première année'],
		['CM2', 'Cours moyen deuxième année'],
		['6', 'Sixième']
	],
	[
		['5', 'Cinquième'],
		['4', 'Quatrième'],
		['3', 'Troisième']
	]
];

const FORBIDDEN_NODES = [
	'blank',
	'hashtag',
	'mention',
	'hint-reference',
	'internal-link',
	'code-block'
];

// Functions

/** Tous les types de nœuds de l'arbre, en profondeur */
function nodeTypes(node: unknown, found = new Set<string>()): Set<string> {
	if (Array.isArray(node)) {
		for (const child of node) nodeTypes(child, found);
	} else if (node !== null && typeof node === 'object') {
		const record = node as Record<string, unknown>;
		if (typeof record.type === 'string') found.add(record.type);
		for (const value of Object.values(record)) nodeTypes(value, found);
	}
	return found;
}

describe('getTranscription', () => {
	describe.each(TRANSCRIBED)('%s', (grade) => {
		it('transcrit, titré comme le BO', () => {
			const source = getTranscription(grade);
			expect(source).not.toBeNull();
			expect(source?.split('\n')[0]).toBe(`# ${OFFICIAL_PROGRAMMES[grade]?.title}`);
		});

		it('aucun nœud interactif ou accidentel', () => {
			const types = nodeTypes(parseMarkdown(getTranscription(grade) ?? ''));
			expect(types.has('heading')).toBe(true);
			expect(FORBIDDEN_NODES.filter((type) => types.has(type))).toEqual([]);
		});
	});

	describe.each(CYCLE_LEVEL_HEADINGS.flat())('%s (cycle)', (grade, heading) => {
		it('sa partie de chaque domaine, aucune de celle des autres niveaux', () => {
			const headings = new Set(
				(getTranscription(grade) ?? '').split('\n').filter((line) => line.startsWith('### '))
			);
			const others = CYCLE_LEVEL_HEADINGS.flat()
				.filter(([other]) => other !== grade)
				.map(([, title]) => `### ${title}`);

			expect(headings.has(`### ${heading}`)).toBe(true);
			expect(others.filter((title) => headings.has(title))).toEqual([]);
		});
	});

	it('chaque fichier de transcriptions/ est un morceau référencé', () => {
		const referenced = new Set(
			Object.values(OFFICIAL_PROGRAMMES).flatMap((programme) => programme?.transcription ?? [])
		);
		const files = readdirSync(resolve('src/lib/server/programmes/transcriptions'), {
			recursive: true,
			encoding: 'utf8'
		})
			.filter((file) => file.endsWith('.md'))
			.map((file) => file.slice(0, -'.md'.length));

		expect(files.length).toBeGreaterThan(0);
		expect(files.filter((name) => !referenced.has(name))).toEqual([]);
	});

	it('T_GEN : pas de programme → null', () => {
		expect(getTranscription('T_GEN')).toBeNull();
	});
});
