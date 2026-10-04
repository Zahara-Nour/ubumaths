/**
 * Une version de migration = un seul fichier
 * ==========================================
 *
 * Supabase identifie une migration par sa VERSION (les 14 chiffres de tête),
 * pas par son nom. Deux fichiers de même version : `db push` tient le second
 * pour déjà appliqué, et il n'arrive jamais en production. Arrivé le
 * 2026-10-03 : le seed de terminale (#748) a pris `20261004090000`, déjà
 * appliqué par `realtime_chat_prive` depuis un autre worktree. CI verte,
 * merge fait ; seul `migration list --linked` l'a montré avant `db:migrate`
 * (corrigé par #749).
 */

import { readdirSync } from 'node:fs';
import { describe, it, expect } from 'vitest';

/** Les versions portées par plus d'un fichier, avec ces fichiers */
function duplicateVersions(fileNames: string[]): Map<string, string[]> {
	const byVersion = new Map<string, string[]>();
	for (const name of fileNames) {
		const version = /^(\d{14})_.+\.sql$/.exec(name)?.[1];
		if (version === undefined) continue;
		byVersion.set(version, [...(byVersion.get(version) ?? []), name]);
	}
	return new Map([...byVersion].filter(([, names]) => names.length > 1));
}

describe('versions de migration', () => {
	it('repère deux fichiers de même version', () => {
		const duplicates = duplicateVersions([
			'20261004090000_realtime_chat_prive.sql',
			'20261004090000_seed_curriculum_terminale_spe.sql',
			'20261004100000_autre.sql'
		]);
		expect([...duplicates]).toEqual([
			[
				'20261004090000',
				[
					'20261004090000_realtime_chat_prive.sql',
					'20261004090000_seed_curriculum_terminale_spe.sql'
				]
			]
		]);
	});

	it('aucune version n’est partagée dans supabase/migrations', () => {
		const names = readdirSync(new URL('../../supabase/migrations/', import.meta.url));
		// Le dossier est bien lu : sans cela, « aucun doublon » ne prouverait rien
		expect(names.filter((n) => n.endsWith('.sql')).length).toBeGreaterThan(100);
		expect(Object.fromEntries(duplicateVersions(names))).toEqual({});
	});
});
