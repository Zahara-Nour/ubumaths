/**
 * Transcriptions des programmes officiels (2026-10-24).
 *
 *   - la seconde est transcrite, titrée comme le BO ;
 *   - le texte ne crée aucun nœud interactif ou accidentel (trou, #hashtag,
 *     @mention, renvoi d'aide, bloc de code) : c'est du texte à lire ;
 *   - un niveau dont un morceau manque n'a pas de transcription ;
 *   - la terminale générale non plus (pas de programme) ;
 *   - chaque fichier de transcriptions/ est un morceau d'au moins un niveau
 *     (un nom mal écrit rendrait le niveau muet, « pas encore disponible »).
 */
import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { OFFICIAL_PROGRAMMES } from '$lib/programmes/official-programmes';
import { parseMarkdown } from '$lib/ubumark';
import { getTranscription } from '../transcriptions';

// Constantes

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
	it('2de : transcrite, titrée comme le BO', () => {
		const source = getTranscription('2');
		expect(source).not.toBeNull();
		expect(source).toMatch(
			/^# Programme de mathématiques de la classe de seconde générale et technologique$/m
		);
	});

	it('2de : aucun nœud interactif ou accidentel', () => {
		const types = nodeTypes(parseMarkdown(getTranscription('2') ?? ''));
		expect(types.has('heading')).toBe(true);
		expect(FORBIDDEN_NODES.filter((type) => types.has(type))).toEqual([]);
	});

	it('CM1 : morceaux pas encore écrits → null', () => {
		expect(getTranscription('CM1')).toBeNull();
	});

	it('chaque fichier de transcriptions/ est un morceau référencé', () => {
		const referenced = new Set(
			Object.values(OFFICIAL_PROGRAMMES).flatMap((programme) => programme?.transcription ?? [])
		);
		const files = readdirSync(resolve('src/lib/server/programmes/transcriptions'))
			.filter((file) => file.endsWith('.md'))
			.map((file) => file.slice(0, -'.md'.length));

		expect(files.length).toBeGreaterThan(0);
		expect(files.filter((name) => !referenced.has(name))).toEqual([]);
	});

	it('T_GEN : pas de programme → null', () => {
		expect(getTranscription('T_GEN')).toBeNull();
	});
});
