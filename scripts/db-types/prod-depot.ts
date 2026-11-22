/**
 * Contrôle « prod = dépôt » : les règles (pures, testées dans scripts/__tests__/db-types-prod.test.ts)
 * ==================================================================================================
 *
 * `database.ts` est généré depuis les migrations du dépôt. La prod, elle, n'est décrite par rien :
 * une table retouchée au Dashboard, une migration modifiée après avoir été jouée, et le site tourne
 * sur une base que le dépôt ne connaît pas. Ce contrôle lit les types de la prod (lecture seule) et
 * les compare à ceux du dépôt.
 *
 * Le générateur de la prod n'écrit pas comme celui de la CLI locale (retours à la ligne, forme des
 * arguments vides, colonnes calculées…) : on ne compare donc pas deux textes, mais deux LISTES
 * « chemin → type » lues dans l'arbre syntaxique, une fois les différences de forme connues effacées.
 */

import ts from 'typescript';

// ============================================================================
// Types
// ============================================================================

/** `Tables.classes.Row.id` → `string` ; une clé facultative porte un `?` en tête du type. */
export type Schema = Map<string, string>;

export type Lecture = { ok: true; schema: Schema } | { ok: false; raison: string };

export type Comparaison = {
	/** Ce que la prod a et que le dépôt n'a pas. */
	enTropEnProd: string[];
	/** Ce que le dépôt a et que la prod n'a pas. */
	absentDeProd: string[];
	/** Même chemin, type différent. */
	differents: { chemin: string; depot: string; prod: string }[];
};

// ============================================================================
// Constantes
// ============================================================================

/** Les rubriques du schéma `public` que les deux générateurs écrivent. */
const RUBRIQUES = ['Tables', 'Views', 'Functions', 'Enums', 'CompositeTypes'];
/** Nombre de lignes montrées par famille d'écarts : assez pour voir quoi. */
const ECARTS_MONTRES = 15;

// ============================================================================
// Fonctions
// ============================================================================

/**
 * Les différences de FORME entre les deux générateurs, ramenées à l'écriture de la prod :
 * - jsonb obligatoire : `NonNullable<Json>` (local) = `Json` (prod) ;
 * - fonction sans argument : `Record<PropertyKey, never>` (local) = `never` (prod).
 */
function formeCommune(type: string): string {
	return type.replace(/NonNullable<Json>/g, 'Json').replace(/Record<PropertyKey, never>/g, 'never');
}

class FormeInconnue extends Error {}

function nomDe(membre: ts.TypeElement, source: ts.SourceFile): string | null {
	if (!ts.isPropertySignature(membre)) return null;
	const nom = membre.name;
	if (ts.isIdentifier(nom) || ts.isStringLiteral(nom)) return nom.text;
	return nom.getText(source);
}

/**
 * Un type réécrit par nous, pour ne dépendre ni des guillemets, ni des séparateurs, ni des retours
 * à la ligne de chaque générateur. Les membres d'une union sont triés : l'ordre des surcharges
 * d'une fonction n'est pas stable.
 */
function texteDe(type: ts.TypeNode, source: ts.SourceFile): string {
	if (ts.isParenthesizedTypeNode(type)) return texteDe(type.type, source);
	if (ts.isUnionTypeNode(type)) {
		return type.types
			.map((t) => texteDe(t, source))
			.sort()
			.join(' | ');
	}
	if (ts.isTypeLiteralNode(type)) {
		const membres = type.members.map((m) => {
			if (!ts.isPropertySignature(m) || !m.type) return m.getText(source).replace(/\s+/g, ' ');
			return `${nomDe(m, source)}${m.questionToken ? '?' : ''}: ${texteDe(m.type, source)}`;
		});
		return membres.length === 0 ? '{}' : `{ ${membres.join('; ')} }`;
	}
	if (ts.isTupleTypeNode(type)) {
		return `[${type.elements.map((e) => texteDe(e, source)).join(', ')}]`;
	}
	if (ts.isArrayTypeNode(type)) {
		const element = texteDe(type.elementType, source);
		return element.includes(' | ') ? `(${element})[]` : `${element}[]`;
	}
	if (ts.isTypeReferenceNode(type) && type.typeArguments) {
		const arguments_ = type.typeArguments.map((a) => texteDe(a, source)).join(', ');
		return formeCommune(`${type.typeName.getText(source)}<${arguments_}>`);
	}
	if (ts.isLiteralTypeNode(type) && ts.isStringLiteral(type.literal)) {
		return JSON.stringify(type.literal.text);
	}
	// Le reste (`string`, `Json`, `Database['public']['Enums']['x']`…) : texte tel quel, guillemets unifiés.
	return formeCommune(
		type
			.getText(source)
			.replace(/\s+/g, ' ')
			.replace(/'/g, '"')
			.replace(/;\s*\}/g, ' }')
			.trim()
	);
}

function descendre(
	type: ts.TypeNode,
	chemin: string,
	source: ts.SourceFile,
	schema: Schema,
	facultatif: boolean
): void {
	if (ts.isTypeLiteralNode(type) && type.members.length > 0) {
		// Un objet facultatif (`Insert?: {…}`) : aucun générateur n'en écrit, mais le `?` ne se perd pas.
		if (facultatif) schema.set(`${chemin}?`, 'facultatif');
		for (const membre of type.members) {
			const nom = nomDe(membre, source);
			if (nom === null || !ts.isPropertySignature(membre) || !membre.type) {
				// Signature d'index, méthode… : forme inconnue. Refuser de lire plutôt que l'ignorer.
				throw new FormeInconnue(
					`membre non reconnu sous ${chemin} : ${membre.getText(source).slice(0, 80)}`
				);
			}
			descendre(membre.type, `${chemin}.${nom}`, source, schema, Boolean(membre.questionToken));
		}
		return;
	}
	// L'ordre des clés étrangères d'une table ne dit rien : il ne doit pas faire un écart.
	if (ts.isTupleTypeNode(type) && chemin.endsWith('.Relationships')) {
		const cles = type.elements.map((e) => texteDe(e, source)).sort();
		schema.set(chemin, `[${cles.join(', ')}]`);
		return;
	}
	schema.set(chemin, (facultatif ? '?' : '') + texteDe(type, source));
}

