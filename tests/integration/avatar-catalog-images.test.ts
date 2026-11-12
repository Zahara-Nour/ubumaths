/**
 * Boutique d'avatars : chaque avatar du catalogue a son image dans `static/`
 * ==========================================================================
 *
 * Le catalogue vit en base (migrations), les images dans `static/avatars/`.
 * Une ligne sans image afficherait une image cassée dans la boutique et partout
 * où l'avatar est porté (`profiles.avatar_url`). Ce test relit le catalogue de
 * la base locale et vérifie que chaque `image_path` existe sur le disque.
 *
 * Les lignes de test de `boutique-avatars.test.ts` (préfixe `zzt`) sont exclues.
 *
 * @vitest-environment node
 */

import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { TEST_SERVICE_ROLE_KEY } from '../helpers/database/trigger-test-helpers';

// Types
interface CatalogRow {
	key: string;
	image_path: string;
}

// Constantes
const SUPABASE_URL = process.env.SUPABASE_TEST_URL || 'http://localhost:54321';
const CLIENT_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } };
const STATIC_DIR = resolve('static');
const FIRST_BATCH_SIZE = 21;

describe("Catalogue d'avatars : images présentes", () => {
	it('chaque avatar du catalogue a son fichier WebP dans static/', async () => {
		const service = createClient(SUPABASE_URL, TEST_SERVICE_ROLE_KEY, CLIENT_OPTIONS);
		const { data, error } = await service
			.from('avatar_catalog')
			.select('key, image_path')
			.not('key', 'like', 'zzt%');
		expect(error).toBeNull();
		const rows = (data ?? []) as CatalogRow[];

		// Premier lot livré : un catalogue vide passerait le test sans rien prouver
		expect(rows.length).toBeGreaterThanOrEqual(FIRST_BATCH_SIZE);

		const missing = rows
			.filter((row) => !existsSync(join(STATIC_DIR, row.image_path)))
			.map((row) => `${row.key} → static${row.image_path}`);
		expect(missing).toEqual([]);
	});
});
