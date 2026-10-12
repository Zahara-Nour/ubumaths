/**
 * Guides calculatrices : la liste des modèles. Calculée sur le serveur : le contenu non
 * relu sur la machine ne part jamais au navigateur en production (phase 0, point 8).
 */

import { dev } from '$app/environment';
import { listModels } from '$lib/calculatrices/page-data';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = () => ({ models: listModels({ includeUnverified: dev }) });
