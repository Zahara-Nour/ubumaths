import type { PythonExample } from './types';

import helloWorld from './files/bases/hello-world.py?raw';
import variablesTypes from './files/bases/variables-types.py?raw';
import operateurs from './files/bases/operateurs.py?raw';
import conditionsIf from './files/bases/conditions-if.py?raw';
import boucleFor from './files/bases/boucle-for.py?raw';
import boucleWhile from './files/bases/boucle-while.py?raw';
import listes from './files/bases/listes.py?raw';
import dictionnaires from './files/bases/dictionnaires.py?raw';
import tuples from './files/bases/tuples.py?raw';
import ensemblesSet from './files/bases/ensembles-set.py?raw';
import comprehensionsAvancees from './files/bases/comprehensions-avancees.py?raw';
import matchCase from './files/bases/match-case.py?raw';
import bouclesImbriquees from './files/bases/boucles-imbriquees.py?raw';
import typesConversion from './files/bases/types-conversion.py?raw';
import membershipOperateurs from './files/bases/membership-operateurs.py?raw';
import rangeDetaille from './files/bases/range-detaille.py?raw';
import breakContinueElse from './files/bases/break-continue-else.py?raw';

import defBasique from './files/fonctions/def-basique.py?raw';
import argsDefaultsKwargs from './files/fonctions/args-defaults-kwargs.py?raw';
import lambdaMapFilter from './files/fonctions/lambda-map-filter.py?raw';
import recursionFactorielle from './files/fonctions/recursion-factorielle.py?raw';
import typeHints from './files/fonctions/type-hints.py?raw';
import closures from './files/fonctions/closures.py?raw';
import decorateursSimples from './files/fonctions/decorateurs-simples.py?raw';
import generateursYield from './files/fonctions/generateurs-yield.py?raw';
import generateursExpressions from './files/fonctions/generateurs-expressions.py?raw';
import fonctionsOrdreSuperieur from './files/fonctions/fonctions-ordre-superieur.py?raw';
import docstringsHelp from './files/fonctions/docstrings-help.py?raw';

import classePoint from './files/oop/classe-point.py?raw';
import heritageAnimal from './files/oop/heritage-animal.py?raw';
import dataclassLivre from './files/oop/dataclass-livre.py?raw';
import encapsulation from './files/oop/encapsulation.py?raw';
import properties from './files/oop/properties.py?raw';
import classmethodStaticmethod from './files/oop/classmethod-staticmethod.py?raw';
import abcAbstrait from './files/oop/abc-abstrait.py?raw';
import compositionVsHeritage from './files/oop/composition-vs-heritage.py?raw';

import methodesEssentielles from './files/strings/methodes-essentielles.py?raw';
import fStringsFormat from './files/strings/f-strings-format.py?raw';
import stringImmutable from './files/strings/string-immutable.py?raw';
import unicodeBytes from './files/strings/unicode-bytes.py?raw';
import regexBases from './files/strings/regex-bases.py?raw';
import formatSpecAvance from './files/strings/format-spec-avance.py?raw';
import tokenizationTextes from './files/strings/tokenization-textes.py?raw';

import tryExceptFinally from './files/exceptions/try-except-finally.py?raw';
import exceptionsCustom from './files/exceptions/exceptions-custom.py?raw';
import exceptionChaining from './files/exceptions/exception-chaining.py?raw';
import contextManagerClass from './files/exceptions/context-manager-class.py?raw';
import exceptionHierarchie from './files/exceptions/exception-hierarchie.py?raw';

import fichierTexte from './files/io/fichier-texte.py?raw';
import jsonLectureEcriture from './files/io/json-lecture-ecriture.py?raw';
import fichierBinaire from './files/io/fichier-binaire.py?raw';
import csvStdlib from './files/io/csv-stdlib.py?raw';
import pathlibModern from './files/io/pathlib-modern.py?raw';

