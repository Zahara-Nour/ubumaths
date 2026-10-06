/**
 * Résultat affichable d'un chiffre : le texte et ses étapes, ou le message
 * d'une erreur de saisie. Une erreur qui n'est pas une `CipherInputError` est
 * un bug : elle remonte.
 *
 * @module lib/ciphers/outcome
 */
import type { CipherResult } from './alphabet';
import { CipherInputError } from './errors';

export type CipherOutcome = ({ ok: true } & CipherResult) | { ok: false; message: string };

export function attempt(run: () => CipherResult): CipherOutcome {
	try {
		return { ok: true, ...run() };
	} catch (e) {
		if (e instanceof CipherInputError) return { ok: false, message: e.message };
		throw e;
	}
}
