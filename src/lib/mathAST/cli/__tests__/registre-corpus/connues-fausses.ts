/**
 * Les entrées du corpus du registre qu'un outil ne rend PAS encore comme
 * l'attendu, relevées le 2026-11-01 (PR 0 du chantier `registre-reference`).
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
	// Le registre ne lit pas la virgule décimale ; seul l'Atelier la traduit
	'calcul-06': 'refus : « , » inattendu ici',
	// Messages de refus (R6)
	'refus-01': 'message : Commande inconnue : .foo — tape .help pour la liste',
	'refus-02':
		'message : Rien à dériver : écris une expression après la commande. Forme attendue : .diff <expression>[ ; <variable>]'
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
		'message : Je n’ai pas su lire cette expression : vérifie les parenthèses et les signes.'
};
