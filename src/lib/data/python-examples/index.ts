import type { PythonExample } from './types';

import helloWorld from './files/bases/hello-world.py?raw';
import variablesTypes from './files/bases/variables-types.py?raw';
import operateurs from './files/bases/operateurs.py?raw';
import conditionsIf from './files/bases/conditions-if.py?raw';
import boucleFor from './files/bases/boucle-for.py?raw';
import boucleWhile from './files/bases/boucle-while.py?raw';
import listes from './files/bases/listes.py?raw';
import dictionnaires from './files/bases/dictionnaires.py?raw';

import defBasique from './files/fonctions/def-basique.py?raw';
import argsDefaultsKwargs from './files/fonctions/args-defaults-kwargs.py?raw';
import lambdaMapFilter from './files/fonctions/lambda-map-filter.py?raw';
import recursionFactorielle from './files/fonctions/recursion-factorielle.py?raw';

import classePoint from './files/oop/classe-point.py?raw';
import heritageAnimal from './files/oop/heritage-animal.py?raw';
import dataclassLivre from './files/oop/dataclass-livre.py?raw';

import methodesEssentielles from './files/strings/methodes-essentielles.py?raw';
import fStringsFormat from './files/strings/f-strings-format.py?raw';

import tryExceptFinally from './files/exceptions/try-except-finally.py?raw';
import exceptionsCustom from './files/exceptions/exceptions-custom.py?raw';

import fichierTexte from './files/io/fichier-texte.py?raw';
import jsonLectureEcriture from './files/io/json-lecture-ecriture.py?raw';

import sympyEquation from './files/maths/sympy-equation.py?raw';
import numpyVecteurs from './files/maths/numpy-vecteurs.py?raw';
import statisticsMoyenne from './files/maths/statistics-moyenne-ecart.py?raw';
import fractionsPgcd from './files/maths/fractions-pgcd.py?raw';

import matplotlibCourbe from './files/visualisation/matplotlib-courbe.py?raw';
import matplotlibHistogramme from './files/visualisation/matplotlib-histogramme.py?raw';
import plotlyInteractif from './files/visualisation/plotly-interactif.py?raw';

import triBulles from './files/algorithmes/tri-bulles.py?raw';
import rechercheDichotomique from './files/algorithmes/recherche-dichotomique.py?raw';

