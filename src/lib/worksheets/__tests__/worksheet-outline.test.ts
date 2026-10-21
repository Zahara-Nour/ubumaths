/**
 * Le plan d'une fiche en édition : ses zones, et ce qu'une dépose enregistre.
 *
 * Ces cas portent sur ce que la liste DÉCIDE une fois la dépose faite — pas sur
 * le geste, que rejoue `ExerciseList-sections.svelte.test.ts`. Les erreurs
 * coûteuses sont ici : une dépose sans effet qui déclenche un appel, une corvée
 * qui change de section sans que sa section soit écrite, une section vide qui
 * disparaît du plan et ne peut plus rien recevoir.
 */
import { describe, expect, it } from 'vitest';
import {
	applyPlacements,
	applySectionOrder,
	placementsAfterDrop,
	sectionOrderAfterDrop,
	worksheetOutline
} from '../worksheet-outline';

const s = (id: string, position: number) => ({ id, position });
const e = (id: string, section_id: string | null, position: number) => ({
	id,
	section_id,
	position
});

const SECTIONS = [s('B', 2), s('A', 1)];

describe('worksheetOutline — les zones du plan', () => {
	it('range les sections par position, puis « Sans section » en dernier', () => {
		const outline = worksheetOutline([e('x', 'B', 1), e('y', null, 1), e('z', 'A', 1)], SECTIONS);
		expect(outline.map((z) => z.section?.id ?? null)).toEqual(['A', 'B', null]);
	});

	it('garde une section VIDE : elle doit pouvoir recevoir une corvée', () => {
		const outline = worksheetOutline([e('x', 'B', 1)], SECTIONS);
		expect(outline.map((z) => [z.section?.id ?? null, z.exercises.length])).toEqual([
			['A', 0],
			['B', 1],
			[null, 0]
		]);
	});

	it('numérote en continu, dans l’ordre d’affichage', () => {
		const outline = worksheetOutline(
			[e('b1', 'B', 1), e('n1', null, 1), e('a2', 'A', 2), e('a1', 'A', 1)],
			SECTIONS
		);
		expect(outline.flatMap((z) => z.exercises.map((x) => `${x.exercise.id}:${x.number}`))).toEqual([
			'a1:1',
			'a2:2',
			'b1:3',
			'n1:4'
		]);
	});

	it('met dans « Sans section » une corvée dont la section n’existe plus', () => {
		// Cas réel : la section vient d'être supprimée, la ligne porte encore son id.
		const outline = worksheetOutline([e('x', 'disparue', 1)], SECTIONS);
		expect(outline.at(-1)?.exercises.map((x) => x.exercise.id)).toEqual(['x']);
	});
});

