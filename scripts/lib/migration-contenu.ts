/**
 * Migration de CONTENU de modèles de questions déjà PUBLIÉS — logique pure
 * ========================================================================
 *
 * `create-questions --mettre-a-jour` ne touche jamais un modèle publié (garde voulue) : une
 * variation ajoutée ou corrigée sur un publié passe par une migration. Ce module la fabrique à
 * partir du fichier du lot et du contenu relevé en prod ; le script
 * `scripts/questions/migration-contenu.ts` lit les deux et écrit la migration et sa fixture.
 * Phase 0 validée par David le 2026-11-20 (journal docs/wip/ensembles-2de-progress.md).
 *
 * Règles :
 *  - champs écrits : `variations`, `test_specs`, `description`, et `options` quand le fichier les
 *    change (réglages de jugement : ⚠️ ils valent pour TOUTES les variations, anciennes comprises ;
 *    le script rejoue `checkTemplate`, donc les specs d'origine, sur le modèle tel qu'il sera) ;
 *    jamais titre, nœud, points, tags, niveaux, statut. Un autre champ du fichier différent de la
 *    prod → refus. `options` n'était pas écrit avant le 2026-11-23 : aucune raison écrite à cette
 *    exclusion (journal docs/wip/idees-6e-entiers-decimaux-progress.md), levée par David ;
 *  - variation ajoutée à la fin → acceptée ; variation existante corrigée → acceptée, signalée en
 *    en-tête ; variation retirée ou déplacée → refusée (les réponses des élèves gardent l'indice
 *    de leur variation) ;
 *  - garde : le modèle doit porter EXACTEMENT le contenu relevé, sinon la migration échoue (jamais
 *    un passage muet) ; modèle absent → sauté, nommé par un `raise notice` (sortie de
 *    `db:migrate`). Pas de garde « tous ou aucun » : la base locale n'a qu'une partie des publiés
 *    (le 2026-11-26, 26 sur 28 pour `20261126095610`), elle ferait échouer `db:a-jour`. En prod,
 *    les identifiants viennent du relevé : un absent est un modèle supprimé depuis, le notice le
 *    montre (accentuation évitée, comme les `raise exception`) ;
 *  - un seul bloc `do` pour tous les modèles : tout ou rien ;
 *  - rollback en commentaire (`ROLLBACK:BEGIN` / `ROLLBACK:END`), gardé de même.
 * Limite : la comparaison se fait indice par indice, à l'identique. Une variation REMPLACÉE par une
 * autre, ou déplacée ET retouchée, passe pour « corrigée » : d'où le ⚠️ de l'en-tête et de la
 * sortie du script, qui demandent de relire le diff de ces variations.
 * Tests : scripts/__tests__/migration-contenu.test.ts (logique),
 * tests/integration/migrations-contenu-publie.test.ts (SQL rejoué sur Postgres).
 */

import type { ModeleFichier } from './lot-questions';

// ============================================================================
// TYPES
// ============================================================================

/** Ce qu'il faut d'une ligne `question_templates` de la prod */
export interface LigneProd {
	id: string;
	title: string;
	level: number;
	status: string;
	grades: unknown;
	delay: number | null;
	options: unknown;
	shared: unknown;
	default_display_options: unknown;
	exercise_instruction: string | null;
	description: string | null;
	variations: unknown;
	test_specs: unknown;
}

/** Les champs qu'écrit la migration, tels qu'en base (`null` = SQL NULL) */
export interface Contenu {
	variations: unknown[];
	testSpecs: unknown;
	description: string | null;
	/** Présent seulement quand le fichier change les options : sinon la migration n'y touche pas
	 *  (ni écriture ni garde), comme les migrations générées avant le 2026-11-23 */
	options?: unknown;
}

export interface Changements {
	/** Numéros (à partir de 1) des variations ajoutées à la fin */
	ajoutees: number[];
	/** Numéros (à partir de 1) des variations existantes modifiées */
	corrigees: number[];
	specs: boolean;
	description: boolean;
	options: boolean;
}

export interface ModeleMigre {
	id: string;
	title: string;
	fichier: string;
	avant: Contenu;
	apres: Contenu;
	changements: Changements;
}

export type Examen =
	| { sorte: 'ignore'; raison: string }
	| { sorte: 'inchange' }
	| { sorte: 'refuse'; erreur: string }
	| { sorte: 'migre'; modele: ModeleMigre };

export type AnalyseVariations =
	{ ok: true; ajoutees: number[]; corrigees: number[] } | { ok: false; erreur: string };