import sympyEquation from './files/maths/sympy-equation.py?raw';
import numpyVecteurs from './files/maths/numpy-vecteurs.py?raw';
import statisticsMoyenne from './files/maths/statistics-moyenne-ecart.py?raw';
import fractionsPgcd from './files/maths/fractions-pgcd.py?raw';
import sympySystemeEquations from './files/maths/sympy-systeme-equations.py?raw';
import sympyDerivationIntegration from './files/maths/sympy-derivation-integration.py?raw';
import sympyLimites from './files/maths/sympy-limites.py?raw';
import sympySuites from './files/maths/sympy-suites.py?raw';
import sympyMatrices from './files/maths/sympy-matrices.py?raw';
import nombresComplexes from './files/maths/nombres-complexes.py?raw';
import equationDichotomie from './files/maths/equation-dichotomie.py?raw';
import sommeRiemann from './files/maths/somme-riemann.py?raw';
import suiteRecurrente from './files/maths/suite-recurrente.py?raw';

import matplotlibCourbe from './files/visualisation/matplotlib-courbe.py?raw';
import matplotlibHistogramme from './files/visualisation/matplotlib-histogramme.py?raw';
import matplotlibScatterCorrelation from './files/visualisation/matplotlib-scatter-correlation.py?raw';
import matplotlibCamembert from './files/visualisation/matplotlib-camembert.py?raw';
import matplotlibSubplots from './files/visualisation/matplotlib-subplots.py?raw';
import matplotlib3dSurface from './files/visualisation/matplotlib-3d-surface.py?raw';
import matplotlibCourbesParametriques from './files/visualisation/matplotlib-courbes-parametriques.py?raw';
import matplotlibFonctionTangente from './files/visualisation/matplotlib-fonction-tangente.py?raw';
import matplotlibFractale from './files/visualisation/matplotlib-fractale.py?raw';

import triBulles from './files/algorithmes/tri-bulles.py?raw';
import rechercheDichotomique from './files/algorithmes/recherche-dichotomique.py?raw';
import rechercheLineaire from './files/algorithmes/recherche-lineaire.py?raw';
import triInsertion from './files/algorithmes/tri-insertion.py?raw';
import triSelection from './files/algorithmes/tri-selection.py?raw';
import triFusion from './files/algorithmes/tri-fusion.py?raw';
import triRapide from './files/algorithmes/tri-rapide.py?raw';
import fibonacciMemoization from './files/algorithmes/fibonacci-memoization.py?raw';
import cribleEratosthene from './files/algorithmes/crible-eratosthene.py?raw';
import euclideEtendu from './files/algorithmes/euclide-etendu.py?raw';
import parcoursArbre from './files/algorithmes/parcours-arbre.py?raw';
import parcoursGrapheBfs from './files/algorithmes/parcours-graphe-bfs.py?raw';
import parcoursGrapheDfs from './files/algorithmes/parcours-graphe-dfs.py?raw';
import complexiteComparaison from './files/algorithmes/complexite-comparaison.py?raw';

