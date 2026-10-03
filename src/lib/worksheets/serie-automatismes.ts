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
 * Formules maison (`~…~`, `~~…~~`) : converties en LaTeX AU MOMENT DE FIGER, avec les
 * fonctions déclarées par le modèle de la question (`shared.genericFunctions`). L'écran
 * et le PDF ne relisent jamais une formule LaTeX avec la liste de l'exercice : chaque
 * question garde ainsi SES fonctions (`P` fonction dans l'une, produit dans l'autre).
 *
 * Toute anomalie (modèle absent, génération en échec, marqueur non résolu, formule
 * maison illisible) lève une exception : l'appelant ne doit rien écrire.
 */
import { generateInstance } from '$lib/questions/generator/instance-generator';
import { isCourseCard, type QuestionInstance, type QuestionTemplate } from '$lib/questions/types';
import { detailedCorrection } from '$lib/questions/correction-detail';
import { templateGenericFunctions } from '$lib/questions/generic-functions';
import { parseCustomSafe } from '$lib/mathAST/parser/custom';
import { toLatex } from '$lib/mathAST';
import type { GenericFunctionConfig } from '$lib/mathAST/parser/types';

export type SerieItem = { templateId: string; seed: number };
/**
 * Énoncé et corrigé figés. Pas de `generic_functions` pour l'exercice : toutes les
 * formules y sont en LaTeX, déjà lues avec les fonctions de LEUR modèle (une liste
 * commune rendait `P` fonction dans toutes les questions dès qu'un modèle le déclarait).
 */
export type Serie = {
	statement: string;
	solution: string;
};

/** Ce qui remplace une case dans l'énoncé figé */
export const BLANK_TEXT = '……';

/** Case dans une formule : `\placeholder[N]{}` */
const PLACEHOLDER = /\\placeholder\[(\d+)\]\{[^}]*\}/g;
/** Case dans le texte : `{{blank:N}}` */
const TEXT_BLANK = /\{\{blank:(\d+)\}\}/g;

/**
 * Zones d'un texte, dans l'ordre de l'extraction d'ubumark (`math-extractor.ts`) :
 * blocs `$$…$$`, blocs maison `~~…~~`, formules `$…$`, formules maison `~…~`. Les
 * délimiteurs échappés (`\$`, `\~`) ne comptent pas. Les zones LaTeX sont repérées
 * pour être SAUTÉES : un `~` dans du LaTeX n'ouvre pas de formule maison.
 */
const ZONES: { regex: RegExp; custom: boolean; block: boolean }[] = [
	{ regex: /(?<!\\)\$\$([\s\S]+?)\$\$/g, custom: false, block: true },
	{ regex: /(?<!\\)(?<!~)~~(?!~)([\s\S]+?)(?<!~)~~(?!~)/g, custom: true, block: true },
	{ regex: /(?<!\\)\$([^$\n]+)\$/g, custom: false, block: false },
	{ regex: /(?<!\\)~([^~\n]+)~(?!~)/g, custom: true, block: false }
];

/** Jeton provisoire d'une zone déjà traitée (caractère d'usage privé, absent d'un texte d'auteur) */
const TOKEN = /\uE000(\d+)\uE000/g;

/**
 * Formules maison → LaTeX, lues avec les fonctions du modèle (absentes : défauts du
 * parseur, comme un exercice sans liste). Même écriture que l'écran et le PDF
 * (`toLatex`, nombres au point : la langue s'applique au rendu, comme avant).
 * Le reste du texte est rendu à l'octet près.
 */
