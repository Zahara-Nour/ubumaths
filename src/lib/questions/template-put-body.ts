/**
 * Corps du PUT /api/questions/templates/[id] envoyé par l'éditeur
 * ================================================================
 *
 * La route applique une sémantique PATCH : une clé absente garde la valeur en
 * base. Or l'éditeur met à `undefined` un champ vide (description vide, aucune
 * option, aucun test…) et `JSON.stringify` retire la clé. Sans ce passage, un
 * champ vidé dans le formulaire resterait rempli en base.
 */
import type { QuestionTemplate } from './types';

/** Champs que l'éditeur peut vider : absents → envoyés à `null` */
export const CLEARABLE_TEMPLATE_KEYS = [
	'description',
	'shared',
	'defaultDisplayOptions',
	'exerciseInstruction',
	'options',
	'subdomain',
	'delay',
	'multipleAnswers',
	'testSpecs'
] as const satisfies ReadonlyArray<keyof QuestionTemplate>;

type TemplatePutInput = Partial<
	Omit<QuestionTemplate, 'id' | 'created_at' | 'updated_at' | 'created_by'>
>;

/**
 * Rend le corps à envoyer : chaque champ vidable non renseigné vaut `null`,
 * pour que la route le vide comme avant la sémantique PATCH.
 */
export function toTemplatePutBody(template: TemplatePutInput): Record<string, unknown> {
	const body: Record<string, unknown> = { ...template };
	for (const key of CLEARABLE_TEMPLATE_KEYS) {
		body[key] = template[key] ?? null;
	}
	return body;
}
