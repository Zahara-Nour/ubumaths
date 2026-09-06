/**
 * @fileoverview Interdit d'ignorer l'`error` d'une requête Supabase.
 *
 * Une requête PostgREST qui échoue ne lève pas : elle rend `data === null` et
 * remplit `error`. Écrire
 *
 *     const { data } = await supabase.from('x').select('*');
 *     const lignes = data ?? [];
 *
 * confond donc « aucune ligne » et « la requête a échoué » — l'écran se rend
 * vide, sans trace. C'est ainsi que onze fonctionnalités du projet n'ont rien
 * rendu pendant des mois (cf. `docs/wip/typage-locals-supabase-progress.md`).
 *
 * La règle n'impose PAS un traitement particulier : elle exige seulement que
 * l'`error` soit nommée. Ce qu'on en fait — remonter un 500, journaliser et
 * poursuivre — reste une décision de contexte.
 */

/** Méthodes terminales d'un builder PostgREST / Storage / Auth. */
const TERMINALES = new Set([
	'select',
	'single',
	'maybeSingle',
	'insert',
	'update',
	'upsert',
	'delete',
	'rpc',
	'limit',
	'range',
	'order',
	'eq',
	'neq',
	'in',
	'is',
	'or',
	'filter',
	'match',
	'csv',
	'download',
	'upload',
	'list',
	'remove',
	'createSignedUrl'
]);

/**
 * Racines qui identifient un client Supabase.
 *
 * Deux intentions distinctes, qu'une seule expression mélangeait : le `$` de
 * `db$` n'ancrait que cette alternative, pas les autres. Les trois premiers
 * noms se cherchent n'importe où dans l'identifiant (`mockSupabase`,
 * `event.locals.supabase`) ; `db` ne vaut qu'en fin de nom, pour ne pas
 * attraper un `dbg` ou un `dbUrl`.
 */
const RACINES_CONTENUES = /supabase|serviceClient|adminClient/i;
const RACINE_DB = /(^|[a-zA-Z])[Dd]b$/;

/** L'identifiant désigne-t-il un client Supabase ? */
function estRacineClient(nom) {
	return RACINES_CONTENUES.test(nom) || RACINE_DB.test(nom);
}

/** L'expression `await …` porte-t-elle sur une chaîne de requête Supabase ? */
function estRequeteSupabase(node) {
	let courant = node;
	let vuTerminale = false;

	while (courant) {
		if (courant.type === 'CallExpression') {
			const callee = courant.callee;
			if (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') {
				if (TERMINALES.has(callee.property.name)) vuTerminale = true;
				courant = callee.object;
				continue;
			}
			courant = callee;
			continue;
		}
		if (courant.type === 'MemberExpression') {
			// `locals.supabase`, `event.locals.supabase` : la racine porte le nom
			// sur la propriété, pas sur l'objet.
			if (courant.property.type === 'Identifier' && estRacineClient(courant.property.name)) {
				return vuTerminale;
			}
			courant = courant.object;
			continue;
		}
		if (courant.type === 'Identifier') {
			return vuTerminale && estRacineClient(courant.name);
		}
		if (courant.type === 'ThisExpression') return false;
		return false;
	}
	return false;
}

export default {
	meta: {
		type: 'problem',
		docs: {
			description: "Exige que l'`error` d'une requête Supabase soit capturée",
			category: 'Correctness',
			recommended: true
		},
		messages: {
			errorIgnoree:
				"L'`error` de cette requête Supabase est ignorée : un échec rendra `data === null` et " +
				"l'écran se videra sans trace. Capture-la — `const { data, error } = await …` — puis " +
				'remonte-la ou journalise-la.'
		},
		schema: []
	},

	create(context) {
		return {
			VariableDeclarator(node) {
				// On ne s'intéresse qu'à `const { … } = await …`
				if (!node.init || node.init.type !== 'AwaitExpression') return;
				if (!node.id || node.id.type !== 'ObjectPattern') return;
				if (!estRequeteSupabase(node.init.argument)) return;

				const clefs = node.id.properties
					.filter((p) => p.type === 'Property' && p.key.type === 'Identifier')
					.map((p) => p.key.name);

				// Un `...reste` peut contenir l'erreur : on ne se prononce pas.
				if (node.id.properties.some((p) => p.type === 'RestElement')) return;

				// Rien n'est déstructuré de `data` : l'appelant ne lit pas le résultat.
				if (!clefs.includes('data')) return;
				if (clefs.includes('error')) return;

				context.report({ node: node.id, messageId: 'errorIgnoree' });
			}
		};
	}
};
