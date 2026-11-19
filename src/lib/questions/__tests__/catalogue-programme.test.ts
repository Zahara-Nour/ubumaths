/**
 * Vue « Programme » du catalogue Automaths : rangement des points
 * ===============================================================
 *
 * Phase 0 validée par David le 2026-11-18 (journal `automaths`, points 8-13) :
 * parties et chapitres du programme du niveau choisi (`rubrique` = « Partie >
 * Chapitre [> Automatismes] ») ; un point = une section ; questions sous un
 * point, lecture A : celles rattachées au point, sinon celles de son nœud
 * (sous-notions comprises si le point est posé sur une notion).
 */
import { describe, it, expect } from 'vitest';
import {
	buildProgramme,
	chapterTemplateCount,
	type CatalogueProgrammePoint
} from '#lib/questions/catalogue-programme.ts';
import type { CatalogueNode } from '#lib/questions/catalogue.ts';
import type { QuestionTemplate } from '#lib/questions/types.ts';

const NODES: CatalogueNode[] = [
	{ id: 'b', kind: 'branch', name: 'Nombres', parent_id: null, position: 0 },
	{ id: 'n-frac', kind: 'notion', name: 'Fractions', parent_id: 'b', position: 0 },
	{ id: 's-simpl', kind: 'subnotion', name: 'Simplifier', parent_id: 'n-frac', position: 0 },
	{ id: 'n-rel', kind: 'notion', name: 'Relatifs', parent_id: 'b', position: 1 }
];

function point(
	id: string,
	rubrique: string | null,
	display_order: number,
	node_id = 'n-frac',
	grade = '5'
): CatalogueProgrammePoint {
	return { id, name: `Point ${id}`, grade, rubrique, display_order, node_id };
}

function modele(id: string, nodeId: string, level = 1): QuestionTemplate {
	return {
		id,
		title: `Modèle ${id}`,
		classification_node_id: nodeId,
		level,
		grades: ['5']
	} as QuestionTemplate;
}

const ids = (templates: readonly QuestionTemplate[]) => templates.map((t) => t.id);

describe('buildProgramme — parties et chapitres', () => {
	it('range les points du niveau par partie puis chapitre, dans l’ordre du BO', () => {
		const points = [
			point('p3', 'Espace > Triangles', 3),
			point('p1', 'Nombres > Opérations', 1),
			point('p2', 'Nombres > Relatifs', 2),
			point('autre', 'Nombres > Opérations', 0, 'n-frac', '4')
		];

		const parts = buildProgramme(points, '5', [], {}, NODES);

		expect(parts.map((p) => p.name)).toEqual(['Nombres', 'Espace']);
		expect(parts[0].chapters.map((c) => c.name)).toEqual(['Opérations', 'Relatifs']);
		expect(parts[0].chapters[0].points.map((p) => p.id)).toEqual(['p1']);
	});

	it('« > Automatismes » rejoint son chapitre ; une rubrique sans chapitre est son propre chapitre', () => {
		const points = [
			point('auto', "Espace > Représentation de l'espace > Automatismes", 1),
			point('rep', "Espace > Représentation de l'espace", 2),
			point('algo', 'La pensée informatique', 3)
		];

		const parts = buildProgramme(points, '5', [], {}, NODES);

		expect(parts[0].chapters).toHaveLength(1);
		expect(parts[0].chapters[0].points.map((p) => p.id)).toEqual(['auto', 'rep']);
		expect(parts[1].name).toBe('La pensée informatique');
		expect(parts[1].chapters.map((c) => c.name)).toEqual(['La pensée informatique']);
	});

	it('identifiant de chapitre lisible, sans accents ; deux chapitres de même nom restent distincts', () => {
		const points = [
			point('a', 'Nombres > Opérations', 1),
			point('b', 'Géométrie > Opérations', 2),
			point('c', 'Données > Probabilités', 3)
		];

		const parts = buildProgramme(points, '5', [], {}, NODES);
		const chapterIds = parts.flatMap((p) => p.chapters.map((c) => c.id));

		expect(chapterIds[2]).toBe('probabilites');
		expect(new Set(chapterIds).size).toBe(3);
	});

	it('identifiants de chapitre jamais vides ni en double (casse, accents, symboles)', () => {
		const points = [
			point('a', 'Nombres > Calcul', 1),
			point('b', 'Nombres > calcul', 2),
			point('c', 'Nombres > Càlcul', 3),
			point('d', 'Nombres > ∑', 4),
			point('e', 'Nombres > ∫', 5)
		];

		const chapterIds = buildProgramme(points, '5', [], {}, NODES)[0].chapters.map((c) => c.id);

		expect(chapterIds).toHaveLength(5);
		expect(new Set(chapterIds).size).toBe(5);
		expect(chapterIds.every((id) => id.length > 0)).toBe(true);
		expect(chapterIds[0]).toBe('calcul');
	});

	it('aucun niveau, ou niveau sans point : programme vide', () => {
		expect(buildProgramme([point('p', 'A > B', 1)], null, [], {}, NODES)).toEqual([]);
		expect(buildProgramme([point('p', 'A > B', 1)], 'CP', [], {}, NODES)).toEqual([]);
	});
});

