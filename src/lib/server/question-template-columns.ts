/**
 * Colonnes d'un modèle de questions lues hors de l'éditeur : toutes, sauf les
 * cas de test (`test_specs`, ~31 % du poids ; seul l'éditeur s'en sert). Lues
 * par la liste du catalogue (`/api/questions/templates/all`) et par l'éditeur
 * d'une série (choix des variations, chantier `idees-format`).
 */

import type { Database } from '#lib/types/database.ts';

type TemplateColumn = keyof Database['public']['Tables']['question_templates']['Row'];

/** Colonnes du modèle que la liste envoie : toutes, sauf les cas de test */
export const TEMPLATE_COLUMN_LIST = [
	'id',
	'title',
	'description',
	'type',
	'status',
	'grades',
	'level',
	'classification_node_id',
	'shared',
	'variations',
	'options',
	'precision',
	'delay',
	'default_display_options',
	'exercise_instruction',
	'created_at',
	'updated_at',
	'created_by'
] as const satisfies readonly TemplateColumn[];

/**
 * Garde de compilation : une colonne ajoutée à `question_templates` doit être
 * rangée ici, dans la liste ou parmi les exclues — sinon `pnpm check` échoue.
 */
type ForgottenColumn = Exclude<
	TemplateColumn,
	(typeof TEMPLATE_COLUMN_LIST)[number] | 'test_specs'
>;
const NO_FORGOTTEN_COLUMN: [ForgottenColumn] extends [never] ? true : ForgottenColumn = true;
void NO_FORGOTTEN_COLUMN;

export const TEMPLATE_COLUMNS = TEMPLATE_COLUMN_LIST.join(', ');
