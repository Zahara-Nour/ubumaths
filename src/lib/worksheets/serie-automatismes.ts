/**
 * Série d'automatismes — instances figées de modèles de questions (ADR 0011)
 * ==========================================================================
 *
 * Une série est un exercice ORDINAIRE d'une fiche : une liste numérotée
 * d'instances de modèles de questions, chacune tirée avec une graine fixe
 * (même copie pour toute la classe). L'énoncé montre les cases en pointillés,
 * une case choix la liste de ses choix à la place de son bloc ; le corrigé met
 * les réponses à la place des cases (sous la liste, la bonne réponse d'une case
 * choix), puis la correction du modèle. La consigne d'exercice d'un modèle s'écrit une
 * fois, au-dessus de chaque groupe de questions consécutives qui la partagent. Une carte
 * de cours donne son recto à l'énoncé et son verso au corrigé. Les gestes à figer :
 * tableau de signes à compléter (vide / rempli), droite à tracer (repère vide / droite
 * dessinée), boîte à moustaches à construire (axe seul / boîte dessinée), points à
 * placer sur une droite graduée ou dans un repère (sans eux / points posés), éléments à
 * associer (deux colonnes à relier / la liste « élément → bonne étiquette »).
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
import { templateGenericFunctions } from '$lib/questions/generic-functions';
import { parseCustomSafe } from '$lib/mathAST/parser/custom';
import { toLatex } from '$lib/mathAST';
import type { CapitalPairs, GenericFunctionConfig } from '$lib/mathAST/parser/types';
import { withDigitGrouping } from '$lib/utils/french-math';
import { SCHOOL_MIN_DIGITS_FOR_GROUPING } from '$lib/mathAST/digit-grouping';
import { withChoiceClockSize } from '$lib/ubumark/parser/horloge-parser';
import { withChoiceCollectionSize } from '$lib/ubumark/parser/collection-parser';
import { withChoiceMonnaieSize } from '$lib/ubumark/parser/monnaie-parser';
import { replaceChoiceBlocks, type ChoiceBlock } from '$lib/ubumark/parser/choix-parser';
import { correctChoiceIndexesOf, isChoiceBlank } from '$lib/questions/choice-case';
import { findCourbesToPlace, parseCourbeContent } from '$lib/ubumark/parser/courbe-parser';
import { findLinesToPlace, parseNumberLineContent } from '$lib/ubumark/parser/number-line-parser';
import { lineCoefficients } from '$lib/ubumark/utils/courbe-tracer';
import {
	findBoxPlotsToPlace,
	parseStatChartContent,
	PLACER_LINE_REGEX
} from '$lib/ubumark/parser/stat-chart-parser';
import { boxPlotCaseCount } from '$lib/ubumark/utils/boxplot-placer';
import { findAssociersToPlace, parseAssocierContent } from '$lib/ubumark/parser/associer-parser';
import { associerPlacedOf } from '$lib/ubumark/utils/associer';
import {
	findVariationsToFill,
	revealVariationBody
} from '$lib/ubumark/parser/variation-table-parser';

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
/** Expression nommée dans une formule : `$$<<expr:NOM>>…$$` ou `$<<expr:NOM>>…$` */
const EXPRESSION_NOMMEE = /(\$\$?)<<expr:([A-Za-z_]\w*)>>([^$]*)\1/g;

/**
 * Expressions nommées (`<<expr:NOM>>`) : l'écran ajoute « = case » après
 * l'expression (`answerFormat`, cf. `augmentASTForExpressions`) ; la fiche écrit
 * de même. Une expression qui porte déjà ses cases (`\placeholder`) n'est jamais
 * augmentée (même règle que l'écran, `hasPrompts`) : le marqueur seul disparaît.
 * Formules maison (`~…~`, `~~…~~`) non dépliées : un tel modèle est refusé (0 case), pas
 * imprimé faux ; aucun modèle de calcul littéral ne s'écrit ainsi.
 */
