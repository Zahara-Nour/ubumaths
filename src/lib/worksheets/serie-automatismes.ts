/**
 * Série d'automatismes — instances figées de modèles de questions (ADR 0011)
 * ==========================================================================
 *
 * Une série est un exercice ORDINAIRE d'une fiche : une liste numérotée
 * d'instances de modèles de questions, chacune tirée avec une graine fixe
 * (même copie pour toute la classe). L'énoncé montre les cases en pointillés,
 * un QCM la liste de ses choix ; le corrigé met les réponses à la place des
 * cases (ou la bonne réponse du QCM), puis la correction du modèle. Une carte
 * de cours donne son recto à l'énoncé et son verso au corrigé.
 *
 * Toute anomalie (modèle absent, génération en échec, marqueur non résolu) lève
 * une exception : l'appelant ne doit rien écrire.
 */
import { generateInstance } from '$lib/questions/generator/instance-generator';
import { isCourseCard, type QuestionInstance, type QuestionTemplate } from '$lib/questions/types';

export type SerieItem = { templateId: string; seed: number };
export type Serie = { statement: string; solution: string };

/** Ce qui remplace une case dans l'énoncé figé */
export const BLANK_TEXT = '……';

const RETRAIT = '   ';
/** Case dans une formule : `\placeholder[N]{}` */
const PLACEHOLDER = /\\placeholder\[(\d+)\]\{[^}]*\}/g;
/** Case dans le texte : `{{blank:N}}` */
const TEXT_BLANK = /\{\{blank:(\d+)\}\}/g;

/** Réponse attendue d'une case, dans la forme de son contexte (formule ou texte) */
function reponse(instance: QuestionInstance, index: number, dansFormule: boolean): string {
	const blank = instance.blanks?.[index];
	if (!blank) throw new Error(`case ${index} sans réponse attendue`);
	// En gras, dans la formule comme dans le texte : la réponse se repère d'un coup d'œil
	if (dansFormule) return `\\mathbf{${blank.expectedAnswerLatex ?? blank.expectedAnswer}}`;
	return blank.type === 'math'
		? `$\\mathbf{${blank.expectedAnswerLatex ?? blank.expectedAnswer}}$`
		: `**${blank.expectedAnswer}**`;
}

/** Énoncé et corrigé d'une instance, en markdown libre (avant mise en liste) */
function figer(template: QuestionTemplate, instance: QuestionInstance): Serie {
	const etapes = instance.correction?.steps ?? [];
	if (isCourseCard(template)) {
		return {
			statement: instance.statement,
			solution: [instance.statement, ...etapes].join('\n\n')
		};
	}

	const enonce = instance.statement
		.replace(PLACEHOLDER, `\\text{${BLANK_TEXT}}`)
		.replace(TEXT_BLANK, BLANK_TEXT);
	let corrige = instance.statement
		.replace(PLACEHOLDER, (_m, i: string) => reponse(instance, Number(i), true))
		.replace(TEXT_BLANK, (_m, i: string) => reponse(instance, Number(i), false));

	const choix = instance.choices ?? [];
	if (choix.length > 0) {
		const lettre = (i: number) => String.fromCharCode(97 + i);
		const liste = choix.map((c, i) => `${lettre(i)}) ${c.content}`).join('\n\n');
		const bonnes = choix
			.map((c, i) => (c.isCorrect ? `${lettre(i)}) ${c.content}` : null))
			.filter((c): c is string => c !== null);
		return {
			statement: `${enonce}\n\n${liste}`,
			solution: [`${corrige}\n\n${liste}`, `Réponse : ${bonnes.join(' ; ')}`, ...etapes].join(
				'\n\n'
			)
		};
	}
	corrige = [corrige, ...etapes].join('\n\n');
	return { statement: enonce, solution: corrige };
}

/** Un item de liste numérotée : première ligne après « N. », les suivantes en retrait */
function item(numero: number, texte: string): string {
	const [premiere, ...suite] = texte.trim().split('\n');
	return [
		`${numero}. ${premiere}`,
		...suite.map((ligne) => (ligne.trim() === '' ? '' : `${RETRAIT}${ligne}`))
	].join('\n');
}

/**
 * Construit l'énoncé et le corrigé d'une série.
 *
 * @param modeles - Modèles de questions disponibles, par identifiant
 * @param items - (modèle, graine) dans l'ordre de la série
 */
export function buildSerie(modeles: Map<string, QuestionTemplate>, items: SerieItem[]): Serie {
	if (items.length === 0) throw new Error('série vide');
	const figees = items.map(({ templateId, seed }) => {
		const template = modeles.get(templateId);
		if (!template) throw new Error(`modèle absent : ${templateId}`);
		const genere = generateInstance(template, seed);
		if (!genere.success) {
			throw new Error(
				`génération en échec : ${templateId} (graine ${seed}) — ${JSON.stringify(genere.errors)}`
			);
		}
		const serie = figer(template, genere.instance);
		const residu = `${serie.statement}\n${serie.solution}`.match(/\{\{[^}]*\}\}|\\placeholder/);
		if (residu) throw new Error(`marqueur non résolu dans ${templateId} : ${residu[0]}`);
		return serie;
	});
	// Deux graines peuvent tomber sur le même tirage : une série ne pose jamais deux
	// fois la même question
	const vus = new Map<string, number>();
	figees.forEach((s, i) => {
		const deja = vus.get(s.statement);
		if (deja !== undefined) {
			throw new Error(`questions ${deja + 1} et ${i + 1} identiques : changer une graine`);
		}
		vus.set(s.statement, i);
	});
	return {
		statement: figees.map((s, i) => item(i + 1, s.statement)).join('\n\n'),
		solution: figees.map((s, i) => item(i + 1, s.solution)).join('\n\n')
	};
}
