/**
 * Noms interdits dans le dépôt : la plateforme dont on reprend des idées d'exercices
 * (demande de David, 2026-11-21 : « aucune trace, dans aucun fichier »).
 *
 * Le dépôt ne contient ni ces noms ni leur empreinte. Ils sont lus :
 * - en local, dans `~/.config/chiphre/noms-interdits` (une racine par ligne, `#` = commentaire),
 *   ou dans le fichier désigné par `NOMS_INTERDITS_FICHIER` ;
 * - en CI, dans la variable `NOMS_INTERDITS` (secret GitHub, racines séparées par des virgules
 *   ou des retours à la ligne).
 * Sans racine, `chargerRacines` lève une erreur : une garde qui se tait serait pire que rien.
 *
 * Comparaison sur une forme simple du texte : séquences `%XX` décodées, accents retirés,
 * minuscules, lettres seules (espaces, tirets, chiffres et ponctuation ne cachent pas un nom).
 * Utilisé par la règle commitlint `nom-interdit` et par `garde-donnees-sensibles.ts`.
 */

/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS, lu aussi par commitlint */
const { readFileSync } = require('node:fs');
const { homedir } = require('node:os');
const { join } = require('node:path');

const FICHIER_PAR_DEFAUT = join(homedir(), '.config', 'chiphre', 'noms-interdits');

function decoderPourcents(texte) {
	return texte.replace(/(?:%[0-9a-f]{2})+/gi, (sequence) => {
		try {
			return decodeURIComponent(sequence);
		} catch {
			return sequence;
		}
	});
}

function normaliser(texte) {
	return decoderPourcents(texte)
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/[^a-z]/g, '');
}

function racinesDuTexte(texte) {
	// Commentaires retirés AVANT de couper aux virgules : une virgule de commentaire n'est pas une racine
	return texte
		.split('\n')
		.map((ligne) => ligne.replace(/#.*/, ''))
		.flatMap((ligne) => ligne.split(','))
		.map(normaliser)
		.filter((racine) => racine.length > 0);
}

/**
 * @param {{ env?: Record<string, string | undefined>, lireFichier?: (chemin: string) => string }} [options]
 * @returns {string[]} racines normalisées
 */
function chargerRacines(options = {}) {
	const env = options.env ?? process.env;
	const lireFichier = options.lireFichier ?? ((chemin) => readFileSync(chemin, 'utf8'));
	if (env.NOMS_INTERDITS) {
		const racines = racinesDuTexte(env.NOMS_INTERDITS);
		if (racines.length > 0) return racines;
	}
	const chemin = env.NOMS_INTERDITS_FICHIER || FICHIER_PAR_DEFAUT;
	let contenu;
	try {
		contenu = lireFichier(chemin);
	} catch {
		throw new Error(
			`noms interdits introuvables : ni variable NOMS_INTERDITS, ni fichier ${chemin}`
		);
	}
	const racines = racinesDuTexte(contenu);
	if (racines.length === 0) throw new Error(`noms interdits : aucune racine dans ${chemin}`);
	return racines;
}

/** Numéro (à partir de 1) de la première racine trouvée dans le texte, 0 sinon. */
function trouverNomInterdit(texte, racines) {
	const forme = normaliser(texte);
	const index = racines.findIndex((racine) => forme.includes(racine));
	return index + 1;
}

// Règle commitlint : le message ne doit contenir aucune racine (sans la recopier : logs).
const regleNomInterdit = (parsed) => {
	let racines;
	try {
		racines = chargerRacines();
	} catch (erreur) {
		return [false, `${erreur.message} (créer le fichier, cf. docs/pratiques/git-workflow.md)`];
	}
	const numero = trouverNomInterdit(parsed.raw ?? '', racines);
	return [
		numero === 0,
		`le message contient un nom interdit (racine n° ${numero}) : dire « idées reprises d’ailleurs »`
	];
};

module.exports = {
	FICHIER_PAR_DEFAUT,
	chargerRacines,
	normaliser,
	regleNomInterdit,
	trouverNomInterdit
};