function customMathToLatex(
	texte: string,
	genericFunctions: GenericFunctionConfig | undefined,
	templateId: string
): string {
	const zones: string[] = [];
	let masque = texte;
	for (const { regex, custom, block } of ZONES) {
		masque = masque.replace(regex, (brut: string, expression: string) => {
			let remplacement = brut;
			if (custom) {
				// Une formule maison qui contient une zone déjà masquée n'est pas lisible seule
				const lue = expression.includes('\uE000')
					? null
					: parseCustomSafe(expression.trim(), { genericFunctions });
				if (!lue?.ast) {
					throw new Error(`${templateId} : formule maison illisible « ${expression.trim()} »`);
				}
				const latex = toLatex(lue.ast);
				remplacement = block ? `$$${latex}$$` : `$${latex}$`;
			}
			zones.push(remplacement);
			return `\uE000${zones.length - 1}\uE000`;
		});
	}
	// Une zone peut en contenir une autre (`$$ … ~a~ … $$` reste tel quel) : on recommence
	let resultat = masque;
	for (let profondeur = 0; profondeur < 8 && resultat.includes('\uE000'); profondeur++) {
		resultat = resultat.replace(TOKEN, (_m, i: string) => zones[Number(i)]);
	}
	return resultat;
}

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
	// Formules maison lues avec les fonctions DE CE MODÈLE (cf. en-tête)
	const fonctions = templateGenericFunctions(template.shared?.genericFunctions);
	const enLatex = (texte: string) => customMathToLatex(texte, fonctions, template.id);
	// Version détaillée (ADR 0017) : un marqueur `\detail{` brut ferait échouer
	// Typst pour toute la fiche. Le réglage concise / détaillée viendra au lot 3.
	const etapes = (instance.correction?.steps ?? []).map((step) =>
		enLatex(detailedCorrection(step))
	);
	// Correction générée (mode B) : ses étapes ne sont rendues qu'à l'écran ; la
	// figer demanderait generateCorrection — refuser plutôt que d'en perdre le texte
	if (etapes.length === 0 && instance.correction?.generatedSteps) {
		throw new Error(`${template.id} : correction générée (mode B) non prise en charge`);
	}
	// La consigne du modèle précède l'énoncé (sinon la question perd son contexte)
	const texte = enLatex(
		instance.exerciseInstruction
			? `${instance.exerciseInstruction}\n\n${instance.statement}`
			: instance.statement
	);
	if (isCourseCard(template)) {
		return { statement: texte, solution: [texte, ...etapes].join('\n\n') };
	}

	// Chaque case attendue doit être remplacée, ni plus ni moins (un marqueur d'une
	// autre convention, `<<expr:…>>`, laisserait sinon une question sans case)
	const cases = [...texte.matchAll(PLACEHOLDER), ...texte.matchAll(TEXT_BLANK)].length;
	if (cases !== (instance.blanks?.length ?? 0)) {
		throw new Error(
			`${template.id} : ${cases} case(s) dans l'énoncé pour ${instance.blanks?.length ?? 0} réponse(s) attendue(s)`
		);
	}

	const enonce = texte
		.replace(PLACEHOLDER, `\\text{${BLANK_TEXT}}`)
		.replace(TEXT_BLANK, BLANK_TEXT);
	let corrige = texte
		.replace(PLACEHOLDER, (_m, i: string) => reponse(instance, Number(i), true))
		.replace(TEXT_BLANK, (_m, i: string) => reponse(instance, Number(i), false));

	const choix = (instance.choices ?? []).map((c) => ({ ...c, content: enLatex(c.content) }));
	if (choix.length > 0) {
		// Lettre en gras, pas `a) …` : une ligne `a)` serait une sous-liste, que le PDF
		// renumérote selon sa profondeur (« 1) 2) ») alors que le corrigé dit « a) »
		const lettre = (i: number) => `**${String.fromCharCode(97 + i)})**`;
		const liste = choix.map((c, i) => `${lettre(i)} ${c.content}`).join('\n\n');
		const bonnes = choix
			.map((c, i) => (c.isCorrect ? `${lettre(i)} ${c.content}` : null))
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

/**
 * Un item de liste numérotée : première ligne après « N. », les suivantes en retrait
 * de la largeur de « N. » + espace (4 espaces à partir de « 10. », sinon les
 * paragraphes suivants sortent de la liste).
 */
function item(numero: number, texte: string): string {
	const [premiere, ...suite] = texte.trim().split('\n');
	const RETRAIT = ' '.repeat(`${numero}. `.length);
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
		const residu = `${serie.statement}\n${serie.solution}`.match(
			/\{\{[^}]*\}\}|\\placeholder|<<[^>]*>>/
		);
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
