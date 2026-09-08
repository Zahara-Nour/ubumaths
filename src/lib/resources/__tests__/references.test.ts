/**
 * Extraction des références d'un contenu de séance
 * ================================================
 *
 * Ces références commandent la couverture du programme : ce que le prof cite
 * dans sa séance devient ce que la séance a travaillé. Une extraction trop
 * large compterait des points non travaillés, une trop étroite en oublierait —
 * et dans les deux cas le suivi mentirait en silence.
 *
 * Le test le plus important est le dernier : il vérifie que l'extracteur et le
 * parser d'affichage acceptent EXACTEMENT les mêmes types. S'ils divergeaient,
 * une référence s'afficherait comme un lien sans compter dans la couverture.
 */

import { describe, it, expect } from 'vitest';
import { parseMarkdown } from '$lib/ubumark/parser/markdown-parser';
import { extractResourceReferences, referenceIdsOfKind } from '../references';
import { RESOURCE_KINDS } from '../kinds';

const EX = '11111111-1111-4111-8111-111111111111';
const WE = '22222222-2222-4222-8222-222222222222';

describe('extractResourceReferences', () => {
	it('extrait une référence isolée', () => {
		const refs = extractResourceReferences(`Voir [[exercise:${EX}|Fractions n°12]]`);

		expect(refs).toHaveLength(1);
		expect(refs[0]).toEqual({ kind: 'exercise', id: EX, label: 'Fractions n°12' });
	});

	it('extrait depuis PLUSIEURS contenus — énoncé et devoirs', () => {
		const refs = extractResourceReferences(
			`En classe : [[exercise:${EX}|Exo A]]`,
			`Pour jeudi : [[worksheet_exercise:${WE}|Exercice 3 — Dérivées]]`
		);

		expect(refs.map((r) => r.kind).sort()).toEqual(['exercise', 'worksheet_exercise']);
	});

	it('dédoublonne : citer deux fois ne travaille pas deux fois', () => {
		const refs = extractResourceReferences(
			`[[exercise:${EX}|Exo A]] et encore [[exercise:${EX}|Exo A]]`,
			`Et dans les devoirs : [[exercise:${EX}|Exo A]]`
		);

		expect(refs).toHaveLength(1);
	});

	it('ignore un type inconnu plutôt que de le compter', () => {
		expect(extractResourceReferences(`[[licorne:${EX}|Rien]]`)).toEqual([]);
	});

	it('ignore un uuid mal formé', () => {
		expect(extractResourceReferences('[[exercise:pas-un-uuid|Rien]]')).toEqual([]);
	});

	it('tolère les contenus vides ou absents', () => {
		expect(extractResourceReferences(null, undefined, '')).toEqual([]);
	});

	it('filtre par type pour une requête `in(...)`', () => {
		const refs = extractResourceReferences(`[[exercise:${EX}|A]] [[worksheet_exercise:${WE}|B]]`);

		expect(referenceIdsOfKind(refs, 'exercise')).toEqual([EX]);
		expect(referenceIdsOfKind(refs, 'worksheet_exercise')).toEqual([WE]);
		expect(referenceIdsOfKind(refs, 'chapter')).toEqual([]);
	});
});

describe("l'extracteur et le parser acceptent les mêmes types", () => {
	// Deux grammaires écrites séparément finissent par diverger. Si le parser
	// affiche un lien que l'extracteur ignore, la couverture manque un point sans
	// que rien ne le signale.
	it.each([...RESOURCE_KINDS])('%s : affiché ET extrait', (kind) => {
		const markdown = `[[${kind}:${EX}|Une ressource]]`;

		const [block] = parseMarkdown(markdown).children;
		expect(block.type).toBe('paragraph');
		if (block.type !== 'paragraph') return;
		expect(block.children[0].type).toBe('internal-link');

		expect(extractResourceReferences(markdown)).toHaveLength(1);
	});
});
