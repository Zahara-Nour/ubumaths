/**
 * Mentions de l'outil d'écriture dans un message de commit : David est l'unique auteur
 * (CLAUDE.md § Git Workflow). Un rappel système en glisse parfois une (2026-10-15, 2026-11-04 :
 * réécriture, push forcé, CI relancée).
 *
 * Refusées : la signature de co-auteur, le trailer de session, le lien de session, la mention
 * « généré avec » et l'adresse de l'éditeur. Le mot seul reste permis : `docs(claude): …`,
 * `CLAUDE.md`, « le hook Claude ».
 * Utilisé par la règle commitlint `mention-outil` (commitlint.config.cjs).
 */

const MENTIONS = [
	{ nom: 'Co-Authored-By', motif: /^\s*co-authored-by:.*(claude|anthropic)/im },
	{ nom: 'Claude-Session', motif: /^\s*claude-session\s*:/im },
	{ nom: 'lien claude.ai', motif: /claude\.ai\//i },
	{ nom: 'Generated with', motif: /generated (with|by)\b.*claude/i },
	{ nom: 'adresse anthropic.com', motif: /@anthropic\.com/i }
];

/** Nom de la première mention trouvée dans le message, `null` sinon. */
function trouverMentionOutil(texte) {
	const mention = MENTIONS.find(({ motif }) => motif.test(texte));
	return mention ? mention.nom : null;
}

// Règle commitlint : le message ne porte aucune de ces mentions.
const regleMentionOutil = (parsed) => {
	const nom = trouverMentionOutil(parsed.raw ?? '');
	return [
		nom === null,
		`le message porte une mention de l’outil (${nom}) : la retirer, David est l’unique auteur`
	];
};

module.exports = { regleMentionOutil, trouverMentionOutil };