/** La fixture d'une migration générée, lue par le test d'intégration */
export interface FixtureContenu {
	migration: string;
	modeles: ModeleMigre[];
}

export interface EnteteMigration {
	/** Nom du lot (dossier) */
	lot: string;
	/** Dossier source des fichiers */
	source: string;
	/** Date du relevé en prod (AAAA-MM-JJ) */
	date: string;
}

// ============================================================================
// CONSTANTES
// ============================================================================

/** Champs du fichier que la migration ne touche pas : ils doivent égaler la prod */
const CHAMPS_FIGES: readonly [cle: string, colonne: keyof LigneProd][] = [
	['grades', 'grades'],
	['level', 'level'],
	['delay', 'delay'],
	['shared', 'shared'],
	['defaultDisplayOptions', 'default_display_options'],
	['exerciseInstruction', 'exercise_instruction']
];

// ============================================================================
// FONCTIONS
// ============================================================================

/** JSON aux clés triées : jsonb ne garde pas l'ordre des clés ; null et absent se confondent */
function canonique(valeur: unknown): string {
	if (valeur === undefined || valeur === null) return 'null';
	return JSON.stringify(valeur, (_cle, v: unknown) =>
		v && typeof v === 'object' && !Array.isArray(v)
			? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
			: v
	);
}

function egaux(a: unknown, b: unknown): boolean {
	return canonique(a) === canonique(b);
}

/**
 * Compare les variations de la prod (`avant`) à celles du fichier (`apres`), indice par indice.
 * Une variation de la prod qui manque, ou qui se retrouve à un autre indice, refuse tout.
 */
export function analyserVariations(avant: unknown[], apres: unknown[]): AnalyseVariations {
	if (apres.length < avant.length) {
		return {
			ok: false,
			erreur: `${avant.length - apres.length} variation(s) retirée(s) (${avant.length} en prod, ${apres.length} dans le fichier) : les réponses des élèves gardent l'indice de leur variation`
		};
	}
	const corrigees: number[] = [];
	for (const [i, ancienne] of avant.entries()) {
		if (egaux(ancienne, apres[i])) continue;
		const ailleurs = apres.findIndex((v, j) => j !== i && egaux(v, ancienne));
		const venue = avant.findIndex((v, j) => j !== i && egaux(v, apres[i]));
		if (venue >= 0 && egaux(apres[venue], avant[venue])) {
			return {
				ok: false,
				erreur: `variation ${i + 1} remplacée par une copie de la variation ${venue + 1} : les réponses des élèves gardent l'indice de leur variation`
			};
		}
		if (ailleurs >= 0 || venue >= 0) {
			const [de, vers] = ailleurs >= 0 ? [i, ailleurs] : [venue, i];
			return {
				ok: false,
				erreur: `variation ${de + 1} déplacée en ${vers + 1} : les réponses des élèves gardent l'indice de leur variation`
			};
		}
		corrigees.push(i + 1);
	}
	const ajoutees = apres.slice(avant.length).map((_v, k) => avant.length + k + 1);
	return { ok: true, ajoutees, corrigees };
}

