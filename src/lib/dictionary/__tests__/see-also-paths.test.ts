import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { SEE_ALSO_PATHS } from '../model';

// L10 : chaque page du Cabinet Noir doit pouvoir être visée par un « Voir aussi » du glossaire.
const CHIFFREMENT_DIR = join(process.cwd(), 'src/routes/(public)/chiffrement');

describe('SEE_ALSO_PATHS', () => {
	it('couvre toutes les pages du Cabinet Noir', () => {
		const pages = readdirSync(CHIFFREMENT_DIR, { withFileTypes: true })
			.filter((entry) => entry.isDirectory() && !entry.name.startsWith('_'))
			.map((entry) => `/chiffrement/${entry.name}`);
		const allowed: readonly string[] = SEE_ALSO_PATHS;
		expect(pages.filter((path) => !allowed.includes(path))).toEqual([]);
	});
});
