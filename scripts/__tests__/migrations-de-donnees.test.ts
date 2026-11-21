/**
 * Mention `@migration-de-donnees` : migrations citées et migrations qui touchent le schéma
 * ======================================================================================
 *
 * Une migration de données (rangement, tags, contenu) peut créer des tables temporaires et
 * couper un trigger le temps d'un UPDATE ; elle ne crée ni règle d'accès, ni fonction, ni
 * colonne. La garde s'appuie sur `instructionDeSchema` : un faux « données » ferait sauter un
 * test de règles d'accès sur les PR.
 */

import { describe, it, expect } from 'vitest';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { erreursDuTest } from '../check-migrations-de-donnees';
import {
	instructionDeSchema,
	migrationsCitees,
	porteLaMention
} from '../lib/migrations-de-donnees';

// ============================================================================
// Constantes
// ============================================================================

const RANGEMENT = `
-- ROLLBACK:BEGIN
-- create temporary table _q_retour (id uuid);
-- alter table public.question_templates add column x int;
-- ROLLBACK:END
drop table if exists pg_temp._q_modeles;
create temporary table _q_modeles (id uuid primary key, code text);
alter table _q_modeles add column noeud uuid;
alter table public.question_templates disable trigger update_question_templates_updated_at;
update public.question_templates t set node_id = m.noeud from _q_modeles m where m.id = t.id;
alter table public.question_templates enable trigger update_question_templates_updated_at;
insert into public.question_template_curriculum_points (template_id, point_id) values ('a', 'b');
/* create policy "dans un commentaire" on public.x */
drop table _q_modeles;
`;

// ============================================================================
// Tests
// ============================================================================

describe('instructionDeSchema', () => {
	it('migration de rangement (tables temporaires, triggers coupés, commentaires) : données', () => {
		expect(instructionDeSchema(RANGEMENT)).toBeNull();
	});

	it.each([
		['create policy "lecture" on public.classes for select using (true);'],
		['CREATE OR REPLACE FUNCTION public.f() returns void language sql as $$ select 1 $$;'],
		['create trigger t before insert on public.x for each row execute function f();'],
		['alter table public.series rename column categories to items;'],
		['alter table public.curriculum_points'],
		['drop trigger curriculum_points_assign_code on public.curriculum_points;'],
		['drop policy "lecture" on public.classes;'],
		['grant select on public.x to authenticated;'],
		['revoke all on function public.f() from anon;'],
		['security definer'],
		['alter table public.x enable row level security;'],
		['create or replace view public.resources with (security_invoker = true) as select 1;'],
		['create unique index x on public.y (z);'],
		["update storage.buckets set file_size_limit = 1 where id = 'b';"]
	])('touche le schéma ou les règles : %s', (sql) => {
		expect(instructionDeSchema(`update public.x set y = 1;\n${sql}\n`)).not.toBeNull();
	});
});

describe('migrationsCitees', () => {
	it('chemins cités tels quels ou en relatif, sans doublon', () => {
		const source = `
const MIGRATION = 'supabase/migrations/20261108155933_questions_a_rangement_tags.sql';
const AUTRE = join(__dirname, '../../supabase/migrations/20261022080000_suppression.sql');
readFileSync('supabase/migrations/20261108155933_questions_a_rangement_tags.sql');
// supabase/migrations/098_vieux_nom.sql : pas horodaté, pas une migration rejouée
`;
		expect(migrationsCitees(source)).toEqual([
			'supabase/migrations/20261022080000_suppression.sql',
			'supabase/migrations/20261108155933_questions_a_rangement_tags.sql'
		]);
	});

	it('mention', () => {
		expect(porteLaMention('/**\n * @migration-de-donnees : hors des PR\n */')).toBe(true);
		expect(porteLaMention('/** test de règles d’accès */')).toBe(false);
	});
});

describe('erreursDuTest (garde)', () => {
	function avecMigrations(migrations: Record<string, string>, f: (racine: string) => void): void {
		const racine = realpathSync(mkdtempSync(join(tmpdir(), 'garde-mig-')));
		try {
			mkdirSync(join(racine, 'supabase/migrations'), { recursive: true });
			for (const [nom, sql] of Object.entries(migrations))
				writeFileSync(join(racine, 'supabase/migrations', nom), sql);
			f(racine);
		} finally {
			rmSync(racine, { recursive: true, force: true });
		}
	}

	const DONNEES = '20261108155933_questions_a_rangement_tags.sql';
	const SCHEMA = '20261013120000_tags_modeles_points.sql';
	const marque = (nom: string) =>
		`/** @migration-de-donnees */\nconst M = 'supabase/migrations/${nom}';\n`;

	it('test marqué qui rejoue une migration de données : rien à redire', () => {
		avecMigrations({ [DONNEES]: RANGEMENT }, (racine) => {
			expect(erreursDuTest('t.test.ts', marque(DONNEES), racine)).toEqual([]);
		});
	});

	it('test marqué dont la migration crée une fonction : refusé', () => {
		avecMigrations(
			{ [SCHEMA]: 'create function public.g() returns trigger as $$ $$;' },
			(racine) => {
				const erreurs = erreursDuTest('t.test.ts', marque(SCHEMA), racine);
				expect(erreurs).toHaveLength(1);
				expect(erreurs[0]).toContain('retirer la mention');
			}
		);
	});

	it('test marqué sans migration citée, ou migration introuvable : refusé', () => {
		avecMigrations({}, (racine) => {
			expect(erreursDuTest('t.test.ts', '/** @migration-de-donnees */', racine)).toHaveLength(1);
			expect(erreursDuTest('t.test.ts', marque(DONNEES), racine)[0]).toContain('introuvable');
		});
	});

	it('test non marqué : jamais une erreur', () => {
		avecMigrations({ [SCHEMA]: 'create policy p on public.x using (true);' }, (racine) => {
			expect(
				erreursDuTest('t.test.ts', `const M = 'supabase/migrations/${SCHEMA}';`, racine)
			).toEqual([]);
		});
	});
});