export const PYTHON_EXAMPLES: PythonExample[] = [
	// ---- Bases ----
	{
		id: 'hello-world',
		title: 'Hello, World !',
		description: 'Premier programme : afficher du texte avec print et f-strings',
		category: 'bases',
		tags: ['print', 'f-strings', 'college'],
		code: helloWorld
	},
	{
		id: 'variables-types',
		title: 'Variables et types',
		description: 'Les types de base : int, float, str, bool, list, et la fonction type()',
		category: 'bases',
		tags: ['variables', 'types', 'college'],
		code: variablesTypes
	},
	{
		id: 'operateurs',
		title: 'Opérateurs',
		description: 'Arithmétiques, comparaison, logiques, affectations composées',
		category: 'bases',
		tags: ['operateurs', 'college'],
		code: operateurs
	},
	{
		id: 'conditions-if',
		title: 'Conditions if / elif / else',
		description: 'Branchements et expression conditionnelle (ternaire)',
		category: 'bases',
		tags: ['if', 'college'],
		code: conditionsIf
	},
	{
		id: 'boucle-for',
		title: 'Boucle for',
		description: 'range, enumerate, itération sur listes, somme cumulative',
		category: 'bases',
		tags: ['for', 'college'],
		code: boucleFor
	},
	{
		id: 'boucle-while',
		title: 'Boucle while',
		description: 'while, break, continue, et algorithme d’Euclide pour le PGCD',
		category: 'bases',
		tags: ['while', 'lycee'],
		code: boucleWhile
	},
	{
		id: 'listes',
		title: 'Listes',
		description: 'Création, slicing, append/insert/remove, tri, compréhensions',
		category: 'bases',
		tags: ['list', 'slicing', 'comprehensions', 'lycee'],
		code: listes
	},
	{
		id: 'dictionnaires',
		title: 'Dictionnaires',
		description: 'Accès, ajout, itération, comptage de fréquences',
		category: 'bases',
		tags: ['dict', 'for', 'lycee'],
		code: dictionnaires
	},

	// ---- Fonctions ----
	{
		id: 'def-basique',
		title: 'Définir une fonction',
		description: 'def, return, retour multiple via tuple, valeur None par défaut',
		category: 'fonctions',
		tags: ['parametres', 'college'],
		code: defBasique
	},
	{
		id: 'args-defaults-kwargs',
		title: 'Paramètres par défaut, *args, **kwargs',
		description:
			'Argumentation flexible : valeurs par défaut, listes variadiques, dictionnaires nommés',
		category: 'fonctions',
		tags: ['defaults', 'args-kwargs', 'lycee'],
		code: argsDefaultsKwargs
	},
	{
		id: 'lambda-map-filter',
		title: 'Lambda, map, filter, sorted',
		description: 'Fonctions anonymes et programmation fonctionnelle',
		category: 'fonctions',
		tags: ['lambda', 'comprehensions', 'lycee'],
		code: lambdaMapFilter
	},
	{
		id: 'recursion-factorielle',
		title: 'Récursion : factorielle, Fibonacci',
		description: 'Fonctions qui s’appellent elles-mêmes (cas de base + cas récursif)',
		category: 'fonctions',
		tags: ['recursion', 'nsi'],
		code: recursionFactorielle
	},

	// ---- OOP ----
	{
		id: 'classe-point',
		title: 'Classe Point dans le plan',
		description: '__init__, __str__, méthodes, distance euclidienne, translation',
		category: 'oop',
		tags: ['class', 'lycee'],
		code: classePoint
	},
	{
		id: 'heritage-animal',
		title: 'Héritage : Animal, Chien, Chat',
		description: 'super(), redéfinition (override), polymorphisme',
		category: 'oop',
		tags: ['class', 'heritage', 'nsi'],
		code: heritageAnimal
	},
	{
		id: 'dataclass-livre',
		title: 'Dataclass : Livre',
		description: 'Le décorateur @dataclass génère __init__/__repr__/__eq__ automatiquement',
		category: 'oop',
		tags: ['dataclass', 'class', 'superieur'],
		code: dataclassLivre
	},

	// ---- Strings ----
	{
		id: 'methodes-string',
		title: 'Méthodes essentielles des chaînes',
		description: 'strip, lower/upper, find, replace, split, join, isdigit/isalpha',
		category: 'strings',
		tags: ['methodes-string', 'lycee'],
		code: methodesEssentielles
	},
	{
		id: 'f-strings-format',
		title: 'f-strings et formatage',
		description: 'Largeur, alignement, décimales, padding numérique, notation scientifique',
		category: 'strings',
		tags: ['f-strings', 'formatage', 'lycee'],
		code: fStringsFormat
	},

	// ---- Exceptions ----
	{
		id: 'try-except-finally',
		title: 'try / except / else / finally',
		description: 'Capturer plusieurs types d’exceptions et lever avec raise',
		category: 'exceptions',
		tags: ['try-except', 'lycee'],
		code: tryExceptFinally
	},
	{
		id: 'exceptions-custom',
		title: 'Exceptions personnalisées',
		description: 'Définir une sous-classe d’Exception avec attributs métier',
		category: 'exceptions',
		tags: ['custom-exceptions', 'class', 'nsi'],
		code: exceptionsCustom
	},

	// ---- I/O ----
	{
		id: 'fichier-texte',
		title: 'Lire et écrire un fichier texte',
		description: 'open avec context manager (with), modes w / a, lecture ligne par ligne',
		category: 'io',
		tags: ['fichiers', 'nsi'],
		code: fichierTexte
	},
	{
		id: 'json-lecture-ecriture',
		title: 'Sérialisation JSON',
		description: 'json.dump/load et json.dumps/loads pour stocker et échanger des données',
		category: 'io',
		tags: ['json', 'fichiers', 'nsi'],
		code: jsonLectureEcriture
	},

	// ---- Maths ----
	{
		id: 'sympy-equation',
		title: 'SymPy : équations et factorisation',
		description: 'Résolution d’équations, expand, factor, simplification trigonométrique',
		category: 'maths',
		tags: ['sympy', 'lycee'],
		code: sympyEquation
	},
	{
		id: 'numpy-vecteurs',
		title: 'NumPy : vecteurs et matrices',
		description: 'Opérations vectorielles, produit scalaire, statistiques, produit matriciel',
		category: 'maths',
		tags: ['numpy', 'superieur'],
		code: numpyVecteurs
	},
	{
		id: 'statistics-moyenne-ecart',
		title: 'Statistiques descriptives',
		description:
			'Moyenne, médiane, mode, variance, écart-type, quartiles avec le module statistics',
		category: 'maths',
		tags: ['statistics', 'lycee'],
		code: statisticsMoyenne
	},
	{
		id: 'fractions-pgcd',
		title: 'Fractions exactes et PGCD/PPCM',
		description: 'Module Fraction (calcul exact) et fonctions gcd/lcm du module math',
		category: 'maths',
		tags: ['fractions', 'math', 'lycee'],
		code: fractionsPgcd
	},

	// ---- Visualisation ----
	{
		id: 'matplotlib-courbe',
		title: 'Matplotlib : courbe sin/cos',
		description: 'plot, légende, grille, axes, mise en forme d’une figure',
		category: 'visualisation',
		tags: ['matplotlib', 'numpy', 'lycee'],
		code: matplotlibCourbe
	},
	{
		id: 'matplotlib-histogramme',
		title: 'Matplotlib : histogramme',
		description: 'Simulation de 1000 lancers de 3 dés et visualisation de la distribution',
		category: 'visualisation',
		tags: ['matplotlib', 'random', 'numpy', 'lycee'],
		code: matplotlibHistogramme
	},
	{
		id: 'plotly-interactif',
		title: 'Plotly : graphique interactif',
		description: 'Courbe avec hover, légende et template moderne',
		category: 'visualisation',
		tags: ['plotly', 'superieur'],
		code: plotlyInteractif
	},

	// ---- Algorithmes ----
	{
		id: 'tri-bulles',
		title: 'Tri à bulles',
		description: 'Algorithme de tri en O(n²), avec optimisation early-exit',
		category: 'algorithmes',
		tags: ['tri', 'nsi'],
		code: triBulles
	},
	{
		id: 'recherche-dichotomique',
		title: 'Recherche dichotomique',
		description: 'Recherche en O(log n) dans une liste triée + comparaison avec recherche linéaire',
		category: 'algorithmes',
		tags: ['recherche', 'nsi'],
		code: rechercheDichotomique
	}
];