/** Le sort d'un fichier du lot face à SA ligne de la prod (appariée par id, titre, niveau) */
export function examinerModele(fichier: string, modele: ModeleFichier, ligne: LigneProd): Examen {
	if (ligne.status === 'draft') {
		return { sorte: 'ignore', raison: 'brouillon (create-questions --mettre-a-jour)' };
	}
	if (ligne.status !== 'published') {
		return { sorte: 'refuse', erreur: `${fichier} : statut « ${ligne.status} » en prod` };
	}
	const brut = modele as unknown as Record<string, unknown>;
	const figes = CHAMPS_FIGES.filter(([cle, colonne]) => !egaux(brut[cle], ligne[colonne])).map(
		([cle, colonne]) =>
			`${cle} ${canonique(ligne[colonne])} en prod, ${canonique(brut[cle])} dans le fichier`
	);
	if (figes.length > 0) {
		return {
			sorte: 'refuse',
			erreur: `${fichier} : champ(s) que la migration ne touche pas — ${figes.join(' ; ')}`
		};
	}
	// Clé absente du fichier = « garder » (sémantique de l'éditeur), jamais « effacer » : refus
	const effaces = [
		['testSpecs', ligne.test_specs],
		['description', ligne.description],
		['options', ligne.options]
	]
		.filter(
			([cle, prod]) => brut[cle as string] === undefined && prod !== null && prod !== undefined
		)
		.map(([cle]) => cle as string);
	if (effaces.length > 0) {
		return {
			sorte: 'refuse',
			erreur: `${fichier} : ${effaces.join(', ')} absent(s) du fichier mais présent(s) en prod — la migration les effacerait (repartir de export-question-templates.ts)`
		};
	}
	if (!Array.isArray(ligne.variations)) {
		return { sorte: 'refuse', erreur: `${fichier} : variations de la prod illisibles` };
	}
	const avant: Contenu = {
		variations: ligne.variations as unknown[],
		testSpecs: ligne.test_specs ?? null,
		description: ligne.description ?? null
	};
	const apres: Contenu = {
		variations: modele.variations as unknown[],
		testSpecs: modele.testSpecs ?? null,
		description: modele.description ?? null
	};
	if (!egaux(brut.options, ligne.options)) {
		avant.options = ligne.options ?? null;
		apres.options = brut.options ?? null;
	}
	const analyse = analyserVariations(avant.variations, apres.variations);
	if (!analyse.ok) return { sorte: 'refuse', erreur: `${fichier} : ${analyse.erreur}` };
	const changements: Changements = {
		ajoutees: analyse.ajoutees,
		corrigees: analyse.corrigees,
		specs: !egaux(avant.testSpecs, apres.testSpecs),
		description: avant.description !== apres.description,
		options: 'options' in apres
	};
	const rien =
		changements.ajoutees.length === 0 &&
		changements.corrigees.length === 0 &&
		!changements.specs &&
		!changements.description &&
		!changements.options;
	if (rien) return { sorte: 'inchange' };
	return {
		sorte: 'migre',
		modele: { id: ligne.id, title: ligne.title, fichier, avant, apres, changements }
	};
}

/** `<horodatage>_questions_<lot>_contenu` (sans extension) */
export function nomMigration(horodatage: string, dossier: string): string {
	const lot = dossier.replace(/\/+$/, '').split('/').at(-1) ?? 'lot';
	return `${horodatage}_questions_${lot.replace(/[^a-z0-9]+/gi, '_').toLowerCase()}_contenu`;
}

/** Suffixe tel qu'aucune balise de dollar n'apparaisse dans le contenu, les titres ou les fichiers */
function suffixeLibre(textes: readonly string[]): string {
	for (let n = 0; ; n++) {
		const s = n === 0 ? '' : String(n);
		const balises = [`$q${s}$`, `$contenu${s}$`, `$retour${s}$`];
		if (!textes.some((t) => balises.some((b) => t.includes(b)))) return s;
	}
}

/** Littéraux SQL d'un contenu (jsonb ; la description passe par une chaîne JSON : une seule ligne) */
function jsonb(valeur: unknown, q: string): string {
	return valeur === null || valeur === undefined
		? 'null::jsonb'
		: `${q}${JSON.stringify(valeur)}${q}::jsonb`;
}

function litteraux(
	c: Contenu,
	q: string
): { variations: string; specs: string; description: string; options: string | null } {
	return {
		variations: `${q}${JSON.stringify(c.variations)}${q}::jsonb`,
		specs: jsonb(c.testSpecs, q),
		description:
			c.description === null
				? 'null::text'
				: `(${q}${JSON.stringify(c.description)}${q}::jsonb #>> '{}')`,
		// null : options non touchées par ce modèle (ni garde ni écriture)
		options: 'options' in c ? jsonb(c.options, q) : null
	};
}

function condition(alias: string, l: ReturnType<typeof litteraux>): string {
	const options =
		l.options === null ? '' : `\n\t\t   and ${alias}options is not distinct from ${l.options}`;
	return `${alias}variations = ${l.variations}
		   and ${alias}test_specs is not distinct from ${l.specs}
		   and ${alias}description is not distinct from ${l.description}${options}`;
}