describe('placementsAfterDrop — ce qu’une dépose de corvée enregistre', () => {
	const EXOS = [e('a1', 'A', 1), e('a2', 'A', 2), e('b1', 'B', 1)];

	it('dépose sans effet (même zone, même ordre) : rien à enregistrer', () => {
		expect(placementsAfterDrop(EXOS, SECTIONS, 'A', ['a1', 'a2'])).toEqual([]);
	});

	it('dépose sans effet malgré des positions à trous : rien à enregistrer', () => {
		const troues = [e('a1', 'A', 1), e('a2', 'A', 5)];
		expect(placementsAfterDrop(troues, SECTIONS, 'A', ['a1', 'a2'])).toEqual([]);
	});

	it('réordonner dans une section : renumérote la zone 1..n', () => {
		expect(placementsAfterDrop(EXOS, SECTIONS, 'A', ['a2', 'a1'])).toEqual([
			{ id: 'a2', position: 1, section_id: 'A' },
			{ id: 'a1', position: 2, section_id: 'A' }
		]);
	});

	it('changer de section : écrit la NOUVELLE section de la corvée déplacée', () => {
		expect(placementsAfterDrop(EXOS, SECTIONS, 'B', ['a1', 'b1'])).toEqual([
			{ id: 'a1', position: 1, section_id: 'B' },
			{ id: 'b1', position: 2, section_id: 'B' },
			{ id: 'a2', position: 1, section_id: 'A' }
		]);
	});

	it('changer de section : la zone quittée est renumérotée aussi', () => {
		const exos = [e('a1', 'A', 1), e('a2', 'A', 2), e('a3', 'A', 3), e('b1', 'B', 1)];
		expect(placementsAfterDrop(exos, SECTIONS, 'B', ['b1', 'a1'])).toEqual([
			{ id: 'a1', position: 2, section_id: 'B' },
			{ id: 'a2', position: 1, section_id: 'A' },
			{ id: 'a3', position: 2, section_id: 'A' }
		]);
	});

	it('déposer dans une section vide', () => {
		const exos = [e('n1', null, 1)];
		expect(placementsAfterDrop(exos, SECTIONS, 'A', ['n1'])).toEqual([
			{ id: 'n1', position: 1, section_id: 'A' }
		]);
	});

	it('sortir une corvée vers « Sans section »', () => {
		expect(placementsAfterDrop(EXOS, SECTIONS, null, ['b1'])).toEqual([
			{ id: 'b1', position: 1, section_id: null }
		]);
	});

	it('n’écrit que les corvées qui changent', () => {
		const exos = [e('a1', 'A', 1), e('a2', 'A', 2), e('a3', 'A', 3)];
		expect(placementsAfterDrop(exos, SECTIONS, 'A', ['a1', 'a3', 'a2'])).toEqual([
			{ id: 'a3', position: 2, section_id: 'A' },
			{ id: 'a2', position: 3, section_id: 'A' }
		]);
	});

	it('ignore un identifiant inconnu (copie « ombre » de la bibliothèque)', () => {
		expect(placementsAfterDrop(EXOS, SECTIONS, 'A', ['a1', 'id:dnd-shadow', 'a2'])).toEqual([]);
	});

	it('une corvée orpheline reposée sur place en « Sans section » : rien à enregistrer', () => {
		// Sa ligne locale pointe encore vers une section supprimée, mais la base
		// l'a déjà sortie (`DELETE` de la section) : rien n'a bougé à l'écran.
		const exos = [e('x', 'disparue', 1)];
		expect(placementsAfterDrop(exos, SECTIONS, null, ['x'])).toEqual([]);
	});
});

describe('applyPlacements', () => {
	it('applique position et section, sans toucher au reste', () => {
		const exos = [
			{ ...e('a1', 'A', 1), points: 3 },
			{ ...e('b1', 'B', 1), points: 2 }
		];
		const apres = applyPlacements(exos, [{ id: 'a1', position: 2, section_id: 'B' }]);
		expect(apres).toEqual([
			{ id: 'a1', section_id: 'B', position: 2, points: 3 },
			{ id: 'b1', section_id: 'B', position: 1, points: 2 }
		]);
		expect(exos[0].section_id).toBe('A');
	});
});

describe('sectionOrderAfterDrop — ce qu’un déplacement de section enregistre', () => {
	it('même ordre : rien à enregistrer', () => {
		expect(sectionOrderAfterDrop(SECTIONS, ['A', 'B'])).toEqual([]);
	});

	it('nouvel ordre : les sections qui changent de rang, numérotées 1..n', () => {
		expect(sectionOrderAfterDrop(SECTIONS, ['B', 'A'])).toEqual([
			{ id: 'B', position: 1 },
			{ id: 'A', position: 2 }
		]);
	});

	it('ignore la copie « ombre »', () => {
		expect(sectionOrderAfterDrop(SECTIONS, ['id:dnd-shadow', 'A', 'B'])).toEqual([]);
	});

	it('applySectionOrder applique les positions', () => {
		expect(
			applySectionOrder(SECTIONS, [
				{ id: 'B', position: 1 },
				{ id: 'A', position: 2 }
			])
		).toEqual([s('B', 1), s('A', 2)]);
	});
});