describe('buildProgramme — questions sous un point (lecture A)', () => {
	const templates = [
		modele('lie', 'n-rel', 2),
		modele('frac-1', 'n-frac', 2),
		modele('simpl-1', 's-simpl', 1),
		modele('rel-1', 'n-rel')
	];

	it('questions rattachées au point d’abord, sans repli', () => {
		const parts = buildProgramme(
			[point('p', 'A > B', 1, 'n-frac')],
			'5',
			templates,
			{ lie: ['p'] },
			NODES
		);
		const section = parts[0].chapters[0].points[0];

		expect(ids(section.templates)).toEqual(['lie']);
		expect(section.fallbackNodeName).toBeNull();
	});

	it('aucune question rattachée : celles du nœud, sous-notions comprises pour une notion', () => {
		const parts = buildProgramme([point('p', 'A > B', 1, 'n-frac')], '5', templates, {}, NODES);
		const section = parts[0].chapters[0].points[0];

		// Niveau croissant, puis titre
		expect(ids(section.templates)).toEqual(['simpl-1', 'frac-1']);
		expect(section.fallbackNodeName).toBe('Fractions');
	});

	it('point posé sur une sous-notion : ses seules questions', () => {
		const parts = buildProgramme([point('p', 'A > B', 1, 's-simpl')], '5', templates, {}, NODES);

		expect(ids(parts[0].chapters[0].points[0].templates)).toEqual(['simpl-1']);
	});

	it('question rattachée mais hors du filtre de niveau : repli sur le nœud', () => {
		// `lie` n'est pas dans la liste filtrée passée
		const filtered = templates.filter((t) => t.id !== 'lie');
		const parts = buildProgramme(
			[point('p', 'A > B', 1, 'n-rel')],
			'5',
			filtered,
			{ lie: ['p'] },
			NODES
		);

		expect(ids(parts[0].chapters[0].points[0].templates)).toEqual(['rel-1']);
	});

	it('point sans question : section vide ; le chapitre compte chaque question une fois', () => {
		const parts = buildProgramme(
			[
				point('p1', 'A > B', 1, 'n-frac'),
				point('p2', 'A > B', 2, 'n-frac'),
				point('vide', 'A > B', 3, 'n-vide')
			],
			'5',
			templates,
			{},
			NODES
		);
		const chapter = parts[0].chapters[0];

		expect(chapter.points[2].templates).toEqual([]);
		// p1 et p2 montrent les deux mêmes questions de Fractions
		expect(chapterTemplateCount(chapter)).toBe(2);
	});
});