/** Le bloc `do` qui fait passer chaque modèle de `depuis` à `vers` */
function bloc(
	modeles: readonly ModeleMigre[],
	depuis: (m: ModeleMigre) => Contenu,
	vers: (m: ModeleMigre) => Contenu,
	balise: string,
	q: string
): string {
	const corps = modeles.map((m) => {
		const id8 = m.id.slice(0, 8);
		const a = litteraux(depuis(m), q);
		const b = litteraux(vers(m), q);
		return `	-- ${id8} « ${m.title.replace(/[\r\n]+/g, ' ')} »
	select true, ${condition('q.', a)}
	  into v_present, v_conforme
	  from public.question_templates q where q.id = '${m.id}' for update;
	if v_present is not null then
		if not v_conforme then
			raise exception '${id8} : contenu différent de celui attendu, rien n''est modifié';
		end if;
		update public.question_templates
		   set variations = ${b.variations},
		       test_specs = ${b.specs},
		       description = ${b.description}${b.options === null ? '' : `,\n\t\t       options = ${b.options}`}
		 where id = '${m.id}';
		if not exists (select 1 from public.question_templates
		                where id = '${m.id}'
		                  and ${condition('', b)}) then
			raise exception '${id8} : contenu final inattendu';
		end if;
	else
		raise notice '${id8} absent, saute';
	end if;`;
	});
	return `set local lock_timeout = '5s';
do ${balise}
declare v_present boolean; v_conforme boolean;
begin
${corps.join('\n')}
end ${balise};`;
}

function ligneDeModele(m: ModeleMigre): string {
	const c = m.changements;
	const parties = [
		c.ajoutees.length > 0 ? `variation(s) ajoutée(s) : ${c.ajoutees.join(', ')}` : '',
		c.corrigees.length > 0 ? `⚠️ variation(s) corrigée(s) : ${c.corrigees.join(', ')}` : '',
		c.specs ? 'specs modifiées' : '',
		c.description ? 'description modifiée' : '',
		c.options ? '⚠️ options modifiées (elles jugent toutes les variations)' : ''
	].filter(Boolean);
	return `--   ${m.id.slice(0, 8)} « ${m.title.replace(/[\r\n]+/g, ' ')} » (${m.fichier.replace(/[\r\n]+/g, ' ')}) : ${parties.join(' ; ')}`;
}

/** Le texte complet de la migration : en-tête, rollback commenté, bloc unique */
export function genererMigration(entete: EnteteMigration, modeles: readonly ModeleMigre[]): string {
	if (modeles.length === 0) throw new Error('aucun modèle à migrer : pas de migration vide');
	const s = suffixeLibre(
		modeles.flatMap((m) =>
			[m.avant, m.apres].flatMap((c) => [
				m.title,
				m.fichier,
				JSON.stringify(c.variations),
				JSON.stringify(c.testSpecs),
				JSON.stringify(c.description),
				JSON.stringify(c.options ?? null)
			])
		)
	);
	const q = `$q${s}$`;
	const retour = bloc(
		modeles,
		(m) => m.apres,
		(m) => m.avant,
		`$retour${s}$`,
		q
	)
		.split('\n')
		.map((l) => (l === '' ? '--' : `-- ${l}`))
		.join('\n');
	const aller = bloc(
		modeles,
		(m) => m.avant,
		(m) => m.apres,
		`$contenu${s}$`,
		q
	);
	return `-- ============================================================================
-- Lot ${entete.lot} : contenu de ${modeles.length} modèle(s) PUBLIÉ(S)
-- ============================================================================
${modeles.map(ligneDeModele).join('\n')}
--   Champs écrits : variations, specs, description, et options là où l'en-tête le dit. Titre,
--   nœud, points, tags, niveaux, statut : inchangés. Aucune variation retirée ni déplacée (indices des réponses d'élèves).
-- ============================================================================
-- Fichier GÉNÉRÉ par scripts/questions/migration-contenu.ts — ne pas éditer à la main.
-- Source : ${entete.source}. Contenu relevé en prod le ${entete.date}.
--
-- Garde : chaque modèle doit porter EXACTEMENT le contenu relevé, sinon la migration échoue et
-- rien n'est modifié (un seul bloc : tout ou rien). Modèle absent (base locale) : sauté, nommé
-- par un notice « <id> absent, saute » ; en prod, il ne devrait jamais paraître.
-- Prouvée par tests/integration/migrations-contenu-publie.test.ts, qui rejoue CE fichier sur des
-- copies portant les vrais identifiants et le contenu de la prod (fixture contenu-publie/).
--
-- Accès : aucune règle (policy) ne change ; personne ne gagne ni ne perd d'accès.
--
-- Rollback : rend le contenu d'avant. Garde : il refuse si un modèle n'a plus EXACTEMENT le
-- contenu posé par la migration. Bloc éprouvé par le test d'intégration, à jouer dans UNE
-- transaction (\`psql -1 -v ON_ERROR_STOP=1 -f\`, ou l'éditeur SQL en un seul envoi) :
-- ROLLBACK:BEGIN
${retour}
-- ROLLBACK:END
-- ============================================================================

${aller}
`;
}
