import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { requireRole } from '$lib/server/middleware/auth';
import {
	annuaireSearchQuerySchema,
	annuaireResponseSchema,
	type AnnuaireSchool
} from '$lib/server/validation/schools';

/**
 * Proxy to the national "Annuaire de l'éducation nationale" open dataset
 * (Opendatasoft v2.1). Lets an admin look up an establishment by name and
 * auto-fill its UAI/RNE and contact details from the official source.
 *
 * Admin-only. The dataset is public (no API key), but we proxy server-side to
 * avoid CORS, validate the response, and normalize the payload.
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
	await requireRole(locals, 'admin');

	const parsed = annuaireSearchQuerySchema.safeParse({ q: url.searchParams.get('q') ?? '' });
	if (!parsed.success) {
		throw error(400, parsed.error.issues[0].message);
	}

	// Sanitize for the ODSQL string literal inside search(...): strip quotes/backslashes.
	const term = parsed.data.q.replace(/["\\]/g, ' ').trim();
	if (term.length < 2) {
		throw error(400, 'Requête trop courte');
	}

	const apiUrl = new URL(ANNUAIRE_URL);
	apiUrl.searchParams.set('where', `search(nom_etablissement,"${term}")`);
	apiUrl.searchParams.set('select', SELECT_FIELDS);
	apiUrl.searchParams.set('limit', '10');

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

	return json({ schools });
};
