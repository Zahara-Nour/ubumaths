/**
 * Règle commitlint `nom-interdit` : un message de commit ne nomme pas la plateforme
 * d'exercices dont on reprend des idées (demande de David, 2026-11-18 et 2026-11-21).
 *
 * Le nom n'est écrit nulle part dans le dépôt (public) : on garde seulement l'empreinte
 * SHA-256 de chaque forme interdite. Le message est réduit à ses lettres, sans accents ni
 * majuscules ni séparateurs (« Math-ALÉA » compte), puis chaque fenêtre de la longueur
 * d'une forme interdite est comparée à son empreinte.
 */

const { createHash } = require('node:crypto');

// Empreintes SHA-256 des formes interdites, en minuscules sans accents (longueur → empreintes)
const EMPREINTES_INTERDITES = {
	8: ['4a1a713065e66dd08e9124307230cb84f4d440e6146de59a65cc6377b00fb251'],
	9: ['393d1db9b915fa5c94394cc9530399f9da9399f67de6ff707014e6af8a659158']
};

function empreinte(texte) {
	return createHash('sha256').update(texte).digest('hex');
}

function reduireAuxLettres(message) {
	return message
		.normalize('NFD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/[^a-z]/g, '');
}

function contientNomInterdit(message) {
	const lettres = reduireAuxLettres(message);
	for (const [longueurTexte, empreintes] of Object.entries(EMPREINTES_INTERDITES)) {
		const longueur = Number(longueurTexte);
		for (let debut = 0; debut + longueur <= lettres.length; debut++) {
			if (empreintes.includes(empreinte(lettres.slice(debut, debut + longueur)))) return true;
		}
	}
	return false;
}

const regleNomInterdit = (parsed) => {
	const message = parsed.raw ?? '';
	return [
		!contientNomInterdit(message),
		'le message nomme la plateforme dont on reprend des idées : dire « idées reprises d’ailleurs »'
	];
};

module.exports = { contientNomInterdit, regleNomInterdit };
