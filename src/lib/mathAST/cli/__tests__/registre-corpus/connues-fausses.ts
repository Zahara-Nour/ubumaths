/**
 * Les entrées du corpus du registre qu'un outil ne rend PAS encore comme
 * l'attendu, relevées le 2026-11-01 (PR 0 du chantier `registre-reference`) et le
 * 2026-11-02 (lot 2).
 * Elles ne sont pas corrigées ici : la liste fige l'état, pour que la CI
 * reste verte ET que tout changement se voie.
 *
 * Le test échoue :
 * - si une entrée HORS de la liste n'est pas juste (régression) ;
 * - si une entrée de la liste change de réponse — devenue juste : la retirer
 *   d'ici ; devenue autrement fausse : mettre la ligne à jour, en le disant.
 *
 * Clé : identifiant du corpus ; valeur : `statut : ce que rend l'outil`.
 * Chaque PR du chantier en retire (journal, § Découpage).
 */

/** Le registre (`WebReplEngine`, champ `answer`) */
export const REGISTRE_CONNUES_FAUSSES: Readonly<Record<string, string>> = {
	// PR 1 : `.dériver` réduite (ADR 0032, D1)
	'deriver-03': 'forme : \\exponentialE^x + x \\exponentialE^x',
	'deriver-04':
		'forme : \\dfrac{2 \\left( x - 3 \\right) - \\left( 2 x + 1 \\right)}{\\left( x - 3 \\right)^2}',
	'deriver-09': 'forme : \\dfrac{-1}{x^2}',
	'deriver-10': 'forme : 2 x \\exponentialE^{-x} - \\left( x^2 + 1 \\right) \\exponentialE^{-x}',
	'deriver-12': 'forme : 6 \\left( 3 x - 1 \\right)',
	// PR 2 : `.simplifier` ne perd pas le domaine (S3)
	'simplifier-01': 'forme : x - 1',
	'simplifier-10': 'forme : 1',
	// PR 2 : `.résoudre` répond par S (Q2), sans valeur approchée
	'resoudre-01': 'structure : x = 3',
	'resoudre-06': 'structure : x = \\ln\\left( 3 \\right) \\approx 1{,}10',
	'resoudre-07': 'structure : x = \\exponentialE^2 \\approx 7{,}39',
	// `normalFormsEquivalent` rate sin² + cos² (carte ADR 0032 : `areEquivalent`)
	'equivalent-04': 'valeur : \\text{faux}',
	// Messages de refus (R6)
	'refus-01': 'message : Commande inconnue : .foo — tape .help pour la liste',
	'refus-02':
		'message : Rien à dériver : écris une expression après la commande. Forme attendue : .diff <expression>[ ; <variable>]',
	// Lot 2 · décision B : le registre rend toujours l'écriture décimale (`approximateLatex` manque quand la réponse est déjà un nombre décimal)
	'decimal-03': 'décimal : absente',
	'grands-01': 'décimal : absente',
	'grands-02': 'décimal : absente',
	'grands-03': 'décimal : absente',
	'grands-04': 'décimal : absente',
	'grands-05': 'décimal : absente',
	'grands-07': 'décimal : absente',
	'plafond-01': 'décimal : absente',
	'plafond-03': 'décimal : absente',
	'remarquables-09': 'décimal : absente',
	'racines-01': 'décimal : absente',
	'racines-08': 'décimal : absente',
	// Lot 2 · décision D : une expression à lettres tapée seule est rangée (le registre la recopie)
	'decimal-05': 'forme : 2.5 x / 5',
	'decimal-06': 'forme : x / 0.5',
	'decimal-08': 'forme : 0.5 \\left( 2 x + 4 \\right)',
	'decimal-09': 'forme : 0.5 x + x / 3',
	'signes-01': 'forme : \\left( 6 x - 3 \\right) / \\left( -9 \\right)',
	'signes-02': 'forme : \\left( 2 x + 1 \\right) / \\left( -3 \\right)',
	'signes-03': 'forme : \\left( 6 x + 3 \\right) / 9',
	'signes-04': 'forme : \\left( 2 x + 4 \\right) / 2',
	'signes-05': 'forme : 2 x / \\left( 4 x + 6 \\right)',
	'signes-07': 'forme : 3 \\left( -x - 1 \\right)',
	'signes-08': 'forme : \\left( -x - 1 \\right)^2',
	'signes-09': 'forme : x / \\left( -y \\right)',
	'signes-10': 'forme : x - \\left( -3 \\right)',
	'signes-12': 'forme : x / x',
	'signes-13': 'forme : 2 x + 3 - x + 1',
	'signes-14': 'forme : 2 x + 3 x',
	'signes-15': 'forme : x * x',
	'signes-16': 'forme : a + b - a',
	'signes-17': 'forme : 1 / x + 1 / x',
	// Lot 2 · plafond : `1000!/999!` se calcule (David) ; écriture gardée (> 1 000 caractères) sans `answer`
	'plafond-02': 'valeur : \\dfrac{1000!}{999!}',
	'plafond-04': 'sans-reponse : (1+1/1000)^1000',
	'plafond-05': 'sans-reponse : 1.01^365',
	'plafond-06': 'sans-reponse : factorial(1000)',
	// Lot 2 · degrés non lus, `pi` lu p·i, `π` tapé lu comme une lettre
	'remarquables-01': 'valeur : \\cos\\left( 60 ° \\right)',
	'remarquables-02': 'valeur : \\sin\\left( 30 ° \\right) + 1',
	'remarquables-03': 'valeur : \\tan\\left( 45 ° \\right)',
	'remarquables-04': 'valeur : \\cos\\left( -60 ° \\right)',
	'remarquables-06': 'forme : 2 * 45 °',
	'remarquables-08': 'accepte : \\cos\\left( p \\dfrac{\\imaginaryI}{3} \\right)',
	'remarquables-12': 'valeur : \\cos\\left( 420 ° \\right)',
	'racines-06': 'valeur : 5 π / 6',
	// Lot 2 · décision C : une égalité tapée seule répond `\text{vrai}` / `\text{faux}`
	'comparer-01': 'sans-reponse : true',
	'comparer-05': 'sans-reponse : true',
	'comparer-09': 'sans-reponse : false',
	'comparer-12': 'sans-reponse : true',
	'comparer-14': 'sans-reponse : true'
};

