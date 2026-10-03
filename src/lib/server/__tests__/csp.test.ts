/**
 * CSP : les images Supabase ne viennent que de NOTRE projet.
 *
 * `img-src https://*.supabase.co` admettait le projet Supabase de n'importe qui :
 * si un filtre applicatif cédait, la CSP ne servait plus de filet (audit de
 * sécurité du 2026-10-03).
 */
import { describe, expect, it } from 'vitest';
import { supabaseCspSource } from '../csp';

describe('supabaseCspSource', () => {
	it('donne l’origine exacte du projet', () => {
		expect(supabaseCspSource('https://cnevnzsvixxpnurautls.supabase.co')).toBe(
			'https://cnevnzsvixxpnurautls.supabase.co'
		);
	});

	it('ignore un chemin ou une barre finale', () => {
		expect(supabaseCspSource('https://projet.supabase.co/')).toBe('https://projet.supabase.co');
	});

	it('garde le port en local', () => {
		expect(supabaseCspSource('http://127.0.0.1:54321')).toBe('http://127.0.0.1:54321');
	});

	it('n’admet jamais de joker', () => {
		expect(supabaseCspSource('https://projet.supabase.co')).not.toContain('*');
	});
});
