/**
 * Transcriptions ubumark des programmes officiels
 * ===============================================
 * Un fichier `.md` par morceau dans `./transcriptions/` (texte du BO, mot à
 * mot). Un niveau met ses morceaux bout à bout (cf. `OFFICIAL_PROGRAMMES`) ;
 * tant qu'un morceau manque, le niveau n'a pas de transcription.
 *
 * @module server/programmes/transcriptions
 */

import type { GradeCode } from '$lib/types/grades';
import { OFFICIAL_PROGRAMMES } from '$lib/programmes/official-programmes';

// Constantes

/** Les morceaux, par nom de fichier sans `.md` */
const SOURCES: Record<string, string> = Object.fromEntries(
	Object.entries(
		import.meta.glob<string>('./transcriptions/*.md', {
			query: '?raw',
			import: 'default',
			eager: true
		})
	).map(([path, source]) => [path.slice('./transcriptions/'.length, -'.md'.length), source])
);

// Functions

/** La transcription d'un niveau ; `null` si un de ses morceaux n'est pas encore écrit */
export function getTranscription(grade: GradeCode): string | null {
	const programme = OFFICIAL_PROGRAMMES[grade];
	if (!programme) return null;
	const parts = programme.transcription.map((name) => SOURCES[name]);
	if (parts.some((part) => part === undefined)) return null;
	return parts.join('\n\n');
}
