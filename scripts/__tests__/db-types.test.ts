/**
 * Règles de `pnpm db:types` (scripts/db-types/regles.ts) : d'où viennent les types de la base,
 * ce qu'on refuse d'écrire, et la garde « types à jour ».
 */
import { describe, expect, it } from 'vitest';
import { adresseDeLaBase, ecarts, lireLaSortie } from '../db-types/regles';

const GENERE = `export type Json = string | null

export type Database = {
  public: {
    Tables: {
      classes: {
        Row: {
          id: string
        }
      }
    }
  }
}
`;

describe('adresseDeLaBase', () => {
	it('vise la pile de test préparée par le lanceur', () => {
		const adresse = adresseDeLaBase({
			SUPABASE_DB_HOST: '127.0.0.1',
			SUPABASE_DB_PORT: '55322',
			SUPABASE_DB_USER: 'postgres',
			SUPABASE_DB_PASSWORD: 'postgres',
			SUPABASE_DB_NAME: 'postgres'
		});
		expect(adresse).toBe('postgresql://postgres:postgres@127.0.0.1:55322/postgres?sslmode=disable');
	});

	it('en CI, sans lanceur, vise la base du workflow', () => {
		expect(adresseDeLaBase({ GITHUB_ACTIONS: 'true' })).toBe(
			'postgresql://postgres:postgres@127.0.0.1:54322/postgres?sslmode=disable'
		);
	});

	it('refuse de deviner hors du lanceur : la base de dev porte les migrations d’autres branches', () => {
		expect(() => adresseDeLaBase({})).toThrow(/pnpm db:types/);
	});

	it('refuse une base qui n’est pas locale', () => {
		expect(() =>
			adresseDeLaBase({ SUPABASE_DB_HOST: 'db.exemple.supabase.co', SUPABASE_DB_PORT: '5432' })
		).toThrow(/locale/);
	});
});

describe('lireLaSortie', () => {
	it('rend la source quand la CLI a réussi', () => {
		expect(lireLaSortie(0, GENERE)).toEqual({ ok: true, source: GENERE });
	});

	it('refuse une sortie en échec', () => {
		const r = lireLaSortie(1, '');
		expect(r.ok).toBe(false);
	});

	it('refuse une sortie vide : jamais de database.ts vide', () => {
		expect(lireLaSortie(0, '  \n').ok).toBe(false);
	});

	it('refuse une erreur écrite sur la sortie standard avec un code 0 ou non', () => {
		const erreur = '{"_tag":"Error","error":{"code":"DbConnectError","message":"failed"}}';
		const r = lireLaSortie(0, erreur);
		expect(r.ok).toBe(false);
		if (!r.ok) expect(r.raison).toContain('DbConnectError');
	});

	it('refuse des types sans aucune table (base sans migrations)', () => {
		const vide = `export type Database = {\n  public: {\n    Tables: {\n      [_ in never]: never\n    }\n  }\n}\n`;
		expect(lireLaSortie(0, vide).ok).toBe(false);
	});
});

describe('ecarts', () => {
	it('aucun écart quand le fichier commité est celui qu’on régénère', () => {
		expect(ecarts('a\nb\nc\n', 'a\nb\nc\n')).toEqual([]);
	});

	it('montre la ligne du dépôt et celle de la base, numérotées', () => {
		const lignes = ecarts('a\nb\nc\n', 'a\nB\nc\n');
		expect(lignes).toEqual(['ligne 2', '  dépôt : b', '  base  : B']);
	});

	it('une ligne en plus dans la base (migration sans `pnpm db:types`)', () => {
		const lignes = ecarts('a\nc\n', 'a\nb\nc\n');
		expect(lignes[0]).toBe('ligne 2');
		expect(lignes).toContain('  base  : b');
	});

	it('s’arrête après quelques écarts', () => {
		const depot = Array.from({ length: 50 }, (_, i) => `d${i}`).join('\n');
		const base = Array.from({ length: 50 }, (_, i) => `b${i}`).join('\n');
		const lignes = ecarts(depot, base);
		expect(lignes.length).toBeLessThan(20);
		expect(lignes.at(-1)).toMatch(/…/);
	});
});
