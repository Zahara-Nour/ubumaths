/**
 * Contrôle « prod = dépôt » (scripts/db-types/prod-depot.ts, `pnpm db:types:prod`) : le schéma
 * de la prod est comparé au `database.ts` du dépôt malgré deux générateurs qui n'écrivent pas
 * pareil. Gardé ici : les différences de FORME ne sont pas des écarts, les différences de FOND
 * en sont toutes, et un fichier qu'on ne sait pas lire n'est jamais pris pour « aucun écart ».
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { comparer, decrire, identiques, lireLeSchema, type Schema } from '../db-types/prod-depot';

/** Écrit comme le générateur local, après prettier (tabulations, apostrophes, points-virgules). */
const DEPOT = `export type Json = string | null;

export type Database = {
	public: {
		Tables: {
			classes: {
				Row: {
					id: string;
					reglages: NonNullable<Json>;
					note: Json | null;
					nom_complet: string | null;
					couleur: Database['public']['Enums']['couleur'];
				};
				Insert: {
					id?: string;
					reglages?: NonNullable<Json>;
					nom_complet?: never;
				};
				Update: {
					id?: string;
				};
				ComputedFields: never;
				Relationships: [
					{
						foreignKeyName: 'classes_ecole_fkey';
						columns: ['ecole_id'];
						isOneToOne: false;
					}
				];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			compter: { Args: Record<PropertyKey, never>; Returns: number };
			chercher: {
				Args: { p_nom: string; p_limite?: number };
				Returns: { id: string; nom: string }[];
			};
			surchargee:
				| { Args: { a: string }; Returns: boolean }
				| { Args: { b: number }; Returns: boolean };
		};
		Enums: {
			couleur: 'rouge' | 'bleu';
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};
`;

/** La même base, écrite comme le générateur de la prod (brut : ni points-virgules, ni tabulations). */
const PROD = `export type Json =
  | string
  | null

export type Database = {
  // Allows to automatically instantiate createClient with right options
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      classes: {
        Row: {
          id: string
          reglages: Json
          note: Json | null
          nom_complet: string | null
          couleur: Database["public"]["Enums"]["couleur"]
        }
        Insert: {
          id?: string
          reglages?: Json
          nom_complet?: string | null
        }
        Update: {
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_ecole_fkey"
            columns: ["ecole_id"]
            isOneToOne: false
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      compter: { Args: never; Returns: number }
      chercher: {
        Args: {
          p_nom: string
          p_limite?: number
        }
        Returns: {
          id: string
          nom: string
        }[]
      }
      surchargee:
        | { Args: { b: number }; Returns: boolean }
        | { Args: { a: string }; Returns: boolean }
    }
    Enums: {
      couleur: "rouge" | "bleu"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
`;

function schema(texte: string): Schema {
	const lu = lireLeSchema(texte);
	if (!lu.ok) throw new Error(lu.raison);
	return lu.schema;
}

function ecartsEntre(depot: string, prod: string) {
	return comparer(schema(depot), schema(prod));
}

/** `PROD` où `avant` (présent une seule fois) devient `apres`. */
function prodAvec(avant: string, apres: string): string {
	if (PROD.split(avant).length !== 2) throw new Error(`« ${avant} » n'est pas unique dans PROD`);
	return PROD.replace(avant, apres);
}

describe('lireLeSchema', () => {
	it('lit colonnes, fonctions et enums du schéma public, chemin par chemin', () => {
		const s = schema(PROD);
		expect(s.get('Tables.classes.Row.id')).toBe('string');
		expect(s.get('Tables.classes.Insert.id')).toBe('?string');
		expect(s.get('Functions.chercher.Args.p_limite')).toBe('?number');
		expect(s.get('Functions.chercher.Returns')).toBe('{ id: string; nom: string }[]');
		expect(s.get('Enums.couleur')).toBe('"bleu" | "rouge"');
	});

	it('ignore ce qui n’est pas le schéma public', () => {
		expect([...schema(PROD).keys()].some((c) => c.includes('Internal'))).toBe(false);
	});

	it.each([
		['un message d’erreur de l’API', '{"message":"Unauthorized"}', /Database/],
		['un fichier sans schéma public', 'export type Database = { autre: { Tables: {} } }', /public/],
		[
			'un schéma sans table',
			'export type Database = { public: { Tables: { [_ in never]: never }; Functions: { f: { Args: never; Returns: number } } } }',
			/colonne/
		],
		[
			'un schéma sans fonction',
			'export type Database = { public: { Tables: { t: { Row: { id: string } } } } }',
			/fonction/
		]
	])('refuse %s : jamais « aucun écart » par défaut', (_nom, texte, raison) => {
		const lu = lireLeSchema(texte);
		expect(lu.ok).toBe(false);
		if (!lu.ok) expect(lu.raison).toMatch(raison);
	});
});

