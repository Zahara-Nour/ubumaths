/**
 * Garde-fou : chaque niveau du référentiel doit pointer une route qui existe.
 *
 * Le 2026-08-29, la page Programme appelait encore
 * `/api/teacher/curriculum/items/...` alors que la route avait été renommée
 * `objectives` à la fusion. Renommer, réordonner ou supprimer un objectif
 * répondait 404, sans erreur visible ailleurs : les tests d'intégration
 * importent les handlers par leur chemin de fichier et ne traversent jamais
 * l'URL que le client construit.
 */

import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
	CURRICULUM_LEVELS,
	CURRICULUM_LEVEL_PATHS,
	CURRICULUM_LEVEL_NOUNS
} from '../curriculum-levels';

const API_ROOT = join(process.cwd(), 'src/routes/api/teacher/curriculum');

describe('Niveaux du référentiel', () => {
	it.each(CURRICULUM_LEVELS)('« %s » pointe une route de collection existante', (level) => {
		const path = CURRICULUM_LEVEL_PATHS[level];
		expect(existsSync(join(API_ROOT, path, '+server.ts'))).toBe(true);
	});

	// C'est cette route-ci qui manquait : la collection `items` n'existait plus,
	// mais seul le PATCH/DELETE d'un élément unique l'utilisait.
	it.each(CURRICULUM_LEVELS)('« %s » a une route de détail [id]', (level) => {
		const path = CURRICULUM_LEVEL_PATHS[level];
		const dirs = { themes: '[themeId]', objectives: '[objectiveId]', points: '[pointId]' };
		expect(existsSync(join(API_ROOT, path, dirs[path as keyof typeof dirs], '+server.ts'))).toBe(
			true
		);
	});

	it('nomme chaque niveau en français', () => {
		for (const level of CURRICULUM_LEVELS) {
			expect(CURRICULUM_LEVEL_NOUNS[level]).toMatch(/^[a-zàâçéèêëîïôûùüÿñæœ]+$/);
		}
	});
});
