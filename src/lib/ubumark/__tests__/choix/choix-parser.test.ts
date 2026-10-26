/**
 * Bloc ```choix (case « choix », chantier figure-et-choix § 2.1)
 * ==============================================================
 *
 * Réglages en tête (`plusieurs: oui`, `melanger: non`), puis un choix par ligne
 * `- …` ; la suite d'un choix est en retrait de 2 espaces (un bloc dans un choix :
 * clôture ```` du bloc choix). `case: N` est posée par le générateur.
 */
import { describe, it, expect } from 'vitest';
import {
	findChoiceBlocks,
	parseChoiceBody,
	replaceChoiceBlocks,
	serializeChoiceBlock
} from '$lib/ubumark/parser/choix-parser';

const lines = (text: string) => text.split('\n');

describe('lecture du corps d’un bloc choix', () => {
	it('nominal : deux choix, une réponse, mélangé par défaut', () => {
		const spec = parseChoiceBody(['- Oui, ils sont alignés.', '- Non, ils ne sont pas alignés.']);
		expect(spec).toEqual({
			multiple: false,
			shuffle: true,
			choices: ['Oui, ils sont alignés.', 'Non, ils ne sont pas alignés.'],
			errors: []
		});
	});

	it('réglages en tête : plusieurs: oui, melanger: non (accent toléré)', () => {
		const spec = parseChoiceBody(['plusieurs: oui', 'mélanger: non', '- $2$', '- $3$', '- $4$']);
		expect(spec.multiple).toBe(true);
		expect(spec.shuffle).toBe(false);
		expect(spec.choices).toEqual(['$2$', '$3$', '$4$']);
		expect(spec.errors).toEqual([]);
	});

	it('case: N lue (posée par le générateur)', () => {
		expect(parseChoiceBody(['case: 3', '- a', '- b']).caseIndex).toBe(3);
	});

	it('un choix sur plusieurs lignes (retrait de 2 espaces), bloc compris', () => {
		const spec = parseChoiceBody([
			'- ```horloge',
			'  10:30',
			'  ```',
			'- Une phrase',
			'  qui continue.',
			''
		]);
		expect(spec.choices).toEqual(['```horloge\n10:30\n```', 'Une phrase\nqui continue.']);
		expect(spec.errors).toEqual([]);
	});

	it('lignes vides entre les choix ignorées', () => {
		expect(parseChoiceBody(['', '- a', '', '- b', '']).choices).toEqual(['a', 'b']);
	});

	it('erreur : moins de 2 choix', () => {
		expect(parseChoiceBody(['- Oui']).errors).toEqual([
			'au moins 2 choix (une ligne « - … » par choix)'
		]);
	});

	it('erreur : choix vide', () => {
		expect(parseChoiceBody(['- a', '- ', '- c']).errors).toContain('le choix 2 est vide');
	});

	it('erreur : réglage inconnu, valeur inconnue', () => {
		expect(parseChoiceBody(['ordre: non', '- a', '- b']).errors).toContain(
			'réglage « ordre » inconnu (plusieurs, melanger)'
		);
		expect(parseChoiceBody(['plusieurs: peut-être', '- a', '- b']).errors).toContain(
			'plusieurs: écrire oui ou non'
		);
	});

	it('erreur : ligne hors liste, au début comme après les choix', () => {
		expect(parseChoiceBody(['Oui', '- a', '- b']).errors).toContain(
			'ligne « Oui » : un choix commence par « - » (sa suite : en retrait de 2 espaces)'
		);
		expect(parseChoiceBody(['- a', '- b', 'plusieurs: oui']).errors).toContain(
			'ligne « plusieurs: oui » : un choix commence par « - » (sa suite : en retrait de 2 espaces)'
		);
	});
});

describe('repérage des blocs choix dans un énoncé', () => {
	it('bloc ``` et bloc ```` (un bloc dans un choix)', () => {
		const text = [
			'Question ?',
			'',
			'````choix',
			'- ```horloge',
			'  10:30',
			'  ```',
			'- b',
			'````',
			'Suite'
		].join('\n');
		expect(findChoiceBlocks(lines(text))).toEqual([
			{ startIndex: 2, endIndex: 7, fence: '````', closed: true }
		]);
	});

	it('bloc non fermé : jusqu’à la fin du texte', () => {
		expect(findChoiceBlocks(lines('```choix\n- a\n- b'))).toEqual([
			{ startIndex: 0, endIndex: 2, fence: '```', closed: false }
		]);
	});

	it('en retrait ou cité : pas un bloc de premier niveau', () => {
		expect(findChoiceBlocks(lines('- item\n  ```choix\n  - a\n  ```'))).toEqual([]);
	});
});

describe('écriture d’un bloc choix (énoncé de l’instance)', () => {
	it('case posée, plusieurs gardé, melanger retiré ; aller-retour', () => {
		const text = serializeChoiceBlock({ caseIndex: 2, multiple: true, choices: ['a', 'b\nsuite'] });
		expect(text).toBe('```choix\ncase: 2\nplusieurs: oui\n- a\n- b\n  suite\n```');
		const body = lines(text).slice(1, -1);
		expect(parseChoiceBody(body)).toMatchObject({
			caseIndex: 2,
			multiple: true,
			choices: ['a', 'b\nsuite'],
			errors: []
		});
	});

	it('un choix qui contient un bloc : clôture ````', () => {
		const text = serializeChoiceBlock({
			caseIndex: 0,
			multiple: false,
			choices: ['```horloge\n10:30\n```', 'b']
		});
		expect(text.split('\n')[0]).toBe('````choix');
		expect(text.split('\n').at(-1)).toBe('````');
	});

	it('replaceChoiceBlocks remplace chaque bloc, le reste à l’octet près', () => {
		const text = 'Avant\n\n```choix\ncase: 1\n- a\n- b\n```\n\nAprès $x$';
		const out = replaceChoiceBlocks(
			text,
			(block) => `[${block.caseIndex}:${block.choices.join('|')}]`
		);
		expect(out).toBe('Avant\n\n[1:a|b]\n\nAprès $x$');
	});
});