describe('comparer — la forme n’est pas un écart', () => {
	it('même base écrite par les deux générateurs : identiques', () => {
		const c = ecartsEntre(DEPOT, PROD);
		expect(decrire(c)).toEqual([]);
		expect(identiques(c)).toBe(true);
	});

	it('même fichier des deux côtés : identiques', () => {
		expect(identiques(ecartsEntre(DEPOT, DEPOT))).toBe(true);
	});
});

describe('comparer — le fond est toujours un écart', () => {
	it('colonne en prod, absente du dépôt (ajoutée au Dashboard)', () => {
		const c = ecartsEntre(
			DEPOT,
			prodAvec(
				'          id: string\n          reglages: Json\n',
				'          id: string\n          ajoutee: number\n          reglages: Json\n'
			)
		);
		expect(c.enTropEnProd).toEqual(['Tables.classes.Row.ajoutee']);
		expect(identiques(c)).toBe(false);
	});

	it('colonne du dépôt absente de la prod (migration pas jouée)', () => {
		const c = ecartsEntre(DEPOT, prodAvec('          note: Json | null\n', ''));
		expect(c.absentDeProd).toEqual(['Tables.classes.Row.note']);
	});

	it('type d’une colonne', () => {
		const c = ecartsEntre(
			DEPOT,
			prodAvec(
				'          id: string\n          reglages: Json\n',
				'          id: number\n          reglages: Json\n'
			)
		);
		expect(c.differents).toEqual([
			{ chemin: 'Tables.classes.Row.id', depot: 'string', prod: 'number' }
		]);
	});

	it('colonne devenue facultative (NOT NULL retiré)', () => {
		const c = ecartsEntre(
			DEPOT,
			prodAvec(
				'nom_complet: string | null\n          couleur',
				'nom_complet: string\n          couleur'
			)
		);
		expect(c.differents.map((d) => d.chemin)).toEqual(['Tables.classes.Row.nom_complet']);
	});

	it('jsonb obligatoire devenu facultatif : `NonNullable<Json>` n’efface pas le `| null`', () => {
		const c = ecartsEntre(
			DEPOT,
			prodAvec('          reglages: Json\n', '          reglages: Json | null\n')
		);
		expect(c.differents.map((d) => d.chemin)).toEqual(['Tables.classes.Row.reglages']);
	});

	it('valeur d’enum en plus', () => {
		const c = ecartsEntre(
			DEPOT,
			prodAvec('couleur: "rouge" | "bleu"', 'couleur: "rouge" | "bleu" | "vert"')
		);
		expect(c.differents.map((d) => d.chemin)).toEqual(['Enums.couleur']);
	});

	it('argument de fonction, retour de fonction, fonction entière', () => {
		expect(ecartsEntre(DEPOT, prodAvec('          p_limite?: number\n', '')).absentDeProd).toEqual([
			'Functions.chercher.Args.p_limite'
		]);
		expect(
			ecartsEntre(
				DEPOT,
				prodAvec('          nom: string\n        }[]', '        }[]')
			).differents.map((d) => d.chemin)
		).toEqual(['Functions.chercher.Returns']);
		expect(
			ecartsEntre(DEPOT, prodAvec('      compter: { Args: never; Returns: number }\n', ''))
				.absentDeProd
		).toEqual(['Functions.compter.Args', 'Functions.compter.Returns']);
	});

	it('surcharge de fonction retirée', () => {
		const c = ecartsEntre(
			DEPOT,
			prodAvec('        | { Args: { b: number }; Returns: boolean }\n', '')
		);
		expect(c.differents.map((d) => d.chemin)).toEqual(['Functions.surchargee']);
	});

	it('clé étrangère modifiée', () => {
		const c = ecartsEntre(DEPOT, prodAvec('isOneToOne: false', 'isOneToOne: true'));
		expect(c.differents.map((d) => d.chemin)).toEqual(['Tables.classes.Relationships']);
	});

	it('colonne calculée : absente de la prod, c’est un écart, malgré son `never` à l’écriture', () => {
		const c = ecartsEntre(DEPOT, prodAvec('          nom_complet?: string | null\n', ''));
		expect(c.absentDeProd).toEqual(['Tables.classes.Insert.nom_complet']);
	});
});