import randomBases from './files/hasard/random-bases.py?raw';
import randomMonteCarloPi from './files/hasard/random-monte-carlo-pi.py?raw';
import randomSimulationDes from './files/hasard/random-simulation-des.py?raw';
import randomMarcheAleatoire1d from './files/hasard/random-marche-aleatoire-1d.py?raw';
import randomMarcheAleatoire2d from './files/hasard/random-marche-aleatoire-2d.py?raw';
import randomTirageLoto from './files/hasard/random-tirage-loto.py?raw';
import randomMelangeFisherYates from './files/hasard/random-melange-fisher-yates.py?raw';
import randomLoiBinomiale from './files/hasard/random-loi-binomiale.py?raw';
import randomGalton from './files/hasard/random-galton.py?raw';
import randomBootstrap from './files/hasard/random-bootstrap.py?raw';
import randomPileFaceStreak from './files/hasard/random-pile-face-streak.py?raw';

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
	{
		id: 'tuples',
		title: 'Tuples : séquences immuables',
		description: 'Création, unpacking, swap idiomatique, retour multiple',
		category: 'bases',
		tags: ['tuple', 'lycee'],
		code: tuples
	},
	{
		id: 'ensembles-set',
		title: 'Ensembles (set) et opérations ensemblistes',
		description: 'Union, intersection, différence, suppression de doublons',
		category: 'bases',
		tags: ['set', 'lycee'],
		code: ensemblesSet
	},
	{
		id: 'comprehensions-avancees',
		title: 'Compréhensions avancées',
		description: 'Compréhensions de liste/dict/set avec filtre, comprehensions imbriquées',
		category: 'bases',
		tags: ['comprehensions', 'list', 'dict', 'lycee'],
		code: comprehensionsAvancees
	},
	{
		id: 'match-case',
		title: 'Pattern matching (match/case)',
		description: 'Alternative élégante à if/elif (Python 3.10+) avec gardes et déstructuration',
		category: 'bases',
		tags: ['match', 'if', 'nsi'],
		code: matchCase
	},
	{
		id: 'boucles-imbriquees',
		title: 'Boucles imbriquées',
		description: 'Table de multiplication, recherche en matrice 2D, motifs en étoile',
		category: 'bases',
		tags: ['for', 'lycee'],
		code: bouclesImbriquees
	},
	{
		id: 'types-conversion',
		title: 'Conversion entre types',
		description: 'int(), float(), str(), bool() : règles de conversion et erreurs',
		category: 'bases',
		tags: ['types', 'college'],
		code: typesConversion
	},
	{
		id: 'membership-operateurs',
		title: 'Opérateur in et comparaisons chaînées',
		description: 'Test d’appartenance dans liste/string/dict/range, comparaisons type 18 ≤ x < 65',
		category: 'bases',
		tags: ['operateurs', 'list', 'lycee'],
		code: membershipOperateurs
	},
	{
		id: 'range-detaille',
		title: 'range : un objet paresseux',
		description: 'range(start, stop, step), pas négatif, complexité mémoire',
		category: 'bases',
		tags: ['for', 'lycee'],
		code: rangeDetaille
	},
	{
		id: 'break-continue-else',
		title: 'break, continue, else sur boucle',
		description: 'Sortie anticipée, saut d’itération, et la clause else (peu connue) sur for/while',
		category: 'bases',
		tags: ['for', 'while', 'lycee'],
		code: breakContinueElse
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
	{
		id: 'type-hints',
		title: 'Annotations de type (type hints)',
		description: 'Documenter les types de paramètres et de retour pour aider IDE et mypy',
		category: 'fonctions',
		tags: ['types', 'parametres', 'superieur'],
		code: typeHints
	},
	{
		id: 'closures',
		title: 'Closures : fonctions qui capturent leur contexte',
		description: 'Fonctions imbriquées partageant des variables, mot-clé nonlocal',
		category: 'fonctions',
		tags: ['lambda', 'parametres', 'nsi'],
		code: closures
	},
	{
		id: 'decorateurs-simples',
		title: 'Décorateurs : enrichir une fonction',
		description: 'Wrapper @chronometre, décorateurs paramétrés (@repeter(3))',
		category: 'fonctions',
		tags: ['decorateurs', 'nsi'],
		code: decorateursSimples
	},
	{
		id: 'generateurs-yield',
		title: 'Générateurs avec yield',
		description: 'Produire des valeurs paresseusement (Fibonacci infini, économies mémoire)',
		category: 'fonctions',
		tags: ['generators', 'nsi'],
		code: generateursYield
	},
	{
		id: 'generateurs-expressions',
		title: 'Expressions génératrices',
		description: 'Compréhensions paresseuses (x for x in …) — alternative économe en mémoire',
		category: 'fonctions',
		tags: ['generators', 'comprehensions', 'lycee'],
		code: generateursExpressions
	},
	{
		id: 'fonctions-ordre-superieur',
		title: 'Fonctions d’ordre supérieur',
		description: 'Fonction passée en argument ou retournée, composition, map/filter/reduce',
		category: 'fonctions',
		tags: ['lambda', 'nsi'],
		code: fonctionsOrdreSuperieur
	},
	{
		id: 'docstrings-help',
		title: 'Docstrings et help()',
		description: 'Documenter une fonction avec un format standard (Google, NumPy)',
		category: 'fonctions',
		tags: ['parametres', 'lycee'],
		code: docstringsHelp
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
	{
		id: 'encapsulation',
		title: 'Encapsulation : public, _privé, __mangle',
		description: 'Conventions Python pour cacher l’implémentation, name mangling',
		category: 'oop',
		tags: ['class', 'encapsulation', 'nsi'],
		code: encapsulation
	},
	{
		id: 'properties',
		title: 'Propriétés : @property et setter avec validation',
		description: 'Accès "naturel" aux attributs avec validation derrière, attribut calculé',
		category: 'oop',
		tags: ['class', 'properties', 'nsi'],
		code: properties
	},
	{
		id: 'classmethod-staticmethod',
		title: 'classmethod vs staticmethod',
		description: 'Constructeurs alternatifs et fonctions utilitaires rangées dans une classe',
		category: 'oop',
		tags: ['class', 'nsi'],
		code: classmethodStaticmethod
	},
	{
		id: 'abc-abstrait',
		title: 'Classes abstraites (abc)',
		description:
			'Forcer les sous-classes à implémenter certaines méthodes (Forme/Rectangle/Cercle)',
		category: 'oop',
		tags: ['class', 'heritage', 'superieur'],
		code: abcAbstrait
	},
	{
		id: 'composition-vs-heritage',
		title: 'Composition vs héritage',
		description: 'Quand préférer "A-UN" (composition) plutôt que "EST-UN" (héritage)',
		category: 'oop',
		tags: ['class', 'heritage', 'nsi'],
		code: compositionVsHeritage
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
	{
		id: 'string-immutable',
		title: 'Strings immuables : conséquences pratiques',
		description: 'Pourquoi utiliser .join() plutôt que la concaténation en boucle',
		category: 'strings',
		tags: ['methodes-string', 'complexite', 'lycee'],
		code: stringImmutable
	},
	{
		id: 'unicode-bytes',
		title: 'Unicode, bytes et encodage UTF-8',
		description: 'str ↔ bytes, encode/decode, code points, gestion des erreurs',
		category: 'strings',
		tags: ['methodes-string', 'nsi'],
		code: unicodeBytes
	},
	{
		id: 'regex-bases',
		title: 'Expressions régulières (re)',
		description: 'search, findall, sub, groupes de capture pour extraire des données du texte',
		category: 'strings',
		tags: ['regex', 'methodes-string', 'nsi'],
		code: regexBases
	},
	{
		id: 'format-spec-avance',
		title: 'Format spec avancé',
		description: 'Largeur, alignement, séparateurs de milliers, bases numériques',
		category: 'strings',
		tags: ['formatage', 'f-strings', 'lycee'],
		code: formatSpecAvance
	},
	{
		id: 'tokenization-textes',
		title: 'Tokenisation de textes',
		description: 'Découper un texte en mots/phrases, fréquences, statistiques lexicales',
		category: 'strings',
		tags: ['regex', 'methodes-string', 'nsi'],
		code: tokenizationTextes
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
	{
		id: 'exception-chaining',
		title: 'Chaînage d’exceptions (raise … from)',
		description: 'Préserver la cause originale d’une erreur tout en levant une exception métier',
		category: 'exceptions',
		tags: ['try-except', 'custom-exceptions', 'nsi'],
		code: exceptionChaining
	},
	{
		id: 'context-manager-class',
		title: 'Context manager avec __enter__ / __exit__',
		description:
			'Créer ses propres `with` (chronomètre, connexion factice) garantissant le nettoyage',
		category: 'exceptions',
		tags: ['try-except', 'class', 'nsi'],
		code: contextManagerClass
	},
	{
		id: 'exception-hierarchie',
		title: 'Hiérarchie d’exceptions métier',
		description: 'Organiser ses exceptions en arbre pour capturer par famille ou cas précis',
		category: 'exceptions',
		tags: ['custom-exceptions', 'heritage', 'nsi'],
		code: exceptionHierarchie
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
	{
		id: 'fichier-binaire',
		title: 'Fichiers binaires (mode wb / rb)',
		description: 'Lire et écrire des octets bruts, manipuler des entêtes, mode hexa',
		category: 'io',
		tags: ['fichiers', 'nsi'],
		code: fichierBinaire
	},
	{
		id: 'csv-stdlib',
		title: 'CSV : module standard csv',
		description: 'csv.DictReader, csv.DictWriter, personnalisation du délimiteur',
		category: 'io',
		tags: ['csv', 'fichiers', 'nsi'],
		code: csvStdlib
	},
	{
		id: 'pathlib-modern',
		title: 'pathlib : chemins de fichiers modernes',
		description: 'API orientée objet : Path / iterdir / glob, alternative à os.path',
		category: 'io',
		tags: ['fichiers', 'superieur'],
		code: pathlibModern
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
	{
		id: 'sympy-systeme-equations',
		title: 'SymPy : systèmes d’équations',
		description: 'solve sur 2-3 inconnues, paramètres littéraux, forme matricielle A·X = B',
		category: 'maths',
		tags: ['sympy', 'lycee'],
		code: sympySystemeEquations
	},
	{
		id: 'sympy-derivation-integration',
		title: 'SymPy : dérivation et intégration',
		description: 'diff, integrate, primitives et intégrales définies — théorème fondamental',
		category: 'maths',
		tags: ['sympy', 'lycee'],
		code: sympyDerivationIntegration
	},
	{
		id: 'sympy-limites',
		title: 'SymPy : limites',
		description: 'limit avec sin(x)/x, formes indéterminées, asymptotes, limites unilatérales',
		category: 'maths',
		tags: ['sympy', 'lycee'],
		code: sympyLimites
	},
	{
		id: 'sympy-suites',
		title: 'SymPy : sommes et séries',
		description: 'summation finies (Gauss) et infinies (e, π²/6 — problème de Bâle)',
		category: 'maths',
		tags: ['sympy', 'superieur'],
		code: sympySuites
	},
	{
		id: 'sympy-matrices',
		title: 'SymPy : algèbre linéaire',
		description: 'Matrix, déterminant, inverse, valeurs et vecteurs propres',
		category: 'maths',
		tags: ['sympy', 'superieur'],
		code: sympyMatrices
	},
	{
		id: 'nombres-complexes',
		title: 'Nombres complexes',
		description: 'complex, j, module, argument, conjugué, identité d’Euler, racines de l’unité',
		category: 'maths',
		tags: ['math', 'lycee'],
		code: nombresComplexes
	},
	{
		id: 'equation-dichotomie',
		title: 'Résolution numérique par dichotomie',
		description: 'Trouver une racine de f sur [a,b] par bissection — illustre le TVI',
		category: 'maths',
		tags: ['math', 'recherche', 'lycee'],
		code: equationDichotomie
	},
	{
		id: 'somme-riemann',
		title: 'Sommes de Riemann (rectangles, trapèzes)',
		description: 'Approximations numériques d’une intégrale définie',
		category: 'maths',
		tags: ['math', 'lycee'],
		code: sommeRiemann
	},
	{
		id: 'suite-recurrente',
		title: 'Suite récurrente : la suite logistique',
		description: 'u(n+1) = r·u(n)·(1 - u(n)) — point fixe, cycles, chaos selon r',
		category: 'maths',
		tags: ['math', 'matplotlib', 'lycee'],
		code: suiteRecurrente
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
		id: 'matplotlib-scatter-correlation',
		title: 'Matplotlib : nuage de points + régression',
		description: 'Ajustement affine y = ax + b sur des données et coefficient de corrélation',
		category: 'visualisation',
		tags: ['matplotlib', 'numpy', 'statistics', 'lycee'],
		code: matplotlibScatterCorrelation
	},
	{
		id: 'matplotlib-camembert',
		title: 'Matplotlib : camembert et donut',
		description: 'Visualiser des proportions avec autopct, explosion, donut',
		category: 'visualisation',
		tags: ['matplotlib', 'lycee'],
		code: matplotlibCamembert
	},
	{
		id: 'matplotlib-subplots',
		title: 'Matplotlib : grille de sous-graphiques',
		description: 'subplots(rows, cols) — composer plusieurs graphiques dans une figure',
		category: 'visualisation',
		tags: ['matplotlib', 'lycee'],
		code: matplotlibSubplots
	},
	{
		id: 'matplotlib-3d-surface',
		title: 'Matplotlib : surface 3D',
		description: 'meshgrid + plot_surface — visualiser une fonction de 2 variables',
		category: 'visualisation',
		tags: ['matplotlib', '3d', 'numpy', 'superieur'],
		code: matplotlib3dSurface
	},
	{
		id: 'matplotlib-courbes-parametriques',
		title: 'Matplotlib : courbes paramétriques',
		description: 'Lissajous, cycloïde, spirale d’Archimède via x(t), y(t)',
		category: 'visualisation',
		tags: ['matplotlib', 'numpy', 'lycee'],
		code: matplotlibCourbesParametriques
	},
	{
		id: 'matplotlib-fonction-tangente',
		title: 'Matplotlib : fonction et tangentes',
		description: 'Tracer f(x) = x³ − 3x avec ses tangentes en plusieurs points',
		category: 'visualisation',
		tags: ['matplotlib', 'numpy', 'lycee'],
		code: matplotlibFonctionTangente
	},
	{
		id: 'matplotlib-fractale',
		title: 'Matplotlib : ensemble de Mandelbrot',
		description: 'Itération sur le plan complexe pour visualiser la frontière du chaos',
		category: 'visualisation',
		tags: ['matplotlib', 'numpy', 'superieur'],
		code: matplotlibFractale
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
	},
	{
		id: 'recherche-lineaire',
		title: 'Recherche linéaire',
		description: 'Parcours séquentiel O(n), variantes : index unique ou toutes les positions',
		category: 'algorithmes',
		tags: ['recherche', 'lycee'],
		code: rechercheLineaire
	},
	{
		id: 'tri-insertion',
		title: 'Tri par insertion',
		description: 'Tri en place O(n²) — efficace sur listes presque triées (O(n))',
		category: 'algorithmes',
		tags: ['tri', 'nsi'],
		code: triInsertion
	},
	{
		id: 'tri-selection',
		title: 'Tri par sélection',
		description: 'Tri en place O(n²) — sélectionne le minimum à chaque passe',
		category: 'algorithmes',
		tags: ['tri', 'complexite', 'nsi'],
		code: triSelection
	},
	{
		id: 'tri-fusion',
		title: 'Tri fusion (merge sort)',
		description: 'Tri récursif O(n log n) garanti — diviser pour régner',
		category: 'algorithmes',
		tags: ['tri', 'recursion', 'nsi'],
		code: triFusion
	},
	{
		id: 'tri-rapide',
		title: 'Tri rapide (quicksort)',
		description: 'Tri récursif O(n log n) en moyenne — choix du pivot',
		category: 'algorithmes',
		tags: ['tri', 'recursion', 'nsi'],
		code: triRapide
	},
	{
		id: 'fibonacci-memoization',
		title: 'Fibonacci : naïf vs mémoïsé vs itératif',
		description: 'Comparaison de complexités exponentielle / linéaire avec chronométrage',
		category: 'algorithmes',
		tags: ['recursion', 'complexite', 'nsi'],
		code: fibonacciMemoization
	},
	{
		id: 'crible-eratosthene',
		title: 'Crible d’Ératosthène',
		description: 'Tous les nombres premiers ≤ n en O(n log log n) — théorème des nombres premiers',
		category: 'algorithmes',
		tags: ['math', 'nsi'],
		code: cribleEratosthene
	},
	{
		id: 'euclide-etendu',
		title: 'Euclide étendu et inverse modulaire',
		description: 'pgcd + identité de Bézout, application à la cryptographie (RSA)',
		category: 'algorithmes',
		tags: ['math', 'recursion', 'nsi'],
		code: euclideEtendu
	},
	{
		id: 'parcours-arbre',
		title: 'Parcours d’arbre binaire',
		description: 'Préfixe, infixe, postfixe (DFS) et en largeur (BFS)',
		category: 'algorithmes',
		tags: ['arbre', 'recursion', 'nsi'],
		code: parcoursArbre
	},
	{
		id: 'parcours-graphe-bfs',
		title: 'Parcours en largeur (BFS)',
		description: 'BFS sur graphe non pondéré + plus court chemin (en nombre d’arêtes)',
		category: 'algorithmes',
		tags: ['graphe', 'recherche', 'nsi'],
		code: parcoursGrapheBfs
	},
	{
		id: 'parcours-graphe-dfs',
		title: 'Parcours en profondeur (DFS)',
		description: 'Versions récursive et itérative, détection de cycle',
		category: 'algorithmes',
		tags: ['graphe', 'recursion', 'nsi'],
		code: parcoursGrapheDfs
	},
	{
		id: 'complexite-comparaison',
		title: 'Complexité : O(n) vs O(n²) vs O(1)',
		description: 'Mesures empiriques avec time.perf_counter — l’algorithme prime sur la machine',
		category: 'algorithmes',
		tags: ['complexite', 'nsi'],
		code: complexiteComparaison
	},

	// ---- Hasard ----
	{
		id: 'random-bases',
		title: 'random : les bases',
		description: 'random/randint/choice/sample/choices/shuffle, reproductibilité avec seed',
		category: 'hasard',
		tags: ['random', 'lycee'],
		code: randomBases
	},
	{
		id: 'random-monte-carlo-pi',
		title: 'Monte-Carlo : approximation de π',
		description: 'Estimer π en tirant des points dans le carré unité — loi des grands nombres',
		category: 'hasard',
		tags: ['random', 'simulation', 'lycee'],
		code: randomMonteCarloPi
	},
	{
		id: 'random-simulation-des',
		title: 'Simulation : somme de 2 dés',
		description: 'Distribution empirique vs probabilités théoriques (1/36, 2/36, …, 6/36, …)',
		category: 'hasard',
		tags: ['random', 'simulation', 'statistics', 'lycee'],
		code: randomSimulationDes
	},
	{
		id: 'random-marche-aleatoire-1d',
		title: 'Marche aléatoire 1D',
		description: 'Trajectoires ±1, statistiques de la position finale, écart-type √n',
		category: 'hasard',
		tags: ['random', 'simulation', 'matplotlib', 'lycee'],
		code: randomMarcheAleatoire1d
	},
	{
		id: 'random-marche-aleatoire-2d',
		title: 'Marche aléatoire 2D',
		description: 'Visualisation de trajectoires aléatoires dans le plan',
		category: 'hasard',
		tags: ['random', 'simulation', 'matplotlib', 'lycee'],
		code: randomMarcheAleatoire2d
	},
	{
		id: 'random-tirage-loto',
		title: 'Tirage du loto (sans remise)',
		description: 'sample pour 5 boules parmi 49 + chance — probabilité du jackpot',
		category: 'hasard',
		tags: ['random', 'math', 'lycee'],
		code: randomTirageLoto
	},
	{
		id: 'random-melange-fisher-yates',
		title: 'Mélange uniforme : Fisher-Yates',
		description:
			'Algorithme O(n) qui sous-tend random.shuffle, vérification empirique d’uniformité',
		category: 'hasard',
		tags: ['random', 'simulation', 'nsi'],
		code: randomMelangeFisherYates
	},
	{
		id: 'random-loi-binomiale',
		title: 'Loi binomiale empirique',
		description: 'Distribution du nombre de succès sur n épreuves de Bernoulli',
		category: 'hasard',
		tags: ['random', 'simulation', 'matplotlib', 'lycee'],
		code: randomLoiBinomiale
	},
	{
		id: 'random-galton',
		title: 'Planche de Galton',
		description: 'Convergence vers la gaussienne (théorème central limite)',
		category: 'hasard',
		tags: ['random', 'simulation', 'matplotlib', 'nsi'],
		code: randomGalton
	},
	{
		id: 'random-bootstrap',
		title: 'Bootstrap : intervalle de confiance',
		description: 'Méthode des percentiles par rééchantillonnage avec remise',
		category: 'hasard',
		tags: ['random', 'simulation', 'statistics', 'superieur'],
		code: randomBootstrap
	},
	{
		id: 'random-pile-face-streak',
		title: 'Plus longue série de pile/face',
		description: '100 lancers d’une pièce — la plus longue série atteint typiquement ~7',
		category: 'hasard',
		tags: ['random', 'simulation', 'lycee'],
		code: randomPileFaceStreak
	}
];
