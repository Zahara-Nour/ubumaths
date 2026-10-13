/**
 * Une définition en erreur ou en attente : la ligne de Calcul dit la vérité
 * (décision de David, 2026-10-13). Elle reprend le MESSAGE DE LA CARTE, sans
 * en inventer un autre : en erreur, la ligne est marquée en échec ; en
 * attente, non (l'attente se répare seule, décision D9).
 *
 * Tous les gestes passent par le vrai chemin (`CalcDesk.submit`).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';
import { historyToJson, historyToUbumark } from '../history-export';
import { readHistory } from '../history-import';

function deskWith(...lines: string[]): CalcDesk {
	const desk = new CalcDesk(new Atelier());
	for (const line of lines) desk.submit(line);
	return desk;
}

function last(desk: CalcDesk) {
	return desk.entries.at(-1)!;
}

describe('une définition en erreur', () => {
	it.each([
		[['h(x) = x^^2'], 'h'],
		[['k(x) = (x+1'], 'k'],
		[['f(x) = x^2 sur [0;+∞[', 'g(x) = f(2x)'], 'g']
	])('%j : la ligne reprend le message de la carte, en échec', (lines, name) => {
		const desk = deskWith(...lines);
		const card = desk.atelier.get(name)!;
		expect(card.status).toBe('error');
		expect(last(desk)).toMatchObject({
			failed: true,
			text: `« ${name} » est dans tes objets, mais elle est en erreur : ${card.message}`
		});
	});

	it('h(x) = x^^2 : le texte attendu, mot pour mot', () => {
		expect(last(deskWith('h(x) = x^^2')).text).toBe(
			"« h » est dans tes objets, mais elle est en erreur : « x^^2 » n'est pas une expression valide."
		);
	});
});

describe('une définition en attente', () => {
	it('p(x) = q(x)+1 : en attente de q, pas en échec', () => {
		const desk = deskWith('p(x) = q(x)+1');
		expect(desk.atelier.get('p')?.status).toBe('pending');
		expect(last(desk)).toMatchObject({
			failed: false,
			text: "« p » est dans tes objets, en attente de « q », qui n'est pas encore défini."
		});
	});
});

describe('une définition réussie', () => {
	it('f(x) = x^2 : inchangée', () => {
		expect(last(deskWith('f(x) = x^2'))).toMatchObject({
			failed: false,
			text: '« f » est dans tes objets.'
		});
	});
});

describe('export et rejeu', () => {
	const NOW = new Date(2026, 9, 13);

	it('l’export JSON et ubumark gardent le texte et l’échec de la ligne', () => {
		const desk = deskWith('h(x) = x^^2', 'p(x) = q(x)+1');
		const [h, p] = JSON.parse(historyToJson(desk.entries, NOW)).entries;
		expect(h).toMatchObject({ failed: true, text: expect.stringContaining('est en erreur') });
		expect(p).toMatchObject({ failed: false, text: expect.stringContaining('en attente de') });
		expect(historyToUbumark(desk.entries, NOW)).toContain(
			'Erreur : « h » est dans tes objets, mais elle est en erreur'
		);
	});

	it('rejouée, la ligne dit la vérité et le rejeu continue', () => {
		const source = deskWith('h(x) = x^^2', 'p(x) = q(x)+1', '2+3');
		const read = readHistory(historyToJson(source.entries, NOW));
		if (!read.ok) throw new Error(read.message);
		const target = new CalcDesk(new Atelier());
		expect(target.replay(read.history)).toEqual({ ok: true, replayed: 3 });
		expect(target.entries.map(({ text, failed }) => ({ text, failed }))).toEqual(
			source.entries.map(({ text, failed }) => ({ text, failed }))
		);
	});

	it('un export d’avant (définition en erreur marquée réussie) se rejoue encore', () => {
		const source = deskWith('h(x) = x^^2', '2+3');
		const file = JSON.parse(historyToJson(source.entries, NOW));
		file.entries[0] = { ...file.entries[0], failed: false, text: '« h » est dans tes objets.' };
		const read = readHistory(JSON.stringify(file));
		if (!read.ok) throw new Error(read.message);
		const target = new CalcDesk(new Atelier());
		expect(target.replay(read.history)).toEqual({ ok: true, replayed: 2 });
		expect(target.entries[0].failed).toBe(true);
	});
});
