/**
 * Rollback d'une migration de données, ÉCRIT EN COMMENTAIRE dans la migration
 * ============================================================================
 *
 * Une migration de données documente son rollback dans son en-tête, entre deux marqueurs :
 *
 *   -- ROLLBACK:BEGIN
 *   -- update public.… ;
 *   --
 *   -- ROLLBACK:END
 *
 * Les tests l'extraient et l'EXÉCUTENT : le rollback documenté est celui qui est éprouvé, pas
 * une copie qui divergerait. Le bloc ne contient ni `begin` ni `commit` : il se joue dans la
 * transaction de l'appelant (celle du test, ou celle qu'on ouvre en production).
 */
import { readFileSync } from 'node:fs';

const BEGIN = '-- ROLLBACK:BEGIN';
const END = '-- ROLLBACK:END';

export function extractRollback(migrationPath: string): string {
	const lines = readFileSync(migrationPath, 'utf-8').split('\n');
	const begin = lines.indexOf(BEGIN);
	const end = lines.indexOf(END);
	if (begin < 0 || end < begin) {
		throw new Error(`marqueurs de rollback introuvables dans ${migrationPath}`);
	}
	return lines
		.slice(begin + 1, end)
		.map((line) => {
			if (line === '--') return '';
			if (line.startsWith('-- ')) return line.slice(3);
			throw new Error(`ligne de rollback non commentée dans ${migrationPath} : ${line}`);
		})
		.join('\n');
}
