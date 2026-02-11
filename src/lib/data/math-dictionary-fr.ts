/**
 * French Mathematics Vocabulary Dictionary
 * =========================================
 *
 * Comprehensive dictionary of French math terms for text blank autocompletion.
 * Each term has tags, definition, and the grade level at which it is introduced.
 *
 * @module data/math-dictionary-fr
 */

import type { GradeCode } from '$lib/types/grades';

// ============================================================================
// TYPES
// ============================================================================

/** A mathematical term in French */
export interface MathTerm {
	/** The term in French (lowercase, no accents needed — matching is fuzzy) */
	term: string;
	/** Tags for filtering (e.g., 'arithmetique', 'geometrie') */
	tags: string[];
	/** Short definition in French */
	definition: string;
	/** Grade level where the term is first introduced */
	level: GradeCode;
}

// ============================================================================
// DICTIONARY DATA
// ============================================================================

export const MATH_DICTIONARY: MathTerm[] = [
	// ---- Arithmétique ----
	{ term: 'addition', tags: ['arithmetique', 'operation'], definition: "Opération qui consiste à ajouter des nombres", level: 'CP' },
	{ term: 'soustraction', tags: ['arithmetique', 'operation'], definition: "Opération qui consiste à retrancher un nombre d'un autre", level: 'CP' },
	{ term: 'multiplication', tags: ['arithmetique', 'operation'], definition: 'Opération qui consiste à multiplier deux nombres', level: 'CE1' },
	{ term: 'division', tags: ['arithmetique', 'operation'], definition: 'Opération qui consiste à diviser un nombre par un autre', level: 'CE2' },
	{ term: 'somme', tags: ['arithmetique', 'operation'], definition: "Résultat d'une addition", level: 'CP' },
	{ term: 'différence', tags: ['arithmetique', 'operation'], definition: "Résultat d'une soustraction", level: 'CP' },
	{ term: 'produit', tags: ['arithmetique', 'operation'], definition: "Résultat d'une multiplication", level: 'CE1' },
	{ term: 'quotient', tags: ['arithmetique', 'operation'], definition: "Résultat d'une division", level: 'CE2' },
	{ term: 'reste', tags: ['arithmetique', 'operation'], definition: "Ce qui reste dans une division euclidienne", level: 'CE2' },
	{ term: 'dividende', tags: ['arithmetique', 'operation'], definition: 'Nombre que l\'on divise', level: 'CM1' },
	{ term: 'diviseur', tags: ['arithmetique', 'operation'], definition: 'Nombre par lequel on divise', level: 'CM1' },
	{ term: 'multiple', tags: ['arithmetique', 'divisibilite'], definition: "Nombre qui est le produit d'un nombre entier par un autre", level: 'CM1' },
	{ term: 'divisible', tags: ['arithmetique', 'divisibilite'], definition: 'Qui peut être divisé sans reste', level: 'CM1' },
	{ term: 'pair', tags: ['arithmetique', 'parite'], definition: 'Nombre divisible par 2', level: 'CP' },
	{ term: 'impair', tags: ['arithmetique', 'parite'], definition: 'Nombre non divisible par 2', level: 'CP' },
	{ term: 'chiffre', tags: ['arithmetique', 'numeration'], definition: 'Symbole utilisé pour écrire un nombre (0 à 9)', level: 'CP' },
	{ term: 'nombre', tags: ['arithmetique', 'numeration'], definition: 'Quantité exprimée par un ou plusieurs chiffres', level: 'CP' },
	{ term: 'entier', tags: ['arithmetique', 'numeration'], definition: 'Nombre sans partie décimale', level: 'CP' },
	{ term: 'naturel', tags: ['arithmetique', 'numeration'], definition: 'Nombre entier positif ou nul', level: '6' },
	{ term: 'relatif', tags: ['arithmetique', 'numeration'], definition: 'Nombre entier positif ou négatif', level: '5' },
	{ term: 'positif', tags: ['arithmetique', 'signe'], definition: 'Plus grand que zéro', level: '5' },
	{ term: 'négatif', tags: ['arithmetique', 'signe'], definition: 'Plus petit que zéro', level: '5' },
	{ term: 'opposé', tags: ['arithmetique', 'signe', 'trigonometrie', 'geometrie'], definition: "Nombre de signe contraire ou côté opposé à un angle", level: '4' },
	{ term: 'valeur absolue', tags: ['arithmetique', 'signe'], definition: "Distance d'un nombre à zéro", level: '4' },
	{ term: 'puissance', tags: ['arithmetique', 'puissance'], definition: "Produit d'un nombre par lui-même un certain nombre de fois", level: '4' },
	{ term: 'carré', tags: ['arithmetique', 'puissance', 'geometrie', 'figure'], definition: 'Nombre multiplié par lui-même (puissance 2) ou rectangle à 4 côtés égaux', level: 'CP' },
	{ term: 'cube', tags: ['arithmetique', 'puissance', 'geometrie', 'solide'], definition: 'Nombre élevé à la puissance 3 ou solide à 6 faces carrées', level: 'CE1' },
	{ term: 'racine carrée', tags: ['arithmetique', 'puissance'], definition: 'Nombre dont le carré donne le nombre initial', level: '3' },
	{ term: 'premier', tags: ['arithmetique', 'divisibilite'], definition: "Nombre qui n'a que 1 et lui-même comme diviseurs", level: '4' },
	{ term: 'PGCD', tags: ['arithmetique', 'divisibilite'], definition: 'Plus grand commun diviseur de deux nombres', level: '3' },
	{ term: 'PPCM', tags: ['arithmetique', 'divisibilite'], definition: 'Plus petit commun multiple de deux nombres', level: '3' },
	{ term: 'ordre de grandeur', tags: ['arithmetique', 'estimation'], definition: "Approximation d'un nombre par une puissance de 10", level: 'CM2' },
	{ term: 'arrondi', tags: ['arithmetique', 'estimation'], definition: 'Approximation à une précision donnée', level: 'CM2' },

	// ---- Fractions ----
	{ term: 'fraction', tags: ['fraction'], definition: 'Écriture a/b représentant une division', level: 'CM1' },
	{ term: 'numérateur', tags: ['fraction'], definition: "Nombre au-dessus de la barre de fraction", level: 'CM1' },
	{ term: 'dénominateur', tags: ['fraction'], definition: "Nombre en dessous de la barre de fraction", level: 'CM1' },
	{ term: 'irréductible', tags: ['fraction'], definition: "Fraction dont le numérateur et le dénominateur n'ont pas de diviseur commun autre que 1", level: '5' },
	{ term: 'simplifier', tags: ['fraction', 'calcul-litteral'], definition: 'Rendre plus simple une fraction ou expression', level: '5' },
	{ term: 'inverse', tags: ['fraction'], definition: "Nombre dont le produit par l'original donne 1", level: '4' },
	{ term: 'décimal', tags: ['fraction', 'numeration'], definition: 'Nombre à virgule', level: 'CM1' },

	// ---- Décimaux ----
	{ term: 'virgule', tags: ['decimal', 'numeration'], definition: 'Signe séparant la partie entière de la partie décimale', level: 'CM1' },
	{ term: 'dixième', tags: ['decimal', 'numeration'], definition: 'Premier chiffre après la virgule', level: 'CM1' },
	{ term: 'centième', tags: ['decimal', 'numeration'], definition: 'Deuxième chiffre après la virgule', level: 'CM1' },
	{ term: 'millième', tags: ['decimal', 'numeration'], definition: 'Troisième chiffre après la virgule', level: 'CM2' },
	{ term: 'partie entière', tags: ['decimal', 'numeration'], definition: "Chiffres avant la virgule d'un nombre décimal", level: 'CM1' },
	{ term: 'partie décimale', tags: ['decimal', 'numeration'], definition: "Chiffres après la virgule d'un nombre décimal", level: 'CM1' },
	{ term: 'unité', tags: ['decimal', 'numeration', 'grandeur'], definition: 'Chiffre des unités ou grandeur de référence', level: 'CP' },
	{ term: 'dizaine', tags: ['numeration'], definition: 'Groupe de 10 unités', level: 'CP' },
	{ term: 'centaine', tags: ['numeration'], definition: 'Groupe de 100 unités', level: 'CE1' },
	{ term: 'millier', tags: ['numeration'], definition: 'Groupe de 1000 unités', level: 'CE2' },

	// ---- Géométrie ----
	{ term: 'point', tags: ['geometrie', 'base'], definition: 'Élément de base de la géométrie, sans dimension', level: 'CP' },
	{ term: 'droite', tags: ['geometrie', 'base'], definition: 'Ligne infinie qui ne tourne pas', level: 'CP' },
	{ term: 'segment', tags: ['geometrie', 'base'], definition: 'Portion de droite limitée par deux points', level: 'CP' },
	{ term: 'demi-droite', tags: ['geometrie', 'base'], definition: "Portion de droite limitée par un point d'un seul côté", level: 'CM1' },
	{ term: 'milieu', tags: ['geometrie', 'base'], definition: "Point situé à égale distance des deux extrémités d'un segment", level: 'CM1' },
	{ term: 'angle', tags: ['geometrie', 'angle'], definition: 'Ouverture formée par deux demi-droites de même origine', level: 'CE2' },
	{ term: 'angle droit', tags: ['geometrie', 'angle'], definition: 'Angle de 90 degrés', level: 'CE1' },
	{ term: 'angle aigu', tags: ['geometrie', 'angle'], definition: 'Angle de moins de 90 degrés', level: 'CM2' },
	{ term: 'angle obtus', tags: ['geometrie', 'angle'], definition: 'Angle de plus de 90 degrés', level: 'CM2' },
	{ term: 'angle plat', tags: ['geometrie', 'angle'], definition: 'Angle de 180 degrés', level: 'CM2' },
	{ term: 'perpendiculaire', tags: ['geometrie', 'relation'], definition: 'Droites qui se coupent à angle droit', level: 'CE2' },
	{ term: 'parallèle', tags: ['geometrie', 'relation'], definition: 'Droites qui ne se coupent jamais', level: 'CE2' },
	{ term: 'sécante', tags: ['geometrie', 'relation'], definition: 'Droite qui coupe une autre droite', level: '6' },
	{ term: 'triangle', tags: ['geometrie', 'figure'], definition: 'Polygone à 3 côtés', level: 'CP' },
	{ term: 'rectangle', tags: ['geometrie', 'figure'], definition: 'Quadrilatère avec 4 angles droits', level: 'CP' },
	{ term: 'carré (figure)', tags: ['geometrie', 'figure'], definition: 'Rectangle avec 4 côtés égaux', level: 'CP' },
	{ term: 'cercle', tags: ['geometrie', 'figure'], definition: "Ensemble des points à égale distance d'un centre", level: 'CE1' },
	{ term: 'losange', tags: ['geometrie', 'figure'], definition: 'Quadrilatère avec 4 côtés égaux', level: 'CM1' },
	{ term: 'parallélogramme', tags: ['geometrie', 'figure'], definition: 'Quadrilatère avec les côtés opposés parallèles', level: 'CM2' },
	{ term: 'trapèze', tags: ['geometrie', 'figure'], definition: "Quadrilatère avec au moins une paire de côtés parallèles", level: '5' },
	{ term: 'polygone', tags: ['geometrie', 'figure'], definition: 'Figure fermée avec des côtés droits', level: 'CE2' },
	{ term: 'quadrilatère', tags: ['geometrie', 'figure'], definition: 'Polygone à 4 côtés', level: 'CE2' },
	{ term: 'pentagone', tags: ['geometrie', 'figure'], definition: 'Polygone à 5 côtés', level: 'CM2' },
	{ term: 'hexagone', tags: ['geometrie', 'figure'], definition: 'Polygone à 6 côtés', level: 'CM2' },
	{ term: 'rayon', tags: ['geometrie', 'cercle'], definition: "Distance du centre au bord d'un cercle", level: 'CE2' },
	{ term: 'diamètre', tags: ['geometrie', 'cercle'], definition: 'Segment passant par le centre reliant deux points du cercle', level: 'CE2' },
	{ term: 'corde', tags: ['geometrie', 'cercle'], definition: 'Segment reliant deux points du cercle', level: '6' },
	{ term: 'arc', tags: ['geometrie', 'cercle'], definition: "Portion de cercle entre deux points", level: '6' },
	{ term: 'côté', tags: ['geometrie', 'figure'], definition: "Segment d'un polygone", level: 'CP' },
	{ term: 'sommet', tags: ['geometrie', 'figure'], definition: "Point de rencontre de deux côtés d'un polygone", level: 'CE1' },
	{ term: 'diagonale', tags: ['geometrie', 'figure'], definition: 'Segment reliant deux sommets non consécutifs', level: 'CM1' },
	{ term: 'médiatrice', tags: ['geometrie', 'droite-remarquable'], definition: "Droite perpendiculaire à un segment passant par son milieu", level: '6' },
	{ term: 'bissectrice', tags: ['geometrie', 'droite-remarquable'], definition: "Demi-droite qui partage un angle en deux parties égales", level: '6' },
	{ term: 'hauteur', tags: ['geometrie', 'droite-remarquable', 'grandeur'], definition: "Segment perpendiculaire à la base passant par le sommet opposé", level: '6' },
	{ term: 'médiane', tags: ['geometrie', 'droite-remarquable', 'statistique'], definition: "Segment reliant un sommet au milieu du côté opposé ou valeur centrale d'une série", level: '5' },
	{ term: 'isocèle', tags: ['geometrie', 'triangle'], definition: 'Triangle avec deux côtés égaux', level: 'CM2' },
	{ term: 'équilatéral', tags: ['geometrie', 'triangle'], definition: 'Triangle avec trois côtés égaux', level: 'CM2' },
	{ term: 'hypoténuse', tags: ['geometrie', 'triangle'], definition: "Le plus long côté d'un triangle rectangle", level: '4' },

	// ---- Symétrie & Transformations ----
	{ term: 'symétrie', tags: ['geometrie', 'transformation'], definition: 'Transformation qui conserve les distances', level: 'CE2' },
	{ term: 'axe de symétrie', tags: ['geometrie', 'transformation'], definition: 'Droite qui sépare une figure en deux parties symétriques', level: 'CE2' },
	{ term: 'symétrie axiale', tags: ['geometrie', 'transformation'], definition: "Symétrie par rapport à une droite", level: '6' },
	{ term: 'symétrie centrale', tags: ['geometrie', 'transformation'], definition: "Symétrie par rapport à un point", level: '5' },
	{ term: 'translation', tags: ['geometrie', 'transformation'], definition: 'Déplacement sans rotation ni changement de taille', level: '4' },
	{ term: 'rotation', tags: ['geometrie', 'transformation'], definition: "Transformation qui tourne une figure autour d'un point", level: '4' },
	{ term: 'homothétie', tags: ['geometrie', 'transformation'], definition: 'Transformation qui agrandit ou réduit une figure', level: '3' },

	// ---- Grandeurs et Mesures ----
	{ term: 'périmètre', tags: ['grandeur', 'mesure'], definition: "Longueur du contour d'une figure", level: 'CE1' },
	{ term: 'aire', tags: ['grandeur', 'mesure'], definition: "Mesure de la surface d'une figure", level: 'CM1' },
	{ term: 'volume', tags: ['grandeur', 'mesure'], definition: "Mesure de l'espace occupé par un solide", level: 'CM2' },
	{ term: 'longueur', tags: ['grandeur', 'mesure'], definition: "Mesure d'une distance", level: 'CP' },
	{ term: 'largeur', tags: ['grandeur', 'mesure'], definition: "Plus petite dimension d'un rectangle", level: 'CE1' },
	{ term: 'mètre', tags: ['grandeur', 'unite'], definition: 'Unité de base de longueur', level: 'CE1' },
	{ term: 'centimètre', tags: ['grandeur', 'unite'], definition: 'Centième de mètre', level: 'CE1' },
	{ term: 'kilomètre', tags: ['grandeur', 'unite'], definition: 'Mille mètres', level: 'CE2' },
	{ term: 'litre', tags: ['grandeur', 'unite'], definition: 'Unité de mesure de contenance', level: 'CE1' },
	{ term: 'gramme', tags: ['grandeur', 'unite'], definition: 'Unité de mesure de masse', level: 'CE1' },
	{ term: 'kilogramme', tags: ['grandeur', 'unite'], definition: 'Mille grammes', level: 'CE1' },
	{ term: 'degré', tags: ['grandeur', 'unite', 'angle', 'calcul-litteral'], definition: "Unité de mesure d'angle ou exposant le plus élevé d'un polynôme", level: 'CM1' },
	{ term: 'proportionnalité', tags: ['grandeur'], definition: 'Relation de type y = kx entre deux grandeurs', level: '6' },
	{ term: 'échelle', tags: ['grandeur'], definition: 'Rapport entre une distance sur le plan et la distance réelle', level: '6' },

	// ---- Calcul littéral ----
	{ term: 'variable', tags: ['calcul-litteral'], definition: 'Lettre représentant un nombre inconnu', level: '5' },
	{ term: 'inconnue', tags: ['calcul-litteral', 'equation'], definition: "Valeur que l'on cherche dans une équation", level: '5' },
	{ term: 'expression', tags: ['calcul-litteral'], definition: 'Suite de nombres et de lettres reliés par des opérations', level: '5' },
	{ term: 'terme', tags: ['calcul-litteral'], definition: "Élément d'une somme algébrique", level: '5' },
	{ term: 'facteur', tags: ['calcul-litteral', 'arithmetique'], definition: "Élément d'un produit", level: '5' },
	{ term: 'coefficient', tags: ['calcul-litteral'], definition: "Nombre qui multiplie une variable", level: '4' },
	{ term: 'constante', tags: ['calcul-litteral'], definition: "Terme sans variable dans une expression", level: '4' },
	{ term: 'équation', tags: ['calcul-litteral', 'equation'], definition: 'Égalité contenant une ou plusieurs inconnues', level: '4' },
	{ term: 'inéquation', tags: ['calcul-litteral', 'equation'], definition: 'Inégalité contenant une inconnue', level: '3' },
	{ term: 'solution', tags: ['calcul-litteral', 'equation'], definition: "Valeur qui vérifie une équation", level: '4' },
	{ term: 'développer', tags: ['calcul-litteral'], definition: 'Transformer un produit en somme', level: '4' },
	{ term: 'factoriser', tags: ['calcul-litteral'], definition: 'Transformer une somme en produit', level: '3' },
	{ term: 'réduire', tags: ['calcul-litteral'], definition: 'Regrouper les termes semblables', level: '4' },
	{ term: 'identité remarquable', tags: ['calcul-litteral'], definition: 'Égalité algébrique toujours vraie ((a+b)² = a²+2ab+b²)', level: '3' },
	{ term: 'polynôme', tags: ['calcul-litteral'], definition: "Expression de la forme aₙxⁿ + ... + a₁x + a₀", level: '2' },
	{ term: 'monôme', tags: ['calcul-litteral'], definition: "Polynôme à un seul terme", level: '2' },
	{ term: 'degré (polynôme)', tags: ['calcul-litteral'], definition: "Plus grand exposant d'un polynôme", level: '2' },

	// ---- Fonctions ----
	{ term: 'fonction', tags: ['fonction'], definition: "Relation qui associe à chaque valeur de x une unique valeur", level: '3' },
	{ term: 'image', tags: ['fonction'], definition: "Valeur obtenue par une fonction (f(x))", level: '3' },
	{ term: 'antécédent', tags: ['fonction'], definition: "Valeur de x dont l'image est y", level: '3' },
	{ term: 'croissante', tags: ['fonction'], definition: "Fonction qui augmente quand x augmente", level: '3' },
	{ term: 'décroissante', tags: ['fonction'], definition: "Fonction qui diminue quand x augmente", level: '3' },
	{ term: 'affine', tags: ['fonction'], definition: 'Fonction de la forme f(x) = ax + b', level: '3' },
	{ term: 'linéaire', tags: ['fonction'], definition: 'Fonction de la forme f(x) = ax', level: '3' },
	{ term: 'coefficient directeur', tags: ['fonction'], definition: "Pente d'une droite (le a dans y = ax + b)", level: '3' },
	{ term: 'ordonnée à l\'origine', tags: ['fonction'], definition: "Le b dans y = ax + b (point de passage sur l'axe des y)", level: '3' },
	{ term: 'abscisse', tags: ['repere', 'fonction'], definition: "Coordonnée horizontale d'un point", level: '6' },
	{ term: 'ordonnée', tags: ['repere', 'fonction'], definition: "Coordonnée verticale d'un point", level: '6' },
	{ term: 'repère', tags: ['repere'], definition: "Système de référence pour placer des points (axes + origine)", level: '6' },
	{ term: 'origine', tags: ['repere'], definition: 'Point de croisement des axes du repère', level: '6' },
	{ term: 'parabole', tags: ['fonction'], definition: "Courbe d'une fonction du second degré", level: '2' },

	// ---- Statistiques & Probabilités ----
	{ term: 'moyenne', tags: ['statistique'], definition: 'Somme des valeurs divisée par le nombre de valeurs', level: '6' },
	{ term: 'médiane (statistique)', tags: ['statistique'], definition: 'Valeur qui partage une série ordonnée en deux moitiés', level: '5' },
	{ term: 'étendue', tags: ['statistique'], definition: 'Différence entre la plus grande et la plus petite valeur', level: '5' },
	{ term: 'effectif', tags: ['statistique'], definition: "Nombre d'occurrences d'une valeur", level: '5' },
	{ term: 'fréquence', tags: ['statistique'], definition: "Rapport de l'effectif à l'effectif total", level: '5' },
	{ term: 'probabilité', tags: ['probabilite'], definition: "Mesure de la chance qu'un événement se produise", level: '5' },
	{ term: 'événement', tags: ['probabilite'], definition: "Résultat possible d'une expérience aléatoire", level: '5' },
	{ term: 'expérience aléatoire', tags: ['probabilite'], definition: "Expérience dont on ne peut prévoir le résultat", level: '5' },
	{ term: 'diagramme', tags: ['statistique'], definition: 'Représentation graphique de données', level: '6' },
	{ term: 'histogramme', tags: ['statistique'], definition: 'Diagramme en barres pour des données continues', level: '5' },
	{ term: 'tableau', tags: ['statistique'], definition: 'Présentation organisée de données en lignes et colonnes', level: 'CE1' },
	{ term: 'pourcentage', tags: ['arithmetique', 'statistique'], definition: 'Proportion exprimée sur 100', level: 'CM2' },

	// ---- Théorèmes & Propriétés ----
	{ term: 'théorème', tags: ['logique'], definition: 'Propriété mathématique démontrée', level: '4' },
	{ term: 'propriété', tags: ['logique'], definition: 'Caractéristique vraie en mathématiques', level: '6' },
	{ term: 'réciproque', tags: ['logique'], definition: "Propriété obtenue en inversant l'hypothèse et la conclusion", level: '4' },
	{ term: 'Pythagore', tags: ['geometrie', 'theoreme'], definition: 'Dans un triangle rectangle : a² + b² = c²', level: '4' },
	{ term: 'Thalès', tags: ['geometrie', 'theoreme'], definition: 'Proportionnalité dans les triangles coupés par des parallèles', level: '3' },

	// ---- Solides ----
	{ term: 'cube (solide)', tags: ['geometrie', 'solide'], definition: 'Solide à 6 faces carrées', level: 'CE1' },
	{ term: 'pavé droit', tags: ['geometrie', 'solide'], definition: 'Solide à 6 faces rectangulaires', level: 'CE2' },
	{ term: 'cylindre', tags: ['geometrie', 'solide'], definition: 'Solide à base circulaire', level: 'CM2' },
	{ term: 'cône', tags: ['geometrie', 'solide'], definition: 'Solide à base circulaire et sommet', level: 'CM2' },
	{ term: 'sphère', tags: ['geometrie', 'solide'], definition: 'Ensemble des points à égale distance du centre dans l\'espace', level: 'CM2' },
	{ term: 'pyramide', tags: ['geometrie', 'solide'], definition: "Solide dont la base est un polygone et les faces sont des triangles", level: '6' },
	{ term: 'prisme', tags: ['geometrie', 'solide'], definition: 'Solide dont les deux bases sont des polygones identiques', level: '5' },
	{ term: 'face', tags: ['geometrie', 'solide'], definition: "Surface plane d'un solide", level: 'CE1' },
	{ term: 'arête', tags: ['geometrie', 'solide'], definition: "Segment d'intersection de deux faces d'un solide", level: 'CE2' },

	// ---- Notation & Logique ----
	{ term: 'égal', tags: ['relation', 'logique'], definition: 'Qui a la même valeur', level: 'CP' },
	{ term: 'supérieur', tags: ['relation', 'logique'], definition: 'Plus grand que', level: 'CP' },
	{ term: 'inférieur', tags: ['relation', 'logique'], definition: 'Plus petit que', level: 'CP' },
	{ term: 'croissant', tags: ['relation', 'logique'], definition: 'Du plus petit au plus grand', level: 'CE1' },
	{ term: 'décroissant', tags: ['relation', 'logique'], definition: 'Du plus grand au plus petit', level: 'CE1' },
	{ term: 'consécutif', tags: ['relation', 'logique'], definition: 'Qui se suivent sans interruption', level: 'CE2' },
	{ term: 'encadrement', tags: ['relation'], definition: "Donner deux valeurs entre lesquelles se situe un nombre", level: 'CM2' },
	{ term: 'intervalle', tags: ['relation'], definition: 'Ensemble des nombres entre deux bornes', level: '2' },

	// ---- Trigonométrie ----
	{ term: 'cosinus', tags: ['trigonometrie'], definition: "Rapport du côté adjacent à l'hypoténuse", level: '4' },
	{ term: 'sinus', tags: ['trigonometrie'], definition: "Rapport du côté opposé à l'hypoténuse", level: '4' },
	{ term: 'tangente', tags: ['trigonometrie'], definition: 'Rapport du côté opposé au côté adjacent', level: '4' },
	{ term: 'adjacent', tags: ['trigonometrie', 'geometrie'], definition: "Côté de l'angle droit formant l'angle considéré", level: '4' },
	{ term: 'côté opposé', tags: ['trigonometrie', 'geometrie'], definition: "Côté qui ne forme pas l'angle considéré", level: '4' },

	// ---- Proportionnalité & Pourcentages ----
	{ term: 'proportion', tags: ['proportionnalite'], definition: 'Égalité de deux rapports', level: '6' },
	{ term: 'coefficient de proportionnalité', tags: ['proportionnalite'], definition: 'Nombre constant qui relie deux grandeurs proportionnelles', level: '6' },
	{ term: 'double', tags: ['proportionnalite', 'arithmetique'], definition: "Le résultat de la multiplication par 2", level: 'CP' },
	{ term: 'triple', tags: ['proportionnalite', 'arithmetique'], definition: "Le résultat de la multiplication par 3", level: 'CE1' },
	{ term: 'moitié', tags: ['proportionnalite', 'arithmetique'], definition: "Le résultat de la division par 2", level: 'CP' },
	{ term: 'tiers', tags: ['proportionnalite', 'arithmetique'], definition: "Le résultat de la division par 3", level: 'CE2' },
	{ term: 'quart', tags: ['proportionnalite', 'arithmetique'], definition: "Le résultat de la division par 4", level: 'CE2' },

	// ---- Divers ----
	{ term: 'algorithme', tags: ['logique'], definition: "Suite d'instructions pour résoudre un problème", level: '2' },
	{ term: 'conjecture', tags: ['logique'], definition: 'Hypothèse non encore démontrée', level: '2' },
	{ term: 'démonstration', tags: ['logique'], definition: 'Raisonnement qui prouve une propriété', level: '4' },
	{ term: 'contre-exemple', tags: ['logique'], definition: 'Exemple qui montre qu\'une affirmation est fausse', level: '4' },
	{ term: 'vecteur', tags: ['geometrie'], definition: 'Objet mathématique caractérisé par une direction, un sens et une longueur', level: '2' },
	{ term: 'coordonnées', tags: ['repere'], definition: "Couple de nombres (x, y) qui repère un point dans un plan", level: '6' },
	{ term: 'système', tags: ['equation'], definition: "Ensemble d'équations à résoudre simultanément", level: '3' },
	{ term: 'résoudre', tags: ['equation', 'calcul-litteral'], definition: "Trouver la ou les solutions d'une équation", level: '4' },
	{ term: 'vérifier', tags: ['logique'], definition: "S'assurer qu'une valeur est solution", level: '4' },
	{ term: 'simplifier (expression)', tags: ['calcul-litteral'], definition: 'Rendre plus simple une expression algébrique', level: '5' },
	{ term: 'calculer', tags: ['operation'], definition: "Effectuer une opération pour obtenir un résultat", level: 'CP' },
	{ term: 'comparer', tags: ['relation'], definition: 'Déterminer lequel est le plus grand', level: 'CP' },
	{ term: 'ranger', tags: ['relation'], definition: 'Mettre dans un ordre (croissant ou décroissant)', level: 'CP' },
	{ term: 'ordonner', tags: ['relation'], definition: 'Classer dans un ordre précis', level: 'CE1' },
	{ term: 'convertir', tags: ['grandeur'], definition: "Changer d'unité de mesure", level: 'CE2' },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/** Grade ordering for comparison (lower index = earlier grade) */
const GRADE_ORDER: GradeCode[] = [
	'CP', 'CE1', 'CE2', 'CM1', 'CM2',
	'6', '5', '4', '3',
	'2',
	'1_GEN', '1_SPE', '1_STMG',
	'T_GEN', 'T_SPE', 'T_EXP', 'T_COMP', 'T_STMG'
];

function gradeIndex(grade: GradeCode): number {
	const idx = GRADE_ORDER.indexOf(grade);
	return idx === -1 ? GRADE_ORDER.length : idx;
}

/**
 * Get all terms introduced at or before a given grade level.
 *
 * @param grade - Maximum grade level (inclusive)
 * @returns Terms available at this grade
 */
export function getTermsForLevel(grade: GradeCode): MathTerm[] {
	const maxIndex = gradeIndex(grade);
	return MATH_DICTIONARY.filter((t) => gradeIndex(t.level) <= maxIndex);
}

/**
 * Get all terms with a specific tag.
 *
 * @param tag - Tag to filter by (e.g., 'geometrie', 'fraction')
 * @returns Matching terms
 */
export function getTermsByTag(tag: string): MathTerm[] {
	return MATH_DICTIONARY.filter((t) => t.tags.includes(tag));
}

/**
 * Get terms matching both a tag and a maximum grade level.
 *
 * @param tag - Tag to filter by
 * @param grade - Maximum grade level (inclusive)
 * @returns Matching terms
 */
export function getTermsByTagAndLevel(tag: string, grade: GradeCode): MathTerm[] {
	const maxIndex = gradeIndex(grade);
	return MATH_DICTIONARY.filter((t) => t.tags.includes(tag) && gradeIndex(t.level) <= maxIndex);
}

/**
 * Get all terms as a flat array (for autocompletion).
 *
 * @returns All term strings
 */
export function getAllTerms(): string[] {
	return MATH_DICTIONARY.map((t) => t.term);
}

/**
 * Search terms by prefix or substring (case and accent insensitive).
 *
 * Uses simple normalization for fast search.
 *
 * @param query - Search query
 * @returns Matching terms sorted by relevance (prefix matches first)
 */
export function searchTerms(query: string, limit = 20): MathTerm[] {
	const normalized = normalizeForSearch(query);
	if (!normalized) return [];

	const prefixMatches: MathTerm[] = [];
	const substringMatches: MathTerm[] = [];

	for (const term of MATH_DICTIONARY) {
		const normalizedTerm = normalizeForSearch(term.term);
		if (normalizedTerm.startsWith(normalized)) {
			prefixMatches.push(term);
		} else if (normalizedTerm.includes(normalized)) {
			substringMatches.push(term);
		}
	}

	return [...prefixMatches, ...substringMatches].slice(0, limit);
}

/** Normalize text for search: NFD → strip diacritics → lowercase */
function normalizeForSearch(text: string): string {
	return text
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim();
}
