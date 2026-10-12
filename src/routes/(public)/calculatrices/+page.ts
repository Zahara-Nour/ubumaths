/**
 * Guides calculatrices : la liste des modèles. Un modèle sans séquence relue sur la
 * machine est « bientôt » en production (phase 0, points 1 et 8).
 */

import { dev } from '$app/environment';
import { isModelAvailable } from '$lib/calculatrices/guide';
import { MODELS } from '$lib/calculatrices/models';
import type { PageLoad } from './$types';

export const load: PageLoad = () => ({
	models: MODELS.map((model) => ({
		slug: model.slug,
		name: model.name,
		family: model.family,
		available: isModelAvailable(model, { includeUnverified: dev })
	}))
});
