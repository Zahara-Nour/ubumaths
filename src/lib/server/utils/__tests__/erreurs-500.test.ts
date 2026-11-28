// Écart L42 (décision de David du 2026-11-28) : une erreur 500 montre à l'utilisateur
// un message en français ; le détail (message de la base, de Google, du compilateur…)
// part seulement au journal du serveur. Ce test échoue dès qu'une erreur 500 recopie
// un message technique dans ce qu'elle renvoie.
import { describe, it, expect, vi } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { isHttpError } from '@sveltejs/kit';

// Constantes
const SRC = join(process.cwd(), 'src');
const ERROR_500 = /\berror\(\s*50\d\s*,([\s\S]{0,300}?)\)\s*;/g;
const JSON_500 = /json\(\s*\{([\s\S]{0,300}?)\}\s*,\s*\{\s*status:\s*50\d/g;
const FAIL_500 = /\bfail\(\s*50\d\s*,([\s\S]{0,300}?)\)/g;
// Ce qui trahit un message technique recopié
const TECHNICAL = /\.message\b|\$\{\s*message\s*\}|\bdetails\s*:|^\s*message\s*$/;

// Variables
const logged = vi.hoisted(() => ({ calls: [] as unknown[][] }));

vi.mock('#lib/utils/logger.ts', () => ({
	createServerLogger: () => ({
		error: (...args: unknown[]) => logged.calls.push(args),
		warn: () => {},
		info: () => {},
		debug: () => {}
	})
}));

const { throwServerError, serverErrorResponse } = await import('../error-handler.ts');

// Functions
function listSources(dir: string): string[] {
	return readdirSync(dir).flatMap((name) => {
		const full = join(dir, name);
		if (statSync(full).isDirectory()) return name === '__tests__' ? [] : listSources(full);
		if (!/\.(ts|svelte)$/.test(name) || /\.test\./.test(name)) return [];
		return [full];
	});
}

function lineOf(text: string, index: number): number {
	return text.slice(0, index).split('\n').length;
}

function technical500(): string[] {
	return listSources(SRC).flatMap((full) => {
		const text = readFileSync(full, 'utf8');
		const path = relative(process.cwd(), full);
		return [ERROR_500, JSON_500, FAIL_500].flatMap((pattern) =>
			[...text.matchAll(pattern)]
				.filter((m) => TECHNICAL.test(m[1]))
				.map((m) => `${path}:${lineOf(text, m.index)}`)
		);
	});
}

describe('erreurs 500 (L42)', () => {
	it('aucune erreur 500 ne recopie un message technique', () => {
		expect(technical500()).toEqual([]);
	});

	it('throwServerError : 500 au message français, détail au journal seulement', () => {
		logged.calls = [];
		const dbError = { message: 'relation "x" does not exist', code: '42P01' };
		let thrown: unknown;
		try {
			throwServerError('test/contexte', dbError, 'Impossible de charger les cartes');
		} catch (err) {
			thrown = err;
		}
		expect(isHttpError(thrown, 500)).toBe(true);
		if (!isHttpError(thrown)) return;
		expect(thrown.body.message).toBe('Impossible de charger les cartes');
		expect(JSON.stringify(logged.calls)).toContain('does not exist');
		expect(JSON.stringify(logged.calls)).toContain('test/contexte');
	});

	it('serverErrorResponse : réponse JSON 500 au message français', async () => {
		logged.calls = [];
		const response = serverErrorResponse('test/json', { message: 'permission denied' }, 'Échec');
		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({ error: 'Échec' });
		expect(JSON.stringify(logged.calls)).toContain('permission denied');
	});
});
