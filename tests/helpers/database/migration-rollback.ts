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
 * une copie qui divergerait. Le bloc se joue dans la transaction de l'appelant (celle du test,
 * ou celle qu'on ouvre en production) : il ne doit contenir AUCUN contrôle de transaction. Une
 * ligne « -- commit; » validerait la transaction du test sur la base locale partagée par toutes
 * les suites ; l'extraction la refuse, comme un bloc vide.
 */
import { readFileSync } from 'node:fs';

const BEGIN = '-- ROLLBACK:BEGIN';
const END = '-- ROLLBACK:END';
/**
 * Contrôle de transaction comme instruction autonome : begin, commit, rollback, end, abort (seuls),
 * start transaction, savepoint. Le `begin` d'un bloc plpgsql n'a pas de `;` : il n'est pas visé.
 */
export const TRANSACTION_CONTROL =
	/^\s*(?:(?:begin|commit|rollback|end|abort)(?:\s+(?:work|transaction))?\s*;|start\s+transaction\b|savepoint\b|release\s+savepoint\b|rollback\s+to\b)/i;

export function extractRollback(migrationPath: string): string {
	const lines = readFileSync(migrationPath, 'utf-8').split('\n');
	const begin = lines.indexOf(BEGIN);
	const end = lines.indexOf(END);
	if (begin < 0 || end < begin) {
		throw new Error(`marqueurs de rollback introuvables dans ${migrationPath}`);
	}
	const statements = lines.slice(begin + 1, end).map((line) => {
		if (line === '--') return '';
		if (!line.startsWith('-- ')) {
			throw new Error(`ligne de rollback non commentée dans ${migrationPath} : ${line}`);
		}
		const statement = line.slice(3);
		if (TRANSACTION_CONTROL.test(statement)) {
			throw new Error(`contrôle de transaction interdit dans le rollback : ${statement}`);
		}
		return statement;
	});
	if (statements.every((s) => s.trim() === '' || s.trim().startsWith('--'))) {
		throw new Error(`rollback vide dans ${migrationPath}`);
	}
	return statements.join('\n');
}
