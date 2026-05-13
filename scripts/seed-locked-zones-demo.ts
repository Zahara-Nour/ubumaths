#!/usr/bin/env tsx
/**
 * Create or delete a demo exercise that exercises the locked-zones
 * feature end-to-end. Run once before manual testing; clean up after.
 *
 *   pnpm tsx scripts/seed-locked-zones-demo.ts          # creates the demo
 *   pnpm tsx scripts/seed-locked-zones-demo.ts --clean  # removes it
 *
 * The exercise mirrors "Seuil 1280 — clubs sportifs" but adds inline
 * `{{cond | "False"}}` / `{{update | "..."}}` markers in the starter
 * so the student can only edit those two spots. Validation stays as
 * `unit_test` on `seuil()` returning 7.
 *
 * The demo is created `is_public = true` with a "TEST —" title so the
 * teacher can spot it immediately in their list and delete it via
 * `--clean` once done.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import type { Database } from '../src/lib/types/database';

dotenv.config({ path: path.resolve(process.cwd(), '.env'), quiet: true });

const DEMO_TITLE = 'TEST — Locked zones (à supprimer)';

const supabase = createClient<Database>(
	process.env.PUBLIC_SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function findFirstTeacher(): Promise<string> {
	const { data, error } = await supabase
		.from('profiles')
		.select('id')
		.eq('role', 'teacher')
		.order('created_at')
		.limit(1)
		.single();
	if (error || !data) throw new Error('No teacher found in DB');
	return data.id;
}

async function createDemo(): Promise<void> {
	const teacherId = await findFirstTeacher();

	// Check it doesn't already exist (idempotent).
	const { data: existing } = await supabase
		.from('python_exercises')
		.select('id')
		.eq('title', DEMO_TITLE)
		.maybeSingle();
	if (existing) {
		console.log(`✅ Demo already exists at: /python-exercises/${existing.id}`);
		return;
	}

	const starter_code = [
		'def seuil():',
		'    n = 0',
		'    A = 1700',
		'    while {{cond | "False"}}:    # à compléter (condition sur A et 1280)',
		'        n = n + 1',
		'        A = {{update | "..."}}    # à compléter (relation de récurrence)',
		'    return n',
		''
	].join('\n');

	const solution_code = [
		'def seuil():',
		'    n = 0',
		'    A = 1700',
		'    while A >= 1280:',
		'        n = n + 1',
		'        A = 0.75 * A + 300',
		'    return n',
		''
	].join('\n');

	const validation_config = {
		ast_requirements: [
			{
				type: 'defines_function',
				name: 'seuil',
				message: 'Tu dois définir la fonction seuil().'
			},
			{ type: 'uses_loop', message: 'Tu dois utiliser une boucle while.' }
		],
		behavior: {
			kind: 'unit_test',
			function_name: 'seuil',
			test_cases: [{ args: [], expected: 7 }]
		}
	};

	const { data, error } = await supabase
		.from('python_exercises')
		.insert({
			title: DEMO_TITLE,
			description: 'Démo pour tester la feature locked-zones. À supprimer après test.',
			instructions:
				'## Test manuel\n\nLa fonction `seuil()` ci-dessous compte les années nécessaires pour passer sous 1280 (modèle club sportif). **Deux zones** sont à compléter (surlignées). Le reste du code est verrouillé.\n\n- Condition de la boucle `while`\n- Mise à jour de `A`\n\nRéponse attendue : `7`.',
			starter_code,
			solution_code,
			validation_config:
				validation_config as unknown as Database['public']['Tables']['python_exercises']['Insert']['validation_config'],
			level: 'lycee',
			source: null,
			author_id: teacherId,
			is_public: true
		})
		.select('id')
		.single();

	if (error) {
		console.error('❌ Insert failed:', error.message);
		process.exit(1);
	}
	console.log(`✅ Demo created at: /python-exercises/${data.id}`);
	console.log('   Ouvre cette URL dans le browser pour tester.');
	console.log(`   Cleanup: pnpm tsx scripts/seed-locked-zones-demo.ts --clean`);
}

async function cleanDemo(): Promise<void> {
	const { data, error } = await supabase
		.from('python_exercises')
		.delete()
		.eq('title', DEMO_TITLE)
		.select('id');
	if (error) {
		console.error('❌ Delete failed:', error.message);
		process.exit(1);
	}
	console.log(`✅ Removed ${data?.length ?? 0} demo exercise(s).`);
}

const isClean = process.argv.includes('--clean');
void (isClean ? cleanDemo() : createDemo());
