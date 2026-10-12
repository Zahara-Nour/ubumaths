/**
 * NumWorks (N0110 / N0120), système Epsilon v26.
 *
 * Sources : manuel officiel (v20, en retard), notes de version 21 à 26, code source
 * d'Epsilon (cloné dans extern/numworks-epsilon du dépôt principal). Brouillon sourcé :
 * docs/wip/guides-calculatrices-numworks.md. Rien n'est montré en production tant que
 * David ne l'a pas relu sur la machine (`verifiedOnDevice`).
 *
 * Vérification au simulateur (2026-10-12) : chaque séquence marquée `checkedInSimulator`
 * a été rejouée touche par touche dans le simulateur officiel v26, compilé depuis le code
 * source ; le simulateur fait foi sur le manuel v20. Résultats : section « Vérifications
 * au simulateur » du brouillon.
 */

import type { CalculatorModel, Pitfall, SequenceSource, TaskSequence } from '../types';
import { GUIDE_GRADES } from '../levels';

// ===== Constantes =====

/** Date de la vérification au simulateur Epsilon v26 */
const SIMULATOR_CHECK = '2026-10-12';

const MANUAL_URL = 'https://www.numworks.com/fr/graphique/manuel/';
const RELEASE_NOTES_URL = 'https://www.numworks.com/fr/graphique/mise-a-jour/';
const SOURCE_CODE_URL = 'https://github.com/numworks/epsilon/blob/master/';

// Fichiers du code source cités souvent
const KEYBOARD_LAYOUT = 'shared/ion/src/shared/layout_events/epsilon/layout_events.cpp';
const TOOLBOX_LABELS = 'epsilon/apps/toolbox.fr.i18n';
const SHARED_LABELS = 'epsilon/apps/shared.fr.i18n';
const FUNCTION_NAMES = 'epsilon/apps/shared.universal.i18n';
const PERCENT_TESTS = 'poincare/test/simplification/simplification.cpp';
const STATISTICS_LABELS = 'epsilon/apps/statistics/i18n/base.fr.i18n';
const SEQUENCE_LABELS = 'epsilon/apps/sequence/i18n/base.fr.i18n';
const REGRESSION_LABELS = 'epsilon/apps/regression/i18n/base.fr.i18n';

// ===== Fonctions =====

/** Une page du manuel officiel (v20) */
function manual(page: string, detail?: string): SequenceSource {
	return { kind: 'doc', url: `${MANUAL_URL}${page}`, detail };
}

/** Les notes d'une version d'Epsilon */
function releaseNotes(version: number, detail?: string): SequenceSource {
	return { kind: 'notes-de-version', url: `${RELEASE_NOTES_URL}version-${version}/`, detail };
}

/** Un fichier du code source officiel d'Epsilon */
function sourceCode(path: string, detail?: string): SequenceSource {
	return { kind: 'code-source', url: `${SOURCE_CODE_URL}${path}`, detail };
}

// ===== Séquences =====