/** L'Atelier (`runInput`, champ `latex`) */
export const ATELIER_CONNUES_FAUSSES: Readonly<Record<string, string>> = {
	// `.résoudre` répond par S (Q2), sans valeur approchée, solutions rangées
	'resoudre-01': 'structure : x = 3',
	'resoudre-02': 'structure : x < 3',
	'resoudre-06': 'structure : x = \\ln\\left( 3 \\right) \\approx 1{,}10',
	'resoudre-07': 'structure : x = \\exponentialE^2 \\approx 7{,}39',
	'resoudre-09': 'structure : x \\geqslant 5',
	// Produit nul : ordre des facteurs, pas l'ordre croissant (règle de David, 2026-11-01)
	'resoudre-10': 'forme : S = \\left\\{ 1 \\,;\\, -2 \\right\\}',
	// L'Atelier affiche la sortie texte du moteur (empreintes comprises)
	'equivalent-01': 'sans-reponse : Equivalent: true',
	'equivalent-02': 'sans-reponse : Equivalent: false',
	'equivalent-03': 'sans-reponse : Equivalent: true',
	'equivalent-04': 'sans-reponse : Equivalent: false',
	'equivalent-05': 'sans-reponse : Equivalent: false',
	// Messages de refus (R6)
	'refus-02':
		'message : Je n’ai pas su lire cette expression : vérifie les parenthèses et les signes.',
	'refus-03':
		'message : Je n’ai pas su lire cette expression : vérifie les parenthèses et les signes.',
	// Lot 2 · plafond : `1000!/999!` se calcule (David, 2026-11-01)
	'plafond-02': 'valeur : \\dfrac{1000!}{999!}',
	// Lot 2 · décision C : une égalité tapée seule répond `\text{vrai}` / `\text{faux}` ; `≈` refusé
	'comparer-01': 'sans-reponse : true',
	'comparer-05': 'sans-reponse : true',
	'comparer-12': 'sans-reponse : true',
	'comparer-13':
		'sans-reponse : Erreur de calcul : Relation « ≈ » non évaluable : seules = ≠ < > ≤ ≥ se tranchent',
	'comparer-14': 'sans-reponse : true'
};
