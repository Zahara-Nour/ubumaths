/**
 * Une commande préparée par une carte (« Tableau croisé avec M », « Simuler avec
 * probabilités M ») s'AJOUTE au brouillon de la console, au lieu de l'écraser
 * (décision de David du 2026-10-18) : ce que l'élève avait commencé à taper
 * n'est jamais perdu.
 *
 * `desk.draft` est la ligne en cours en texte, quel que soit le champ (texte ou
 * mathématique, cf. `CalculView`) : la règle se vérifie ici pour les deux modes.
 */
import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';

const SURVEY = { L: 'fille ; garçon ; fille ; garçon', M: 'oui ; oui ; non ; oui' };
const DIE = { L: '1;2;3;4;5;6', M: '1/6;1/6;1/6;1/6;1/6;1/6' };

function deskWith(lists: Record<string, string>): CalcDesk {
	const atelier = new Atelier();
	for (const [name, definition] of Object.entries(lists)) {
		atelier.create({ kind: 'list', name, definition });
	}
	return new CalcDesk(atelier);
}

describe('une commande préparée garde le brouillon de l’élève', () => {
	it.each([
		['cross:M', SURVEY, '.croiser L M'],
		['simulate:M', DIE, '.simuler L M 100']
	])('%s : brouillon vide → la commande seule', (action, lists, command) => {
		const desk = deskWith(lists);
		expect(desk.runFromPanel(action, 'L')).toBe('needs-argument');
		expect(desk.draft).toBe(command);
	});

	it.each([
		['cross:M', SURVEY, 'g(2)+', 'g(2)+ .croiser L M'],
		['simulate:M', DIE, 'g(2)+', 'g(2)+ .simuler L M 100'],
		// Un espace déjà tapé n'est pas doublé
		['cross:M', SURVEY, 'g(2)+ ', 'g(2)+ .croiser L M']
	])('%s : brouillon « %s » conservé, la commande à la suite', (action, lists, draft, expected) => {
		const desk = deskWith(lists);
		desk.draft = draft;
		expect(desk.runFromPanel(action, 'L')).toBe('needs-argument');
		expect(desk.draft).toBe(expected);
	});

	it('un brouillon fait seulement d’espaces compte comme vide', () => {
		const desk = deskWith(SURVEY);
		desk.draft = '   ';
		desk.runFromPanel('cross:M', 'L');
		expect(desk.draft).toBe('.croiser L M');
	});
});