const SEQUENCES: readonly TaskSequence[] = [
	// ----- 6e -----
	{
		taskId: 'clear-input',
		app: 'Calculs',
		steps: [
			'[[del]] efface le caractère à gauche du curseur ; [[left]] et [[right]] déplacent le curseur dans la ligne.',
			'Pour reprendre un calcul : [[up]] sélectionne le dernier résultat, [[left]] passe sur le calcul, puis [[ok]] le recopie dans la ligne de saisie.',
			'Pour effacer une ligne de l’historique : sélectionne-la avec [[up]], puis [[del]].',
			'Pour vider tout l’historique : sélectionne une ligne avec [[up]], puis [[shift]] [[del]].'
		],
		note: 'La flèche vers le haut sélectionne d’abord le résultat : OK recopierait le résultat, pas le calcul.',
		sources: [manual('calculs/', '§1.1.4, §1.1.5'), sourceCode(KEYBOARD_LAYOUT, 'shift ⌫ = Clear')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'basic-operations',
		app: 'Calculs',
		steps: [
			'Tape le calcul avec [[plus]] [[minus]] [[times]] [[divide]] [[lparen]] [[rparen]], par exemple 2 [[plus]] 3 [[times]] 4.',
			'Appuie sur [[exe]] : la calculatrice respecte les priorités, 2+3×4 donne 14.',
			'Le résultat exact s’affiche en noir, la valeur approchée en gris.'
		],
		note: 'La touche ÷ écrit une fraction : voir « Écrire une fraction ».',
		sources: [manual('calculs/', '§1.1.1')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'euclidean-division',
		app: 'Calculs',
		steps: [
			'Appuie sur [[toolbox]], choisis « Arithmétique » puis « rem(p,q) » (le reste de la division de p par q).',
			'Tape le dividende, [[right]], le diviseur, puis [[exe]] : rem(50,45) donne 5.',
			'Pour le quotient, même menu, « quo(p,q) » : quo(50,45) donne 1.'
		],
		note: 'Les « … » à droite d’une fraction donnent la division de la fraction simplifiée (50/45 devient 10/9), pas celle de 50 par 45.',
		sources: [
			manual('outils/', 'Arithmétique : rem, quo'),
			sourceCode(TOOLBOX_LABELS, 'Arithmétique')
		],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'fraction-to-decimal',
		app: 'Calculs',
		steps: [
			'Tape 3 [[divide]] 4, puis [[exe]].',
			'La ligne montre la fraction 3/4 et, en gris, sa valeur décimale 0.75.'
		],
		note: 'La NumWorks écrit les décimaux avec un point : 0.75, pas 0,75.',
		sources: [manual('calculs/', '§1.1.1')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'last-answer',
		app: 'Calculs',
		steps: [
			'[[ans]] insère le dernier résultat dans le calcul.',
			'Sur une ligne vide, [[plus]], [[times]] ou [[divide]] reprend directement le dernier résultat : [[plus]] 5 [[exe]] ajoute 5 au résultat précédent.',
			'Pour un résultat plus ancien : remonte avec [[up]] jusqu’à lui, puis [[ok]].'
		],
		note: 'Sur une ligne vide, la touche − commence un nombre négatif : elle ne reprend pas le résultat.',
		sources: [manual('calculs/', '§1.1.2, §1.1.3')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'percentage',
		app: 'Calculs',
		steps: [
			'Le signe % s’obtient avec [[alpha]] puis [[del]].',
			'80 [[times]] 20 % [[exe]] donne 16 : c’est 20 % de 80.',
			'80 [[plus]] 20 % [[exe]] donne 96 : la calculatrice augmente 80 de 20 % (elle affiche 80↗20%).',
			'Pour une proportion, divise : 12 [[divide]] 48 [[exe]] donne 1/4 = 0.25, soit 25 %.'
		],
		note: '80 + 20 % ne donne pas 80,2 : c’est une hausse de 20 %.',
		sources: [
			sourceCode(KEYBOARD_LAYOUT, 'couche alpha : % sur la touche ⌫'),
			sourceCode(PERCENT_TESTS, 'l. 372-391')
		],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'round-display',
		app: 'Calculs',
		steps: [
			'Appuie sur [[toolbox]], choisis « Nombres décimaux » puis « round(x,n) » (arrondi à n décimales).',
			'Tape le nombre, [[right]], le nombre de décimales, puis [[exe]] : round(8.6576,2) donne 8.66.',
			'n = 0 arrondit à l’unité, n = 1 au dixième, n = 2 au centième.'
		],
		sources: [manual('outils/', 'round'), sourceCode(TOOLBOX_LABELS, 'Rounding')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},

	// ----- 5e -----
	{
		taskId: 'negative-number',
		app: 'Calculs',
		steps: [
			'Il n’y a qu’une touche moins : [[minus]] sert pour la soustraction et pour un nombre négatif.',
			'En début de ligne, [[minus]] 3 [[times]] 4 [[exe]] donne −12.',
			'Au milieu d’un calcul, entoure le nombre négatif de parenthèses : 5 [[times]] [[lparen]] [[minus]] 3 [[rparen]] [[exe]] donne −15.'
		],
		note: 'Sur une ligne vide, − commence un nombre négatif alors que + reprend le résultat précédent.',
		sources: [manual('calculs/', '§1.1.2 : une seule touche « moins »')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'parentheses-priorities',
		app: 'Calculs',
		steps: [
			'Tape [[lparen]] 2 [[plus]] 3 [[rparen]] [[times]] 4 puis [[exe]] : 20.',
			'Sans parenthèses, 2 [[plus]] 3 [[times]] 4 donne 14 : la multiplication passe d’abord.'
		],
		sources: [manual('calculs/', '§1.1.1')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'fraction-input',
		app: 'Calculs',
		steps: [
			'Tape le numérateur, puis [[divide]] : le curseur passe au dénominateur.',
			'Tape le dénominateur, puis [[right]] pour sortir de la fraction avant de continuer.',
			'Exemple : 1 [[divide]] 2 [[right]] [[plus]] 1 [[divide]] 3 [[right]] [[plus]] 1 [[exe]] donne 11/6.',
			'Le résultat exact est donné en fraction irréductible : 12 [[divide]] 18 [[exe]] donne 2/3.'
		],
		note: 'Sans la flèche droite, la suite du calcul reste au dénominateur.',
		sources: [
			manual('calculs/', '§1.1.1 : résultat irréductible'),
			manual('parametres/', 'Format écriture : Naturelle')
		],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'square-cube',
		app: 'Calculs',
		steps: [
			'Carré : tape le nombre puis [[square]] : 3 [[square]] [[exe]] donne 9.',
			'Autre puissance : [[pow]] puis l’exposant : 2 [[pow]] 5 [[exe]] donne 32.',
			'Pour continuer après l’exposant, sors-en avec [[right]] : 2 [[pow]] 3 [[right]] [[plus]] 1 [[exe]] donne 9.'
		],
		sources: [sourceCode(KEYBOARD_LAYOUT, 'xʸ insère ^, x² insère ^2')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'pi',
		app: 'Calculs',
		steps: [
			'[[pi]] insère π : [[pi]] [[times]] 3 [[square]] [[exe]] donne l’aire d’un disque de rayon 3.',
			'Le résultat exact garde π (9π) ; la valeur approchée est en gris (28.27433388).'
		],
		sources: [sourceCode(KEYBOARD_LAYOUT, 'touche π'), manual('calculs/', '§1.1.1')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'table-of-values',
		app: 'Grapheur',
		steps: [
			'Dans l’onglet « Expressions », choisis « Ajouter un élément » et appuie sur [[ok]].',
			'Tape la formule ; [[xnt]] écrit x. Exemple : 3 [[xnt]] [[plus]] 2, puis [[ok]].',
			'Choisis « Afficher les valeurs » en bas de l’écran, puis [[ok]] : le tableau commence à x = 0, de 1 en 1.',
			'Pour une valeur précise, tape-la dans la colonne x, puis [[ok]].'
		],
		sources: [
			manual('grapheur/', '§2.1, §2.4'),
			sourceCode('epsilon/apps/graph/i18n/base.fr.i18n')
		],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'mean',
		app: 'Statistiques',
		steps: [
			'Dans l’onglet « Données », tape chaque valeur dans « Valeurs V1 », suivie de [[ok]].',
			'Dans « Effectifs N1 », remplace les 1 par les effectifs.',
			'Appuie sur [[back]] pour remonter aux onglets, choisis « Stats » avec [[right]], puis [[ok]].',
			'Lis « Moyenne » ; « Effectif total » donne la somme des effectifs.'
		],
		sources: [
			manual('statistiques/', 'Entrer les données, onglet Stats'),
			sourceCode(STATISTICS_LABELS)
		],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'percentage-evolution-5',
		app: 'Calculs',
		steps: [
			'Prendre t % d’une quantité : 250 [[times]] 30 % puis [[exe]] donne 75 (% s’écrit [[alpha]] [[del]]).',
			'Augmenter de t % : 250 [[plus]] 30 % [[exe]] donne 325.',
			'Diminuer de t % : 250 [[minus]] 30 % [[exe]] donne 175.'
		],
		note: 'Avec + ou −, le % calcule une hausse ou une baisse, pas une addition.',
		sources: [
			sourceCode(KEYBOARD_LAYOUT, 'couche alpha : %'),
			sourceCode(PERCENT_TESTS, 'l. 372-391')
		],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},

	// ----- 4e -----
	{
		taskId: 'relative-products',
		app: 'Calculs',
		steps: [
			'Entoure chaque nombre négatif de parenthèses : [[lparen]] [[minus]] 3 [[rparen]] [[times]] [[lparen]] [[minus]] 4 [[rparen]] [[exe]] donne 12.',
			'Division : [[lparen]] [[minus]] 12 [[rparen]] [[divide]] 4 [[exe]] donne −3.'
		],
		sources: [manual('calculs/', '§1.1.2')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'fraction-simplify',
		app: 'Calculs',
		steps: [
			'Tape la fraction, 12 [[divide]] 18, puis [[exe]] : la calculatrice la rend irréductible, 2/3.',
			'Inverse : [[lparen]] 2 [[divide]] 3 [[right]] [[rparen]] [[pow]] [[minus]] 1 [[exe]] donne 3/2.'
		],
		sources: [manual('calculs/', '§1.1.1')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'square-root',
		app: 'Calculs',
		steps: [
			'[[sqrt]] ouvre une racine : ce que tu tapes ensuite va dessous.',
			'Pythagore : [[sqrt]] 3 [[square]] [[plus]] 4 [[square]] [[exe]] donne 5. N’appuie sur [[right]] qu’après avoir tout tapé sous la racine.',
			'Le résultat exact peut garder une racine (√8 donne 2√2) ; la valeur approchée est en gris.'
		],
		note: 'Une flèche droite après 3² ferme la racine : on obtiendrait √(3²)+4² = 19.',
		sources: [sourceCode(KEYBOARD_LAYOUT, 'touche √'), manual('calculs/', '§1.1.1')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'multiplier-coefficient',
		app: 'Calculs',
		steps: [
			'Augmenter de t % : multiplie par 1 + t/100. Pour +20 % : 80 [[times]] 1.2 [[exe]] donne 96.',
			'Diminuer de t % : multiplie par 1 − t/100. Pour −15 % : 80 [[times]] 0.85 [[exe]] donne 68.',
			'Raccourci : 80 [[plus]] 20 % donne aussi 96 (% s’écrit [[alpha]] [[del]]).'
		],
		sources: [sourceCode(PERCENT_TESTS, 'l. 372-391')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'median-range',
		app: 'Statistiques',
		steps: [
			'Onglet « Données » : les valeurs dans « Valeurs V1 », les effectifs dans « Effectifs N1 », chacun suivi de [[ok]].',
			'Appuie sur [[back]], choisis l’onglet « Stats » avec [[right]], puis [[ok]].',
			'Lis « Moyenne » (déjà pondérée par les effectifs), « Médiane » et « Etendue » ; descends avec [[down]].'
		],
		sources: [manual('statistiques/'), sourceCode(STATISTICS_LABELS)],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'random-simulation',
		app: 'Calculs',
		steps: [
			'Appuie sur [[toolbox]], choisis « Probabilités », puis « Aléatoire ».',
			'« randint(a,b) » donne un entier au hasard entre a et b : 1 [[right]] 6 [[exe]] simule un lancer de dé.',
			'« random() » donne un nombre décimal au hasard dans [0;1[.',
			'Sur une ligne vide, [[exe]] refait le dernier calcul : un nouveau tirage à chaque appui.'
		],
		sources: [manual('outils/', 'Aléatoire'), sourceCode(TOOLBOX_LABELS, 'Aléatoire')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'equation-by-table',
		app: 'Grapheur',
		steps: [
			'Définis la fonction : « Ajouter un élément », [[ok]], la formule avec [[xnt]], puis [[ok]].',
			'Choisis « Afficher les valeurs » et repère entre quelles valeurs de x f(x) franchit la valeur cherchée.',
			'Remonte avec [[up]] jusqu’à « Régler l’intervalle », en haut, puis [[ok]].',
			'Tape X début, X fin et le pas (par exemple 2, 3 et 0.1), chacun suivi de [[ok]], puis [[ok]] sur « Valider ».',
			'Recommence avec un pas dix fois plus petit pour affiner.'
		],
		sources: [
			manual('grapheur/', '§2.4.1'),
			sourceCode(SHARED_LABELS, 'IntervalSet, XStart, XEnd, Step')
		],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},

	// ----- 3e -----
	{
		taskId: 'negative-exponents',
		app: 'Calculs',
		steps: [
			'[[pow]], puis [[minus]] et l’exposant : 2 [[pow]] [[minus]] 3 [[exe]] donne 1/8 = 0.125.',
			'10 [[pow]] [[minus]] 2 [[exe]] donne 1/100 = 0.01.',
			'Sors de l’exposant avec [[right]] avant de continuer le calcul.'
		],
		sources: [sourceCode(KEYBOARD_LAYOUT, 'xʸ insère ^')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'scientific-notation',
		app: 'Calculs',
		steps: [
			'Pour saisir 3×10⁻⁴ : 3 [[ee]] [[minus]] 4 ; la touche [[ee]] écrit ×10 et place l’exposant.',
			'Les très grands et très petits résultats s’affichent en ×10ⁿ : 20000000 × 3000000 donne 6×10¹³.',
			'Pour tout afficher en notation scientifique : [[home]], « Paramètres », « Format résultat », « Scientifique » ; sci apparaît en haut à gauche.'
		],
		sources: [
			releaseNotes(24, 'affichage 123×10³'),
			manual('parametres/', 'Format résultat'),
			sourceCode(KEYBOARD_LAYOUT, 'la touche ×10ˣ insère ᴇ')
		],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'prime-factorization',
		app: 'Calculs',
		steps: [
			'Appuie sur [[toolbox]], choisis « Arithmétique » puis « factor(n) ».',
			'Tape l’entier puis [[exe]] : factor(360) donne 2³×3²×5.'
		],
		sources: [manual('outils/', 'factor'), sourceCode(TOOLBOX_LABELS, 'Arithmétique')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'trigonometry-degrees',
		app: 'Calculs',
		steps: [
			'Regarde l’unité d’angle en haut à gauche de l’écran : la calculatrice est en « rad » au départ.',
			'Pour passer en degrés : [[home]], « Paramètres », « Unité d’angle », « Degrés », [[ok]] ; deg s’affiche en haut à gauche.',
			'Dans Calculs : [[cos]] 60 [[exe]] donne 1/2 ; [[sin]] et [[tan]] de même.',
			'Pour retrouver l’angle : [[shift]] [[cos]] (arccos), [[shift]] [[sin]] (arcsin) ou [[shift]] [[tan]] (arctan) : arccos(0.5) donne 60.'
		],
		note: 'Réglée en radians, cos(60) ne donne pas 1/2 : regarde toujours deg ou rad en haut à gauche.',
		sources: [
			manual('parametres/', 'Unité d’angle'),
			sourceCode(KEYBOARD_LAYOUT, 'shift sin/cos/tan = arcsin/arccos/arctan')
		],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'linear-function-image',
		app: 'Grapheur',
		steps: [
			'« Ajouter un élément », [[ok]], tape la formule (3 [[xnt]] [[plus]] 2), puis [[ok]] : la calculatrice l’appelle f.',
			'Image d’un nombre : « Afficher les valeurs », tape le nombre dans la colonne x, puis [[ok]].',
			'Ou dans Calculs : tape f(4) puis [[exe]] (f s’écrit [[alpha]] puis la touche marquée F) : 14.'
		],
		sources: [manual('grapheur/', '§2.1, §2.4'), manual('variables/')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'quartiles-college',
		app: 'Statistiques',
		steps: [
			'Onglet « Données » : les valeurs dans « Valeurs V1 », les effectifs dans « Effectifs N1 ».',
			'Appuie sur [[back]], choisis l’onglet « Stats » avec [[right]], puis [[ok]].',
			'Lis « Premier quartile », « Médiane » et « Troisième quartile » ; descends avec [[down]].'
		],
		note: 'Le pays est réglé sur France au départ : Q1 et Q3 sont des valeurs de la série, comme en cours.',
		sources: [manual('statistiques/'), sourceCode(STATISTICS_LABELS)],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'percentage-evolution-3',
		app: 'Calculs',
		steps: [
			'Taux d’évolution : [[lparen]] 150 [[minus]] 120 [[rparen]] [[divide]] 120 [[right]] [[times]] 100 [[exe]] donne 25, soit +25 %.',
			'Appliquer une évolution : multiplie par le coefficient multiplicateur (1.2 pour +20 %, 0.85 pour −15 %).',
			'Évolutions successives : 1.2 [[times]] 0.85 [[exe]] donne 1.02, soit +2 % au total.'
		],
		sources: [sourceCode(PERCENT_TESTS, 'l. 372-391')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},

	// ----- Seconde -----
	{
		taskId: 'exam-mode',
		app: 'Paramètres',
		steps: [
			'[[home]], « Paramètres », descends jusqu’à « Mode examen », puis [[ok]].',
			'Choisis « Activer le mode examen », [[ok]], puis « Valider » ([[right]] puis [[ok]]).',
			'Un chapeau de diplômé apparaît en haut de l’écran et la diode clignote : le mode examen est actif.',
			'Pour en sortir, branche la calculatrice à un ordinateur avec un câble USB et valide le message.'
		],
		note: 'Tes données sont cachées pendant l’examen ; depuis la version 24, elles reviennent à la sortie.',
		sources: [
			manual('parametres/', 'Mode examen'),
			releaseNotes(24, 'données rendues à la sortie'),
			sourceCode('epsilon/apps/settings/i18n/base.fr.i18n', 'ToDeactivateExamMode')
		],
		verifiedOnDevice: false
	},
	{
		taskId: 'settings',
		app: 'Paramètres',
		steps: [
			'[[home]], puis l’application « Paramètres ».',
			'« Unité d’angle » : Radians (au départ), Degrés ou Grades.',
			'« Format résultat » : Décimal, Scientifique ou Ingénieur, et les « Chiffres significatifs » (10 au départ).',
			'« Format écriture » : Naturelle (fractions et exposants dessinés) ou En ligne.',
			'« Forme complexe » : Réel, Algébrique ou Exponentielle.'
		],
		note: 'Il n’y a pas de réglage exact ou approché : Calculs montre toujours les deux.',
		sources: [manual('parametres/'), sourceCode('epsilon/apps/settings/i18n/base.fr.i18n')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'define-function',
		app: 'Grapheur',
		steps: [
			'Onglet « Expressions », « Ajouter un élément », [[ok]] ; le bouton « Modèles » propose des formules toutes prêtes.',
			'Tape la formule ; [[xnt]] écrit x. Par exemple [[xnt]] [[square]] [[minus]] 4, puis [[ok]] : f(x)=x²−4.',
			'« Afficher les valeurs » ouvre le tableau ; « Régler l’intervalle », en haut, fixe X début, X fin et le pas.'
		],
		sources: [manual('grapheur/', '§2.1, §2.4'), releaseNotes(23, 'Modèles')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'plot-function',
		app: 'Grapheur',
		steps: [
			'Dans « Expressions », choisis « Tracer le graphique » puis [[ok]].',
			'En haut : « Auto » cadre la courbe tout seul ; « Axes » règle les valeurs de X et de Y (minimum, maximum, pas).',
			'Sur le graphique, [[plus]] zoome et [[minus]] dézoome ; « Naviguer » déplace la fenêtre avec les flèches.',
			'[[left]] et [[right]] déplacent le point le long de la courbe.'
		],
		sources: [manual('grapheur/', '§2.3.2, §2.3.3'), releaseNotes(24, 'pas des graduations')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'graph-analysis',
		app: 'Grapheur',
		steps: [
			'Image : sur le graphique, tape la valeur de x puis [[ok]] ; f(x) s’affiche en bas.',
			'Appuie sur [[ok]] : le menu « Calcul sur f(x) » s’ouvre, choisis « Rechercher ».',
			'Choisis « Antécédent », « Maximum », « Minimum » ou « Zéros » ; avec deux courbes, aussi « Point d’intersection ».',
			'Le résultat s’affiche en bas de l’écran ; le point cherché doit être dans la fenêtre.'
		],
		sources: [
			manual('grapheur/', '§2.3.4 à §2.3.7'),
			sourceCode('epsilon/apps/graph/i18n/base.fr.i18n')
		],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'one-variable-stats',
		app: 'Statistiques',
		steps: [
			'Onglet « Données » : les valeurs dans « Valeurs V1 », les effectifs dans « Effectifs N1 ».',
			'Appuie sur [[back]], choisis l’onglet « Stats » avec [[right]], puis [[ok]].',
			'Lis « Moyenne », « Ecart type », « Premier quartile », « Médiane », « Troisième quartile » ; descends avec [[down]].',
			'Onglet « Graphique » : « Histogramme » ou « Boîte à moustaches ».'
		],
		note: 'Prends « Ecart type » (σ), pas « Ecart type échantillon ».',
		sources: [manual('statistiques/'), sourceCode(STATISTICS_LABELS)],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'evolution-rates',
		app: 'Calculs',
		steps: [
			'Évolutions successives : multiplie les coefficients : 1.2 [[times]] 0.85 [[exe]] donne 1.02, soit +2 % au total.',
			'Évolution réciproque : 1 [[divide]] 1.25 [[exe]] donne 0.8 : il faut baisser de 20 % pour annuler une hausse de 25 %.'
		],
		sources: [manual('calculs/', '§1.1.1')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'python-basics',
		app: 'Python',
		steps: [
			'[[home]], « Python » : la liste des scripts s’affiche.',
			'« Ajouter un script », [[ok]], tape le nom puis [[ok]] : l’éditeur s’ouvre.',
			'Dans l’éditeur : [[alpha]] puis une touche pour une lettre ; [[toolbox]] propose les boucles, les tests et les fonctions.',
			'Pour exécuter : reviens à la liste avec [[back]], choisis les « … » à droite du script, puis « Exécuter le script ».',
			'Ou bien « Console d’exécution », en bas de la liste : les scripts y sont importés ; tape f(3) puis [[exe]].',
			'Pour arrêter un script qui tourne : [[back]].'
		],
		note: 'Dans le Python de la calculatrice, log(x) est le logarithme népérien.',
		sources: [manual('python/', '§3.1 à §3.4'), sourceCode('epsilon/apps/code/i18n/base.fr.i18n')],
		verifiedOnDevice: false
	},

	// ----- 1re enseignement scientifique -----
	{
		taskId: 'real-power',
		app: 'Calculs',
		steps: [
			'aˣ pour x réel : a [[pow]] x [[exe]] ; 2 [[pow]] 0.5 [[exe]] donne ≈ 1.414213562.',
			'Racine n-ième : [[toolbox]], « Racine n-ième » ; le curseur est sous la racine.',
			'[[left]] passe à l’indice : tape n, [[right]], puis le nombre et [[exe]] : la racine cubique de 8 donne 2.'
		],
		sources: [manual('outils/', 'root(x,n)'), sourceCode(TOOLBOX_LABELS, 'NthRoot')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'average-rate',
		app: 'Calculs',
		steps: [
			'Taux moyen sur n périodes, pour un coefficient global C : C [[pow]] 1 [[divide]] n, puis [[right]] [[right]] pour sortir de la fraction et de l’exposant, [[minus]] 1, [[exe]].',
			'Exemple, +30 % en 5 ans : [[lparen]] 1.3 [[rparen]] [[pow]] 1 [[divide]] 5 [[right]] [[right]] [[minus]] 1 [[exe]] donne ≈ 0.0539, soit environ +5,4 % par an.'
		],
		note: 'Vérifie que le −1 n’est pas resté dans l’exposant.',
		sources: [manual('outils/', 'root(x,n)'), sourceCode(KEYBOARD_LAYOUT, 'xʸ insère ^')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'sequence-terms-gen',
		app: 'Suites',
		steps: [
			'« Ajouter une suite », [[ok]], puis « Explicite » (uₙ).',
			'Tape la formule ; [[xnt]] écrit n. Exemple : 3 [[times]] 2 [[pow]] [[xnt]], puis [[ok]].',
			'« Afficher les valeurs » : le tableau des termes, à partir de n = 0.',
			'Pour un seuil : descends dans le tableau avec [[down]] jusqu’au premier terme qui dépasse la valeur.'
		],
		sources: [manual('suites/'), sourceCode(SEQUENCE_LABELS)],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'regression-gen',
		app: 'Régressions',
		steps: [
			'Onglet « Données » : les x dans X1, les y dans Y1, chacun suivi de [[ok]].',
			'Appuie sur [[back]], choisis l’onglet « Graphique » avec [[right]], puis [[ok]] : le nuage s’affiche.',
			'Appuie sur [[ok]], choisis « Affine » (y = ax+b) : la droite s’affiche et le point moyen (x̄ ; ȳ) en bas de l’écran.',
			'[[ok]] à nouveau : l’équation de la droite, r et r².'
		],
		note: '« Affine » est y = ax+b ; « Linéaire » est y = ax, sans b.',
		sources: [
			manual('regressions/'),
			releaseNotes(23, 'Linéaire renommé Affine'),
			sourceCode(REGRESSION_LABELS, 'MeanDot, Linear')
		],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},

	// ----- 1re spécialité -----
	{
		taskId: 'sequences',
		app: 'Suites',
		steps: [
			'« Ajouter une suite », [[ok]], choisis le type : « Explicite » (uₙ), « Récurrente d’ordre 1 » (uₙ₊₁) ou d’ordre 2.',
			'Récurrente : la case contient déjà uₙ ; efface-la avec [[shift]] [[del]], tape la formule (uₙ est dans [[toolbox]]), puis [[ok]].',
			'Premier terme : u₀ vaut 1 au départ. Sélectionne la suite, [[ok]], [[down]] pour descendre sur u₀, [[del]], tape la valeur, puis [[ok]].',
			'« Afficher les valeurs » : le tableau ; « Tracer le graphique » : le nuage de points.',
			'Pour commencer à u₁ : les « … » à droite de la suite, « Indice premier terme ».'
		],
		sources: [
			manual('suites/'),
			releaseNotes(25, 'Notation de suite'),
			sourceCode('epsilon/apps/shared/sequence.cpp', 'Sequence::setType : uₙ et u₀ = 1 par défaut')
		],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'sequence-limit',
		app: 'Suites',
		steps: [
			'Définis la suite, puis choisis « Afficher les valeurs ».',
			'En haut, « Régler l’intervalle », [[ok]] : N début 0, N fin 500 et Pas 100 par exemple, chacun suivi de [[ok]], puis « Valider ».',
			'Lis vers quelle valeur les termes se stabilisent.',
			'Pour une suite récurrente : sur le graphique, [[ok]], « Graphique en escalier ».'
		],
		note: 'Une valeur affichée arrondie ne prouve pas la limite : c’est une conjecture.',
		sources: [manual('suites/', '§7.3.5, §7.4'), sourceCode(SEQUENCE_LABELS)],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'threshold-python',
		app: 'Python',
		steps: [
			'Crée un script (« Ajouter un script ») et écris une fonction : une boucle while calcule les termes tant qu’ils ne franchissent pas le seuil, puis return n.',
			'while, def et return se trouvent dans [[toolbox]].',
			'Exécute le script, puis, dans la console, appelle la fonction (par exemple seuil(1000)) et [[exe]].'
		],
		sources: [manual('python/', '§3.1 à §3.4')],
		verifiedOnDevice: false
	},
	{
		taskId: 'derivative-tangent',
		app: 'Grapheur',
		steps: [
			'Sur le graphique : [[ok]], « Options », « Dérivées », puis active « Valeur dérivée 1ère » avec [[ok]].',
			'Reviens au graphique avec [[back]] : f’(x) s’affiche en bas, à côté de x et f(x).',
			'Tangente : tape l’abscisse du point, [[ok]], puis [[ok]], « Rechercher », « Tangente » : y = ax+b s’affiche en bas avec a et b.',
			'En calcul : [[toolbox]], « Analyse », « Dérivée » : tape f(x), appuie trois fois sur [[right]] pour aller après x=, tape le nombre, [[exe]].'
		],
		note: 'Le manuel v20 parle de « Nombre dérivé » : depuis la version 23, c’est le sous-menu « Dérivées ».',
		sources: [
			manual('grapheur/', '§2.3.6, §2.3.7'),
			releaseNotes(23, 'menu Dérivées'),
			sourceCode(SHARED_LABELS, 'FirstDerivativeValue')
		],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'quadratic-roots',
		app: 'Equations',
		steps: [
			'« Ajouter une équation », [[ok]], choisis « Vide », [[ok]].',
			'Tape le trinôme : [[xnt]] [[square]] [[minus]] 3 [[xnt]] [[plus]] 2 ; « =0 » s’ajoute tout seul. Valide avec [[ok]].',
			'Descends avec [[down]] jusqu’à « Résoudre l’équation », puis [[ok]] : les racines exactes et le discriminant Δ s’affichent.'
		],
		note: 'Sans racine réelle, la calculatrice écrit « Le polynôme n’admet pas de racine réelle ».',
		sources: [manual('equations/'), sourceCode('epsilon/apps/solver/i18n/base.fr.i18n')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'random-variable',
		app: 'Statistiques',
		steps: [
			'Dans « Valeurs V1 », les valeurs xᵢ ; dans « Effectifs N1 », les probabilités pᵢ (les décimaux sont acceptés).',
			'Appuie sur [[back]], choisis l’onglet « Stats » avec [[right]], puis [[ok]].',
			'« Moyenne » donne E(X), « Ecart type » σ(X) et « Variance » V(X).'
		],
		note: 'Vérifie que « Effectif total » vaut 1.',
		sources: [manual('statistiques/', 'fréquences dans la colonne Effectifs')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'exponential',
		app: 'Calculs',
		steps: [
			'[[exp]] écrit e avec une case d’exposant : [[exp]] 1 [[exe]] donne e ≈ 2.718281828.',
			'Sors de l’exposant avec [[right]] : [[exp]] 2 [[right]] [[times]] [[exp]] 3 [[exe]] donne e⁵.',
			'Pour tracer x ↦ eˣ : dans Grapheur, [[exp]] [[xnt]].'
		],
		sources: [sourceCode(KEYBOARD_LAYOUT, 'touche eˣ')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'radians',
		app: 'Calculs',
		steps: [
			'Au départ, les angles sont en radians : « rad » en haut à gauche.',
			'[[cos]] [[pi]] [[divide]] 3 [[exe]] donne 1/2.',
			'Si deg s’affiche : [[home]], « Paramètres », « Unité d’angle », « Radians ».'
		],
		sources: [manual('parametres/', 'Unité d’angle'), releaseNotes(21, 'avertissement d’unité')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'python-lists',
		app: 'Python',
		steps: [
			'Dans la console ou un script : L=[1,2] ; [ et ] s’écrivent [[shift]] [[exp]] et [[shift]] [[ln]].',
			'L.append(5) ajoute 5 à la fin : L vaut alors [1, 2, 5].',
			'len(L) donne la longueur, L[0] le premier élément.'
		],
		note: 'En Python, le premier élément a l’indice 0.',
		sources: [manual('python/'), sourceCode(KEYBOARD_LAYOUT, 'shift eˣ = [, shift ln = ]')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'loan-annuity',
		app: 'Finance',
		steps: [
			'[[home]], « Finance », « Intérêts composés », [[ok]].',
			'Choisis la valeur cherchée : « Pmt » pour une mensualité, « FV » pour un capital final, puis [[ok]].',
			'Remplis N (nombre de paiements), r% (taux annuel), PV (montant de départ), FV, chacun suivi de [[ok]] ; P/Y et C/Y valent 12 au départ. Puis « Valider ».',
			'Exemple : 10000 empruntés à 3 % sur 60 mois, FV = 0 : Pmt vaut −179.69 (le signe − indique de l’argent versé).'
		],
		sources: [sourceCode('epsilon/apps/finance/i18n/base.fr.i18n')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},

	// ----- 1re technologique -----
	{
		taskId: 'sequence-terms-techno',
		app: 'Suites',
		steps: [
			'« Ajouter une suite », [[ok]], choisis le type ; tape la formule ([[xnt]] écrit n), puis [[ok]].',
			'« Afficher les valeurs » : le tableau des termes.',
			'« Tracer le graphique » : le nuage de points (n ; uₙ).',
			'Seuil : descends dans le tableau avec [[down]] jusqu’au premier terme qui franchit la valeur.'
		],
		sources: [manual('suites/')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'scan-solution',
		app: 'Grapheur',
		steps: [
			'Définis la fonction, puis « Afficher les valeurs » : repère où f(x) change de signe (ou franchit la valeur cherchée).',
			'Remonte avec [[up]] jusqu’à « Régler l’intervalle », [[ok]] : X début et X fin encadrent la solution, Pas = 0.1 ; puis « Valider ».',
			'Recommence avec un pas de 0.01 pour un encadrement plus fin.'
		],
		sources: [manual('grapheur/', '§2.4.1')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'derivative-techno',
		app: 'Grapheur',
		steps: [
			'Sur le graphique : [[ok]], « Options », « Dérivées », « Valeur dérivée 1ère » ; [[back]] : f’(x) s’affiche en bas.',
			'Tangente : tape l’abscisse, [[ok]], puis [[ok]], « Rechercher », « Tangente » : a et b de y = ax+b en bas.',
			'Extremums : [[ok]], « Rechercher », « Maximum » ou « Minimum ».'
		],
		sources: [manual('grapheur/', '§2.3.6, §2.3.7'), releaseNotes(23, 'menu Dérivées')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'regression-techno',
		app: 'Régressions',
		steps: [
			'Onglet « Données » : les x dans X1, les y dans Y1.',
			'[[back]], onglet « Graphique », [[ok]] ; [[ok]], « Affine » : la droite et le point moyen s’affichent.',
			'[[ok]] : l’équation y = ax+b. Pour interpoler : « Prédiction sachant X », tape x, [[ok]], puis « Valider » : ŷ s’affiche en bas.'
		],
		sources: [manual('regressions/'), sourceCode(REGRESSION_LABELS, 'XPrediction')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'expectation-techno',
		app: 'Calculs',
		steps: [
			'{ et } s’écrivent [[shift]] [[log]] et [[shift]] [[i]] ; la flèche → est [[shift]] [[pow]].',
			'Range les valeurs : {0,1,2} → X, puis [[exe]] (X capitale : [[shift]] [[alpha]] puis la touche de la lettre).',
			'Range les probabilités : {0.25,0.5,0.25} → P, puis [[exe]].',
			'Tape sum(X×P) puis [[exe]] : l’espérance (ici 1).'
		],
		note: 'Autre méthode : l’application Statistiques, probabilités dans « Effectifs N1 », puis « Moyenne ».',
		sources: [
			manual('calculs/', '§1.5 : listes'),
			sourceCode(KEYBOARD_LAYOUT, 'shift log = {, shift i = }')
		],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'bernoulli-simulation',
		app: 'Calculs',
		steps: [
			'[[toolbox]], « Probabilités », « Aléatoire », « random() », puis < 0.3 ([[shift]] [[sqrt]] écrit <) et [[exe]].',
			'Le résultat vaut True avec la probabilité 0,3 : True = succès, False = échec.',
			'Chaque [[exe]] sur une ligne vide refait un tirage.'
		],
		note: 'randint(0,1) simule une loi de Bernoulli de paramètre 0,5.',
		sources: [manual('outils/', 'Aléatoire'), sourceCode(KEYBOARD_LAYOUT, 'shift √ = <')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},

	// ----- Terminale spécialité -----
	{
		taskId: 'natural-log',
		app: 'Calculs',
		steps: [
			'[[ln]] écrit ln( ) : [[ln]] 2 [[exe]] donne ≈ 0.6931471806.',
			'[[ln]] [[exp]] 2 [[exe]] donne 2 : ln et exp sont réciproques.',
			'Attention : [[log]] est le logarithme décimal, log(1000) donne 3.'
		],
		sources: [sourceCode(KEYBOARD_LAYOUT, 'touches ln et log'), manual('outils/')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'factorial-combinations',
		app: 'Calculs',
		steps: [
			'[[toolbox]], « Probabilités », « Dénombrement ».',
			'« Combinaison de k parmi n » : tape n, [[down]], k, puis [[exe]] : 2 parmi 5 donne 10.',
			'« Factorielle » donne n! ; au clavier, ! s’écrit [[alpha]] [[dot]] : 5! donne 120.'
		],
		sources: [
			manual('outils/', 'Dénombrement'),
			sourceCode(TOOLBOX_LABELS, 'Dénombrement'),
			sourceCode('shared/ion/include/ion/keyboard/epsilon/ion/keys.inc', 'l. 41-43')
		],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'binomial',
		app: 'Probabilités',
		steps: [
			'« Binomiale », [[ok]].',
			'Tape n (nombre de répétitions) puis p (probabilité de succès), chacun suivi de [[ok]], puis « Suivant ».',
			'Le calcul affiche P(X≤a) : tape a puis [[ok]].',
			'Pour P(X=a), P(a≤X≤b) ou P(X≥a) : [[left]] jusqu’à l’icône de la loi, [[ok]], choisis la forme.',
			'En calcul : [[toolbox]], « Probabilités », « Lois de probabilité », « Binomiale » : binompdf(m,n,p), binomcdf(m,n,p), binomcdfrange(a,b,n,p).'
		],
		sources: [
			manual('probabilites/'),
			manual('outils/', 'Loi binomiale'),
			sourceCode(FUNCTION_NAMES, 'l. 115 : binomcdfrange(a,b,n,p)')
		],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'binomial-inverse',
		app: 'Probabilités',
		steps: [
			'« Binomiale », tape n et p, « Suivant ».',
			'Va sur la case du résultat avec [[right]], tape le seuil (0.95), [[ok]] : la borne k s’affiche (9 pour n = 20 et p = 0.3).',
			'En calcul : invbinom(0.95,20,0.3) donne 9 ([[toolbox]], « Probabilités », « Lois de probabilité », « Binomiale »).'
		],
		note: 'k est le plus petit entier tel que P(X≤k) atteint le seuil.',
		sources: [
			manual('probabilites/', 'Calculer l’inverse d’une probabilité'),
			sourceCode('poincare/test/approximation/probability.cpp', 'l. 13-18')
		],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'threshold-tspe',
		app: 'Suites',
		steps: [
			'Définis la suite, puis « Afficher les valeurs ».',
			'Descends avec [[down]] jusqu’au premier terme qui franchit le seuil : le n de cette ligne est la réponse.',
			'Pour aller plus vite : « Régler l’intervalle » avec un grand pas, puis affine autour du seuil.'
		],
		note: 'Pour un programme, voir « Chercher un seuil avec Python ».',
		sources: [manual('suites/', '§7.4')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'sequence-limit-tspe',
		app: 'Suites',
		steps: [
			'Définis la suite, « Afficher les valeurs ».',
			'« Régler l’intervalle » : un grand N fin et un grand pas (0, 500, 100), puis « Valider ».',
			'Observe vers quoi les termes se stabilisent ; tu peux aussi taper un grand n dans la colonne n.'
		],
		note: 'Une valeur arrondie n’est pas une limite : c’est une conjecture à démontrer.',
		sources: [manual('suites/', '§7.4'), releaseNotes(22, '10 chiffres significatifs')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'integral',
		app: 'Grapheur',
		steps: [
			'Sur le graphique de f : [[ok]], « Rechercher », « Intégrale ».',
			'Tape la borne inférieure, [[ok]], puis la borne supérieure, [[ok]] : l’intégrale s’affiche en bas.',
			'En calcul : [[toolbox]], « Analyse », « Intégrale » : le curseur est sur la borne du bas ; tape a, [[up]], b, [[right]], f(x), puis [[exe]].'
		],
		sources: [manual('grapheur/', '§2.3.7'), sourceCode(TOOLBOX_LABELS, 'Integral')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},

	// ----- Maths expertes -----
	{
		taskId: 'complex-numbers',
		app: 'Calculs',
		steps: [
			'Réglage : [[home]], « Paramètres », « Forme complexe », « Algébrique » (a+bi) ou « Exponentielle ».',
			'[[i]] écrit i : [[lparen]] 2 [[plus]] 3 [[i]] [[rparen]] [[times]] [[lparen]] 1 [[minus]] [[i]] [[rparen]] [[exe]] donne 5+i.',
			'[[toolbox]], « Nombres complexes » : module |x|, arg(z), re(z), im(z), conjugué.',
			'Sur un résultat : [[up]], puis les « … » ([[right]], [[ok]]) : module, argument et forme exponentielle.'
		],
		note: 'Pas de forme trigonométrique : la forme exponentielle donne r et θ.',
		sources: [
			manual('calculs/', '§1.2, §1.3'),
			manual('parametres/', 'Forme complexe'),
			releaseNotes(22, 'forme polaire')
		],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'complex-roots',
		app: 'Equations',
		steps: [
			'Règle d’abord [[home]], « Paramètres », « Forme complexe », « Algébrique ».',
			'Dans Equations, tape le trinôme ([[xnt]] [[square]] [[plus]] [[xnt]] [[plus]] 1), [[ok]], puis « Résoudre l’équation ».',
			'Les deux racines complexes conjuguées s’affichent avec Δ.'
		],
		note: 'Réglée sur « Réel », la calculatrice répond « Le polynôme n’admet pas de racine réelle ».',
		sources: [manual('equations/'), manual('parametres/', 'Forme complexe')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'arithmetic',
		app: 'Calculs',
		steps: [
			'[[toolbox]], « Arithmétique » : gcd (PGCD), lcm (PPCM), factor (facteurs premiers), rem (reste), quo (quotient).',
			'Passe au second nombre avec [[right]] : gcd(12,18) donne 6.',
			'rem(−7,3) donne 2 : le reste est toujours positif.'
		],
		sources: [manual('outils/', 'Arithmétique'), sourceCode(TOOLBOX_LABELS, 'Arithmétique')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'modular',
		app: 'Calculs',
		noDedicatedFunction: true,
		steps: [
			'Utilise rem(a,n) : [[toolbox]], « Arithmétique », « rem(p,q) ».',
			'Pour 3¹⁰⁰ modulo 7 : 3 [[pow]] 100, [[right]] deux fois (sortir de l’exposant, passer au second nombre), 7, [[exe]] : 4.',
			'En Python, % est le modulo : 3**100 % 7 donne 4.'
		],
		note: 'pow(a,k,n) n’existe pas dans le Python de la NumWorks : il refuse le troisième argument.',
		sources: [manual('outils/', 'Arithmétique'), manual('python/')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'matrices',
		app: 'Calculs',
		steps: [
			'[[toolbox]], « Matrices et vecteurs », « Nouvelle matrice ou vecteur » : une matrice vide s’ouvre.',
			'Tape les coefficients : [[right]] passe à la colonne suivante ; pour la ligne suivante, [[down]] puis [[left]] jusqu’à la première colonne. Les cases grises en trop sont ignorées.',
			'Sors de la matrice avec [[right]], puis range-la : [[shift]] [[pow]] (→), une lettre capitale (A), [[exe]].',
			'Calcule : A [[pow]] [[minus]] 1 donne l’inverse, A [[square]] le carré, A×B le produit.'
		],
		sources: [
			manual('calculs/', '§1.4'),
			manual('outils/', 'Matrices et vecteurs'),
			manual('variables/')
		],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'markov',
		app: 'Calculs',
		steps: [
			'Range la matrice de transition dans P (voir « Matrices »).',
			'Tape l’état initial comme une matrice à une ligne : [[toolbox]], « Matrices et vecteurs », « Nouvelle matrice ou vecteur », 1 [[right]] 0, puis sors avec [[right]].',
			'Tape [[times]] P [[pow]] n, puis [[exe]] : la répartition après n étapes.'
		],
		sources: [manual('calculs/', '§1.4'), manual('outils/', 'Matrices et vecteurs')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},

	// ----- Maths complémentaires -----
	{
		taskId: 'recurrent-sequence-comp',
		app: 'Suites',
		steps: [
			'« Ajouter une suite », [[ok]], « Récurrente d’ordre 1 » ; efface uₙ ([[shift]] [[del]]), tape f(uₙ) (uₙ est dans [[toolbox]]), puis [[ok]].',
			'Change u₀ : sélectionne la suite, [[ok]], [[down]], [[del]], la valeur, [[ok]].',
			'« Afficher les valeurs » : observe si les termes montent, descendent ou se stabilisent.',
			'« Tracer le graphique », [[ok]], « Graphique en escalier ».'
		],
		sources: [manual('suites/', '§7.3.5'), sourceCode(SEQUENCE_LABELS)],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'log-exp-comp',
		app: 'Calculs',
		steps: [
			'[[ln]] écrit ln( ) ; [[exp]] écrit e avec une case d’exposant.',
			'[[ln]] 2 [[exe]] donne ≈ 0.6931471806 ; [[exp]] 1 [[exe]] donne e ≈ 2.718281828.',
			'[[log]] est le logarithme décimal, pas le népérien.'
		],
		sources: [sourceCode(KEYBOARD_LAYOUT, 'touches ln, log, eˣ')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'solve-approx-comp',
		app: 'Grapheur',
		steps: [
			'Définis f, puis « Tracer le graphique ».',
			'[[ok]], « Rechercher », « Antécédent » : tape la valeur de k, [[ok]], puis [[ok]] sur « Valider ».',
			'La solution x s’affiche en bas. S’il y en a plusieurs, celle trouvée dépend de la position du curseur : pour x² = 2, 1.414214 ou −1.414214.',
			'Pour encadrer : tableau de valeurs avec un pas de plus en plus petit (« Régler l’intervalle »).'
		],
		sources: [manual('grapheur/', '§2.3.5, §2.4.1')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'binomial-comp',
		app: 'Probabilités',
		steps: [
			'« Binomiale », [[ok]] ; tape n et p, chacun suivi de [[ok]], puis « Suivant ».',
			'Tape a puis [[ok]] : P(X≤a) ; l’icône à gauche ([[left]], [[ok]]) donne aussi P(X=a), P(a≤X≤b), P(X≥a).',
			'En calcul : binomcdf(5,20,0.3) donne ≈ 0.4163708 ([[toolbox]], « Probabilités », « Lois de probabilité », « Binomiale »).'
		],
		sources: [manual('probabilites/'), manual('outils/', 'Loi binomiale')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'geometric-law',
		app: 'Calculs',
		steps: [
			'[[toolbox]], « Probabilités », « Lois de probabilité », « Géométrique ».',
			'geompdf(m,p) donne P(X=m), geomcdf(m,p) donne P(X≤m) : geomcdf(3,0.2) donne 0.488.'
		],
		note: 'X est le rang du premier succès (1, 2, 3…), comme en cours.',
		sources: [
			manual('outils/', 'Loi géométrique'),
			sourceCode(FUNCTION_NAMES, 'l. 154-156'),
			sourceCode('epsilon/apps/distributions/models/distribution/geometric_distribution.h')
		],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'exponential-law',
		app: 'Probabilités',
		steps: [
			'« Exponentielle », [[ok]] : tape λ, [[ok]], puis « Suivant ».',
			'Tape a puis [[ok]] : P(X≤a). λ = 0.5 et a = 2 donnent 0.6321206.',
			'En calcul : expcdf(m,λ) ([[toolbox]], « Probabilités », « Lois de probabilité », « Exponentielle ») : expcdf(2,0.5) donne la même valeur.'
		],
		note: 'expcdf n’existe qu’à partir de la version 26 ; l’application Probabilités marche aussi avant.',
		sources: [
			manual('probabilites/'),
			releaseNotes(26, 'lois dans la boîte à outils'),
			sourceCode(FUNCTION_NAMES, 'l. 134 : expcdf')
		],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'regression-comp',
		app: 'Régressions',
		steps: [
			'Onglet « Données » : X1 et Y1.',
			'[[back]], onglet « Graphique », [[ok]] ; [[ok]], « Affine ».',
			'[[ok]] : l’équation de la droite de régression, le coefficient de corrélation r et r².'
		],
		sources: [manual('regressions/'), sourceCode(REGRESSION_LABELS)],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'variable-change-comp',
		app: 'Régressions',
		steps: [
			'Données dans X1 et Y1. Remonte sur l’en-tête X2, [[ok]], « Remplir avec une formule », « Vide » : tape X1, [[ok]].',
			'En-tête Y2, même menu : tape ln(Y1) (Y capitale : [[shift]] [[alpha]] puis la touche de la lettre), [[ok]].',
			'En-tête X2, [[ok]], « Modèle », « Affine ».',
			'Onglet « Stats », colonne X2/Y2 : a, b et r de l’ajustement de ln(y) en fonction de x.'
		],
		note: 'Le modèle « Exponentiel » ajuste directement y = a·eᵇˣ sur X1/Y1.',
		sources: [manual('regressions/', 'remplir une colonne avec une formule')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'integral-comp',
		app: 'Grapheur',
		steps: [
			'Sur le graphique de f : [[ok]], « Rechercher », « Intégrale » ; tape la borne inférieure, [[ok]], la borne supérieure, [[ok]].',
			'En calcul : [[toolbox]], « Analyse », « Intégrale » : a, [[up]], b, [[right]], f(x), [[exe]].',
			'Valeur moyenne : divise l’intégrale par b − a.'
		],
		sources: [manual('grapheur/', '§2.3.7'), manual('outils/', 'Analyse')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},

	// ----- Terminale technologique -----
	{
		taskId: 'index-base-100',
		app: 'Calculs',
		steps: [
			'Indice = valeur ÷ valeur de référence × 100 : 138 [[divide]] 120 [[right]] [[times]] 100 [[exe]] donne 115.',
			'Taux d’évolution : indice − 100, ici +15 %.'
		],
		sources: [manual('calculs/', '§1.1.1')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'real-power-techno',
		app: 'Calculs',
		steps: [
			'aˣ : a [[pow]] x [[exe]].',
			'Taux moyen pour +30 % en 5 ans : [[lparen]] 1.3 [[rparen]] [[pow]] 1 [[divide]] 5 [[right]] [[right]] [[minus]] 1 [[exe]] donne ≈ 0.0539.'
		],
		note: 'Les deux flèches droites sortent de la fraction puis de l’exposant.',
		sources: [sourceCode(KEYBOARD_LAYOUT, 'xʸ insère ^')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'decimal-log',
		app: 'Calculs',
		steps: [
			'[[log]] est le logarithme décimal : log(1000) donne 3.',
			'Résoudre 2ˣ = 8 : [[log]] 8 [[right]] [[divide]] [[log]] 2 [[exe]] donne 3.',
			'Ou [[toolbox]], « Logarithme de base a » : tape la base, [[right]] deux fois, le nombre, [[exe]] : log₂(8) donne 3.'
		],
		note: 'En Python, log(x) est le logarithme népérien ; le décimal est log10(x).',
		sources: [
			sourceCode(KEYBOARD_LAYOUT, 'touche log'),
			manual('outils/', 'log(x,a)'),
			manual('python/', 'log10')
		],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'variable-change-techno',
		app: 'Régressions',
		steps: [
			'Données dans X1 et Y1. En-tête X2, [[ok]], « Remplir avec une formule », « Vide » : X1, [[ok]].',
			'En-tête Y2 : log(Y1) (ou ln(Y1)), [[ok]].',
			'En-tête X2, [[ok]], « Modèle », « Affine » ; l’onglet « Stats », colonne X2/Y2, donne a et b.'
		],
		sources: [manual('regressions/', 'remplir une colonne avec une formule')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		taskId: 'binomial-techno',
		app: 'Probabilités',
		steps: [
			'Coefficient binomial : dans Calculs, [[toolbox]], « Probabilités », « Dénombrement », « Combinaison de k parmi n » : n, [[down]], k, [[exe]].',
			'Loi binomiale : application Probabilités, « Binomiale », n et p, « Suivant ».',
			'Tape a puis [[ok]] : P(X≤a) ; l’icône à gauche donne P(X=a) et les autres formes.'
		],
		sources: [manual('probabilites/'), manual('outils/', 'Dénombrement')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	}
];

// ===== Pièges =====

const PITFALLS: readonly Pitfall[] = [
	{
		id: 'percent-addition',
		grade: '6',
		title: '80 + 20 % donne 96, pas 80,2',
		explanation:
			'Avec + ou −, le % calcule une hausse ou une baisse : 80+20% = 80×1,2 = 96 et 80−20% = 64. L’écran l’écrit 80↗20%.',
		sources: [sourceCode(PERCENT_TESTS, 'l. 372-391')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		id: 'decimal-point',
		grade: '6',
		title: 'Un point, pas une virgule',
		explanation:
			'La NumWorks écrit 0.75. La touche virgule sépare les nombres d’une fonction, comme dans round(8.6576,2).',
		sources: [manual('calculs/', 'exemples du manuel')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		id: 'euclidean-division-reduced',
		grade: '6',
		title: 'Les « … » divisent la fraction simplifiée',
		explanation:
			'Pour 50÷45, les résultats complémentaires donnent 10 = 9×1+1 (la fraction 10/9), pas 50 = 45×1+5. Utilise rem et quo.',
		sources: [manual('calculs/', '§1.2')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		id: 'minus-on-empty-line',
		grade: '5',
		title: 'Sur une ligne vide, − ne reprend pas le résultat',
		explanation:
			'Après un calcul, +, × ou ÷ en début de ligne reprennent le résultat précédent, mais − commence un nombre négatif.',
		sources: [manual('calculs/', '§1.1.2')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		id: 'fraction-denominator',
		grade: '5',
		title: 'Sortir du dénominateur',
		explanation:
			'Après ÷, tout ce que tu tapes va au dénominateur. Appuie sur la flèche droite pour en sortir avant de continuer le calcul.',
		sources: [manual('calculs/', '§1.1.1')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		id: 'square-root-exit',
		grade: '4',
		title: 'La flèche droite ferme la racine',
		explanation:
			'Pour √(3²+4²), tape tout sous la racine sans flèche droite : une flèche après 3² donne √(3²)+4² = 19.',
		sources: [sourceCode(KEYBOARD_LAYOUT, 'touche √')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		id: 'minus-squared',
		grade: '4',
		title: '−2² donne −4',
		explanation: 'La calculatrice lit −(2²) = −4. Pour le carré de −2, tape (−2)² : 4.',
		sources: [sourceCode('poincare/test/parse.cpp', 'l. 330')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		id: 'times-ten-power',
		grade: '3',
		title: '6×10¹³ : une puissance de 10',
		explanation:
			'Depuis la version 24, les grands et petits résultats s’affichent ×10ⁿ. Une calculatrice pas à jour écrit encore 6ᴇ13, qui veut dire la même chose.',
		sources: [releaseNotes(24, 'affichage 123×10³')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		id: 'angle-unit',
		grade: '3',
		title: 'Degrés ou radians : regarde en haut à gauche',
		explanation:
			'La calculatrice est en radians au départ (« rad » en haut à gauche). En géométrie, passe en degrés dans Paramètres ; deg doit s’afficher.',
		sources: [manual('parametres/', 'Unité d’angle'), releaseNotes(21, 'avertissement d’unité')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		id: 'standard-deviation-sample',
		grade: '2',
		title: 'Écart type : pas celui de l’échantillon',
		explanation:
			'L’onglet Stats donne « Ecart type » (σ, celui du cours) et plus bas « Ecart type échantillon » (s). Prends le premier.',
		sources: [sourceCode(STATISTICS_LABELS)],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		id: 'python-percent-modulo',
		grade: '2',
		title: 'En Python, % est le modulo',
		explanation:
			'Dans Calculs, % est un pourcentage ; en Python, 17 % 5 donne 2, le reste de 17 par 5.',
		sources: [manual('python/')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		id: 'python-log',
		grade: '2',
		title: 'En Python, log est le logarithme népérien',
		explanation:
			'Dans Calculs, log est le logarithme décimal (log(1000) = 3) ; en Python, log(10) donne 2.302585…, c’est ln. Le décimal s’écrit log10.',
		sources: [manual('python/', 'module math')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	},
	{
		id: 'regression-affine-linear',
		grade: '1_GEN',
		title: 'Régressions : « Affine » et non « Linéaire »',
		explanation:
			'Depuis la version 23, « Affine » est y = ax+b et « Linéaire » est y = ax. Le manuel v20 dit encore « Linéaire » pour y = ax+b.',
		sources: [releaseNotes(23, 'renommage'), sourceCode(REGRESSION_LABELS, 'Linear, Proportional')],
		verifiedOnDevice: false,
		checkedInSimulator: SIMULATOR_CHECK
	}
];

// ===== Modèle =====

export const NUMWORKS: CalculatorModel = {
	slug: 'numworks',
	name: 'NumWorks',
	family: 'lycee',
	grades: GUIDE_GRADES,
	systemVersion: '26',
	keys: {
		ok: 'OK',
		back: 'retour',
		home: 'accueil',
		shift: 'shift',
		alpha: 'alpha',
		xnt: 'x,n,t',
		toolbox: 'boîte à outils',
		del: '⌫',
		exp: 'eˣ',
		ln: 'ln',
		log: 'log',
		i: 'i',
		pow: 'xʸ',
		sin: 'sin',
		cos: 'cos',
		tan: 'tan',
		pi: 'π',
		sqrt: '√',
		square: 'x²',
		lparen: '(',
		rparen: ')',
		times: '×',
		divide: '÷',
		plus: '+',
		minus: '−',
		dot: '.',
		ee: '×10ˣ',
		ans: 'Ans',
		exe: 'EXE',
		up: '▲',
		down: '▼',
		left: '◀',
		right: '▶'
	},
	sequences: SEQUENCES,
	pitfalls: PITFALLS
};
