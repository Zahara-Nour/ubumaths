/**
 * Activités d'une séance choisies AVANT son enregistrement.
 *
 * Sur une séance neuve il n'y a pas encore d'entrée à référencer, donc la page
 * garde les activités choisies et les envoie sérialisées avec le formulaire de
 * création. Ce module relit ce champ ; l'action `create` insère le résultat.
 *
 * @module server/journal-activities
 */

import { z } from 'zod';

const uuidSchema = z.string().uuid();

/**
 * Une activité en attente, telle que la page la sérialise. Chaque type range sa
 * référence dans sa propre colonne — c'est ce qu'exige le CHECK de forme de
 * `journal_entry_activities`.
 */
const pendingActivitySchema = z.discriminatedUnion('kind', [
	z.object({ kind: z.literal('exercise'), id: uuidSchema }),
	z.object({ kind: z.literal('question'), id: uuidSchema }),
	z.object({ kind: z.literal('assessment'), id: uuidSchema })
]);

/** Nombre d'activités retenues au maximum pour une même séance. */
const MAX_ACTIVITIES = 100;

/**
 * Lit le champ caché `pendingActivities`, en écartant tout ce qui ne tient pas
 * la forme attendue.
 *
 * Une saisie malformée ne doit pas faire perdre la séance : quand cette
 * fonction est appelée, l'entrée est déjà créée. On ignore donc silencieusement
 * plutôt que d'échouer — le prof retrouve sa séance sans ses activités, deux
 * clics à refaire, là où le texte de la séance serait perdu pour de bon.
 *
 * Les doublons sont écartés : la couverture est un ensemble, référencer deux
 * fois la même question n'apporte rien.
 */
/**
 * Une activité prête à être insérée dans `journal_entry_activities`.
 *
 * Chaque nature d'activité renseigne SA colonne de référence et laisse les
 * autres vides. Le type l'exprime en union plutôt qu'en `Record<string,
 * string>` : ce dernier est une signature d'index, et il désactivait la
 * vérification des colonnes à l'insertion.
 */
export type PendingActivityRow =
	| { kind: 'exercise'; exercise_id: string }
	| { kind: 'question'; question_template_id: string }
	| { kind: 'assessment'; assessment_id: string };

export function parsePendingActivities(raw: unknown): PendingActivityRow[] {
	if (typeof raw !== 'string' || raw.trim() === '') return [];

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return [];
	}
	if (!Array.isArray(parsed)) return [];

	const seen = new Set<string>();
	const rows: PendingActivityRow[] = [];
	for (const item of parsed.slice(0, MAX_ACTIVITIES)) {
		const v = pendingActivitySchema.safeParse(item);
		if (!v.success) continue;
		const key = `${v.data.kind}:${v.data.id}`;
		if (seen.has(key)) continue;
		seen.add(key);
		// Clés littérales : une clé calculée produirait une signature d'index, que
		// le type d'écriture de la table refuse.
		if (v.data.kind === 'exercise') rows.push({ kind: 'exercise', exercise_id: v.data.id });
		else if (v.data.kind === 'question')
			rows.push({ kind: 'question', question_template_id: v.data.id });
		else rows.push({ kind: 'assessment', assessment_id: v.data.id });
	}
	return rows;
}
