/**
 * POST /api/student/age-declaration
 * =================================
 *
 * Réponse unique d'un élève de 2nde à « As-tu 15 ans ou plus ? » (RGPD, article 8).
 *
 * - Oui → age_declaration='15_plus', age_declared_at=now(), consent_required=false.
 * - Non → age_declaration='under_15', age_declared_at=now(), consent_required=true
 *   (« il reste soumis », même un ancien profil resté à false) ; sans consentement ni
 *   délai de grâce en cours, un délai de 30 jours s'ouvre.
 *
 * Accès : élève de 2nde (grade '2') seulement → sinon 403. Une seule réponse → 409.
 *
 * L'écriture passe par le client service : la base refuse à l'élève l'écriture de
 * ces champs (garde guard_profile_consent_fields, 42501). Le profil, le niveau et
 * la réponse existante sont relus en base par requireAuth, jamais pris du client.
 */

import { error, json } from '@sveltejs/kit';
import { z } from 'zod';
import type { RequestHandler } from './$types';
import { requireAuth } from '$lib/server/middleware/auth';
import { createServiceRoleClient } from '$lib/server/serviceRoleClient';
import { AGE_QUESTION_GRADE } from '$lib/utils/age-declaration';
import type { AgeDeclaration } from '$lib/types/database-helpers';

/** Délai de grâce ouvert par un « Non » quand aucun n'est en cours (Q69 : 30 jours). */
const GRACE_PERIOD_MS = 30 * 24 * 60 * 60 * 1000;

const ageDeclarationSchema = z.object({ fifteenOrOlder: z.boolean() }).strict();

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user, profile } = await requireAuth(locals);

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		throw error(400, 'Corps de requête invalide');
	}
	const validation = ageDeclarationSchema.safeParse(body);
	if (!validation.success) {
		throw error(400, validation.error.issues[0]?.message ?? 'Corps de requête invalide');
	}

	if (profile.role !== 'student' || profile.grade !== AGE_QUESTION_GRADE) {
		throw error(403, 'Cette question ne concerne que les élèves de 2nde');
	}

	if (profile.age_declaration !== null) {
		throw error(409, 'Tu as déjà répondu à cette question');
	}

	const declaration: AgeDeclaration = validation.data.fifteenOrOlder ? '15_plus' : 'under_15';
	const payload: {
		age_declaration: AgeDeclaration;
		age_declared_at: string;
		consent_required: boolean;
		consent_grace_period_ends?: string;
	} = {
		age_declaration: declaration,
		age_declared_at: new Date().toISOString(),
		consent_required: declaration === 'under_15'
	};
	if (
		declaration === 'under_15' &&
		!profile.consent_granted_at &&
		!profile.consent_grace_period_ends
	) {
		payload.consent_grace_period_ends = new Date(Date.now() + GRACE_PERIOD_MS).toISOString();
	}

	const service = createServiceRoleClient();
	// `.is('age_declaration', null)` : deux réponses simultanées ne s'écrasent pas.
	const { data, error: updateError } = await service
		.from('profiles')
		.update(payload)
		.eq('id', user.id)
		.is('age_declaration', null)
		.select('id');

	if (updateError) {
		console.error('[age-declaration] Écriture impossible :', updateError);
		throw error(500, "Impossible d'enregistrer la réponse");
	}

	// Client service : pas de RLS. 0 ligne = la réponse a été donnée entre-temps.
	if (!data || data.length !== 1) {
		throw error(409, 'Tu as déjà répondu à cette question');
	}

	return json({ success: true, ageDeclaration: declaration });
};
