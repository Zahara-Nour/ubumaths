import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireAdmin } from '$lib/server/middleware/auth';
import {
	annuaireSearchQuerySchema,
	annuaireResponseSchema,
	type AnnuaireSchool
} from '$lib/server/validation/schools';

/**
 * Proxy to the national "Annuaire de l'éducation nationale" open dataset
 * (Opendatasoft v2.1). Lets an admin look up an establishment by name and/or
 * commune (full-text, all fields) and auto-fill its UAI/RNE + contact details.
 *
 * Admin-only via `requireAdmin` (real admin OR an elevated teacher — the route
 * lives under /api/admin so the elevation handle is in scope). The dataset is
 * public (no API key), but we proxy server-side to avoid CORS, validate the
 * response, and normalize the payload.
 */
const ANNUAIRE_URL =
	'https://data.education.gouv.fr/api/explore/v2.1/catalog/datasets/fr-en-annuaire-education/records';

const SELECT_FIELDS = [
	'identifiant_de_l_etablissement',
	'nom_etablissement',
	'type_etablissement',
	'nom_commune',
	'code_postal',
	'adresse_1',
	'libelle_academie'
].join(',');

export const GET: RequestHandler = async ({ url, fetch, locals }) => {
	await requireAdmin(locals);

	const parsed = annuaireSearchQuerySchema.safeParse({
		q: url.searchParams.get('q') ?? '',
		page: url.searchParams.get('page') ?? '1'
	});
	if (!parsed.success) {
		throw error(400, parsed.error.issues[0].message);
	}

	// Sanitize for the ODSQL string literal inside search(...): strip quotes/backslashes.
	const term = parsed.data.q.replace(/["\\]/g, ' ').trim();
	if (term.length < 2) {
		throw error(400, 'Requête trop courte');
	}

	const apiUrl = new URL(ANNUAIRE_URL);
	// Record-level full-text search across ALL fields (accent-/case-insensitive) so
	// the admin can disambiguate a common name by adding the city — e.g. "Blaise
	// Pascal Segré" pinpoints the right one among the 57 "Blaise Pascal" schools.
	apiUrl.searchParams.set('where', `search("${term}")`);
	apiUrl.searchParams.set('select', SELECT_FIELDS);
	// Paginated: PAGE_SIZE per page, offset = (page-1)*PAGE_SIZE. The client pages
	// through with prev/next using the `total` returned below — no arbitrary cap.
	const PAGE_SIZE = 20;
	apiUrl.searchParams.set('limit', String(PAGE_SIZE));
	apiUrl.searchParams.set('offset', String((parsed.data.page - 1) * PAGE_SIZE));

	let res: Response;
	try {
		res = await fetch(apiUrl, { headers: { Accept: 'application/json' } });
	} catch {
		throw error(502, "Annuaire de l'éducation indisponible");
	}
	if (!res.ok) {
		throw error(502, "Annuaire de l'éducation indisponible");
	}

	const validated = annuaireResponseSchema.safeParse(await res.json());
	if (!validated.success) {
		throw error(502, 'Réponse Annuaire inattendue');
	}

	const schools: AnnuaireSchool[] = validated.data.results
		.filter((r) => r.identifiant_de_l_etablissement)
		.map((r) => ({
			uai: r.identifiant_de_l_etablissement as string,
			name: r.nom_etablissement ?? '',
			type: r.type_etablissement ?? '',
			city: r.nom_commune ?? '',
			postalCode: r.code_postal ?? '',
			address: r.adresse_1 ?? '',
			academy: r.libelle_academie ?? ''
		}));

	return json({
		schools,
		total: validated.data.total_count,
		page: parsed.data.page,
		pageSize: PAGE_SIZE
	});
};
