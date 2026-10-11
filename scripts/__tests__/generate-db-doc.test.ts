/**
 * La doc générée du schéma de base
 * ================================
 *
 * docs/systeme/base-de-donnees-tables.md est produite depuis
 * src/lib/types/database.ts (lui-même généré depuis la production par
 * `pnpm db:types`) : elle ne peut pas se périmer. Ce qui est gardé ici :
 * - la lecture de database.ts (colonnes, nullabilité, clés étrangères, vues,
 *   fonctions) ;
 * - CHAQUE table de la base réelle a un domaine : une migration qui ajoute une
 *   table doit la classer, sinon ce test rougit.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import { parseDatabaseTypes, domainOf, renderSchemaDoc } from '../generate-db-doc';

const SOURCE = `export type Database = {
  public: {
    Tables: {
      classes: {
        Row: {
          id: string
          name: string
          school_id: string | null
        }
        Insert: {
          id?: string
        }
        Update: {
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "active_classes"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          id: string
          metadata: Json | null
        }
        Insert: {
          id?: string
        }
        Update: {
          id?: string
        }
        Relationships: []
      }
    }
    Views: {
      active_classes: {
        Row: {
          id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_warning: {
        Args: { p_student_id: string }
        Returns: Json
      }
      is_teacher: { Args: never; Returns: boolean }
      search_terms:
        | { Args: { q: string }; Returns: Json }
        | { Args: { q: string; n: number }; Returns: Json }
    }
    Enums: {
      [_ in never]: never
    }
  }
}
`;

describe('parseDatabaseTypes', () => {
	const model = parseDatabaseTypes(SOURCE);

	it('lit les tables, leurs colonnes et la nullabilité', () => {
		expect(model.tables.map((t) => t.name)).toEqual(['classes', 'schools']);
		expect(model.tables[0].columns).toEqual([
			{ name: 'id', type: 'string', nullable: false },
			{ name: 'name', type: 'string', nullable: false },
			{ name: 'school_id', type: 'string', nullable: true }
		]);
	});

	it('lit les clés étrangères vers des tables, pas celles que Supabase déclare à travers une vue', () => {
		expect(model.tables[0].foreignKeys).toEqual([
			{ columns: ['school_id'], table: 'schools', referencedColumns: ['id'] }
		]);
		expect(model.tables[1].foreignKeys).toEqual([]);
	});

	it('lit les vues et les fonctions, sans les confondre avec les tables', () => {
		expect(model.views).toEqual(['active_classes']);
		expect(model.functions).toEqual(['add_warning', 'is_teacher', 'search_terms']);
	});
});

describe('renderSchemaDoc', () => {
	it('annonce sa source, range par domaine et montre colonnes et liens', () => {
		const md = renderSchemaDoc(parseDatabaseTypes(SOURCE));
		expect(md).toContain('pnpm db:types');
		expect(md).toMatch(/## Établissement et personnes[\s\S]*### `classes`/);
		expect(md).toContain('`school_id` → `schools`');
		expect(md).toContain('`school_id?`');
	});
});

describe('domainOf — chaque table de la base réelle a un domaine', () => {
	it('aucune table de database.ts sans domaine', () => {
		const source = readFileSync(
			resolve(import.meta.dirname, '../../src/lib/types/database.ts'),
			'utf-8'
		);
		const orphans = parseDatabaseTypes(source)
			.tables.map((t) => t.name)
			.filter((name) => domainOf(name) === null);
		expect(orphans).toEqual([]);
	});
});