describe('decrire', () => {
	it('nomme chaque famille d’écarts, avec les deux écritures', () => {
		const lignes = decrire({
			enTropEnProd: ['Tables.a.Row.x'],
			absentDeProd: ['Tables.a.Row.y'],
			differents: [{ chemin: 'Tables.a.Row.z', depot: 'string', prod: 'number' }]
		});
		expect(lignes.join('\n')).toBe(
			[
				'En prod, pas dans le dépôt (1) :',
				'   Tables.a.Row.x',
				'Dans le dépôt, pas en prod (1) :',
				'   Tables.a.Row.y',
				'Type différent (1) :',
				'   Tables.a.Row.z — dépôt : string · prod : number'
			].join('\n')
		);
	});

	it('longue liste : les premiers, puis « d’autres suivent »', () => {
		const lignes = decrire({
			enTropEnProd: Array.from({ length: 40 }, (_, i) => `Tables.t${i}.Row.id`),
			absentDeProd: [],
			differents: []
		});
		expect(lignes[0]).toBe('En prod, pas dans le dépôt (40) :');
		expect(lignes.at(-1)).toContain('d’autres suivent');
		expect(lignes.length).toBeLessThan(20);
	});
});

describe('pnpm db:types:prod (scripts/db-types/prod.ts)', () => {
	const SCRIPT = resolve(__dirname, '../db-types/prod.ts');
	const TSX = resolve(__dirname, '../../node_modules/.bin/tsx');
	let bac: string;

	beforeEach(() => {
		bac = mkdtempSync(join(tmpdir(), 'db-types-prod-'));
	});
	afterEach(() => {
		rmSync(bac, { recursive: true, force: true });
	});

	/** Lance la commande ; les « types de la prod » viennent de `prod` (un texte, ou une commande). */
	function lancer(prod: { texte: string } | { commande: string }, ...args: string[]) {
		let commande: string;
		if ('texte' in prod) {
			writeFileSync(join(bac, 'prod.ts'), prod.texte);
			commande = `cat ${join(bac, 'prod.ts')}`;
		} else commande = prod.commande;
		const r = spawnSync(TSX, [SCRIPT, ...args], {
			encoding: 'utf8',
			env: { ...process.env, DB_TYPES_PROD_COMMANDE: commande }
		});
		return { status: r.status, sortie: `${r.stdout}${r.stderr}` };
	}

	it('le database.ts du dépôt comparé à lui-même : sortie 0', () => {
		const r = lancer({ commande: 'cat src/lib/types/database.ts' });
		expect(r.status, r.sortie).toBe(0);
		expect(r.sortie).toContain('✅ prod = dépôt');
	});

	it('écart : sortie 1, écarts nommés', () => {
		const r = lancer({ texte: PROD });
		expect(r.status, r.sortie).toBe(1);
		expect(r.sortie).toContain('Dans le dépôt, pas en prod');
	});

	it('types de la prod illisibles : sortie 1, et le dit sans parler d’écart', () => {
		const r = lancer({ texte: '{"message":"Unauthorized"}' });
		expect(r.status, r.sortie).toBe(1);
		expect(r.sortie).toContain('forme non reconnue');
		expect(r.sortie).not.toContain('pas en prod');
	});

	it('lecture de la prod en échec : sortie 1, avec la fin de son message', () => {
		const r = lancer({ commande: 'echo "Cannot find project ref" >&2; exit 1' });
		expect(r.status, r.sortie).toBe(1);
		expect(r.sortie).toContain('Types de la prod non lus');
		expect(r.sortie).toContain('Cannot find project ref');
	});

	it('--commit compare au database.ts de ce commit', () => {
		const sha = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
		const r = lancer({ commande: `git show ${sha}:src/lib/types/database.ts` }, '--commit', sha);
		expect(r.status, r.sortie).toBe(0);
		expect(r.sortie).toContain(`du commit ${sha.slice(0, 10)}`);
	});

	it('argument de travers : refusé, rien n’est lu', () => {
		const r = lancer({ commande: 'exit 0' }, '--commit', 'HEAD~1; rm');
		expect(r.status, r.sortie).toBe(1);
		expect(r.sortie).toContain('Usage');
	});
});
