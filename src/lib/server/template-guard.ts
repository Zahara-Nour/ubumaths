/**
 * Garde des routes du contenu d'un modèle (ADR 0029)
 * ==================================================
 *
 * Un modèle n'appartient qu'à son auteur (pas de partage entre professeurs). La
 * policy « Teachers can manage content of their templates » est la garde réelle ;
 * celle-ci rend des réponses lisibles (400 / 404 / 403) avant toute écriture, et
 * vaut pour les routes d'API comme pour les actions de la page du modèle.
 *
 * @module server/template-guard
 */

import { error } from '@sveltejs/kit';
import { uuidSchema } from './validation/common';
import { createServerLogger } from '$lib/utils/logger';

const logger = createServerLogger('server/template-guard');

/**
 * Valide l'identifiant de modèle reçu et vérifie qu'il appartient à
 * l'utilisateur. Lève `error()` sinon ; rend l'identifiant validé.
 */
export async function requireOwnedTemplate(
	rawTemplateId: string | undefined,
	userId: string,
	supabase: App.Locals['supabase']
): Promise<string> {
	const validation = uuidSchema.safeParse(rawTemplateId);
	if (!validation.success) {
		throw error(400, 'Identifiant de modèle invalide');
	}
	const templateId = validation.data;

	const { data: template, error: readError } = await supabase
		.from('chapter_templates')
		.select('id, created_by')
		.eq('id', templateId)
		.maybeSingle();

	// Une panne de lecture ne se déguise pas en « introuvable ».
	if (readError) {
		logger.error('[requireOwnedTemplate] Modèle illisible :', readError);
		throw error(500, 'Vérification impossible');
	}
	if (!template) {
		throw error(404, 'Modèle introuvable');
	}
	if (template.created_by !== userId) {
		throw error(403, 'Accès refusé');
	}

	return templateId;
}