function deplierExpressions(texte: string, instance: QuestionInstance): string {
	return texte.replace(EXPRESSION_NOMMEE, (_m, dollars: string, nom: string, corps: string) => {
		const format = instance.expressions?.find((e) => e.name === nom)?.answerFormat;
		const aSesCases = /\\placeholder\[/.test(corps);
		return `${dollars}${format && !aSesCases ? `${corps} = ${format}` : corps}${dollars}`;
	});
}

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
 * parseur, comme un exercice sans liste) et le sens de `AB` de l'instance (absent :
 * produit). Même écriture que l'écran et le PDF
 * (`toLatex`, nombres au point : la langue s'applique au rendu, comme avant).
 * Le reste du texte est rendu à l'octet près. `minDigits` : modèle réglé « Espaces dès
 * 4 chiffres » — les formules reçoivent leurs espaces fines ici, le rendu appliquant
 * sinon le BIPM (E2, simplify-carte § 43).
 */
function customMathToLatex(
	texte: string,
	genericFunctions: GenericFunctionConfig | undefined,
	templateId: string,
	capitalPairs?: CapitalPairs,
	minDigits?: number
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
					: parseCustomSafe(expression.trim(), { genericFunctions, capitalPairs });
				if (!lue?.ast) {
					throw new Error(`${templateId} : formule maison illisible « ${expression.trim()} »`);
				}
				const latex = toLatex(lue.ast);
				remplacement = block ? `$$${latex}$$` : `$${latex}$`;
			}
			if (minDigits !== undefined) remplacement = withDigitGrouping(remplacement, minDigits);
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
function reponse(
	instance: QuestionInstance,
	index: number,
	dansFormule: boolean,
	minDigits?: number
): string {
	const blank = instance.blanks?.[index];
	if (!blank) throw new Error(`case ${index} sans réponse attendue`);
	const brute = blank.expectedAnswerLatex ?? blank.expectedAnswer;
	const latex = minDigits === undefined ? brute : withDigitGrouping(brute, minDigits);
	// En gras, dans la formule comme dans le texte : la réponse se repère d'un coup d'œil
	if (dansFormule) return `\\mathbf{${latex}}`;
	return blank.type === 'math' ? `$\\mathbf{${latex}}$` : `**${blank.expectedAnswer}**`;
}

/** Ligne `case: N` d'un bloc (posée par le générateur, inutile à l'impression) */
const CASE_LINE = /^\s*case\s*:/;

/**
 * Tableaux de signes à compléter (```variation à `?`) : leur corps réécrit par
 * `reecrire`, et le nombre de cases qu'ils portent (une par cellule cachée)
 */
function tableauxACompleter(
	modele: string,
	texte: string,
	reecrire: (corps: string[]) => string[]
): { texte: string; cases: number } {
	const lignes = texte.split('\n');
	const tableaux = findVariationsToFill(texte);
	// Du dernier au premier : les rangs des tableaux précédents restent justes
	for (const tableau of [...tableaux].reverse()) {
		if (tableau.nested || !tableau.node) {
			const raison = tableau.nested
				? 'bloc en retrait ou cité'
				: tableau.errors.map((e) => e.message).join(' ; ');
			throw new Error(`${modele} : tableau à compléter illisible (${raison})`);
		}
		lignes.splice(tableau.startIndex + 1, tableau.body.length, ...reecrire(tableau.body));
	}
	const cases = tableaux.reduce((n, t) => n + (t.node?.cases?.length ?? 0), 0);
	return { texte: lignes.join('\n'), cases };
}

/** Ligne `tracer:` d'un repère */
const TRACER_LINE = /^\s*tracer\s*:/i;

/** Noms possibles de la droite dessinée au corrigé, le premier libre dans le repère */
const NOMS_DE_DROITE = ['f', 'g', 'h', 'u', 'v', 'w'];

/** `y = 2x - 1` : le membre de droite d'une équation réduite */
const EQUATION_REDUITE = /^\s*y\s*=(.+)$/i;

/**
 * Un nombre écrit pour une ligne `f(x) = …` d'un repère : 12 chiffres significatifs
 * (la traîne d'un calcul flottant, `0.33333333333333326`, ne s'écrit pas), `-0` → `0`
 */
function nombre(n: number): string {
	const texte = String(Number(n.toPrecision(12)) + 0);
	// `1e-7` se lirait 1 × e − 7 (e = Euler) : refuser plutôt que dessiner faux
	if (/e/i.test(texte)) throw new Error(`coefficient hors d'écriture décimale : ${texte}`);
	return texte;
}

/** Ligne `placer:` d'un bloc (droite graduée ou repère) */
const PLACER_LINE = /^\s*placer\s*:/i;
/** Ligne `points:` d'un repère */
const POINTS_LINE = /^\s*points\s*:/i;

/** Noms donnés aux points à placer écrits sans nom (`placer: 13/10`) : la première lettre libre */
function nomsDesPoints(noms: readonly string[], pris: Iterable<string>): string[] {
	const occupes = new Set([...pris, ...noms.filter((n) => n !== '')]);
	const libres = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'].filter((l) => !occupes.has(l));
	let k = 0;
	return noms.map((n) => {
		if (n !== '') return n;
		const libre = libres[k++];
		if (!libre) throw new Error('aucun nom libre pour un point à placer');
		return libre;
	});
}

/**
 * Points à placer d'un repère (```courbe à `placer: A=(2 ; 3)`) : à l'énoncé, le repère
 * sans eux (lignes `placer:` et `case:` retirées) ; au corrigé (`corrige`), ils
 * rejoignent les `points:` du repère (ligne créée à la place de `placer:` s'il n'en a
 * pas). Un point sans nom prend la première lettre libre. Une case par point.
 */
function pointsDuRepere(
	corpsDuRepere: string[],
	placer: readonly { name: string; x: number; y: number }[],
	pris: Iterable<string>,
	corrige: boolean
): string[] {
	const corps = corpsDuRepere.filter((ligne) => !CASE_LINE.test(ligne));
	if (!corrige) return corps.filter((ligne) => !PLACER_LINE.test(ligne));
	const noms = nomsDesPoints(
		placer.map((t) => t.name),
		pris
	);
	const attendus = placer.map((t, i) => `${noms[i]}(${nombre(t.x)} ; ${nombre(t.y)})`).join(', ');
	const iPoints = corps.findIndex((ligne) => POINTS_LINE.test(ligne));
	if (iPoints >= 0) {
		const avec = `${corps[iPoints].trimEnd()}, ${attendus}`;
		return corps
			.map((ligne, i) => (i === iPoints ? avec : ligne))
			.filter((ligne) => !PLACER_LINE.test(ligne));
	}
	return corps.map((ligne) => (PLACER_LINE.test(ligne) ? `points: ${attendus}` : ligne));
}

/**
 * Repères à compléter (```courbe à `tracer:` ou `placer:`).
 *
 * Droite à tracer (`tracer: y = 2x - 1`) : à l'énoncé, le repère vide (lignes `tracer:`
 * et `case:` retirées) ; au corrigé (`corrige`), la ligne `tracer:` devient la droite
 * dessinée, en vert. Une case par droite. Seule une droite non verticale se dessine
 * (`f(x) = …`) : vecteur à tracer, droite masquée ou verticale → refus.
 *
 * Points à placer : cf. `pointsDuRepere`. Repère en retrait ou cité → refus, message à
 * l'appui.
 */
function droitesATracer(
	modele: string,
	texte: string,
	corrige: boolean
): { texte: string; cases: number } {
	const lignes = texte.split('\n');
	const reperes = findCourbesToPlace(texte);
	let cases = 0;
	// Du dernier au premier : les rangs des repères précédents restent justes
	for (const repere of [...reperes].reverse()) {
		const refus = (raison: string) => new Error(`${modele} : ${raison}`);
		if (repere.nested) throw refus('repère à compléter en retrait ou cité');
		const node = parseCourbeContent(repere.body.join('\n'));
		if (!node.spec) {
			throw refus(`repère illisible (${node.errors.map((e) => e.message).join(' ; ')})`);
		}
		const placer = node.spec.placer ?? [];
		if (placer.length > 0) {
			const pris = node.spec.points.map((p) => p.name);
			const corps = pointsDuRepere(repere.body, placer, pris, corrige);
			lignes.splice(repere.startIndex + 1, repere.body.length, ...corps);
			cases += placer.length;
			continue;
		}
		if (node.spec.vecteur) throw refus('vecteur à tracer non pris en charge');
		const tracer = node.spec.tracer;
		if (!tracer) throw refus('repère à compléter sans droite à tracer');
		const droite = lineCoefficients(tracer.equation);
		if (typeof droite === 'string') throw refus(`droite à tracer masquée ou illisible (${droite})`);
		if (droite.b === 0) throw refus('droite verticale non prise en charge');

		const pris = new Set(node.spec.functions.map((f) => f.name));
		const nom = NOMS_DE_DROITE.find((n) => !pris.has(n));
		if (!nom) throw refus('aucun nom libre pour dessiner la droite');
		// Équation réduite : son membre de droite, tel qu'écrit (`1/3x - 1`, jamais un
		// flottant) ; sinon ax + by + c = 0 → y = (-a x - c) / b
		const membre = EQUATION_REDUITE.exec(tracer.equation)?.[1];
		const expression =
			membre !== undefined && !/y/i.test(membre)
				? membre.trim()
				: `((${nombre(-droite.a)})*x+(${nombre(-droite.c)}))/(${nombre(droite.b)})`;
		const dessinee = `${nom}(x) = ${expression}   vert`;
		const corps = repere.body
			.filter((ligne) => !CASE_LINE.test(ligne))
			.flatMap((ligne) => (TRACER_LINE.test(ligne) ? (corrige ? [dessinee] : []) : [ligne]));
		lignes.splice(repere.startIndex + 1, repere.body.length, ...corps);
		cases += 1;
	}
	return { texte: lignes.join('\n'), cases };
}

/** Couleur des points attendus d'une droite à placer, au corrigé (celle de la page à cocher) */
const COULEUR_SOLUTION = 'vert';

/**
 * Droites graduées à placer (```line à `placer: 13/10` ou `placer: A=3 ; B=7`) : à
 * l'énoncé, la droite seule (lignes `placer:` et `case:` retirées) ; au corrigé
 * (`corrige`), `placer:` devient la ligne `points:` des points attendus, en vert (le
 * parseur refuse `points:` avec `placer:` : il n'y en a pas d'autre). Un point sans nom
 * prend la première lettre libre. Une case par point. Droite à représenter
 * (`representer:`), droite en retrait ou citée, illisible → refus, message à l'appui.
 */
function droitesAPlacer(
	modele: string,
	texte: string,
	corrige: boolean
): { texte: string; cases: number } {
	const lignes = texte.split('\n');
	const droites = findLinesToPlace(texte);
	let cases = 0;
	// Du dernier au premier : les rangs des droites précédentes restent justes
	for (const droite of [...droites].reverse()) {
		const refus = (raison: string) => new Error(`${modele} : ${raison}`);
		if (droite.nested) throw refus('droite à placer en retrait ou citée');
		const { node, errors } = parseNumberLineContent(droite.body);
		if (!node) {
			throw refus(`droite à placer illisible (${errors.map((e) => e.message).join(' ; ')})`);
		}
		if (node.representer) throw refus('droite à représenter non prise en charge');
		const placer = node.placer ?? [];
		if (placer.length === 0) throw refus('droite à placer sans point à placer');
		cases += placer.length;
		const noms = nomsDesPoints(
			placer.map((t) => t.name),
			[]
		);
		// Écriture de l'auteur, virgule décimale mise au point (`,` sépare les points)
		const attendus = placer
			.map((t, i) => {
				const valeur = t.value.expression.replace(/(\d),(\d)/g, '$1.$2');
				if (valeur.includes(',')) throw refus(`point à placer illisible (${t.value.expression})`);
				return `${noms[i]}=${valeur} ${COULEUR_SOLUTION}`;
			})
			.join(', ');
		const corps = droite.body
			.filter((ligne) => !CASE_LINE.test(ligne))
			.flatMap((ligne) =>
				PLACER_LINE.test(ligne) ? (corrige ? [`points: ${attendus}`] : []) : [ligne]
			);
		lignes.splice(droite.startIndex + 1, droite.body.length, ...corps);
	}
	return { texte: lignes.join('\n'), cases };
}

/**
 * Boîtes à moustaches à construire (```boite-a-moustaches à `placer:`) : à l'énoncé,
 * la ligne `placer:` reste (le PDF ne dessine que l'axe et le nom des boîtes à
 * construire), `case:` retirée ; au corrigé (`corrige`), `placer:` retirée : toutes les
 * boîtes sont dessinées. Cinq cases par boîte à construire (minimum, Q1, médiane, Q3,
 * maximum). Bloc en retrait ou cité, ou illisible → refus, message à l'appui.
 */
function boitesAConstruire(
	modele: string,
	texte: string,
	corrige: boolean
): { texte: string; cases: number } {
	const lignes = texte.split('\n');
	const blocs = findBoxPlotsToPlace(texte);
	let cases = 0;
	// Du dernier au premier : les rangs des blocs précédents restent justes
	for (const bloc of [...blocs].reverse()) {
		const refus = (raison: string) => new Error(`${modele} : ${raison}`);
		if (bloc.nested) throw refus('boîte à construire en retrait ou citée');
		const node = parseStatChartContent('boite-a-moustaches', bloc.body.join('\n'));
		if (!node.spec) {
			throw refus(`boîte illisible (${node.errors.map((e) => e.message).join(' ; ')})`);
		}
		cases += boxPlotCaseCount(node.spec);
		const corps = bloc.body.filter(
			(ligne) => !CASE_LINE.test(ligne) && !(corrige && PLACER_LINE_REGEX.test(ligne.trim()))
		);
		lignes.splice(bloc.startIndex + 1, bloc.body.length, ...corps);
	}
	return { texte: lignes.join('\n'), cases };
}

/**
 * Éléments à associer (```associer, déjà sans liens, étiquettes dans l'ordre affiché) :
 * à l'énoncé, le bloc sans `case:` (le PDF dessine les deux colonnes à relier) ; au
 * corrigé (`corrige`), à sa place la liste « élément → bonne étiquette ». Une case par
 * élément. Bloc en retrait ou cité, illisible, ou réponse attendue hors des étiquettes
 * → refus, message à l'appui.
 */
function associersAFiger(
	modele: string,
	texte: string,
	corrige: boolean,
	instance: QuestionInstance
): { texte: string; cases: number } {
	const lignes = texte.split('\n');
	const blocs = findAssociersToPlace(texte);
	let cases = 0;
	// Du dernier au premier : les rangs des blocs précédents restent justes
	for (const bloc of [...blocs].reverse()) {
		const refus = (raison: string) => new Error(`${modele} : ${raison}`);
		if (bloc.nested) throw refus('éléments à associer en retrait ou cités');
		const node = parseAssocierContent(bloc.body.join('\n'));
		if (node.errors.length > 0 || node.caseIndex === undefined) {
			throw refus(`éléments à associer illisibles (${node.errors.join(' ; ')})`);
		}
		cases += node.items.length;
		const first = node.caseIndex;
		const fin = bloc.closed
			? bloc.startIndex + bloc.body.length + 1
			: bloc.startIndex + bloc.body.length;
		if (corrige) {
			const liste = node.items.map((item, k) => {
				const attendue = instance.blanks?.[first + k]?.expectedAnswer ?? '';
				const position = associerPlacedOf(attendue, node.labels.length);
				if (position === null) throw refus(`élément ${k + 1} : réponse attendue illisible`);
				return `- ${item} → ${node.labels[position]}`;
			});
			lignes.splice(bloc.startIndex, fin - bloc.startIndex + 1, ...liste);
			continue;
		}
		const corps = bloc.body.filter((ligne) => !CASE_LINE.test(ligne));
		lignes.splice(bloc.startIndex + 1, bloc.body.length, ...corps);
	}
	return { texte: lignes.join('\n'), cases };
}

/** Un choix à imprimer : taille des blocs (horloge, collection, monnaie) posée */
function choixImprime(contenu: string): string {
	return withChoiceMonnaieSize(withChoiceCollectionSize(withChoiceClockSize(contenu)));
}

/**
 * Liste des choix `**a)** …` (ordre affiché) et bonne(s) réponse(s)
 * `**b)** …`. Lettre en gras, pas `a) …` : une ligne `a)` serait une sous-liste,
 * que le PDF renumérote selon sa profondeur (« 1) 2) ») alors que le corrigé dit
 * « a) ». Un choix qui est un bloc (```horloge) : la lettre sur sa ligne, le bloc
 * dessous (collé à la lettre, sa fence ne serait plus lue) ; la réponse du corrigé
 * ne redessine pas le bloc.
 */
function listeDeChoix(contenus: readonly string[], bons: ReadonlySet<number>) {
	const lettre = (i: number) => `**${String.fromCharCode(97 + i)})**`;
	const enBloc = (contenu: string) => contenu.trimStart().startsWith('```');
	const liste = contenus.map((c, i) => `${lettre(i)}${enBloc(c) ? '\n\n' : ' '}${c}`).join('\n\n');
	const reponses = contenus
		.map((c, i) => (bons.has(i) ? (enBloc(c) ? lettre(i) : `${lettre(i)} ${c}`) : null))
		.filter((c): c is string => c !== null);
	return { liste, reponse: `Réponse : ${reponses.join(' ; ')}` };
}

/**
 * Une question figée : énoncé et corrigé, en markdown libre (avant mise en liste), et
 * la consigne d'exercice de son modèle, à part (`buildSerie` la pose une fois par groupe)
 */
type QuestionFigee = Serie & { consigne?: string };

/** Énoncé et corrigé d'une instance, consigne à part */
function figer(template: QuestionTemplate, instance: QuestionInstance): QuestionFigee {
	// Formules maison lues avec les fonctions DE CE MODÈLE (cf. en-tête)
	const fonctions = templateGenericFunctions(template.shared?.genericFunctions);
	// … et avec le sens de `AB` résolu pour l'instance (longueur ou produit, lot 5 des
	// longueurs de segments) : la fiche écrit comme l'écran
	// Espaces dès 4 chiffres si le modèle le demande (sinon le rendu applique le BIPM)
	const minDigits =
		template.options?.constraints?.spacesFromFourDigits === true
			? SCHOOL_MIN_DIGITS_FOR_GROUPING
			: undefined;
	const enLatex = (texte: string) =>
		customMathToLatex(texte, fonctions, template.id, instance.capitalPairs, minDigits);
	// Marqueurs de détail GARDÉS (ADR 0017, lot 3) : la fiche choisit concise ou
	// détaillée à l'impression (`correctionForPrint`), même après la création de
	// la série ; les écrans montrent la détaillée (`detailedCorrection`)
	const etapes = (instance.correction?.steps ?? []).map((step) => enLatex(step));
	// Correction générée (mode B) : ses étapes ne sont rendues qu'à l'écran ; la
	// figer demanderait generateCorrection — refuser plutôt que d'en perdre le texte
	if (etapes.length === 0 && instance.correction?.generatedSteps) {
		throw new Error(`${template.id} : correction générée (mode B) non prise en charge`);
	}
	// Consigne du modèle : lue avec SES fonctions, posée au-dessus du groupe par `buildSerie`
	const consigne = instance.exerciseInstruction ? enLatex(instance.exerciseInstruction) : undefined;
	const texte = enLatex(deplierExpressions(instance.statement, instance));
	if (isCourseCard(template)) {
		return { statement: texte, solution: [texte, ...etapes].join('\n\n'), consigne };
	}

	// Cases choix (bloc ```choix, choix déjà dans l'ordre affiché) : la liste a) b) à
	// la place du bloc ; au corrigé, la bonne réponse sous la liste
	let casesChoix = 0;
	const choixDuBloc = (bloc: ChoiceBlock) => {
		const blank = bloc.caseIndex === undefined ? undefined : instance.blanks?.[bloc.caseIndex];
		if (!isChoiceBlank(blank)) {
			throw new Error(`${template.id} : bloc choix sans case choix (case ${bloc.caseIndex})`);
		}
		const { order } = blank.choice;
		const bons = new Set(correctChoiceIndexesOf(blank).map((i) => order.indexOf(i)));
		return listeDeChoix(bloc.choices.map(choixImprime), bons);
	};
	const enonceChoix = replaceChoiceBlocks(texte, (bloc) => {
		casesChoix++;
		return choixDuBloc(bloc).liste;
	});
	const corrigeChoix = replaceChoiceBlocks(texte, (bloc) => {
		const { liste, reponse } = choixDuBloc(bloc);
		return `${liste}\n\n${reponse}`;
	});

	// Tableau de signes à compléter : cellules cachées vides à l'énoncé (le PDF les
	// dessine vides), tableau rempli au corrigé ; une case par cellule cachée
	const tableauxEnonce = tableauxACompleter(template.id, enonceChoix, (corps) =>
		corps.filter((ligne) => !CASE_LINE.test(ligne))
	);
	const tableauxCorrige = tableauxACompleter(template.id, corrigeChoix, revealVariationBody);

	// Droite à tracer : repère vide à l'énoncé, droite dessinée au corrigé ; une case chacune
	const droitesEnonce = droitesATracer(template.id, tableauxEnonce.texte, false);
	const droitesCorrige = droitesATracer(template.id, tableauxCorrige.texte, true);

	// Boîte à construire : axe seul à l'énoncé, boîte dessinée au corrigé ; cinq cases chacune
	const boitesEnonce = boitesAConstruire(template.id, droitesEnonce.texte, false);
	const boitesCorrige = boitesAConstruire(template.id, droitesCorrige.texte, true);

	// Droite graduée à placer : droite seule à l'énoncé, points posés au corrigé ; une case par point
	const graduationsEnonce = droitesAPlacer(template.id, boitesEnonce.texte, false);
	const graduationsCorrige = droitesAPlacer(template.id, boitesCorrige.texte, true);

	// Éléments à associer : deux colonnes à l'énoncé, la liste des bonnes associations au corrigé
	const associerEnonce = associersAFiger(template.id, graduationsEnonce.texte, false, instance);
	const associerCorrige = associersAFiger(template.id, graduationsCorrige.texte, true, instance);

	// Chaque case attendue doit être remplacée, ni plus ni moins (un marqueur d'une
	// autre convention, `<<expr:…>>`, laisserait sinon une question sans case)
	const cases =
		[...texte.matchAll(PLACEHOLDER), ...texte.matchAll(TEXT_BLANK)].length +
		casesChoix +
		tableauxEnonce.cases +
		droitesEnonce.cases +
		boitesEnonce.cases +
		graduationsEnonce.cases +
		associerEnonce.cases;
	if (cases !== (instance.blanks?.length ?? 0)) {
		throw new Error(
			`${template.id} : ${cases} case(s) dans l'énoncé pour ${instance.blanks?.length ?? 0} réponse(s) attendue(s)`
		);
	}

	const enonce = associerEnonce.texte
		.replace(PLACEHOLDER, `\\text{${BLANK_TEXT}}`)
		.replace(TEXT_BLANK, BLANK_TEXT);
	const corrige = associerCorrige.texte
		.replace(PLACEHOLDER, (_m, i: string) => reponse(instance, Number(i), true, minDigits))
		.replace(TEXT_BLANK, (_m, i: string) => reponse(instance, Number(i), false, minDigits));

	return { statement: enonce, solution: [corrige, ...etapes].join('\n\n'), consigne };
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
 * Liste numérotée des questions, la consigne d'exercice posée UNE fois au-dessus de chaque
 * groupe de questions consécutives qui la partagent (même texte) : la liste s'interrompt,
 * puis reprend à son numéro (« 3. », lu tel quel par l'écran et le PDF). Une question
 * sans consigne coupe le groupe.
 */
function enListe(figees: readonly QuestionFigee[], texteDe: (q: QuestionFigee) => string): string {
	return figees
		.map((q, i) => {
			const question = item(i + 1, texteDe(q));
			const debutDeGroupe = q.consigne !== undefined && q.consigne !== figees[i - 1]?.consigne;
			return debutDeGroupe ? `${q.consigne}\n\n${question}` : question;
		})
		.join('\n\n');
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
		const residu = `${serie.consigne ?? ''}\n${serie.statement}\n${serie.solution}`.match(
			/\{\{[^}]*\}\}|\\placeholder|<<[^>]*>>/
		);
		if (residu) throw new Error(`marqueur non résolu dans ${templateId} : ${residu[0]}`);
		return serie;
	});
	// Deux graines peuvent tomber sur le même tirage : une série ne pose jamais deux
	// fois la même question (consigne comprise : deux consignes, deux questions)
	const vus = new Map<string, number>();
	figees.forEach((s, i) => {
		const cle = `${s.consigne ?? ''}\n\n${s.statement}`;
		const deja = vus.get(cle);
		if (deja !== undefined) {
			throw new Error(`questions ${deja + 1} et ${i + 1} identiques : changer une graine`);
		}
		vus.set(cle, i);
	});
	return {
		statement: enListe(figees, (s) => s.statement),
		solution: enListe(figees, (s) => s.solution)
	};
}