/**
 * La liste « chemin → type » du schéma `public` d'un fichier de types Supabase. Refuse un fichier
 * où l'on ne reconnaît pas la forme attendue : mieux vaut dire « illisible » que « aucun écart ».
 */
export function lireLeSchema(texte: string): Lecture {
	const source = ts.createSourceFile('database.ts', texte, ts.ScriptTarget.Latest, true);
	const database = source.statements.find(
		(s): s is ts.TypeAliasDeclaration => ts.isTypeAliasDeclaration(s) && s.name.text === 'Database'
	);
	if (!database || !ts.isTypeLiteralNode(database.type)) {
		return { ok: false, raison: 'pas de `export type Database = { … }`' };
	}
	const publicNoeud = database.type.members.find((m) => nomDe(m, source) === 'public');
	if (
		!publicNoeud ||
		!ts.isPropertySignature(publicNoeud) ||
		!publicNoeud.type ||
		!ts.isTypeLiteralNode(publicNoeud.type)
	) {
		return { ok: false, raison: 'pas de schéma `public` dans `Database`' };
	}
	const schema: Schema = new Map();
	try {
		for (const membre of publicNoeud.type.members) {
			const nom = nomDe(membre, source);
			if (nom === null || !ts.isPropertySignature(membre) || !membre.type) {
				throw new FormeInconnue(`membre non reconnu dans \`public\``);
			}
			if (!RUBRIQUES.includes(nom)) throw new FormeInconnue(`rubrique inconnue : ${nom}`);
			descendre(membre.type, nom, source, schema, false);
		}
	} catch (e) {
		if (e instanceof FormeInconnue) return { ok: false, raison: e.message };
		throw e;
	}
	const colonnes = [...schema.keys()].filter((c) => /^Tables\.[^.]+\.Row\./.test(c)).length;
	if (colonnes === 0)
		return { ok: false, raison: 'aucune colonne de table lue (`Tables.*.Row.*`)' };
	if (![...schema.keys()].some((c) => c.startsWith('Functions.'))) {
		return { ok: false, raison: 'aucune fonction lue (`Functions.*`)' };
	}
	return { ok: true, schema };
}

/**
 * Le chemin est-il propre au générateur local ? `ComputedFields` (colonnes calculées par fonction)
 * n'existe pas dans la sortie de la prod.
 */
function propreAuLocal(chemin: string): boolean {
	return /^(Tables|Views)\.[^.]+\.ComputedFields(\.|$)/.test(chemin);
}

/**
 * Colonne calculée (`GENERATED`) : le local l'interdit à l'écriture (`?never`), la prod l'écrit
 * facultative, avec le type qu'elle a en lecture. Même colonne, deux écritures. La prod n'écrit
 * rien d'autre : une colonne calculée au dépôt et ordinaire en prod (avec une valeur par défaut)
 * ne se distingue pas par les types — limite connue, écrite dans la doc.
 */
function colonneCalculee(chemin: string, depot: string, enProd: string, prod: Schema): boolean {
	const lu = /^((?:Tables|Views)\.[^.]+)\.(?:Insert|Update)\.(.+)$/.exec(chemin);
	if (depot !== '?never' || !lu) return false;
	return enProd === `?${prod.get(`${lu[1]}.Row.${lu[2]}`)}`;
}

export function comparer(depot: Schema, prod: Schema): Comparaison {
	const resultat: Comparaison = { enTropEnProd: [], absentDeProd: [], differents: [] };
	for (const [chemin, type] of depot) {
		if (propreAuLocal(chemin)) continue;
		const enProd = prod.get(chemin);
		if (enProd === undefined) resultat.absentDeProd.push(chemin);
		else if (enProd !== type && !colonneCalculee(chemin, type, enProd, prod)) {
			resultat.differents.push({ chemin, depot: type, prod: enProd });
		}
	}
	for (const chemin of prod.keys()) {
		if (!depot.has(chemin)) resultat.enTropEnProd.push(chemin);
	}
	return resultat;
}

export function identiques(c: Comparaison): boolean {
	return c.enTropEnProd.length + c.absentDeProd.length + c.differents.length === 0;
}

/** Les écarts, lisibles dans un terminal : par famille, les premiers seulement. */
export function decrire(c: Comparaison): string[] {
	const lignes: string[] = [];
	const famille = (titre: string, elements: string[]): void => {
		if (elements.length === 0) return;
		lignes.push(`${titre} (${elements.length}) :`);
		lignes.push(...elements.slice(0, ECARTS_MONTRES).map((e) => `   ${e}`));
		if (elements.length > ECARTS_MONTRES) lignes.push('   … (d’autres suivent)');
	};
	famille('En prod, pas dans le dépôt', c.enTropEnProd);
	famille('Dans le dépôt, pas en prod', c.absentDeProd);
	famille(
		'Type différent',
		c.differents.map((d) => `${d.chemin} — dépôt : ${d.depot} · prod : ${d.prod}`)
	);
	return lignes;
}
