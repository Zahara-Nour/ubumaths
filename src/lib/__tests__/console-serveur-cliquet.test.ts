/**
 * Garde (écart L8, lot 0) : aucun NOUVEAU `console.*` dans le code serveur.
 *
 * Le code serveur doit journaliser par `createServerLogger` (src/lib/utils/logger.ts),
 * qui masque les données personnelles (élèves mineurs, RGPD). Les appels existants
 * migreront par lots ; d'ici là, un cliquet par fichier contre
 * tests/fixtures/cliquet-console-serveur.json. Logique et périmètre :
 * scripts/cliquet-console-serveur.ts. Après une migration : `pnpm logs:cliquet --maj`.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
	compareCounts,
	countConsoleCalls,
	countServerConsoleCalls,
	ratchetReport,
	readRatchet,
	serverFiles
} from '../../../scripts/cliquet-console-serveur';

const ROOT = process.cwd();

describe('countConsoleCalls', () => {
	it('compte les appels console.<méthode>, ni les commentaires ni les chaînes', () => {
		const source = [
			"console.error('a');",
			'console.log(`b`); console.warn(1); console.info(2); console.debug(3); console.trace(4);',
			"// console.error('commentaire')",
			"/** console.log('JSDoc') */",
			"const s = 'console.error(x)';",
			'console.table([]);',
			'logger.error("pas console");'
		].join('\n');
		expect(countConsoleCalls(source)).toBe(6);
	});
});

describe('serverFiles', () => {
	it('prend src/lib/server et les fichiers serveur des routes, sans les tests', () => {
		const files = serverFiles(ROOT);
		expect(files).toContain('src/lib/server/rateLimiter.ts');
		expect(files.some((f) => /^src\/routes\/.*\+server\.ts$/.test(f))).toBe(true);
		expect(files.some((f) => /^src\/routes\/.*\+page\.server\.ts$/.test(f))).toBe(true);
		expect(files.some((f) => /__tests__|\.test\./.test(f))).toBe(false);
		expect(files.some((f) => /^src\/routes\/.*\+page\.ts$/.test(f))).toBe(false);
		expect(files).not.toContain('src/lib/utils/logger.ts');
	});
});

describe('compareCounts', () => {
	it('signale une hausse, un nouveau fichier et une baisse', () => {
		const { increases, decreases } = compareCounts(
			{ 'a.ts': 2, 'b.ts': 3 },
			{ 'a.ts': 3, 'b.ts': 1, 'c.ts': 1 }
		);
		expect(increases).toEqual([
			{ file: 'a.ts', before: 2, after: 3 },
			{ file: 'c.ts', before: 0, after: 1 }
		]);
		expect(decreases).toEqual([{ file: 'b.ts', before: 3, after: 1 }]);
	});
});

describe('cliquet des console.* serveur', () => {
	it('aucun fichier ne gagne ni ne perd un appel par rapport à la référence', () => {
		const report = ratchetReport(readRatchet(ROOT), countServerConsoleCalls(ROOT));
		// Le message dit quoi faire : createServerLogger, ou `pnpm logs:cliquet --maj`
		expect(report, report ?? '').toBeNull();
	});
});

// `createLogger` est muet hors dev : côté serveur, il rend une erreur invisible en
// production (lot 3 : toute l'authentification journalisait ainsi, sans rien laisser
// dans les logs Vercel). Le cliquet ne le voit pas, il ne compte que les console.*.
describe('createLogger côté serveur', () => {
	it('aucun fichier serveur ne journalise par createLogger', () => {
		const offenders = serverFiles(ROOT).filter((f) =>
			/\bcreateLogger\(/.test(readFileSync(join(ROOT, f), 'utf8'))
		);
		expect(offenders, `utilise createServerLogger : ${offenders.join(', ')}`).toEqual([]);
	});
});
