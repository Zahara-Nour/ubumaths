import {
	CP,
	CM1,
	CM2,
	SIXIEME,
	SECONDE,
	CINQUIEME,
	QUATRIEME,
	CE1,
	CE2,
	TROISIEME,
	PREMIERE_SPE_MATHS,
	TERMINALE_SPE_MATHS,
} from '$lib/grades.js'
import {
	color1,
	color2,
	color3,
	correct_color,
	incorrect_color,
} from '$lib/colors'
const UNKNOWN = 'a determiner'

// OPTIONS
//
// pour les réponses de l'utilisateur :

// l'ordre des solutions n'est pas toujours important
// solutions-order-not-important

// require et no-penalty :
// require : la réponse est considérée fausse si ce critère n'est pas respecté
//           si require n'est pas utilisé, le critère correspondant non respecté
//           cause une pénalité (false par défaut = désactivé)
// no-penalty : ne peut pas être utilisé en même temps que require,
//            il n'y a pas de pénalité si le critère précédent n'est pas respecté
//            (false par défaut = désactivé)

// disallow :

//
// * espaces dans l'écriture des nombres
// enounce-no-spaces = false
// exp-no-spaces = false
//
// require-correct-spaces = false
// no-penalty-for-incorrect-spaces = false

// * produits implicites
// require-implicit-products = false
// no-penalty-for-explicit-products = false

// * parenthèses inutiles
// require-no-extraneaous-brackets = false
// no-penalty-for-extraneous-brackets = false
// no-penalty-for-extraneous-brackets-in-first-negative-term = false

// * zéros inutiles
// exp-allow-unecessary-zeros = false
//
// require-no-extraneaous-zeros = false
// no-penalty-for-extraneous-zeros = false

// * signes inutiles
// require-no-extraneaous-signs = false
// no-penalty-for-extraneous-signs = false

// * facteurs égaux à 1
// require-no-factor-one = false
// no-penalty-for-factor-one = false

// * facteurs égaux à 0
// require-no-factor-zero = false
// no-penalty-for-factor-zero = false

// * termes nuls
// require-no-null-terms = false
// no-penalty-for-null-terms = false

// * fractions non simplifiées
// require-reduced-fractions = false
// no-penalty-for-non-reduced-fractions = false

// * unités
// require-specific-unit = false
// no-penalty-for-not-respected-unit = false

// * permutation des termes et facteurs
// disallow-terms-permutation=false
// disallow-factors-permutation=false
// disallow-terms-and-factors-permutation=false
// penalty-for-terms-and-factors-permutation = false
// penalty-for-terms-permutation = false
// penalty-for-factors-permutation = false

// modifictaion de l'expression de la fonction
// shuffle-terms = false
// shuffle-factors = false
// shuffle-terms-and-factors = false
// shallow-shuffle-terms = false
// shallow-shuffle-factors = false
// exp-remove-unecessary-brackets = false

//*  mélange des choix (mélangés par défaut)
// no-shuffle-choices = false

// * unicité des questions
// allow-same-expression = false
// allow-same-enounce = false

const code = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

const questions = {
	Entiers: {
		Apprivoiser: {
			Ecriture: [
				// {
				// 	description: 'Essai choix multiples',
				// 	enounces: ['Choisis les bonnes réponses $$&1$$.'],
				// 	variables: [
				// 		{
				// 			'&1': '$e[1;9]',
				// 			'&2': '$e[0;9]\\{&1}',
				// 			'&4': '[_&1*10+&2_]',
				// 		},
				// 	],

				// 	choices: [[{ text: '$$1$$' }, { text: '$$2$$' }, { text: '$$3$$' }]],
				// 	solutions: [[1, 2]],
				// 	type: 'choices',
				// 	correctionDetails: [
				// 		[
				// 			{
				// 				text: 'La correction en détails.',
				// 			},
				// 		],
				// 	],
				// 	defaultDelay: 45,
				// 	grade: CP,
				// },
				{
					description: 'Connaître la position décimale',
					subdescription: "Jusqu'aux dizaines.",
					enounces: [
						'Dans le nombre $$&4$$, quel est le chiffre des dizaines ?',
						'Dans le nombre $$&4$$, quel est le chiffre des unités ?',
					],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$e[0;9]\\{&1}',
							'&4': '[_&1*10+&2_]',
						},
					],
					solutions: [['&1'], ['&2']],
					correctionFormat: [
						{
							correct: ['Le chiffre des dizaines est &answer.'],
						},
						{
							correct: ['Le chiffre des unités est &answer.'],
						},
					],
					options: [
						'require-no-extraneaous-zeros',
						'require-no-extraneaous-brackets',
						'require-no-extraneaous-signs',
					],
					defaultDelay: 10,
					grade: CP,
				},
				{
					description: 'Connaître la position décimale',
					subdescription: "Jusqu'aux centaines",
					enounces: [
						'Dans le nombre $$&4$$, quel est le chiffre des centaines ?',
						'Dans le nombre $$&4$$,  quel est le chiffre des dizaines ?',
						'Dans le nombre $$&4$$, quel est le chiffre des unités ?',
					],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$e[0;9]\\{&1}',
							'&3': '$e[0;9]\\{&1;&2}',
							'&4': '[_&1*100+&2*10+&3_]',
						},
					],
					solutions: [['&1'], ['&2'], ['&3']],
					correctionFormat: [
						{
							correct: ['Le chiffre des centaines est &answer.'],
						},
						{
							correct: ['Le chiffre des dizaines est &answer.'],
						},
						{
							correct: ['Le chiffre des unités est &answer.'],
						},
					],
					options: [
						'require-no-extraneaous-zeros',
						'require-no-extraneaous-brackets',
						'require-no-extraneaous-signs',
					],
					defaultDelay: 10,
					grade: CE1,
				},
				{
					description: "Parité d'un nombre entier",
					enounces: ['Quelle est la parité de ce nombre ?'],
					expressions: ['&2', '&3'],
					variables: [
						{
							'&1': '$e[0;49]',
							'&2': '[_2*&1_]',
							'&3': '[_2*&1+1_]',
						},
					],
					choices: [[{ text: 'pair' }, { text: 'impair' }]],

					correctionDetails: [
						[
							{
								text: '&expression est &solution car il se termine par 0, 2, 4, 6, ou 8.',
							},
						],
						[
							{
								text: '&expression est &solution car il se termine par 1, 3, 5, 7, ou 9.',
							},
						],
					],
					solutions: [[0], [1]],
					options: ['no-shuffle-choices'],
					defaultDelay: 10,
					grade: CE1,
				},
				{
					description: 'Connaître la position décimale',
					subdescription: "Jusqu'aux milliers",
					enounces: [
						'Dans le nombre $$&5$$, quel est le chiffre des milliers ?',
						'Dans le nombre $$&5$$, quel est le chiffre des centaines ?',
						'Dans le nombre $$&5$$,  quel est le chiffre des dizaines ?',
						'Dans le nombre $$&5$$, quel est le chiffre des unités ?',
					],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$e[0;9]\\{&1}',
							'&3': '$e[0;9]\\{&1;&2}',
							'&4': '$e[0;9]\\{&1;&2;&3}',
							'&5': '[_&1*1000+&2*100+&3*10+&4_]',
						},
					],
					solutions: [['&1'], ['&2'], ['&3'], ['&4']],
					correctionFormat: [
						{
							correct: ['Le chiffre des milliers est &answer.'],
						},
						{
							correct: ['Le chiffre des centaines est &answer.'],
						},
						{
							correct: ['Le chiffre des dizaines est &answer.'],
						},
						{
							correct: ['Le chiffre des unités est &answer.'],
						},
					],
					options: [
						'require-no-extraneaous-zeros',
						'require-no-extraneaous-brackets',
						'require-no-extraneaous-signs',
					],
					defaultDelay: 10,
					grade: CE2,
				},
				{
					description: 'Ecrire un grand nombre entier avec des espaces',
					subdescription: 'Nombre à 4 chiffres',
					enounces: [
						'Réécris ce nombre entier en ajoutant un espace pour séparer le chiffre des milliers.',
					],
					expressions: ['&1'],
					variables: [{ '&1': '$e{4;4}' }],
					options: ['exp-no-spaces', 'require-correct-spaces'],

					defaultDelay: 15,
					grade: CE2,
				},
				{
					description: 'Ecrire un grand nombre entier avec des espaces',
					subdescription: "Jusqu'à 7 chiffres",
					enounces: [
						'Réécris ce nombre entier en rajoutant des espaces pour former des groupes de 3 chiffres.',
					],
					expressions: ['&2'],
					variables: [{ '&1': '$e[4;7]', '&2': '$e{&1;&1}' }],
					options: ['exp-no-spaces', 'require-correct-spaces'],

					defaultDelay: 30,
					grade: CM1,
				},
				{
					description: 'Ecrire un grand nombre entier sans les zéros inutiles',
					enounces: [
						'Réécris ce nombre entier en enlevant les zéros inutiles.',
					],
					expressions: [
						'00&1&2&3&4',
						'00&1&2&3&40',
						'00&1&2&3&400',
						'0&1&2&3&4',
						'0&1&2&3&40',
						'0&1&2&3&400',
					],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$l{0;$e[1;9]}',
							'&3': '$l{0;$e[1;9]}',
							'&4': '$e[1;9]',
						},
					],
					options: [
						'exp-allow-unecessary-zeros',
						'require-no-extraneaous-zeros',
					],
					defaultDelay: 20,
					grade: CM1,
				},
				{
					description: 'Ecrire un grand nombre entier avec des espaces',
					subdescription: "Jusqu'à 10 chiffres",
					enounces: [
						'Réécris ce nombre entier en rajoutant des espaces pour former des groupes de 3 chiffres.',
					],
					expressions: ['&2'],
					variables: [{ '&1': '$e[4;10]', '&2': '$e{&1;&1}' }],
					options: ['exp-no-spaces', 'require-correct-spaces'],

					defaultDelay: 30,
					grade: CM2,
				},
				{
					description: 'Enigme pour trouver un nombre',
					enounces: [
						'Je suis un nombre à 3 chiffres. Mon <b>chiffre des unités</b> est $$&1$$. Le <b>nombre</b> de mes dizaines est le double du chiffre des unités. Qui suis-je ?',
						'Je suis un nombre à 3 chiffres. Mon <b>chiffre des unités</b> est $$&1$$. Le <b>nombre</b> de mes dizaines est le triple du chiffre des unités. Qui suis-je ?',
					],
					solutions: [['[_&1*21_]'], ['[_&1*31_]']],
					variables: [{ '&1': '$e[5;9]' }],
					correctionFormat: [
						{
							correct: ['Je suis &answer.'],
						},
					],

					defaultDelay: 30,
					grade: CM2,
				},
			],
			Décomposition: [
				{
					description: "Décomposer l'écriture décimale un nombre",
					subdescription: 'En dizaines et unités',
					enounces: [
						'Décompose ce nombre en dizaines et unités comme dans cet exemple : $$74=70+4$$.',
					],
					expressions: ['[_&1*10+&2_]'],
					solutions: [['[_&1*10_]+&2']],
					variables: [{ '&1': '$e[1;9]', '&2': '$e[1;9]' }],
					defaultDelay: 20,
					grade: CP,
				},
				{
					description:
						"Décomposition décimale -> nombre entier (jusqu'aux centaines)",
					enounces: [
						"Réécris cette expression sous la forme d'un nombre entier.",
					],
					expressions: ['(&1*100) +  (&2*10) + &3'],
					variables: [
						{
							'&1': '$e[0;9]',
							'&2': '$e[0;9]',
							'&3': '$e[0;9]',
						},
					],
					options: ['remove-null-terms'],
					defaultDelay: 20,
					grade: CE1,
				},
				{
					description: "Décomposer l'écriture décimale un nombre",
					subdescription: 'En centaines, dizaines et unités',
					enounces: ['Décompose ce nombre en centaines, dizaines et unités.'],
					expressions: ['[_&1*100+&2*10+&3_]'],
					solutions: [['[_&1*100_]+[_&2*10_]+&3']],
					variables: [{ '&1': '$e[1;9]', '&2': '$e[0;9]', '&3': '$e[0;9]' }],
					defaultDelay: 20,
					grade: CE1,
				},
				{
					description: "Décomposer l'écriture décimale un nombre",
					subdescription:
						"En centaines, dizaines et unités, à l'aide de produits",
					enounces: [
						'Décompose ce nombre comme dans cet exemple : $$345 = (3 * 100) +(4 * 10) + 5$$.',
					],
					expressions: [
						'[_&1*100 + &2*10 + &3_]',
						// '[_(&1*1000) +  (&2*100) + (&3*10) + &4_]',
					],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]',
							'&3': '$e[1;9]',
						},
					],
					solutions: [['(&1*100) + (&2*10) + &3']],
					// solutions:[['&1*1000 +  &2*100 + &3*10 + &4']],
					options: [
						'no-penalty-for-extraneous-brackets',
						'no-penalty-for-factor-one',
					],
					defaultDelay: 30,
					grade: CE1,
				},
				{
					description:
						"Décomposition décimale -> nombre entier (jusqu'aux milliers)",
					enounces: [
						"Réécris cette expression sous la forme d'un nombre entier.",
					],
					expressions: ['(&1*1000) +  (&2*100) + (&3*10) + &4'],
					variables: [
						{
							'&1': '$e[0;9]',
							'&2': '$e[0;9]',
							'&3': '$e[0;9]',
							'&4': '$e[0;9]',
						},
					],
					options: [
						'remove-null-terms',
						'no-penalty-for-extraneous-brackets',
						'no-penalty-for-factor-one',
						'no-penalty-for-factor-zero',
					],
					defaultDelay: 20,
					grade: CE2,
				},
				{
					description: "Décomposer l'écriture décimale un nombre",
					subdescription: 'En milliers, centaines, dizaines et unités',
					enounces: [
						'Décompose ce nombre comme dans cet exemple : $$2345 = 2000+ 300 + 40 + 5$$.',
					],
					expressions: ['[_&1*1000+&2*100+&3*10+&4_]'],
					solutions: [['[_&1*1000_]+[_&2*100_]+[_&3*10_]+&4']],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]',
							'&3': '$e[1;9]',
							'&4': '$e[1;9]',
						},
					],
					defaultDelay: 20,
					grade: CE2,
				},
				{
					description: "Décomposer l'écriture décimale un nombre",
					subdescription:
						"En milliers, centaines, dizaines et unités, à l'aide de produits",
					enounces: [
						'Décompose ce nombre comme dans cet exemple : $$2345 = (2 * 1000) + (3 * 100) +(4 * 10) + 5$$',
					],
					expressions: [
						'[_&1*1000 + &2*100 + &3*10+&4_]',
						// '[_(&1*1000) +  (&2*100) + (&3*10) + &4_]',
					],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]',
							'&3': '$e[1;9]',
							'&4': '$e[1;9]',
						},
					],
					solutions: [['(&1*1000) + (&2*100) + (&3*10)+&4']],

					// solutions:[['&1*1000 +  &2*100 + &3*10 + &4']],
					options: [
						'no-penalty-for-extraneous-brackets',
						'no-penalty-for-factor-one',
					],
					defaultDelay: 40,
					grade: CE2,
				},
				{
					description: 'Décomposition décimale -> nombre entier',
					enounces: [
						"Réécris cette expression sous la forme d'un nombre entier.",
					],
					expressions: ['(&1*10000) +  (&2*1000) + (&3*100) + (&4*10) + &5'],
					variables: [
						{
							'&1': '$e[0;9]',
							'&2': '$e[0;9]',
							'&3': '$e[0;9]',
							'&4': '$e[0;9]',
							'&5': '$e[0;9]',
						},
					],
					options: ['remove-null-terms'],
					defaultDelay: 20,
					grade: CM1,
				},
				{
					description: 'Décomposition décimale -> nombre entier',
					subdescription: 'Termes mélangés',
					enounces: [
						"Réécris cette expression sous la forme d'un nombre entier.",
					],
					expressions: ['(&1*10000) +  (&2*1000) + (&3*100) + (&4*10) + &5'],
					variables: [
						{
							'&1': '$e[0;9]',
							'&2': '$e[0;9]',
							'&3': '$e[0;9]',
							'&4': '$e[0;9]',
							'&5': '$e[0;9]',
						},
					],
					options: ['remove-null-terms', 'shuffle-terms'],
					defaultDelay: 20,
					grade: CM1,
				},
				{
					description: "Décomposer l'écriture décimale un nombre",
					subdescription:
						'En dizaines de milliers, milliers, centaines, dizaines et unités',
					enounces: [
						'Décompose ce nombre en dizaines de milliers, milliers, centaines, dizaines et unités, comme dans cet exemple : $$23456 = 20000 + 3000 + 400 + 50 + 6$$.',
					],
					expressions: ['[_&1*10000+&2*1000+&3*100+&4*10+&5_]'],
					solutions: [['[_&1*10000_]+[_&2*1000_]+[_&3*100_]+[_&4*10_]+&5']],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]',
							'&3': '$e[1;9]',
							'&4': '$e[1;9]',
							'&5': '$e[1;9]',
						},
					],

					defaultDelay: 20,
					grade: CM1,
				},
				{
					description: "Décomposer l'écriture décimale un nombre",
					subdescription:
						"En dizaines de milliers, milliers, centaines, dizaines et unités, à l'aide de produits",
					enounces: [
						'Décompose ce nombre comme dans cet exemple : $$23456 = (2 * 10000) +(3 * 1000) + (4*100) +(5*10) + 6$$.',
					],
					expressions: [
						'[_&1*10000 + &2*1000 + &3*100+&4*10+&5_]',
						// '[_(&1*1000) +  (&2*100) + (&3*10) + &4_]',
					],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]',
							'&3': '$e[1;9]',
							'&4': '$e[1;9]',
							'&5': '$e[1;9]',
						},
					],
					solutions: [['(&1*10000) + (&2*1000) + (&3*100)+(&4*10)+&5']],
					options: [
						'no-penalty-for-extraneous-brackets',
						'no-penalty-for-factor-one',
					],
					defaultDelay: 50,
					grade: CM1,
				},
			],
			Repérage: [
				{
					description: 'Repérer sur une demi-droite graduée.',
					enounces: ['Quel est ce nombre ?'],

					images: [
						'entiers/reperage/droite_graduee-10_en_10-0-600.png',
						'entiers/reperage/droite_graduee-10_en_10-1-600.png',
						'entiers/reperage/droite_graduee-10_en_10-2-600.png',
						'entiers/reperage/droite_graduee-10_en_10-3-600.png',
						'entiers/reperage/droite_graduee-10_en_10-4-600.png',
						'entiers/reperage/droite_graduee-10_en_10-5-600.png',
						'entiers/reperage/droite_graduee-10_en_10-6-600.png',
						'entiers/reperage/droite_graduee-10_en_10-7-600.png',
						'entiers/reperage/droite_graduee-10_en_10-8-600.png',
						'entiers/reperage/droite_graduee-10_en_10-9-600.png',
						'entiers/reperage/droite_graduee-10_en_10-10-600.png',
						'entiers/reperage/droite_graduee-10_en_10-11-600.png',
						'entiers/reperage/droite_graduee-10_en_10-12-600.png',
						'entiers/reperage/droite_graduee-10_en_10-13-600.png',
						'entiers/reperage/droite_graduee-10_en_10-14-600.png',
						'entiers/reperage/droite_graduee-10_en_10-15-600.png',
						'entiers/reperage/droite_graduee-10_en_10-16-600.png',
						'entiers/reperage/droite_graduee-10_en_10-17-600.png',
						'entiers/reperage/droite_graduee-10_en_10-18-600.png',
						'entiers/reperage/droite_graduee-10_en_10-19-600.png',
					],
					solutions: [['560']],
					correctionFormat: [
						{
							correct: ['Le nombre est &answer'],
						},
					],
					defaultDelay: 20,
					grade: CP,
				},
			],
			Comparer: [
				{
					description: 'Comparer deux nombres entiers',
					subdescription: 'Nombres inférieurs à 100',
					enounces: ['Quel est le plus petit de ces 2 nombres ?'],
					variables: [
						{
							'&1': '$e[0;9]',
							'&2': '$e[0;9]',
							'&3': '$e[0;9]',
							'&4': '$e[0;9]',
							'&5': '[_&1*10+&2_]',
							'&6': '[_&3*10+&4_]',
						},
					],
					conditions: ['&5!=&6'],
					choices: [[{ text: '$$&5$$' }, { text: '$$&6$$' }]],
					solutions: [['&5<&6 ?? 0 :: 1']],
					defaultDelay: 10,
					grade: CP,
				},
				{
					description: 'Comparer deux nombres entiers',
					subdescription: 'Nombres inférieurs à 1000',
					enounces: ['Quel est le plus petit de ces 2 nombres ?'],
					variables: [
						{
							'&1': '$e[0;9]',
							'&2': '$e[0;9]',
							'&3': '$e[1;9]',
							'&4': '$e[0;9]',
							'&5': '$e[0;9]',
							'&6': '$e[1;9]',
							'&7': '[_&1*100+&2*10+&3_]',
							'&8': '[_&4*100+&5*10+&6_]',
						},
					],
					conditions: ['&7!=&8'],
					choices: [[{ text: '$$&7$$' }, { text: '$$&8$$' }]],
					solutions: [['&7<&8 ?? 0 :: 1']],
					defaultDelay: 10,
					grade: CE1,
				},
				{
					description: 'Comparer deux nombres entiers',
					subdescription: 'Nombres inférieurs à $$10000$$',
					enounces: ['Quel est le plus petit de ces 2 nombres ?'],
					variables: [
						{
							'&1': '$e[0;9]',
							'&2': '$e[0;9]',
							'&3': '$e[0;9]',
							'&4': '$e[0;9]',
							'&5': '$e[0;9]',
							'&6': '$e[0;9]',
							'&7': '&1*1000+&2*100+&3*10+$e[0;9]',
							'&8': '&4*1000+&5*100+&6*10+$e[0;9]',
						},
					],
					conditions: ['&7!=&8'],
					choices: [[{ text: '$$[_&7_]$$' }, { text: '$$[_&8_]$$' }]],
					solutions: [['&7<&8 ?? 0 :: 1']],
					defaultDelay: 10,
					grade: CE2,
				},
				{
					description: 'Comparer deux nombres entiers',
					subdescription: "Jusqu'au million",
					enounces: ['Quel est le plus petit de ces 2 nombres ?'],
					variables: [
						{
							'&1': '$e[0;4]', // nombre de chiffres identiques
							'&2': '$e[4-&1;7-&1]', // nombre de chiffres différents
							'&3': '$e{&1;&1}', //partie identique
							'&4': '$e{&2;&2}', // parties différentes
							'&5': '$e{&2;&2}',
							'&6': '[_&4+&3*10^&2_]',
							'&7': '[_&5+&3*10^&2_]',
						},
					],
					conditions: ['&6!=&7'],
					choices: [[{ text: '$$&6$$' }, { text: '$$&7$$' }]],
					solutions: [['&6<&7 ?? 0 :: 1']],
					defaultDelay: 20,
					grade: CM1,
				},
			],
		},
		Additionner: {
			Tables: [
				{
					description: "Table d'addition'",
					subdescription: 'de 1',
					enounces: ['Calcule.'],
					expressions: ['&1+1'],
					variables: [{ '&1': '$e[0;9]' }],

					defaultDelay: 15,
					grade: CP,
				},
				{
					description: "Table d'addition'",
					subdescription: 'de 2',
					enounces: ['Calcule.'],
					expressions: ['&1+2'],
					variables: [{ '&1': '$e[0;9]' }],

					defaultDelay: 15,
					grade: CP,
				},
				{
					description: "Table d'addition'",
					subdescription: 'de 3',
					enounces: ['Calcule.'],
					expressions: ['&1+3'],
					variables: [{ '&1': '$e[0;9]' }],

					defaultDelay: 15,
					grade: CP,
				},
				{
					description: "Table d'addition'",
					subdescription: 'de 4',
					enounces: ['Calcule.'],
					expressions: ['&1+4'],
					variables: [{ '&1': '$e[0;9]' }],

					defaultDelay: 15,
					grade: CP,
				},
				{
					description: "Table d'addition'",
					subdescription: 'de 5',
					enounces: ['Calcule.'],
					expressions: ['&1+5'],
					variables: [{ '&1': '$e[0;9]' }],

					defaultDelay: 15,
					grade: CP,
				},
				{
					description: "Table d'addition'",
					subdescription: 'de 6',
					enounces: ['Calcule.'],
					expressions: ['&1+6'],
					variables: [{ '&1': '$e[0;9]' }],

					defaultDelay: 15,
					grade: CP,
				},
				{
					description: "Table d'addition'",
					subdescription: 'de 7',
					enounces: ['Calcule.'],
					expressions: ['&1+7'],
					variables: [{ '&1': '$e[0;9]' }],

					defaultDelay: 15,
					grade: CP,
				},
				{
					description: "Table d'addition'",
					subdescription: 'de 8',
					enounces: ['Calcule.'],
					expressions: ['&1+8'],
					variables: [{ '&1': '$e[0;9]' }],

					defaultDelay: 15,
					grade: CP,
				},
				{
					description: "Table d'addition'",
					subdescription: 'de 9',
					enounces: ['Calcule.'],
					expressions: ['&1+9'],
					variables: [{ '&1': '$e[0;9]' }],

					defaultDelay: 15,
					grade: CP,
				},
			],
			Somme: [
				{
					description: 'Calculer une somme',
					subdescription: 'Somme égale à 10',
					enounces: ['Calcule.'],
					expressions: ['&1 + [_10-&1_]'],
					variables: [{ '&1': '$e[0;9]' }],
					defaultDelay: 10,
					grade: CP,
				},
				{
					description: 'Calculer une somme',
					subdescription:
						'Nombres à 1 chiffre. Nombre plus grand en premier. Somme inférieure ou égale à 10',
					enounces: ['Calcule.'],
					expressions: ['&1 + &2'],
					variables: [
						{
							'&1': '$e[3;8]',
							'&2': '$e[2;[_mini(10-&1;&1-1)_]]',
							//  '&3':'$e[2;&2]'
						},
					],

					defaultDelay: 10,
					grade: CP,
				},
				{
					description: 'Calculer une somme',
					subdescription: 'Nombres entiers à 1 chiffre. Somme inférieure à 10.',
					enounces: ['Calcule.'],
					expressions: ['&1 + &2', '&1 + &2'],
					variables: [
						{ '&1': '$e[5;7]', '&2': '$e[2;9-&1]' },
						{ '&1': '$e[2;4]', '&2': '$e[2;9-&1]' },
					],

					defaultDelay: 15,
					grade: CP,
				},
				{
					description: 'Calculer une somme',
					subdescription: 'Nombres à 1 chiffre. Nombre plus grand en premier.',
					enounces: ['Calcule.'],
					expressions: ['&1 + &2'],
					variables: [
						{
							'&1': '$e[3;9]',
							'&2': '$e[1;&1-1]',
							//  '&3':'$e[2;&2]'
						},
					],

					defaultDelay: 10,
					grade: CP,
				},
				{
					description: 'Calculer une somme',
					subdescription:
						'Somme sans retenue. Au moins un nombre à 2 chiffres.',
					enounces: ['Calcule.'],
					expressions: [
						'[_&1*10 + &2_] + [_&3*10 + &4_]',
						'[_&1*10 + &2_] + [_&3*10 + &4_]',
						'[_&1*10 + &2_] + [_&3*10 + &4_]',
						'[_&1*10 + &2_] + [_&3*10 + &4_]',
						'[_&1*10 + &2_] + &4',
						'[_&1*10 + &2_] + &4',
						'[_&1*10 + &2_] + &4',
						'[_&1*10 + &2_] + &4',
					],
					variables: [
						{
							'&1': '$e[5;7]',
							'&3': '$e[1;9-&1]',
							'&2': '$e[5;7]',
							'&4': '$e[2;9-&2]',
						},
						{
							'&1': '$e[2;4]',
							'&3': '$e[1;9-&1]',
							'&2': '$e[2;4]',
							'&4': '$e[2;9-&2]',
						},
						{
							'&1': '$e[5;7]',
							'&3': '$e[1;9-&1]',
							'&2': '$e[2;4]',
							'&4': '$e[2;9-&2]',
						},
						{
							'&1': '$e[2;4]',
							'&3': '$e[1;9-&1]',
							'&2': '$e[5;7]]',
							'&4': '$e[2;9-&2]',
						},
						{
							'&1': '$e[5;7]',
							'&2': '$e[5;7]',
							'&4': '$e[2;9-&2]',
						},
						{
							'&1': '$e[2;4]',
							'&2': '$e[2;4]',
							'&4': '$e[2;9-&2]',
						},
						{
							'&1': '$e[5;7]',
							'&2': '$e[2;4]',
							'&4': '$e[2;9-&2]',
						},
						{
							'&1': '$e[2;4]',
							'&2': '$e[5;7]]',
							'&4': '$e[2;9-&2]',
						},
					],

					defaultDelay: 20,
					grade: CP,
				},
				{
					description: 'Calculer une somme',
					subdescription:
						'Somme d’un nombre à deux chiffres et d’un nombre à un chiffre, avec franchissement de la dizaine',
					enounces: ['Calcule.'],
					expressions: ['[_&1*10 + &2_] + &3'],
					variables: [
						{
							'&1': '$e[2;8]',
							'&2': '$e[2;9]',
							'&3': '$e[11-&2;9]',
						},
					],

					defaultDelay: 20,
					grade: CP,
				},
				{
					description: 'Calculer une somme',
					subdescription:
						'sommes d’un nombre à deux chiffres et de dizaines entières',
					enounces: ['Calcule.'],
					expressions: ['[_&1*10 + &2_] + [_&3*10_]'],
					variables: [
						{
							'&1': '$e[2;8]',
							'&2': '$e[1;9]',
							'&3': '$e[1;9-&1]',
						},
					],

					defaultDelay: 10,
					grade: CP,
				},
				{
					description: 'Calculer une somme',
					subdescription: 'Nombres entiers à 1 chiffre',
					enounces: ['Calcule.'],
					expressions: ['&1 + &2'],
					variables: [{ '&1': '$e[2;9]', '&2': '$e[11-&1;9]' }],

					defaultDelay: 20,
					grade: CE1,
				},
				{
					description: 'Calculer une somme',
					subdescription:
						'Nombres entiers à 2 chiffres (sans retenue entre les unités et les dizaines)',
					enounces: ['Calcule.'],
					expressions: ['[_&1*10 + &2_] +[_&3*10+&4_]'],
					variables: [
						{
							'&1': '$e[1;9]',
							'&3': '$e[1;9]',
							'&2': '$e[1;8]',
							'&4': '$e[1;9-&2]',
						},
					],

					defaultDelay: 15,
					grade: CE1,
				},
				{
					description: 'Calculer une somme',
					subdescription:
						'Somme d’un nombre ayant au plus trois chiffres et d’un nombre ayant un seul chiffre non nul',
					enounces: ['Calcule.'],
					expressions: ['[_&1*100 + &2*10+&3_] +[_&5*10^&4_]'],
					variables: [
						{
							'&1': '$e[0;9]',
							'&2': '$e[0;9]',
							'&3': '$e[1;9]',
							'&4': '$e[0;2]',
							'&5': '$e[1;9]',
						},
					],

					defaultDelay: 15,
					grade: CE1,
				},
				{
					description: 'Calculer une somme',
					subdescription: 'Nombres entiers à 2 chiffres dont la somme vaut 100',
					enounces: ['Calcule.'],
					expressions: ['[_&2_]+[_100-&2_]'],
					variables: [
						{
							'&1': '$e[3;9]',
							'&2': '$e[12;&1*10-12]',
						},
					],

					defaultDelay: 15,
					grade: CE2,
				},
				{
					description: 'Calculer une somme',
					subdescription: 'Nombres entiers à 2 chiffres qui se marrient bien',
					enounces: ['Calcule.'],
					expressions: ['[_&2_] +[_&1*10-&2_]'],
					variables: [
						{
							'&1': '$e[3;9]',
							'&2': '$e[12;&1*10-12]',
						},
					],

					defaultDelay: 15,
					grade: CE2,
				},
				{
					description: 'Calculer une somme',
					subdescription:
						'somme de deux termes dont le résultat est inférieur à 100',
					enounces: ['Calcule.'],
					expressions: ['&1 + &2', '&1 + &2'],
					variables: [{ '&1': '$e[1;98]', '&2': '$e[1;99-&1]' }],

					defaultDelay: 20,
					grade: CE2,
				},
				{
					description: 'Calculer une somme',
					subdescription:
						'Somme d’un nombre ayant au plus 4 chiffres et d’un nombre ayant un seul chiffre non nul',
					enounces: ['Calcule.'],
					expressions: ['[_&1*1000 + &2*100+&3*10+&4_] +[_&6*10^&5_]'],
					variables: [
						{
							'&1': '$e[0;9]',
							'&2': '$e[0;9]',
							'&3': '$e[0;9]',
							'&4': '$e[1;9]',
							'&5': '$e[0;3]',
							'&6': '$e[1;9]',
						},
					],

					defaultDelay: 15,
					grade: CE2,
				},
				{
					description: 'Calculer une somme',
					subdescription: 'Nombres entiers à 2 chiffres (avec retenue)',
					enounces: ['Calcule.'],
					expressions: ['[_&1*10 + &2_] +[_&3*10+&4_]'],
					variables: [
						{
							'&1': '$e[1;7]',
							'&3': '$e[1;8-&1]',
							'&2': '$e[2;9]',
							'&4': '$e[11-&2;9]',
						},
					],

					defaultDelay: 15,
					grade: CM1,
				},
				{
					description: 'Calculer une somme',
					subdescription: 'Nombres entiers à 3 chiffres (sans retenue)',
					enounces: ['Calcule.'],
					expressions: ['[_&1*100 + &2*10 + &3_] + [_&4*100 + &5*10 + &6_]'],
					variables: [
						{
							'&1': '$e[1;8]',
							'&4': '$e[1;9-&1]',
							'&2': '$e[1;8]',
							'&5': '$e[1;9-&2]',
							'&3': '$e[1;8]',
							'&6': '$e[1;9-&3]',
						},
					],

					defaultDelay: 30,
					grade: CM2,
				},
				{
					description: 'Calculer une somme',
					subdescription: 'Nombres entiers à 3 chiffres (avec retenue)',
					enounces: ['Calcule.'],
					expressions: ['[_&1*100 + &2*10 + &3_] +[_&4*100+&5*10+&6_]'],
					variables: [
						{
							'&1': '$e[1;7]',
							'&4': '$e[1;8-&1]',
							'&2': '$e[1;7]',
							'&5': '$e[1;8-&2]',
							'&3': '$e[2;9]',
							'&6': '$e[11-&3;9]',
						},
					],

					defaultDelay: 15,
					grade: CM2,
				},
			],
			Complément: [
				{
					description: 'Trouver le complément',
					subdescription: 'Complément à 10',
					enounces: ['Complète.'],
					expressions: ['?+&1=10', '&1+?=10'],
					solutions: [['[_10-&1_]']],
					variables: [{ '&1': '$e[1;9]' }],
					type: 'fill in',
					defaultDelay: 20,
					grade: CP,
				},
				{
					description: 'Trouver le complément',
					subdescription: 'A la dizaine supérieure',
					enounces: ['Complète.'],
					expressions: ['?+[_&3-&2_]=&3', '[_&3-&2_]+?=&3'],
					solutions: [['&2']],
					variables: [{ '&1': '$e[2;9]', '&2': '$e[1;9]', '&3': '[_&1*10_]' }],
					type: 'fill in',
					defaultDelay: 10,
					grade: CE1,
				},
				{
					description: 'Trouver le complément',
					subdescription: 'Complément à un multiple de 10',
					enounces: ['Complète.'],
					expressions: ['?+&2=[_&1*10_]', '&2+?=[_&1*10_]'],
					solutions: [['[_&1*10-&2_]']],
					variables: [{ '&1': '$e[2;9]', '&2': '$e[2;&1*10-2]' }],
					type: 'fill in in',
					defaultDelay: 20,
					grade: CE1,
				},
				{
					description: 'Trouver le complément',
					subdescription: 'Complément à 100 des dizaines entières',
					enounces: ['Complète.'],
					expressions: ['?+&2=100', '&2+?=100'],
					solutions: [['[_100-&2_]']],
					variables: [{ '&1': '$e[1;9]', '&2': '[_10*&1_]' }],
					type: 'fill in',
					defaultDelay: 10,
					grade: CE1,
				},
				{
					description: 'Trouver le complément',
					subdescription: 'A la centaine supérieure',
					enounces: ['Complète.'],
					expressions: ['?+[_&4-&3_]=&4', '[_&4-&3_]+?=&4'],
					solutions: [['&3']],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[1;9]',
							'&3': '$e[1;99]',
							'&4': '[_&1*100_]',
						},
					],
					type: 'fill in',
					defaultDelay: 15,
					grade: CE1,
				},
				{
					description: 'Trouver le complément',
					subdescription: 'Complément à 100',
					enounces: ['Complète.'],
					expressions: ['?+&1=100', '&1+?=100'],
					solutions: [['[_100-&1_]']],
					variables: [{ '&1': '$e[1;99]' }],
					type: 'fill in',
					defaultDelay: 20,
					grade: CE2,
				},
				{
					description: 'Trouver le complément',
					subdescription: 'Complément à 1000',
					enounces: ['Complète.'],
					expressions: ['?+&1=1000', '&1+?=1000'],
					solutions: [['[_1000-&1_]']],
					variables: [{ '&1': '$e[1;999]' }],
					type: 'fill in',
					defaultDelay: 20,
					grade: CE2,
				},
				{
					description: 'Trouver le complément',
					subdescription: 'Au millier supérieure',
					enounces: ['Complète.'],
					expressions: ['?+[_&4-&3_]=&4', '[_&4-&3_]+?=&4'],
					solutions: [['&3']],
					variables: [
						{ '&1': '$e[2;9]', '&3': '$e[1;999]', '&4': '[_&1*1000_]' },
					],
					type: 'fill in',
					defaultDelay: 20,
					grade: CE2,
				},
				{
					description: 'Trouver le complément',
					subdescription: 'Complément à 10 000 - a trou',
					enounces: ['Complète.'],
					expressions: ['?+[_10000-(&3)_]=10000', '[_10000-(&3)_]+?=10000'],
					solutions: [['[_&3_]']],
					variables: [
						{ '&1': '$e[1;9]', '&2': '$e[1;9]', '&3': '&1*1000+&2*100' },
					],
					type: 'fill in',
					defaultDelay: 20,
					grade: CM1,
				},
				{
					description: 'Trouver le complément',
					subdescription: 'Complément à 10 000 - description',
					enounces: [
						'Combien faut-il ajouter à $$[_10000-(&3)_]$$ pour obtenir $$10\\,000$$ ?',
					],
					solutions: [['[_&3_]']],
					variables: [
						{ '&1': '$e[1;9]', '&2': '$e[1;9]', '&3': '&1*1000+&2*100' },
					],
					correctionFormat: [
						{
							correct: ['Il faut ajouter &answer.'],
						},
					],
					defaultDelay: 20,
					grade: CM1,
				},
			],
			Décomposition: [],
			'A trou': [
				{
					description: 'Compléter une addition à trou',
					subdescription:
						'Nombres à 1 chiffre. Nombre plus grand en premier. Somme inférieure ou égale à 10',
					enounces: ['Complète.'],
					expressions: ['&1 + ? = [_&2+&1_]'],
					variables: [
						{
							'&1': '$e[3;8]',
							'&2': '$e[2;[_mini(10-&1;&1-1)_]]',
							//  '&3':'$e[2;&2]'
						},
					],
					type: 'fill in',
					solutions: [['&2']],
					defaultDelay: 5,
					grade: CP,
				},
				{
					description: 'Compléter une addition à trou',
					subdescription: 'Nombres entiers à 1 chiffre. Somme inférieure à 10.',
					enounces: ['Complète.'],
					expressions: [
						'&1+? = [_&1+&2_]',
						'&1+?= [_&1+&2_]',
						'?+&1= [_&1+&2_]',
						'?+&1= [_&1+&2_]',
					],
					variables: [
						{ '&1': '$e[5;7]', '&2': '$e[2;9-&1]' },
						{ '&1': '$e[2;4]', '&2': '$e[2;9-&1]' },
						{ '&1': '$e[5;7]', '&2': '$e[2;9-&1]' },
						{ '&1': '$e[2;4]', '&2': '$e[2;9-&1]' },
					],
					type: 'fill in',
					solutions: [['&2']],
					defaultDelay: 15,
					grade: CP,
				},
				{
					description: 'Compléter une addition à trou',
					subdescription: 'Nombres à 1 chiffre. Nombre plus grand en premier.',
					enounces: ['Complète.'],
					expressions: ['&1 + ? = [_&1+&2_]'],
					variables: [
						{
							'&1': '$e[3;9]',
							'&2': '$e[1;&1-1]',
							//  '&3':'$e[2;&2]'
						},
					],
					type: 'fill in',
					solutions: [['&2']],
					defaultDelay: 10,
					grade: CP,
				},
				{
					description: 'Compléter une addition à trou',
					subdescription:
						'Somme sans retenue. Au moins un nombre à 2 chiffres.',
					enounces: ['Complète.'],
					expressions: [
						'[_&1*10 + &2_] + ? = [_&1*10 + &2 + &3*10 + &4_]',
						'[_&1*10 + &2_] + ? = [_&1*10 + &2 + &3*10 + &4_]',
						'[_&1*10 + &2_] + ? = [_&1*10 + &2 + &3*10 + &4_]',
						'[_&1*10 + &2_] + ? = [_&1*10 + &2 + &3*10 + &4_]',
						'[_&1*10 + &2_] + ? = [_&1*10 + &2 + &4_]',
						'[_&1*10 + &2_] + ? = [_&1*10 + &2 + &4_]',
						'[_&1*10 + &2_] + ? = [_&1*10 + &2 + &4_]',
						'[_&1*10 + &2_] + ? = [_&1*10 + &2 + &4_]',
					],
					variables: [
						{
							'&1': '$e[5;7]',
							'&3': '$e[1;9-&1]',
							'&2': '$e[5;7]',
							'&4': '$e[2;9-&2]',
						},
						{
							'&1': '$e[2;4]',
							'&3': '$e[1;9-&1]',
							'&2': '$e[2;4]',
							'&4': '$e[2;9-&2]',
						},
						{
							'&1': '$e[5;7]',
							'&3': '$e[1;9-&1]',
							'&2': '$e[2;4]',
							'&4': '$e[2;9-&2]',
						},
						{
							'&1': '$e[2;4]',
							'&3': '$e[1;9-&1]',
							'&2': '$e[5;7]]',
							'&4': '$e[2;9-&2]',
						},
						{
							'&1': '$e[5;7]',
							'&2': '$e[5;7]',
							'&4': '$e[2;9-&2]',
						},
						{
							'&1': '$e[2;4]',
							'&2': '$e[2;4]',
							'&4': '$e[2;9-&2]',
						},
						{
							'&1': '$e[5;7]',
							'&2': '$e[2;4]',
							'&4': '$e[2;9-&2]',
						},
						{
							'&1': '$e[2;4]',
							'&2': '$e[5;7]]',
							'&4': '$e[2;9-&2]',
						},
					],
					type: 'fill in',
					solutions: [
						['[_&3*10 + &4_]'],
						['[_&3*10 + &4_]'],
						['[_&3*10 + &4_]'],
						['[_&3*10 + &4_]'],
						['&4'],
						['&4'],
						['&4'],
						['&4'],
					],
					defaultDelay: 20,
					grade: CP,
				},
				{
					description: 'Compléter une addition à trou',
					subdescription:
						'Somme d’un nombre à deux chiffres et d’un nombre à un chiffre, avec franchissement de la dizaine',
					enounces: ['Complète.'],
					expressions: ['[_&1*10 + &2_] + ? = [_&1*10 + &2 + &3_]'],
					variables: [
						{
							'&1': '$e[2;8]',
							'&2': '$e[2;9]',
							'&3': '$e[11-&2;9]',
						},
					],
					type: 'fill in',
					solutions: [['&3']],
					defaultDelay: 20,
					grade: CP,
				},
				{
					description: 'Compléter une addition à trou',
					subdescription:
						'sommes d’un nombre à deux chiffres et de dizaines entières',
					enounces: ['Complète.'],
					expressions: ['[_&1*10 + &2_] + ? = [_&1*10 + &2 + &3*10_]'],
					variables: [
						{
							'&1': '$e[2;8]',
							'&2': '$e[1;9]',
							'&3': '$e[1;9-&1]',
						},
					],
					type: 'fill in',
					solutions: [['[_&3*10_]']],
					defaultDelay: 10,
					grade: CP,
				},
				{
					description: 'Compléter une addition à trou',
					subdescription: 'Nombres entiers à 1 chiffre.',
					enounces: ['Complète.'],
					expressions: ['&1+? = [_&1+&2_]', '?+&1 = [_&1+&2_]'],
					variables: [{ '&1': '$e[2;9]', '&2': '$e[2;9]' }],
					type: 'fill in',
					solutions: [['&2']],
					defaultDelay: 15,
					grade: CE1,
				},
				{
					description: 'Compléter une addition à trou.',
					subdescription:
						'Nombres entiers à 2 chiffres (sans retenue entre les unités et les dizaines)',
					enounces: ['Complète.'],
					expressions: ['[_&1*10 + &2_] + ? = [_&1*10 + &2 + &3*10+&4_]'],
					variables: [
						{
							'&1': '$e[1;9]',
							'&3': '$e[1;9]',
							'&2': '$e[1;8]',
							'&4': '$e[1;9-&2]',
						},
					],
					type: 'fill in',
					solutions: [['[_&3*10+&4_]']],
					defaultDelay: 15,
					grade: CE1,
				},
				{
					description: 'Compléter une addition à trou',
					subdescription:
						'Somme d’un nombre ayant au plus trois chiffres et d’un nombre ayant un seul chiffre non nul',
					enounces: ['Complète.'],
					expressions: [
						'[_&1*100 + &2*10+&3_] + ? = [_&1*100 + &2*10+&3 + &5*10^&4_]',
					],
					variables: [
						{
							'&1': '$e[0;9]',
							'&2': '$e[0;9]',
							'&3': '$e[1;9]',
							'&4': '$e[0;2]',
							'&5': '$e[1;9]',
						},
					],
					type: 'fill in',
					solutions: [['[_&5*10^&4_]']],
					defaultDelay: 15,
					grade: CE1,
				},
				{
					description: 'Compléter une addition à trou',
					subdescription:
						'somme de deux termes dont le résultat est inférieur à $$100$$',
					enounces: ['Complète.'],
					expressions: ['&1 + ? =  [_&2+&1_]', '? + &2 = [_&2+&1_]'],
					variables: [{ '&1': '$e[1;98]', '&2': '$e[1;99-&1]' }],
					type: 'fill in',
					solutions: [['&2'], ['&1']],
					defaultDelay: 20,
					grade: CE2,
				},
				{
					description: 'Compléter une addition à trou',
					subdescription:
						'Somme d’un nombre ayant au plus 4 chiffres et d’un nombre ayant un seul chiffre non nul',
					enounces: ['Complète.'],
					expressions: [
						'[_&1*1000 + &2*100+&3*10+&4_] + ? = [_&1*1000 + &2*100+&3*10+&4 + &6*10^&5_]',
					],
					variables: [
						{
							'&1': '$e[0;9]',
							'&2': '$e[0;9]',
							'&3': '$e[0;9]',
							'&4': '$e[1;9]',
							'&5': '$e[0;3]',
							'&6': '$e[1;9]',
						},
					],
					type: 'fill in',
					solutions: [['[_&6*10^&5_]']],
					defaultDelay: 15,
					grade: CE2,
				},
				{
					description: 'Compléter une addition',
					subdescription: 'Nombres entiers à 2 chiffres (avec retenue)',
					enounces: ['Complète.'],
					expressions: ['[_&1*10 + &2_] + ? = [_&1*10 + &2 + &3*10+&4_]'],
					variables: [
						{
							'&1': '$e[1;7]',
							'&3': '$e[1;8-&1]',
							'&2': '$e[2;9]',
							'&4': '$e[11-&2;9]',
						},
					],
					type: 'fill in',
					solutions: [['[_&3*10+&4_]']],
					defaultDelay: 15,
					grade: CM1,
				},
				{
					description: 'Compléter une addition à trou',
					subdescription: 'Nombres entiers à 3 chiffres (sans retenue)',
					enounces: ['Complète.'],
					expressions: [
						'[_&1*100 + &2*10 + &3_] + ? = [_&1*100 + &2*10 + &3 + &4*100 + &5*10 + &6_]',
					],
					variables: [
						{
							'&1': '$e[1;8]',
							'&4': '$e[1;9-&1]',
							'&2': '$e[1;8]',
							'&5': '$e[1;9-&2]',
							'&3': '$e[1;8]',
							'&6': '$e[1;9-&3]',
						},
					],
					type: 'fill in',
					solutions: [['[_&4*100 + &5*10 + &6_]']],
					defaultDelay: 30,
					grade: CM2,
				},

				{
					description: 'Compléter une égalité',
					subdescription: 'Nombres entiers à 2 chiffres (sans retenue)',
					enounces: ['Quel est le terme manquant dans cette égalité ?'],
					expressions: [
						'[_&5_]+?=[_&5+&6_]',
						'[_&5_]+?=[_&5+&6_]',
						'?+[_&5_]=[_&5+&6_]',
						'?+[_&5_]=[_&5+&6_]',
					],
					variables: [
						{
							'&1': '$e[5;7]',
							'&3': '$e[2;9-&1]',
							'&2': '$e[5;7]',
							'&4': '$e[2;9-&2]',
							'&5': '&1*10 + &2',
							'&6': '&3*10 + &4',
						},
						{
							'&1': '$e[2;4]',
							'&3': '$e[2;9-&1]',
							'&2': '$e[2;4]',
							'&4': '$e[2;9-&2]',
							'&5': '&1*10 + &2',
							'&6': '&3*10 + &4',
						},
						{
							'&1': '$e[5;7]',
							'&3': '$e[2;9-&1]',
							'&2': '$e[2;4]',
							'&4': '$e[2;9-&2]',
							'&5': '&1*10 + &2',
							'&6': '&3*10 + &4',
						},
						{
							'&1': '$e[2;4]',
							'&3': '$e[2;9-&1]',
							'&2': '$e[5;7]]',
							'&4': '$e[2;9-&2]',
							'&5': '&1*10 + &2',
							'&6': '&3*10 + &4',
						},
					],
					type: 'fill in',
					solutions: [['[_&6_]']],
					defaultDelay: 20,
					grade: UNKNOWN,
				},
				{
					description: 'Compléter une égalité',
					subdescription: 'Nombres entiers à 3 chiffres (sans retenue)',
					enounces: ['Quel est le terme manquant dans cette égalité ?'],
					expressions: ['[_&7_] + ? = [_&7+&8_]', '? + [_&7_] = [_&7+&8_]'],
					variables: [
						{
							'&1': '$e[1;8]',
							'&4': '$e[1;9-&1]',
							'&2': '$e[1;8]',
							'&5': '$e[1;9-&2]',
							'&3': '$e[1;8]',
							'&6': '$e[1;9-&3]',
							'&7': '&1*100 + &2*10 + &3',
							'&8': '&4*100 + &5*10 + &6',
						},
						{
							'&1': '$e[1;8]',
							'&4': '$e[1;9-&1]',
							'&2': '$e[1;8]',
							'&5': '$e[1;9-&2]',
							'&3': '$e[1;8]',
							'&6': '$e[1;9-&3]',
							'&7': '&1*100 + &2*10 + &3',
							'&8': '&4*100 + &5*10 + &6',
						},
					],
					solutions: [['[_&8_]']],
					type: 'fill in',
					defaultDelay: 20,
					grade: UNKNOWN,
				},
				{
					description: 'Compléter une égalité',
					subdescription: 'Nombres à 1 chiffre',
					enounces: ['Quel est le terme manquant dans cette égalité ?'],
					expressions: ['?+&1 = &2', '&1+? = &2'],
					solutions: [['[_&2-&1_]']],
					variables: [{ '&1': '$e[2;9]', '&2': '$e[11;&1+9]' }],
					type: 'fill in',
					defaultDelay: 20,
					grade: UNKNOWN,
				},
				{
					description: 'Compléter une égalité',
					subdescription: 'Nombres à 2 chiffres',
					enounces: ['Quel est le terme manquant dans cette égalité ?'],
					expressions: ['?+&1 = &2', '&1+? = &2'],
					solutions: [['[_&2-&1_]']],
					variables: [{ '&1': '$e{2;2}', '&2': '$e[&1+12;&1+99]' }],
					type: 'fill in',
					defaultDelay: 20,
					grade: UNKNOWN,
				},
				{
					description: 'Compléter une  égalité',
					subdescription: 'Nombres à 3 chiffres',
					enounces: ['Quel est le terme manquant dans cette égalité ?'],
					expressions: ['?+&1 = &2', '&1+? = &2'],
					solutions: [['[_&2-&1_]', '[_&2-&1_]']],
					variables: [{ '&1': '$e[101;897]', '&2': '$e[&1+102;999]' }],
					type: 'fill in',
					defaultDelay: 30,
					grade: UNKNOWN,
				},
			],
			'Double et moitié': [
				{
					description: 'Trouver le double',
					subdescription: 'Nombre inférieur à $$10$$',
					enounces: [
						'Quel est le double de $$&1$$ ?',
						'Quel est le résultat de $$&1+&1$$ ?',
					],
					solutions: [['[_2*&1_]']],
					variables: [{ '&1': '$e[0;9]' }],
					correctionFormat: [
						{
							correct: ['Le double de $$&1$$ est &answer.'],
						},
						{
							correct: ['$$&1+&1=&ans$$'],
						},
					],

					defaultDelay: 10,
					grade: CP,
				},
				{
					description: 'Trouver le double',
					subdescription: "Dizaines entières (jusqu'à $$50$$)",
					enounces: [
						'Quel est le double de $$&2$$ ?',
						'Quel est le résultat de $$&2+&2$$ ?',
					],
					solutions: [['[_2*&2_]']],
					variables: [
						{
							'&1': '$e[1;5]*10',
							'&2': '[_&1_]',
						},
					],
					correctionFormat: [
						{
							correct: ['Le double de $$&2$$ est &answer.'],
						},
						{
							correct: ['$$&2+&2=&ans$$'],
						},
					],

					defaultDelay: 10,
					grade: CP,
				},
				{
					description: 'Trouver la moitié',
					subdescription: 'Nombre pair inférieur à $$20$$',
					enounces: ['Quelle est la moitié de $$[_2*&1_]$$ ?'],
					solutions: [['&1']],
					variables: [{ '&1': '$e[0;10]' }],
					correctionFormat: [
						{
							correct: ['La moitié de $$[_2*&1_]$$ est &answer.'],
						},
					],
					correctionDetails: [
						[
							{
								text: 'La moitié de $$[_2*&1_]$$ est &solution car $$&1+&1=[_2*&1_]$$',
							},
						],
					],

					defaultDelay: 10,
					grade: CP,
				},
				{
					description: 'Trouver le double',
					subdescription: 'Nombres de $$1$$ à $$15$$, $$25$$, $$30$$, $$40$$, $$50$$ et $$100$$',
					enounces: [
						'Quel est le double de $$&1$$ ?',
						'Quel est le résultat de $$&1+&1$$ ?',
					],
					solutions: [['[_2*&1_]']],
					variables: [
						{
							'&1': '$l{$e[1;9];$e[11;15];25;30;40;50;100}',
						},
					],
					correctionFormat: [
						{
							correct: ['Le double de $$&1$$ est &answer.'],
						},
						{
							correct: ['$$&1+&1=&ans$$'],
						},
					],

					defaultDelay: 15,
					grade: CE1,
				},
				{
					description: 'Trouver la moitié',
					subdescription: 'Nombres pairs de $$1$$ à $$30$$, $$40$$, $$50$$ et $$100$$',
					enounces: ['Quelle est la moitié de $$&2$$ ?'],
					solutions: [['[_&1_]']],
					variables: [
						{
							'&1': '$l{$e[1;9];$e[11;15];20;25;50}',
							'&2': '[_2*&1_]',
						},
					],
					correctionFormat: [
						{
							correct: ['La moitié de $$&2$$ est &answer.'],
						},
					],
					correctionDetails: [
						[
							{
								text: 'La moitié de $$[_2*&1_]$$ est &solution car $$&1 + &1=[_2*&1_]$$',
							},
						],
					],
					defaultDelay: 15,
					grade: CE1,
				},
				{
					description: 'Trouver le double',
					subdescription: 'Nombres de $$1$$ à $$20$$, $$25$$, $$30$$, $$40$$, $$50$$, $$60$$ et $$100$$',
					enounces: [
						'Quel est le double de $$&1$$ ?',
						'Quel est le résultat de $$&1+&1$$ ?',
					],
					solutions: [['[_2*&1_]']],
					variables: [
						{
							'&1': '$l{$e[1;10];$e[11;15];$e[15;20];25;30;40;50;60;100}',
						},
					],
					correctionFormat: [
						{
							correct: ['Le double de $$&1$$ est &answer.'],
						},
						{
							correct: ['$$&1+&1=&ans$$'],
						},
					],

					defaultDelay: 15,
					grade: CE2,
				},
				{
					description: 'Trouver la moitié',
					subdescription: 'Nombres pairs de $$1$$ à $$40$$, $$50$$, $$60$$ et $$100$$',
					enounces: ['Quelle est la moitié de $$&2$$ ?'],
					solutions: [['[_&1_]']],
					variables: [
						{
							'&1': '$l{$e[1;9];$e[11;15];$e[16;20];25;30;50}',
							'&2': '[_2*&1_]',
						},
					],
					correctionFormat: [
						{
							correct: ['La moitié de $$&2$$ est &answer.'],
						},
					],
					correctionDetails: [
						[
							{
								text: 'La moitié de $$[_2*&1_]$$ est &solution car $$&1+&1=[_2*&1_]$$',
							},
						],
					],
					defaultDelay: 15,
					grade: CE2,
				},
			],
			'Triple et tiers': [
				{
					description: 'Trouver le triple',
					subdescription: 'Nombre inférieur à $$10$$',
					enounces: [
						'Quel est le triple de $$&1$$ ?',
						'Quel est le résultat de $$&1+&1+&1$$ ?',
					],
					solutions: [['[_3*&1_]']],
					variables: [{ '&1': '$e[0;9]' }],
					correctionFormat: [
						{
							correct: ['Le triple de $$&1$$ est &answer.'],
						},
						{
							correct: ['$$&1+&1+&1=&ans$$'],
						},
					],

					defaultDelay: 10,
					grade: CE1,
				},
				{
					description: 'Trouver le triple',
					subdescription: "Dizaines entières (jusqu'à $$50$$)",
					enounces: [
						'Quel est le triple de $$&2$$ ?',
						'Quel est le résultat de $$&2+&2+&2$$ ?',
					],
					solutions: [['[_3*&2_]']],
					variables: [
						{
							'&1': '$e[1;5]*10',
							'&2': '[_&1_]',
						},
					],
					correctionFormat: [
						{
							correct: ['Le triple de $$&2$$ est &answer.'],
						},
						{
							correct: ['$$&2+&2+&2=&ans$$'],
						},
					],

					defaultDelay: 10,
					grade: CE1,
				},
				{
					description: 'Trouver le tiers',
					subdescription: 'Multiples de $$3$$ inférieurs à $$30$$',
					enounces: ['Quelle est le tiers de $$[_3*&1_]$$ ?'],
					solutions: [['&1']],
					variables: [{ '&1': '$e[0;10]' }],
					correctionFormat: [
						{
							correct: ['Le tiers de $$[_3*&1_]$$ est &answer.'],
						},
					],
					correctionDetails: [
						[
							{
								text: 'Le tiers de $$[_3*&1_]$$ est &solution car $$&1 + &1 + &1=[_3*&1_]$$',
							},
						],
					],

					defaultDelay: 10,
					grade: CE1,
				},
				{
					description: 'Trouver le triple',
					subdescription: 'Nombres de $$1$$ à $$15$$, $$25$$, $$30$$, $$40$$, $$50$$ et $$100$$',
					enounces: [
						'Quel est le triple de $$&1$$ ?',
						'Quel est le résultat de $$&1+&1+&1$$ ?',
					],
					solutions: [['[_3*&1_]']],
					variables: [
						{
							'&1': '$l{$e[1;9];$e[11;15];25;30;40;50;100}',
						},
					],
					correctionFormat: [
						{
							correct: ['Le triple de $$&1$$ est &answer.'],
						},
						{
							correct: ['$$&1+&1+&1=&ans$$'],
						},
					],

					defaultDelay: 15,
					grade: CE2,
				},
				{
					description: 'Trouver le triple',
					subdescription: 'Nombres de $$1$$ à $$20$$, $$25$$, $$30$$, $$40$$, $$50$$, $$60$$ et $$100$$',
					enounces: [
						'Quel est le triple de $$&1$$ ?',
						'Quel est le résultat de $$&1+&1+&1$$ ?',
					],
					solutions: [['[_3*&1_]']],
					variables: [
						{
							'&1': '$l{$e[1;10];$e[11;15];$e[15;20];25;30;40;50;60;100}',
						},
					],
					correctionFormat: [
						{
							correct: ['Le triple de $$&1$$ est &answer.'],
						},
						{
							correct: ['$$&1+&1+&1=&ans$$'],
						},
					],

					defaultDelay: 15,
					grade: CE2,
				},
			],
			'Somme astucieuse': [
				{
					description: 'Ajouter $$9$$',
					enounces: ['Calcule de manière astucieuse.'],
					expressions: ['&3+9', '9+&3'],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} &3+\\bold{\\textcolor{${color1}}{9}} &= &3+\\bold{\\textcolor{${color1}}{10-1}} \\\\ &= [_&3+10_]-1 \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{9}} + &3 &= \\bold{\\textcolor{${color1}}{10-1}} + &3\\\\ &= &3 + 10-1 \\\\ &= [_&3+10_]-1 \\\\ &= &sol \\end{align}$$`,
							},
						],
					],
					variables: [
						{
							'&1': '$e[1;7]',
							'&2': '$e[2;9]',
							'&3': '[_&1*10+&2_]',
						},
					],

					defaultDelay: 10,
					grade: CP,
				},
				{
					description: 'Additionner par regroupements',
					subdescription: 'Regrouper pour obtenir $$10$$. $$3$$ nombres à un chiffre.',
					enounces: ['Calcule de manière astucieuse.'],
					expressions: ['&2+&1+[_10-&1_]', '&1+&2+[_10-&1_]'],

					correctionDetails: [
						[
							{
								text: `$$\\begin{align} &2+\\bold{\\textcolor{${color1}}{&1}}+\\bold{\\textcolor{${color1}}{[_10-&1_]}} &= &2+\\bold{\\textcolor{${color1}}{10}} \\\\ &=  &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&1}}+ &2 + \\bold{\\textcolor{${color1}}{[_10-&1_]}} &= &2+\\bold{\\textcolor{${color1}}{10}} \\\\ &=  &sol \\end{align}$$`,
							},
						],
					],
					variables: [{ '&1': '$e{1}', '&2': '$e[7;9]\\{&1}' }],
					defaultDelay: 10,
					grade: CP,
				},
				{
					description: 'Ajouter $$19$$, $$29$$, $$39$$, ....',
					enounces: ['Calcule de manière astucieuse.'],
					expressions: ['&4+&5', '&5+&4'],

					variables: [
						{
							'&1': '$e[1;7]',
							'&2': '$e[1;8-&1]',
							'&3': '$e[1;8]',
							'&4': '[_&2*10+&3_]',
							'&5': '[_&1*10+9_]',
						},
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} &4+\\bold{\\textcolor{${color1}}{&5}} &= &4+\\bold{\\textcolor{${color1}}{[_&5+1_]-1}} \\\\ &= [_&4+&5+1_]-1 \\\\ &= &sol\\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&5}} + &4 &= \\bold{\\textcolor{${color1}}{[_&5+1_]-1}} + &4\\\\ &= &4 + [_&5+1_]-1 \\\\ &= [_&4+&5+1_]-1 \\\\ &= &sol\\end{align}$$`,
							},
						],
					],

					defaultDelay: 15,
					grade: CE1,
				},
				{
					description: 'Additionner par regroupements',
					subdescription:
						'Regrouper pour obtenir $$10$$. $$2$$ nombres à un chiffre et un à $$2$$ chiffres.',
					enounces: ['Calcule de manière astucieuse.'],
					expressions: ['&2+&1+[_10-&1_]', '&1+&2+[_10-&1_]'],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} &2+\\bold{\\textcolor{${color1}}{&1}}+\\bold{\\textcolor{${color1}}{[_10-&1_]}} &= &2+\\bold{\\textcolor{${color1}}{10}} \\\\ &=  &sol\\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&1}}+ &2 + \\bold{\\textcolor{${color1}}{[_10-&1_]}} &= &2+\\bold{\\textcolor{${color1}}{10}} \\\\ &=  &sol \\end{align}$$`,
							},
						],
					],
					variables: [{ '&1': '$e{1}', '&2': '$e[19;99]' }],

					defaultDelay: 10,
					grade: CE1,
				},
				{
					description: 'Additionner par regroupements',
					subdescription: '$$5$$ Nombres à $$1$$ chiffre',
					enounces: ['Calcule de manière astucieuse.'],
					expressions: [
						'&1+[_10-&1_]+&2+[_10-&2_]+&3',
						'&1+[_10-&1_]+&2+&3+[_10-&2_]',
						'&1+[_10-&1_]+&3+&2+[_10-&2_]',
						'&1+&3+[_10-&1_]+&2+[_10-&2_]',
						'&3+&1+[_10-&1_]+&2+[_10-&2_]',
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&1}}+\\bold{\\textcolor{${color1}}{[_10-&1_]}}+\\bold{\\textcolor{yellow}{&2}}+\\bold{\\textcolor{yellow}{[_10-&2_]}}+&3 &= \\bold{\\textcolor{${color1}}{10}}+\\bold{\\textcolor{yellow}{10}}+&3 \\\\ &=  &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&1}}+\\bold{\\textcolor{${color1}}{[_10-&1_]}}+\\bold{\\textcolor{yellow}{&2}}+ &3 + \\bold{\\textcolor{yellow}{[_10-&2_]}} &= \\bold{\\textcolor{${color1}}{10}}+\\bold{\\textcolor{yellow}{10}}+&3 \\\\ &=  &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&1}}+\\bold{\\textcolor{${color1}}{[_10-&1_]}}+ &3 + \\bold{\\textcolor{yellow}{&2}}+\\bold{\\textcolor{yellow}{[_10-&2_]}} &= \\bold{\\textcolor{${color1}}{10}}+\\bold{\\textcolor{yellow}{10}}+&3 \\\\ &=  &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&1}}+ &3 + \\bold{\\textcolor{${color1}}{[_10-&1_]}}+\\bold{\\textcolor{yellow}{&2}}+\\bold{\\textcolor{yellow}{[_10-&2_]}} &= \\bold{\\textcolor{${color1}}{10}}+\\bold{\\textcolor{yellow}{10}}+&3 \\\\ &=  &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} &3 + \\bold{\\textcolor{${color1}}{&1}}+\\bold{\\textcolor{${color1}}{[_10-&1_]}}+\\bold{\\textcolor{yellow}{&2}}+\\bold{\\textcolor{yellow}{[_10-&2_]}} &= \\bold{\\textcolor{${color1}}{10}}+\\bold{\\textcolor{yellow}{10}}+&3 \\\\ &=  &sol \\end{align}$$`,
							},
						],
					],

					variables: [
						{
							'&1': '$e{1}',
							'&2': '$e{1}\\{&1;[_10-&1_]}',
							'&3': '$e{1}\\{&1;[_10-&1_];&2;[_10-&2_]}',
						},
					],

					defaultDelay: 20,
					grade: CE1,
				},
				{
					description: 'Additionner par regroupements',
					subdescription: '$$3$$ Nombres à $$2$$ chiffres. Regrouper pour obtenir $$100$$',
					enounces: ['Calcule de manière astucieuse.'],
					expressions: ['&2+&1+[_100-&1_]', '&1+&2+[_100-&1_]'],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} &2+\\bold{\\textcolor{${color1}}{&1}}+\\bold{\\textcolor{${color1}}{[_100-&1_]}} &= &2+\\bold{\\textcolor{${color1}}{100}} \\\\ &=  &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&1}}+ &2 + \\bold{\\textcolor{${color1}}{[_100-&1_]}} &= &2+\\bold{\\textcolor{${color1}}{100}} \\\\ &=  &sol \\end{align}$$`,
							},
						],
					],
					variables: [{ '&1': '$e{2;2}', '&2': '$e[19;99]' }],

					defaultDelay: 20,
					grade: CE1,
				},

				{
					description: 'Additionner par regroupements',
					subdescription: '$$3$$ Nombres à $$2$$ chiffres.',
					enounces: ['Calcule de manière astucieuse.'],
					expressions: [
						'&6+[_&1*10-&6_]+&7',
						'&6+&7+[_&1*10-&6_]',
						'&7+&6+[_&1*10-&6_]',
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&6}}+\\bold{\\textcolor{${color1}}{[_&1*10-&6_]}} + &7 &= \\bold{\\textcolor{${color1}}{[_&1*10_]}} + &7\\\\ &=  &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&6}}+ &7 + \\bold{\\textcolor{${color1}}{[_&1*10-&6_]}} &= &7+\\bold{\\textcolor{${color1}}{[_&1*10_]}} \\\\ &=  &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} &7+\\bold{\\textcolor{${color1}}{&6}}+\\bold{\\textcolor{${color1}}{[_&1*10-&6_]}} &= &7+\\bold{\\textcolor{${color1}}{[_&1*10_]}} \\\\ &=  &sol \\end{align}$$`,
							},
						],
					],
					variables: [
						{
							'&1': '$e[3;9]',
							'&2': '$e[1;&1-2]',
							'&3': '$e{1}',
							'&4': '$e{1}',
							'&5': '$e{1}\\{&3}',
							'&6': '[_&2*10+&3_]',
							'&7': '[_&4*10+&5_]',
						},
					],

					defaultDelay: 20,
					grade: CE1,
				},
				{
					description: 'Additionner par regroupements',
					subdescription: '$$4$$ Nombres à $$2$$ chiffres.',
					enounces: ['Calcule de manière astucieuse.'],
					expressions: ['&4+[_&1*10-&4_]+&8+[_&5*10-&8_]'],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
								\\bold{\\textcolor{${color1}}{&4}}+\\bold{\\textcolor{${color1}}{[_&1*10-&4_]}} + \\bold{\\textcolor{${color2}}{&8}}+\\bold{\\textcolor{${color2}}{[_&5*10-&8_]}} \
								 &= \\bold{\\textcolor{${color1}}{[_&1*10_]}} + \\bold{\\textcolor{${color2}}{[_&5*10_]}} \\\\  \
								 &=  &sol \
								 \\end{align}$$`,
							},
						],
					],
					variables: [
						{
							'&1': '$e[3;9]',
							'&2': '$e[1;&1-2]',
							'&3': '$e{1}',
							'&4': '[_&2*10+&3_]',
							'&5': '$e[3;9]',
							'&6': '$e[1;&5-2]',
							'&7': '$e{1}',
							'&8': '[_&6*10+&7_]',
						},
					],

					defaultDelay: 20,
					grade: CE1,
				},
				{
					description: 'Calculer une somme',
					subdescription:
						'Somme d’un nombre ayant au plus quatre chiffres et de $$9$$ ou $$19$$',
					enounces: ['Calcule.'],
					expressions: ['&5+9', '&5+19'],
					variables: [
						{
							'&1': '$e[0;9]',
							'&2': '$e[0;9]',
							'&3': '$e[0;9]',
							'&4': '$e[1;9]',
							'&5': '[_&1*1000+&2*100+&3*10+&4_]',
						},
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} &5+\\bold{\\textcolor{${color1}}{9}} &= &5+\\bold{\\textcolor{${color1}}{10-1}} \\\\ &= [_&5+10_]-1 \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} &5+\\bold{\\textcolor{${color1}}{19}} &= &5+\\bold{\\textcolor{${color1}}{20-1}} \\\\ &= [_&5+20_]-1 \\\\ &= &sol \\end{align}$$`,
							},
						],
					],

					defaultDelay: 15,
					grade: CE2,
				},
				{
					description: 'Additionner par regroupements',
					subdescription: 'Nombres à $$3$$ chiffres. Regrouper pour faire $$1000$$',
					enounces: ['Calcule de manière astucieuse.'],
					expressions: ['&2+&1+[_1000-&1_]', '&1+&2+[_1000-&1_]'],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} &2+\\bold{\\textcolor{${color1}}{&1}}+\\bold{\\textcolor{${color1}}{[_1000-&1_]}} &= &2+\\bold{\\textcolor{${color1}}{1000}} \\\\ &=  &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&1}}+ &2 + \\bold{\\textcolor{${color1}}{[_1000-&1_]}} &= &2+\\bold{\\textcolor{${color1}}{1000}} \\\\ &=  &sol \\end{align}$$`,
							},
						],
					],
					variables: [{ '&1': '$e{3;3}', '&2': '$e{3;3}' }],

					defaultDelay: 20,
					grade: CE2,
				},
			],
		},
		Soustraire: {
			Différence: [
				{
					description: 'Calculer une différence (résultat positif)',
					subdescription: 'Nombres à $$1$$ chiffre',
					enounces: ['Calcule.'],
					expressions: ['&1-&2'],
					variables: [{ '&1': '$e[5;9]', '&2': '$e[1;&1-1]' }],

					defaultDelay: 10,
					grade: CP,
				},
				{
					description: 'Calculer une différence (résultat positif)',
					subdescription:
						'Soustraire un nombre à un chiffre à un nombre à deux chiffres, sans franchissement de la dizaine',
					enounces: ['Calcule.'],
					expressions: ['[_&1*10+&3_]-&2'],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;8]',
							'&3': '$e[&2+1;9]',
						},
					],

					defaultDelay: 10,
					grade: CP,
				},
				{
					description: 'Calculer une différence (résultat positif)',
					subdescription: 'Soustraire des dizaines entières à un nombre.',
					enounces: ['Calcule.'],
					expressions: ['[_&2*10+&3_]-[_&1*10_]'],
					variables: [
						{
							'&1': '$e[1;8]',
							'&2': '$e[&1+1;9]',
							'&3': '$e[0;9]',
						},
					],

					defaultDelay: 10,
					grade: CP,
				},
				{
					description: 'Calculer une différence (résultat positif)',
					subdescription:
						'Une dizaine et un nombre à un chiffre (avec franchissement de la dizaine)',
					enounces: ['Calcule.'],
					expressions: ['[_&1+&2_] - &1'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[11-&1;9]',
						},
					],

					defaultDelay: 15,
					grade: CE1,
				},
				{
					description: 'Calculer une différence (résultat positif)',
					subdescription:
						'Soustraire un nombre à un chiffre à un nombre à deux chiffres, avec franchissement de la dizaine',
					enounces: ['Calcule.'],
					expressions: ['[_&1*10+&2_]-&3'],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;8]',
							'&3': '$e[&2+1;9]',
						},
					],

					defaultDelay: 15,
					grade: CE1,
				},
				{
					description: 'Calculer une différence (résultat positif)',
					subdescription:
						' Soustraire un nombre à deux chiffres à un nombre à $$3$$ chiffres, sans retenue',
					enounces: ['Calcule.'],
					expressions: ['[_ &1*100 + &2*10 + &3 _] - [_ &4*10 + &5 _]'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
							'&3': '$e[2;9]',
							'&4': '$e[1;&2-1]',
							'&5': '$e[1;&3-1]',
						},
					],

					defaultDelay: 15,
					grade: CE1,
				},

				{
					description: 'Calculer une différence (résultat positif)',
					subdescription: '  Soustraire des centaines entières à un nombre',
					enounces: ['Calcule.'],
					expressions: ['[_ &1*100 + &2*10 + &3 _] - [_&4*100_]'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[1;9]',
							'&3': '$e[1;9]',
							'&4': '$e[1;&1-1]',
						},
					],

					defaultDelay: 15,
					grade: CE1,
				},
				{
					description: 'Calculer une différence (résultat positif)',
					subdescription:
						"Soustraire un nombre d'au plus $$3$$ chiffres à un nombre à $$4$$ chiffres, sans retenue",
					enounces: ['Calcule.'],
					expressions: [
						'[_ &1*1000 + &2*100 + &3*10+&4_]-[_ &5*100 + &6*10+&7 _]',
					],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$e[2;9]',
							'&3': '$e[2;9]',
							'&4': '$e[2;9]',
							'&5': '$e[0;&2-1]',
							'&6': '$e[0;&3-1]',
							'&7': '$e[1;&4-1]',
						},
					],

					defaultDelay: 15,
					grade: CE1,
				},
				{
					description: 'Calculer une différence (résultat positif)',
					subdescription:
						'Soustraire des dizaines entières, des centaines entières ou des milliers entiers à un nombre',
					enounces: ['Calcule.'],
					expressions: [
						'[_ &1*100 + &2*10 + &3 _] - [_&5*100_]',
						'[_ &1*100 + &2*10 + &3 _] - [_&5*10_]',
						'[_ &1*1000 + &2*100 + &3*10 + &4 _] - [_&5*1000_]',
						'[_ &1*1000 + &2*100 + &3*10 + &4 _] - [_&5*100_]',
						'[_ &1*1000 + &2*100 + &3*10 + &4 _] - [_&5*10_]',
					],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[0;9]',
							'&3': '$e[0;9]',
							'&5': '$e[1;&1-1]',
						},
						{
							'&1': '$e[1;9]',
							'&2': '$e[0;9]',
							'&3': '$e[0;9]',
							'&5': '$e[1;9]',
						},
						{
							'&1': '$e[2;9]',
							'&2': '$e[0;9]',
							'&3': '$e[0;9]',
							'&4': '$e[0;9]',
							'&5': '$e[1;&1-1]',
						},
						{
							'&1': '$e[1;9]',
							'&2': '$e[0;9]',
							'&3': '$e[0;9]',
							'&4': '$e[0;9]',
							'&5': '$e[1;9]',
						},
						{
							'&1': '$e[1;9]',
							'&2': '$e[0;9]',
							'&3': '$e[0;9]',
							'&4': '$e[0;9]',
							'&5': '$e[1;9]',
						},
					],

					defaultDelay: 15,
					grade: CE2,
				},

				{
					description: 'Calculer une différence (résultat positif)',
					subdescription: 'Nombres à $$2$$ chiffres (avec retenue)',
					enounces: ['Calcule.'],
					expressions: ['[_ &1*10 + &4 _] - [_ &3*10 + &2 _]'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
							'&3': '$e[1;&1-1]',
							'&4': '$e[1;&2-1]',
						},
					],
					solutions: [['[_ &1*10 + &4 -( &3*10 + &2 )_]']],

					defaultDelay: 15,
					grade: CE2,
				},
				{
					description: 'Calculer une différence (résultat positif)',
					subdescription: 'Nombres à $$3$$ chiffres (avec retenue)',
					enounces: ['Calcule.'],
					expressions: [
						'[_ &1*100 + &5*10 + &6 _] - [_ &4*100 + &2*10 + &3 _]',
					],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
							'&3': '$e[2;9]',
							'&4': '$e[1;&1-1]',
							'&5': '$e[1;&2-1]',
							'&6': '$e[1;&3-1]',
						},
					],
					solutions: [['[_ &1*100 + &5*10 + &6 -( &4*100 + &2*10 + &3 )_]']],

					defaultDelay: 20,
					grade: CM1,
				},
			],
			'A trou': [
				{
					description:
						'Compléter une soustraction à trou (résultat positif)',
					subdescription: 'Nombres à $$1$$ chiffre',
					enounces: ['Complète'],
					expressions: ['?-&1=&2', '&1-?=&2'],
					variables: [
						{ '&1': '$e[2;8]', '&2': '$e[1;9-&1]' },
						{ '&1': '$e[2;9]', '&2': '$e[1;&1-1]' },
					],
					solutions: [['[_&1+&2_]'], ['[_&1-&2_]']],
					type: 'fill in',
					defaultDelay: 20,
					grade: CP,
				},
				{
					description: 'Compléter une soustraction à trou',
					subdescription:
						'Soustraire un nombre à un chiffre à un nombre à deux chiffres, sans franchissement de la dizaine',
					enounces: ['Complète.'],
					expressions: ['[_&1*10+&3_] - ? = [_&1*10+&3-&2_]'],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;8]',
							'&3': '$e[&2+1;9]',
						},
					],
					type: 'fill in',
					solutions: [['&2']],
					defaultDelay: 10,
					grade: CP,
				},
				{
					description: 'Compléter une soustraction à trou',
					subdescription: 'Soustraire des dizaines entières à un nombre.',
					enounces: ['Complète.'],
					expressions: ['[_&2*10+&3_] - ? = [_&2*10+&3 - &1*10_]'],
					variables: [
						{
							'&1': '$e[1;8]',
							'&2': '$e[&1+1;9]',
							'&3': '$e[0;9]',
						},
					],
					type: 'fill in',
					solutions: [['[_&1*10_]']],
					defaultDelay: 10,
					grade: CP,
				},
				{
					description: 'Compléter une soustraction à trou',
					subdescription:
						'Une dizaine et un nombre à un chiffre (avec franchissement de la dizaine)',
					enounces: ['Complète.'],
					expressions: ['[_&1+&2_] - ? = &2'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[11-&1;9]',
						},
					],
					type: 'fill in',
					solutions: [['&1']],
					defaultDelay: 15,
					grade: CE1,
				},
				{
					description: 'Compléter une soustraction à trou',
					subdescription:
						'Soustraire un nombre à un chiffre à un nombre à deux chiffres, avec franchissement de la dizaine',
					enounces: ['Complète.'],
					expressions: ['[_&1*10+&2_] - ? = [_&1*10+&2-&3_]'],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;8]',
							'&3': '$e[&2+1;9]',
						},
					],
					type: 'fill in',
					solutions: [['&3']],
					defaultDelay: 15,
					grade: CE1,
				},
				{
					description: 'Compléter une soustraction à trou',
					subdescription:
						' Soustraire un nombre à deux chiffres à un nombre à $$3$$ chiffres, sans retenue',
					enounces: ['Complète.'],
					expressions: [
						'[_ &1*100 + &2*10 + &3 _] - ? =  [_ &1*100 + &2*10 + &3 - (&4*10 + &5) _]',
					],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
							'&3': '$e[2;9]',
							'&4': '$e[1;&2-1]',
							'&5': '$e[0;&3-1]',
						},
					],
					type: 'fill in',
					solutions: [['[_ &4*10 + &5 _]']],
					defaultDelay: 15,
					grade: CE1,
				},
				{
					description: 'Compléter une soustraction à trou',
					subdescription: '  Soustraire des centaines entières à un nombre',
					enounces: ['Complète.'],
					expressions: [
						'[_ &1*100 + &2*10 + &3 _] - ? =  [_&1*100 + &2*10 + &3 - &4*100_]',
					],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[1;9]',
							'&3': '$e[1;9]',
							'&4': '$e[1;&1-1]',
						},
					],
					type: 'fill in',
					solutions: [['[_&4*100_]']],
					defaultDelay: 15,
					grade: CE1,
				},
				{
					description: 'Compléter une soustraction à trou',
					subdescription:
						"Soustraire un nombre d'au plus $$3$$ chiffres à un nombre à $$4$$ chiffres, sans retenue",
					enounces: ['Complète.'],
					expressions: [
						'[_ &1*1000 + &2*100 + &3*10+&4_]- ? = [_&1*1000 + &2*100 + &3*10+&4-(&5*100 + &6*10+&7) _]',
					],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$e[2;9]',
							'&3': '$e[2;9]',
							'&4': '$e[2;9]',
							'&5': '$e[0;&2-1]',
							'&6': '$e[0;&3-1]',
							'&7': '$e[1;&4-1]',
						},
					],
					type: 'fill in',
					solutions: [['[_ &5*100 + &6*10+&7 _]']],
					defaultDelay: 15,
					grade: CE1,
				},
				{
					description: 'Compléter une soustraction à trou',
					subdescription:
						'Soustraire des dizaines entières, des centaines entières ou des milliers entiers à un nombre',
					enounces: ['Complète.'],
					expressions: [
						'[_ &1*100 + &2*10 + &3 _] - ? = [_&1*100 + &2*10 + &3 - &5*100_]',
						'[_ &1*100 + &2*10 + &3 _] - ? = [_&1*100 + &2*10 + &3 - &5*10_]',
						'[_ &1*1000 + &2*100 + &3*10 + &4 _] - ? = [_&1*1000 + &2*100 + &3*10 + &4 - &5*1000_]',
						'[_ &1*1000 + &2*100 + &3*10 + &4 _] - ? = [_&1*1000 + &2*100 + &3*10 + &4 - &5*100_]',
						'[_ &1*1000 + &2*100 + &3*10 + &4 _] - ? = [_&1*1000 + &2*100 + &3*10 + &4 - &5*10_]',
					],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[0;9]',
							'&3': '$e[0;9]',
							'&5': '$e[1;&1-1]',
						},
						{
							'&1': '$e[1;9]',
							'&2': '$e[0;9]',
							'&3': '$e[0;9]',
							'&5': '$e[1;9]',
						},
						{
							'&1': '$e[2;9]',
							'&2': '$e[0;9]',
							'&3': '$e[0;9]',
							'&4': '$e[0;9]',
							'&5': '$e[1;&1-1]',
						},
						{
							'&1': '$e[1;9]',
							'&2': '$e[0;9]',
							'&3': '$e[0;9]',
							'&4': '$e[0;9]',
							'&5': '$e[1;9]',
						},
						{
							'&1': '$e[1;9]',
							'&2': '$e[0;9]',
							'&3': '$e[0;9]',
							'&4': '$e[0;9]',
							'&5': '$e[1;9]',
						},
					],
					type: 'fill in',
					solutions: [
						['[_&5*100_]'],
						['[_&5*10_]'],
						['[_&5*1000_]'],
						['[_&5*100_]'],
						['[_&5*10_]'],
					],
					defaultDelay: 15,
					grade: CE2,
				},
				{
					description: 'Compléter une soustraction à trou (résultat positif)',
					subdescription: 'Nombres à $$2$$ chiffres sans retenue.',
					enounces: ['Quel est le nombre manquant dans cette égalité ?'],
					expressions: [
						'[_ &1*10 + &2 _] - ? =  [_ &3*10 + &4 _]',
						'? - [_ &1*10 + &2 _] =  [_ &3*10 + &4 _]',
					],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
							'&3': '$e[1;&1-1]',
							'&4': '$e[1;&2-1]',
						},
						{
							'&1': '$e[2;8]',
							'&2': '$e[2;8]',
							'&3': '$e[1;9-&1]',
							'&4': '$e[1;9-&2]',
						},
					],
					solutions: [
						['[_ &1*10 + &2 -  ( &3*10 + &4) _]'],
						['[_ &1*10 + &2 + &3*10 + &4 _]'],
					],
					type: 'fill in',
					defaultDelay: 15,
					grade: UNKNOWN,
				},
				{
					description: 'Compléter une soustraction à trou (résultat positif)',
					subdescription: 'Nombres à $$3$$ chiffres (sans retenue)',
					enounces: ['Quel est le nombre manquant dans cette égalité ?'],
					expressions: [
						'[_ &1*100 + &2*10 + &3 _] - ? = [_ &4*100 + &5*10 + &6 _]',
						'? - [_ &1*100 + &2*10 + &3 _] = [_ &4*100 + &5*10 + &6 _]',
					],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
							'&3': '$e[2;9]',
							'&4': '$e[1;&1-1]',
							'&5': '$e[1;&2-1]',
							'&6': '$e[1;&3-1]',
						},
						{
							'&1': '$e[2;8]',
							'&2': '$e[2;8]',
							'&3': '$e[2;8]',
							'&4': '$e[1;9-&1]',
							'&5': '$e[1;9-&2]',
							'&6': '$e[1;9-&3]',
						},
					],
					solutions: [
						['[_ &1*100 + &2*10 + &3 - (&4*100 + &5*10 + &6) _]'],
						['[_ &1*100 + &2*10 + &3 + &4*100 + &5*10 + &6 _]'],
					],

					type: 'fill in',
					defaultDelay: 20,
					grade: UNKNOWN,
				},
				{
					description: 'Compléter une soustraction à trou (résultat positif)',
					subdescription: '2 nombres à 1 chiffres (avec retenue)',
					enounces: ['Quel est le nombre manquant dans cette égalité ?'],
					expressions: ['[_&1+&2_] - ?= &2', '?-&1= &2'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[11-&1;9]',
						},
					],
					solutions: [['&1'], ['[_&1+&2_]']],

					type: 'fill in',
					defaultDelay: 15,
					grade: UNKNOWN,
				},
				{
					description: 'Compléter une soustraction à trou (résultat positif)',
					subdescription: 'Nombres à 2 chiffres (avec retenue)',
					enounces: ['Quel est le nombre manquant dans cette égalité ?'],
					expressions: [
						'[_ &1*10 + &4 _] - ? =  [_ &3*10 + &2 _]',
						'? - [_ &1*10 + &2 _] =  [_ &3*10 + &4 _]',
					],
					variables: [
						{
							'&1': '$e[3;9]',
							'&2': '$e[2;9]',
							'&3': '$e[1;&1-2]',
							'&4': '$e[1;&2-1]',
						},
						{
							'&1': '$e[1;7]',
							'&2': '$e[1;9]',
							'&3': '$e[1;8-&1]',
							'&4': '$e[9-&2+1;9]',
						},
					],
					solutions: [
						['[_ &1*10 + &4 - (&3*10 + &2 )_]'],
						['[_ &1*10 + &2 + &3*10 + &4 _]'],
					],
					type: 'fill in',
					defaultDelay: 15,
					grade: UNKNOWN,
				},
				{
					description: 'Compléter une soustraction à trou (résultat positif)',
					subdescription: 'Nombres à 3 chiffres (avec retenue)',
					enounces: ['Quel est le nombre manquant dans cette égalité ?'],
					expressions: [
						'[_ &1*100 + &5*10 + &6 _] - ? =  [_ &4*100 + &2*10 + &3 _]',
						'? - [_ &1*100 + &2*10 + &3 _] =  [_ &4*100 + &5*10 + &6_]',
					],
					variables: [
						{
							'&1': '$e[3;9]',
							'&2': '$e[2;9]',
							'&3': '$e[2;9]',
							'&4': '$e[1;&1-2]',
							'&5': '$e[1;&2-1]',
							'&6': '$e[1;&3-1]',
						},
						{
							'&1': '$e[1;7]',
							'&2': '$e[1;9]',
							'&3': '$e[1;9]',
							'&4': '$e[1;8-&1]',
							'&5': '$e[9-&2+1;9]',
							'&6': '$e[9-&3+1;9]',
						},
					],
					solutions: [
						['[_ &1*100 + &5*10 + &6 - (&4*100 + &2*10 + &3) _]'],
						['[_&1*100 + &2*10 + &3 + &4*100 + &5*10 + &6_]'],
					],

					type: 'fill in',
					defaultDelay: 20,
					grade: UNKNOWN,
				},
			],
			'Différence astucieuse': [
				{
					description: 'Soustraire 9.',
					expressions: ['&3-9'],
					enounces: ['Calcule de manière astucieuse.'],

					correctionDetails: [
						[
							{
								text: `$$\\begin{align} &3-\\bold{\\textcolor{${color1}}{9}} &= &3\\bold{\\textcolor{${color1}}{-10+1}} \\\\ &= [_&3-10_]+1 \\\\ &= &sol \\end{align}$$`,
							},
						],
					],
					variables: [
						{
							'&1': '$e[1;8]',
							'&2': '$e[1;9]',
							'&3': '[_&2*10+&1_]',
						},
					],

					defaultDelay: 20,
					grade: CE2,
				},
				{
					description: 'Soustraire 19, 29, ....',
					expressions: ['&4-&5'],
					enounces: ['Calcule de manière astucieuse.'],

					variables: [
						{
							'&1': '$e[1;8]',
							'&2': '$e[&1+1;9]',
							'&3': '$e[1;8]',
							'&4': '[_&2*10+&3_]',
							'&5': '[_&1*10+9_]',
						},
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} &4-\\bold{\\textcolor{${color1}}{&5}} &= &4\\bold{\\textcolor{${color1}}{-[_&5+1_]+1}} \\\\ &= [_&4-&5-1_]+1 \\\\ &= &sol \\end{align}$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: CE2,
				},
			],
		},
		Multiplier: {
			Tables: [
				{
					description: 'Table de multiplication',
					subdescription: 'Par $$1$$',
					enounces: ['Calcule.'],
					expressions: ['1*&1'],
					variables: [{ '&1': '$e[2;12]' }],

					defaultDelay: 6,
					grade: CE1,
				},
				{
					description: 'Table de multiplication',
					subdescription: 'Par $$2$$',
					enounces: ['Calcule.'],
					expressions: ['2*&1'],
					variables: [{ '&1': '$e[2;12]' }],

					defaultDelay: 6,
					grade: CE1,
				},
				{
					description: 'Table de multiplication',
					subdescription: 'Par $$3$$',
					enounces: ['Calcule.'],
					expressions: ['3*&1'],
					variables: [{ '&1': '$e[2;12]' }],

					defaultDelay: 6,
					grade: CE1,
				},
				{
					description: 'Table de multiplication',
					subdescription: 'Par $$4$$',
					enounces: ['Calcule.'],
					expressions: ['4*&1'],
					variables: [{ '&1': '$e[2;12]' }],

					defaultDelay: 6,
					grade: CE1,
				},
				{
					description: 'Table de multiplication',
					subdescription: 'Par $$5$$',
					enounces: ['Calcule.'],
					expressions: ['5*&1'],
					variables: [{ '&1': '$e[2;12]' }],

					defaultDelay: 6,
					grade: CE1,
				},
				{
					description: 'Table de multiplication',
					subdescription: 'Par $$6$$',
					enounces: ['Calcule.'],
					expressions: ['6*&1'],
					variables: [{ '&1': '$e[2;12]' }],

					defaultDelay: 6,
					grade: CE2,
				},
				{
					description: 'Table de multiplication',
					subdescription: 'Par $$7$$',
					enounces: ['Calcule.'],
					expressions: ['7*&1'],
					variables: [{ '&1': '$e[2;12]' }],

					defaultDelay: 6,
					grade: CE2,
				},
				{
					description: 'Table de multiplication',
					subdescription: 'Par $$8$$',
					enounces: ['Calcule.'],
					expressions: ['8*&1'],
					variables: [{ '&1': '$e[2;12]' }],

					defaultDelay: 6,
					grade: CE2,
				},
				{
					description: 'Table de multiplication',
					subdescription: 'Par $$9$$',
					enounces: ['Calcule.'],
					expressions: ['9*&1'],
					variables: [{ '&1': '$e[2;12]' }],

					defaultDelay: 6,
					grade: CE2,
				},
			],
			Produit: [
				{
					description: "Calculer un produit d'entiers",
					subdescription: 'Nombres à $$1$$ chiffre',
					enounces: ['Calcule.'],
					expressions: ['&1*&2'],
					variables: [{ '&1': '$e[2;9]', '&2': '$e[2;9]' }],

					defaultDelay: 20,
					grade: CE2,
				},
				{
					description: 'Multiplier par 20',
					subdescription: 'Nombre à $$1$$ chiffre',
					enounces: ['Calcule.'],
					expressions: ['&1*20', '20*&1'],
					variables: [{ '&1': '$e[0;9]' }],

					defaultDelay: 20,
					grade: CE2,
				},
				{
					description: 'Multiplier par 20',
					subdescription: 'Nombre à $$2$$ chiffres',
					enounces: ['Calcule.'],
					expressions: ['&1*20', '20*&1'],
					variables: [{ '&1': '$l{$e[11;15];$e[15;20];25;30;40;50}' }],

					correctionDetails: [
						[
							{
								text: `$$\\begin{align} &1 \\times \\bold{\\textcolor{${color1}}{20}} &= &1 \\times \\bold{\\textcolor{${color1}}{2 \\times 10}}  \\\\ &= [_&1*2_] \\times 10 \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{20}} \\times &1 &=  \\bold{\\textcolor{${color1}}{10 \\times 2}} \\times &1 \\\\ &= 10 \\times [_&1*2_]  \\\\ &= &sol \\end{align}$$`,
							},
						],
					],
					defaultDelay: 20,
					grade: CE2,
				},
				{
					description: 'Multiplier par $$30$$, $$40$$, $$50$$, $$60$$, $$70$$, $$80$$, $$90$$',
					subdescription: 'Nombre à $$1$$ chiffres',
					enounces: ['Calcule.'],
					expressions: ['[_&1*10_]*&2', '&2*[_&1*10_]'],
					variables: [{ '&1': '$e[3;9]', '&2': '$e[2;9]' }],

					defaultDelay: 15,
					grade: CM1,
				},
				{
					description: 'Multiplier deux multiples de $$10$$',
					enounces: ['Calcule.'],
					expressions: ['&3*&4'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
							'&3': '[_&1*10_]',
							'&4': '[_&2*10_]',
						},
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&3}} \\times \\bold{\\textcolor{yellow}{&4}} &= \\bold{\\textcolor{${color1}}{&1 \\times 10}} \\times \\bold{\\textcolor{yellow}{&2 \\times 10}} \\\\ &= &1 \\times &2 \\times 10 \\times 10 \\\\ &= [_&1*&2_] \\times 100 \\\\ &= &sol \\end{align}$$`,
							},
						],
					],

					defaultDelay: 15,
					grade: CM1,
				},
				{
					description: "Calculer un produit d'entiers",
					subdescription:
						'Les $$2$$ facteurs sont des multiples de $$10$$, $$100$$ ou $$1000$$',
					enounces: ['Calcule.'],
					expressions: ['&5*&6'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[1;3]',
							'&3': '$e[2;9]',
							'&4': '$e[1;3]',
							'&5': '[_&1*10^&2_]',
							'&6': '[_&3*10^&4_]',
						},
					],

					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&5}} \\times \\bold{\\textcolor{yellow}{&6}} &= \\bold{\\textcolor{${color1}}{&1 \\times [_10^&2_]}} \\times \\bold{\\textcolor{yellow}{&3 \\times [_10^&4_]}} \\\\ &= &1 \\times &3 \\times [_10^&2_] \\times [_10^&4_] \\\\ &= [_&1*&3_] \\times [_10^(&2+&4)_] \\\\ &= &sol \\end{align}$$`,
							},
						],
					],
					defaultDelay: 20,
					grade: CM2,
				},
				{
					description: "Calculer un produit d'entiers",
					subdescription: 'Un facteur à $$2$$ chiffres',
					enounces: ['Calcule.'],
					expressions: ['&1*&2', '&2*&1'],
					variables: [{ '&1': '$e[2;9]', '&2': '$e[12;99]' }],
					defaultDelay: 30,
					grade: CM2,
				},
				{
					description: "Calculer un produit d'entiers",
					subdescription: 'Un facteur à $$3$$ chiffres',
					enounces: ['Calcule.'],
					expressions: ['&1*&2', '&2*&1'],
					variables: [{ '&1': '$e[2;9]', '&2': '$e[102;999]' }],
					defaultDelay: 30,
					grade: SIXIEME,
				},
				{
					description: "Chiffre des unités d'un produit",
					enounces: [
						'Quel est le chiffre des unités du produit de $$[_&2_]$$ par $$[_&4_]$$ ?',
					],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]*10+&1',
							'&3': '$e[1;9]',
							'&4': '$e[1;9]*100+$e[1;9]*10+&3',
							'&5': '&3*&1',
							'&6': '[_(&5:10-floor(&5:10))*10_]'
						},
					],
					solutions: [['&6']],
					correctionFormat: [
						{
							correct: ['Le chiffre des unités est &answer.'],
						},
					],
					correctionDetails: [
						[
							{
								text: `@@&5>=10 ?? $$&1\\times &3 = [_(&5-&6):10_]\\textcolor{${correct_color}}{&6}$$@@ 
								@@&5<10 ?? $$&1\\times &3 = \\textcolor{${correct_color}}{&6}$$@@ `,
							},
						],
					],
					defaultDelay: 30,
					grade: SIXIEME,
				},
			],
			'Double et moitié': [
				{
					description: 'Trouver le double',
					subdescription: 'Nombre inférieur à $$10$$',
					enounces: [
						'Quel est le double de $$&1$$ ?',
						'Quel est le résultat de $$2*&1$$ ?',
					],
					solutions: [['[_2*&1_]']],
					variables: [{ '&1': '$e[0;9]' }],
					correctionFormat: [
						{
							correct: ['Le double de $$&1$$ est &answer.'],
						},
						{
							correct: ['$$2*&1=&ans$$'],
						},
					],

					defaultDelay: 10,
					grade: CP,
				},
				{
					description: 'Trouver le double',
					subdescription: "Dizaines entières (jusqu'à $$50$$)",
					enounces: [
						'Quel est le double de $$&2$$ ?',
						'Quel est le résultat de $$2*&2$$ ?',
					],
					solutions: [['[_2*&2_]']],
					variables: [
						{
							'&1': '$e[1;5]*10',
							'&2': '[_&1_]',
						},
					],
					correctionFormat: [
						{
							correct: ['Le double de $$&2$$ est &answer.'],
						},
						{
							correct: ['$$2*&2=&ans$$'],
						},
					],

					defaultDelay: 10,
					grade: CP,
				},
				{
					description: 'Trouver la moitié',
					subdescription: 'Nombre pair inférieur à $$20$$',
					enounces: ['Quelle est la moitié de $$[_2*&1_]$$ ?'],
					solutions: [['[_&1_]']],
					variables: [{ '&1': '$e[0;10]' }],
					correctionFormat: [
						{
							correct: ['La moitié de $$[_2*&1_]$$ est &answer.'],
						},
					],
					correctionDetails: [
						[
							{
								text: 'La moitié de $$[_2*&1_]$$ est &solution car $$2*&1=[_2*&1_]$$',
							},
						],
					],

					defaultDelay: 10,
					grade: CP,
				},
				{
					description: 'Trouver le double',
					subdescription: 'Nombres de $$1$$ à $$15$$, $$25$$, $$30$$, $$40$$, $$50$$ et $$100$$',
					enounces: [
						'Quel est le double de $$&1$$ ?',
						'Quel est le résultat de $$2*&1$$ ?',
					],
					solutions: [['[_2*&1_]']],
					variables: [
						{
							'&1': '$l{$e[1;9];$e[11;15];25;30;40;50;100}',
						},
					],
					correctionFormat: [
						{
							correct: ['Le double de $$&1$$ est &answer.'],
						},
						{
							correct: ['$$2*&1=&ans$$'],
						},
					],

					defaultDelay: 15,
					grade: CE1,
				},
				{
					description: 'Trouver la moitié',
					subdescription: 'Nombres pairs de $$1$$ à $$30$$, $$40$$, $$50$$ et $$100$$',
					enounces: ['Quelle est la moitié de $$&2$$ ?'],
					solutions: [['[_&1_]']],
					variables: [
						{
							'&1': '$l{$e[1;9];$e[11;15];20;25;50}',
							'&2': '[_2*&1_]',
						},
					],
					correctionFormat: [
						{
							correct: ['La moitié de $$&2$$ est &answer.'],
						},
					],
					correctionDetails: [
						[
							{
								text: 'Le moitié de $$[_2*&1_]$$ est &solution car $$2*&1=[_2*&1_]$$',
							},
						],
					],
					defaultDelay: 15,
					grade: CE1,
				},
				{
					description: 'Trouver le double',
					subdescription: 'Nombres de $$1$$ à $$20$$, $$25$$, $$30$$, $$40$$, $$50$$, $$60$$ et $$100$$',
					enounces: [
						'Quel est le double de $$&1$$ ?',
						'Quel est le résultat de $$2*&1$$ ?',
					],
					solutions: [['[_2*&1_]']],
					variables: [
						{
							'&1': '$l{$e[1;10];$e[11;15];$e[15;20];25;30;40;50;60;100}',
						},
					],
					correctionFormat: [
						{
							correct: ['Le double de $$&1$$ est &answer.'],
						},
						{
							correct: ['$$2*&1=&ans$$'],
						},
					],

					defaultDelay: 15,
					grade: CE2,
				},
				{
					description: 'Trouver la moitié',
					subdescription: 'Nombres pairs de $$1$$ à $$40$$, $$50$$, $$60$$ et $$100$$',
					enounces: ['Quelle est la moitié de $$&2$$ ?'],
					solutions: [['[_&1_]']],
					variables: [
						{
							'&1': '$l{$e[1;9];$e[11;15];$e[16;20];25;30;50}',
							'&2': '[_2*&1_]',
						},
					],
					correctionFormat: [
						{
							correct: ['La moitié de $$&2$$ est &answer.'],
						},
					],
					correctionDetails: [
						[
							{
								text: 'Le moitié de $$[_2*&1_]$$ est &solution car $$2*&1=[_2*&1_]$$',
							},
						],
					],
					defaultDelay: 15,
					grade: CE2,
				},
			],
			'Triple et tiers': [
				{
					description: 'Trouver le triple',
					subdescription: 'Nombre inférieur à $$10$$',
					enounces: [
						'Quel est le triple de $$&1$$ ?',
						'Quel est le résultat de $$3*&1$$ ?',
					],
					solutions: [['[_3*&1_]']],
					variables: [{ '&1': '$e[0;9]' }],
					correctionFormat: [
						{
							correct: ['Le triple de $$&1$$ est &answer.'],
						},
						{
							correct: ['$$3*&1=&ans$$'],
						},
					],

					defaultDelay: 10,
					grade: CE1,
				},
				{
					description: 'Trouver le triple',
					subdescription: "Dizaines entières (jusqu'à $$50$$)",
					enounces: [
						'Quel est le triple de $$&2$$ ?',
						'Quel est le résultat de $$3*&2$$ ?',
					],
					solutions: [['[_3*&2_]']],
					variables: [
						{
							'&1': '$e[1;5]*10',
							'&2': '[_&1_]',
						},
					],
					correctionFormat: [
						{
							correct: ['Le triple de $$&2$$ est &answer.'],
						},
						{
							correct: ['$$3*&2=&ans$$'],
						},
					],

					defaultDelay: 10,
					grade: CE1,
				},
				{
					description: 'Trouver le tiers',
					subdescription: 'Multiples de $$3$$ inférieurs à $$30$$',
					enounces: ['Quelle est le tiers de $$[_3*&1_]$$ ?'],
					solutions: [['[_&1_]']],
					variables: [{ '&1': '$e[0;10]' }],
					correctionFormat: [
						{
							correct: ['Le tiers de $$[_3*&1_]$$ est &answer.'],
						},
					],
					correctionDetails: [
						[
							{
								text: 'Le tiers de $$[_3*&1_]$$ est &solution car $$3*&1=[_3*&1_]$$',
							},
						],
					],

					defaultDelay: 10,
					grade: CE1,
				},
				{
					description: 'Trouver le triple',
					subdescription: 'Nombres de $$1$$ à $$15$$, $$25$$, $$30$$, $$40$$, $$50$$ et $$100$$',
					enounces: [
						'Quel est le triple de $$&1$$ ?',
						'Quel est le résultat de $$3*&1$$ ?',
					],
					solutions: [['[_3*&1_]']],
					variables: [
						{
							'&1': '$l{$e[1;9];$e[11;15];25;30;40;50;100}',
						},
					],
					correctionFormat: [
						{
							correct: ['Le triple de $$&1$$ est &answer.'],
						},
						{
							correct: ['$$3*&1=&ans$$'],
						},
					],

					defaultDelay: 15,
					grade: CE2,
				},
				{
					description: 'Trouver le triple',
					subdescription: 'Nombres de $$1$$ à $$20$$, $$25$$, $$30$$, $$40$$, $$50$$, $$60$$ et $$100$$',
					enounces: [
						'Quel est le triple de $$&1$$ ?',
						'Quel est le résultat de $$3*&1$$ ?',
					],
					solutions: [['[_3*&1_]']],
					variables: [
						{
							'&1': '$l{$e[1;10];$e[11;15];$e[15;20];25;30;40;50;60;100}',
						},
					],
					correctionFormat: [
						{
							correct: ['Le triple de $$&1$$ est &answer.'],
						},
						{
							correct: ['$$3*&1=&ans$$'],
						},
					],
					defaultDelay: 15,
					grade: CE2,
				},
			],
			'Quadruple et quart': [
				{
					description: 'Trouver le quadruple',
					subdescription: 'Nombre inférieur à $$10$$',
					enounces: [
						'Quel est le quadruple de $$&1$$ ?',
						'Quel est le résultat de $$4*&1$$ ?',
					],
					solutions: [['[_4*&1_]']],
					variables: [{ '&1': '$e[0;9]' }],
					correctionFormat: [
						{
							correct: ['Le quadruple de $$&1$$ est &answer.'],
						},
						{
							correct: ['$$4*&1=&ans$$'],
						},
					],

					defaultDelay: 10,
					grade: CE2,
				},
				{
					description: 'Trouver le quadruple',
					subdescription: "Dizaines entières (jusqu'à $$50$$)",
					enounces: [
						'Quel est le quadruple de $$&2$$ ?',
						'Quel est le résultat de $$4*&2$$ ?',
					],
					solutions: [['[_4*&2_]']],
					variables: [
						{
							'&1': '$e[1;5]*10',
							'&2': '[_&1_]',
						},
					],
					correctionFormat: [
						{
							correct: ['Le quadruple de $$&2$$ est &answer.'],
						},
						{
							correct: ['$$4*&2=&ans$$'],
						},
					],

					defaultDelay: 10,
					grade: CE2,
				},
				{
					description: 'Trouver le quart',
					subdescription: 'Multiples de $$4$$ inférieurs à $$40$$',
					enounces: ['Quelle est le quart de $$[_4*&1_]$$ ?'],
					solutions: [['[_&1_]']],
					variables: [{ '&1': '$e[0;10]' }],
					correctionFormat: [
						{
							correct: ['Le quart de $$[_4*&1_]$$ est &answer.'],
						},
					],
					correctionDetails: [
						[
							{
								text: 'Le quart de $$[_4*&1_]$$ est &solution car $$4*&1=[_4*&1_]$$',
							},
						],
					],

					defaultDelay: 10,
					grade: CE2,
				},
				{
					description: 'Trouver le quadruple',
					subdescription: 'Nombres de $$1$$ à $$15$$, $$25$$, $$30$$, $$40$$, $$50$$ et $$100$$',
					enounces: [
						'Quel est le quadruple de $$&1$$ ?',
						'Quel est le résultat de $$4*&1$$ ?',
					],
					solutions: [['[_4*&1_]']],
					variables: [
						{
							'&1': '$l{$e[1;9];$e[11;15];25;30;40;50;100}',
						},
					],
					correctionFormat: [
						{
							correct: ['Le quadruple de $$&1$$ est &answer.'],
						},
						{
							correct: ['$$4*&1=&ans$$'],
						},
					],

					defaultDelay: 15,
					grade: CM1,
				},
				{
					description: 'Trouver le quadruple',
					subdescription: 'Nombres de $$1$$ à $$20$$, $$25$$, $$30$$, $$40$$, $$50$$, $$60$$ et $$100$$',
					enounces: [
						'Quel est le quadruple de $$&1$$ ?',
						'Quel est le résultat de $$4*&1$$ ?',
					],
					solutions: [['[_4*&1_]']],
					variables: [
						{
							'&1': '$l{$e[1;10];$e[11;15];$e[15;20];25;30;40;50;60;100}',
						},
					],
					correctionFormat: [
						{
							correct: ['Le quadruple de $$&1$$ est &answer.'],
						},
						{
							correct: ['$$4*&1=&ans$$'],
						},
					],

					defaultDelay: 15,
					grade: CM1,
				},
			],
			'Produits particuliers': [
				{
					description: "Calculer un produit d'entiers",
					subdescription: 'Premiers multiples de $$25$$ et $$50$$',
					enounces: ['Calcule.'],
					expressions: ['&1*50', '&1*25'],

					variables: [{ '&1': '$e[0;4]' }],
					defaultDelay: 10,
					grade: CM1,
				},
				{
					description: "Calculer un produit d'entiers",
					subdescription: 'Produits à connaître par coeur',
					enounces: ['Calcule.'],
					options: ['exhaust'],
					expressions: [
						'4*25',
						'2*50',
						'5*12',
						'4*15',
						'4*20',
						'5*14',
						'5*18',
						'6*15',
						'6*20',
						'8*15',
					],

					defaultDelay: 20,
					grade: CM2,
				},
				{
					description: "Calculer un produit d'entiers",
					subdescription: 'Multiplication par $$50$$',
					enounces: ['Calcule.'],
					expressions: ['[_&1*2+1_]*50', '[_&1*2_]*50'],

					variables: [{ '&1': '$e[2;10]' }],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{[_&1*2+1_]}} \\times 50 &= \\bold{\\textcolor{${color1}}{(&1 \\times 2 + 1)}} \\times 50 \\\\ &= &1 \\times 2 \\times 50  + 50 \\\\ &= &1 \\times 100  + 50 \\\\ &=  [_&1*100_]  + 50 \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{[_&1*2_]}} \\times 50 &= \\bold{\\textcolor{${color1}}{(&1 \\times 2)}} \\times 50 \\\\ &= &1 \\times 2 \\times 50 \\\\ &= &1 \\times 100 \\\\ &=  [_&1*100_] \\\\ &= &sol \\end{align}$$`,
							},
						],
					],
					defaultDelay: 20,
					grade: CM2,
				},
				{
					description: "Calculer un produit d'entiers",
					subdescription: 'Multiplication par $$25$$',
					enounces: ['Calcule.'],
					expressions: ['[_&1*4+&2_]*25', '[_&1*4_]*25'],

					variables: [
						{
							'&1': '$e[2;5]',
							'&2': '$e[1;3]',
						},
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{[_&1*4+&2_]}} \\times 25 &= \\bold{\\textcolor{${color1}}{(&1 \\times 4 + &2)}} \\times 25 \\\\ &= &1 \\times \\bold{\\textcolor{yellow}{4 \\times 25}}  + &2 \\times 25 \\\\ &= &1 \\times \\bold{\\textcolor{yellow}{100}} + [_&2*25_] \\\\ &=  [_&1*100_]  + [_&2*25_] \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{[_&1*4_]}} \\times 25 &= \\bold{\\textcolor{${color1}}{(&1 \\times 4)}} \\times 25 \\\\ &= &1 \\times \\bold{\\textcolor{yellow}{4 \\times 25}} \\\\ &= &1 \\times \\bold{\\textcolor{yellow}{100}} \\\\ &= &sol \\end{align}$$`,
							},
						],
					],
					defaultDelay: 20,
					grade: CM2,
				},
			],
			'Puissances de 10': [
				{
					description: "Calculer un produit d'entiers",
					subdescription: "Multiplication par $$10$$ d'un nombre inférieur à $$100$$",
					enounces: ['Calcule.'],
					expressions: ['&1*10', '10*&1'],
					variables: [{ '&1': '$e[1;99]' }],

					defaultDelay: 10,
					grade: CE1,
				},
				{
					description: "Calculer un produit d'entiers",
					subdescription: "Multiplication par $$100$$ d'un nombre inférieur à $$100$$",
					enounces: ['Calcule.'],
					expressions: ['&1*100', '100*&1'],
					variables: [{ '&1': '$e[1;99]' }],
					defaultDelay: 10,
					grade: CE2,
				},
				{
					description: "Calculer un produit d'entiers",
					subdescription: 'Multiplication par $$10$$, $$100$$ ou $$1000$$',
					enounces: ['Calcule.'],
					expressions: ['&1*[_10^&2_]'],
					variables: [{ '&1': '$e[2;99]', '&2': '$e[1;3]' }],

					defaultDelay: 20,
					grade: CM1,
				},
			],
			'A trou': [
				{
					description: 'Compléter une multiplication à trou',
					subdescription: 'Multiplication par $$2$$',
					enounces: ['Complète.'],
					expressions: ['?*2=[_&1*2_]', '2*?=[_&1*2_]'],
					variables: [{ '&1': '$e[2;9]' }],
					solutions: [['&1']],
					type: 'fill in',
					defaultDelay: 10,
					grade: CE1,
				},
				{
					description: 'Compléter une multiplication à trou',
					subdescription: 'Multiplication par $$3$$',
					enounces: ['Complète.'],
					expressions: ['?*3=[_&1*3_]', '3*?=[_&1*3_]'],
					variables: [{ '&1': '$e[2;9]' }],
					solutions: [['&1']],
					type: 'fill in',
					defaultDelay: 10,
					grade: CE1,
				},
				{
					description: 'Compléter une multiplication à trou',
					subdescription: 'Multiplication par $$4$$',
					enounces: ['Complète.'],
					expressions: ['?*4=[_&1*4_]', '4*?=[_&1*4_]'],
					variables: [{ '&1': '$e[2;9]' }],
					solutions: [['&1']],
					type: 'fill in',
					defaultDelay: 10,
					grade: CE1,
				},
				{
					description: 'Compléter une multiplication à trou',
					subdescription: 'Multiplication par $$5$$',
					enounces: ['Complète.'],
					expressions: ['?*5=[_&1*5_]', '5*?=[_&1*5_]'],
					variables: [{ '&1': '$e[2;9]' }],
					solutions: [['&1']],
					type: 'fill in',
					defaultDelay: 10,
					grade: CE1,
				},
				{
					description: 'Compléter une multiplication à trou',
					subdescription: 'Multiplication par $$6$$',
					enounces: ['Complète.'],
					expressions: ['?*6=[_&1*6_]', '6*?=[_&1*6_]'],
					variables: [{ '&1': '$e[2;9]' }],
					solutions: [['&1']],
					type: 'fill in',
					defaultDelay: 10,
					grade: CE2,
				},
				{
					description: 'Compléter une multiplication à trou',
					subdescription: 'Multiplication par $$7$$',
					enounces: ['Complète.'],
					expressions: ['?*7=[_&1*7_]', '7*?=[_&1*7_]'],
					variables: [{ '&1': '$e[2;9]' }],
					solutions: [['&1']],
					type: 'fill in',
					defaultDelay: 10,
					grade: CE2,
				},
				{
					description: 'Compléter une multiplication à trou',
					subdescription: 'Multiplication par $$8$$',
					enounces: ['Complète.'],
					expressions: ['?*8=[_&1*8_]', '8*?=[_&1*8_]'],
					variables: [{ '&1': '$e[2;9]' }],
					solutions: [['&1']],
					type: 'fill in',
					defaultDelay: 10,
					grade: CE2,
				},
				{
					description: 'Compléter une multiplication à trou',
					subdescription: 'Multiplication par $$9$$',
					enounces: ['Complète.'],
					expressions: ['?*9=[_&1*9_]', '9*?=[_&1*9_]'],
					variables: [{ '&1': '$e[2;9]' }],
					solutions: [['&1']],
					type: 'fill in',
					defaultDelay: 10,
					grade: CE2,
				},
				{
					description: 'Compléter une multiplication à trou',
					subdescription: 'Facteurs à $$1$$ chiffre',
					enounces: ['Complète.'],
					expressions: ['?*&1=[_&1*&2_]', '&1*?=[_&1*&2_]'],
					variables: [{ '&1': '$e[2;9]', '&2': '$e[3;9]' }],
					solutions: [['&2']],
					type: 'fill in',
					defaultDelay: 20,
					grade: CE2,
				},
				{
					description: 'Compléter une multiplication à trou',
					subdescription: 'Multiplier par $$20$$. Nombre à $$1$$ chiffre.',
					enounces: ['Complète.'],
					expressions: ['?*20=[_&1*20_]', '20*?=[_20*&1_]'],
					variables: [{ '&1': '$e[0;9]' }],
					type: 'fill in',
					solutions: [['&1']],
					defaultDelay: 20,
					grade: CE2,
				},
				{
					description: 'Compléter une multiplication à trou',
					subdescription: 'Multiplier par $$20$$. Nombre à $$2$$ chiffres.',
					enounces: ['Complète.'],
					expressions: ['?*20=[_&1*20_]', '20*?=[_20*&1_]'],
					variables: [{ '&1': '$l{$e[11;15];$e[15;20];25;30;40;50}' }],
					type: 'fill in',
					solutions: [['&1']],
					defaultDelay: 20,
					grade: CE2,
				},
				{
					description: 'Compléter une multiplication à trou.',
					subdescription:
						'Multiplier par $$30$$, $$40$$, $$50$$, $$60$$, $$70$$, $$80$$, $$90$$. Nombre à $$1$$ chiffres.',
					enounces: ['Complète.'],
					expressions: [
						'[_&1*10_]*? = [_&1*10*&2_]',
						'?*[_&1*10_] = [_&2*&1*10_]',
					],
					variables: [{ '&1': '$e[3;9]', '&2': '$e[2;9]' }],
					type: 'fill in',
					solutions: [['&2']],
					defaultDelay: 15,
					grade: CM1,
				},
				{
					description: 'Compléter une multiplication à trou.',
					subdescription:
						'Multiplier par $$30$$, $$40$$, $$50$$, $$60$$, $$70$$, $$80$$, $$90$$. Nombre à 1 chiffre.',
					enounces: ['Complète.'],
					expressions: ['?*&2 = [_&1*10*&2_]', '&2*? = [_&2*&1*10_]'],
					variables: [{ '&1': '$e[3;9]', '&2': '$e[2;9]' }],
					type: 'fill in',
					solutions: [['[_&1*10_]']],
					defaultDelay: 15,
					grade: CM1,
				},
				{
					description: 'Combien de fois ... dans ....',
					subdescription:
						'Multiplier par $$30$$, $$40$$, $$50$$, $$60$$, $$70$$, $$80$$, $$90$$. Nombre à 1 chiffre.',
					enounces: ['Dans $$[_&1*10*&2_]$$ combien de fois $$&2$$ ?'],
					// expressions: ['?*&2 = [_&1*10*&2_]', '&2*? = [_&2*&1*10_]'],
					variables: [{ '&1': '$e[3;9]', '&2': '$e[2;9]' }],
					solutions: [['[_&1*10_]']],
					correctionFormat: [
						{
							correct: ['On peut mettre &answer fois $$&2$$.'],
						},
					],
					defaultDelay: 15,
					grade: CM1,
				},
				{
					description: 'Compléter une multiplication à trou',
					subdescription: 'Multiplier deux multiples de $$10$$',
					enounces: ['Complète.'],
					expressions: [
						'[_&1*10_]* ?= [_&1*10*&2*10_]',
						'?*[_&1*10_]=[_&2*10*&1*10_]',
					],
					variables: [{ '&1': '$e[2;9]', '&2': '$e[2;9]' }],
					type: 'fill in',
					solutions: [['[_&2*10_]']],
					defaultDelay: 15,
					grade: CM1,
				},
				{
					description: 'Compléter une multiplication à trou.',
					subdescription: 'Premiers multiples de $$25$$ et $$50$$',
					enounces: ['Complète.'],
					expressions: ['?*50=[_&1*50_]', '?*25=[_&1*25_]'],
					type: 'fill in',
					solutions: [['&1']],
					variables: [{ '&1': '$e[0;4]' }],
					defaultDelay: 10,
					grade: CM1,
				},
				{
					description: 'Compléter une multiplication à trou',
					subdescription:
						'Les $$2$$ facteurs sont des multiples de $$10$$, $$100$$ ou $$1000$$',
					enounces: ['Complète.'],
					expressions: [
						'[_&1*10^&2_]*?= [_&1*10^&2*&3*10^&4_]',
						'?*[_&1*10^&2_]= [_&1*10^&2*&3*10^&4_]',
					],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[1;3]',
							'&3': '$e[2;9]',
							'&4': '$e[1;3]',
						},
					],
					solutions: [['[_&3*10^&4_]']],
					type: 'fill in',
					defaultDelay: 20,
					grade: CM2,
				},
				{
					description: 'Compléter une multiplication à trou',
					subdescription: 'Produits classiques',
					enounces: ['Complète.'],
					expressions: [
						'?*4=100',
						'?*5=100',
						'?*2=100',
						'?*5=60',
						'?*4=60',
						'?*5=70',
						'?*5=90',
						'?*6=90',

						'?*25=100',
						'?*20=100',
						'?*50=100',
						'?*12=60',
						'?*15=60',
						'?*14=70',
						'?*18=90',
						'?*15=90',
					],
					solutions: [
						['25'],
						['20'],
						['50'],
						['12'],
						['15'],
						['14'],
						['18'],
						['15'],

						['4'],
						['5'],
						['2'],
						['5'],
						['4'],
						['5'],
						['5'],
						['6'],
					],

					options: ['exhaust'],
					type: 'fill in',
					defaultDelay: 20,
					grade: CM2,
				},
				{
					description: 'Compléter une multiplication à trou',
					subdescription: 'Multiplication par $$50$$',
					enounces: ['Complète.'],
					expressions: ['?*50=[_(&1*2+1)*50_]', '?*50 = [_&1*2*50_]'],
					type: 'fill in',
					solutions: [['[_&1*2+1_]'], ['[_&1*2_]']],
					variables: [{ '&1': '$e[1;6]' }],
					defaultDelay: 20,
					grade: CM2,
				},
				{
					description: 'Compléter une multiplication à trou',
					subdescription: 'Multiplication par $$25$$',
					enounces: ['Complète.'],
					expressions: ['?*25=[_(&1*4+&2)*25_]', '?*25=[_&1*4*25_]'],
					type: 'fill in',
					solutions: [['[_&1*4+&2_]'], ['[_&1*4_]']],
					variables: [{ '&1': '$e[2;5]', '&2': '$e[1;3]' }],
					defaultDelay: 20,
					grade: CM2,
				},
			],

			Carrés: [
				{
					description: 'Calculer un carré',
					subdescription: 'Entier de 1 à 15',
					enounces: ['Calcule.'],
					expressions: ['&1^2'],
					variables: [{ '&1': '$e[1;15]' }],

					defaultDelay: 10,
					grade: CINQUIEME,
				},
			],

			'Produits astucieux': [
				{
					description: 'Calculer astucieusement un produit',
					subdescription: 'Utiiser $$2$$ facteurs dont le produit est $$10$$',
					enounces: ['Calcule de manière astucieuse.'],
					expressions: ['2*&1*5', '5*&1*2', '&1*5*2', '&1*2*5'],
					variables: [{ '&1': '$e[19;40]' }],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{2}} \\times &1 \\times  \\bold{\\textcolor{${color1}}{5}} &= \\bold{\\textcolor{${color1}}{10}} \\times &1 \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{5}} \\times &1 \\times  \\bold{\\textcolor{${color1}}{2}} &= \\bold{\\textcolor{${color1}}{10}} \\times &1 \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} &1 \\times \\bold{\\textcolor{${color1}}{2}} \\times  \\bold{\\textcolor{${color1}}{5}} &= &1 \\times \\bold{\\textcolor{${color1}}{10}} \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} &1 \\times \\bold{\\textcolor{${color1}}{5}} \\times  \\bold{\\textcolor{${color1}}{2}} &=   &1 \\times \\bold{\\textcolor{${color1}}{10}} \\\\ &= &sol \\end{align}$$`,
							},
						],
					],

					defaultDelay: 15,
					grade: CE1,
				},
				{
					description: 'Calculer astucieusement un produit',
					subdescription: 'Utiiser $$2$$ facteurs dont le produit est $$100$$',
					enounces: ['Calcule de manière astucieuse.'],
					expressions: [
						'&1*&2*&3',
						'&2*&1*&3',
						'&2*&3*&1',
						'&1*&3*&2',
						'&3*&2*&1',
						'&3*&1*&2',
					],
					variables: [
						{ '&1': '$l{20;25;50}', '&2': '[_100:&1_]', '&3': '$e[11;99]' },
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&1}}  \\times  \\bold{\\textcolor{${color1}}{&2}} \\times &3 &= \\bold{\\textcolor{${color1}}{100}} \\times &3 \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&2}}  \\times  \\bold{\\textcolor{${color1}}{&1}} \\times &3 &= \\bold{\\textcolor{${color1}}{100}} \\times &3 \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&2}}  \\times  &3 \\times \\bold{\\textcolor{${color1}}{&1}} &= \\bold{\\textcolor{${color1}}{100}} \\times &3 \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&1}}  \\times  &3 \\times \\bold{\\textcolor{${color1}}{&2}} &= \\bold{\\textcolor{${color1}}{100}} \\times &3 \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} &3 \\times \\bold{\\textcolor{${color1}}{&2}} \\times \\bold{\\textcolor{${color1}}{&1}} &= &3 \\times \\bold{\\textcolor{${color1}}{100}} \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} &3 \\times \\bold{\\textcolor{${color1}}{&1}} \\times \\bold{\\textcolor{${color1}}{&2}} &= &3 \\times \\bold{\\textcolor{${color1}}{100}} \\\\ &= &sol \\end{align}$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: CE2,
				},
			],
			Distributivité: [
				{
					description: 'Utiliser la distributivité',
					subdescription: "Multiplication d'un nombre à $$1$$ chiffre par $$12$$",
					enounces: ['Calcule.'],
					expressions: ['12*&1'],
					variables: [{ '&1': '$e[0;9]' }],

					correctionDetails: [
						[
							{
								text: `$$\\begin{align} 12 \\times \\bold{\\textcolor{${color1}}{&1}}  &= 10 \\times \\bold{\\textcolor{${color1}}{&1}} + 2 \\times \\bold{\\textcolor{${color1}}{&1}} \\\\ &= [_10*&1_] + [_2*&1_] \\\\ &= &sol \\end{align}$$`,
							},
						],
					],
					defaultDelay: 20,
					grade: CE1,
				},
				{
					description: 'Utiliser la distributivité',
					subdescription: "Multiplication d'un nombre à $$1$$ chiffre par $$13$$",
					enounces: ['Calcule.'],
					expressions: ['13*&1'],
					variables: [{ '&1': '$e[0;9]' }],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} 13 \\times \\bold{\\textcolor{${color1}}{&1}}  &= 10 \\times \\bold{\\textcolor{${color1}}{&1}} + 3 \\times \\bold{\\textcolor{${color1}}{&1}} \\\\ &= [_10*&1_] + [_3*&1_] \\\\ &= &sol \\end{align}$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: CE2,
				},
				{
					description: 'Utiliser la distributivité',
					subdescription: "Multiplication d'un nombre à $$1$$ chiffre par $$21$$",
					enounces: ['Calcule.'],
					expressions: ['21*&1'],
					variables: [{ '&1': '$e[0;9]' }],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} 21 \\times \\bold{\\textcolor{${color1}}{&1}}  &= 20 \\times \\bold{\\textcolor{${color1}}{&1}} +  \\bold{\\textcolor{${color1}}{&1}} \\\\ &= [_20*&1_] + &1 \\\\ &= &sol \\end{align}$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: CE2,
				},

				{
					description: 'Utiliser la distributivité',
					subdescription: "Multiplication d'un nombre à $$1$$ chiffre par $$22$$",
					enounces: ['Calcule.'],
					expressions: ['22*&1'],
					variables: [{ '&1': '$e[0;9]' }],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} 22 \\times \\bold{\\textcolor{${color1}}{&1}}  &= 20 \\times \\bold{\\textcolor{${color1}}{&1}} + 2 \\times \\bold{\\textcolor{${color1}}{&1}} \\\\ &= [_20*&1_] + [_2*&1_] \\\\ &= &sol \\end{align}$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: CE2,
				},
				{
					description: 'Utiliser la distributivité',
					subdescription: "Multiplication d'un nombre à $$1$$ chiffre par $$19$$",
					enounces: ['Calcule.'],
					expressions: ['19*&1'],
					variables: [{ '&1': '$e[0;9]' }],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} 19 \\times \\bold{\\textcolor{${color1}}{&1}}  &= 20 \\times \\bold{\\textcolor{${color1}}{&1}} - \\bold{\\textcolor{${color1}}{&1}} \\\\ &= [_20*&1_] - &1 \\\\ &= &sol \\end{align}$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: CE2,
				},
				{
					description: 'Utiliser la distributivité',
					subdescription: "Multiplication d'un nombre à $$1$$ chiffre par $$18$$",
					enounces: ['Calcule.'],
					expressions: ['18*&1'],
					variables: [{ '&1': '$e[0;9]' }],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} 18 \\times \\bold{\\textcolor{${color1}}{&1}}  &= 20 \\times \\bold{\\textcolor{${color1}}{&1}} - 2 \\times \\bold{\\textcolor{${color1}}{&1}} \\\\ &= [_20*&1_] - [_2*&1_] \\\\ &= &sol \\end{align}$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: CE2,
				},
				{
					description: 'Utiliser la distributivité',
					subdescription: "Multiplication d'un nombre à $$2$$ chiffres par $$11$$",
					enounces: ['Calcule.'],
					expressions: ['11*&1'],
					variables: [{ '&1': '$e[13;45]' }],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} 11 \\times \\bold{\\textcolor{${color1}}{&1}}  &= 10 \\times \\bold{\\textcolor{${color1}}{&1}} + \\bold{\\textcolor{${color1}}{&1}} \\\\ &= [_10*&1_] + &1 \\\\ &= &sol \\end{align}$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: CM1,
				},
				{
					description: 'Utiliser la distributivité',
					subdescription: "Multiplication d'un nombre à $$2$$ chiffres par $$12$$",
					enounces: ['Calcule.'],
					expressions: ['12*&1'],
					variables: [{ '&1': '$l{13;14;15;23;24;25;33;34;35;45}' }],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} 12 \\times \\bold{\\textcolor{${color1}}{&1}}  &= 10 \\times \\bold{\\textcolor{${color1}}{&1}} + 2 \\times \\bold{\\textcolor{${color1}}{&1}} \\\\ &= [_10*&1_] + [_2*&1_] \\\\ &= &sol \\end{align}$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: CM1,
				},
				{
					description: 'Utiliser la distributivité',
					subdescription:
						"Multiplication d'un nombre à $$1$$ ou $$2$$ chiffres par $$21$$",
					enounces: ['Calcule.'],
					expressions: ['21*&1'],
					variables: [{ '&1': '$l{5;6;7;8;9;13;14;15;23;24;25;35;45}' }],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} 21 \\times \\bold{\\textcolor{${color1}}{&1}}  &= 20 \\times \\bold{\\textcolor{${color1}}{&1}} +  \\bold{\\textcolor{${color1}}{&1}} \\\\ &= [_20*&1_] + &1 \\\\ &= &sol \\end{align}$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: CM1,
				},
				{
					description: 'Utiliser la distributivité',
					subdescription:
						"Multiplication d'un nombre à $$1$$ ou $$2$$ chiffres par $$22$$",
					enounces: ['Calcule.'],
					expressions: ['22*&1'],
					variables: [{ '&1': '$l{5;6;7;8;9;13;14;15;23;24;25;35;45}' }],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} 22 \\times \\bold{\\textcolor{${color1}}{&1}}  &= 20 \\times \\bold{\\textcolor{${color1}}{&1}} + 2 \\times \\bold{\\textcolor{${color1}}{&1}} \\\\ &= [_20*&1_] + [_2*&1_] \\\\ &= &sol \\end{align}$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: CM1,
				},
				{
					description: 'Utiliser la distributivité',
					subdescription: "Multiplication d'un nombre à $$2$$ chiffres par $$9$$",
					enounces: ['Calcule.'],
					expressions: ['9*&1'],
					variables: [{ '&1': '$e[12;19]' }, { '&1': '$e[23;29]' }],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} 9 \\times \\bold{\\textcolor{${color1}}{&1}}  &= 10 \\times \\bold{\\textcolor{${color1}}{&1}} - \\bold{\\textcolor{${color1}}{&1}} \\\\ &= [_10*&1_] - &1 \\\\ &= &sol \\end{align}$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: CM1,
				},
				{
					description: 'Utiliser la distributivité',
					subdescription:
						"Multiplication d'un nombre à $$1$$ ou $$2$$ chiffres par $$19$$",
					enounces: ['Calcule.'],
					expressions: ['19*&1'],
					variables: [{ '&1': '$e[13;19]' }, { '&1': '$e[5;9]' }],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} 19 \\times \\bold{\\textcolor{${color1}}{&1}}  &= 20 \\times \\bold{\\textcolor{${color1}}{&1}} - \\bold{\\textcolor{${color1}}{&1}} \\\\ &= [_20*&1_] - &1 \\\\ &= &sol \\end{align}$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: CM1,
				},
				{
					description: 'Utiliser la distributivité',
					subdescription:
						"Multiplication d'un nombre à $$1$$ ou $$2$$ chiffres par $$18$$",
					enounces: ['Calcule.'],
					expressions: ['18*&1'],
					variables: [{ '&1': '$e[4;9]' }, { '&1': '$l{13;14;15;25}' }],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} 18 \\times \\bold{\\textcolor{${color1}}{&1}}  &= 20 \\times \\bold{\\textcolor{${color1}}{&1}} - 2 \\times \\bold{\\textcolor{${color1}}{&1}} \\\\ &= [_20*&1_] - [_2*&1_] \\\\ &= &sol \\end{align}$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: CM1,
				},
				{
					description: 'Utiliser la distributivité',
					subdescription: 'Multiplication par $$101$$',
					enounces: ['Calcule.'],
					expressions: ['101*&1'],
					variables: [{ '&1': '$e[15;40]' }],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} 101 \\times \\bold{\\textcolor{${color1}}{&1}}  &= 100 \\times \\bold{\\textcolor{${color1}}{&1}} + \\bold{\\textcolor{${color1}}{&1}} \\\\ &= [_100*&1_] + &1 \\\\ &= &sol \\end{align}$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: CM2,
				},
				{
					description: 'Utiliser la distributivité',
					subdescription: 'Multiplication par $$102$$',
					enounces: ['Calcule.'],
					expressions: ['102*&1'],
					variables: [{ '&1': '$e[15;49]' }],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} 102 \\times \\bold{\\textcolor{${color1}}{&1}}  &= 100 \\times \\bold{\\textcolor{${color1}}{&1}} + 2 \\times \\bold{\\textcolor{${color1}}{&1}} \\\\ &= [_100*&1_] + [_2*&1_] \\\\ &= &sol \\end{align}$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: CM2,
				},
				{
					description: 'Utiliser la distributivité',
					subdescription: 'Multiplication par $$99$$',
					enounces: ['Calcule.'],
					expressions: ['99*&1'],
					variables: [{ '&1': '$e[15;40]' }],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} 99 \\times \\bold{\\textcolor{${color1}}{&1}}  &= 100 \\times \\bold{\\textcolor{${color1}}{&1}} - \\bold{\\textcolor{${color1}}{&1}} \\\\ &= [_100*&1_] - &1 \\\\ &= &sol \\end{align}$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: CM2,
				},

				{
					description: 'Utiliser la distributivité',
					enounces: ['Calcule.'],
					subdescription: 'Multiplication par $$98$$',
					expressions: ['98*&1'],
					variables: [{ '&1': '$e[15;40]' }],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} 98 \\times \\bold{\\textcolor{${color1}}{&1}}  &= 100 \\times \\bold{\\textcolor{${color1}}{&1}} - 2 \\times \\bold{\\textcolor{${color1}}{&1}} \\\\ &= [_100*&1_] - [_2*&1_] \\\\ &= &sol \\end{align}$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: CM2,
				},
				{
					description: 'Utiliser la distributivité',
					subdescription: '$$99$$ fois plus $$1$$ fois',
					enounces: ['Calcule.'],
					expressions: ['99*&1+&1', '&1+99*&1', '&1*99+&1', '&1+&1*99'],
					variables: [{ '&1': '$e[50;85]' }],
					correctionDetails: [
						[
							{
								text: `$$&exp = 100 \\times &1=$$ &solution`,
							},
						],
					],

					defaultDelay: 20,
					grade: SIXIEME,
				},
				{
					description: 'Utiliser la distributivité',
					subdescription: 'Factorisation pour un facteur $$10$$',
					enounces: ['Calcule.'],
					expressions: [
						'&2*&1+[_10-&2_]*&1',
						'&1*&2+[_10-&2_]*&1',
						'&2*&1+&1*[_10-&2_]',
						'&1*&2+&1*[_10-&2_]',
					],
					variables: [{ '&1': '$e[23;99]', '&2': '$e[2;8]' }],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} &2 \\times \\bold{\\textcolor{${color1}}{&1}} + [_10-&2_] \\times \\bold{\\textcolor{${color1}}{&1}} &=  10 \\times \\bold{\\textcolor{${color1}}{&1}}\\\\  &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&1}} \\times &2 + [_10-&2_] \\times \\bold{\\textcolor{${color1}}{&1}} &=  10 \\times \\bold{\\textcolor{${color1}}{&1}}\\\\  &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} &2 \\times \\bold{\\textcolor{${color1}}{&1}} + \\bold{\\textcolor{${color1}}{&1}} \\times [_10-&2_] &=  10 \\times \\bold{\\textcolor{${color1}}{&1}}\\\\  &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align}  \\bold{\\textcolor{${color1}}{&1}} \\times &2+ \\bold{\\textcolor{${color1}}{&1}} \\times [_10-&2_] &=  10 \\times \\bold{\\textcolor{${color1}}{&1}}\\\\  &= &sol \\end{align}$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: SIXIEME,
				},
				{
					description: 'Utiliser la distributivité',
					subdescription: 'Factorisation pour un facteur $$100$$',
					enounces: ['Calcule.'],
					expressions: [
						'&2*&1+[_100-&2_]*&1',
						'&1*&2+[_100-&2_]*&1',
						'&2*&1+&1*[_100-&2_]',
						'&1*&2+&1*[_100-&2_]',
					],
					variables: [{ '&1': '$e[21;99]', '&2': '$e[2;98]' }],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} &2 \\times \\bold{\\textcolor{${color1}}{&1}} + [_100-&2_] \\times \\bold{\\textcolor{${color1}}{&1}} &=  100 \\times \\bold{\\textcolor{${color1}}{&1}}\\\\  &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&1}} \\times &2 + [_100-&2_] \\times \\bold{\\textcolor{${color1}}{&1}} &=  100 \\times \\bold{\\textcolor{${color1}}{&1}}\\\\  &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} &2 \\times \\bold{\\textcolor{${color1}}{&1}} + \\bold{\\textcolor{${color1}}{&1}} \\times [_100-&2_] &=  100 \\times \\bold{\\textcolor{${color1}}{&1}}\\\\  &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align}  \\bold{\\textcolor{${color1}}{&1}} \\times &2+ \\bold{\\textcolor{${color1}}{&1}} \\times [_100-&2_] &=  100 \\times \\bold{\\textcolor{${color1}}{&1}}\\\\  &= &sol \\end{align}$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: SIXIEME,
				},
			],
			Décomposition: [
				{
					description: 'Décomposer un entier en produit',
					subdescription: 'Produit de deux nombres entiers',
					enounces: [
						"Décompose ce nombre en un produit de $$2$$ facteurs ($$1$$ n'est pas un facteur autorisé).",
					],
					expressions: [
						'[_&1*&2_]',
						'[_&1*4_]',
						'[_&1*8_]',
						'[_&1*6_]',
						'[_&1*9_]',
						'32',
						'36',
						'48',
						'54',
						'64',
						'72',
						'81',
					],
					variables: [
						{ '&1': '$l{2;3;5;7}', '&2': '$l{2;3;5;7}' },
						{ '&1': '$l{2;3;5;7}' },
						{ '&1': '$l{2;3;5;7}' },
						{ '&1': '$l{2;3;5;7}' },
						{ '&1': '$l{2;3;5;7}' },
						{},
						{},
						{},
						{},
						{},
						{},
						{},
					],
					solutions: [
						['&1*&2'],
						['2*[_2*&1_]', '4*&1'],
						['2*[_4*&1_]', '4*[_2*&1_]', '8*&1'],
						['2*[_3*&1_]', '3*[_2*&1_]', '6*&1'],
						['3*[_3*&1_]', '9*&1'],
						['2*16', '4*8'],
						['2*18', '4*9', '6*6'],
						['2*24', '3*16', '4*12', '6*8'],
						['2*27', '3*18', '6*9'],
						['2*32', '4*16', '8*8'],
						['2*36', '3*24', '4*18', '6*12', '8*9'],
						['3*27', '9*9'],
					],
					options: ['multiples'],
					format: '$e[2;9]*$e[2;9]',
					defaultDelay: 20,
					grade: CM1,
				},
			],
		},
		Diviser: {
			Quotient: [
				{
					description: 'Calculer un quotient entier',
					subdescription: 'Quotients associés aux tables de multiplication',
					enounces: ['Calcule.'],
					expressions: ['[_&1*&2_]:&2'],
					variables: [{ '&1': '$e[2;9]', '&2': '$e[2;9]' }],

					defaultDelay: 20,
					grade: CE2,
				},
				{
					description: 'Calculer un quotient entier',
					subdescription: 'Le dividende est un nombre de dizaines (simple)',
					enounces: ['Calcule.'],
					expressions: ['[_&1*&2*10_]:&2'],
					variables: [{ '&1': '$e[3;6]', '&2': '$e[3;5]' }],

					defaultDelay: 20,
					grade: CM1,
				},
				{
					description: 'Calculer un quotient entier',
					subdescription: 'Le dividende est un nombre de dizaines',
					enounces: ['Calcule.'],
					expressions: ['[_&1*&2*10_]:&2'],
					variables: [{ '&1': '$e[3;9]', '&2': '$e[3;9]' }],

					defaultDelay: 20,
					grade: CM1,
				},
			],
			'A trou': [
				{
					description: 'Compléter une division à trou ',
					subdescription: 'Trouver le dividende',
					enounces: ['Complète.'],
					expressions: ['?:&2=&1'],
					variables: [{ '&1': '$e[2;9]', '&2': '$e[2;9]' }],
					solutions: [['[_&1*&2_]']],
					type: 'fill in',
					defaultDelay: 20,
					grade: CE2,
				},
				{
					description: 'Compléter une division à trou ',
					subdescription: 'Trouver le diviseur',
					enounces: ['Complète.'],
					expressions: ['[_&1*&2_]:?=&1'],
					variables: [{ '&1': '$e[2;9]', '&2': '$e[2;9]' }],
					solutions: [['&2']],
					type: 'fill in',
					defaultDelay: 20,
					grade: CE2,
				},
			],
			Divisibilité: [
				{
					description: 'Trouver un diviseur',
					subdescription: 'Une décomposition est donnée',
					enounces: [
						'Trouve un diviseur de $$[_&1*&2_]$$ (autre que $$1$$ et $$[_&1*&2_]$$), sachant que :',
					],
					variables: [{ '&1': '$e[2;9]', '&2': '$e[2;9]\\{&1}' }],
					expressions: ['[_&1*&2_]=&1*&2'],
					answerFields: ['$$...$$'],
					testAnswers: [
						['&answer!=1 && &answer!=&1*&2 && mod(&1*&2; &answer)=0'],
					],
					correctionFormat: [
						{
							correct: ['&answer est un diviseur de $$[_&1*&2_]$$'],
							uncorrect: [
								'<span style="color:green;">$$&1$$</span> et <span style="color:green;">$$&2$$</span> sont des diviseurs de $$[_&1*&2_]$$',
							],
						},
					],
					defaultDelay: 15,
					grade: CE2,
				},
				{
					description: 'Trouver un diviseur',
					enounces: [
						'Trouve un diviseur de $$[_&1*&2_]$$ (autre que $$1$$ et $$[_&1*&2_]$$).',
					],
					variables: [
						{ '&1': '$l{2;4;6;8}', '&2': '$e[2;9]\\{&1;m2}' },
						{ '&1': '$l{3;5;7;9}', '&2': '$e[2;9]\\{&1;m2}' },
					],
					testAnswers: [
						['&answer!=1 && &answer!=&1*&2 && mod(&1*&2; &answer)=0'],
					],
					solutions: [['&1']],
					correctionFormat: [
						{
							correct: ['&answer est un diviseur de $$[_&1*&2_]$$'],
						},
					],
					correctionDetails: [
						[
							{
								text: '&solution est un diviseur de $$[_&1*&2_]$$ car $$[_&1*&2_]=&1 \\times &2$$',
							},
						],
					],

					defaultDelay: 15,
					grade: CE2,
				},
				{
					description: 'Utiliser un critère de divisibilité',
					subdescription: 'Par $$2$$',
					enounces: ['Le nombre $$[_&1_]$$ est-il divisible par $$2$$ ?'],
					variables: [{ '&1': '2*$e{3}' }, { '&1': '2*$e{3}+1' }],

					choices: [[{ text: 'Oui' }, { text: 'Non' }]],
					// corrections: [
					//   'Entre $$[._&6_]$$ et $$[._&7_]$$ le plus petit est ',
					// ],
					solutions: [['mod(&1;2)=0 ?? 0 :: 1']],
					correctionDetails: [
						[
							{
								text: "\
								@@ mod(&1;2)=0 ?? &solution, $$[_&1_]$$ est divisible par $$2$$ car il se termine par $$0$$,$$2$$,$$4$$,$$6$$ ou $$8$$.@@\
								@@ mod(&1;2)!=0 ?? &solution, $$[_&1_]$$ n'est <b>pas</b> divisible par $$2$$ car il se termine par $$1$$,$$3$$,$$5$$,$$7$$ ou $$9$$.@@",
							},
						],
					],
					options: ['no-shuffle-choices'],
					defaultDelay: 10,
					grade: CM1,
				},
				{
					description: 'Utiliser un critère de divisibilité',
					subdescription: 'Par $$5$$',
					enounces: ['Le nombre $$[_&1_]$$ est-il divisible par $$5$$ ?'],
					variables: [{ '&1': '5*$e{3}' }, { '&1': '5*$e{5}+$e[1;4]' }],

					choices: [[{ text: 'Oui' }, { text: 'Non' }]],
					// corrections: [
					//   'Entre $$[._&6_]$$ et $$[._&7_]$$ le plus petit est ',
					// ],
					solutions: [['mod(&1;5)=0 ?? 0 :: 1']],
					correctionDetails: [
						[
							{
								text: "\
								@@ mod(&1;5)=0 ?? &solution, $$[_&1_]$$ est divisible par $$5$$ car il se termine par $$0$$ ou $$5$$.@@\
								@@ mod(&1;5)!=0 ?? &solution, $$[_&1_]$$ n'est <b>pas</b> divisible par $$5$$ car il ne se termine pas par $$0$$ ou $$5$$.@@",
							},
						],
					],
					options: ['no-shuffle-choices'],
					defaultDelay: 10,
					grade: CM1,
				},
				{
					description: 'Utiliser un critère de divisibilité',
					subdescription: 'Par $$10$$',
					enounces: ['Le nombre $$[_&1_]$$ est-il divisible par $$10$$ ?'],
					variables: [{ '&1': '10*$e{3}' }, { '&1': '10*$e{5}+$e[1;9]' }],

					choices: [[{ text: 'Oui' }, { text: 'Non' }]],
					// corrections: [
					//   'Entre $$[._&6_]$$ et $$[._&7_]$$ le plus petit est ',
					// ],
					solutions: [['mod(&1;10)=0 ?? 0 :: 1']],
					correctionDetails: [
						[
							{
								text: "\
								@@ mod(&1;10)=0 ?? &solution, $$[_&1_]$$ est divisible par $$10$ car il se termine par $$0$$.@@\
								@@ mod(&1;10)!=0 ?? &solution, $$[_&1_]$$ n'est <b>pas</b> divisible par $$10$$ car il ne se termine <b>pas</b> par $$0$$.@@",
							},
						],
					],
					options: ['no-shuffle-choices'],
					defaultDelay: 30,
					grade: CM1,
				},
				{
					description: 'Utiliser un critère de divisibilité',
					subdescription: 'Par $$3$$',
					enounces: ['Le nombre $$&1&2&5$$ est-il divisible par $$3$$ ?'],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]',
							'&3': '$e[1;6]',
							'&4': '&3+3-mod(&1+&2+&3;3)',
							'&5': '[_&4_]',
						},
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]',
							'&3': '$e[1;5]',
							'&4': '&3+4-mod(&1+&2+&3;3)',
							'&5': '[_&4_]',
						},
					],

					choices: [[{ text: 'Oui' }, { text: 'Non' }]],

					correctionDetails: [
						[
							{
								text: '$$&1&2&5$$ est divisible par $$3$$ car la somme de ses chiffres est divisible par $$3$$ :',
							},
							{
								text: '$$&1+&2+&5=[_&1+&2+&5_]$$ est divisible par $$3$$.',
							},
						],
						[
							{
								text: "$$&1&2&5$$ n'est pas divisible par $$3$$ car la somme de ses chiffres n'est pas divisible par $$3$$ :",
							},
							{
								text: "$$&1+&2+&5=[_&1+&2+&5_]$$ n'est pas divisible par $$3$$.",
							},
						],
					],
					solutions: [[0], [1]],
					options: ['no-shuffle-choices'],
					defaultDelay: 15,
					grade: CM2,
				},
				{
					description: 'Utiliser un critère de divisibilité',
					subdescription: 'Par $$9$$',
					enounces: ['Le nombre $$&1&2&5$$ est-il divisible par $$9$$ ?'],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]',
							'&3': '0',
							'&4': '&3+9-mod(&1+&2+&3;9)',
							'&5': '[_&4_]',
						},
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]',
							'&3': '$e[0;1]',
							'&4': '&3+8-mod(&1+&2+&3;9)',
							'&5': '[_&4_]',
						},
					],

					choices: [[{ text: 'Oui' }, { text: 'Non' }]],

					correctionDetails: [
						[
							{
								text: '$$&1&2&5$$ est divisible par $$9$$ car la somme de ses chiffres est divisible par $$9$$ :',
							},
							{
								text: '$$&1+&2+&5=[_&1+&2+&5_]$$ est divisible par $$9$$.',
							},
						],
						[
							{
								text: "$$&1&2&5$$ n'est pas divisible par $$9$$ car la somme de ses chiffres n'est pas divisible par $$9$$ :",
							},
							{
								text: "$$&1+&2+&5=[_&1+&2+&5_]$$ n'est pas divisible par $$9$$.",
							},
						],
					],
					solutions: [[0], [1]],
					options: ['no-shuffle-choices'],
					defaultDelay: 15,
					grade: CM2,
				},
				{
					description: 'Trouver un diviseur',
					subdescription: 'Nombre à $$3$$ chiffres.',
					enounces: [
						'Trouve un diviseur de $$&4$$ (autre que $$1$$ et $$&4$$).',
					],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]',
							'&3': '$l{2;4;6;8}',
							'&4': '[_&1*100+&2*10+&3_]',
						},
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]',
							'&3': '$l{5;0}',
							'&4': '[_&1*100+&2*10+&3_]',
						},
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]',
							'&3': '$l{1;4;7}+2-mod(&1+&2;3)',
							'&4': '[_&1*100+&2*10+&3_]',
						},
					],
					testAnswers: [['&answer!=1 && &answer!=&4 && mod(&4; &answer)=0']],
					solutions: [['2'], ['5'], ['3']],
					correctionFormat: [
						{
							correct: ['&answer est un diviseur de $$[_&4_]$$'],
						},
					],
					correctionDetails: [
						[
							{
								text: '&solution est un diviseur de $$[_&4_]$$ car $$&4$$ se termine par $$0$$, $$2$$, $$4$$, $$6$$ ou $$8$$.',
							},
						],
						[
							{
								text: '&solution est un diviseur de $$[_&4_]$$ car $$&4$$ se termine par $$0$$ ou $$5$$.',
							},
						],
						[
							{
								text: '&solution est un diviseur de $$[_&4_]$$ car $$&1+&2+[_&3_]=[_&1+&2+&3_]$$ est un multiple de $$3$$.',
							},
						],
					],

					defaultDelay: 15,
					grade: CM2,
				},
			],
			'Division euclidienne': [
				{
					description:
						'Reconnaître un quotient et un reste dans une division euclidienne ',
					enounces: [
						"En regardant l'égalité ci-dessous, quel est le <b>quotient</b> de la division euclidienne de $$[_&1*&2+&3_]$$ par $$&1$$ ?",
						"En regardant l'égalité ci-dessous, quel est le <b>reste</b> de la division euclidienne de $$[_&1*&2+&3_]$$ par $$&1$$ ?",
					],
					expressions: ['$$[_&1*&2+&3_]=(&1 \\times &2)+&3$$'],
					answerFields:['$$...$$'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;10]\\{&1}',
							'&3': '$e[1;&1-1]\\{&2}',
						},
					],
					solutions: [['&2'], ['&3']],
					correctionFormat: [
						{
							correct: ['Le quotient est &answer.'],
						},
						{
							correct: ['Le reste est &answer.'],
						},
					],
					correctionDetails: [
						[
							{
								text: `Le quotient est &solution car $$[_&1*&2+&3_]=(&1 \\times &sol) + &3$$`,
							},
						],
						[
							{
								text: `Le reste est &solution car $$[_&1*&2+&3_]=(&1 \\times &2) + &sol$$ et $$&3 \\le &1$$`,
							},
						],
					],
					defaultDelay: 30,
					grade: CE2,
				},
				{
					description: 'Est-ce bien un reste de division eudlienne ? ',
					enounces: [
						"En regardant l'égalité ci-dessous, peut-on dire que $$&3$$ est le reste de la division euclidienne de $$[_&1*&2+&3_]$$ par $$&1$$ ?",
						"En regardant l'égalité ci-dessous, peut-on dire que $$[_&3+&1_]$$ est le reste de la division euclidienne de $$[_&1*&2+&3_]$$ par $$&1$$ ?",
					],
					variables: [
						{
							'&1': '$e[3;9]',
							'&2': '$e[2;10]\\{&1}',
							'&3': '$e[1;&1-1]\\{&2}',
						},
					],
					expressions: [
						'[_&1*&2+&3_]=(&1* &2) + &3',
						'[_&1*&2+&3_]=(&1* [_&2-1_]) + [_&3+&1_]',
					],
					solutions: [[0], [1]],
					choices: [[{ text: 'oui' }, { text: 'non' }]],
					correctionDetails: [
						[
							{
								text: "&solution, $$&3$$ est le reste de la division euclidienne de $$[_&1*&2+&3_]$$ par $$&1$$, car dans l'égalité $$[_&1*&2+&3_]=(&1 \\times &2) + &3$$, on a bien $$&3<&1$$.",
							},
						],
						[
							{
								text: "&solution, $$[_&3+&1_]$$ n'est pas le reste de la division euclidienne de $$[_&1*&2+&3_]$$ par $$&1$$, car dans l'égalité $$[_&1*&2+&3_]=(&1 \\times [_&2-1_]) + [_&3+&1_]$$, on n'a <b>pas</b>  $$[_&3+&1_]<&1$$.",
							},
						],
					],
					options: ['no-shuffle-choices'],
					defaultDelay: 30,
					grade: CE2,
				},
				{
					description: "Compléter l'égalité d'une division euclidienne",
					enounces: [
						"Complète l'égalité de la division euclidienne de $$[_&1*&2+&3_]$$ par $$&1$$ :",
					],
					variables: [
						{ '&1': '$e[2;9]', '&2': '$e[2;10]', '&3': '$e[1;&1-1]' },
					],
					expressions:['[_&1*&2+&3_]=(&1*?)+?'],
					solutions: [['&2', '&3']],
					defaultDelay: 30,
					correctionFormat: [
						{
							correct: ['$$[_&1*&2+&3_]=(&1\\times &ans1) + &ans2$$'],
						},
					],
					type:"fill in",
					options: ['no-penalty-for-extraneous-brackets'],
					grade: CE2,
				},

				{
					description: 'Effectuer une division euclidienne ',
					enounces: [
						"Ecris l'égalité correspondant à la division euclidienne de $$[_&1*&2+&3_]$$ par $$&2$$.",
					],
					variables: [
						{ '&1': '$e[2;9]', '&2': '$e[2;10]', '&3': '$e[1;&2-1]' },
					],
					expressions: ['[_&1*&2+&3_]'],
					solutions: [['(&1*&2)+&3']],
					options: ['no-penalty-for-extraneous-brackets'],
					defaultDelay: 30,
					grade: CE2,
				},
			],
		},
		'Priorités opératoires': {
			'Avec parenthèses': [
				{
					description: 'Calculer une expression avec parenthèses',
					subdescription: 'Un niveau de parenthèse',
					enounces: ['Calcule.'],
					expressions: [
						'(&1+&2)*&3',
						'&3*(&1+&2)',
						'(&1-&2)*&3',
						'&3*(&1-&2)',
						'([_&1*&3_]+[_&2*&3_]):&3',
						'([_&1*&3_]-[_&2*&3_]):&3',
						'[_(&1+&2)*&3_]:(&1+&2)',
						'[_&1+&2+&3_]-(&1+&2)',
					],
					variables: [
						{ '&1': '$e[2;9]', '&2': '$e[2;11-&1]', '&3': '$e[2;9]' },
						{ '&1': '$e[2;9]', '&2': '$e[2;11-&1]', '&3': '$e[2;9]' },
						{ '&1': '$e[4;9]', '&2': '$e[2;&1-2]', '&3': '$e[2;9]' },
						{ '&1': '$e[4;9]', '&2': '$e[2;&1-2]', '&3': '$e[2;9]' },
						{ '&1': '$e[1;9]', '&2': '$e[1;10-&1]', '&3': '$e[2;9]' },
						{ '&1': '$e[3;9]', '&2': '$e[1;&1-2]', '&3': '$e[2;9]' },
						{ '&1': '$e[1;8]', '&2': '$e[1;9-&1]', '&3': '$e[2;9]' },
						{ '&1': '$e[1;9]', '&2': '$e[1;9]', '&3': '$e[1;9]' },
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \\left( &1 \\bold{\\textcolor{${color1}}{\\large{+}}} &2 \\right) \\times &3  &=  [_&1+&2_] \\times &3 \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} &3 \\times \\left( &1 \\bold{\\textcolor{${color1}}{\\large{+}}} &2 \\right) &=  &3 \\times [_&1+&2_] \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\left( &1 \\bold{\\textcolor{${color1}}{\\large{-}}} &2 \\right) \\times &3  &=  [_&1-&2_] \\times &3 \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} &3 \\times \\left( &1 \\bold{\\textcolor{${color1}}{\\large{-}}} &2 \\right) &=  &3 \\times [_&1-&2_] \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\left( [_&1*&3_] \\bold{\\textcolor{${color1}}{\\large{+}}} [_&2*&3_] \\right) \\div &3  &=  [_(&1+&2)*&3_] \\div &3 \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\left( [_&1*&3_] \\bold{\\textcolor{${color1}}{\\large{-}}} [_&2*&3_] \\right) \\div &3  &=  [_(&1-&2)*&3_] \\div &3 \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align}  [_(&1+&2)*&3_] \\div \\left( &1 \\bold{\\textcolor{${color1}}{\\large{+}}} &2 \\right) &= [_(&1+&2)*&3_] \\div [_&1+&2_]   \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} [_&1+&2+&3_] - \\left( &1\\bold{\\textcolor{${color1}}{\\large{+}}} &2 \\right)  &= [_&1+&2+&3_] - [_&1+&2_] \\\\ &= &sol \\end{align}$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: SIXIEME,
				},
				{
					description: 'Calculer une expression avec parenthèses',
					subdescription: '$$2$$ expressions parenthèsées (imbriquées ou non)',
					enounces: ['Calcule.'],
					expressions: [
						'(&1+&2)*(&3+&4)',
						'(&1-&2)*(&3+&4)',
						'&4*(([_&1*&3_]+[_&2*&3_]):&3)',
					],
					variables: [
						{
							'&1': '$e[2;7]',
							'&2': '$e[2;9-&1]',
							'&3': '$e[2;7]',
							'&4': '$e[2;9-&3]',
						},
						{
							'&1': '$e[4;9]',
							'&2': '$e[2;&1-2]',
							'&3': '$e[2;7]',
							'&4': '$e[2;9-&3]',
						},
						{
							'&1': '$e[2;7]',
							'&2': '$e[2;9-&1]',
							'&3': '$e[2;9]',
							'&4': '$e[2;9]',
						},
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \\left( &1 \\bold{\\textcolor{${color1}}{\\large{+}}} &2 \\right) \\times \\left( &3 \\bold{\\textcolor{${color1}}{\\large{+}}} &4 \\right) &=  [_&1+&2_] \\times [_&3+&4_] \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\left( &1 \\bold{\\textcolor{${color1}}{\\large{-}}} &2 \\right) \\times \\left( &3 \\bold{\\textcolor{${color1}}{\\large{+}}} &4 \\right) &=  [_&1-&2_] \\times [_&3+&4_] \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align}   &4 \\times \\left( \\left([_&1*&3_] \\bold{\\textcolor{${color1}}{\\large{+}}} [_&2*&3_] \\right) \\div &3 \\right)  &= &4 \\times \\left( [_&1*&3+&2*&3_] \\bold{\\textcolor{${color1}}{\\large{\\div}}} &3 \\right)   \\\\ &=  &4 \\times [_&1+&2_]  \\\\ &= &sol \\end{align}$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: SIXIEME,
				},
			],
			'Sans parenthèses': [
				{
					description: 'Calculer une expression sans parenthèses',
					subdescription:
						"Priorité de la multiplication et de la division sur l'addition et la soustraction",
					enounces: ['Calcule.'],
					expressions: [
						'&1+&2*&3',
						'&2*&3+&1',
						'[_&1*&2+&3_]-&1*&2',
						'[_&2+&4_]-[_&2*&3_]:&3',
						'&1+[_&2*&3_]:&3',
						'[_&2*&3_]:&3+&1',
					],
					variables: [
						{ '&1': '$e[2;9]', '&2': '$e[2;9]', '&3': '$e[2;9]' },
						{ '&1': '$e[2;9]', '&2': '$e[2;9]', '&3': '$e[2;9]' },
						{ '&1': '$e[2;9]', '&2': '$e[2;9]', '&3': '$e[2;9]' },
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
							'&3': '$e[2;9]',
							'&4': '$e[2;9]',
						},
						{ '&1': '$e[2;9]', '&2': '$e[2;9]', '&3': '$e[2;9]' },
						{ '&1': '$e[2;9]', '&2': '$e[2;9]', '&3': '$e[2;9]' },
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align}  &1 +  &2 \\bold{\\textcolor{${color1}}{\\large{\\times}}} &3 &=  &1 +  [_&2*&3_] \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align}  &2 \\bold{\\textcolor{${color1}}{\\large{\\times}}} &3 + &1 &=   [_&2*&3_] + &1 \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align}  [_&1*&2+&3_] - &1 \\bold{\\textcolor{${color1}}{\\large{\\times}}} &2 &=  [_&1*&2+&3_] - [_&1*&2_] \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align}  [_&2+&4_] - [_&2*&3_] \\bold{\\textcolor{${color1}}{\\large{\\div}}} &3 &=  [_&2+&4_] - &2 \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align}  &1+ [_&2*&3_] \\bold{\\textcolor{${color1}}{\\large{\\div}}} &3 &=  &1 + &2 \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align}   [_&2*&3_] \\bold{\\textcolor{${color1}}{\\large{\\div}}} &3 + &1 &=  &2 + &1 \\\\ &= &sol \\end{align}$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: CINQUIEME,
				},
				{
					description: 'Calculer une expression sans parenthèses',
					subdescription: 'Même priorité',
					enounces: ['Calcule.'],
					expressions: ['[_&1*&2_]:&1*&3', '&3-&1+&2'],
					variables: [
						{ '&1': '$e[2;9]', '&2': '$e[2;9]', '&3': '$e[2;9]' },
						{ '&1': '$e[2;8]', '&2': '$e[2;9]', '&3': '$e[&1+1;9]' },
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align}  [_&1*&2_] \\bold{\\textcolor{${color1}}{\\large{\\div}}} &1 \\times &3 &=  &2 \\times &3\\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align}  &3 \\bold{\\textcolor{${color1}}{\\large{-}}} &1 + &2  &=  [_&3-&1_] + &2 \\\\ &= &sol \\end{align}$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: CINQUIEME,
				},
				{
					description: 'Calculer une expression sans parenthèses',
					subdescription: 'Cas général',
					enounces: ['Calcule.'],
					expressions: [
						'&1*&2+&3*&4',
						'&1*&2+[_&3*&4_]:&4',
						'[_&3*&4_]:&4+&1*&2',
						'[_&3*&4_]:&4+[_&1*&2_]:&2',
						'[_&1+1_]*[_&2+1_]-&1*&2',
					],
					variables: [
						{
							'&1': '$e[2;5]',
							'&2': '$e[2;9]',
							'&3': '$e[2;9]',
							'&4': '$e[2;9]',
						},
						{
							'&1': '$e[2;5]',
							'&2': '$e[2;9]',
							'&3': '$e[2;9]',
							'&4': '$e[2;9]',
						},
						{
							'&1': '$e[2;5]',
							'&2': '$e[2;9]',
							'&3': '$e[2;9]',
							'&4': '$e[2;9]',
						},
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
							'&3': '$e[2;9]',
							'&4': '$e[2;9]',
						},
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
							'&3': '$e[2;9]',
							'&4': '$e[2;9]',
						},
						// { '&1': '$e[2;8]', '&2': '$e[2;8]', },
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align}  &1 \\bold{\\textcolor{${color1}}{\\large{\\times}}} &2 + &3 \\bold{\\textcolor{${color1}}{\\large{\\times}}} &4 &=  [_&1*&2_] + [_&3*&4_] \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align}  &1 \\bold{\\textcolor{${color1}}{\\large{\\times}}} &2 + [_&3*&4_] \\bold{\\textcolor{${color1}}{\\large{\\div}}} &4 &= [_&1*&2_]+&3\\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align}  [_&3*&4_] \\bold{\\textcolor{${color1}}{\\large{\\div}}} &4 + &1 \\bold{\\textcolor{${color1}}{\\large{\\times}}} &2 &= &3+[_&1*&2_] \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align}  [_&3*&4_] \\bold{\\textcolor{${color1}}{\\large{\\div}}} &4 + [_&1*&2_]\\bold{\\textcolor{${color1}}{\\large{\\div}}} &2 &= &3+&1 \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align}  [_&1+1_] \\bold{\\textcolor{${color1}}{\\large{\\times}}} [_&2+1_] - &1 \\bold{\\textcolor{${color1}}{\\large{\\times}}} &2 &= [_(&1+1)*(&2+1)_]-[_&1*&2_] \\\\ &= &sol \\end{align}$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: CINQUIEME,
				},
			],
		},
		Vocabulaire: {
			Traduire: [
				{
					description: 'Traduire une phrase en expression mathématique',
					enounces: [
						'Traduis cette phrase par une expression mathématique : la somme de $$&1$$ et de $$&2$$',
						'Traduis cette phrase par une expression mathématique : le produit de $$&1$$ par $$&2$$',
						'Traduis cette phrase par une expression mathématique : la différence entre $$&1$$ et $$&2$$',
						'Traduis cette phrase par une expression mathématique : le quotient de $$&1$$ par $$&2$$',
					],
					variables: [
						{
							'&1': '$e[3;9]',
							'&2': '$e[2;&1-1]\\{&1}',
						},
					],
					solutions: [['&1+&2'], ['&1*&2'], ['&1-&2'], ['&1/&2']],
					// solutions: [['&1+&2'], ['&1*&2'], ['&1-&2'], ['&1:&2 ;; &1/&2']],
					correctionFormat: [
						{
							correct: ["L'expression est &answer."],
						},
					],

					type: 'enonce',
					defaultDelay: 20,
					grade: SIXIEME,
				},
				{
					description: 'Traduire une phrase en expression mathématique',
					enounces: [
						'Traduis cette phrase par une expression mathématique : la somme du produit de $$&1$$ par $$&3$$ et de $$&2$$',
						'Traduis cette phrase par une expression mathématique : le produit de $$&1$$ par la différence  entre $$&2$$ et $$&3$$',
						'Traduis cette phrase par une expression mathématique : la différence entre $$&1$$ et le quotient de $$&2$$ par $$&3$$',
						'Traduis cette phrase par une expression mathématique : le quotient de la somme $$&1$$ et de $$&3$$ par $$&2$$',
					],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]\\{&1}',
							'&3': '$e[2;&2-1]\\{&1}',
						},
					],
					solutions: [
						['&1*&3+&2'],
						['&1*(&2-&3)'],
						['&1-&2:&3'],
						['(&1+&3):&2'],
					],
					correctionFormat: [
						{
							correct: ["L'expression est &answer."],
						},
					],
					options: ['no-penalty-for-explicit-products '],
					type: 'enonce',
					defaultDelay: 20,
					grade: CINQUIEME,
				},
			],
		},
	},
	Décimaux: {
		Apprivoiser: {
			Ecriture: [
				{
					description: 'Connaître la position décimale',
					subdescription: "Des unités jusqu'aux centièmes",
					enounces: [
						'Quel est le chiffre des <b>centièmes</b> dans le nombre $$&4$$ ?',
						'Quel est le chiffre des <b>dizièmes</b> dans le nombre $$&4$$ ?',
						'Quel est le chiffre des <b>unités</b> dans le nombre $$&4$$ ?',
					],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$e[0;9]\\{&1}',
							'&3': '$e[0;9]\\{&1;&2}',
							'&4': '[._&1*0,01+&2*0,1+&3_]',
						},
					],
					solutions: [['&1'], ['&2'], ['&3']],
					correctionFormat: [
						{
							correct: [
								'Le chiffre des centièmes est &answer.',
							],
						},
						{
							correct: [
								'Le chiffre des dizièmes est &answer.',
							],
						},
						{
							correct: ['Le chiffre des unités est &answer.'],
						},
					],
					options:['require-no-extraneaous-zeros'],
					defaultDelay: 10,
					grade: CM1,
				},
				{
					description: 'Connaître la position décimale',
					subdescription: "Des centaines jusqu'aux centièmes",
					enounces: [
						'Quel est le chiffre des <b>centièmes</b> dans le nombre $$&6$$ ?',
						'Quel est le chiffre des <b>dizièmes</b> dans le nombre $$&6$$ ?',
						'Quel est le chiffre des <b>unités</b> dans le nombre $$&6$$ ?',
						'Quel est le chiffre des <b>dizaines</b> dans le nombre $$&6$$ ?',
						'Quel est le chiffre des <b>centaines</b> dans le nombre $$&6$$ ?',
					],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$e[0;9]\\{&1}',
							'&3': '$e[0;9]\\{&1;&2}',
							'&4': '$e[0;9]\\{&1;&2;&3}',
							'&5': '$e[0;9]\\{&1;&2;&3;&4}',
							'&6': '[._&1*0,01+&2*0,1+&3+&4*10+&5*100_]',
						},
					],
					solutions: [['&1'], ['&2'], ['&3'], ['&4'], ['&5']],
					correctionFormat: [
						{
							correct: [
								'Le chiffre des centièmes est &answer.',
							],
						},
						{
							correct: [
								'Le chiffre des dizièmes est &answer.',
							],
						},
						{
							correct: ['Le chiffre des unités est &answer.'],
						},
						{
							correct: [
								'Le chiffre des dizaines est &answer.',
							],
						},
						{
							correct: [
								'Le chiffre des centaines est &answer.',
							],
						},
					],
					options:['require-no-extraneaous-zeros'],
					defaultDelay: 10,
					grade: CM1,
				},
				{
					description: "Définition à l'aide de fractions décimales",
					subdescription: "Jusqu'au centièmes",
					enounces: [
						"Réécris sous la forme d'un nombre décimal.",
					],
					variables: [
						{
							'&1': '$e{1;1}',
							'&2': '$e{1;1}',
							'&3': '$e{1;1}',
						},
						{
							'&1': '$e{1;1}',
							'&2': '0',
							'&3': '$e{1;1}',
						},
						{
							'&1': '$e{1;1}',
							'&2': '$e{1;1}',
							'&3': '0',
						},
					],
					expressions: ['&1+&2/10+&3/100'],
					options: ['remove-null-terms'],
					'result-type': 'decimal',
					defaultDelay: 15,
					grade: CM1,
				},
				{
					description: "Définition à l'aide de fractions décimales",
					subdescription: "Jusqu'au centièmes (mélangée)",
					enounces: [
						"Réécris sous la forme d'un nombre décimal.",
					],
					variables: [
						{
							'&1': '$e{1;1}',
							'&2': '$e{1;1}',
							'&3': '$e{1;1}',
						},
						{
							'&1': '$e{1;1}',
							'&2': '0',
							'&3': '$e{1;1}',
						},
						{
							'&1': '$e{1;1}',
							'&2': '$e{1;1}',
							'&3': '0',
						},
					],
					expressions: ['&1+&2/10+&3/100'],
					options: ['remove-null-terms', 'shuffle-terms'],

					'result-type': 'decimal',
					defaultDelay: 15,
					grade: CM1,
				},
				{
					description: "Définition à l'aide de fractions décimales (2)",
					subdescription: "Jusqu'aux centièmes",
					enounces: [
						"Réécris sous la forme d'un nombre décimal.",
					],
					variables: [
						{
							'&1': '$e{1;1}',
							'&2': '$e[1;2]',
							'&3': '$e{&2;&2}',
							'&4': '&1+&3/100',
						},
					],
					expressions: ['&4'],
					'result-type': 'decimal',
					defaultDelay: 10,
					grade: CM1,
				},
				{
					description: 'Connaître la position décimale',
					subdescription: "Des unités jusqu'aux millièmes",
					enounces: [
						'Quel est le chiffre des <b>millièmes</b> dans le nombre $$&5$$ ?',
						'Quel est le chiffre des <b>centièmes</b> dans le nombre $$&5$$ ?',
						'Quel est le chiffre des <b>dizièmes</b> dans le nombre $$&5$$ ?',
						'Quel est le chiffre des <b>unités</b> dans le nombre $$&5$$ ?',
					],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$e[0;9]\\{&1}',
							'&3': '$e[0;9]\\{&1;&2}',
							'&4': '$e[0;9]\\{&1;&2;&3}',
							'&5': '[._&1*0,001+&2*0,01+&3*0,1+&4_]',
						},
					],
					solutions: [['&1'], ['&2'], ['&3'], ['&4']],
					correctionFormat: [
						{
							correct: [
								'Le chiffre des millièmes est &answer.',
							],
						},
						{
							correct: [
								'Le chiffre des centièmes est &answer.',
							],
						},
						{
							correct: [
								'Le chiffre des dizièmes est &answer.',
							],
						},
						{
							correct: ['Le chiffre des unités est &answer.'],
						},
					],
					defaultDelay: 10,
					grade: CM2,
				},
				{
					description: 'Connaître la position décimale',
					subdescription: "Des milliers jusqu'aux millièmes",
					enounces: [
						'Quel est le chiffre des <b>millièmes</b> dans le nombre $$&8$$ ?',
						'Quel est le chiffre des <b>centièmes</b> dans le nombre $$&8$$ ?',
						'Quel est le chiffre des <b>dizièmes</b> dans le nombre $$&8$$ ?',
						'Quel est le chiffre des <b>unités</b> dans le nombre $$&8$$ ?',
						'Quel est le chiffre des <b>dizaines</b> dans le nombre $$&8$$ ?',
						'Quel est le chiffre des <b>centaines</b> dans le nombre $$&8$$ ?',
						'Quel est le chiffre des <b>milliers</b> dans le nombre $$&8$$ ?',
					],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$e[0;9]\\{&1}',
							'&3': '$e[0;9]\\{&1;&2}',
							'&4': '$e[0;9]\\{&1;&2;&3}',
							'&5': '$e[0;9]\\{&1;&2;&3;&4}',
							'&6': '$e[0;9]\\{&1;&2;&3;&4;&5}',
							'&7': '$e[0;9]\\{&1;&2;&3;&4;&5;&6}',
							'&8': '[._&1*0,001+&2*0,01+&3*0,1+&4+&5*10+&6*100+&7*1000_]',
						},
					],
					solutions: [['&1'], ['&2'], ['&3'], ['&4'], ['&5'], ['&6'], ['&7']],
					correctionFormat: [
						{
							correct: [
								'Le chiffre des millièmes est &answer.',
							],
						},
						{
							correct: [
								'Le chiffre des centièmes est &answer.',
							],
						},
						{
							correct: [
								'Le chiffre des dizièmes est &answer.',
							],
						},
						{
							correct: ['Le chiffre des unités est &answer.'],
						},
						{
							correct: [
								'Le chiffre des dizaines est &answer.',
							],
						},
						{
							correct: [
								'Le chiffre des centaines est &answer.',
							],
						},
						{
							correct: [
								'Le chiffre des milliers est &answer.',
							],
						},
					],
					defaultDelay: 10,
					grade: CM2,
				},
				{
					description: "Définition à l'aide de fractions décimales",
					subdescription: "Jusqu'aux millièmes",
					enounces: [
						'Quel est le nombre décimal représenté par cette expression ?',
					],
					variables: [
						{
							'&1': '$e{1;1}',
							'&2': '$e{1;1}',
							'&3': '$e{1;1}',
							'&4': '$e{1;1}',
						},
						{
							'&1': '$e{1;1}',
							'&2': '0',
							'&3': '$e{1;1}',
							'&4': '$e{1;1}',
						},
						{
							'&1': '$e{1;1}',
							'&2': '$e{1;1}',
							'&3': '0',
							'&4': '$e{1;1}',
						},
						{
							'&1': '$e{1;1}',
							'&2': '0',
							'&3': '0',
							'&4': '$e{1;1}',
						},
					],
					expressions: ['&1+&2/10+&3/100+&4/1000'],

					options: ['remove-null-terms'],
					'result-type': 'decimal',
					defaultDelay: 20,
					grade: CM2,
				},
				{
					description: "Définition à l'aide de fractions décimales",
					subdescription: "Jusqu'aux millièmes (mélangée)",
					enounces: [
						"Réécris sous la forme d'un nombre décimal.",
					],
					variables: [
						{
							'&1': '$e{1;1}',
							'&2': '$e{1;1}',
							'&3': '$e{1;1}',
							'&4': '$e{1;1}',
						},
						{
							'&1': '$e{1;1}',
							'&2': '0',
							'&3': '$e{1;1}',
							'&4': '$e{1;1}',
						},
						{
							'&1': '$e{1;1}',
							'&2': '$e{1;1}',
							'&3': '0',
							'&4': '$e{1;1}',
						},
						{
							'&1': '$e{1;1}',
							'&2': '0',
							'&3': '0',
							'&4': '$e{1;1}',
						},
					],
					expressions: ['&1+&2/10+&3/100+&4/1000'],

					options: ['remove-null-terms', 'shuffle-terms'],
					'result-type': 'decimal',
					defaultDelay: 20,
					grade: CM2,
				},
				{
					description: "Définition à l'aide de fractions décimales (2)",
					subdescription: "Jusqu'aux millièmes",
					enounces: [
						"Réécris sous la forme d'un nombre décimal.",
					],
					variables: [
						{
							'&1': '$e{1;1}',
							'&2': '$e[1;3]',
							'&3': '$e{&2;&2}',
							'&4': '&1+&3/1000',
						},
					],
					expressions: ['&4'],

					'result-type': 'decimal',
					defaultDelay: 10,
					grade: CM2,
				},
			],
			Décomposition: [
				{
					description: 'Décomposer en unités, dixièmes, centièmes',
					subdescription: 'avec décimaux',
					enounces: ['Décompose comme dans cet exemple : $$5,34=5+0,3+0,04$$.'],
					variables: [
						{
							'&1': '$e{1;1}',
							'&2': '$e{1;1}',
							'&3': '$e{1;1}',
						},
					],
					expressions: ['[._&1+&2/10+&3/100_]'],
					solutions: [['&1+[._&2*0,1_]+[._&3*0,01_]']],
					options: ['no-penalty-for-null-terms'],
					defaultDelay: 25,
					grade: CM1,
				},
				{
					description: 'Décomposer en unités, dixièmes, centièmes',
					subdescription: 'avec fractions décimales',
					enounces: [
						'Décomposer comme dans cet exemple : $$5,34=5+3/10+4/100$$.',
					],
					variables: [
						{
							'&1': '$e{1;1}',
							'&2': '$e{1;1}',
							'&3': '$e{1;1}',
						},
						{
							'&1': '$e{1;1}',
							'&2': '0',
							'&3': '$e{1;1}',
						},
						{
							'&1': '$e{1;1}',
							'&2': '$e{1;1}',
							'&3': '0',
						},
					],
					expressions: ['[._&1+&2/10+&3/100_]'],
					solutions: [['&1+&2/10+&3/100']],
					options: [
						'no-penalty-for-null-terms',
						'no-penalty-for-extraneous-brackets',
						'no-penalty-for-factor-zero',
						'no-penalty-for-factor-one',
						'no-penalty-for-non-reduced-fractions',
					],

					defaultDelay: 25,
					grade: CM1,
				},
				{
					description: 'Décomposer en unités, dixièmes, centièmes, millièmes',
					subdescription: 'avec des décimaux',
					enounces: [
						'Décompose comme dans cet exemple : $$5,346=5+0,3+0,04+0,006$$.',
					],
					variables: [
						{
							'&1': '$e{1;1}',
							'&2': '$e{1;1}',
							'&3': '$e{1;1}',
							'&4': '$e{1;1}',
						},
					],
					expressions: ['[._&1+&2/10+&3/100+&4/1000_]'],
					solutions: [['&1+[._&2*0,1_]+[._&3*0,01_]+[._&4*0,001_]']],
					defaultDelay: 30,
					grade: CM2,
				},
				{
					description: 'Décomposer en unités, dixièmes, centièmes, millièmes',
					subdescription: 'avec des fractions décimales',
					enounces: [
						'Décomposer comme dans cet exemple : $$5,346=5+3/10+4/100+6/1000$$.',
					],
					variables: [
						{
							'&1': '$e{1;1}',
							'&2': '$e{1;1}',
							'&3': '$e{1;1}',
							'&4': '$e{1;1}',
						},
						{
							'&1': '$e{1;1}',
							'&2': '0',
							'&3': '$e{1;1}',
							'&4': '$e{1;1}',
						},
						{
							'&1': '$e{1;1}',
							'&2': '$e{1;1}',
							'&3': '0',
							'&4': '$e{1;1}',
						},
					],
					expressions: ['[._&1+&2/10+&3/100+&4/1000_]'],
					solutions: [['&1+&2/10+&3/100+&4/1000']],
					options: [
						'no-penalty-for-null-terms',
						'no-penalty-for-extraneous-brackets',
						'no-penalty-for-factor-zero',
						'no-penalty-for-factor-one',
						'no-penalty-for-non-reduced-fractions',
					],

					defaultDelay: 30,
					grade: CM2,
				},
			],
			'Forme fractionnaire': [
				{
					description: 'Déterminer une forme fractionnaire',
					enounces: ['Réécris ce nombre décimal sous forme fractionnaire.'],
					expressions: ['[._&2/&1_]'],
					variables: [{ '&1': '$l{2;4;5;10}', '&2': '$e[1;&1-1]' }],
					options:['no-penalty-for-non-reduced-fractions'],
					defaultDelay: 20,
					// TODO: autoriser fraction non simplifiée
					grade: SIXIEME,
				},
				{
					description: 'Déterminer une forme fractionnaire',
					subdescription: 'Simplification exigée',
					enounces: ['Réécris ce nombre décimal sous forme fractionnaire.'],
					expressions: ['[._&2/&1_]'],
					variables: [{ '&1': '$l{2;4;5;10}', '&2': '$e[1;&1-1]' }],
					
					defaultDelay: 20,
					// TODO: autoriser fraction non simplifiée
					grade: SIXIEME,
				},
			],
			Comparer: [
				{
					description: 'Trouver le plus petit entier supérieur',
					enounces: [
						'Quel est le plus petit entier supérieur à $$&3$$ ?',
						'Quel est le plus grand entier inférieur à $$&3$$ ?',
					],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]',
							'&3': '[._&1+&2*0,1_]',
						},
					],
					solutions: [
						['[_&1+1_]'],
						['&1'],
					],

					correctionFormat: [
						{
							correct: [
								'Le plus petit entier supérieur est &answer',
							],
						},
						{
							correct: [
								'Le plus grand entier inférieur est &answer',
							],
						},
					],
					defaultDelay: 20,
					grade: CM1,
				},
				{
					description: 'Comparer deux nombres entiers',
					enounces: ['Quel est le plus petit de ces 2 nombres ?'],
					variables: [
					
						{
							'&1': '$e[1;2]', // nombre de chiffres identiques
							'&2': '$e[1;2]', // nombre de chiffres différents
							'&3': '$e{&1;&1}', //partie identique
							'&4': '$e{&2;&2}', // parties différentes
							'&5': '$e{&2;&2}',

							'&7': '[._(&4+&3*10^&2)/10^&2_]',
							'&8': '[._(&5+&3*10^&2)/10^&2_]',
						},
						{
							'&1': '$e[1;2]', // nombre de chiffres identiques
							'&2': '$e{&1;&1}', //partie identique
							'&3': '$e{1;1}', // parties différentes
							'&4': '$e{2;2}',

							'&7': '[._(&3+&2*10)/10_]',
							'&8': '[._(&4+&2*100)/100_]',
						},
					],
					conditions: ['&7!=&8'],
					choices: [[{ text: '$$&7$$' }, { text: '$$&8$$' }]],
					solutions: [['&7<&8 ?? 0 :: 1']],
					defaultDelay: 20,
					grade: CM1,
				},
			],
			Encadrer: [
				{
					description:
						'Encadrer un nombre décimal par deux entiers consécutifs',
					enounces: ['Encadre ce nombre décimal par deux entiers consécutifs.'],
					expressions: ['?<&3<?'],
					variables: [
						{
							'&1': '$e[0;9]',
							'&2': '$e[1;9]',
							'&3': '[._&1+&2*0,1_]',
						},
					],
					solutions: [['&1', '[_&1+1_]']],

					correctionFormat: [
						{
							correct: ['$$&ans1<&3<&ans2$$'],
						},
					],
					type:"fill in",
					defaultDelay: 20,
					grade: CM1,
				},
				{
					description:
						'Encadrer un nombre décimal au dixième près',
					enounces: ['Encadre ce nombre décimal au dixième près.'],
					expressions: ['?<&4<?'],
					variables: [
						{
							'&1': '$e[0;9]',
							'&2': '$e[0;9]',
							'&3': '$e[1;9]',
							'&4': '[._&1+&2*0,1+&3*0,01_]',
						},
					],
					solutions: [['[._&1+&2*0,1_]', '[._&1+(&2+1)*0,1_]']],

					correctionFormat: [
						{
							correct: ['$$&ans1<[°&4°]<&ans2$$'],
						},
					],
					type:"fill in",
					options:['no-penalty-for-extraneous-zeros'],
					defaultDelay: 20,
					grade: CM1,
				},
				{
					description:
						'Encadrer un nombre décimal au centième près',
					enounces: ['Encadre ce nombre décimal au centième près.'],
					expressions: ['?<&5<?'],
					variables: [
						{
							'&1': '$e[0;9]',
							'&2': '$e[0;9]',
							'&3': '$e[0;9]',
							'&4': '$e[1;9]',
							'&5': '[._&1+&2*0,1+&3*0,01+&4*0,001_]',
						},
					],
					solutions: [['[._&1+&2*0,1+&3*0,01_]', '[._&1+&2*0,1+(&3+1)*0,01_]']],

					correctionFormat: [
						{
							correct: ['$$&ans1<[°&5°]<&ans2$$'],
						},
					],
					type:"fill in",
					options:['no-penalty-for-extraneous-zeros'],
					defaultDelay: 20,
					grade: CM1,
				},
			],
		},
		Additionner: {
			Somme: [
				{
					description: 'Calculer une somme ',
					subdescription:
						'Partie entière et partie décimale à $$1$$ chiffre (pas de retenue)',
					enounces: ['Calcule.'],
					variables: [
						{
							'&1': '$e[1;8]',
							'&2': '$e[1;8]',
							'&3': '&1.&2',
							'&4': '$e[1;9-&1]',
							'&5': '$e[1;9-&2]',
							'&6': '&4.&5',
						},
					],
					expressions: ['&3+&6'],

					'result-type': 'decimal',
					defaultDelay: 20,
					grade: CM1,
				},
				{
					description: 'Calculer une somme ',
					subdescription:
						'Parties décimales à $$1$$ et $$2$$ chiffres (pas de retenue)',
					enounces: ['Calcule.'],
					variables: [
						{
							'&1': '$e[1;8]',
							'&2': '$e[1;8]',
							'&3': '&1.&2',
							'&4': '$e[1;9-&1]',
							'&5': '$e[1;9-&2]',
							'&6': '$e[1;9-&2]',
							'&7': '&4.&5&6',
						},
					],
					expressions: ['&3+&7', '&7+&3'],

					'result-type': 'decimal',
					defaultDelay: 20,
					grade: CM1,
				},
				{
					description: 'Calculer une somme ',
					subdescription:
						'Partie entière et partie décimale à $$1$$ chiffre (avec retenue pour la partie décimale)',
					enounces: ['Calcule.'],
					variables: [
						{
							'&1': '$e[1;7]',
							'&2': '$e[2;9]',
							'&3': '&1.&2',
							'&4': '$e[1;8-&1]',
							'&5': '$e[10-&2;9]',
							'&6': '&4.&5',
						},
					],
					expressions: ['&3+&6'],

					'result-type': 'decimal',
					defaultDelay: 20,
					grade: CM1,
				},
				{
					description: 'Calculer une somme',
					subdescription:
						'Partie entière et partie décimale à $$1$$ chiffre (avec retenues)',
					enounces: ['Calcule.'],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]',
							'&3': '&1.&2',
							'&4': '$e[10-&1;9]',
							'&5': '$e[10-&2;9]',
							'&6': '&4.&5',
						},
					],
					expressions: ['&3+&6'],
					'result-type': 'decimal',
					defaultDelay: 20,
					grade: CM1,
				},
			],
			'A trou': [
				{
					description: 'Trouver le complément ',
					subdescription: "A l'entier supérieur",
					enounces: ['Complète.'],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$d{0;$e[1;2]}',
						},
					],
					expressions: ['?+[._&1-&2_]=&1', '[._&1-&2_]+?=&1'],
					type: 'fill in',
					solutions: [['&2']],
					defaultDelay: 15,
					grade: CM1,
				},
				{
					description: 'Compléter une addition à trou ',
					subdescription:
						'Partie entière et partie décimale à $$1$$ chiffre (pas de retenue)',
					enounces: ['Complète.'],
					variables: [
						{
							'&1': '$e[1;8]',
							'&2': '$e[1;8]',
							'&3': '&1.&2',
							'&4': '$e[1;9-&1]',
							'&5': '$e[1;9-&2]',
							'&6': '&4.&5',
						},
					],
					expressions: ['&3+?=[._&3+&6_]', '?+&3=[._&3+&6_]'],
					type: 'fill in',
					solutions: [['&6']],
					'result-type': 'decimal',
					defaultDelay: 20,
					grade: CM1,
				},
				{
					description: 'Compléter une addition à trou',
					subdescription:
						'Parties décimales à $$1$$ et $$2$$ chiffres (pas de retenue)',
					enounces: ['Complète.'],
					variables: [
						{
							'&1': '$e[1;8]',
							'&2': '$e[1;8]',
							'&3': '&1.&2',
							'&4': '$e[1;9-&1]',
							'&5': '$e[1;9-&2]',
							'&6': '$e[1;9-&2]',
							'&7': '&4.&5&6',
						},
					],
					expressions: ['&3+?=[._&7+&3_]', '?+&3=[._&7+&3_]'],
					solutions: [['&7']],
					type: 'fill in',
					'result-type': 'decimal',
					defaultDelay: 20,
					grade: CM1,
				},
				{
					description: 'Compléter une addition à trou',
					subdescription:
						'Partie entière et partie décimale à $$1$$ chiffre (avec retenue pour la partie decimale)',
					enounces: ['Complète.'],
					variables: [
						{
							'&1': '$e[1;7]',
							'&2': '$e[2;9]',
							'&3': '&1.&2',
							'&4': '$e[1;8-&1]',
							'&5': '$e[10-&2;9]',
							'&6': '&4.&5',
						},
					],
					expressions: ['&3+?=[._&6+&3_]', '?+&3=[._&6+&3_]'],
					type: 'fill in',
					solutions: [['&6']],
					'result-type': 'decimal',
					defaultDelay: 20,
					grade: CM1,
				},
				{
					description: 'Compléter une addition à trou',
					subdescription:
						'Partie entière et partie décimale à $$1$$ chiffre (avec retenues)',
					enounces: ['Complète'],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]',
							'&3': '&1.&2',
							'&4': '$e[10-&1;9]',
							'&5': '$e[10-&2;9]',
							'&6': '&4.&5',
						},
					],
					expressions: ['&3+?=[._&6+&3_]', '?+&3=[._&6+&3_]'],
					solutions: [['&6']],
					type: 'fill in',
					'result-type': 'decimal',
					defaultDelay: 20,
					grade: CM1,
				},
			],
			'Somme astucieuse': [
				{
					description: 'Additionner par regroupements',
					subdescription:
						'Regrouper pour obtenir un nombre entier. $$3$$ nombres à une décimale.',
					enounces: ['Calcule de manière astucieuse.'],
					expressions: ['&5+&8+&6', '&8+&5+&6'],

					variables: [
						{
							'&1': '$e{1}',
							'&2': '10-&1',
							'&3': '$e[0;9]',
							'&4': '$e[0;9-&3]',
							'&5': '[._&3+&1/10_]',
							'&6': '[._&4+(&2)/10_]',
							'&7': '$e{1}+($e[1;9]\\{&1;[_&2_]})/10',
							'&8': '[._&7_]',
						},
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} [._&8_] +\\bold{\\textcolor{${color1}}{[._&5_]}} + \\bold{\\textcolor{${color1}}{[._&6_]}} &= [._&8_] + \\bold{\\textcolor{${color1}}{[._&5+&6_]}} \\\\ &=  &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{[._&5_]}}+ [._&8_] + \\bold{\\textcolor{${color1}}{[._&6_]}} &= [._&8_] + \\bold{\\textcolor{${color1}}{[._&5+&6_]}} \\\\ &=  &sol \\end{align}$$`,
							},
						],
					],

					'result-type': 'decimal',
					defaultDelay: 20,
					grade: CM1,
				},
				{
					description: 'Additionner par regroupements',
					subdescription:
						'Regrouper pour obtenir un nombre entier. $$4$$ nombres à une décimale.',
					enounces: ['Calcule de manière astucieuse.'],
					expressions: [
						'[._&3_]+[._&4_]+[._&5_]+[._&6_]',
						'[._&3_]+[._&5_]+[._&4_]+[._&6_]',
						'[._&3_]+[._&5_]+[._&6_]+[._&4_]',
					],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]\\{&1;10-&1}',
							'&3': '$e[1;9]+&1*0,1',
							'&4': '$e[1;9]+(10-&1)*0,1',
							'&5': '$e[1;9]+&2*0,1',
							'&6': '$e[1;9]+(10-&2)*0,1',
						},
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
              \\bold{\\textcolor{${color1}}{[._&3_]}} + \\bold{\\textcolor{${color1}}{[._&4_]}} + \\bold{\\textcolor{${color2}}{[._&5_]}} + \\bold{\\textcolor{${color2}}{[._&6_]}} \
              &=  \\bold{\\textcolor{${color1}}{[._&3+&4_]}} + \\bold{\\textcolor{${color2}}{[._&5+&6_]}} \\\\ \
              &=  &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              \\bold{\\textcolor{${color1}}{[._&3_]}} + \\bold{\\textcolor{${color2}}{[._&5_]}} + \\bold{\\textcolor{${color1}}{[._&4_]}} + \\bold{\\textcolor{${color2}}{[._&6_]}} \
              &=  \\bold{\\textcolor{${color1}}{[._&3+&4_]}} + \\bold{\\textcolor{${color2}}{[._&5+&6_]}} \\\\ \
              &=  &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              \\bold{\\textcolor{${color1}}{[._&3_]}} + \\bold{\\textcolor{${color2}}{[._&5_]}} + \\bold{\\textcolor{${color2}}{[._&6_]}} + \\bold{\\textcolor{${color1}}{[._&4_]}} \
              &=  \\bold{\\textcolor{${color1}}{[._&3+&4_]}} + \\bold{\\textcolor{${color2}}{[._&5+&6_]}} \\\\ \
              &=  &sol  \
              \\end{align}$$`,
							},
						],
					],

					'result-type': 'decimal',
					defaultDelay: 20,
					grade: CM1,
				},
			],

			Moitié: [
				{
					description: 'Trouver la moitié',
					subdescription: 'Nombres de $$1$$ à $$20$$',
					enounces: ['Quelle est la moitié du nombre $$[._&1_]$$ ?'],
					solutions: [['&2']],
					variables: [
						{
							'&1': '$e[0;14]*2+1',
							'&2': '[._(&1)/2_]',
						},
					],
					correctionFormat: [
						{
							correct: ['La moitié de $$[._&1_]$$ est &answer.'],
						},
					],
					correctionDetails: [
						[
							{
								text: 'La moitié de $$[._&1_]$$ est &solution car $$2 \\times &sol = [_&1_]$$',
							},
						],
					],
					'result-type': 'decimal',
					defaultDelay: 15,
					grade: CM1,
				},
			],
		},
		Soustraire: {
			Différence: [
				{
					description: 'Calculer une différence ',
					subdescription:
						'Partie entière et partie décimale à $$1$$ chiffre (pas de retenue)',
					enounces: ['Calcule.'],
					variables: [
						{
							'&1': '$e[2;8]',
							'&2': '$e[2;8]',
							'&3': '&1.&2',
							'&4': '$e[1;&1-1]',
							'&5': '$e[1;&2-1]',
							'&6': '&4.&5',
						},
					],
					expressions: ['&3-&6'],

					'result-type': 'decimal',
					defaultDelay: 15,
					grade: CM1,
				},
				{
					description: 'Calculer une différence ',
					subdescription:
						'Partie entière à $$2$$ chiffres et partie entière à $$1$$ (retenue sur la partie entière)',
					enounces: ['Calcule.'],
					variables: [
						{
							'&1': '$e[1;8]',
							'&2': '$e[2;9]',
							'&3': '1&1.&2',
							'&4': '$e[&1+1;9]',
							'&5': '$e[1;&2-1]',
							'&7': '&4.&5',
						},
					],
					expressions: ['&3-&7'],

					'result-type': 'decimal',
					defaultDelay: 20,
					grade: CM1,
				},
				{
					description: 'Calculer une différence ',
					subdescription:
						'Partie entière à $$1$$ chiffre et partie décimale à $$1$$ et $$2$$ chiffres (pas de retenue)',
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
							'&3': '$e[1;9]',
							'&4': '&1.&2&3',
							'&5': '$e[1;&1-1]',
							'&6': '$e[1;&2-1]',
							'&7': '&5.&6',
						},
					],
					expressions: ['&4-&7'],

					'result-type': 'decimal',
					defaultDelay: 20,
					grade: CM1,
				},
				{
					description: 'Calculer une différence ',
					subdescription:
						'Partie entière et partie décimale à $$1$$ chiffre (avec retenue)',
					enounces: ['Calcule.'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[1;8]',
							'&3': '&1.&2',
							'&4': '$e[1;&1-1]',
							'&5': '$e[&2+1;9]',
							'&6': '&4.&5',
						},
					],
					expressions: ['&3-&6'],

					'result-type': 'decimal',
					defaultDelay: 20,
					grade: CM1,
				},
			],
		},
		Multiplier: {
			Produit: [
				{
					description: 'Calculer un produit',
					subdescription: 'Un entier par un décimal inférieur à $$1$$',
					enounces: ['Calcule.'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
							'&3': '0.&2',
						},
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
							'&3': '0.0&2',
						},
					],
					expressions: ['&1*&3'],
					conditions: ['mod(&1*&2;10)!=0'],
					correctionDetails: [
						[
							{
								text: `$$&1\\times &2=[_&1*&2_]$$ donc $$&1\\times 0,\\textcolor{${color1}}{&2}=&sol$$ ($$\\textcolor{${color1}}{1\\text{ décimale}} $$).`,
							},
						],
						[
							{
								text: `$$&1\\times &2=[_&1*&2_]$$ donc $$&1\\times 0,\\textcolor{${color1}}{0&2}=&sol$$ ($$\\textcolor{${color1}}{2\\text{ décimales}} $$).`,
							},
						],
					],

					'result-type': 'decimal',
					defaultDelay: 20,
					grade: CM2,
				},
				{
					description: 'Placer la virgule dans le produit',
					enounces: [
						'La virgule a été oubliée dans le produit. Réécris le produit en rajoutant la virgule.',
					],
					
					variables: [
						{
							'&1': '$e[2;4]',
							'&2': '$e[2;4]',
							'&3': '$e{&1;&1}\\{m10}',
							'&4': '$e{&2;&2}\\{m10}',
							// '&5': '[._&3:10^(&1-1)_]*[._&4:10^(&2-1)_]'
						},
					],
					enounces2: ['$$[._&3:10^(&1-1)_]*[._&4:10^(&2-1)_]=[_&3*&4_]$$'],
					expressions: ['[._&3:10^(&1-1)_]*[._&4:10^(&2-1)_]=?'],
					conditions: ['mod(&3*&4;10)!=0'],
					solutions: [['[._&3*&4:10^(&1+&2-2)_]']],
					correctionFormat: [
						{
							correct: [
								'$$[._&3:10^(&1-1)_] \\times [._&4:10^(&2-1)_]=&ans$$',
							],
						},
					],
					correctionDetails: [
						[
							{
								text: `Il y a $$\\textcolor{${color1}}{[_&1-1_]\\text{ décimale(s)}}$$ dans $$[._&3:10^(&1-1)_]$$  et $$\\textcolor{${color1}}{[_&2-1_]\\text{  décimale(s)}}$$ dans $$[._&4:10^(&2-1)_]$$, donc il y a en tout $$\\textcolor{${color1}}{[_&1+&2-2_] \\text{ décimales}}$$  dans &solution.`,
							},
						],
					],

					'result-type': 'decimal',
					type:'fill in',
					defaultDelay: 20,
					grade: SIXIEME,
				},
				{
					description: 'Calculer un produit',
					subdescription: 'Multiplier deux nombres décimaux inférieurs à $$1$$',
					enounces: ['Calcule.'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[1;2]',
							'&3': '$e[2;9]',
							'&4': '$e[1;2]',
						},
					],
					conditions: ['mod(&1*&3;10)!=0'],
					expressions: ['[._&1*10^(-&2)_]*[._&3*10^(-&4)_]'],
					correctionDetails: [
						[
							{
								text: `$$&1\\times &3=[_&1*&3_]$$ donc $$[._&1*10^(-&2)_] \\times [._&3*10^(-&4)_]=&sol$$ ($$\\textcolor{${color1}}{&2+&4=[_&2+&4_]\\text{ décimales}} $$).`,
							},
						],
					],

					'result-type': 'decimal',
					defaultDelay: 20,
					grade: SIXIEME,
				},

				{
					description: 'Calculer un produit',
					subdescription: 'Un des facteurs est un entier',
					enounces: ['Calcule.'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$d{1;1}',
						},
					],
					expressions: ['&1*&2', '&2*&1'],

					'result-type': 'decimal',
					defaultDelay: 20,
					grade: CM2,
				},
				{
					description: 'Calculer un produit',
					subdescription: "Determiner un produit à partir d'un autre",
					enounces: [
						'Sachant que $$[._&1_] * [._&2_]=[._&1*&2_]$$ , calcule :',
						'Sachant que $$[._&2_] * [._&1_]=[._&1*&2_]$$ , calcule :',
					],
					variables: [
						{
							'&1': '$d{$e[1;2];$e[0;2]}',
							'&2': '$d{2;1}',
							'&3': '$l{10;100;1000}',
						},
					],
					expressions: ['[._&1*&3_]* &2', '&2*[._&1*&3_]'],
					correctionDetails: [
						[
							{
								text: `$$[._&1*&3_]$$ est $$\\textcolor{${color1}}{[_&3_]\\text{ fois}}$$ plus grand que $$[._&1_]$$, donc le résultat de $$[._&1*&3_] \\times [._&2_]$$ est  $$\\textcolor{${color1}}{[_&3_]\\text{ fois}}$$ plus grand que celui de $$[._&1_]\\times[._&2_]$$, c'est-à-dire $$\\textcolor{${color1}}{[_&3_]\\times} [._&1*&2_] = &sol$$`,
							},
						],
						[
							{
								text: `$$[._&1*&3_]$$ est $$\\textcolor{${color1}}{[_&3_]\\text{ fois}}$$ plus grand que $$[._&1_]$$, donc le résultat de $$[._&2_] \\times [._&1*&3_] $$ est  $$\\textcolor{${color1}}{[_&3_]\\text{ fois}}$$ plus grand que celui de $$[._&2_] \\times [._&1_]$$, c'est-à-dire $$\\textcolor{${color1}}{[_&3_]\\times} [._&1*&2_] = &sol$$`,
							},
						],
					],
					solutions: [['[._&1*&3*&2_]']],

					'result-type': 'decimal',
					defaultDelay: 20,
					grade: SIXIEME,
				},
			],
			'Produit particulier': [
				{
					description: 'Multiplier par $$0,5$$',
					subdescription: 'Un entier',
					enounces: ['Calcule.'],
					variables: [
						{
							'&1': '$e[1;20]',
						},
					],
					expressions: ['&1*0,5', '0,5*&1'],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} &1 \\times 0,5 &= &1 \\div 2 \\\\ &=  &sol \\end{align}$$',
							},
						],
						[
							{
								text: '$$\\begin{align} 0,5 \\times &1 &= &1 \\div 2 \\\\ &=  &sol \\end{align}$$',
							},
						],
					],

					'result-type': 'decimal',
					defaultDelay: 15,
					grade: SIXIEME,
				},
				{
					description: 'Multiplier par $$0,5$$',
					subdescription: 'Un nombre décimal',
					enounces: ['Calcule.'],
					variables: [
						{
							'&1': '$l{2;4;6;8}',
							'&2': '$e{1}',
							'&3': '[._&1+&2/10_]',
						},
					],
					expressions: ['&3*0,5', '0,5*&3'],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} [._&3_] \\times 0,5 &= [._&3_] \\div 2 \\\\ &=  &sol \\end{align}$$',
							},
						],
						[
							{
								text: '$$\\begin{align} 0,5 \\times [._&3_] &= [._&3_] \\div 2 \\\\ &=  &sol \\end{align}$$',
							},
						],
					],

					'result-type': 'decimal',
					defaultDelay: 15,
					grade: SIXIEME,
				},
				{
					description: 'Multiplier par $$1,5$$',
					enounces: ['Calcule.'],
					variables: [
						{
							'&1': '$e[2;20]',
						},
					],
					expressions: ['&1*1,5', '1,5*&1'],

					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&1}} \\times 1,5 &= \\bold{\\textcolor{${color1}}{&1}} + \\bold{\\textcolor{${color1}}{&1}} \\times 0,5 \\\\ &= &1 + [._0,5*&1_] \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} 1,5 \\times \\bold{\\textcolor{${color1}}{&1}} &= \\bold{\\textcolor{${color1}}{&1}} + 0,5 \\times \\bold{\\textcolor{${color1}}{&1}} \\\\ &= &1 + [._0,5*&1_] \\\\ &= &sol \\end{align}$$`,
							},
						],
					],
					'result-type': 'decimal',
					defaultDelay: 20,
					grade: SIXIEME,
				},
				{
					description: 'Multiplier par $$2,5çi',
					enounces: ['Calcule.'],
					variables: [
						{
							'&1': '$e[2;20]',
						},
					],
					expressions: ['&1*2,5', '2,5*&1'],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&1}} \\times 2,5 &= \\bold{\\textcolor{${color1}}{&1}} \\times 2 + \\bold{\\textcolor{${color1}}{&1}} \\times 0,5 \\\\ &= [_&1*2_] + [._0,5*&1_] \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} 2,5 \\times \\bold{\\textcolor{${color1}}{&1}} &= 2 \\times \\bold{\\textcolor{${color1}}{&1}} + 0,5 \\times \\bold{\\textcolor{${color1}}{&1}} \\\\ &= [_&1*2_] + [._0,5*&1_] \\\\ &= &sol \\end{align}$$`,
							},
						],
					],

					'result-type': 'decimal',
					defaultDelay: 20,
					grade: SIXIEME,
				},
			],
			'Puissances de 10': [
				{
					description: 'Calculer un produit',
					subdescription: 'Multiplier par $$10$$',
					enounces: ['Calcule.'],
					variables: [
						{
							'&1': '$d{$e[0;2];$e[0;2]}',
						},
					],
					expressions: ['&1*10'],

					'result-type': 'decimal',
					defaultDelay: 15,
					grade: CM1,
				},
				{
					description: 'Calculer un produit',
					subdescription: 'Multiplier par $$100$$',
					enounces: ['Calcule.'],
					variables: [
						{
							'&1': '$d{$e[0;2];$e[0;2]}',
						},
					],
					expressions: ['&1*100'],

					'result-type': 'decimal',
					defaultDelay: 15,
					grade: CM1,
				},
				{
					description: 'Calculer un produit',
					subdescription: 'Multiplier par $$1000$$',
					enounces: ['Calcule.'],
					variables: [
						{
							'&1': '$d{$e[0;2];$e[0;2]}',
						},
					],
					expressions: ['&1*1000'],

					'result-type': 'decimal',
					defaultDelay: 15,
					grade: CM1,
				},
				{
					description: 'Calculer un produit',
					subdescription: 'Multiplier par $$10$$, $$100$$ ou $$1000$$',
					enounces: ['Calcule.'],
					variables: [
						{
							'&1': '$e[1;3]',
							'&2': '$d{$e[0;4-&1];$e[0;4]}',
						},
					],
					expressions: ['[_10^&1_]*&2', '&2*[_10^&1_]'],

					'result-type': 'decimal',
					defaultDelay: 20,
					grade: SIXIEME,
				},
				{
					description: 'Multiplier par $$0,1$$',
					subdescription: 'Nombre entier',
					enounces: ['Calcule.'],
					variables: [
						{
							'&1': '$e[1;3]',
							'&2': '$e{&1;&1}',
						},
					],
					expressions: ['&2*0,1', '0,1*&2'],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} &1 \\bold{\\textcolor{${color1}}{\\times 0,1}} &= &1 \\bold{\\textcolor{${color1}}{\\div 10}} \\\\ &=  &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{0,1 \\times}} &1 &= &1 \\bold{\\textcolor{${color1}}{\\div 10}} \\\\ &=  &sol \\end{align}$$`,
							},
						],
					],

					'result-type': 'decimal',
					defaultDelay: 15,
					grade: SIXIEME,
				},
				{
					description: 'Multiplier par $$0,1$$',
					subdescription: 'Nombre décimal',
					enounces: ['Calcule.'],
					variables: [
						{
							'&1': '$e[0;3]',
							'&2': '$e[1;2]',
							'&3': '$d{&1;&2}',
						},
					],
					expressions: ['&3*0,1', '0,1*&3'],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} [._&3_] \\bold{\\textcolor{${color1}}{\\times 0,1}} &= [._&3_] \\bold{\\textcolor{${color1}}{\\div 10}} \\\\ &=  &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{0,1 \\times}} [._&3_] &= [._&3_] \\bold{\\textcolor{${color1}}{\\div 10}} \\\\ &=  &sol \\end{align}$$`,
							},
						],
					],

					'result-type': 'decimal',
					defaultDelay: 15,
					grade: SIXIEME,
				},
				{
					description: 'Multiplier par $$0,01$$',
					subdescription: 'Nombre entier ou décimal',
					enounces: ['Calcule.'],
					variables: [
						{
							'&1': '$e[0;3]',
							'&2': '$e[0;2]',
							'&3': '$d{&1;&2}',
						},
					],
					expressions: ['&3*0,01', '0,01*&3'],

					correctionDetails: [
						[
							{
								text: `$$\\begin{align} [._&3_] \\bold{\\textcolor{${color1}}{\\times 0,01}} &= [._&3_] \\bold{\\textcolor{${color1}}{\\div 100}} \\\\ &=  &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{0,01 \\times}} [._&3_] &= [._&3_] \\bold{\\textcolor{${color1}}{\\div 100}} \\\\ &=  &sol \\end{align}$$`,
							},
						],
					],
					'result-type': 'decimal',
					defaultDelay: 15,
					grade: SIXIEME,
				},
				{
					description: 'Multiplier par $$0,001$$',
					subdescription: 'Nombre entier ou décimal',
					enounces: ['Calcule.'],
					variables: [
						{
							'&1': '$e[0;3]',
							'&2': '$e[0;1]',
							'&3': '$d{&1;&2}',
						},
					],
					expressions: ['&3*0,001', '0,001*&3'],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} [._&3_] \\bold{\\textcolor{${color1}}{\\times 0,001}} &= [._&3_] \\bold{\\textcolor{${color1}}{\\div 1000}} \\\\ &=  &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} 0,001 \\bold{\\textcolor{${color1}}{\\times [._&3_]}} &= [._&3_] \\bold{\\textcolor{${color1}}{\\div 1000}} \\\\ &=  &sol \\end{align}$$`,
							},
						],
					],

					'result-type': 'decimal',
					defaultDelay: 15,
					grade: SIXIEME,
				},
				{
					description: 'Calculer un produit',
					subdescription: 'Multiplier par $$0,1$$, $$0,01$$ ou $$0,001$$',
					enounces: ['Calcule.'],
					variables: [
						{
							'&1': '$e[1;3]',
							'&2': '$d{$e[1;3];$e[0;4-&1]}',
						},
					],
					expressions: ['[._10^(-&1)_]*[._&2_]', '[._&2_]*[._10^(-&1)_]'],

					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{[._10^(-&1)_]}} \\times [._&2_] &= [._&2_] \\bold{\\textcolor{${color1}}{\\div [._10^&1_]}} \\\\ &=  &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} [._&2_] \\bold{\\textcolor{${color1}}{\\times [._10^(-&1)_]}} &= [._&2_] \\bold{\\textcolor{${color1}}{\\div [._10^&1_]}} \\\\ &=  &sol \\end{align}$$`,
							},
						],
					],
					'result-type': 'decimal',
					defaultDelay: 20,
					grade: SIXIEME,
				},
			],
			'Produits astucieux': [
				{
					description: 'Calculer astucieusement un produit',
					subdescription: 'Utiiser $$2$$ facteurs dont le produit est $$100$$',
					enounces: ['Calcule de manière astucieuse.'],
					expressions: [
						'&1*[_&2_]*&3',
						'[_&2_]*&1*&3',
						'[_&2_]*&3*&1',
						'&1*&3*[_&2_]',
						'&3*&1*[_&2_]',
						'&3*[_&2_]*&1',
					],
					variables: [
						{
							'&1': '$l{20;25;50}',
							'&2': '[_100:&1_]',
							'&3': '$d{$e[1;2];$e[1;3]}',
						},
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&1}}  \\times  \\bold{\\textcolor{${color1}}{&2}} \\times &3 &= \\bold{\\textcolor{${color1}}{100}} \\times &3 \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&2}}  \\times  \\bold{\\textcolor{${color1}}{&1}} \\times &3 &= \\bold{\\textcolor{${color1}}{100}} \\times &3 \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&2}}  \\times  &3 \\times \\bold{\\textcolor{${color1}}{&1}} &= \\bold{\\textcolor{${color1}}{100}} \\times &3 \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&1}}  \\times  &3 \\times \\bold{\\textcolor{${color1}}{&2}} &= \\bold{\\textcolor{${color1}}{100}} \\times &3 \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} &3 \\times \\bold{\\textcolor{${color1}}{&2}} \\times \\bold{\\textcolor{${color1}}{&1}} &= &3 \\times \\bold{\\textcolor{${color1}}{100}} \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} &3 \\times \\bold{\\textcolor{${color1}}{&1}} \\times \\bold{\\textcolor{${color1}}{&2}} &= &3 \\times \\bold{\\textcolor{${color1}}{100}} \\\\ &= &sol \\end{align}$$`,
							},
						],
					],

					'result-type': 'decimal',
					defaultDelay: 20,
					grade: CM2,
				},
				{
					description: 'Calculer astucieusement un produit',
					subdescription:
						'Utiiser $$2$$ facteurs dont le produit est $$10$$ (avec $$0,5$$)',
					enounces: ['Calcule de manière astucieuse.'],
					expressions: [
						'20*[_2*&1_]*0,5',
						'0,5*[_2*&1_]*20',
						'[_2*&1_]*0,5*20',
						'[_2*&1_]*20*0,5',
					],
					variables: [{ '&1': '$e[3;19]' }],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{20}} \\times [_2*&1_] \\times  \\bold{\\textcolor{${color1}}{0,5}} &= \\bold{\\textcolor{${color1}}{10}} \\times [_2*&1_] \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{0,5}} \\times [_2*&1_] \\times  \\bold{\\textcolor{${color1}}{20}} &= \\bold{\\textcolor{${color1}}{10}} \\times [_2*&1_] \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} [_2*&1_] \\times \\bold{\\textcolor{${color1}}{20}} \\times  \\bold{\\textcolor{${color1}}{0,5}} &= [_2*&1_] \\times \\bold{\\textcolor{${color1}}{10}} \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} [_2*&1_] \\times \\bold{\\textcolor{${color1}}{0,5}} \\times  \\bold{\\textcolor{${color1}}{20}} &=   [_2*&1_] \\times \\bold{\\textcolor{${color1}}{10}} \\\\ &= &sol \\end{align}$$`,
							},
						],
					],

					defaultDelay: 15,
					grade: CM2,
				},
				{
					description: 'Calculer astucieusement un produit',
					subdescription:
						'Utiiser $$2$$ facteurs dont le produit est $$10$$ (avec $$0,2$$ ; $$0,25$$ ; $$0,5$$)',
					enounces: ['Calcule de manière astucieuse.'],
					expressions: [
						'&1*&2*&3',
						'&2*&1*&3',
						'&2*&3*&1',
						'&1*&3*&2',
						'&3*&2*&1',
						'&3*&1*&2',
					],
					variables: [
						{ '&1': '$l{0,2;0,25;0,5}', '&2': '[_10:&1_]', '&3': '$e[3;19]' },
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{[._&1_]}}  \\times  \\bold{\\textcolor{${color1}}{&2}} \\times &3 &= \\bold{\\textcolor{${color1}}{10}} \\times &3 \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&2}}  \\times  \\bold{\\textcolor{${color1}}{[._&1_]}} \\times &3 &= \\bold{\\textcolor{${color1}}{10}} \\times &3 \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{&2}}  \\times  &3 \\times \\bold{\\textcolor{${color1}}{[._&1_]}} &= \\bold{\\textcolor{${color1}}{10}} \\times &3 \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\bold{\\textcolor{${color1}}{[._&1_]}}  \\times  &3 \\times \\bold{\\textcolor{${color1}}{&2}} &= \\bold{\\textcolor{${color1}}{10}} \\times &3 \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} &3 \\times \\bold{\\textcolor{${color1}}{&2}} \\times \\bold{\\textcolor{${color1}}{[._&1_]}} &= &3 \\times \\bold{\\textcolor{${color1}}{10}} \\\\ &= &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} &3 \\times \\bold{\\textcolor{${color1}}{[._&1_]}} \\times \\bold{\\textcolor{${color1}}{&2}} &= &3 \\times \\bold{\\textcolor{${color1}}{10}} \\\\ &= &sol \\end{align}$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: CM2,
				},
			],
			Distributivité: [
				{
					description: 'Utiliser la distributivité',
					subdescription: 'Factorisation pour obternir un facteur égal à $$10$$',
					enounces: ['Calcule.'],
					expressions: [
						'&2*&1+[_10-&2_]*&1',
						'&1*&2+[_10-&2_]*&1',
						'&2*&1+&1*[_10-&2_]',
						'&1*&2+&1*[_10-&2_]',
					],
					variables: [{ '&1': '$d{1;1}', '&2': '$e[2;8]' }],
					correctionDetails: [
						[
							{
								text: `$$\
								\\begin{align} \
									&2 \\times \\bold{\\textcolor{${color1}}{[._&1_]}} + [_10-&2_] \\times \\bold{\\textcolor{${color1}}{[._&1_]}} \
									&=  \\left( &2 + [_10-&2_] \\right) \\times \\bold{\\textcolor{${color1}}{[._&1_]}}\\\\  \
									&=  10 \\times \\bold{\\textcolor{${color1}}{[._&1_]}}\\\\  \
									&= &sol \
								\\end{align}$$`,
							},
						],
						[
							{
								text: `$$\
								\\begin{align} \
									\\bold{\\textcolor{${color1}}{[._&1_]}} \\times &2 + [_10-&2_] \\times \\bold{\\textcolor{${color1}}{[._&1_]}} \
									&=  \\left( &2 + [_10-&2_] \\right) \\times \\bold{\\textcolor{${color1}}{[._&1_]}}\\\\  \
									&=  10 \\times \\bold{\\textcolor{${color1}}{[._&1_]}}\\\\  \
									&= &sol \
								\\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
									&2 \\times \\bold{\\textcolor{${color1}}{[._&1_]}} + \\bold{\\textcolor{${color1}}{[._&1_]}} \\times [_10-&2_] \
									&=  \\left( &2 + [_10-&2_] \\right) \\times \\bold{\\textcolor{${color1}}{[._&1_]}}\\\\  \
									&=  10 \\times \\bold{\\textcolor{${color1}}{[._&1_]}}\\\\  \
									&= &sol \
								\\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align}  \
									\\bold{\\textcolor{${color1}}{[._&1_]}} \\times &2+ \\bold{\\textcolor{${color1}}{[._&1_]}} \\times [_10-&2_] \
									&= \\bold{\\textcolor{${color1}}{[._&1_]}} \\times \\left( &2 + [_10-&2_] \\right)\\\\  \
									&= \\bold{\\textcolor{${color1}}{[._&1_]}} \\times 10 \\\\  \
									&= &sol \
								\\end{align}$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: SIXIEME,
				},
				{
					description: 'Utiliser la distributivité',
					subdescription:
						'Factorisation pour obternir un facteur égal à $$10$$ (2)',
					enounces: ['Calcule.'],
					expressions: [
						'&2*&1+[._10-&2_]*&1',
						'&1*&2+[._10-&2_]*&1',
						'&2*&1+&1*[._10-&2_]',
						'&1*&2+&1*[._10-&2_]',
					],
					variables: [{ '&1': '$e[2;8]', '&2': '$d{1;1}' }],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
								  [°&2°] \\times \\bold{\\textcolor{${color1}}{[_&1_]}} + [._10-&2_] \\times \\bold{\\textcolor{${color1}}{[_&1_]}} \
								  &=  \\left( [°&2°] + [._10-&2_] \\right) \\times \\bold{\\textcolor{${color1}}{[_&1_]}}\\\\  \
								  &=  10 \\times \\bold{\\textcolor{${color1}}{[_&1_]}}\\\\  \
								  &= &sol \
								\\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
									\\bold{\\textcolor{${color1}}{[_&1_]}} \\times [°&2°] + [._10-&2_] \\times \\bold{\\textcolor{${color1}}{[_&1_]}} \
									&=  \\left( [°&2°] + [._10-&2_] \\right) \\times \\bold{\\textcolor{${color1}}{[_&1_]}}\\\\ \
									&=  10 \\times \\bold{\\textcolor{${color1}}{[_&1_]}}\\\\ \
									&= &sol\
								\\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
									[°&2°] \\times \\bold{\\textcolor{${color1}}{[_&1_]}} + \\bold{\\textcolor{${color1}}{[_&1_]}} \\times [._10-&2_] \
									&=  \\left( [°&2°] + [._10-&2_] \\right) \\times \\bold{\\textcolor{${color1}}{[_&1_]}}\\\\ \
									&=  10 \\times \\bold{\\textcolor{${color1}}{[_&1_]}}\\\\ \
									&= &sol \
								\\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
									\\bold{\\textcolor{${color1}}{[_&1_]}} \\times [°&2°]+ \\bold{\\textcolor{${color1}}{[_&1_]}} \\times [._10-&2_] \
									&= \\bold{\\textcolor{${color1}}{[_&1_]}} \\times \\left( [°&2°] + [._10-&2_] \\right) \\\\ \
									&= \\bold{\\textcolor{${color1}}{[_&1_]}} \\times 10\\\\ \
									&= &sol \
								\\end{align}$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: SIXIEME,
				},
				{
					description: 'Utiliser la distributivité',
					subdescription: 'Factorisation pour obtenir un facteur égal à $$100$$',
					enounces: ['Calculer'],
					expressions: [
						'&2*&1+[_100-&2_]*&1',
						'&1*&2+[_100-&2_]*&1',
						'&2*&1+&1*[_100-&2_]',
						'&1*&2+&1*[_100-&2_]',
					],
					variables: [{ '&1': '$d{$e[1;2];$e[1;2]}', '&2': '$e[2;98]' }],
					correctionDetails: [
						[
							{
								text: `$$\
								\\begin{align} \
									&2 \\times \\bold{\\textcolor{${color1}}{[._&1_]}} + [_100-&2_] \\times \\bold{\\textcolor{${color1}}{[._&1_]}} \
									&=  \\left( &2 + [_100-&2_] \\right) \\times \\bold{\\textcolor{${color1}}{[._&1_]}}\\\\  \
									&=  100 \\times \\bold{\\textcolor{${color1}}{[._&1_]}}\\\\  \
									&= &sol \
								\\end{align}$$`,
							},
						],
						[
							{
								text: `$$\
								\\begin{align}\
									\\bold{\\textcolor{${color1}}{[._&1_]}} \\times &2 + [_100-&2_] \\times \\bold{\\textcolor{${color1}}{[._&1_]}} \
									&=  \\left( &2 + [_100-&2_] \\right) \\times \\bold{\\textcolor{${color1}}{[._&1_]}}\\\\  \
									&=  100 \\times \\bold{\\textcolor{${color1}}{[._&1_]}}\\\\  \
									&= &sol \
								\\end{align}$$`,
							},
						],
						[
							{
								text: `$$\
								\\begin{align} \
									&2 \\times \\bold{\\textcolor{${color1}}{[._&1_]}} + \\bold{\\textcolor{${color1}}{[._&1_]}} \\times [_100-&2_] \
									&=  \\left( &2 + [_100-&2_] \\right) \\times \\bold{\\textcolor{${color1}}{[._&1_]}}\\\\  \
									&=  100 \\times \\bold{\\textcolor{${color1}}{[._&1_]}}\\\\  \
									&= &sol \
								\\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align}\
									\\bold{\\textcolor{${color1}}{[._&1_]}} \\times &2+ \\bold{\\textcolor{${color1}}{[._&1_]}} \\times [_100-&2_] \
										&=  \\bold{\\textcolor{${color1}}{[._&1_]}} \\times \\left( &2 + [_100-&2_] \\right) \\\\ \
										&=  \\bold{\\textcolor{${color1}}{[._&1_]}} \\times 100 \\\\ \
										&= &sol \
									\\end{align}$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: SIXIEME,
				},
			],
			'A trou': [
				{
					description: 'Compléter une multiplication à trou',
					subdescription: 'Multiplication par $$0,5$$',
					enounces: ['Complète'],
					variables: [
						{
							'&1': '$e[1;20]',
						},
					],
					expressions: ['?*0,5=[._&1*0,5_]', '0,5*?=[._0,5*&1_]'],
					correctionDetails: [
						[
							{
								text: `$$\\textcolor{${correct_color}}{&1} \\times 0,5 = [._&1*0,5_]$$ car  $$[._&1*0,5_] \\times 2 = &sol$$`,
							},
						],
						[
							{
								text: `$$ 0,5 \\times \\textcolor{${correct_color}}{&1} = [._&1*0,5_]$$ car  $$[._&1*0,5_] \\times 2 = &sol$$`,
							},
						],
					],
					type: 'fill in',
					solutions: [['&1']],

					defaultDelay: 15,
					grade: SIXIEME,
				},
				{
					description: 'Compléter une multiplication à trou',
					subdescription: 'Multiplier un nombre décimal par $$0,5$$',
					enounces: ['Complète.'],
					variables: [
						{
							'&1': '$l{2;4;6;8}',
							'&2': '$e{1}',
							'&3': '[._&1+&2/10_]',
						},
					],
					expressions: ['?*0,5 = [._&3*0,5_]', '?*0,5 = [._0,5*&3_]'],
					correctionDetails: [
						[
							{
								text: '$$&sol \\times 0,5 = [._&3*0,5_]$$ car  $$[._&3*0,5_] \\times 2 = &sol$$',
							},
						],
						[
							{
								text: '$$0,5 \\times &sol  = [._&3*0,5_]$$ car  $$[._&3*0,5_] \\times 2 = &sol$$',
							},
						],
					],
					type: 'fill in',
					solutions: [['&3']],
					// 'result-type': 'decimal',
					defaultDelay: 15,
					grade: SIXIEME,
				},
				{
					description: 'Compléter une multiplication à trou',
					subdescription: 'Multiplier par $$10$$',
					enounces: ['Complète.'],
					variables: [
						{
							'&1': '$d{$e[0;2];$e[1;2]}',
						},
					],
					expressions: ['?*10=[._&1*10_]', '10*?=[._&1*10_]'],
					correctionDetails: [
						[
							{
								text: '$$&sol \\times 10 = [._&1*10_]$$ car  $$[._&1*10_] \\div 10 = &sol$$',
							},
						],
						[
							{
								text: '$$10 \\times &sol = [._&1*10_]$$ car  $$[._&1*10_] \\div 10 = &sol$$',
							},
						],
					],
					type: 'fill in',
					solutions: [['&1']],
					defaultDelay: 15,
					grade: CM1,
				},
				{
					description: 'Compléter une multiplication à trou',
					subdescription: 'Multiplier par $$100$$',
					enounces: ['Complète.'],
					variables: [
						{
							'&1': '$d{$e[0;2];$e[1;2]}',
						},
					],
					expressions: ['?*100 = [._&1*100_]', '100*? = [._&1*100_]'],
					correctionDetails: [
						[
							{
								text: `$$\\textcolor{${correct_color}}{[._&1_]} \\times 100 = [._&1*100_]$$ car  $$[._&1*100_] \\div 100 = &sol$$`,
							},
						],
						[
							{
								text: `$$100 \\times \\textcolor{${correct_color}}{[._&1_]} = [._&1*100_]$$ car  $$[._&1*100_] \\div 100 = &sol$$`,
							},
						],
					],
					type: 'fill in',
					solutions: [['&1']],
					// 'result-type': 'decimal',
					defaultDelay: 15,
					grade: CM1,
				},
				{
					description: 'Compléter une multiplication à trou',
					subdescription: 'Multiplier par $$1000$$',
					enounces: ['Complète.'],
					variables: [
						{
							'&1': '$d{$e[0;2];$e[1;2]}',
						},
					],
					expressions: ['?*1000 = [._&1*1000_]', '1000*? = [._&1*1000_]'],
					correctionDetails: [
						[
							{
								text: '$$&sol \\times 1000 = [._&1*1000_]$$ car  $$[._&1*1000_] \\div 1000 = &sol$$',
							},
						],
						[
							{
								text: '$$1000 \\times &sol = [._&1*1000_]$$ car  $$[._&1*1000_] \\div 1000 = &sol$$',
							},
						],
					],
					type: 'fill in',
					solutions: [['&1']],
					defaultDelay: 15,
					grade: CM1,
				},
				{
					description: 'Compléter une multiplication à trou',
					subdescription: 'Multiplier par $$10$$, $$100$$ ou $$1000$$',
					enounces: ['Complète.'],
					variables: [
						{
							'&1': '$e[1;3]',
							'&2': '$d{$e[0;4-&1];$e[1;4]}',
						},
					],
					expressions: [
						'?*[_10^&1_] = [._10^&1*&2_]',
						'[_10^&1_]*? = [._10^&1*&2_]',
					],
					correctionDetails: [
						[
							{
								text: `$$\\textcolor{${correct_color}}{[._&2_]} \\times [_10^&1_] = [._&2*10^&1_]$$ car  $$[._&2*10^&1_] \\div [_10^&1_] = &sol$$`,
							},
						],
						[
							{
								text: `$$[_10^&1_] \\times \\textcolor{${correct_color}}{[._&2_]} = [._&2*10^&1_]$$ car  $$[._&2*10^&1_] \\div [_10^&1_] = &sol$$`,
							},
						],
					],
					type: 'fill in',
					solutions: [['&2']],
					// 'result-type': 'decimal',
					defaultDelay: 20,
					grade: SIXIEME,
				},

				{
					description: 'Compléter une multiplication à trou',
					subdescription: 'Multiplier par $$0,1$$ un nombre décimal',
					enounces: ['Complète.'],
					variables: [
						{
							'&1': '$e[0;3]',
							'&2': '$e[1;2]',
							'&3': '$d{&1;&2}',
						},
					],
					expressions: ['?*0,1 = [._&3*0,1_]', '0,1*? = [._0,1*&3_]'],
					type: 'fill in',
					solutions: [['&3']],
					correctionDetails: [
						[
							{
								text: `$$\\textcolor{${correct_color}}{[._&3_]} \\times 0,1 = [._&3*0,1_]$$ car  $$[._&3*0,1_] \\times 10 = &sol$$`,
							},
						],
						[
							{
								text: `$$0,1 \\times \\textcolor{${correct_color}}{[._&3_]} = [._&3*0,1_]$$ car  $$[._&3*0,1_] \\times 10 = &sol$$`,
							},
						],
					],
					// 'result-type': 'decimal',
					defaultDelay: 15,
					grade: SIXIEME,
				},
				{
					description: 'Compléter une multiplication à trou',
					subdescription: 'Multiplier par $$0,01$$ un nombre décimal',
					enounces: ['Complète.'],
					variables: [
						{
							'&1': '$e[0;3]',
							'&2': '$e[1;2]',
							'&3': '$d{&1;&2}',
						},
					],
					correctionDetails: [
						[
							{
								text: `$$\\textcolor{${correct_color}}{[._&3_]} \\times 0,01 = [._&3*0,01_]$$ car  $$[._&3*0,01_] \\times 100 = &sol$$`,
							},
						],
						[
							{
								text: `$$0,01 \\times \\textcolor{${correct_color}}{[._&3_]} = [._&3*0,01_]$$ car  $$[._&3*0,01_] \\times 100 = &sol$$`,
							},
						],
					],
					expressions: ['?*0,01 = [._&3*0,01_]', '0,01*? = [._0,01*&3_]'],
					type: 'fill in',
					solutions: [['&3']],
					// 'result-type': 'decimal',
					defaultDelay: 15,
					grade: SIXIEME,
				},
				{
					description: 'Compléter une multiplication à trou',
					subdescription: 'Multiplier par $$0,001$$ un nombre décimal',
					enounces: ['Complète.'],
					variables: [
						{
							'&1': '$e[0;3]',
							'&2': '$e[1;1]',
							'&3': '$d{&1;&2}',
						},
					],
					expressions: ['?*0,001 = [._&3*0,001_]', '0,001*?=[._0,001*&3_]'],
					correctionDetails: [
						[
							{
								text: `$$\\textcolor{${correct_color}}{[._&3_]} \\times 0,001 = [._&3*0,001_]$$ car  $$[._&3*0,001_] \\times 1\\,000 = &sol$$`,
							},
						],
						[
							{
								text: `$$0,001 \\times \\textcolor{${correct_color}}{[._&3_]} = [._&3*0,001_]$$ car  $$[._&3*0,001_] \\times 1\\,000 = &sol$$`,
							},
						],
					],
					type: 'fill in',
					solutions: [['&3']],
					// 'result-type': 'decimal',
					defaultDelay: 15,
					grade: SIXIEME,
				},
				{
					description: 'Compléter une multiplication à trou',
					subdescription: 'Multiplier par $$0,1$$ ; $$0,01$$ ou $$0,001$$',
					enounces: ['Complète.'],
					variables: [
						{
							'&1': '$e[1;3]',
							'&2': '$d{$e[1;3];$e[1;4-&1]}',
						},
					],
					expressions: [
						'[._10^(-&1)_]*? = [._10^(-&1)*&2_]',
						'?*[._10^(-&1)_] = [._&2*10^(-&1)_]',
					],
					correctionDetails: [
						[
							{
								text: `$$[._10^(-&1)_] \\times &sol = [._&2*10^(-&1)_]$$ car  $$[._&2*10^(-&1)_] \\times [_10^&1_] = &sol$$`,
							},
						],
						[
							{
								text: `$$ &sol \\times [._10^(-&1)_] = [._&2*10^(-&1)_]$$ car  $$[._&2*10^(-&1)_] \\times [_10^&1_] = &sol$$`,
							},
						],
					],
					solutions: [['&2']],
					type: 'fill in',
					// 'result-type': 'decimal',
					defaultDelay: 20,
					grade: SIXIEME,
				},
			],
		},
		Diviser: {
			Quotient: [
				{
					description: 'Calculer un quotient',
					subdescription: 'Diviser par $$10$$',
					enounces: ['Calcule.'],
					variables: [
						{
							'&1': '$d{$e[0;3];$e[0;1]}',
						},
					],
					expressions: ['&1:10'],

					'result-type': 'decimal',
					defaultDelay: 15,
					grade: CM1,
				},
				{
					description: 'Calculer un quotient',
					subdescription: 'Diviser par $$100$$',
					enounces: ['Calcule.'],
					variables: [
						{
							'&1': '$d{$e[0;3];$e[0;1]}',
						},
					],
					expressions: ['&1:100'],

					'result-type': 'decimal',
					defaultDelay: 15,
					grade: CM2,
				},
				{
					description: 'Calculer un quotient',
					subdescription: 'Diviser par $$1000$$',
					enounces: ['Calcule.'],
					variables: [
						{
							'&1': '$e[0;4]',
							'&2': '$e{&1;&1}',
						},
					],
					expressions: ['&2:1000'],

					'result-type': 'decimal',
					defaultDelay: 15,
					grade: CM2,
				},
				{
					description: 'Calculer un quotient',
					subdescription: 'Diviser par $$10$$, $$100$$ ou $$1000$$',
					enounces: ['Calcule.'],
					variables: [
						{
							'&1': '$e[1;3]',
							'&2': '$d{$e[0;4];$e[0;4-&1]}',
						},
					],
					expressions: ['&2:[_10^&1_]'],

					'result-type': 'decimal',
					defaultDelay: 20,
					grade: CM2,
				},
				{
					description: 'Calculer un quotient',
					subdescription: 'Un nombre décimal par un entier',
					enounces: ['Calcule.'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
							'&3': '[._&1*&2/10_]:&2',
						},
					],
					expressions: ['&3'],
					correctionDetails: [
						[
							{
								text: '$$[._&1*&2/10_] \\div &2 = &sol $$ car $$ [._&3_] \\times &2 = [._&1*&2/10_]$$',
							},
						],
					],

					'result-type': 'decimal',
					defaultDelay: 15,
					grade: CM2,
				},

				{
					description: 'Calculer un quotient',
					subdescription: 'Diviser par $$0,1$$ ; $$0,01$$ ou $$0,001$$',
					enounces: ['Calcule.'],
					variables: [
						{
							'&1': '$d{$e[1;2];$e[0;3]}',
							'&2': '$l{0.1;0.01;0.001}',
							'&3': '$l{$e[1;9];$e[11;99];$e[101;999]}:1000',
						},
					],
					expressions: ['[._&3_]:&2', '&1:&2'],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} [._&3_] \\bold{\\textcolor{${color1}}{\\div [._&2_]}} &= [._&3_] \\bold{\\textcolor{${color1}}{\\times [._1:&2_]}} \\\\ &=  &sol \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} [._&1_] \\bold{\\textcolor{${color1}}{\\div [._&2_]}} &= [._&1_] \\bold{\\textcolor{${color1}}{\\times [._1:&2_]}} \\\\ &=  &sol \\end{align}$$`,
							},
						],
					],

					'result-type': 'decimal',
					defaultDelay: 20,
					grade: SIXIEME,
				},
				{
					description: 'Calculer un quotient',
					enounces: ['Calcule.'],
					subdescription: 'Deux nombres décimaux',
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
							'&3': '$l{0.1;0.01}',
						},
					],
					expressions: ['[._&1*&2*&3_]:[._&1*&3_]'],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} [._&1*&2*&3_] \\div [._&1*&3_] &= [._&1*&2_] \\div [._&1_] \\\\ &= &sol  \\end{align}$$',
							},
						],
					],

					'result-type': 'decimal',
					defaultDelay: 20,
					grade: SIXIEME,
				},
			],
			'A trou': [
				{
					description: 'Compléter une division a trou',
					subdescription: 'Diviser par $$10$$',
					enounces: ['Complète.'],
					variables: [
						{
							'&1': '$d{$e[0;3];$e[0;1]}',
						},
					],
					expressions: ['?:10 = [._&1:10_]'],
					type: 'fill in',
					solutions: [['&1']],
					// 'result-type': 'decimal',
					defaultDelay: 15,
					grade: CM1,
				},
				{
					description: 'Compléter une division a trou',
					subdescription: 'Diviser par $$100$$',
					enounces: ['Complète.'],
					variables: [
						{
							'&1': '$d{$e[0;3];$e[0;1]}',
						},
					],
					expressions: ['?:100 = [._&1:100_]'],
					type: 'fill in',
					solutions: [['&1']],
					// 'result-type': 'decimal',
					defaultDelay: 15,
					grade: CM2,
				},
				{
					description: 'Compléter une division a trou',
					subdescription: 'Diviser par $$1000$$',
					enounces: ['Complète.'],
					variables: [
						{
							'&1': '$e[0;4]',
							'&2': '$e{&1;&1}',
						},
					],
					expressions: ['?:1000 = [._&2:1000_]'],
					type: 'fill in',
					// 'result-type': 'decimal',
					solutions: [['&2']],
					defaultDelay: 15,
					grade: CM2,
				},
				{
					description: 'Compléter une division a trou',
					subdescription: 'Diviser par $$10$$, $$100$$ ou $$1000$$',
					enounces: ['Complète.'],
					variables: [
						{
							'&1': '$e[1;3]',
							'&2': '$d{$e[0;4];$e[0;4-&1]}',
						},
					],
					expressions: ['?:[_10^&1_]=[._&2:10^&1_]'],
					type: 'fill in',
					solutions: [['&2']],
					// 'result-type': 'decimal',
					defaultDelay: 20,
					grade: CM2,
				},

				{
					description: 'Compléter une division a trou',
					subdescription: 'Diviser par $$0,1$$ ; $$0,01$$ ou $$0,001$$',
					enounces: ['Complète.'],
					variables: [
						{
							'&1': '$d{$e[1;2];$e[0;3]}',
							'&2': '$l{0.1;0.01;0.001}',
							'&3': '$l{$e[1;9];$e[11;99];$e[101;999]}:1000',
						},
					],
					expressions: ['?:[._&2_] = [._&3:&2_]', '?:[._&2_] = [._&1:&2_]'],
					type: 'fill in',
					solutions: [['[._&3_]'], ['&1']],
					// 'result-type': 'decimal',
					defaultDelay: 20,
					grade: SIXIEME,
				},
			],
		},
	},
	Relatifs: {
		Apprivoiser: {
			"La définition d'un nombre négatif": [
				{
					description: 'Une soustraction enfin possible',
					enounces: ['Ecris le résultat de :'],
					expressions: ['0-&1'],
					variables: [{ '&1': '$e[2;20]' }],
					options: ['require-no-null-terms'],
					defaultDelay: 20,
					grade: CINQUIEME,
				},
				{
					description: 'Nombre négatif défini par une soustraction',
					enounces: ['Ecris la soustraction définissant le nombre :'],
					expressions: ['-&1'],
					options: ['no-penalty-for-null-terms', 'one-single-form-solution'],
					variables: [{ '&1': '$e[2;20]' }],
					solutions: [['0-&1']],
					correctionFormat: [
						{
							correct: ['$$-&1=&ans$$'],
						},
					],
					defaultDelay: 20,
					grade: CINQUIEME,
				},
				{
					description: "Trouver l'opposé d'un nombre :",
					enounces: ['Complète :'],
					answerFields: [
						"L'opposé de $$&1$$ est $$...$$",
						"L'opposé de $$-&1$$ est $$...$$",
					],
					variables: [{ '&1': '$e[1;20]' }],
					solutions: [['-&1'], ['&1']],
					correctionFormat: [
						{
							correct: ["L'opposé de $$&1$$ est &answer"],
						},
						{
							correct: ["L'opposé de $$-&1$$ est &answer"],
						},
					],
					
					defaultDelay: 20,
					grade: CINQUIEME,
				},
			],
			Comparer: [
				{
					description: 'Comparer deux nombres relatifs.',
					subdescription: 'Valeurs entières - qcm',
					enounces: ['Quel est le plus petit de ces 2 nombres ?'],
					variables: [{ '&1': '$e[1;19]', '&2': '$e[&1+1;20]' }],
					choices: [
						[{ text: '$$&1$$' }, { text: '$$-&2$$' }],
						[{ text: '$$-&1$$' }, { text: '$$-&2$$' }],
						[{ text: '$$-&2$$' }, { text: '$$-&1$$' }],
					],
					solutions: [[1], [1], [0]],
					defaultDelay: 20,
					grade: CINQUIEME,
				},
				// {
				// 	description: 'Comparer deux nombres relatifs.',
				// 	subdescription: 'Valeurs entières - à compléter',
				// 	enounces: ['Complète avec $$\\lt$$ ou $$\\gt$$ :'],
				// 	variables: [{ '&1': '$e[1;19]', '&2': '$e[&1+1;20]' }],
				// 	answerFields: [
				// 		'$$&1 ... -&2$$',
				// 		'$$-&1 ... -&2$$',
				// 		'$$-&2 ... -&1$$',
				// 	],
				// 	testAnswers: [
				// 		['&1 &answer -&2'],
				// 		['-&1 &answer -&2'],
				// 		['-&2 &answer -&1'],
				// 	],
				// 	solutions: [
				// 		['&1 < -&2 ?? < :: >'],
				// 		['-&1 < -&2 ?? < :: >'],
				// 		['-&2 < -&1 ?? < :: >'],
				// 	],
				// 	correctionFormat: [
				// 		{
				// 			correct: ['$$&1 &ans -&2$$'],
				// 		},
				// 		{
				// 			correct: ['$$-&1 &ans -&2$$'],
				// 		},
				// 		{
				// 			correct: ['$$-&2 &ans -&1$$'],
				// 		},
				// 	],
				// 	type: 'fill in',
				// 	defaultDelay: 20,
				// 	grade: CINQUIEME,
				// },
				{
					description: 'Comparer deux nombres relatifs.',
					subdescription: 'Valeurs décimales.',
					enounces: ['Quel est le plus petit de ces 2 nombres ?'],
					variables: [
						{
							'&1': '$e{1}',
							'&2': '$e[1;2]',
							'&3': '$e{&2;&2}\\{m(10)}',
							'&4': '$e{1;1}\\{&3}',
							'&6': '[._-&1,&3_]',
							'&7': '[._-&1,&4_]',
						},
						{
							'&1': '$er{1}',
							'&2': '$er{1}',
							'&3': '$e[1;2]',
							'&4': '$e{&3;&3}\\{m(10)}',
							'&5': '$e{1}\\{&4}',
							'&6': '[._&1,&4_]',
							'&7': '[._&2,&5_]',
						},
					],
					choices: [[{ text: '$$[._&6_]$$' }, { text: '$$[._&7_]$$' }]],
					solutions: [['&6<&7 ?? 0 :: 1']],
					defaultDelay: 20,
					grade: CINQUIEME,
				},
				// {
				// 	description: 'Comparer deux nombres relatifs.',
				// 	subdescription: 'Valeurs décimales - à compléter',
				// 	enounces: ['Complète avec $$\\lt$$ ou $$\\gt$$ :'],
				// 	variables: [
				// 		{
				// 			'&1': '$e{1}',
				// 			'&2': '$e[1;2]',
				// 			'&3': '$e{&2;&2}\\{m(10)}',
				// 			'&4': '$e{1;1}\\{&3}',
				// 			'&6': '[._-&1,&3_]',
				// 			'&7': '[._-&1,&4_]',
				// 		},
				// 		{
				// 			'&1': '$er{1}',
				// 			'&2': '$er{1}',
				// 			'&3': '$e[1;2]',
				// 			'&4': '$e{&3;&3}\\{m(10)}',
				// 			'&5': '$e{1}\\{&4}',
				// 			'&6': '[._&1,&4_]',
				// 			'&7': '[._&2,&5_]',
				// 		},
				// 	],

				// 	answerFields: ['$$[._&6_] ... [._&7_]$$'],
				// 	testAnswers: [['&6 &answer &7']],
				// 	solutions: [['&6 < &7 ?? < :: >']],
				// 	correctionFormat: [
				// 		{
				// 			correct: ['$$[._&6_] &ans [._&7_]$$'],
				// 		},
				// 	],
				// 	type: 'fill in',
				// 	defaultDelay: 20,
				// 	grade: CINQUIEME,
				// },
			],
		},
		'Additionner et soustraire': {
			'Sur la droite graduée': [
				{
					description: 'Calculer une somme ou une différence',
					subdescription:
						"A l'aide de la droite graduée, entre $$-4$$ et $$4$$.",
					enounces: ["Calcule en t'aidant de la droite graduée."],
					expressions: ['(-&1)+&2', '(-&1)-&2', '&1-&2'],
					variables: [
						{ '&1': '$e[1;4]', '&2': '$e[1;4]' },
						{ '&1': '$e[1;3]', '&2': '$e[1;4-&1]' },
						{ '&1': '$e[1;3]', '&2': '$e[&1+1;4]' },
					],
					images: [
						'relatifs/droite-graduee-operations/droite-graduee--4-4-600.png',
					],

					defaultDelay: 20,
					grade: CINQUIEME,
				},
				{
					description: 'Calculer une somme ou une différence',
					subdescription:
						"A l'aide de la droite graduée, entre $$-7$$ et $$7$$.",
					enounces: ["Calcule en t'aidant de la droite graduée."],
					expressions: ['(-&1)+&2', '(-&1)-&2', '&1-&2'],
					variables: [
						{ '&1': '$e[1;7]', '&2': '$e[1;8]' },
						{ '&1': '$e[1;6]', '&2': '$e[1;7-&1]' },
						{ '&1': '$e[1;7]', '&2': '$e[&1+1;8]' },
					],
					images: [
						'relatifs/droite-graduee-operations/droite-graduee--7-7-600.png',
					],

					defaultDelay: 20,
					grade: CINQUIEME,
				},
				{
					description: 'Compléter une adition à trou',
					subdescription:
						"Relatifs entre $$-4$$ et $$4$$. A l'aide de la droite graduée.",
					enounces: ["Complète en t'aidant de la droite graduée."],
					expressions: [
						'(-&1)+? = [_(-&1)+&2_]',
						'(-&1)-? = [_(-&1)-&2_]',
						'&1-? = [_&1-&2_]',
					],
					variables: [
						{ '&1': '$e[1;4]', '&2': '$e[1;4]' },
						{ '&1': '$e[1;3]', '&2': '$e[1;4-&1]' },
						{ '&1': '$e[1;3]', '&2': '$e[&1+1;4]' },
					],
					images: [
						'relatifs/droite-graduee-operations/droite-graduee--4-4-600.png',
					],

					type: 'fill in',
					solutions: [['&2']],
					options: [
						'no-penalty-for-extraneous-brackets-in-first-negative-term',
					],
					defaultDelay: 20,
					grade: CINQUIEME,
				},
				{
					description: 'Compléter une adition à trou',
					subdescription:
						"Relatifs entre $$-7$$ et $$7$$. A l'aide de la droite graduée.",
					enounces: ["Complète en t'aidant de la droite graduée."],
					expressions: [
						'(-&1)+?= [_(-&1)+&2_]',
						'(-&1)-?=[_(-&1)-&2_]',
						'&1-?=[_&1-&2_]',
					],
					variables: [
						{ '&1': '$e[1;7]', '&2': '$e[1;8]' },
						{ '&1': '$e[1;6]', '&2': '$e[1;7-&1]' },
						{ '&1': '$e[1;7]', '&2': '$e[&1+1;8]' },
					],
					images: [
						'relatifs/droite-graduee-operations/droite-graduee--7-7-600.png',
					],
					type: 'fill in',
					solutions: [['&2']],
					options: [
						'no-penalty-for-extraneous-brackets-in-first-negative-term',
					],
					defaultDelay: 20,
					grade: CINQUIEME,
				},
				{
					description: 'Calculer une somme ou une différence',
					subdescription:
						"A l'aide de la droite graduée, entre $$-4$$ et $$4$$, nombres en $${,}5$$",
					enounces: ["Calcule en t'aidant de la droite graduée."],
					expressions: ['(-&1,5)+&2', '(-&1,5)-&2', '&1,5-&2'],
					variables: [
						{ '&1': '$e[1;3]', '&2': '$e[1;4]' },
						{ '&1': '$e[1;2]', '&2': '$e[1;3-&1]' },
						{ '&1': '$e[1;2]', '&2': '$e[&1+1;4]' },
					],
					images: [
						'relatifs/droite-graduee-operations/droite-graduee--4-4-600.png',
					],
					'result-type': 'decimal',
					defaultDelay: 20,
					grade: CINQUIEME,
				},
			],
			Sommes: [
				{
					description: 'Ajouter $$1$$ ou $$2$$ à un nombre négatif',
					expressions: ['(-&1)+1', '(-&1)+2'],
					enounces: ['Calcule.'],
					variables: [{ '&1': '$e[3;9]' }],

					defaultDelay: 20,
					grade: CINQUIEME,
				},
				{
					description: 'Ajouter $$2$$ nombres opposés',
					expressions: ['(-&1)+&1', '&1+(-&1)'],
					enounces: ['Calcule.'],
					variables: [{ '&1': '$e[1;15]' }],

					defaultDelay: 20,
					grade: CINQUIEME,
				},
				{
					description:
						'Ajouter un nombre positif à un nombre négatif en dépassant $$0$$',
					expressions: ['(-&1)+[_&1+&2_]'],
					enounces: ['Calcule.'],
					variables: [{ '&1': '$e[1;8]', '&2': '$e[1;9-&1]' }],
					correctionDetails: [
						[
							{
								text: `$$(-&1)+\\bold{\\textcolor{${color1}}{[_&1+&2_]}}=(-&1)+\\textcolor{${color1}}{&1+&2}=0+&2=&2$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: CINQUIEME,
				},
				{
					description: 'Ajouter deux nombres négatifs',
					expressions: ['(-&1)+(-&2)'],
					enounces: ['Calcule.'],
					variables: [{ '&1': '$e[1;9]', '&2': '$e[1;9]' }],
					defaultDelay: 20,
					grade: CINQUIEME,
				},
				{
					description: "Déterminer le signe d'une somme",
					expressions: [
						'(-&1)+&2',
						'(-&2)+&1',
						'(-&1)+(-&2)',
						'&1+(-&2)',
						'&2+(-&1)',
					],
					enounces: ['Quel est le signe de cette somme ?'],
					variables: [
						{ '&1': '$e[30;99]', '&2': '$e[1;&1-1]' },
						{ '&1': '$e[30;99]', '&2': '$e[1;&1-1]' },
						{ '&1': '$e[30;99]', '&2': '$e[30;99]' },
						{ '&1': '$e[30;99]', '&2': '$e[1;&1-1]' },
						{ '&1': '$e[30;99]', '&2': '$e[1;&1-1]' },
					],
					choices: [[{ text: 'positif' }, { text: 'négatif' }]],
					solutions: [[1], [0], [1], [0], [1]],
					correctionDetails: [
						[
							{
								text: `$$&1>&2$$ donc le résultat de &expression est du signe de $$-&1$$ c'est-à-dire &solution`,
							},
						],
						[
							{
								text: `$$&1>&2$$ donc le résultat de &expression est du signe de $$&1$$ c'est-à-dire &solution`,
							},
						],
						[
							{
								text: `$$&1>&2$$ donc le résultat de &expression est du signe de $$-&1$$ c'est-à-dire &solution`,
							},
						],
						[
							{
								text: `$$&1>&2$$ donc le résultat de &expression est du signe de $$&1$$ c'est-à-dire &solution`,
							},
						],
						[
							{
								text: `$$&1>&2$$ donc le résultat de &expression est du signe de $$-&1$$ c'est-à-dire &solution`,
							},
						],
					],
					options: ['no-shuffle-choices'],
					defaultDelay: 20,
					grade: CINQUIEME,
				},
				{
					description: 'Calculer une somme',
					subdescription: 'Cas général',
					enounces: ['Calcule.'],
					expressions: ['(-&1)+&2', '(-&1)+(-&2)', '&1+(-&2)'],
					variables: [{ '&1': '$e[2;9]', '&2': '$e[2;9]' }],

					defaultDelay: 20,
					grade: CINQUIEME,
				},
				{
					description: 'Compléter une somme',
					subdescription: 'Cas général',
					enounces: ["Complète l'égalité avec le nombre manquant."],
					expressions: [
						'(-&1)+?=[_(-&1)+&2_]',
						'(-&1)+?=[_(-&1)+(-&2)_]',
						'&1+?=[_&1+(-&2)_]',
						'?+(-&1)=[_(-&1)+&2_]',
						'?+(-&1)=[_(-&1)+(-&2)_]',
						'?+&1=[_&1+(-&2)_]',
					],
					variables: [{ '&1': '$e[2;9]', '&2': '$e[2;9]' }],
					solutions: [
						['&2'],
						['(-&2)'],
						['(-&2)'],
						['&2'],
						['(-&2)'],
						['(-&2)'],
					],
					type: 'fill in',
					options: [
						'no-penalty-for-extraneous-brackets-in-first-negative-term',
					],
					defaultDelay: 20,
					grade: CINQUIEME,
				},
			],
			Différences: [
				{
					description: 'Enlever $$1$$ ou $$2$$ à un nombre négatif',
					expressions: ['(-&1)-1', '(-&1)-2'],
					enounces: ['Calcule.'],
					variables: [{ '&1': '$e[1;7]' }],

					defaultDelay: 20,
					grade: CINQUIEME,
				},

				{
					description:
						'Enlever un nombre positif à un nombre positif en dépassant $$0$$',
					expressions: ['&1-[_&1+&2_]'],
					enounces: ['Calcule.'],
					variables: [{ '&1': '$e[1;8]', '&2': '$e[1;9-&1]' }],
					correctionDetails: [
						[
							{
								text: `$$&1\\bold{\\textcolor{${color1}}{-[_&1+&2_]}}=&1\\textcolor{${color1}}{-&1-&2}=0-&2=-&2$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: CINQUIEME,
				},
				{
					description: 'Transformer une soustraction en addition',
					enounces: ['Réécris cette soustraction en une addition équivalente.'],
					expressions: ['(-&1)-(-&2)', '&1-(-&2)', '&1-&2', '(-&1)-&2'],
					variables: [{ '&1': '$e[2;9]', '&2': '$e[2;9]' }],
					solutions: [['-&1+&2'], ['&1+&2'], ['&1+(-&2)'], ['-&1+(-&2)']],

					options: ['no-penalty-for-extraneous-signs'],
					defaultDelay: 20,
					grade: CINQUIEME,
				},
				{
					description: 'Soustraire (cas général)',
					enounces: ['Calcule.'],
					expressions: ['(-&1)-(-&2)', '&1-(-&2)', '&1-&2', '(-&1)-&2'],
					variables: [{ '&1': '$e[2;9]', '&2': '$e[2;9]' }],
					defaultDelay: 20,
					grade: CINQUIEME,
				},
			],
			'Sommes algébriques': [
				{
					description: "Simplifier l'écriture",
					enounces: ['Simplifie les doubles signes de cette expression.'],
					expressions: ['-&1+(-&2)', '&1+(-&2)', '-&1-(-&2)', '&1-(-&2)'],
					variables: [{ '&1': '$e[2;9]', '&2': '$e[2;9]' }],
					solutions: [['-&1-&2'], ['&1-&2'], ['-&1+&2'], ['&1+&2']],

					options: ['require-no-extraneaous-signs'],
					defaultDelay: 20,
					grade: CINQUIEME,
				},
				{
					description: 'Calculer',
					subdescription: 'Avec écriture simplifiée',
					enounces: ['Calcule.'],
					expressions: ['-&1+&2', '-&1-&2', '&3-&1'],
					variables: [{ '&1': '$e[2;9]', '&2': '$e[2;9]', '&3': '$e[1;&1-1]' }],

					defaultDelay: 20,
					grade: CINQUIEME,
				},
				{
					description: 'Compléter une égalité',
					subdescription: 'Avec écriture simplifiée',
					enounces: ['Complète.'],
					expressions: [
						'-&1+?= [_-&1+&2_]',
						'-&1-?= [_-&1-&2_]',
						'&3-? = [_&3-&1_]',
					],
					variables: [{ '&1': '$e[2;9]', '&2': '$e[2;9]', '&3': '$e[1;&1-1]' }],
					type: 'fill in',
					solutions: [['&2'], ['&2'], ['&1']],
					defaultDelay: 20,
					grade: CINQUIEME,
				},
				{
					description: 'Calculer une somme algébrique',
					subdescription: 'Avec écriture simplifiée',
					enounces: ['Calcule.'],
					expressions: ['[_&1_][+_&2_][+_&3_][+_&4_]'],
					variables: [
						{
							'&1': '$er[2;9]',
							'&2': '$er[2;9]',
							'&3': '$er[2;9]',
							'&4': '$er[2;9]',
						},
					],
					conditions: [
						'abs(&1)/(&1)+abs(&2)/(&2)+abs(&3)/(&3)+abs(&4)/(&4)>-4 && abs(&1)/(&1)+abs(&2)/(&2)+abs(&3)/(&3)+abs(&4)/(&4)<4 ',
					],
					defaultDelay: 20,
					grade: CINQUIEME,
				},
			],
		},
		'Multiplier et Diviser': {
			Produit: [
				{
					description: "Déterminer le signe d'un produit",
					subdescription: '$$2$$ facteurs',
					enounces: ['Quel est le signe de ce produit ?'],
					expressions: ['(&1)*(&2)'],
					conditions: ['&1<=0 || &2<=0'],
					variables: [{ '&1': '$er[30;99]', '&2': '$er[30;99]' }],
					choices: [[{ text: 'positif' }, { text: 'négatif' }]],
					correctionFormat: [
						{
							correct: ['Le produit est &answer'],
						},
					],
					solutions: [['(&1)*(&2) >0 ?? 0 :: 1']],
					options: ['no-shuffle-choices', 'exp-remove-unecessary-brackets'],
					defaultDelay: 20,
					grade: QUATRIEME,
				},
				{
					description: "Déterminer le signe d'un facteur",
					enounces: ['Quel est le signe du facteur manquant ?'],
					expressions: [
						'(-&1)*?=&2',
						'(-&1)*?=-&2',
						'&1*?=-&2',
						'&1*?=&2',
						'?*(-&1)=&2',
						'?*(-&1)=-&2',
						'?*&1=-&2',
						'?*&1=&2',
					],
					variables: [{ '&1': '$e[30;99]', '&2': '$e[30;99]' }],
					choices: [[{ text: 'positif' }, { text: 'négatif' }]],
					corrections: [
						"Dans l'égalité $$(-&1) \\times \\ldots=&2$$, le facteur manquant est ",
						"Dans l'égalité $$(-&1) \\times \\ldots=-&2$$, le facteur manquant est ",
						"Dans l'égalité $$&1 \\times \\ldots=-&2$$, le facteur manquant est ",
						"Dans l'égalité $$&1 \\times \\ldots=&2$$, le facteur manquant est ",
						"Dans l'égalité $$\\ldots \\times (-&1)  = &2$$, le facteur manquant est ",
						"Dans l'égalité $$\\ldots \\times (-&1) = -&2$$, le facteur manquant est ",
						"Dans l'égalité $$\\ldots \\times &1 = -&2$$, le facteur manquant est ",
						"Dans l'égalité $$\\ldots \\times &1 = &2$$, le facteur manquant est ",
					],
					solutions: [[1], [0], [1], [0], [1], [0], [1], [0]],
					defaultDelay: 20,
					grade: QUATRIEME,
				},

				{
					description: "Déterminer le signe d'un produit",
					subdescription: '$$3$$ facteurs',
					enounces: ['Quel est le signe de ce produit ?'],
					expressions: ['(&1)*(&2)*(&3)'],
					variables: [
						{ '&1': '$er[30;99]', '&2': '$er[30;99]', '&3': '$er[30;99]' },
					],
					choices: [[{ text: 'positif' }, { text: 'négatif' }]],
					correctionFormat: [
						{
							correct: ['Le produit est &answer'],
						},
					],
					solutions: [['(&1)*(&2)*(&3) >0 ?? 0 :: 1']],
					options: ['no-shuffle-choices', 'exp-remove-unecessary-brackets'],
					defaultDelay: 20,
					grade: QUATRIEME,
				},
				{
					description: "Déterminer le signe d'un produit",
					subdescription: '$$4$$ facteurs',
					enounces: ['Quel est le signe de ce produit ?'],
					expressions: ['(&1)*(&2)*(&3)*(&4)'],
					variables: [
						{
							'&1': '$er[30;99]',
							'&2': '$er[30;99]',
							'&3': '$er[30;99]',
							'&4': '$er[30;99]',
						},
					],
					choices: [[{ text: 'positif' }, { text: 'négatif' }]],
					correctionFormat: [
						{
							correct: ['Le produit est &answer'],
						},
					],
					solutions: [['(&1)*(&2)*(&3)*(&4) >0 ?? 0 :: 1']],
					options: ['no-shuffle-choices', 'exp-remove-unecessary-brackets'],
					defaultDelay: 20,
					grade: QUATRIEME,
				},

				{
					description: 'Calculer un produit',
					expressions: ['(-&1)*&2', '(-&1)*(-&2)', '&1*(-&2)'],
					enounces: ['Calcule.'],
					variables: [{ '&1': '$e[2;9]', '&2': '$e[2;9]' }],

					defaultDelay: 20,
					grade: QUATRIEME,
				},
				{
					description: 'Compléter une multiplication à trou',
					enounces: ['Complète.'],
					expressions: [
						'(-&1)*?=[_-&1*&2_]',
						'(-&1)*?=[_(-&1)*(-&2)_]',
						'&1*?=[_&1*(-&2)_]',
						'?*(-&1)=[_-&1*&2_]',
						'?*(-&1)=[_(-&1)*(-&2)_]',
						'?*&1=[_&1*(-&2)_]',
					],
					variables: [{ '&1': '$e[2;9]', '&2': '$e[2;9]' }],
					solutions: [
						['&2'],
						['(-&2)'],
						['(-&2)'],
						['&2'],
						['(-&2)'],
						['(-&2)'],
					],
					type: 'fill in',
					defaultDelay: 20,
					grade: QUATRIEME,
				},
			],
			Carré: [
				{
					description: "Carré et opposé d'un carré",
					enounces: ['Calcule.'],
					expressions: ['(&1)^2', '-&1^2'],

					variables: [{ '&1': '-$e[1;9]' }, { '&1': '$e[1;9]' }],
					correctionDetails: [
						[{ text: '$$(&1)^2=(&1)\\times(&1)=&sol$$' }],
						[
							{
								text: '$$-&1^2=-&1 \\times &1=&sol$$',
							},
						],
					],

					defaultDelay: 15,
					grade: QUATRIEME,
				},
			],
			Quotient: [
				{
					description: "Déterminer le signe d'un quotient",
					enounces: ['Quel est le signe de ce quotient ?'],
					expressions: ['(&1):(&2)'],
					variables: [{ '&1': '$er[30;99]', '&2': '$er[30;99]' }],
					conditions: ['&1<=0 || &2<0'],
					choices: [[{ text: 'positif' }, { text: 'négatif' }]],
					correctionFormat: [
						{
							correct: ['Le produit est &answer'],
						},
					],
					solutions: [['(&1):(&2)>0 ?? 0 :: 1']],
					options: ['no-shuffle-choices', 'exp-remove-unecessary-brackets'],
					defaultDelay: 20,
					grade: QUATRIEME,
				},
				{
					description: 'Déterminer le signe dans un quotient',
					enounces: ['Quel est le signe du nombre manquant ?'],
					expressions: ['(&1):?=(&2)', '?:(&1)=(&2)'],
					variables: [{ '&1': '$er[30;99]', '&2': '$er[30;99]' }],
					conditions: ['&1<=0 || &2<0'],
					choices: [[{ text: 'positif' }, { text: 'négatif' }]],
					correctionFormat: [
						{
							correct: ['Le facteur manquant est &answer'],
						},
					],
					solutions: [['(&1)*(&2)>0 ?? 0 :: 1']],
					options: ['no-shuffle-choices', 'exp-remove-unecessary-brackets'],
					defaultDelay: 20,
					grade: QUATRIEME,
				},
				{
					description: 'Diviser',
					enounces: ['Calcule.'],
					expressions: [
						'(-[_&1*&2_]):&2',
						'(-[_&1*&2_]):(-&2)',
						'[_&1*&2_]:(-&2)',
					],
					variables: [{ '&1': '$e[2;9]', '&2': '$e[2;9]' }],

					defaultDelay: 20,
					grade: QUATRIEME,
				},
				{
					description: 'Compléter une division à trou',
					subdescription: 'Nombres relatifs',
					enounces: ['Complète.'],
					expressions: [
						'(-[_&1*&2_]):? = -&1 ',
						'(-[_&1*&2_]):?= &1',
						'[_&1*&2_]:? = -&1',
						'?:&2 = -&1 ',
						'?:(-&2)= &1',
						'?:(-&2) = -&1',
					],
					variables: [{ '&1': '$e[2;9]', '&2': '$e[2;9]' }],
					type: 'fill in',
					solutions: [
						['&2'],
						['(-&2)'],
						['(-&2)'],
						['(-[_&1*&2_])'],
						['(-[_&1*&2_])'],
						['[_&1*&2_]'],
					],
					defaultDelay: 20,
					grade: QUATRIEME,
				},
			],
		},
	},
	Fractions: {
		Apprivoiser: {
			Définition: [
				{
					description: 'Définition par quotient',
					subdescription: '$$?*b=a$$',
					enounces: ['Détermine le facteur manquant.'],
					expressions: ['&2*?=&1', '?*&2=&1'],
					variables: [{ '&1': '$e[2;19]', '&2': '$e[2;19]\\{cd(&1)}' }],
					solutions: [['&1/&2']],
					type: 'fill in',
					correctionDetails: [
						[
							{
								text: "Dans $$&2 \\times \\cdots = &1$$, le nombre cherché est le résultat de $$&1 \\div &2$$ qui s'écrit $$&sol $$ car on ne peut pas le mettre sous forme décimale.",
							},
						],
						[
							{
								text: "Dans $$ \\cdots \\times &2 = &1$$, le nombre cherché est le résultat de $$&1 \\div &2$$ qui s'écrit $$&sol $$ car on ne peut pas le mettre sous forme décimale.",
							},
						],
					],
					defaultDelay: 20,
					grade: SIXIEME,
				},
				{
					description: 'Définition par quotient',
					subdescription: '$$a/b*a=?$$',
					enounces: ['Calculer.'],
					expressions: ['{&2/&1}*&1', '&1*{&2/&1}'],
					variables: [
						{ '&1': '$l{3;6;7;9;11;12;13}', '&2': '$e[2;10]\\{cd(&1)}' },
					],
					correctionDetails: [
						[
							{
								text: `$$\\textcolor{${color1}}{\\dfrac{&2}{&1}} \\times &1=&sol $$ désigne le résultat de la division $$\\textcolor{${color1}}{&2 \\div &1}$$ et $$\\textcolor{${color1}}{&2 \\div &1} \\times &1 = &2$$.`,
							},
						],
						[
							{
								text: `$$&1 \\times \\textcolor{${color1}}{\\dfrac{&2}{&1}} =&sol $$ désigne le résultat de la division $$\\textcolor{${color1}}{&2 \\div &1}$$ et $$&1 \\times \\textcolor{${color1}}{&2 \\div &1} = &2$$.`,
							},
						],
					],

					defaultDelay: 10,
					grade: SIXIEME,
				},
			],
			Décomposition: [
				{
					description: 'Décomposer une fraction',
					subdescription:
						"Une fraction décimale (jusqu'aux centièmes) en une somme d'un entier et d'une fraction décimale inférieure à $$1$$",
					enounces: [
						"Décomposer cette fraction en une somme d'un entier et d'une fraction décimale inférieure à $$1$$, comme dans l'exemple : $$345/100 = 3 + 45/100$$. ",
					],
					expressions: ['[_&1*&2+&3_]/&1'],
					variables: [
						{ '&1': '$l{10;100}', '&2': '$e[2;9]', '&3': '$e[1;&1-1]' },
					],
					solutions: [['&2+&3/&1']],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} \\dfrac{[_&1*&2+&3_]}{&1} &= \\dfrac{[_&1*&2_]}{&1} + \\dfrac{&3}{&1} \\\\ &= &sol  \\end{align}$$',
							},
						],
					],
					options: ['no-penalty-for-non-reduced-fractions'],
					defaultDelay: 30,
					grade: CM1,
				},
				{
					description: 'Décomposer une fraction',
					subdescription:
						"Une fraction décimale (jusqu'aux millièmes) en une somme d'un entier et d'une fraction décimale inférieure à $$1$$",
					enounces: [
						"Décomposer cette fraction en une somme d'un entier et d'une fraction décimale inférieure à $$1$$, comme dans l'exemple : $$3456/1000 = 3 + 456/1000$$.",
					],
					expressions: ['[_&1*&2+&3_]/&1'],
					variables: [
						{ '&1': '$l{10;100;1000}', '&2': '$e[2;9]', '&3': '$e[1;&1-1]' },
					],
					solutions: [['&2+&3/&1']],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} \\dfrac{[_&1*&2+&3_]}{&1} &= \\dfrac{[_&1*&2_]}{&1} + \\dfrac{&3}{&1} \\\\ &= &sol  \\end{align}$$',
							},
						],
					],
					options: ['no-penalty-for-non-reduced-fractions'],
					defaultDelay: 30,
					grade: CM2,
				},
				{
					description: 'Décomposer une fraction',
					subdescription:
						"Une fraction  en une somme d'un entier et d'une fraction inférieure à $$1$$",
					enounces: [
						"Décomposer cette fraction en une somme d'un entier et d'une fraction inférieure à $$1$$, comme dans l'exemple : $$14/3 = 4 + 2/3$$",
					],
					expressions: ['[_&1*&2+&3_]/&1'],
					variables: [{ '&1': '$e[2;9]', '&2': '$e[2;9]', '&3': '$e[1;&1-1]' }],
					solutions: [['&2+&3/&1']],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} \\dfrac{[_&1*&2+&3_]}{&1} &= \\dfrac{[_&1*&2_]}{&1} + \\dfrac{&3}{&1} \\\\ &= &sol  \\end{align}$$',
							},
						],
					],
					options: ['no-penalty-for-non-reduced-fractions'],
					defaultDelay: 30,
					grade: CM2,
				},
			],
			'Forme décimale': [
				{
					description: "Forme décimale d'une fraction",
					subdescription: 'Dixièmes',
					enounces: ['Ecris la forme décimale de la fraction'],
					expressions: ['&1/10'],
					variables: [{ '&1': '$e[0;9]' }],

					'result-type': 'decimal',
					defaultDelay: 20,
					grade: CM1,
				},
				{
					description: "Forme décimale d'une fraction",
					subdescription: 'Centièmes',
					enounces: ['Ecris la forme décimale de la fraction'],
					expressions: ['&1/100'],
					variables: [{ '&1': '$e[0;9]' }],

					'result-type': 'decimal',
					defaultDelay: 20,
					grade: CM1,
				},

				{
					description: "Forme décimale d'une fraction",
					subdescription: 'Centièmes (2)',
					enounces: ['Ecris la forme décimale de la fraction'],
					expressions: ['[_&1_]/100'],
					variables: [{ '&1': '$e[1;9]*10+$e[1;9]' }],

					'result-type': 'decimal',
					defaultDelay: 20,
					grade: CM1,
				},

				{
					description: "Forme décimale d'une fraction",
					subdescription: "Fraction décimale jusqu'au centième",
					enounces: ['Ecris la forme décimale de la fraction'],
					expressions: ['&2/[_&3_]'],
					variables: [
						{
							'&1': '$e[2;4]', // nombre de chiffre au numérateur
							'&2': '$e{&1;&1}', // numérateur
							'&3': '10^$e[1;2]', // dénominateur
						},
					],

					'result-type': 'decimal',
					defaultDelay: 20,
					grade: CM1,
				},
				{
					description: "Déterminer la forme décimale d'une fraction",
					subdescription: 'Cas à connaître par coeur',
					enounces: ['Ecris la forme décimale de la fraction'],
					expressions: ['&1'],
					variables: [
						{ '&1': '$l{1/2;1/4;1/10;2/10;3/2;5/2;1/100;2/1000;7/2;9/2}' },
					],

					'result-type': 'decimal',
					defaultDelay: 20,
					grade: CM1,
				},
				{
					description: "Forme décimale d'une fraction",
					subdescription: 'Millièmes',
					enounces: ['Ecris la forme décimale de la fraction'],
					expressions: ['&1/1000'],
					variables: [{ '&1': '$e[0;9]' }],

					'result-type': 'decimal',
					defaultDelay: 20,
					grade: CM2,
				},
				{
					description: "Forme décimale d'une fraction",
					subdescription: 'Millièmes (2)',
					enounces: ['Ecris la forme décimale de la fraction'],
					expressions: ['[_&1_]/1000'],
					variables: [{ '&1': '$e[1;9]*100+$e[0;9]*10+$e[1;9]' }],

					'result-type': 'decimal',
					defaultDelay: 20,
					grade: CM2,
				},
				{
					description: "Forme décimale d'une fraction",
					subdescription: "Fraction décimale jusqu'au millième",
					enounces: ['Ecris la forme décimale de la fraction'],
					expressions: ['&2/[_&3_]'],
					variables: [
						{
							'&1': '$e[2;4]', // nombre de chiffre au numérateur
							'&2': '$e{&1;&1}', // numérateur
							'&3': '10^$e[1;3]', // dénominateur
						},
					],

					'result-type': 'decimal',
					defaultDelay: 20,
					grade: CM2,
				},
				{
					description: "Déterminer la forme décimale d'une fraction",
					subdescription: 'Cas à connaître par coeur',
					enounces: ['Ecris la forme décimale de la fraction'],
					expressions: ['&1'],
					variables: [
						{ '&1': '$l{1/2;1/4;3/1000;2/10;3/2;5/2;3/4;1/5;7/2;9/2}' },
					],

					'result-type': 'decimal',
					defaultDelay: 20,
					grade: CM2,
				},
				{
					description: "Déterminer la forme décimale d'une fraction",
					subdescription: 'La forme décimale est un entier',
					enounces: ['Ecris la forme décimale de la fraction'],
					expressions: ['[_&2*&1_]/&1'],
					variables: [{ '&1': '$e[2;9]', '&2': '$e[2;9]' }],

					correctionDetails: [
						[
							{
								text: '$$\\begin{align} \\dfrac{[_&2*&1_]}{&1} &= [_&2*&1_] \\div &1 \\\\ &= &sol  \\end{align}$$',
							},
						],
					],
					'result-type': 'decimal',
					defaultDelay: 20,
					grade: SIXIEME,
				},
				{
					description: "Déterminer la forme décimale d'une fraction",
					subdescription: "La forme décimale n'est pas entière",
					enounces: ['Ecris la forme décimale de la fraction'],
					expressions: ['&2/&1'],
					variables: [{ '&1': '$l{2;4;5;10}', '&2': '$e[1;&1+1]\\{&1}' }],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} \\dfrac{&2}{&1} &= &2 \\div &1 \\\\ &= &sol  \\end{align}$$',
							},
						],
					],

					'result-type': 'decimal',
					defaultDelay: 20,
					grade: SIXIEME,
				},
				{
					description: 'Déterminer une forme fractionnaire',
					enounces: [
						'Réécris ce nombre décimal sous forme fractionnaire la plus simple.',
					],
					expressions: ['[._&2/&1_]'],
					variables: [{ '&1': '$l{2;4;5;10}', '&2': '$e[1;&1-1]' }],

					// TODO : autoriser fractions non simplifiées
					defaultDelay: 20,
					grade: SIXIEME,
				},
			],
			'Egalité de fractions': [
				{
					description: 'Compléter une égalité de fractions',
					subdescription:
						'Multiplier numérateur et dénominateur par le même nombre',
					enounces: ['Complète avec le nombre manquant.'],
					expressions: [
						'&2/&1=?/[_&1*&3_]',
						'&2/&1=[_&2*&3_]/?',
						'?/[_&1*&3_]=&2/&1',
						'[_&2*&3_]/?=&2/&1',
					],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]\\{m(&1);d(&1)}',
							'&3': '$e[2;9]',
						},
					],
					solutions: [
						['[_&2*&3_]'],
						['[_&1*&3_]'],
						['[_&2*&3_]'],
						['[_&1*&3_]'],
					],
					correctionDetails: [
						[
							{
								text: `$$\\dfrac{&2}{&1} = \\dfrac{&sol}{[_&1*&3_]}$$ car $$&1 \\textcolor{${color1}}{\\times &3} = [_&1*&3_]$$ et $$&2 \\textcolor{${color1}}{\\times &3} = &sol $$`,
							},
						],
						[
							{
								text: `$$\\dfrac{&2}{&1} = \\dfrac{[_&2*&3_]}{&sol}$$ car $$&2 \\textcolor{${color1}}{\\times &3} = [_&2*&3_]$$ et $$&1 \\textcolor{${color1}}{\\times &3} = &sol $$`,
							},
						],
						[
							{
								text: `$$\\dfrac{&sol}{[_&1*&3_]} = \\dfrac{&2}{&1}$$ car $$&1 \\textcolor{${color1}}{\\times &3} = [_&1*&3_]$$ et $$&2 \\textcolor{${color1}}{\\times &3} = &sol $$`,
							},
						],
						[
							{
								text: `$$\\dfrac{[_&2*&3_]}{&sol}  = \\dfrac{&2}{&1}$$ car $$&2 \\textcolor{${color1}}{\\times &3} = [_&2*&3_]$$ et $$&1 \\textcolor{${color1}}{\\times &3} = &sol $$`,
							},
						],
					],
					type: 'fill in',
					defaultDelay: 12000,
					grade: SIXIEME,
					help: `<section>
          <h3 class="${color2}-text">Compléter une égalité de fractions</h3>
          <div class="r-stretch d-flex flex-column justify-center">
            $$\\dfrac{5}{4}=\\dfrac{\\ldots}{12}$$
          </div>
          <p>Pour passer de 4 à 12, je multiplie par 3</p>
        </section>
        <section>
          <h3 class="${color2}-text">Compléter une égalité de fractions</h3>
          <div class="r-stretch d-flex flex-column justify-center">
            $$\\dfrac{5}{4}=\\dfrac{\\textcolor{green}{15}}{12}$$
          </div>
          <p>Donc je multiplie également 5 par 4</p>
        </section>`,
				},
				{
					description: 'Compléter une égalité de fractions',
					subdescription:
						'Diviser numérateur et dénominateur par le même nombre',
					enounces: ['Complète avec le  nombre manquant.'],
					expressions: [
						'[_&2*&3_]/[_&1*&3_]=?/&1',
						'[_&2*&3_]/[_&1*&3_]=&2/?',
						'?/&1=[_&2*&3_]/[_&1*&3_]',
						'&2/?=[_&2*&3_]/[_&1*&3_]',
					],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]\\{m(&1);d(&1)}',
							'&3': '$e[2;9]',
						},
					],
					solutions: [['&2'], ['&1'], ['&2'], ['&1']],
					correctionDetails: [
						[
							{
								text: `$$\\dfrac{[_&2*&3_]}{[_&1*&3_]} = \\dfrac{&sol}{&1}$$ car $$[_&1*&3_] \\textcolor{${color1}}{\\div &3} = &1$$ et $$[_&2*&3_] \\textcolor{${color1}}{\\div &3} = &sol $$`,
							},
						],
						[
							{
								text: `$$\\dfrac{[_&2*&3_]}{[_&1*&3_]} = \\dfrac{&2}{&sol}$$ car $$[_&2*&3_] \\textcolor{${color1}}{\\div &3} = &2$$ et $$[_&1*&3_] \\textcolor{${color1}}{\\div &3} = &sol $$`,
							},
						],
						[
							{
								text: `$$\\dfrac{&sol}{&1}  = \\dfrac{[_&2*&3_]}{[_&1*&3_]}$$ car $$[_&1*&3_] \\textcolor{${color1}}{\\div &3} = &1$$ et $$[_&2*&3_] \\textcolor{${color1}}{\\div &3} = &sol $$`,
							},
						],
						[
							{
								text: `$$\\dfrac{&2}{&sol}  = \\dfrac{[_&2*&3_]}{[_&1*&3_]}$$ car $$[_&2*&3_] \\textcolor{${color1}}{\\div &3} = &2$$ et $$[_&1*&3_] \\textcolor{${color1}}{\\div &3} = &sol $$`,
							},
						],
					],
					type: 'fill in',
					defaultDelay: 20,
					grade: CINQUIEME,
				},
				{
					description: 'Compléter une égalité de fractions',
					subdescription: 'En utilisant le coefficient de proportionnalité',
					enounces: ['Complète avec le  nombre manquant.'],
					expressions: [
						'&1/[_&1*&3_]=&2/?',
						'[_&1*&3_]/&1=?/&2',
						'&2/?=&1/[_&1*&3_]',
						'?/&2=[_&1*&3_]/&1',
					],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]\\{m(&1);d(&1)}',
							'&3': '$e[2;9]',
						},
					],
					solutions: [['[_&2*&3_]']],
					correctionDetails: [
						[
							{
								text: `$$\\dfrac{&1}{[_&1*&3_]} = \\dfrac{&2}{&sol}$$ car $$&1 \\textcolor{${color1}}{\\times &3} = [_&1*&3_]$$ et $$&2 \\textcolor{${color1}}{\\times &3} = &sol $$`,
							},
						],
						[
							{
								text: `$$ \\dfrac{[_&1*&3_]}{&1}  = \\dfrac{&sol}{&2}$$ car $$&1 \\textcolor{${color1}}{\\times &3} = [_&1*&3_]$$ et $$&2 \\textcolor{${color1}}{\\times &3} = &sol $$`,
							},
						],
						[
							{
								text: `$$\\dfrac{&2}{&sol}  = \\dfrac{&1}{[_&1*&3_]}$$ car $$&1 \\textcolor{${color1}}{\\times &3} = [_&1*&3_]$$ et $$&2 \\textcolor{${color1}}{\\times &3} = &sol $$`,
							},
						],
						[
							{
								text: `$$ \\dfrac{&sol}{&2} = \\dfrac{[_&1*&3_]}{&1}$$ car $$&1 \\textcolor{${color1}}{\\times &3} = [_&1*&3_]$$ et $$&2 \\textcolor{${color1}}{\\times &3} = &sol $$`,
							},
						],
					],
					type: 'fill in',
					defaultDelay: 20,
					grade: CINQUIEME,
				},
				{
					description: 'Compléter une égalité de fractions',
					subdescription: 'En utilisant le coefficient de proportionnalité (2)',
					enounces: ['Complète avec le  nombre manquant.'],
					expressions: [
						'&1/[_&1*&3_]=?/[_&2*&3_]',
						'[_&1*&3_]/&1=[_&2*&3_]/?',
						'?/[_&2*&3_]=&1/[_&1*&3_]',
						'[_&2*&3_]/?=[_&1*&3_]/&1',
					],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]\\{m(&1);d(&1)}',
							'&3': '$e[2;9]',
						},
					],
					solutions: [['&2']],
					correctionDetails: [
						[
							{
								text: `$$\\dfrac{&1}{[_&1*&3_]} = \\dfrac{&sol}{[_&2*&3_]}$$ car $$[_&1*&3_] \\textcolor{${color1}}{\\div &3} = &1$$ et $$[_&2*&3_] \\textcolor{${color1}}{\\div &3} = &sol $$`,
							},
						],
						[
							{
								text: `$$ \\dfrac{[_&1*&3_]}{&1}  = \\dfrac{[_&2*&3_]}{&sol}$$ car $$[_&1*&3_] \\textcolor{${color1}}{\\div &3} = &1$$ et $$[_&2*&3_] \\textcolor{${color1}}{\\div &3} = &sol $$`,
							},
						],
						[
							{
								text: `$$\\dfrac{&sol}{[_&2*&3_]}  = \\dfrac{&1}{[_&1*&3_]}$$ car $$[_&1*&3_] \\textcolor{${color1}}{\\div &3} = &1$$ et $$[_&2*&3_] \\textcolor{${color1}}{\\div &3} = &sol $$`,
							},
						],
						[
							{
								text: `$$ \\dfrac{[_&2*&3_]}{&sol}  = \\dfrac{[_&1*&3_]}{&1}$$ car $$[_&1*&3_] \\textcolor{${color1}}{\\div &3} = &1$$ et $$[_&2*&3_] \\textcolor{${color1}}{\\div &3} = &sol $$`,
							},
						],
					],
					type: 'fill in',
					defaultDelay: 20,
					grade: CINQUIEME,
				},
			],
			Simplification: [
				{
					description: 'Simplifier une fraction',
					subdescription: 'Simplifier par $$10$$, $$100$$ ou $$1000$$',
					enounces: ['Simplifie le plus possible cette fraction.'],
					expressions: ['[_&1*&3_]/[_&2*&4_]'],
					variables: [
						{
							'&1': '$l{10;100;1000}',
							'&2': '$l{10;100;1000}',
							'&3': '$e[1;9]\\{cd&2}',
							'&4': '$e[2;9]\\{cd&1;cd&3}',
						},
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \\dfrac{[_&1*&3_]}{[_&2*&4_]} &= \\dfrac{[_&1*&3_] \\textcolor{${color1}}{\\div [_mini(&1;&2)_]}}{[_&2*&4_] \\textcolor{${color1}}{\\div [_mini(&1;&2)_]}} \\\\ &= &sol  \\end{align}$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: CINQUIEME,
				},
				{
					description: 'Simplifier une fraction',
					subdescription: 'Simplifier par $$2$$, $$3$$ ou $$5$$',
					enounces: ['Simplifie cette fraction par $$2$$ ; $$3$$ ou $$5$$.'],
					expressions: ['[_&1*&2_]/[_&1*&3_]'],
					variables: [
						{
							'&1': '$l{2;3;5}',
							'&2': '$e[1;9]\\{cd&1}',
							'&3': '$e[2;9]\\{cd&1;cd&2}',
						},
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \\dfrac{[_&1*&2_]}{[_&1*&3_]} &= \\dfrac{[_&1*&2_] \\textcolor{${color1}}{\\div &1}}{[_&1*&3_] \\textcolor{${color1}}{\\div &1}} \\\\ &= &sol  \\end{align}$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: CINQUIEME,
				},
				{
					description: 'Simplifier une fraction',
					subdescription: 'simplification par $$2$$, $$3$$, $$5$$, $$7$$ ou $$11$$',
					enounces: ['Simplifie cette fraction.'],
					expressions: ['[_&1*&2_]/[_&1*&3_]'],
					variables: [
						{
							'&1': '$l{2;3;5;7;11}',
							'&2': '$e[1;9]\\{cd&1}',
							'&3': '$e[2;9]\\{cd&1;cd&2}',
						},
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \\dfrac{[_&1*&2_]}{[_&1*&3_]} &= \\dfrac{[_&1*&2_] \\textcolor{${color1}}{\\div &1}}{[_&1*&3_] \\textcolor{${color1}}{\\div &1}} \\\\ &= &sol  \\end{align}$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: CINQUIEME,
				},
				{
					description: 'Simplifier une fraction',
					subdescription: 'La simplification peut se faire en plusieurs étapes',
					enounces: ['Simplifie le plus possible.'],
					expressions: ['[_&2*&3_]/[_&1*&3_]'],
					variables: [
						{ '&1': '$e[2;9]', '&2': '$e[1;9]\\{&1}', '&3': '$e[2;9]' },
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \\dfrac{[_&2*&3_]}{[_&1*&3_]} &= \\dfrac{[_&2*&3_] \\textcolor{${color1}}{\\div [_&3*pgcd(&1;&2)_]}}{[_&1*&3_] \\textcolor{${color1}}{\\div  [_&3*pgcd(&1;&2)_]}} \\\\ &= &sol  \\end{align}$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: CINQUIEME,
				},
				{
					description: 'Simplifier une fraction',
					enounces: ['Simplifie les signes.'],
					expressions: ['(-&1)/&2', '&1/(-&2)', '(-&1)/(-&2)'],
					variables: [{ '&1': '$e[1;9]', '&2': '$e[2;9]\\{cd&1}' }],

					defaultDelay: 20,
					grade: QUATRIEME,
				},
				{
					description: 'Simplifier une fraction',
					subdescription: 'Simplifier le plus possible (avec signes)',
					enounces: ['Simplifie le plus possible.'],
					expressions: [
						'(-[_&2*&3_])/[_&1*&3_]',
						'[_&2*&3_]/(-[_&1*&3_])',
						'(-[_&2*&3_])/(-[_&1*&3_])',
					],
					variables: [
						{ '&1': '$e[2;9]', '&2': '$e[1;9]\\{&1}', '&3': '$e[2;9]' },
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \\dfrac{-[_&2*&3_]}{[_&1*&3_]} &= -\\dfrac{[_&2*&3_] \\textcolor{${color1}}{\\div [_&3*pgcd(&1;&2)_]}}{[_&1*&3_] \\textcolor{${color1}}{\\div  [_&3*pgcd(&1;&2)_]}} \\\\ &= &sol  \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\dfrac{[_&2*&3_]}{-[_&1*&3_]} &= -\\dfrac{[_&2*&3_] \\textcolor{${color1}}{\\div [_&3*pgcd(&1;&2)_]}}{[_&1*&3_] \\textcolor{${color1}}{\\div  [_&3*pgcd(&1;&2)_]}} \\\\ &= &sol  \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\dfrac{-[_&2*&3_]}{-[_&1*&3_]} &= \\dfrac{[_&2*&3_] \\textcolor{${color1}}{\\div [_&3*pgcd(&1;&2)_]}}{[_&1*&3_] \\textcolor{${color1}}{\\div  [_&3*pgcd(&1;&2)_]}} \\\\ &= &sol  \\end{align}$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: QUATRIEME,
				},
			],
			Comparer: [
				{
					description: 'Comparer deux fractions',
					subdescription: 'Fractions de même dénominateur',
					enounces: ['Quelle est la plus petite de ces $$2$$ fractions ?'],
					variables: [
						{
							'&1': '$e[8;19]',
							'&2': '$e[1;&1-1]\\{&1}',
							'&3': '$e[1;&1-1]\\{&1;&2}',
							'&4': '&2/&1',
							'&5': '&3/&1',
						},
						{
							'&1': '$e[2;9]',
							'&2': '$e[&1+1;3*&1-1]\\{&1}',
							'&3': '$e[&1+1;3*&1-1]\\{&1;&2}',
							'&4': '&2/&1',
							'&5': '&3/&1',
						},
					],
					choices: [
						[{ text: '$$\\dfrac{&2}{&1}$$' }, { text: '$$\\dfrac{&3}{&1}$$' }],
					],

					
					correctionDetails: [
						[
							{
								text: '&solution est plus petite que $$\\dfrac{[_maxi(&2;&3)_]}{&1}$$ car les deux fractions ont <b>même dénominateur</b> et $$[_mini(&2;&3)_]<[_maxi(&2;&3)_]$$',
							},
						],
					],
					solutions: [['&4<&5 ?? 0 :: 1']],
					defaultDelay: 20,
					grade: CM1,
				},
				{
					description: 'Comparer deux fractions',
					subdescription: 'Fractions de même numérateur',
					enounces: ['Quelle est la plus petite de ces $$2$$ fractions ?'],
					variables: [
						{
							'&1': '$e[8;19]',
							'&2': '$e[2;&1-1]\\{&1}',
							'&3': '$e[2;&1-1]\\{&1;&2}',
							'&4': '&1/&2',
							'&5': '&1/&3',
						},
						{
							'&1': '$e[2;9]',
							'&2': '$e[&1+1;3*&1-1]\\{&1}',
							'&3': '$e[&1+1;3*&1-1]\\{&1;&2}',
							'&4': '&1/&2',
							'&5': '&1/&3',
						},
					],
					choices: [
						[{ text: '$$\\dfrac{&1}{&2}$$' }, { text: '$$\\dfrac{&1}{&3}$$' }],
					],
					correctionDetails: [
						[
							{
								text: '&solution est plus petite que $$\\dfrac{&1}{[_mini(&2;&3)_]}$$ car les deux fractions ont <b>même numérateur</b> et $$[_maxi(&2;&3)_]>[_mini(&2;&3)_]$$',
							},
						],
					],
					solutions: [['&4<&5 ?? 0 :: 1']],
					defaultDelay: 20,
					grade: CM1,
				},
				{
					description: 'Comparer deux fractions',
					subdescription: 'En comparant à $$1$$',
					enounces: ['Quelle est la plus petite de ces $$2$$ fractions ?'],
					variables: [
						{
							'&1': '$e[8;19]',
							'&2': '$e[1;&1-1]',
							'&3': '$e[8;19]\\{&1}',
							'&4': '$e[&3+1;2*&3-1]\\{&2}',
							'&5': '&2/&1',
							'&6': '&4/&3',
						},
					],
					choices: [
						[{ text: '$$\\dfrac{&2}{&1}$$' }, { text: '$$\\dfrac{&4}{&3}$$' }],
						[{ text: '$$\\dfrac{&4}{&3}$$' }, { text: '$$\\dfrac{&2}{&1}$$' }],
					],
					solutions: [['&5<&6 ?? 0 :: 1'], ['&6<&5 ?? 0 :: 1']],
					correctionDetails: [
						[
							{
								text: '&solution est plus petite que $$[_maxi(&2/&1;&4/&3)_]$$ car $$[_mini(&2/&1;&4/&3)_]<1$$ et $$[_maxi(&2/&1;&4/&3)_]>1$$',
							},
						],
					],
					defaultDelay: 20,
					grade: CINQUIEME,
				},
				{
					description: 'Comparer deux fractions',
					subdescription:
						"Fractions de dénominateurs multiples l'un de l'autre",
					enounces: ['Quelle est la plus petite de ces $$2$$ fractions ?'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;8]',
							'&3': '$e[&2+1;9]\\{d(&2);m(&2)}',
							'&4': '$e[&2*2;&3*&1-1]\\{&2*&1;d(&3*&1);m(&3*&1)}',
							'&5': '&2/&3',
							'&6': '&4/(&3*&1)',
						},
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;8]',
							'&3': '$e[&2+1;9]\\{d(&2);m(&2)}',
							'&4': '$e[&2*&1+1;80]\\{&3*&1;d(&2*&1);m(&2*&1)}',
							'&5': '&3/&2',
							'&6': '&4/(&2*&1)',
						},
					],
					choices: [
						[
							{ text: '$$\\dfrac{&2}{&3}$$' },
							{ text: '$$\\dfrac{[_&4_]}{[_&3*&1_]}$$' },
						],
						[
							{ text: '$$\\dfrac{&3}{&2}$$' },
							{ text: '$$\\dfrac{[_&4_]}{[_&2*&1_]}$$' },
						],
					],
					
					correctionDetails: [
						[
							{
								text: `@@ &5<&6 ?? $$\\frac{&2}{&3} = \\frac{&2 \\textcolor{${color1}}{\\times &1}}{&3 \\textcolor{${color1}}{\\times &1}} = \\frac{[_&2*&1_]}{[_&3*&1_]}$$ et $$\\frac{[_&2*&1_]}{[_&3*&1_]}<\\frac{&4}{[_&3*&1_]}$$, donc $$&sol <\\frac{&4}{[_&3*&1_]$$@@ \
              @@ &5>&6 ?? $$\\frac{&2}{&3} = \\frac{&2 \\textcolor{${color1}}{\\times &1}}{&3 \\textcolor{${color1}}{\\times &1}} = \\frac{[_&2*&1_]}{[_&3*&1_]}$$ et $$\\frac{[_&2*&1_]}{[_&3*&1_]}>\\frac{&4}{[_&3*&1_]}$$, donc $$\\frac{&2}{&3}>&sol $$@@`,
							},
						],
						[
							{
								text: `@@ &5<&6 ?? $$\\frac{&3}{&2} = \\frac{&3 \\textcolor{${color1}}{\\times &1}}{&2 \\textcolor{${color1}}{\\times &1}} = \\frac{[_&3*&1_]}{[_&2*&1_]}$$ et $$\\frac{[_&3*&1_]}{[_&2*&1_]}<\\frac{&4}{[_&2*&1_]}$$, donc $$&sol <\\frac{&4}{[_&2*&1_]$$@@ \
              @@ &5>&6 ?? $$\\frac{&3}{&2} = \\frac{&3 \\textcolor{${color1}}{\\times &1}}{&2 \\textcolor{${color1}}{\\times &1}} = \\frac{[_&3*&1_]}{[_&2*&1_]}$$ et $$\\frac{[_&3*&1_]}{[_&2*&1_]}>\\frac{&4}{[_&2*&1_]}$$, donc $$\\frac{&3}{&2}>&sol $$@@`,
							},
						],
					],

					solutions: [['&5<&6 ?? 0 :: 1']],
					defaultDelay: 20,
					grade: CINQUIEME,
				},
			],
		},
		'A trou': {
			'Addition - Soustraction': [
				{
					description: 'Compléter une addition ou soustraction à trou',
					subdescription: 'Avec des quotients.',
					enounces: ['Complète.'],
					expressions: [
						'?/&3+&2/&3=[_&1+&2_]/&3',
						'&1/?+&2/&3=[_&1+&2_]/&3',
						'&1/&3+?/&3=[_&1+&2_]/&3',
						'&1/&3-&2/?=[_&1-&2_]/&3',
						'?/&3-&2/&3=[_&1-&2_]/&3',
						'&1/&3-?/&3=[_&1-&2_]/&3',
					],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
							'&3': '$e[2;19]\\{cd(&1);cd(&2)}',
						},
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
							'&3': '$e[2;19]\\{cd(&1);cd(&2)}',
						},
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
							'&3': '$e[2;19]\\{cd(&1);cd(&2)}',
						},
						{
							'&1': '$e[3;9]',
							'&2': '$e[2;&1-1]',
							'&3': '$e[2;19]\\{cd(&1);cd(&2)}',
						},
						{
							'&1': '$e[3;9]',
							'&2': '$e[2;&1-1]',
							'&3': '$e[2;19]\\{cd(&1);cd(&2)}',
						},
						{
							'&1': '$e[3;9]',
							'&2': '$e[2;&1-1]',
							'&3': '$e[2;19]\\{cd(&1);cd(&2)}',
						},
					],
					solutions: [['&1'], ['&3'], ['&2'], ['&3'], ['&1'], ['&2']],
					type: 'fill in',
					defaultDelay: 20,
					grade: CINQUIEME,
				},
				{
					description: 'Compléter une addition ou soustraction à trou',
					subdescription: 'Quotients avec nombres relatifs',
					enounces: ['Complète cette égalité avec le  nombre manquant.'],
					expressions: [
						'?/&3+{&2}/&3=[_&1+(&2)_]/&3',
						'{&1}/?+{&2}/&3=[_&1+(&2)_]/&3',
						'{&1}/&3+?/&3=[_&1+(&2)_]/&3',
						'{&1}/&3-{&2}/?=[_&1-(&2)_]/&3',
						'?/&3-{&2}/&3=[_&1-(&2)_]/&3',
						'{&1}/&3-?/&3=[_&1-(&2)_]/&3',
					],
					variables: [
						{
							'&1': '$er[2;9]',
							'&2': '$er[2;9]',
							'&3': '$e[2;19]\\{cd(&1);cd(&2)}',
						},
					],
					solutions: [['&1'], ['&3'], ['&2'], ['&3'], ['&1'], ['&2']],
					type: 'fill in',
					defaultDelay: 20,
					grade: QUATRIEME,
				},
			],
			Multiplication: [
				{
					description: 'Compléter une égalité une multiplication à trou',
					subdescription: 'Avec des quotients. Nombres positifs.',
					enounces: ['Complète.'],
					expressions: [
						'(?/&3)*(&2/&4)=[_&1*&2_]/[_&3*&4_]',
						'(&1/?)*(&2/&4)=[_&1*&2_]/[_&3*&4_]',
						'(&1/&3)*(?/&4)=[_&1*&2_]/[_&3*&4_]',
						'(&1/&3)*(&2/?)=[_&1*&2_]/[_&3*&4_]',
					],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
							'&3': '$e[2;9]\\{&1;&2}',
							'&4': '$e[2;9]\\{&1;&2}',
						},
					],
					solutions: [['&1'], ['&3'], ['&2'], ['&4']],
					type: 'fill in',
					defaultDelay: 20,
					grade: QUATRIEME,
				},
				{
					description: 'Compléter une multiplication à trou',
					subdescription: 'Quotients avec nombres relatifs',
					enounces: ['Complète.'],
					expressions: [
						'(?/(&3))*((&2)/(&4))=[_(&1*(&2))/(&3*(&4))_]',
						'((&1)/?)*((&2)/(&4))=[_&1*(&2)/(&3*(&4))_]',
						'((&1)/(&3))*(?/(&4))=[_&1*(&2)/(&3*(&4))_]',
						'((&1)/(&3))*((&2)/?)=[_&1*(&2)/(&3*(&4))_]',
					],
					variables: [
						{
							'&1': '$er[2;9]',
							'&2': '$er[2;9]',
							'&3': '$er[2;9]\\{cd(&1);cd(&2)}',
							'&4': '$er[2;9]\\{cd(&1);cd(&2)}',
						},
					],
					solutions: [['&1'], ['&3'], ['&2'], ['&4']],
					type: 'fill in',
					defaultDelay: 20,
					grade: QUATRIEME,
				},
			],
		},
		Calculer: {
			'Addition et Soustraction': [
				{
					description: 'Additionner des fractions',
					subdescription: 'Fractions décimales.',
					enounces: ['Calcule.'],
					expressions: ['&1/10+&2/10', '&1/10+&2/10+&3/10', '&1/100+&2/100'],
					variables: [
						{
							'&1': '$e[2;13]',
							'&2': '$e[2;13]',
						},
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]',
							'&3': '$e[1;9]',
						},
						{
							'&1': '$e[1;80]',
							'&2': '$e[1;50]',
						},
					],

					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \\dfrac{&1}{\\textcolor{${color1}}{10}}+\\dfrac{&2}{\\textcolor{${color1}}{10}} &= \\dfrac{&1+&2}{\\textcolor{${color1}}{10}} \\\\ &= &sol  \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\dfrac{&1}{\\textcolor{${color1}}{10}}+\\dfrac{&2}{\\textcolor{${color1}}{10}}+\\dfrac{&3}{\\textcolor{${color1}}{10}} &= \\dfrac{&1+&2+&3}{\\textcolor{${color1}}{10}} \\\\ &= &sol  \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\dfrac{&1}{\\textcolor{${color1}}{100}}+\\dfrac{&2}{\\textcolor{${color1}}{100}} &= \\dfrac{&1+&2}{\\textcolor{${color1}}{100}} \\\\ &= &sol  \\end{align}$$`,
							},
						],
					],
					defaultDelay: 30,
					grade: CM1,
				},
				{
					description: 'Additionner des fractions',
					subdescription:
						'Fractions de même dénominateur, nombres positifs, sans simplification',
					enounces: ['Calcule.'],
					expressions: ['&1/&3+&2/&3'],
					variables: [
						{
							'&1': '$e[2;13]',
							'&2': '$e[2;13]',
							'&3': '$e[2;25]\\{cd(&1);cd(&2);cd(&2+&1)}',
						},
					],

					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \\dfrac{&1}{\\textcolor{${color1}}{&3}}+\\dfrac{&2}{\\textcolor{${color1}}{&3}} &= \\dfrac{&1+&2}{\\textcolor{${color1}}{&3}} \\\\ &= &sol  \\end{align}$$`,
							},
						],
					],

					defaultDelay: 30,
					grade: SIXIEME,
				},
				{
					description: 'Additionner ou soustraire des fractions',
					subdescription:
						'Fractions de même dénominateur, nombres positifs, sans simplification',
					enounces: ['Calcule.'],
					expressions: ['&1/&3+&2/&3', '&1/&3-&2/&3'],
					variables: [
						{
							'&1': '$e[2;13]',
							'&2': '$e[2;13]',
							'&3': '$e[2;25]\\{cd(&1);cd(&2);cd(&2+&1)}',
						},
						{
							'&1': '$e[3;13]',
							'&2': '$e[2;&1-1]',
							'&3': '$e[2;25]\\{cd(&1);cd(&2);cd(&1-&2)}',
						},
					],

					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \\dfrac{&1}{\\textcolor{${color1}}{&3}}+\\dfrac{&2}{\\textcolor{${color1}}{&3}} &= \\dfrac{&1+&2}{\\textcolor{${color1}}{&3}} \\\\ &= &sol  \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\dfrac{&1}{\\textcolor{${color1}}{&3}}-\\dfrac{&2}{\\textcolor{${color1}}{&3}} &= \\dfrac{&1-&2}{\\textcolor{${color1}}{&3}} \\\\ &= &sol  \\end{align}$$`,
							},
						],
					],
					defaultDelay: 30,
					grade: CINQUIEME,
				},
				{
					description: 'Additionner ou soustraire',
					subdescription:
						"Dénominateur multiple de l'autre, nombres positifs, sans simplification",
					enounces: ['Calcule.'],
					expressions: [
						'&1/&3+&2/[_&3*&4_]',
						'&2/[_&3*&4_]+&1/&3',
						'&1/&3-&2/[_&3*&4_]',
					],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
							'&3': '$e[2;9]\\{cd(&1);cd(&2)}',
							'&4': '$e[2;9]\\{cd(&2)}',
						},
					],
					conditions: [
						'pgcd(&1*&4+&2;&3*&4)=1',
						'pgcd(&1*&4+&2;&3*&4)=1',
						'&1*&4>&2 && pgcd(&1*&4-&2;&3*&4)=1',
					],

					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \\dfrac{&1}{&3} + \\dfrac{&2}{[_&3*&4_]} &= \\dfrac{&1\\textcolor{${color2}}{\\times &4}}{&3\\textcolor{${color2}}{\\times &4}} + \\dfrac{&2}{[_&3*&4_]} \\\\ &= \\dfrac{[_&1*&4_]}{\\textcolor{${color1}}{[_&3*&4_]}} + \\dfrac{&2}{\\textcolor{${color1}}{[_&3*&4_]}} \\\\ &= \\dfrac{[_&1*&4_]+&2}{\\textcolor{${color1}}{[_&3*&4_]}} \\\\ &= &sol  \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\dfrac{&2}{[_&3*&4_]} + \\dfrac{&1}{&3} &= \\dfrac{&2}{[_&3*&4_]} + \\dfrac{&1\\textcolor{${color2}}{\\times &4}}{&3\\textcolor{${color2}}{\\times &4}} \\\\ &= \\dfrac{&2}{\\textcolor{${color1}}{[_&3*&4_]}} + \\dfrac{[_&1*&4_]}{\\textcolor{${color1}}{[_&3*&4_]}} \\\\ &= \\dfrac{&2+[_&1*&4_]}{\\textcolor{${color1}}{[_&3*&4_]}} \\\\ &= &sol  \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\dfrac{&1}{&3} - \\dfrac{&2}{[_&3*&4_]} &= \\dfrac{&1\\textcolor{${color2}}{\\times &4}}{&3\\textcolor{${color2}}{\\times &4}} - \\dfrac{&2}{[_&3*&4_]} \\\\ &= \\dfrac{[_&1*&4_]}{\\textcolor{${color1}}{[_&3*&4_]}} - \\dfrac{&2}{\\textcolor{${color1}}{[_&3*&4_]}} \\\\ &= \\dfrac{[_&1*&4_]-&2}{\\textcolor{${color1}}{[_&3*&4_]}} \\\\ &= &sol  \\end{align}$$`,
							},
						],
					],
					defaultDelay: 30,
					grade: CINQUIEME,
				},
				{
					description: 'Additionner ou soustraire',
					subdescription:
						"Dénominateur multiple de l'autre, nombres positifs, simplification initiale",
					enounces: ["Calcule en simplifiant d'abord une des $$2$$ fractions"],
					expressions: [
						'&1/&3+[_&2*&4_]/[_&3*&4_]',
						'[_&2*&4_]/[_&3*&4_]+&1/&3',
					],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
							'&3': '$e[2;9]\\{cd(&1);cd(&2)}',
							'&4': '$e[2;9]\\{cd(&2);cd(&3)}',
						},
					],
					conditions: ['pgcd(&1+&2;&3)=1'],

					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \\dfrac{&1}{&3} + \\dfrac{[_&2*&4_]}{[_&3*&4_]} &= \\dfrac{&1}{&3} + \\dfrac{[_&2*&4_]\\textcolor{${color2}}{\\div &4}}{[_&3*&4_]\\textcolor{${color2}}{\\div &4}} \\\\ &= \\dfrac{&1}{\\textcolor{${color1}}{&3}} + \\dfrac{&2}{\\textcolor{${color1}}{&3}} \\\\ &= \\dfrac{&1+&2}{\\textcolor{${color1}}{&3}} \\\\ &= &sol  \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\dfrac{[_&2*&4_]}{[_&3*&4_]} + \\dfrac{&1}{&3} &= \\dfrac{[_&2*&4_]\\textcolor{${color2}}{\\div &4}}{[_&3*&4_]\\textcolor{${color2}}{\\div &4}} + \\dfrac{&1}{&3} \\\\ &= \\dfrac{&2}{\\textcolor{${color1}}{&3}} + \\dfrac{&1}{\\textcolor{${color1}}{&3}} \\\\ &= \\dfrac{&2+&1}{\\textcolor{${color1}}{&3}} \\\\ &= &sol  \\end{align}$$`,
							},
						],
					],
					defaultDelay: 30,
					grade: CINQUIEME,
				},
				{
					description: 'Additionner ou soustraire',
					subdescription: 'Un entier et une fraction',
					enounces: ['Calcule.'],
					expressions: ['&2/&1+&3', '&3+&2/&1'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]\\{cd&1}',
							'&3': '$e[2;9]',
						},
					],

					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \\dfrac{&2}{&1} + &3 &= \\dfrac{&2}{&1} + \\dfrac{&3\\textcolor{${color2}}{\\times &1}}{\\textcolor{${color2}}{&1}} \\\\ &= \\dfrac{&2}{\\textcolor{${color1}}{&1}} + \\dfrac{[_&3*&1_]}{\\textcolor{${color1}}{&1}} \\\\ &= \\dfrac{&2+[_&3*&1_]}{\\textcolor{${color1}}{[_&1_]}} \\\\ &= &sol  \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} &3 + \\dfrac{&2}{&1} &= \\dfrac{&3\\textcolor{${color2}}{\\times &1}}{\\textcolor{${color2}}{&1}} + \\dfrac{&2}{&1} \\\\ &= \\dfrac{[_&3*&1_]}{\\textcolor{${color1}}{&1}} + \\dfrac{&2}{\\textcolor{${color1}}{&1}} \\\\ &= \\dfrac{[_&3*&1_]+&2}{\\textcolor{${color1}}{[_&1_]}} \\\\ &= &sol  \\end{align}$$`,
							},
						],
					],

					defaultDelay: 30,
					grade: CINQUIEME,
				},
				{
					description: 'Additionner ou soustraire',
					subdescription:
						'Fractions de même dénominateur, nombres positifs, simplification intermediaire possible, simplification finale',
					enounces: ['Calcule.'],
					expressions: [
						'[_&2*&4_]/[_&1*&3_]+[_(&1-&2)*&4_]/[_&1*&3_]',
						'[_&1*&4_]/[_&2*&3_]-[_(&1-&2)*&4_]/[_&2*&3_]',
					],

					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \\dfrac{[_&2*&4_]}{\\textcolor{${color1}}{[_&1*&3_]}} + \\dfrac{[_(&1-&2)*&4_]}{\\textcolor{${color1}}{[_&1*&3_]}} &= \\dfrac{[_&2*&4_]+[_(&1-&2)*&4_]}{\\textcolor{${color1}}{[_&1*&3_]}} \\\\ &= \\dfrac{[_&1*&4_]}{[_&1*&3_]} \\\\ &=  \\dfrac{[_&1*&4_]\\textcolor{${color2}}{\\div [_pgcd(&1*&3;&1*&4)_]}}{[_&1*&3_]\\textcolor{${color2}}{\\div [_pgcd(&1*&3;&1*&4)_]}} \\\\ &= &sol  \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\dfrac{[_&1*&4_]}{\\textcolor{${color1}}{[_&2*&3_]}} - \\dfrac{[_(&1-&2)*&4_]}{\\textcolor{${color1}}{[_&2*&3_]}} &= \\dfrac{[_&1*&4_]-[_(&1-&2)*&4_]}{\\textcolor{${color1}}{[_&2*&3_]}} \\\\ &= \\dfrac{[_&2*&4_]}{[_&2*&3_]} \\\\ &=  \\dfrac{[_&2*&4_]\\textcolor{${color2}}{\\div [_pgcd(&2*&3;&2*&4)_]}}{[_&2*&3_]\\textcolor{${color2}}{\\div [_pgcd(&2*&3;&2*&4)_]}} \\\\ &= &sol  \\end{align}$$`,
							},
						],
					],
					variables: [
						{
							'&1': '$e[3;9]',
							'&2': '$e[2;&1-1]',
							'&3': '$e[2;9]',
							'&4': '$e[2;9]\\{&3}',
						},
					],

					defaultDelay: 20,
					grade: CINQUIEME,
				},
				// {
				//   description: 'Additionner ou soustraire',
				//   subdescription:
				//     'Fractions de même dénominateur, nombres relatifs, simplification intermediaire possible, simplification finale',
				//   enounces: ['Calcule.'],
				//   expressions: [
				//     '(-&1)/&3+(-&2)/&3',
				//     '(-&1)/&3+&2/&3',
				//     '&1/&3+(-&2)/&3',
				//     '&1/&3+&2/&3',
				//     '(-&1)/&3-(-&2)/&3',
				//     '(-&1)/&3-&2/&3',
				//     '&1/&3-(-&2)/&3',
				//     '&1/&3-&2/&3',
				//   ],

				//   details: [
				//     [
				//       '\\dfrac{-&1+(-&2)}{&3}',
				//       '\\dfrac{[_-&1+(-&2)_]}{&3}',
				//       '&4>1 && &4<&3??\\dfrac{[_-&1+(-&2)_]:[_&4_]}{&3:[_&4_]}',
				//     ],
				//     [
				//       '\\dfrac{-&1+&2}{&3}',
				//       '\\dfrac{[_-&1+&2_]}{&3}',
				//       '&4>1 && &4<&3??\\dfrac{[_-&1+&2_]:[_&4_]}{&3:[_&4_]}',
				//     ],
				//     [
				//       '\\dfrac{&1+(-&2)}{&3}',
				//       '\\dfrac{[_&1-&2_]}{&3}',
				//       '&4>1 && &4<&3??\\dfrac{[_&1-&2_]:[_&4_]}{&3:[_&4_]}',
				//     ],
				//     [
				//       '\\dfrac{&1+&2}{&3}',
				//       '\\dfrac{[_&1+&2_]}{&3}',
				//       '&4>1 && &4<&3??\\dfrac{[_&1+&2_]:[_&4_]}{&3:[_&4_]}',
				//     ],

				//     [
				//       '\\dfrac{-&1-(-&2)}{&3}',
				//       '\\dfrac{-&1+&2}{&3}',
				//       '\\dfrac{[_-&1+&2_]}{&3}',
				//       '&4>1 && &4<&3??\\dfrac{[_-&1+&2_]:[_&4_]}{&3:[_&4_]}',
				//     ],
				//     [
				//       '\\dfrac{-&1-&2}{&3}',
				//       '\\dfrac{[_-&1-&2_]}{&3}',
				//       '&4>1 && &4<&3??\\dfrac{[_-&1-&2_]:[_&4_]}{&3:[_&4_]}',
				//     ],
				//     [
				//       '\\dfrac{&1-(-&2)}{&3}',
				//       '\\dfrac{&1+&2}{&3}',
				//       '\\dfrac{[_&1+&2_]}{&3}',
				//       '&4>1 && &4<&3??\\dfrac{[_&1+&2_]:[_&4_]}{&3:[_&4_]}',
				//     ],
				//     [
				//       '\\dfrac{&1-&2}{&3}',
				//       '\\dfrac{[_&1-&2_]}{&3}',
				//       '&4>1 && &4<&3??\\dfrac{[_&1-&2_]:[_&4_]}{&3:[_&4_]}',
				//     ],
				//   ],
				//   variables: [
				//     {
				//       '&1': '$e[2;9]',
				//       '&2': '$e[2;9]\\{&1}',
				//       '&3': '$e[2;9]',
				//       '&4': 'pgcd(&1+&2;&3)',
				//     },
				//     {
				//       '&1': '$e[2;9]',
				//       '&2': '$e[2;9]\\{&1}',
				//       '&3': '$e[2;9]',
				//       '&4': 'pgcd(-&1+&2;&3)',
				//     },
				//     {
				//       '&1': '$e[2;9]',
				//       '&2': '$e[2;9]\\{&1}',
				//       '&3': '$e[2;9]',
				//       '&4': 'pgcd(&1-&2;&3)',
				//     },
				//     {
				//       '&1': '$e[2;9]',
				//       '&2': '$e[2;9]\\{&1}',
				//       '&3': '$e[2;9]',
				//       '&4': 'pgcd(&1+&2;&3)',
				//     },

				//     {
				//       '&1': '$e[2;9]',
				//       '&2': '$e[2;9]\\{&1}',
				//       '&3': '$e[2;9]',
				//       '&4': 'pgcd(-&1+&2;&3)',
				//     },
				//     {
				//       '&1': '$e[2;9]',
				//       '&2': '$e[2;9]\\{&1}',
				//       '&3': '$e[2;9]',
				//       '&4': 'pgcd(&1+&2;&3)',
				//     },
				//     {
				//       '&1': '$e[2;9]',
				//       '&2': '$e[2;9]\\{&1}',
				//       '&3': '$e[2;9]',
				//       '&4': 'pgcd(&1+&2;&3)',
				//     },
				//     {
				//       '&1': '$e[2;9]',
				//       '&2': '$e[2;9]\\{&1}',
				//       '&3': '$e[2;9]',
				//       '&4': 'pgcd(&1-&2;&3)',
				//     },
				//   ],
				//

				//   defaultDelay: 20,
				//   grade: QUATRIEME,
				// },
			],
			"Fraction d'une quantité": [
				{
					description: "Calculer une fraction d'une quantité",
					enounces: ['Calculer $$&2/&3$$ de $$[_&1*&3_]$$'],
					solutions: [['[_&1*&2_]']],
					variables: [
						{ '&1': '$e[2;9]', '&2': '$e[2;9]', '&3': '$e[2;9]\\{cd(&2)}' },
					],
					correctionFormat: [
						{
							correct: [
								'$$\\dfrac{&2}{&3}$$ de $$[_&1*&3_]$$ est égal à &answer',
							],
						},
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \\dfrac{\\textcolor{${color1}}{&2}}{\\textcolor{${color2}}{&3}} \\text{ de } [_&1*&3_] &= [_&1*&3_]\\textcolor{${color2}}{\\div &3} \\textcolor{${color1}}{\\times &2} \\\\ &= &1 \\times &2 \\\\ &= &sol  \\end{align}$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: CINQUIEME,
				},
				{
					description: "Calculer une fraction d'une quantité",
					enounces:['Calcule'],
					subdescription: 'Dans les $$2$$ sens',
					expressions: ['(&2/&3)*[_&1*&3_]', '[_&1*&3_]*(&2/&3)'],
					variables: [
						{ '&1': '$e[2;9]', '&2': '$e[2;9]', '&3': '$e[2;9]\\{cd(&2)}' },
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \\dfrac{\\textcolor{${color1}}{&2}}{\\textcolor{${color2}}{&3}} \\times [_&1*&3_] &= [_&1*&3_]\\textcolor{${color2}}{\\div &3} \\textcolor{${color1}}{\\times &2} \\\\ &= &1 \\textcolor{${color1}}{\\times &2} \\\\ &= &sol  \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} [_&1*&3_] \\times \\dfrac{\\textcolor{${color1}}{&2}}{\\textcolor{${color2}}{&3}}  &= [_&1*&3_]\\textcolor{${color2}}{\\div &3} \\textcolor{${color1}}{\\times &2} \\\\ &= &1 \\textcolor{${color1}}{\\times &2} \\\\ &= &sol  \\end{align}$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: CINQUIEME,
				},
				{
					description: "Calculer une fraction d'une quantité",
					subdescription: 'En prenant la forme décimale de la fraction',
					enounces: ['Calcule.'],
					expressions: ['{[_&2*&3_]/&3}*&1', '&1*{[_&2*&3_]/&3}'],
					variables: [
						{ '&1': '$e[2;9]', '&2': '$e[2;9]', '&3': '$e[2;9]\\{cd(&1)}' },
					],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} \\dfrac{[_&2*&3_]}{&3} \\times &1 &= [_&2*&3_] \\div &3 \\times &1 \\\\ &= &2 \\times &1 \\\\ &= &sol  \\end{align}$$',
							},
						],

						[
							{
								text: '$$\\begin{align} &1 \\times \\dfrac{[_&2*&3_]}{&3} &= &1 \\times \\left([_&2*&3_] \\div &3 \\right) \\\\ &= &1 \\times &2 \\\\ &= &sol  \\end{align}$$',
							},
						],
					],

					defaultDelay: 20,
					grade: CINQUIEME,
				},
			],
			Multiplication: [
				{
					description: 'Calculer un produit',
					subdescription: 'un entier par un quotient de numérateur $$1$$',
					expressions: ['&1*{1/&2}', '{1/&2}*&1'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;10]\\{cd(&1)}',
						},
					],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} &1 \\times \\dfrac{1}{&2} &= \\dfrac{&1 \\times 1}{&2} \\\\ &= &sol  \\end{align}$$',
							},
						],
						[
							{
								text: '$$\\begin{align} \\dfrac{1}{&2} \\times &1 &= \\dfrac{1 \\times &1}{&2} \\\\ &= &sol  \\end{align}$$',
							},
						],
					],

					defaultDelay: 20,
					grade: CM1,
				},
				{
					description: 'Calculer un produit',
					subdescription: 'un entier par un quotient',
					expressions: ['&1*{&3/&2}', '{&3/&2}*&1'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;10]\\{cd(&1)}',
							'&3': '$e[2;9]\\{cd(&2)}',
						},
					],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} &1 \\times \\dfrac{&3}{&2} &= \\dfrac{&1 \\times &3}{&2} \\\\ &= &sol  \\end{align}$$',
							},
						],
						[
							{
								text: '$$\\begin{align} \\dfrac{&3}{&2} \\times &1 &= \\dfrac{&3 \\times &1}{&2} \\\\ &= &sol  \\end{align}$$',
							},
						],
					],

					defaultDelay: 20,
					grade: CM1,
				},
				{
					description: 'Calculer un produit',
					subdescription: 'Pas de simplification',
					expressions: ['{&1/&3}*{&2/&4}'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
							'&3': '$e[2;9]\\{cd(&2);cd(&1)}',
							'&4': '$e[2;9]\\{cd(&2);cd(&1)}',
						},
					],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} \\dfrac{&1}{&3} \\times \\dfrac{&2}{&4} &= \\dfrac{&1 \\times &2}{&3 \\times &4} \\\\ &= &sol  \\end{align}$$',
							},
						],
					],

					defaultDelay: 20,
					grade: QUATRIEME,
				},
				{
					description: 'Calculer un produit',
					subdescription: 'avec simplification simple',
					enounces: ['Calcule en remarquant la simplification.'],
					expressions: ['{&1/&3}*{&2/&1}', '{&3/&1}*{&1/&2}'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]\\{&1}',
							'&3': '$e[2;9]\\{&1;cd&2}',
						},
					],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} \\dfrac{&1}{&3} \\times \\dfrac{&2}{&1} &= \\dfrac{&sol  \\end{align}$$',
							},
						],
						[
							{
								text: '$$\\begin{align} \\dfrac{&3}{&1} \\times \\dfrac{&1}{&2} &= \\dfrac{&3}{&sol  \\end{align}$$',
							},
						],
					],

					defaultDelay: 20,
					grade: QUATRIEME,
				},
				{
					description: 'Calculer un produit',
					subdescription: 'avec peut-être une simplification simple',
					enounces: [''],
					expressions: ['{&1/&3}*{&2/&4}'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
							'&3': '$e[2;9]',
							'&4': '$e[2;9]',
							'&5': 'pgcd(&1*&2;&3*&4)',
						},
					],

					defaultDelay: 20,
					grade: QUATRIEME,
				},
				{
					description: 'Calculer un produit',
					subdescription: 'Nombres, relatifs, pas de simplification',
					expressions: [
						'(&1/&3)*(&2/&4)',
						'((-&1)/&3)*(&2/&4)',
						'(&1/(-&3))*(&2/&4)',
						'(&1/&3)*((-&2)/&4)',
						'(&1/&3)*(&2/(-&4))',
						'((-&1)/(-&3))*((-&2)/(-&4))',

						'((-&1)/(-&3))*(&2/&4)',
						'(&1/&3)*((-&2)/(-&4))',
						'((-&1)/&3)*((-&2)/&4)',
						'(&1/(-&3))*(&2/(-&4))',
						'((-&1)/&3)*(&2/(-&4))',
						'(&1/(-&3))*((-&2)/&4)',

						'(&1/(-&3))*((-&2)/(-&4))',
						'((-&1)/(-&3))*(&2/(-&4))',
						'((-&1)/&3)*((-&2)/(-&4))',
						'((-&1)/(-&3))*((-&2)/&4)',
					],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
							'&3': '$e[2;9]\\{cd(&2);cd(&1)}',
							'&4': '$e[2;9]\\{cd(&2);cd(&1)}',
						},
					],

					defaultDelay: 20,
					grade: QUATRIEME,
				},
			],
			Inverse: [
				{
					description: "Calculer l'inverse d'un nombre",
					enounces: ["Quel est l'inverse de ce nombre :"],
					expressions: ['&1', '1/&1', '&1/&2'],
					variables: [{ '&1': '$e[2;19]', '&2': '$e[2;19]\\{cd(&1)}' }],
					answerFields: ["L'inverse de ce nombre est $$...$$"],
					solutions: [['1/&1'], ['&1'], ['&2/&1']],
					correctionFormat: [
						{
							correct: ["L'inverse de &expression est &answer"],
						},
					],
					defaultDelay: 20,
					grade: QUATRIEME,
				},
				{
					description: "Calculer l'inverse d'un nombre",
					subdescription: 'Avec la notation puissance',
					expressions: ['&1^{-1}', '(1/&1)^{-1}', '(&1/&2)^{-1}'],
					variables: [{ '&1': '$e[2;19]', '&2': '$e[2;19]\\{cd(&1)}' }],
					solutions: [['1/&1'], ['&1'], ['&2/&1']],

					defaultDelay: 20,
					grade: QUATRIEME,
				},
			],
			Division: [
				{
					description: 'Calculer un quotient',
					subdescription:
						'Pas de simplification, avec le symbole de la division',
					expressions: ['{&1/&3}:{&4/&2}'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
							'&3': '$e[2;9]\\{cd(&2);cd(&1)}',
							'&4': '$e[2;9]\\{cd(&2);cd(&1)}',
						},
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \\dfrac{&1}{&3} \\textcolor{${color1}}{\\div \\dfrac{&4}{&2}} &= \\dfrac{&1}{&3} \\textcolor{${color1}}{\\times \\dfrac{&2}{&4}} \\\\ &= \\dfrac{&1 \\times &2}{&3 \\times &4}  \\\\ &= &sol  \\end{align}$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: QUATRIEME,
				},
				{
					description: 'Calculer un quotient',
					subdescription:
						'Division par un entier, avec le symbole de la division',
					expressions: ['{&1/&3}:&2'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]\\{cd(&1)}',
							'&3': '$e[2;9]\\{cd(&1)}',
						},
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \\dfrac{&1}{&3} \\textcolor{${color1}}{\\div &2} &= \\dfrac{&1}{&3} \\textcolor{${color1}}{\\div \\dfrac{&2}{1}} \\\\ &= \\dfrac{&1}{&3} \\textcolor{${color1}}{\\times \\dfrac{1}{&2}} \\\\&= \\dfrac{&1 \\times 1}{&3 \\times &2}  \\\\ &= &sol  \\end{align}$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: QUATRIEME,
				},
				{
					description: 'Calculer un quotient',
					subdescription: 'Pas de simplification',
					expressions: ['{&1/&3}/{&4/&2}'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
							'&3': '$e[2;9]\\{cd(&2);cd(&1)}',
							'&4': '$e[2;9]\\{cd(&2);cd(&1)}',
						},
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \\dfrac{\\dfrac{&1}{&3}}{\\textcolor{${color1}}{\\dfrac{&4}{&2}}} &= \\dfrac{&1}{&3} \\textcolor{${color1}}{\\times \\dfrac{&2}{&4}} \\\\ &= \\dfrac{&1 \\times &2}{&3 \\times &4}  \\\\ &= &sol  \\end{align}$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: QUATRIEME,
				},
				{
					description: 'Calculer un quotient',
					subdescription: 'Division par un entier, avec fraction',
					expressions: ['{&1/&3}/&2'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]\\{cd(&1)}',
							'&3': '$e[2;9]\\{cd(&1)}',
						},
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \\dfrac{\\dfrac{&1}{&3}}{\\textcolor{${color1}}{&2}} &= \\dfrac{&1}{&3} \\textcolor{${color1}}{\\div \\dfrac{&2}{1}} \\\\ &= \\dfrac{&1}{&3} \\textcolor{${color1}}{\\times \\dfrac{1}{&2}} \\\\ &= \\dfrac{&1 \\times 1}{&3 \\times &2}  \\\\ &= &sol  \\end{align}$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: QUATRIEME,
				},
			],
		},
	},
	Puissances: {
		Apprivoiser: {
			Définition: [
				{
					description: 'Traduire un produit en puissance',
					enounces: ["Réécris cette expression à l'aide d'une puissance"],
					expressions: [
						'&1*&1',
						'&1*&1*&1',
						'&1*&1*&1*&1',
						'&1*&1*&1*&1*&1',
						'&1*&1*&1*&1*&1*&1',
						'&1*&1*&1*&1*&1*&1*&1',
					],
					variables: [{ '&1': '$l{a;b;c;x;y;2;3;4;5;6;7;8;9;10}' }],
					solutions: [
						['&1^2'],
						['&1^3'],
						['&1^4'],
						['&1^5'],
						['&1^6'],
						['&1^7'],
					],

					defaultDelay: 20,
					grade: QUATRIEME,
				},
				{
					description: 'Traduire une puissance en produit',
					enounces: ["Réécris cette expression à l'aide d'un produit"],
					expressions: ['&1^2', '&1^3', '&1^4', '&1^5', '&1^6', '&1^7'],

					variables: [{ '&1': '$l{a;b;c;x;y;2;3;4;5;6;7;8;9;10}' }],
					solutions: [
						['&1*&1'],
						['&1*&1*&1'],
						['&1*&1*&1*&1'],
						['&1*&1*&1*&1*&1'],
						['&1*&1*&1*&1*&1*&1'],
						['&1*&1*&1*&1*&1*&1*&1'],
					],

					options: ['no-penalty-for-explicit-products'],
					defaultDelay: 20,
					grade: QUATRIEME,
				},
				{
					description: "Définition d'une puissance à exposant négatif",
					enounces: ['Ecris la définition de cette puissance.'],
					expressions: ['&1^{-&2}'],

					variables: [
						{
							'&1': '$l{a;b;c;x;y;2;3;4;5;6;7;8;9;10}',
							'&2': '$e[2;9]',
						},
					],
					solutions: [['1/{&1^&2}']],
					//  mathlive 
					// qui rajoute des parenthèses au dénominateur quand c'est une puissance
					options: ['no-penalty-for-extraneous-brackets'],
					defaultDelay: 20,
					grade: QUATRIEME,
				},
				{
					description: 'Puissances de 10',
					enounces: ['Ecris cette puissance sous forme décimale.'],
					expressions: ['10^{&1}'],

					variables: [
						{
							'&1': '$er[0;5]',
						},
					],

					'result-type': 'decimal',
					defaultDelay: 20,
					grade: QUATRIEME,
				},
			],
			'Puissances de 10': [
				{
					description: "Ecrire un nombre entier à l'aide d'une puissance de $$10$$",
					subdescription:
						'de la forme avec puissances de $$10$$ à la forme décimale.',
					enounces: ["Ecris ce nombre sous la forme d'un seul nombre entier."],
					expressions: ['&2*10^{&1}'],

					variables: [
						{
							'&1': '$e[0;5]',
							'&2': '$e[2;9]',
						},
					],
					defaultDelay: 20,
					grade: QUATRIEME,
				},
				{
					description: "Ecrire un nombre entier à l'aide d'une puissance de $$10$$",
					subdescription:
						'De la forme décimale à la forme avec puissances de $$10$$.',
					enounces: ["Ecris ce nombre à l'aide d'une puissance de $$10$$."],
					enounces2: ['Exemple : $$400 = 4* 10^2$$'],
					expressions: ['[_&2*10^{&1}_]'],
					solutions: [['&2*10^{&1}']],

					variables: [
						{
							'&1': '$e[1;5]',
							'&2': '$e[2;9]',
						},
					],
					defaultDelay: 20,
					grade: QUATRIEME,
				},
			],
			'Notation scientifique': [
				{
					description:
						"Ecrire un nombre décimal à l'aide de la notation scientifique",
					enounces: ['Ecris ce nombre en notation scientifique.'],
					expressions: ['[._&1,&3*10^{&4}_]'],
					solutions: [['&1,&3*10^{&4}']],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;3]',
							'&3': '$e{&2;&2}',
							'&4': '$er[2;4]',
						},
					],
					// bug de mathlive sur les puissances
					// qui rajoute des parenthèses à l'exposant
					options: ['no-penalty-for-extraneous-brackets'],
					defaultDelay: 20,
					grade: QUATRIEME,
				},
				{
					description:
						"Ecrire un nombre écrit avec une puissance de $$10$$ à l'aide de la notation scientifique",
					enounces: ['Ecris ce nombre en notation scientifique.'],
					expressions: ['[._&1,&3*10^{&4}_]*10^{&5}'],
					solutions: [['&1,&3*10^{[_&4+(&5)_]}']],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;3]',
							'&3': '$e{&2;&2}\\{m(10)}',
							'&4': '$er[2;4]',
							'&5': '$er[2;4]\\{-(&4)}',
						},
					],
					correctionDetails: [
						[
							{
								text: '$$[._&1,&3*10^{&4}_] \\times 10^{&5}=&1,&3 \\times 10^{&4} \\times 10^{&5}=$$ &solution',
							},
						],
					],
					// bug de mathlive sur les puissances
					// qui rajoute des parenthèses à l'exposant
					options: ['no-penalty-for-extraneous-brackets'],
					defaultDelay: 20,
					grade: QUATRIEME,
				},
			],
		},
		Calculer: {
			Multiplier: [
				{
					description: 'Multiplier $$2$$ puissances de $$10$$.',
					subdescription: 'Exposants positifs',
					enounces: [
						"Simplifie en écrivant sous la forme d'une seule puissance de $$10$$.",
					],
					expressions: ['10^&2*10^&3'],
					variables: [
						{
							'&2': '$e[1;9]',
							'&3': '$e[1;9]',
						},
					],
					solutions: [['10^[_&2+&3_]']],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} 10^&2 \\times 10^&3 &= 10^{&2+&3} \\\\ &= &sol  \\end{align}$$',
							},
						],
					],
					// bug de mathlive sur les puissances
					// qui rajoute des parenthèses à l'exposant

					options: ['no-penalty-for-extraneous-brackets'],

					defaultDelay: 20,
					grade: QUATRIEME,
				},

				{
					description: "Multiplier $$2$$ puissances d'un même nombre.",
					subdescription: 'Exposants positifs',
					enounces: [
						"Calcule en écrivant le résultat sous la forme d'une puissance.",
					],
					expressions: ['&1^&2*&1^&3'],
					variables: [
						{
							'&1': '$l{a;b;c;x;y;2;3;4;5;6;7;8;9;10}',
							'&2': '$e[2;5]',
							'&3': '$e[2;5]',
						},
					],
					solutions: [['&1^[_&2+&3_]']],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} &1^&2 \\times &1^&3 &= &1^{&2+&3} \\\\ &= &sol  \\end{align}$$',
							},
						],
					],
					// bug de mathlive sur les puissances
					// qui rajoute des parenthèses à l'exposant
					options: ['no-penalty-for-extraneous-brackets'],

					defaultDelay: 20,
					grade: QUATRIEME,
				},
				{
					description: 'Multiplier $$2$$ puissances de $$10$$',
					subdescription: 'Exposants relatifs',
					enounces: ["Ecris sous la forme d'une seule puissance de $$10$$."],
					expressions: ['10^{&1}*10^{&2}'],
					variables: [
						{
							'&1': '$er[2;5]',
							'&2': '$er[2;5]',
						},
					],
					solutions: [['10^{[_&1+(&2)_]}']],
					conditions: ['abs(&1+(&2))>1'],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} 10^{&1} \\times 10^{&2} &= 10^{&1[+_&2_]} \\\\ &= &sol  \\end{align}$$',
							},
						],
					],
					// bug de mathlive sur les puissances
					// qui rajoute des parenthèses à l'exposant
					options: ['no-penalty-for-extraneous-brackets'],

					defaultDelay: 20,
					grade: QUATRIEME,
				},
				{
					description: "Multiplier $$2$$ puissances d'un même nombre.",
					subdescription: 'Exposants relatifs',
					enounces: [
						"Calcule en écrivant le résultat sous la forme d'une puissance.",
					],
					expressions: ['&1^{&2}*&1^{&3}'],
					variables: [
						{
							'&1': '$l{a;b;c;x;y;2;3;4;5;6;7;8;9;10}',
							'&2': '$er[2;5]',
							'&3': '$er[2;5]\\{-(&2)}',
						},
					],
					conditions: ['abs(&2+(&3))>1'],
					solutions: [['&1^{[_&2+(&3)_]}']],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} &1^{&2} \\times &1^{&3} &= &1^{&2[+_&3_]} \\\\ &= &sol  \\end{align}$$',
							},
						],
					],

					// bug de mathlive sur les puissances
					// qui rajoute des parenthèses à l'exposant
					options: ['no-penalty-for-extraneous-brackets'],
					defaultDelay: 60,
					grade: QUATRIEME,
				},
			],
			Diviser: [
				{
					description: 'Diviser $$2$$ puissances de $$10$$.',
					subdescription: 'Exposants positifs',
					enounces: ["Réécris sous la forme d'une seule puissance de $$10$$."],
					expressions: ['{10^&1}/{10^&2}'],
					variables: [
						{
							'&1': '$e[4;10]',
							'&2': '$e[2;&1-2]',
						},
					],
					solutions: [['10^[_&1-&2_]']],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} \\frac{10^{&1}}{10^{&2}} &= 10^{&1[+_-&2_]} \\\\ &= &sol  \\end{align}$$',
							},
						],
					],

					defaultDelay: 20,
					grade: QUATRIEME,
				},
				{
					description: "Diviser $$2$$ puissances d'un même nombre.",
					subdescription: 'Exposants positifs',
					enounces: [
						"Calcule en écrivant le résultat sous la forme d'une puissance.",
					],
					expressions: ['{&1^&2}/{&1^&3}'],
					variables: [
						{
							'&1': '$l{a;b;c;x;y;2;3;4;5;6;7;8;9;10}',
							'&2': '$e[4;10]',
							'&3': '$e[2;&2-2]',
						},
					],
					solutions: [['&1^[_&2-&3_]']],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} \\frac{&1^{&2}}{&1^{&3}} &= &1^{&2[+_-&3_]} \\\\ &= &sol  \\end{align}$$',
							},
						],
					],
					// bug de mathlive sur les puissances
					// qui rajoute des parenthèses à l'exposant
					options: ['no-penalty-for-extraneous-brackets'],
					defaultDelay: 20,
					grade: TROISIEME,
				},
				{
					description: 'Diviser $$2$$ puissances de $$10$$.',
					subdescription: 'Exposants relatifs',
					enounces: ["Réécris sous la forme d'une seule puissance de $$10$$."],
					expressions: ['{10^{&1}}/{10^{&2}}'],
					variables: [
						{
							'&1': '$er[2;5]',
							'&2': '$er[2;5]',
						},
					],
					conditions: ['abs(&1-(&2))>1'],

					solutions: [['10^{[_&1-(&2)_]}']],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} \\frac{10^{&1}}{10^{&2}} &= 10^{&1[+_-(&2)_]} \\\\ &= &sol  \\end{align}$$',
							},
						],
					],
					// bug de mathlive sur les puissances
					// qui rajoute des parenthèses à l'exposant
					options: ['no-penalty-for-extraneous-brackets'],
					defaultDelay: 20,
					grade: QUATRIEME,
				},
				{
					description: "Diviser $$2$$ puissances d'un même nombre.",
					subdescription: 'Exposants relatifs',
					enounces: [
						"Calcule en écrivant le résultat sous la forme d'une puissance.",
					],
					expressions: ['{&1^{&2}}/{&1^{&3}}'],
					variables: [
						{
							'&1': '$l{a;b;c;x;y;2;3;4;5;6;7;8;9;10}',
							'&2': '$er[2;5]',
							'&3': '$er[2;5]',
						},
					],
					conditions: ['abs(&2-(&3))>1'],
					solutions: [['&1^{[_&2-(&3)_]}']],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} \\frac{&1^{&2}}{&1^{&3}} &= &1^{&2[+_-(&3)_]} \\\\ &= &sol  \\end{align}$$',
							},
						],
					],
					// bug de mathlive sur les puissances
					// qui rajoute des parenthèses à l'exposant
					options: ['no-penalty-for-extraneous-brackets'],
					defaultDelay: 20,
					grade: TROISIEME,
				},
			],
			'Puissance de puissance': [
				{
					description: "Puissance d'une puissance de $$10$$",
					subdescription: 'Exposants positifs',
					enounces: ["Réécris sous la forme d'une seule puissance de $$10$$."],
					expressions: ['(10^&1)^&2'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
						},
					],
					solutions: [['10^{[_&1*&2_]}']],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} \\left(10^&1\\right)^&2 &= 10^{&1 \\times &2} \\\\ &= &sol  \\end{align}$$',
							},
						],
					],
					// bug de mathlive sur les puissances
					// qui rajoute des parenthèses à l'exposant
					options: ['no-penalty-for-extraneous-brackets'],

					defaultDelay: 20,
					grade: QUATRIEME,
				},
				{
					description: "Puissance d'une puissance",
					subdescription: 'Exposants positifs',
					enounces: [
						"Calcule en écrivant le résultat sous la forme d'une puissance.",
					],
					expressions: ['(&1^&2)^&3'],
					variables: [
						{
							'&1': '$l{a;b;c;x;y;2;3;4;5;6;7;8;9;10}',
							'&2': '$e[2;9]',
							'&3': '$e[2;9]',
						},
					],
					solutions: [['&1^{[_&2*&3_]}']],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} \\left(&1^&2\\right)^&3 &= &1^{&2 \\times &3} \\\\ &= &sol  \\end{align}$$',
							},
						],
					],

					// bug de mathlive sur les puissances
					// qui rajoute des parenthèses à l'exposant
					// TODO: a vérifier si le bug existe toujours
					options: ['no-penalty-for-extraneous-brackets'],
					defaultDelay: 20,
					grade: QUATRIEME,
				},
				{
					description: "Puissance d'une puissance de $$10$$",
					subdescription: 'Exposants relatifs',
					enounces: ["Réécris sous la forme d'une seule puissance de $$10$$."],
					expressions: ['(10^{&1})^{&2}'],
					variables: [
						{
							'&1': '$er[2;9]',
							'&2': '$e[2;9]',
						},
						{
							'&1': '$er[2;9]',
							'&2': '-$e[2;9]',
						},
					],
					solutions: [['10^{[_&1*(&2)_]}']],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} \\left(10^{&1}\\right)^{&2} &= 10^{&1 \\times &2} \\\\ &= &sol  \\end{align}$$',
							},
						],
						[
							{
								text: '$$\\begin{align} \\left(10^{&1}\\right)^{&2} &= 10^{&1 \\times (&2)} \\\\ &= &sol  \\end{align}$$',
							},
						],
					],

					// bug de mathlive sur les puissances
					// qui rajoute des parenthèses à l'exposant
					options: ['no-penalty-for-extraneous-brackets'],
					defaultDelay: 20,
					grade: QUATRIEME,
				},

				{
					description: "Puissance d'une puissance",
					subdescription: 'Exposants relatifs',
					enounces: [
						"Calcule en écrivant le résultat sous la forme d'une puissance.",
					],
					expressions: ['(&1^{&2})^{&3}'],
					variables: [
						{
							'&1': '$l{a;b;c;x;y;2;3;4;5;6;7;8;9;10}',
							'&2': '$er[2;9]',
							'&3': '$e[2;9]',
						},
						{
							'&1': '$l{a;b;c;x;y;2;3;4;5;6;7;8;9;10}',
							'&2': '$er[2;9]',
							'&3': '-$e[2;9]',
						},
					],
					solutions: [['&1^{[_&2*(&3)_]}']],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} \\left(&1^{&2}\\right)^{&3} &= &1^{&2 \\times &3} \\\\ &= &sol  \\end{align}$$',
							},
						],
						[
							{
								text: '$$\\begin{align} \\left(&1^{&2}\\right)^{&3} &= &1^{&2 \\times (&3)} \\\\ &= &sol  \\end{align}$$',
							},
						],
					],

					// bug de mathlive sur les puissances
					// qui rajoute des parenthèses à l'exposant
					options: ['no-penalty-for-extraneous-brackets'],
					defaultDelay: 20,
					grade: TROISIEME,
				},
			],
			'Mixer tout ça': [
				{
					description: 'Multiplier et diviser des puissances de $$10$$.',
					subdescription: 'Exposants positifs',
					enounces: ["Réécris sous la forme d'une seule puissance de $$10$$."],
					expressions: ['{10^&1*10^&2}/{10^&3}', '{10^&3}/{10^&1*10^&2}'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
							'&3': '$e[2;&1+&2-2]',
						},
						{
							'&1': '$e[2;4]',
							'&2': '$e[2;3]',
							'&3': '$e[&1+&2+2;9]',
						},
					],
					solutions: [['10^[_&1+&2-&3_]'], ['10^[_&3-&1-&2_]']],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} \\frac{10^{&1}\\times 10^{&2}}{10^{&3}} &= 10^{&1+&2-&3} \\\\ &= &sol  \\end{align}$$',
							},
						],
						[
							{
								text: '$$\\begin{align} \\frac{10^{&3}}{10^{&1} \\times 10^{&2}} &= 10^{&3-(&1+&2)} \\\\ &= &sol  \\end{align}$$',
							},
						],
					],
					// bug de mathlive sur les puissances
					// qui rajoute des parenthèses à l'exposant
					options: ['no-penalty-for-extraneous-brackets'],
					defaultDelay: 20,
					grade: QUATRIEME,
				},
			],
		},
	},
	Grandeurs: {
		Unités: {
			'Unités simples': [
				{
					description: 'Convertir dans une autre unité',
					subdescription: "Conversion vers l'unité de référence",
					enounces: ["Convertis dans l'unité demandée."],
					variables: [
						{
							'&1': '$e[1;9]',
						},
					],
					expressions: [
						'&1 km = ? m',
						'&1 hm = ? m',
						'&1 dam = ? m',
						'&1 dm = ? m',
						'&1 cm = ? m',
						'&1 mm = ? m',
						'&1 kL = ? L',
						'&1 hL = ? L',
						'&1 daL = ? L',
						'&1 dL = ? L',
						'&1 cL = ? L',
						'&1 mL = ? L',
						'&1 kg = ? g',
						'&1 hg = ? g',
						'&1 dag = ? g',
						'&1 dg = ? g',
						'&1 cg = ? g',
						'&1 mg = ? g',
					],
					solutions: [
						['[._&1*1000_]'],
						['[._&1*100_]'],
						['[._&1*10_]'],
						['[._&1*0.1_]'],
						['[._&1*0.01_]'],
						['[._&1*0.001_]'],
						['[._&1*1000_]'],
						['[._&1*100_]'],
						['[._&1*10_]'],
						['[._&1*0.1_]'],
						['[._&1*0.01_]'],
						['[._&1*0.001_]'],
						['[._&1*1000_]'],
						['[._&1*100_]'],
						['[._&1*10_]'],
						['[._&1*0.1_]'],
						['[._&1*0.01_]'],
						['[._&1*0.001_]'],
					],
					type: 'fill in',
					'result-type': 'decimal',
					defaultDelay: 20,
					grade: SIXIEME,
				},
				{
					description: 'Convertir dans une autre unité',
					subdescription: 'Autres conversions',
					enounces: ["Convertis dans l'unité demandée."],
					variables: [
						{
							'&1': '$e[1;9]',
						},
					],
					expressions: [
						'&1 km = ? mm',
						'&1 km = ? cm',
						'&1 km = ? dm',
						'&1 km = ? m',
						'&1 km = ? dam',
						'&1 km = ? hm',

						'&1 hm = ? mm',
						'&1 hm = ? cm',
						'&1 hm = ? dm',
						'&1 hm = ? m',
						'&1 hm = ? dam',

						'&1 dam = ? mm',
						'&1 dam = ? cm',
						'&1 dam = ? dm',
						'&1 dam = ? m',

						'&1 m = ? mm',
						'&1 m = ? cm',
						'&1 m = ? dm',

						'&1 dm = ? mm',
						'&1 dm = ? cm',

						'&1 cm = ? mm',

						'&1 mm = ? km',
						'&1 cm = ? km ',
						'&1 dm = ? km',
						'&1 m = ? km',
						'&1 dam = ? km',
						'&1 hm = ? km',

						'&1 mm = ? hm',
						'&1 cm = ? hm',
						'&1 dm = ? hm',
						'&1 m = ? hm',
						'&1 dam = ? hm',

						'&1 mm = ? dam',
						'&1 cm = ? dam',
						'&1 dm = ? dam',
						'&1 m = ? dam',

						'&1 mm = ? m',
						'&1 cm = ? m',
						'&1 dm = ? m',

						'&1 mm = ? dm',
						'&1 cm = ? dm',

						'&1 mm = ? cm',

						'&1 kg = ? mg',
						'&1 kg = ? cg',
						'&1 kg = ? dg',
						'&1 kg = ? g',
						'&1 kg = ? dag',
						'&1 kg = ? hg',

						'&1 hg = ? mg',
						'&1 hg = ? cg',
						'&1 hg = ? dg',
						'&1 hg = ? g',
						'&1 hg = ? dag',

						'&1 dag = ? mg',
						'&1 dag = ? cg',
						'&1 dag = ? dg',
						'&1 dag = ? g',

						'&1 g = ? mg',
						'&1 g = ? cg',
						'&1 g = ? dg',

						'&1 dg = ? mg',
						'&1 dg = ? cg',

						'&1 cg = ? mg',

						'&1 mg = ? kg',
						'&1 cg = ? kg ',
						'&1 dg = ? kg',
						'&1 g = ? kg',
						'&1 dag = ? kg',
						'&1 hg = ? kg',

						'&1 mg = ? hg',
						'&1 cg = ? hg',
						'&1 dg = ? hg',
						'&1 g = ? hg',
						'&1 dag = ? hg',

						'&1 mg = ? dag',
						'&1 cg = ? dag',
						'&1 dg = ? dag',
						'&1 g = ? dag',

						'&1 mg = ? g',
						'&1 cg = ? g',
						'&1 dg = ? g',

						'&1 mg = ? dg',
						'&1 cg = ? dg',

						'&1 mg = ? cg',

						'&1 kL = ? mL',
						'&1 kL = ? cL',
						'&1 kL = ? dL',
						'&1 kL = ? L',
						'&1 kL = ? daL',
						'&1 kL = ? hL',

						'&1 hL = ? mL',
						'&1 hL = ? cL',
						'&1 hL = ? dL',
						'&1 hL = ? L',
						'&1 hL = ? daL',

						'&1 daL = ? mL',
						'&1 daL = ? cL',
						'&1 daL = ? dL',
						'&1 daL = ? L',

						'&1 L = ? mL',
						'&1 L = ? cL',
						'&1 L = ? dL',

						'&1 dL = ? mL',
						'&1 dL = ? cL',

						'&1 cL = ? mL',

						'&1 mL = ? kL',
						'&1 cL = ? kL ',
						'&1 dL = ? kL',
						'&1 L = ? kL',
						'&1 daL = ? kL',
						'&1 hL = ? kL',

						'&1 mL = ? hL',
						'&1 cL = ? hL',
						'&1 dL = ? hL',
						'&1 L = ? hL',
						'&1 daL = ? hL',

						'&1 mL = ? daL',
						'&1 cL = ? daL',
						'&1 dL = ? daL',
						'&1 L = ? daL',

						'&1 mL = ? L',
						'&1 cL = ? L',
						'&1 dL = ? L',

						'&1 mL = ? dL',
						'&1 cL = ? dL',

						'&1 mL = ? cL',
					],
					solutions: [
						['[_&1*1000000_]'],
						['[_&1*100000_]'],
						['[_&1*10000_]'],
						['[_&1*1000_]'],
						['[_&1*100_]'],
						['[_&1*10_]'],

						['[_&1*100000_]'],
						['[_&1*10000_]'],
						['[_&1*1000_]'],
						['[_&1*100_]'],
						['[_&1*10_]'],

						['[_&1*10000_]'],
						['[_&1*1000_]'],
						['[_&1*100_]'],
						['[_&1*10_]'],

						['[_&1*1000_]'],
						['[_&1*100_]'],
						['[_&1*10_]'],

						['[_&1*100_]'],
						['[_&1*10_]'],

						['[_&1*10_]'],

						['[._&1:1000000_]'],
						['[._&1:100000_]'],
						['[._&1:10000_]'],
						['[._&1:1000_]'],
						['[._&1:100_]'],
						['[._&1:10_]'],

						['[._&1:100000_]'],
						['[._&1:10000_]'],
						['[._&1:1000_]'],
						['[._&1:100_]'],
						['[._&1:10_]'],

						['[._&1:10000_]'],
						['[._&1:1000_]'],
						['[._&1:100_]'],
						['[._&1:10_]'],

						['[._&1:1000_]'],
						['[._&1:100_]'],
						['[._&1:10_]'],

						['[._&1:100_]'],
						['[._&1:10_]'],

						['[._&1:10_]'],

						['[_&1*1000000_]'],
						['[_&1*100000_]'],
						['[_&1*10000_]'],
						['[_&1*1000_]'],
						['[_&1*100_]'],
						['[_&1*10_]'],

						['[_&1*100000_]'],
						['[_&1*10000_]'],
						['[_&1*1000_]'],
						['[_&1*100_]'],
						['[_&1*10_]'],

						['[_&1*10000_]'],
						['[_&1*1000_]'],
						['[_&1*100_]'],
						['[_&1*10_]'],

						['[_&1*1000_]'],
						['[_&1*100_]'],
						['[_&1*10_]'],

						['[_&1*100_]'],
						['[_&1*10_]'],

						['[_&1*10_]'],

						['[._&1:1000000_]'],
						['[._&1:100000_]'],
						['[._&1:10000_]'],
						['[._&1:1000_]'],
						['[._&1:100_]'],
						['[._&1:10_]'],

						['[._&1:100000_]'],
						['[._&1:10000_]'],
						['[._&1:1000_]'],
						['[._&1:100_]'],
						['[._&1:10_]'],

						['[._&1:10000_]'],
						['[._&1:1000_]'],
						['[._&1:100_]'],
						['[._&1:10_]'],

						['[._&1:1000_]'],
						['[._&1:100_]'],
						['[._&1:10_]'],

						['[._&1:100_]'],
						['[._&1:10_]'],

						['[._&1:10_]'],

						['[_&1*1000000_]'],
						['[_&1*100000_]'],
						['[_&1*10000_]'],
						['[_&1*1000_]'],
						['[_&1*100_]'],
						['[_&1*10_]'],

						['[_&1*100000_]'],
						['[_&1*10000_]'],
						['[_&1*1000_]'],
						['[_&1*100_]'],
						['[_&1*10_]'],

						['[_&1*10000_]'],
						['[_&1*1000_]'],
						['[_&1*100_]'],
						['[_&1*10_]'],

						['[_&1*1000_]'],
						['[_&1*100_]'],
						['[_&1*10_]'],

						['[_&1*100_]'],
						['[_&1*10_]'],

						['[_&1*10_]'],

						['[._&1:1000000_]'],
						['[._&1:100000_]'],
						['[._&1:10000_]'],
						['[._&1:1000_]'],
						['[._&1:100_]'],
						['[._&1:10_]'],

						['[._&1:100000_]'],
						['[._&1:10000_]'],
						['[._&1:1000_]'],
						['[._&1:100_]'],
						['[._&1:10_]'],

						['[._&1:10000_]'],
						['[._&1:1000_]'],
						['[._&1:100_]'],
						['[._&1:10_]'],

						['[._&1:1000_]'],
						['[._&1:100_]'],
						['[._&1:10_]'],

						['[._&1:100_]'],
						['[._&1:10_]'],

						['[._&1:10_]'],
					],
					type: 'fill in',
					defaultDelay: 20,
					grade: SIXIEME,
				},
				{
					description: 'Calculer avec des unités',
					subdescription: '',
					enounces: [
						' Calcule et donne le résutat en mètres (m)',
						' Calcule et donne le résutat en grammes (g)',
						' Calcule et donne le résutat en litres (L)',
					],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]',
							'&3': '$l{&1 km; &1 hm ; &1 dam ; &1 dm ; &1 cm ; &1 mm}',
							'&4': '$l{&2 m}',
						},
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]',
							'&3': '$l{&1 kg; &1 hg ; &1 dag ; &1 dg ; &1 cg ; &1 mg}',
							'&4': '$l{&2 g}',
						},
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]',
							'&3': '$l{&1 kL; &1 hL ; &1 daL ; &1 dL ; &1 cL ; &1 mL}',
							'&4': '$l{&2 L}',
						},
					],
					answerFields: [
						'$$&3 + &4 = ? m$$',
						'$$&3 + &4 = ? g$$',
						'$$&3 + &4 = ? L$$',
					],
					solutions: [
						['[_(&3+&4)/(1 m)_]'],
						['[_(&3+&4)/(1 g)_]'],
						['[_(&3+&4)/(1 L)_]'],
					],

					// testAnswers: [
					// 	['&3+&4 = &answer m'],
					// 	['&3+&4 = &answer g'],
					// 	['&3+&4 = &answer L'],
					// ],
					correctionFormat: [
						{
							correct: ['$$&3+&4=$$&answer m'],
						},
						{
							correct: ['$$&3+&4=$$&answer g'],
						},
						{
							correct: ['$$&3+&4=$$&answer L'],
						},
					],
					'result-type': 'decimal',
					defaultDelay: 20,
					grade: SIXIEME,
				},
				{
					description: 'Calculer avec des unités',
					subdescription: "L'unité est choisie par l'utilisateur",
					enounces: [
						" Calcule (Tu peux choisir l'unité que tu veux mais tu ne dois pas oublier de la mettre au résultat.)",
					],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]',
							'&3': '$l{&1 km; &1 hm ; &1 dam ; &1 dm ; &1 cm ; &1 mm}',
							'&4': '$l{&2 m}',
						},
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]',
							'&3': '$l{&1 kg; &1 hg ; &1 dag ; &1 dg ; &1 cg ; &1 mg}',
							'&4': '$l{&2 g}',
						},
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]',
							'&3': '$l{&1 kL; &1 hL ; &1 daL ; &1 dL ; &1 cL ; &1 mL}',
							'&4': '$l{&2 L}',
						},
					],
					expressions: ['&3 + &4'],

					'result-type': 'decimal',
					defaultDelay: 20,
					grade: SIXIEME,
				},
			],
			'Unités composées': [
				{
					description: 'Convertir dans une autre unité',
					subdescription: "Unités d'aire",
					enounces: ["Convertis dans l'unité demandée."],
					variables: [
						{
							'&1': '$e[1;9]',
						},
					],
					expressions: [
						'&1 km^2 = ? m^2',
						'&1 hm^2 = ? m^2',
						'&1 dam^2 = ? m^2',
						'&1 dm^2 = ? m^2',
						'&1 cm^2 = ? m^2',
						'&1 mm^2 = ? m^2',

						'&1 km^2 = ? hm^2',
						'&1 hm^2 = ? dam^2',
						'&1 m^2 = ? dm^2',
						'&1 dm^2 = ? cm^2',
						'&1 cm^2 = ? mm^2',

						'&1 mm^2 = ? cm^2',
						'&1 cm^2 = ? dm^2',
						'&1 dm^2 = ? m^2',
						'&1 m^2 = ? dam^2',
						'&1 dam^2 = ? hm^2',
						'&1 hm^2 = ? km^2',
					],
					solutions: [
						['[._&1*1000000_]'],
						['[._&1*10000_]'],
						['[._&1*100_]'],
						['[._&1*0.01_]'],
						['[._&1*0.0001_]'],
						['[._&1*0.000001_]'],

						['[._&1*100_]'],
						['[._&1*100_]'],
						['[._&1*100_]'],
						['[._&1*100_]'],
						['[._&1*100_]'],

						['[._&1*0.01_]'],
						['[._&1*0.01_]'],
						['[._&1*0.01_]'],
						['[._&1*0.01_]'],
						['[._&1*0.01_]'],
						['[._&1*0.01_]'],
					],
					type: 'fill in',
					'result-type': 'decimal',
					defaultDelay: 20,
					grade: SIXIEME,
				},
				{
					description: 'Convertir dans une autre unité',
					subdescription: 'Unités de volume',
					enounces: ["Convertis dans l'unité demandée."],
					variables: [
						{
							'&1': '$e[1;9]',
						},
					],
					expressions: [
						'&1 hm^3 = ? m^3',
						'&1 dam^3 = ? m^3',
						'&1 dm^3 = ? m^3',
						'&1 cm^3 = ? m^3',

						'&1 km^3 = ? hm^3',
						'&1 hm^3 = ? dam^3',
						'&1 m^3 = ? dm^3',
						'&1 dm^3 = ? cm^3',
						'&1 cm^3 = ? mm^3',

						'&1 mm^3 = ? cm^3',
						'&1 cm^3 = ? dm^3',
						'&1 dm^3 = ? m^3',
						'&1 m^3 = ? dam^3',
						'&1 dam^3 = ? hm^3',
						'&1 hm^3 = ? km^3',
					],
					solutions: [
						['[._&1*1000000_]'],
						['[._&1*1000_]'],
						['[._&1*0.001_]'],
						['[._&1*0.000001_]'],

						['[._&1*1000_]'],
						['[._&1*1000_]'],
						['[._&1*1000_]'],
						['[._&1*1000_]'],
						['[._&1*1000_]'],

						['[._&1*0.001_]'],
						['[._&1*0.001_]'],
						['[._&1*0.001_]'],
						['[._&1*0.001_]'],
						['[._&1*0.001_]'],
						['[._&1*0.001_]'],
					],
					type: 'fill in',
					'result-type': 'decimal',
					defaultDelay: 20,
					grade: SIXIEME,
				},
			],
		},
		Périmètres: {
			"Périmètre d'un carré": [
				{
					description: "Calcul du périmètre d'un carré.",
					subdescription: "A partir d'une description",
					enounces: [
						"Quel est le périmètre d'un <b>carré</b> de côté $$&1$$ ?",
					],
					variables: [
						{
							'&1': '$e[1;11] mm',
						},
						{
							'&1': '$e[1;11] cm',
						},
						{
							'&1': '$e[1;11] dm',
						},
						{
							'&1': '$e[1;11] m',
						},
						{
							'&1': '$e[1;11] dam',
						},
						{
							'&1': '$e[1;11] hm',
						},
						{
							'&1': '$e[1;11] km',
						},
					],
					solutions: [
						['[_4*&1_mm_]'],

						['[_4*&1_cm_]'],
						['[_4*&1_dm_]'],
						['[_4*&1_m_]'],
						['[_4*&1_dam_]'],
						['[_4*&1_hm_]'],
						['[_4*&1_km_]'],
					],
					correctionFormat: [
						{
							correct: ['Le périmètre du carré est &answer.'],
						},
					],
					correctionDetails: [
						[
							{
								text: "Le périmètre d'un carré de côté $$[°&1°]$$  est $$[°&1*4°] =$$ &solution.",
							},
						],
					],

					defaultDelay: 15,
					grade: SIXIEME,
				},
				{
					description: "Trouver le côté d'un carré connaissant son périmètre.",
					subdescription: "A partir d'une description.",
					enounces: [
						"Quelle est la longueur du côté d'un <b>carré</b> de périmètre $$[_4*&1_mm_]$$ ?",
						"Quelle est la longueur du côté d'un <b>carré</b> de périmètre $$[_4*&1_cm_]$$ ?",
						"Quelle est la longueur du côté d'un <b>carré</b> de périmètre $$[_4*&1_dm_]$$ ?",
						"Quelle est la longueur du côté d'un <b>carré</b> de périmètre $$[_4*&1_m_]$$ ?",
						"Quelle est la longueur du côté d'un <b>carré</b> de périmètre $$[_4*&1_dam_]$$ ?",
						"Quelle est la longueur du côté d'un <b>carré</b> de périmètre $$[_4*&1_hm_]$$ ?",
						"Quelle est la longueur du côté d'un <b>carré</b> de périmètre $$[_4*&1_km_]$$ ?",
					],
					variables: [
						{
							'&1': '$e[1;11] mm',
						},
						{
							'&1': '$e[1;11] cm',
						},
						{
							'&1': '$e[1;11] dm',
						},
						{
							'&1': '$e[1;11] m',
						},
						{
							'&1': '$e[1;11] dam',
						},
						{
							'&1': '$e[1;11] hm',
						},
						{
							'&1': '$e[1;11] km',
						},
					],
					solutions: [['&1']],
					correctionFormat: [
						{
							correct: ['La longueur du côté est &answer.'],
						},
					],
					correctionDetails: [
						[
							{
								text: "La longueur du côté d'un carré de périmètre $$[_4*&1_mm_]$$ est $$[_4*&1_mm_] \\div 4 =$$ &solution.",
							},
						],
						[
							{
								text: "La longueur du côté d'un carré de périmètre $$[_4*&1_cm_]$$ est $$[_4*&1_cm_] \\div 4 =$$ &solution.",
							},
						],
						[
							{
								text: "La longueur du côté d'un carré de périmètre $$[_4*&1_dm_]$$ est $$[_4*&1_dm_] \\div 4 =$$ &solution.",
							},
						],
						[
							{
								text: "La longueur du côté d'un carré de périmètre $$[_4*&1_m_]$$ est $$[_4*&1_m_] \\div 4 =$$ &solution.",
							},
						],
						[
							{
								text: "La longueur du côté d'un carré de périmètre $$[_4*&1_dam_]$$ est $$[_4*&1_dam_] \\div 4 =$$ &solution.",
							},
						],
						[
							{
								text: "La longueur du côté d'un carré de périmètre $$[_4*&1_hm_]$$ est $$[_4*&1_hm_] \\div 4 =$$ &solution.",
							},
						],
						[
							{
								text: "La longueur du côté d'un carré de périmètre $$[_4*&1_km_]$$ est $$[_4*&1_km_] \\div 4 =$$ &solution.",
							},
						],
					],

					defaultDelay: 15,
					grade: SIXIEME,
				},
			],
			"Périmètre d'un rectangle": [
				{
					description: "Calcul du périmètre d'un rectangle.",
					subdescription: "A partir d'une description",
					enounces: [
						"Quel est le périmètre d'un <b>rectangle</b> de longueur $$&3$$ et de largeur $$&4$$ ?",
					],
					variables: [
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 mm',
							'&4': '&2 mm',
						},
					],
					solutions: [
						['[_(&3+&4)*2_mm_]'],
						['[_(&3+&4)*2_cm_]'],
						['[_(&3+&4)*2_dm_]'],
						['[_(&3+&4)*2_m_]'],
						['[_(&3+&4)*2_dam_]'],
						['[_(&3+&4)*2_hm_]'],
						['[_(&3+&4)*2_km_]'],
					],
					correctionFormat: [
						{
							correct: ['Le périmètre du rectangle est &answer.'],
						},
					],
					correctionDetails: [
						[
							{
								text: "Le périmètre d'un rectangle de longueur $$[°&3°]$$ et de largeur $$[°&4°]$$ est $$[°(&3+&4)*2°] =$$ &solution.",
							},
						],
					],

					defaultDelay: 15,
					grade: SIXIEME,
				},
				{
					description: "Trouver la largeur d'un rectangle.",
					subdescription: 'A partir de son aire et de sa longueur.',
					enounces: [
						"Quelle est la largeur d'un <b>rectangle</b> de longueur $$&3$$ et d'aire $$[_&3*&4_mm^2_]$$ ?",
						"Quelle est la largeur d'un <b>rectangle</b> de longueur $$&3$$ et d'aire $$[_&3*&4_cm^2_]$$ ?",
						"Quelle est la largeur d'un <b>rectangle</b> de longueur $$&3$$ et d'aire $$[_&3*&4_dm^2_]$$ ?",
						"Quelle est la largeur d'un <b>rectangle</b> de longueur $$&3$$ et d'aire $$[_&3*&4_m^2_]$$ ?",
						"Quelle est la largeur d'un <b>rectangle</b> de longueur $$&3$$ et d'aire $$[_&3*&4_dam^2_]$$ ?",
						"Quelle est la largeur d'un <b>rectangle</b> de longueur $$&3$$ et d'aire $$[_&3*&4_hm^2_]$$ ?",
						"Quelle est la largeur d'un <b>rectangle</b> de longueur $$&3$$ et d'aire $$[_&3*&4_km^2_]$$ ?",
					],
					variables: [
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 mm',
							'&4': '&2 mm',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 cm',
							'&4': '&2 cm',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 dm',
							'&4': '&2 dm',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 m',
							'&4': '&2 m',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 dam',
							'&4': '&2 dam',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 hm',
							'&4': '&2 hm',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 km',
							'&4': '&2 km',
						},
					],
					solutions: [['&4']],
					correctionFormat: [
						{
							correct: ['La largeur est de &answer.'],
						},
					],
					correctionDetails: [
						[
							{
								text: "La largeur d'un rectangle de longueur $$[°&3°]$$ et d'aire $$[_&3*&4_mm^2_]$$  est &solution car $$[°&3°] \\times &sol = [_&3*&4_mm^2_]$$.",
							},
						],
						[
							{
								text: "La largeur d'un rectangle de longueur $$[°&3°]$$ et d'aire $$[_&3*&4_cm^2_]$$  est &solution car $$[°&3°] \\times &sol = [_&3*&4_cm^2_]$$.",
							},
						],
						[
							{
								text: "La largeur d'un rectangle de longueur $$[°&3°]$$ et d'aire $$[_&3*&4_dm^2_]$$  est &solution car $$[°&3°] \\times &sol = [_&3*&4_dm^2_]$$.",
							},
						],
						[
							{
								text: "La largeur d'un rectangle de longueur $$[°&3°]$$ et d'aire $$[_&3*&4_m^2_]$$  est &solution car $$[°&3°] \\times &sol = [_&3*&4_m^2_]$$.",
							},
						],
						[
							{
								text: "La largeur d'un rectangle de longueur $$[°&3°]$$ et d'aire $$[_&3*&4_dam^2_]$$  est &solution car $$[°&3°] \\times &sol = [_&3*&4_dam^2_]$$.",
							},
						],
						[
							{
								text: "La largeur d'un rectangle de longueur $$[°&3°]$$ et d'aire $$[_&3*&4_hm^2_]$$  est &solution car $$[°&3°] \\times &sol = [_&3*&4_hm^2_]$$.",
							},
						],
						[
							{
								text: "La largeur d'un rectangle de longueur $$[°&3°]$$ et d'aire $$[_&3*&4_km^2_]$$  est &solution car $$[°&3°] \\times &sol = [_&3*&4_km^2_]$$.",
							},
						],
					],

					defaultDelay: 20,
					grade: SIXIEME,
				},
			],
		},
		Aires: {
			"Aire d'un carré": [
				{
					description: "Calcul de l'aire d'un carré.",
					subdescription: "A partir d'une description",
					enounces: ["Quelle est l'aire d'un <b>carré</b> de côté $$&1$$ ?"],
					variables: [
						{
							'&1': '$e[1;11] mm',
						},
						{
							'&1': '$e[1;11] cm',
						},
						{
							'&1': '$e[1;11] dm',
						},
						{
							'&1': '$e[1;11] m',
						},
						{
							'&1': '$e[1;11] dam',
						},
						{
							'&1': '$e[1;11] hm',
						},
						{
							'&1': '$e[1;11] km',
						},
					],
					solutions: [
						['[_&1*&1_mm^2_] '],
						['[_&1*&1_cm^2_]'],
						['[_&1*&1_dm^2_]'],
						['[_&1*&1_m^2_]'],
						['[_&1*&1_dam^2_] '],
						['[_&1*&1_hm^2_]'],
						['[_&1*&1_km^2_]'],
					],
					correctionFormat: [
						{
							correct: ["L'aire du carré est &answer."],
						},
					],
					correctionDetails: [
						[
							{
								text: "L'aire d'un carré de côté $$[°&1°]$$  est $$[°&1°] \\times [°&1°] =$$ &solution.",
							},
						],
					],

					defaultDelay: 15,
					grade: SIXIEME,
				},
				{
					description: "Trouver le côté d'un carré connaissant son aire.",
					subdescription: "A partir d'une description.",
					enounces: [
						"Quelle est la longueur du côté d'un <b>carré</b> d'aire $$[._&1*&1_]\\,mm^2$$ ?",
						"Quelle est la longueur du côté d'un <b>carré</b> d'aire $$[._&1*&1_]\\, cm^2$$ ?",
						"Quelle est la longueur du côté d'un <b>carré</b> d'aire $$[._&1*&1_]\\, dm^2$$ ?",
						"Quelle est la longueur du côté d'un <b>carré</b> d'aire $$[._&1*&1_]\\, m^2$$ ?",
						"Quelle est la longueur du côté d'un <b>carré</b> d'aire $$[._&1*&1_]\\, dam^2$$ ?",
						"Quelle est la longueur du côté d'un <b>carré</b> d'aire $$[._&1*&1_]\\, hm^2$$ ?",
						"Quelle est la longueur du côté d'un <b>carré</b> d'aire $$[._&1*&1_]\\, km^2$$ ?",
					],
					variables: [
						{
							'&1': '$e[1;11]',
						},
					],
					solutions: [
						['&1 mm'],
						['&1 cm'],
						['&1 dm'],
						['&1 m'],
						['&1 dam'],
						['&1 hm'],
						['&1 km'],
					],
					correctionFormat: [
						{
							correct: ['La longueur du côté est &answer.'],
						},
					],
					correctionDetails: [
						[
							{
								text: "La longueur du côté d'un carré d'aire $$[._&1*&1_]\\,mm^2$$ est &solution car $$&1\\,mm \\times &1\\,mm = [_&1*&1_]\\,mm^2$$.",
							},
						],
						[
							{
								text: "La longueur du côté d'un carré d'aire $$[._&1*&1_]\\,cm^2$$ est &solution car $$&1\\,cm \\times &1\\,cm = [_&1*&1_]\\,cm^2$$.",
							},
						],
						[
							{
								text: "La longueur du côté d'un carré d'aire $$[._&1*&1_]\\,dm^2$$ est &solution car $$&1\\,dm \\times &1\\,dm = [_&1*&1_]\\,dm^2$$.",
							},
						],
						[
							{
								text: "La longueur du côté d'un carré d'aire $$[._&1*&1_]\\,m^2$$ est &solution car $$&1\\,m \\times &1\\,m = [_&1*&1_]\\,m^2$$.",
							},
						],
						[
							{
								text: "La longueur du côté d'un carré d'aire $$[._&1*&1_]\\,dam^2$$ est &solution car $$&1\\,dam \\times &1\\,dam = [_&1*&1_]\\,dam^2$$.",
							},
						],
						[
							{
								text: "La longueur du côté d'un carré d'aire $$[._&1*&1_]\\,hm^2$$ est &solution car $$&1\\,hm \\times &1\\,hm = [_&1*&1_]\\,hm^2$$.",
							},
						],
						[
							{
								text: "La longueur du côté d'un carré d'aire $$[._&1*&1_]\\,km^2$$ est &solution car $$&1\\,km \\times &1\\,km = [_&1*&1_]\\,km^2$$.",
							},
						],
					],

					defaultDelay: 15,
					grade: SIXIEME,
				},
			],

			"Aire d'un rectangle": [
				{
					description: "Calcul de l'aire d'un rectangle.",
					subdescription: "A partir d'une description",
					enounces: [
						"Quelle est l'aire d'un <b>rectangle</b> de longueur $$[°&3°]$$ et de largeur $$[°&4°]$$ ?",
					],
					variables: [
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 mm',
							'&4': '&2 mm',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 cm',
							'&4': '&2 cm',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 dm',
							'&4': '&2 dm',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 m',
							'&4': '&2 m',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 dam',
							'&4': '&2 dam',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 hm',
							'&4': '&2 hm',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 km',
							'&4': '&2 km',
						},
					],
					solutions: [
						['[_&3*&4_mm^2_]'],
						['[_&3*&4_cm^2_]'],
						['[_&3*&4_dm^2_]'],
						['[_&3*&4_m^2_]'],
						['[_&3*&4_dam^2_]'],
						['[_&3*&4_hm^2_]'],
						['[_&3*&4_km^2_]'],
					],
					correctionFormat: [
						{
							correct: ["L'aire du rectangle est &answer."],
						},
					],
					correctionDetails: [
						[
							{
								text: "L'aire d'un rectangle de longueur $$[°&3°]$$ et de largeur $$[°&4°]$$  est $$[°&3°] \\times [°&4°] =$$ &solution.",
							},
						],
					],

					defaultDelay: 15,
					grade: SIXIEME,
				},
				{
					description: "Trouver la largeur d'un rectangle.",
					subdescription: 'A partir de son aire et de sa longueur.',
					enounces: [
						"Quelle est la largeur d'un <b>rectangle</b> de longueur $$&3$$ et d'aire $$[_&3*&4_mm^2_]$$ ?",
						"Quelle est la largeur d'un <b>rectangle</b> de longueur $$&3$$ et d'aire $$[_&3*&4_cm^2_]$$ ?",
						"Quelle est la largeur d'un <b>rectangle</b> de longueur $$&3$$ et d'aire $$[_&3*&4_dm^2_]$$ ?",
						"Quelle est la largeur d'un <b>rectangle</b> de longueur $$&3$$ et d'aire $$[_&3*&4_m^2_]$$ ?",
						"Quelle est la largeur d'un <b>rectangle</b> de longueur $$&3$$ et d'aire $$[_&3*&4_dam^2_]$$ ?",
						"Quelle est la largeur d'un <b>rectangle</b> de longueur $$&3$$ et d'aire $$[_&3*&4_hm^2_]$$ ?",
						"Quelle est la largeur d'un <b>rectangle</b> de longueur $$&3$$ et d'aire $$[_&3*&4_km^2_]$$ ?",
					],
					variables: [
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 mm',
							'&4': '&2 mm',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 cm',
							'&4': '&2 cm',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 dm',
							'&4': '&2 dm',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 m',
							'&4': '&2 m',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 dam',
							'&4': '&2 dam',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 hm',
							'&4': '&2 hm',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 km',
							'&4': '&2 km',
						},
					],
					solutions: [['&4']],
					correctionFormat: [
						{
							correct: ['La largeur du rectangle est &answer.'],
						},
					],
					correctionDetails: [
						[
							{
								text: "La largeur d'un rectangle de longueur $$[°&3°]$$ et d'aire $$[_&3*&4_mm^2_]$$  est &solution car   $$[°&3°] \\times &sol = [_&3*&4_mm^2_]$$.",
							},
						],
						[
							{
								text: "La largeur d'un rectangle de longueur $$[°&3°]$$ et d'aire $$[_&3*&4_cm^2_]$$  est &solution car   $$[°&3°] \\times &sol = [_&3*&4_cm^2_]$$.",
							},
						],
						[
							{
								text: "La largeur d'un rectangle de longueur $$[°&3°]$$ et d'aire $$[_&3*&4_dm^2_]$$  est &solution car   $$[°&3°] \\times &sol = [_&3*&4_dm^2_]$$.",
							},
						],
						[
							{
								text: "La largeur d'un rectangle de longueur $$[°&3°]$$ et d'aire $$[_&3*&4_m^2_]$$  est &solution car   $$[°&3°] \\times &sol = [_&3*&4_m^2_]$$.",
							},
						],
						[
							{
								text: "La largeur d'un rectangle de longueur $$[°&3°]$$ et d'aire $$[_&3*&4_dam^2_]$$  est &solution car   $$[°&3°] \\times &sol = [_&3*&4_dam^2_]$$.",
							},
						],
						[
							{
								text: "La largeur d'un rectangle de longueur $$[°&3°]$$ et d'aire $$[_&3*&4_hm^2_]$$  est &solution car   $$[°&3°] \\times &sol = [_&3*&4_hm^2_]$$.",
							},
						],
						[
							{
								text: "La largeur d'un rectangle de longueur $$[°&3°]$$ et d'aire $$[_&3*&4_km^2_]$$  est &solution car   $$[°&3°] \\times &sol = [_&3*&4_km^2_]$$.",
							},
						],
					],

					defaultDelay: 20,
					grade: SIXIEME,
				},
			],
			"Aire d'un triangle rectangle": [
				{
					description: "Calcul de l'aire d'un triangle rectangle.",
					subdescription: "A partir d'une description",
					enounces: [
						"Quelle est l'aire d'un <b>triangle rectangle</b> de longueur $$&3$$ et de largeur $$&4$$ ?",
					],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]\\{&1}',
							'&3': '&1 mm',
							'&4': '&2 mm',
						},
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]\\{&1}',
							'&3': '&1 cm',
							'&4': '&2 cm',
						},
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]\\{&1}',
							'&3': '&1 dm',
							'&4': '&2 dm',
						},
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]\\{&1}',
							'&3': '&1 m',
							'&4': '&2 m',
						},
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]\\{&1}',
							'&3': '&1 dam',
							'&4': '&2 dam',
						},
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]\\{&1}',
							'&3': '&1 hm',
							'&4': '&2 hm',
						},
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]\\{&1}',
							'&3': '&1 km',
							'&4': '&2 km',
						},
					],
					solutions: [
						['[._&3*&4/2_mm^2_]'],
						['[._&3*&4/2_cm^2_]'],
						['[._&3*&4/2_dm^2_]'],
						['[._&3*&4/2_m^2_]'],
						['[._&3*&4/2_dam^2_]'],
						['[._&3*&4/2_hm^2_]'],
						['[._&3*&4/2_km^2_]'],
					],
					correctionFormat: [
						{
							correct: ["L'aire du triangle rectangle est &answer."],
						},
					],
					correctionDetails: [
						[
							{
								text: "L'aire d'un triangle rectangle de longueur $$[°&3°]$$ et de largeur $$[°&4°]$$  est $$[°{&3*&4}/2°] =$$ &solution.",
							},
						],
					],

					defaultDelay: 20,
					grade: SIXIEME,
				},
				{
					description: "Trouver le deuxième côté de l'angle droit.",
					subdescription:
						"A partir de son aire et du premier côté de l'angle droit.",
					enounces: [
						"Quelle est la longueur du 2ème côté de l'angle droit d'un <b>triangle rectangle</b> dont le premier côté de l'angle droit mesure $$&3$$ et d'aire $$[._&3*&4:2_mm^2_]$$ ?",
						"Quelle est la longueur du 2ème côté de l'angle droit d'un <b>triangle rectangle</b> dont le premier côté de l'angle droit mesure $$&3$$ et d'aire $$[._&3*&4:2_cm^2_]$$ ?",
						"Quelle est la longueur du 2ème côté de l'angle droit d'un <b>triangle rectangle</b> dont le premier côté de l'angle droit mesure $$&3$$ et d'aire $$[._&3*&4:2_dm^2_]$$ ?",
						"Quelle est la longueur du 2ème côté de l'angle droit d'un <b>triangle rectangle</b> dont le premier côté de l'angle droit mesure $$&3$$ et d'aire $$[._&3*&4:2_m^2_]$$ ?",
						"Quelle est la longueur du 2ème côté de l'angle droit d'un <b>triangle rectangle</b> dont le premier côté de l'angle droit mesure $$&3$$ et d'aire $$[._&3*&4:2_dam^2_]$$ ?",
						"Quelle est la longueur du 2ème côté de l'angle droit d'un <b>triangle rectangle</b> dont le premier côté de l'angle droit mesure $$&3$$ et d'aire $$[._&3*&4:2_hm^2_]$$ ?",
						"Quelle est la longueur du 2ème côté de l'angle droit d'un <b>triangle rectangle</b> dont le premier côté de l'angle droit mesure $$&3$$ et d'aire $$[._&3*&4:2_km^2_]$$ ?",
					],
					variables: [
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 mm',
							'&4': '&2 mm',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 cm',
							'&4': '&2 cm',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 dm',
							'&4': '&2 dm',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 m',
							'&4': '&2 m',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 dam',
							'&4': '&2 dam',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 hm',
							'&4': '&2 hm',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 km',
							'&4': '&2 km',
						},
					],
					solutions: [['&4']],
					correctionFormat: [
						{
							correct: ['La longueur du 2ème côté est &answer.'],
						},
					],
					correctionDetails: [
						[
							{
								text: "La longueur du 2ème côté de l'angle droit d'un triangle rectangle dont le premier côté de l'angle droit mesure $$[°&3°]$$ et d'aire $$[._&3*&4:2_mm^2_]$$  est &solution car   $$\\frac{[°&3°] \\times &sol}{2} = [._&3*&4:2_mm^2_]$$.",
							},
						],
						[
							{
								text: "La longueur du 2ème côté de l'angle droit d'un triangle rectangle dont le premier côté de l'angle droit mesure $$[°&3°]$$ et d'aire $$[._&3*&4:2_cm^2_]$$  est &solution car   $$\\frac{[°&3°] \\times &sol}{2} = [._&3*&4:2_cm^2_]$$.",
							},
						],
						[
							{
								text: "La longueur du 2ème côté de l'angle droit d'un triangle rectangle dont le premier côté de l'angle droit mesure $$[°&3°]$$ et d'aire $$[._&3*&4:2_dm^2_]$$  est &solution car   $$\\frac{[°&3°] \\times &sol}{2} = [._&3*&4:2_dm^2_]$$.",
							},
						],
						[
							{
								text: "La longueur du 2ème côté de l'angle droit d'un triangle rectangle dont le premier côté de l'angle droit mesure $$[°&3°]$$ et d'aire $$[._&3*&4:2_m^2_]$$  est &solution car   $$\\frac{[°&3°] \\times &sol}{2} = [._&3*&4:2_m^2_]$$.",
							},
						],
						[
							{
								text: "La longueur du 2ème côté de l'angle droit d'un triangle rectangle dont le premier côté de l'angle droit mesure $$[°&3°]$$ et d'aire $$[._&3*&4:2_dam^2_]$$  est &solution car   $$\\frac{[°&3°] \\times &sol}{2} = [._&3*&4:2_dam^2_]$$.",
							},
						],
						[
							{
								text: "La longueur du 2ème côté de l'angle droit d'un triangle rectangle dont le premier côté de l'angle droit mesure $$[°&3°]$$ et d'aire $$[._&3*&4:2_hm^2_]$$  est &solution car   $$\\frac{[°&3°] \\times &sol}{2} = [._&3*&4:2_hm^2_]$$.",
							},
						],
						[
							{
								text: "La longueur du 2ème côté de l'angle droit d'un triangle rectangle dont le premier côté de l'angle droit mesure $$[°&3°]$$ et d'aire $$[._&3*&4:2_km^2_]$$  est &solution car   $$\\frac{[°&3°] \\times &sol}{2} = [._&3*&4:2_km^2_]$$.",
							},
						],
					],

					defaultDelay: 20,
					grade: SIXIEME,
				},
			],
			"Aire d'un triangle quelconque": [
				{
					description: "Calcul de l'aire d'un triangle quelconque.",
					subdescription: "A partir d'une description",
					enounces: [
						"Quelle est l'aire d'un <b>triangle</b> de base $$&3$$ et de hauteur associée $$&4$$ ?",
					],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]\\{&1}',
							'&3': '&1 mm',
							'&4': '&2 mm',
						},
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]\\{&1}',
							'&3': '&1 cm',
							'&4': '&2 cm',
						},
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]\\{&1}',
							'&3': '&1 dm',
							'&4': '&2 dm',
						},
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]\\{&1}',
							'&3': '&1 m',
							'&4': '&2 m',
						},
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]\\{&1}',
							'&3': '&1 dam',
							'&4': '&2 dam',
						},
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]\\{&1}',
							'&3': '&1 hm',
							'&4': '&2 hm',
						},
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]\\{&1}',
							'&3': '&1 km',
							'&4': '&2 km',
						},
					],
					solutions: [
						['[._&3*&4/2_mm^2_] '],
						['[._&3*&4/2_cm^2_] '],
						['[._&3*&4/2_dm^2_] '],
						['[._&3*&4/2_m^2_] '],
						['[._&3*&4/2_dam^2_] '],
						['[._&3*&4/2_hm^2_] '],
						['[._&3*&4/2_km^2_] '],
					],
					correctionFormat: [
						{
							correct: ["L'aire du triangle est &answer."],
						},
					],
					correctionDetails: [
						[
							{
								text: "L'aire d'un triangle de base $$[°&3°]$$ et de hauteur $$[°&4°]$$  est $$[°{&3*&4}/2°] =$$ &solution.",
							},
						],
					],

					defaultDelay: 20,
					grade: SIXIEME,
				},
				{
					description: "Trouver la base d'un triangle quelconque.",
					subdescription: 'A partir de son aire et de la hauteur associée.',
					enounces: [
						"Quelle est la base d'un <b>triangle</b> de hauteur associée $$&3$$ et d'aire $$[._&3*&4:2_mm^2_]$$ ?",
						"Quelle est la base d'un <b>triangle</b> de hauteur associée $$&3$$ et d'aire $$[._&3*&4:2_cm^2_]$$ ?",
						"Quelle est la base d'un <b>triangle</b> de hauteur associée $$&3$$ et d'aire $$[._&3*&4:2_dm^2_]$$ ?",
						"Quelle est la base d'un <b>triangle</b> de hauteur associée $$&3$$ et d'aire $$[._&3*&4:2_m^2_]$$ ?",
						"Quelle est la base d'un <b>triangle</b> de hauteur associée $$&3$$ et d'aire $$[._&3*&4:2_dam^2_]$$ ?",
						"Quelle est la base d'un <b>triangle</b> de hauteur associée $$&3$$ et d'aire $$[._&3*&4:2_hm^2_]$$ ?",
						"Quelle est la base d'un <b>triangle</b> de hauteur associée $$&3$$ et d'aire $$[._&3*&4:2_km^2_]$$ ?",
					],
					variables: [
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 mm',
							'&4': '&2 mm',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 cm',
							'&4': '&2 cm',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 dm',
							'&4': '&2 dm',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 m',
							'&4': '&2 m',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 dam',
							'&4': '&2 dam',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 hm',
							'&4': '&2 hm',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 km',
							'&4': '&2 km',
						},
					],
					solutions: [['&4']],
					correctionFormat: [
						{
							correct: ['La base mesure &answer.'],
						},
					],
					correctionDetails: [
						[
							{
								text: "La base d'un triangle de hauteur asociée $$[°&3°]$$ et d'aire $$[._&3*&4:2_mm^2_]$$  est &solution car   $$\\frac{[°&3°] \\times &sol}{2} = [._&3*&4:2_mm^2_]$$.",
							},
						],
						[
							{
								text: "La base d'un triangle de hauteur asociée $$[°&3°]$$ et d'aire $$[._&3*&4:2_cm^2_]$$  est &solution car   $$\\frac{[°&3°] \\times &sol}{2} = [._&3*&4:2_cm^2_]$$.",
							},
						],
						[
							{
								text: "La base d'un triangle de hauteur asociée $$[°&3°]$$ et d'aire $$[._&3*&4:2_dm^2_]$$  est &solution car   $$\\frac{[°&3°] \\times &sol}{2} = [._&3*&4:2_dm^2_]$$.",
							},
						],
						[
							{
								text: "La base d'un triangle de hauteur asociée $$[°&3°]$$ et d'aire $$[._&3*&4:2_m^2_]$$  est &solution car   $$\\frac{[°&3°] \\times &sol}{2} = [._&3*&4:2_m^2_]$$.",
							},
						],
						[
							{
								text: "La base d'un triangle de hauteur asociée $$[°&3°]$$ et d'aire $$[._&3*&4:2_dam^2_]$$  est &solution car   $$\\frac{[°&3°] \\times &sol}{2} = [._&3*&4:2_dam^2_]$$.",
							},
						],
						[
							{
								text: "La base d'un triangle de hauteur asociée $$[°&3°]$$ et d'aire $$[._&3*&4:2_hm^2_]$$  est &solution car   $$\\frac{[°&3°] \\times &sol}{2} = [._&3*&4:2_hm^2_]$$.",
							},
						],
						[
							{
								text: "La base d'un triangle de hauteur asociée $$[°&3°]$$ et d'aire $$[._&3*&4:2_km^2_]$$  est &solution car   $$\\frac{[°&3°] \\times &sol}{2} = [._&3*&4:2_km^2_]$$.",
							},
						],
					],

					defaultDelay: 20,
					grade: SIXIEME,
				},
				{
					description: "Trouver la hauteur d'un triangle quelconque.",
					subdescription: 'A partir de son aire et de la base associée.',
					enounces: [
						"Quelle est la hauteur d'un <b>triangle</b> de base associée $$&3$$ et d'aire $$[._&3*&4:2_mm^2_]$$ ?",
						"Quelle est la hauteur d'un <b>triangle</b> de base associée $$&3$$ et d'aire $$[._&3*&4:2_cm^2_]$$ ?",
						"Quelle est la hauteur d'un <b>triangle</b> de base associée $$&3$$ et d'aire $$[._&3*&4:2_dm^2_]$$ ?",
						"Quelle est la hauteur d'un <b>triangle</b> de base associée $$&3$$ et d'aire $$[._&3*&4:2_m^2_]$$ ?",
						"Quelle est la hauteur d'un <b>triangle</b> de base associée $$&3$$ et d'aire $$[._&3*&4:2_dam^2_]$$ ?",
						"Quelle est la hauteur d'un <b>triangle</b> de base associée $$&3$$ et d'aire $$[._&3*&4:2_hm^2_]$$ ?",
						"Quelle est la hauteur d'un <b>triangle</b> de base associée $$&3$$ et d'aire $$[._&3*&4:2_km^2_]$$ ?",
					],
					variables: [
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 mm',
							'&4': '&2 mm',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 cm',
							'&4': '&2 cm',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 dm',
							'&4': '&2 dm',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 m',
							'&4': '&2 m',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 dam',
							'&4': '&2 dam',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 hm',
							'&4': '&2 hm',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 km',
							'&4': '&2 km',
						},
					],
					solutions: [['&4']],
					correctionFormat: [
						{
							correct: ['La hauteur mesure &answer.'],
						},
					],
					correctionDetails: [
						[
							{
								text: "La hauteur d'un triangle de base asociée $$[°&3°]$$ et d'aire $$[._&3*&4:2_mm^2_]$$  est &solution car   $$\\frac{[°&3°] \\times &sol}{2} = [._&3*&4:2_mm^2_]$$.",
							},
						],
						[
							{
								text: "La hauteur d'un triangle de base asociée $$[°&3°]$$ et d'aire $$[._&3*&4:2_cm^2_]$$  est &solution car   $$\\frac{[°&3°] \\times &sol}{2} = [._&3*&4:2_cm^2_]$$.",
							},
						],
						[
							{
								text: "La hauteur d'un triangle de base asociée $$[°&3°]$$ et d'aire $$[._&3*&4:2_dm^2_]$$  est &solution car   $$\\frac{[°&3°] \\times &sol}{2} = [._&3*&4:2_dm^2_]$$.",
							},
						],
						[
							{
								text: "La hauteur d'un triangle de base asociée $$[°&3°]$$ et d'aire $$[._&3*&4:2_m^2_]$$  est &solution car   $$\\frac{[°&3°] \\times &sol}{2} = [._&3*&4:2_m^2_]$$.",
							},
						],
						[
							{
								text: "La hauteur d'un triangle de base asociée $$[°&3°]$$ et d'aire $$[._&3*&4:2_dam^2_]$$  est &solution car   $$\\frac{[°&3°] \\times &sol}{2} = [._&3*&4:2_dam^2_]$$.",
							},
						],
						[
							{
								text: "La hauteur d'un triangle de base asociée $$[°&3°]$$ et d'aire $$[._&3*&4:2_hm^2_]$$  est &solution car   $$\\frac{[°&3°] \\times &sol}{2} = [._&3*&4:2_hm^2_]$$.",
							},
						],
						[
							{
								text: "La hauteur d'un triangle de base asociée $$[°&3°]$$ et d'aire $$[._&3*&4:2_km^2_]$$  est &solution car   $$\\frac{[°&3°] \\times &sol}{2} = [._&3*&4:2_km^2_]$$.",
							},
						],
					],

					defaultDelay: 20,
					grade: SIXIEME,
				},
			],
			"Aire d'un parallélogramme": [
				{
					description: "Calcul de l'aire d'un parallélogramme.",
					subdescription: "A partir d'une description",
					enounces: [
						"Quelle est l'aire d'un <b>parallélogramme</b> de base $$&3$$ et de hauteur $$&4$$ ?",
					],
					variables: [
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 mm',
							'&4': '&2 mm',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 cm',
							'&4': '&2 cm',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 dm',
							'&4': '&2 dm',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 m',
							'&4': '&2 m',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 dam',
							'&4': '&2 dam',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 hm',
							'&4': '&2 hm',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 km',
							'&4': '&2 km',
						},
					],
					solutions: [
						['[_&3*&4_mm^2_]'],
						['[_&3*&4_cm^2_]'],
						['[_&3*&4_dm^2_]'],
						['[_&3*&4_m^2_]'],
						['[_&3*&4_dam^2_]'],
						['[_&3*&4_hm^2_]'],
						['[_&3*&4_km^2_]'],
					],
					correctionFormat: [
						{
							correct: ["L'aire du parallélogramme est &answer."],
						},
					],
					correctionDetails: [
						[
							{
								text: "L'aire d'un parallélogramme de base $$[°&3°]$$ et de hauteur $$[°&4°]$$  est $$[°&3*&4°] =$$ &solution.",
							},
						],
					],

					defaultDelay: 15,
					grade: CINQUIEME,
				},
				{
					description: "Trouver la base d'un parallélogramme.",
					subdescription: 'A partir de son aire et de la hauteur associée .',
					enounces: [
						"Quelle est la base d'un <b>parallélogramme</b> de hauteur associée $$&3$$ et d'aire $$[._&3*&4_mm^2_]$$ ?",
						"Quelle est la base d'un <b>parallélogramme</b> de hauteur associée $$&3$$ et d'aire $$[._&3*&4_cm^2_]$$ ?",
						"Quelle est la base d'un <b>parallélogramme</b> de hauteur associée $$&3$$ et d'aire $$[._&3*&4_dm^2_]$$ ?",
						"Quelle est la base d'un <b>parallélogramme</b> de hauteur associée $$&3$$ et d'aire $$[._&3*&4_m^2_]$$ ?",
						"Quelle est la base d'un <b>parallélogramme</b> de hauteur associée $$&3$$ et d'aire $$[._&3*&4_dam^2_]$$ ?",
						"Quelle est la base d'un <b>parallélogramme</b> de hauteur associée $$&3$$ et d'aire $$[._&3*&4_hm^2_]$$ ?",
						"Quelle est la base d'un <b>parallélogramme</b> de hauteur associée $$&3$$ et d'aire $$[._&3*&4_km^2_]$$ ?",
					],
					variables: [
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 mm',
							'&4': '&2 mm',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 cm',
							'&4': '&2 cm',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 dm',
							'&4': '&2 dm',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 m',
							'&4': '&2 m',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 dam',
							'&4': '&2 dam',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 hm',
							'&4': '&2 hm',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 km',
							'&4': '&2 km',
						},
					],
					solutions: [['&4']],
					correctionFormat: [
						{
							correct: ['La base mesure &answer.'],
						},
					],
					correctionDetails: [
						[
							{
								text: "La base d'un parallélogramme de hauteur associée $$[°&3°]$$ et d'aire $$[._&3*&4_mm^2_]$$ est &solution car $$[°&3°] \\times &sol = [._&3*&4_mm^2_]$$.",
							},
						],
						[
							{
								text: "La base d'un parallélogramme de hauteur associée $$[°&3°]$$ et d'aire $$[._&3*&4_cm^2_]$$ est &solution car $$[°&3°] \\times &sol = [._&3*&4_cm^2_]$$.",
							},
						],
						[
							{
								text: "La base d'un parallélogramme de hauteur associée $$[°&3°]$$ et d'aire $$[._&3*&4_dm^2_]$$ est &solution car $$[°&3°] \\times &sol = [._&3*&4_dm^2_]$$.",
							},
						],
						[
							{
								text: "La base d'un parallélogramme de hauteur associée $$[°&3°]$$ et d'aire $$[._&3*&4_m^2_]$$ est &solution car $$[°&3°] \\times &sol = [._&3*&4_m^2_]$$.",
							},
						],
						[
							{
								text: "La base d'un parallélogramme de hauteur associée $$[°&3°]$$ et d'aire $$[._&3*&4_dam^2_]$$ est &solution car $$[°&3°] \\times &sol = [._&3*&4_dam^2_]$$.",
							},
						],
						[
							{
								text: "La base d'un parallélogramme de hauteur associée $$[°&3°]$$ et d'aire $$[._&3*&4_hm^2_]$$ est &solution car $$[°&3°] \\times &sol = [._&3*&4_hm^2_]$$.",
							},
						],
						[
							{
								text: "La base d'un parallélogramme de hauteur associée $$[°&3°]$$ et d'aire $$[._&3*&4_km^2_]$$ est &solution car $$[°&3°] \\times &sol = [._&3*&4_km^2_]$$.",
							},
						],
					],

					defaultDelay: 20,
					grade: SIXIEME,
				},
				{
					description: "Trouver la hauteur d'un parallélogramme.",
					subdescription: 'A partir de son aire et de la base associée.',
					enounces: [
						"Quelle est la hauteur d'un <b>parallélogramme</b> de base associée $$&3$$ et d'aire $$[._&3*&4_mm^2_]$$ ?",
						"Quelle est la hauteur d'un <b>parallélogramme</b> de base associée $$&3$$ et d'aire $$[._&3*&4_cm^2_]$$ ?",
						"Quelle est la hauteur d'un <b>parallélogramme</b> de base associée $$&3$$ et d'aire $$[._&3*&4_dm^2_]$$ ?",
						"Quelle est la hauteur d'un <b>parallélogramme</b> de base associée $$&3$$ et d'aire $$[._&3*&4_m^2_]$$ ?",
						"Quelle est la hauteur d'un <b>parallélogramme</b> de base associée $$&3$$ et d'aire $$[._&3*&4_dam^2_]$$ ?",
						"Quelle est la hauteur d'un <b>parallélogramme</b> de base associée $$&3$$ et d'aire $$[._&3*&4_hm^2_]$$ ?",
						"Quelle est la hauteur d'un <b>parallélogramme</b> de base associée $$&3$$ et d'aire $$[._&3*&4_km^2_]$$ ?",
					],
					variables: [
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 mm',
							'&4': '&2 mm',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 cm',
							'&4': '&2 cm',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 dm',
							'&4': '&2 dm',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 m',
							'&4': '&2 m',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 dam',
							'&4': '&2 dam',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 hm',
							'&4': '&2 hm',
						},
						{
							'&1': '$e[1;11]',
							'&2': '$e[1;11]\\{&1}',
							'&3': '&1 km',
							'&4': '&2 km',
						},
					],
					solutions: [['&4']],
					correctionFormat: [
						{
							correct: ['La hauteur mesure &answer.'],
						},
					],
					correctionDetails: [
						[
							{
								text: "La hauteur d'un parallélogramme de base associée $$[°&3°]$$ et d'aire $$[._&3*&4_mm^2_]$$ est &solution car $$[°&3°] \\times &sol = [._&3*&4_mm^2_]$$.",
							},
						],
						[
							{
								text: "La hauteur d'un parallélogramme de base associée $$[°&3°]$$ et d'aire $$[._&3*&4_cm^2_]$$ est &solution car $$[°&3°] \\times &sol = [._&3*&4_cm^2_]$$.",
							},
						],
						[
							{
								text: "La hauteur d'un parallélogramme de base associée $$[°&3°]$$ et d'aire $$[._&3*&4_dm^2_]$$ est &solution car $$[°&3°] \\times &sol = [._&3*&4_dm^2_]$$.",
							},
						],
						[
							{
								text: "La hauteur d'un parallélogramme de base associée $$[°&3°]$$ et d'aire $$[._&3*&4_m^2_]$$ est &solution car $$[°&3°] \\times &sol = [._&3*&4_m^2_]$$.",
							},
						],
						[
							{
								text: "La hauteur d'un parallélogramme de base associée $$[°&3°]$$ et d'aire $$[._&3*&4_dam^2_]$$ est &solution car $$[°&3°] \\times &sol = [._&3*&4_dam^2_]$$.",
							},
						],
						[
							{
								text: "La hauteur d'un parallélogramme de base associée $$[°&3°]$$ et d'aire $$[._&3*&4_hm^2_]$$ est &solution car $$[°&3°] \\times &sol = [._&3*&4_hm^2_]$$.",
							},
						],
						[
							{
								text: "La hauteur d'un parallélogramme de base associée $$[°&3°]$$ et d'aire $$[._&3*&4_km^2_]$$ est &solution car $$[°&3°] \\times &sol = [._&3*&4_km^2_]$$.",
							},
						],
					],

					defaultDelay: 20,
					grade: SIXIEME,
				},
			],
		},
		Volumes: {
			conversions: [
				{
					description: 'Convertir dans une autre unité',
					subdescription: 'Unités de volume et de contenance',
					enounces: ["Convertis dans l'unité demandée."],
					variables: [
						{
							'&1': '$e[1;9]',
						},
					],
					expressions: [
						'&1 m^3 = ? L',
						'&1 L = ? m^3',
						'&1 dm^3 = ? L',
						'&1 L = ? dm^3',
						'&1 cm^3 = ? mL',
						'&1 mL = ? cm^3',
						'&1 cm^3 = ? L',
						'&1 L = ? cm^3',
					],
					solutions: [
						['[._&1*1000_]'],
						['[._&1:1000_]'],
						['[._&1_]'],
						['[._&1_]'],
						['[._&1_]'],
						['[._&1_]'],
						['[._&1:1000_]'],
						['[._&1*1000_]'],
					],
					type: 'fill in',
					'result-type': 'decimal',
					defaultDelay: 20,
					grade: SIXIEME,
				},
			],
		},
		Durées: {
			Convertir: [
				{
					description: 'Convertir des durées',
					subdescription: 'heures en minutes',
					enounces: ['Convertis.'],
					variables: [
						{
							'&1': '$e[1;10]',
							'&2': '[_&1 h_min_]',
						},
					],
					answerFields: ['$$&1\\,h = ?\\,min$$'],
					solutions: [['[_&2/(1 min)_]']],
					correctionFormat: [
						{
							correct: ['$$&1\\,h =$$&answer $$min$$'],
						},
					],
					correctionDetails: [
						[{ text: '$$&1\\,h = &1 \\times 60\\,min=$$&solution $$min$$' }],
					],
					// units: ['min'],
					// options: ['require-specific-unit'],
					'result-type': 'decimal',
					defaultDelay: 20,
					grade: SIXIEME,
				},
				// {
				// 	description: 'Convertir des durées',
				// 	subdescription: 'heures en minutes',
				// 	enounces: ["Convertis en minutes (n'oublie pas l'unité <i>min</i>)."],
				// 	variables: [
				// 		{
				// 			'&1': '$e[1;10]',
				// 		},
				// 	],
				// 	expressions: ['&1 h'],
				// 	correctionDetails: [
				// 		[{ text: '$$&1\\,h = &1 \\times 60\\,min = &sol$$' }],
				// 	],
				// 	units: ['min'],
				// 	options: ['require-specific-unit'],

				// 	'result-type': 'decimal',
				// 	defaultDelay: 20,
				// 	grade: SIXIEME,
				// },
				{
					description: 'Convertir des durées',
					subdescription: 'minutes en heures',
					enounces: ['Convertis.'],
					variables: [
						{
							'&1': '$e[1;10]',
						},
					],
					answerFields: ['$$[_&1*60_]\\,min= ? h$$'],
					solutions: [['&1']],
					correctionFormat: [
						{
							correct: ['$$[_&1*60_]\\,min =$$&answer $$h$$'],
						},
					],
					correctionDetails: [
						[
							{
								text: '$$[_&1*60_]\\,min = &1 \\times 60\\,min =$$&solution $$h$$',
							},
						],
					],
					// units: ['h'],
					// options: ['require-specific-unit'],

					'result-type': 'decimal',
					defaultDelay: 20,
					grade: SIXIEME,
				},
				// {
				// 	description: 'Convertir des durées',
				// 	subdescription: 'minutes en heures',
				// 	enounces: ["Convertis en heures (n'oublie pas l'unité <i>h</i>)."],
				// 	variables: [
				// 		{
				// 			'&1': '$e[1;10]',
				// 		},
				// 	],
				// 	expressions: ['[_&1*60_] min'],
				// 	correctionDetails: [
				// 		[{ text: '$$[_&1*60_]\\,min = &1 \\times 60\\,min = &sol$$' }],
				// 	],
				// 	units: ['h'],
				// 	options: ['require-specific-unit'],

				// 	'result-type': 'decimal',
				// 	defaultDelay: 20,
				// 	grade: SIXIEME,
				// },
				{
					description: 'Convertir des durées',
					subdescription: 'minutes en secondes',
					enounces: ['Convertis.'],
					variables: [
						{
							'&1': '$e[1;10]',
							'&2': '[_&1 min_s_]',
						},
					],
					answerFields: ['$$&1\\,min = ?\\,s$$'],
					solutions: [['[_&2/(1 s)_]']],
					correctionFormat: [
						{
							correct: ['$$&1\\,min =$$&answer $$s$$'],
						},
					],
					correctionDetails: [
						[{ text: '$$&1\\,min = &1 \\times 60\\,s=$$&solution $$s$$' }],
					],
					'result-type': 'decimal',
					defaultDelay: 20,
					grade: SIXIEME,
				},
				// {
				// 	description: 'Convertir des durées',
				// 	subdescription: 'minutes en secondes',
				// 	enounces: ["Convertis en secondes (n'oublie pas l'unité <i>s</i>)."],
				// 	variables: [
				// 		{
				// 			'&1': '$e[1;10]',
				// 		},
				// 	],
				// 	expressions: ['&1 min'],
				// 	correctionDetails: [
				// 		[{ text: '$$&1\\,min = &1 \\times 60\\,s = &sol$$' }],
				// 	],
				// 	units: ['s'],
				// 	options: ['require-specific-unit'],

				// 	'result-type': 'decimal',
				// 	defaultDelay: 20,
				// 	grade: SIXIEME,
				// },

				{
					description: 'Convertir des durées',
					subdescription: 'secondes en minutes',
					enounces: ['Convertis.'],
					variables: [
						{
							'&1': '$e[1;10]',
						},
					],
					answerFields: ['$$[_&1*60_]\\,s= ? min$$'],
					solutions: [['&1']],
					correctionFormat: [
						{
							correct: ['$$[_&1*60_]\\,s =$$&answer $$min$$'],
						},
					],
					correctionDetails: [
						[
							{
								text: '$$[_&1*60_]\\,s = &1 \\times 60\\,s =$$&solution $$min$$',
							},
						],
					],
					'result-type': 'decimal',
					defaultDelay: 20,
					grade: SIXIEME,
				},
				// {
				// 	description: 'Convertir des durées',
				// 	subdescription: 'secondes en minutes',
				// 	enounces: ["Convertis en minutes (n'oublie pas l'unité <i>min</i>)."],
				// 	variables: [
				// 		{
				// 			'&1': '$e[1;10]',
				// 		},
				// 	],
				// 	expressions: ['[_&1*60_] s'],
				// 	correctionDetails: [
				// 		[{ text: '$$[_&1*60_]\\,s = &1 \\times 60\\,s = &sol$$' }],
				// 	],

				// 	units: ['min'],
				// 	options: ['require-specific-unit'],

				// 	'result-type': 'decimal',
				// 	defaultDelay: 20,
				// 	grade: SIXIEME,
				// },
				{
					description: 'Convertir des durées',
					subdescription: 'HMS en minutes',
					enounces: ['Convertis.'],
					variables: [
						{
							'&1': '$e[1;2]',
							'&2': '$e[1;5]*10',
							'&3': '&1 h [_&2_] min',
							'&4': '[_&3_min_]',
						},
					],
					answerFields: ['$$&1\\,h\\,[_&2_]\\,min = ?\\,min$$'],
					solutions: [['[_&4/(1 min)_]']],

					correctionFormat: [
						{
							correct: ['$$&1\\,h\\,[_&2_]\\,min  =$$&answer $$min$$'],
						},
					],
					correctionDetails: [
						[
							{
								text: '$$&1\\,h\\,[_&2_]\\,min = &1\\times 60\\,min+[_&2_]\\,min =$$&solution $$min$$',
							},
						],
					],
					'result-type': 'decimal',
					defaultDelay: 20,
					grade: SIXIEME,
				},
				// {
				// 	description: 'Convertir des durées',
				// 	subdescription: 'HMS en minutes',
				// 	enounces: ["Convertis en minutes (n'oublie pas l'unité <i>min</i>)."],
				// 	variables: [
				// 		{
				// 			'&1': '$e[1;2]',
				// 			'&2': '$e[1;5]*10',
				// 		},
				// 	],
				// 	expressions: ['&1 h [_&2_] min'],
				// 	correctionDetails: [
				// 		[
				// 			{
				// 				text: '$$&1\\,h\\,[_&2_]\\,min = &1\\times 60\\,min+[_&2_]\\,min = &sol$$',
				// 			},
				// 		],
				// 	],

				// 	units: ['min'],
				// 	options: ['require-specific-unit'],

				// 	'result-type': 'decimal',
				// 	defaultDelay: 20,
				// 	grade: SIXIEME,
				// },
				{
					description: 'Convertir des durées',
					subdescription: 'HMS en minutes (2)',
					enounces: ['Convertis.'],
					variables: [
						{
							'&1': '$e[1;2]',
							'&2': '$e[1;59]',
							'&3': '&1 h [_&2_] min',
							'&4': '[_&3_min_]',
						},
					],
					answerFields: ['$$&1\\,h\\,[_&2_]\\,min = ?\\,min$$'],
					solutions: [['[_&4/(1 min)_]']],

					correctionFormat: [
						{
							correct: ['$$&1\\,h\\,[_&2_]\\,min  =$$&answer $$min$$'],
						},
					],
					correctionDetails: [
						[
							{
								text: '$$&1\\,h\\,[_&2_]\\,min = &1\\times 60\\,min+[_&2_]\\,min =$$&solution $$min$$',
							},
						],
					],
					'result-type': 'decimal',
					defaultDelay: 20,
					grade: SIXIEME,
				},
				// {
				// 	description: 'Convertir des durées',
				// 	subdescription: 'HMS en minutes (2)',
				// 	enounces: ["Convertis en minutes (n'oublie pas l'unité <i>min</i>)."],
				// 	variables: [
				// 		{
				// 			'&1': '$e[1;2]',
				// 			'&2': '$e[1;59]',
				// 		},
				// 	],
				// 	expressions: ['&1 h [_&2_] min'],
				// 	correctionDetails: [
				// 		[
				// 			{
				// 				text: '$$&1\\,h\\,[_&2_]\\,min = &1\\times 60\\,min+[_&2_]\\,min = &sol$$',
				// 			},
				// 		],
				// 	],

				// 	units: ['min'],
				// 	options: ['require-specific-unit'],

				// 	'result-type': 'decimal',
				// 	defaultDelay: 20,
				// 	grade: SIXIEME,
				// },
				{
					description: 'Convertir des durées',
					subdescription: 'minutes en HMS',
					enounces: ['Convertis'],
					variables: [
						{
							'&1': '$e[1;2]',
							'&2': '$e[1;5]*10',
						},
					],
					answerFields: ['$$[_&1*60+&2_]\\,min= ?\\,h\\,?\\,min$$'],
					solutions: [['&1', '[_&2_]']],
					correctionFormat: [
						{
							correct: [
								'$$[_&1*60+&2_]\\,min=$$ &answer1 $$h$$ &answer2 $$min$$',
							],
						},
					],
					correctionDetails: [
						[
							{
								text: '$$[_&1*60+&2_]\\,min = &1\\times 60\\,min+[_&2_]\\,min =$$ &solution1 $$h$$ &solution2 $$min$$',
							},
						],
					],
					'result-type': 'decimal',
					defaultDelay: 20,
					grade: SIXIEME,
				},
				// {
				// 	description: 'Convertir des durées',
				// 	subdescription: 'minutes en HMS',
				// 	enounces: ['Convertis sous la forme ... <i>h</i> ... <i>min</i>'],
				// 	variables: [
				// 		{
				// 			'&1': '$e[1;2]',
				// 			'&2': '$e[1;5]*10',
				// 		},
				// 	],
				// 	expressions: ['[_&1*60+&2_] min'],
				// 	correctionDetails: [
				// 		[
				// 			{
				// 				text: '$$[_&1*60+&2_]\\,min = &1\\times 60\\,min+[_&2_]\\,min = &sol$$',
				// 			},
				// 		],
				// 	],

				// 	units: ['HMS'],
				// 	options: ['require-specific-unit', 'no-penalty-for-extraneous-zeros'],

				// 	'result-type': 'decimal',
				// 	defaultDelay: 20,
				// 	grade: SIXIEME,
				// },
				{
					description: 'Convertir des durées',
					subdescription: 'minutes en HMS (2)',
					enounces: ['Convertis.'],
					variables: [
						{
							'&1': '$e[1;2]',
							'&2': '$e[1;59]',
						},
					],
					answerFields: ['$$[_&1*60+&2_]\\,min= ?\\,h\\,?\\,min$$'],
					solutions: [['&1', '&2']],
					correctionFormat: [
						{
							correct: [
								'$$[_&1*60+&2_]\\,min=$$ &answer1 $$h$$ &answer2 $$min$$',
							],
						},
					],
					correctionDetails: [
						[
							{
								text: '$$[_&1*60+&2_]\\,min = &1\\times 60\\,min+&2\\,min =$$ &solution1 $$h$$ &solution2 $$min$$',
							},
						],
					],
					'result-type': 'decimal',
					defaultDelay: 20,
					grade: SIXIEME,
				},
				// {
				// 	description: 'Convertir des durées',
				// 	subdescription: 'minutes en HMS (2)',
				// 	enounces: ['Convertis sous la forme ... <i>h</i> ... <i>min</i>'],
				// 	variables: [
				// 		{
				// 			'&1': '$e[1;2]',
				// 			'&2': '$e[1;59]',
				// 		},
				// 	],
				// 	expressions: ['[_&1*60+&2_] min'],
				// 	correctionDetails: [
				// 		[
				// 			{
				// 				text: '$$[_&1*60+&2_]\\,min = &1\\times 60\\,min+[_&2_]\\,min = &sol$$',
				// 			},
				// 		],
				// 	],

				// 	units: ['HMS'],
				// 	options: ['require-specific-unit', 'no-penalty-for-extraneous-zeros'],

				// 	'result-type': 'decimal',
				// 	defaultDelay: 20,
				// 	grade: SIXIEME,
				// },
				{
					description: 'Convertir des durées',
					subdescription: 'heures en HMS, heures décimales',
					enounces: ['Convertis.'],
					variables: [
						{
							'&1': '$e[1;5]',
							'&2': '$l{1;5;25}',
						},
					],
					answerFields: ['$$&1{,}&2\\,h= ?\\,h\\,?\\,min$$'],
					solutions: [['&1', '[_0,&2*60_]']],
					correctionFormat: [
						{
							correct: ['$$&1{,}&2\\,h=$$ &answer1 $$h$$ &answer2 $$min$$'],
						},
					],
					correctionDetails: [
						[
							{
								text: '$$&1{,}&2\\,h = &1\\,h + \\, 0,&2 \\, h = &1\\,h \\, + \\, [_0,&2*60_] \\, min =$$ &solution1 $$h$$ &solution2 $$min$$',
							},
						],
					],
					'result-type': 'decimal',
					defaultDelay: 20,
					grade: SIXIEME,
				},
				// {
				// 	description: 'Convertir des durées',
				// 	subdescription: 'heures en HMS, heures décimales',
				// 	enounces: ['Convertis sous la forme ...<i>h</i>...<i>min</i>.'],
				// 	variables: [
				// 		{
				// 			'&1': '$e[1;5]',
				// 			'&2': '$l{1;5;25}',
				// 			'&3': '&1,&2',
				// 		},
				// 	],
				// 	expressions: ['[._&3_] h'],
				// 	correctionDetails: [
				// 		[
				// 			{
				// 				text: '$$[._&3_]\\,h = &1\\,h +  0,&2\\,h = &1\\,h + [_0,&2 h;min_] =&sol$$',
				// 			},
				// 		],
				// 	],

				// 	units: ['HMS'],
				// 	options: ['require-specific-unit', 'no-penalty-for-extraneous-zeros'],

				// 	'result-type': 'decimal',
				// 	defaultDelay: 20,
				// 	grade: SIXIEME,
				// },
				{
					description: 'Convertir des durées',
					subdescription: 'heures en minutes, heures décimales',
					enounces: ['Convertis.'],
					variables: [
						{
							'&1': '$e[1;5]',
							'&2': '$l{1;5;25}',
							'&3': '&1,&2',
						},
					],
					answerFields: ['$$[°&3°]\\,h= ...\\,min$$'],
					solutions: [['[_&3*60_]']],
					correctionFormat: [
						{
							correct: ['$$&3\\,h=$$ &answer $$min$$'],
						},
					],

					correctionDetails: [
						[
							{
								text: '$$[°&3°]\\,h = &1\\,h +  0,&2\\,h = [_&1 h_min_] + [_0,&2 h_min_] =$$ &solution $$min$$',
							},
						],
					],
					'result-type': 'decimal',
					defaultDelay: 20,
					grade: SIXIEME,
				},
				// {
				// 	description: 'Convertir des durées',
				// 	subdescription: 'heures en minutes, heures décimales',
				// 	enounces: ["Convertis en minutes (n'oublie pas l'unité <i>min</i>)."],
				// 	variables: [
				// 		{
				// 			'&1': '$e[1;5]',
				// 			'&2': '$l{1;5;25}',
				// 			'&3': '&1,&2',
				// 		},
				// 	],
				// 	expressions: ['[._&3_] h'],
				// 	correctionDetails: [
				// 		[
				// 			{
				// 				text: '$$[._&3_]\\,h = &1\\,h +  0,&2\\,h = [_&1 h;min_] + [_0,&2 h;min_] =&sol$$',
				// 			},
				// 		],
				// 	],

				// 	units: ['min'],
				// 	options: ['require-specific-unit'],

				// 	'result-type': 'decimal',
				// 	defaultDelay: 20,
				// 	grade: SIXIEME,
				// },

				{
					description: 'Convertir des durées',
					subdescription: 'heures en HMS, heures décimales (2)',
					enounces: ['Convertis.'],
					variables: [
						{
							'&1': '$e[1;2]',
							'&2': '$e[1;9]',
						},
					],
					answerFields: ['$$&1{,}&2\\,h= ?\\,h\\,?\\,min$$'],
					solutions: [['&1', '[_0,&2*60_]']],
					correctionFormat: [
						{
							correct: ['$$&1{,}&2 \\, h=$$ &answer1 $$h$$ &answer2 $$min$$'],
						},
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
								&1{,}&2 \\, h &= &1\\,h + \\, 0{,}&2 \\, h \\\\ \
								&= &1\\,h \\, + \\, &2 \\times 0,1h \\\\ \
								&= &1\\,h \\, + \\, &2 \\times 6 \\, min\\\\ \
								&= &1\\,h \\, + \\, [_0,&2*60_] \\, min \\\\ \
								&= &sol1 \\, h \\, &sol2 \\, min\
								\\end{align}$$`,
							},
						],
					],
					'result-type': 'decimal',
					defaultDelay: 20,
					grade: SIXIEME,
				},
				// {
				// 	description: 'Convertir des durées',
				// 	subdescription: 'heures en HMS (2)',
				// 	enounces: ['Convertis sous la forme ...<i>h</i>...<i>min</i>.'],
				// 	variables: [
				// 		{
				// 			'&1': '$e[1;2]',
				// 			'&2': '$e[1;9]',
				// 			'&3': '&1,&2',
				// 		},
				// 	],
				// 	expressions: ['[._&3_] h'],
				// 	correctionDetails: [
				// 		[
				// 			{
				// 				text: '$$[._&3_]\\,h = &1\\,h +  0,&2\\,h = &1\\,h + &2 \\times [_0,1 h;min_] = &1\\,h + [_0,&2 h;min_] =&sol$$',
				// 			},
				// 		],
				// 	],

				// 	units: ['HMS'],
				// 	options: ['require-specific-unit', 'no-penalty-for-extraneous-zeros'],

				// 	'result-type': 'decimal',
				// 	defaultDelay: 20,
				// 	grade: SIXIEME,
				// },
				{
					description: 'Convertir des durées',
					subdescription: 'heures en minutes, heures décimales (2)',
					enounces: ["Convertis en minutes (n'oublie pas l'unité <i>min</i>)."],
					variables: [
						{
							'&1': '$e[1;2]',
							'&2': '$e[1;9]',
						},
					],
					answerFields: ['$$&1{,}&2\\,h= ?\\,min$$'],
					solutions: [['[_&1,&2*60_]']],
					correctionFormat: [
						{
							correct: ['$$&1,&2 \\, h=$$ &answer $$min$$'],
						},
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
								&1{,}&2 \\, h &= &1\\,h + \\, 0{,}&2 \\, h \\\\ \
								&= &1 \\times 60 \\, min \\, + \\, &2 \\times 0,1h \\\\ \
								&= [_&1*60_] \\, min \\, + \\, &2 \\times 6 \\, min\\\\ \
								&= [_&1*60_] \\, min \\, + \\, [_0,&2*60_] \\, min \\\\ \
								&= &sol \\, min\
								\\end{align}$$`,
							},
						],
					],
					'result-type': 'decimal',
					defaultDelay: 20,
					grade: SIXIEME,
				},
				// {
				// 	description: 'Convertir des durées',
				// 	subdescription: 'heures en minutes, heures décimales (2)',
				// 	enounces: ["Convertis en minutes (n'oublie pas l'unité <i>min</i>)."],
				// 	variables: [
				// 		{
				// 			'&1': '$e[1;2]',
				// 			'&2': '$e[1;9]',
				// 			'&3': '&1,&2',
				// 		},
				// 	],
				// 	expressions: ['[._&3_] h'],
				// 	correctionDetails: [
				// 		[
				// 			{
				// 				text: '$$[._&3_]\\,h = &1\\,h +  0,&2\\,h = [_&1 h;min_] + [_0,&2 h;min_] = [_&1 h;min_] + &2 \\times [_0,1 h;min_]&sol$$',
				// 			},
				// 		],
				// 	],
				// 	units: ['min'],
				// 	options: ['require-specific-unit'],

				// 	'result-type': 'decimal',
				// 	defaultDelay: 20,
				// 	grade: SIXIEME,
				// },
			],
			Calculer: [
				{
					description: 'Ajouter des durées',
					subdescription: 'en HMS',
					enounces: ['Calcule.'],
					variables: [
						{
							'&1': '$e[1;4]',
							'&2': '$e[1;59]',
							'&3': '$e[1;59]',
						},
					],
					answerFields: [
						'$$[°&1°] \\, h \\, [°&2°] \\, min \\, + \\, [°&3°] \\, min = ? \\, h \\, ? \\, min$$',
					],
					solutions: [
						[
							'&2+&3>59 ?? [_&1+1_] :: &1 ',
							'&2+&3>59 ?? [_&2+&3-60_] :: [_&2+&3_] ',
						],
					],
					correctionFormat: [
						{
							correct: [
								'$$&1 \\, h \\, &2 \\, min \\, + \\, &3 \\, min=$$ &solution1 h &solution2 min',
							],
						},
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
								&1\\,h\\, &2\\,min + &3\\,min \
          			@@ &2+&3>=60 ?? &= &1 \\, h \\, + \\, &2 \\, min \\, + \\, &3 \\,min \\\\@@  \
          			@@ &2+&3>=60 ?? &= &1 \\, h \\, + \\, 60 \\, min \\, + \\, [_&3+&2-60_] \\,min \\\\ @@  \
          			@@ &2+&3>=60 ?? &= &1\\,h + \\, 1 \\, h \\, + \\, [_&2+&3-60_]\\,min \\\\ @@  \
					  &= &sol1 \\, h \\, &sol2 \\, min \
					\\end{align}$$`,
							},
						],
					],
					'result-type': 'decimal',
					defaultDelay: 20,
					grade: SIXIEME,
				},
				{
					description: 'Ajouter des durées',
					subdescription: "unité choisie par l'utilisateur",
					enounces: ['Calcule et écris la réponse sous la forme que tu veux.'],
					variables: [
						{
							'&1': '$e[1;4]',
							'&2': '$e[1;59]',
							'&3': '$e[1;59]',
						},
					],
					expressions: ['&1 h &2 min + &3 min'],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
								&1\\,h\\, &2\\,min + &3\\,min \
          			@@ &2+&3>=60 ?? &= &1 \\, h \\, + \\, &2 \\, min \\, + \\, &3 \\,min \\\\@@  \
          			@@ &2+&3>=60 ?? &= &1 \\, h \\, + \\, 60 \\, min \\, + \\, [_&3+&2-60_] \\,min \\\\ @@  \
          			@@ &2+&3>=60 ?? &= &1\\,h + \\, 1 \\, h \\, + \\, [_&2+&3-60_]\\,min \\\\ @@  \
					  &= &sol \
					\\end{align}$$`,
							},
						],
					],
					units: ['HMS'],
					options: [
						'no-penalty-for-extraneous-zeros',
						'no-penalty-for-not-respected-unit',
					],
					'result-type': 'decimal',
					defaultDelay: 20,
					grade: SIXIEME,
				},

				{
					description: 'Ajouter des durées (2)',
					subdescription: 'en HMS (2)',
					enounces: ['Calcule.'],
					variables: [
						{
							'&1': '$e[1;4]',
							'&2': '$e[1;4]',
							'&3': '$e[1;5]',
							'&4': '($e[1;5]\\{6-&3})',
						},
					],
					answerFields: [
						'$$&1 \\, h \\, [_&3*10_] \\, min \\, + \\, &2 \\, h \\, [_&4*10_] \\, min=? \\, h \\, ? \\, min$$',
					],
					solutions: [
						[
							'(&4+&3)*10>59 ?? [_&1+&2+1_] :: [_&1+&2_] ',
							'(&4+&3)*10>59 ?? [_(&4+&3)*10-60_] :: [_(&4+&3)*10_] ',
						],
					],
					correctionFormat: [
						{
							correct: [
								'$$&1 \\, h \\, [_&3*10_] \\, min \\, + \\, &2 \\, h \\, [_&4*10_] \\, min=$$ &solution1 $$h$$ &solution2 $$min$$',
							],
						},
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
								&1 \\, h \\, [_&3*10_] \\, min \\, + \\, &2 \\, h \\, [_&4*10_] \\, min \
          			@@ (&4+&3)*10>=60 ?? &= &1 \\, h \\, + \\, &2 \\, h \\, + \\, [_&3*10_] \\, min \\, + \\, [_&4*10_] \\,min \\\\@@  \
          			@@ (&4+&3)*10>=60 ?? &= [_&1+&2_] \\, h \\, + \\, 60 \\, min \\, + \\, [_(&3+&4)*10-60_] \\,min \\\\ @@  \
          			@@ (&4+&3)*10>=60 ?? &= [_&1+&2_] \\,h + \\, 1 \\, h \\, + \\, [_(&4+&3)*10-60_]\\,min \\\\ @@  \
					  &= &sol1 \\, h \\, &sol2 \\, min \
					\\end{align}$$`,
							},
						],
					],
					options: ['no-penalty-for-extraneous-zeros'],
					'result-type': 'decimal',
					defaultDelay: 20,
					grade: SIXIEME,
				},
				{
					description: 'Ajouter des durées (2)',
					subdescription: "L'utilisateur choisit l'unité.",
					enounces: ['Calcule.'],
					variables: [
						{
							'&1': '$e[1;4]',
							'&2': '$e[1;4]',
							'&3': '$e[1;5]',
							'&4': '($e[1;5]\\{6-&3})',
						},
					],
					expressions: ['&1 h [_&3*10_] min + &2 h [_&4*10_] min'],
					correctionFormat: [
						{
							correct: [
								'$$&1 \\, h \\, [_&3*10_] \\, min \\, + \\, &2 \\, h \\, [_&4*10_] \\, min=$$ &solution',
							],
						},
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
								&1 \\, h \\, [_&3*10_] \\, min \\, + \\, &2 \\, h \\, [_&4*10_] \\, min \
          			@@ (&4+&3)*10>=60 ?? &= &1 \\, h \\, + \\, &2 \\, h \\, + \\, [_&3*10_] \\, min \\, + \\, [_&4*10_] \\,min \\\\@@  \
          			@@ (&4+&3)*10>=60 ?? &= [_&1+&2_] \\, h \\, + \\, 60 \\, min \\, + \\, [_(&3+&4)*10-60_] \\,min \\\\ @@  \
          			@@ (&4+&3)*10>=60 ?? &= [_&1+&2_] \\,h + \\, 1 \\, h \\, + \\, [_(&4+&3)*10-60_]\\,min \\\\ @@  \
					  &= &sol \
					\\end{align}$$`,
							},
						],
					],
					units: ['HMS'],
					options: [
						'no-penalty-for-extraneous-zeros',
						'no-penalty-for-not-respected-unit',
					],
					'result-type': 'decimal',
					defaultDelay: 20,
					grade: SIXIEME,
				},

				{
					description: 'Ajouter des durées (3)',
					subdescription: 'en HMS',
					enounces: ['Calcule.'],
					variables: [
						{
							'&1': '$e[1;4]',
							'&2': '$e[1;4]',
							'&3': '$e[1;59]',
							'&4': '$e[1;59]\\{60-&3}',
						},
					],
					answerFields: [
						'$$&1 \\, h \\, &3 \\, min \\, + \\, &2 \\, h \\, &4 \\, min=? \\, h \\, ? \\, min$$',
					],
					solutions: [
						[
							'&4+&3>59 ?? [_&1+&2+1_] :: [_&1+&2_] ',
							'&4+&3>59 ?? [_&4+&3-60_] :: [_&4+&3_] ',
						],
					],
					correctionFormat: [
						{
							correct: [
								'$$&1 \\, h \\, &3 \\, min \\, + \\, &2 \\, h \\, &4 \\, min=$$ &solution1 $$h$$ &solution2 $$min$$',
							],
						},
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
								&1 \\, h \\, &3 \\, min \\, + \\, &2 \\, h \\, &4 \\, min \
          			@@ &4+&3>=60 ?? &= &1 \\, h \\, + \\, &2 \\, h \\, + \\, &3 \\, min \\, + \\, &4 \\,min \\\\@@  \
          			@@ &4+&3>=60 ?? &= [_&1+&2_] \\, h \\, + \\, 60 \\, min \\, + \\, [_&3+&4-60_] \\,min \\\\ @@  \
          			@@ &4+&3>=60 ?? &= [_&1+&2_] \\,h + \\, 1 \\, h \\, + \\, [_&4+&3-60_]\\,min \\\\ @@  \
					  &= &sol1 \\, h \\, &sol2 \\, min \
					\\end{align}$$`,
							},
						],
					],
					'result-type': 'decimal',
					defaultDelay: 20,
					grade: SIXIEME,
				},
				{
					description: 'Ajouter des durées (3)',
					subdescription: "L'utilisateur choisit l'unité",
					enounces: ['Calcule.'],
					variables: [
						{
							'&1': '$e[1;4]',
							'&2': '$e[1;4]',
							'&3': '$e[1;59]',
							'&4': '$e[1;59]\\{60-&3}',
						},
					],
					expressions: ['&1 h &3 min + &2 h &4 min'],
					correctionFormat: [
						{
							correct: [
								'$$&1 \\, h \\, &3 \\, min \\, + \\, &2 \\, h \\, &4 \\, min=$$ &solution',
							],
						},
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
								&1 \\, h \\, &3 \\, min \\, + \\, &2 \\, h \\, &4 \\, min \
          			@@ &4+&3>=60 ?? &= &1 \\, h \\, + \\, &2 \\, h \\, + \\, &3 \\, min \\, + \\, &4 \\,min \\\\@@  \
          			@@ &4+&3>=60 ?? &= [_&1+&2_] \\, h \\, + \\, 60 \\, min \\, + \\, [_&3+&4-60_] \\,min \\\\ @@  \
          			@@ &4+&3>=60 ?? &= [_&1+&2_] \\,h + \\, 1 \\, h \\, + \\, [_&4+&3-60_]\\,min \\\\ @@  \
					  &= &sol \
					\\end{align}$$`,
							},
						],
					],
					units: ['HMS'],
					'result-type': 'decimal',
					options: [
						'no-penalty-for-extraneous-zeros',
						'no-penalty-for-not-respected-unit',
					],
					defaultDelay: 20,
					grade: SIXIEME,
				},

				{
					description: 'Soustraire des durées',
					subdescription: 'en HMS',
					enounces: [
						"J'ai commencé à regarder un épisode d'une série à $$[_&1 h &2 min_HMS_]$$, et je l'ai terminé à $$[_&1 h &2 min + &3 min_HMS_]$$. Quelle était la durée de cet épisode ? (n'oublie pas l'unité)",
					],
					variables: [
						{
							'&1': '$e[1;4]',
							'&2': '$e[1;59]',
							'&3': '$e[1;59]',
						},
					],
					solutions: [['&3 min']],
					units: ['min'],

					'result-type': 'decimal',
					correctionFormat: [
						{
							correct: ["La durée de l'épisode est de &answer."],
							answer: 'La durée est de &answer.',
						},
					],
					correctionDetails: [
						[
							{
								text: '@@&2+&3<60 ?? $$[_&1 h &2 min_HMS_] + &sol = [_&1 h &2 min + &3 min_HMS_]$$ @@\
              @@&2+&3>59 ?? $$\\begin{align}[_&1 h &2 min + &3 min_HMS_] &= [_&1 h &2 min_HMS_] + [_60-&2_]\\,min + [_&3+&2-60_]\\,min\\\\ \
                 &= [_&1 h &2 min_HMS_] + &sol\\end{align}$$ @@',
							},
						],
					],
					options: [
						'no-penalty-for-extraneous-zeros',
						'no-penalty-for-not-respected-unit',
					],
					defaultDelay: 20,
					grade: SIXIEME,
				},
				{
					description: 'Soustraire des durées (2)',
					subdescription: 'en HMS',
					enounces: [
						"J'ai commencé à regarder un film  à $$[_&1 h &3 min_HMS_]$$, et je l'ai terminé à $$[_&1 h &3 min + &2 h &4 min_HMS_]$$. Quelle était la durée de ce film ? (n'oublie pas l'unité)",
					],
					variables: [
						{
							'&1': '$e[1;4]',
							'&2': '$e[1;2]',
							'&3': '$e[1;59]',
							'&4': '$e[1;59]\\{60-&3}',
						},
					],
					solutions: [['&2 h &4 min']],
					correctionFormat: [
						{
							correct: ["La durée de l'épisode est de &answer."],
							answer: 'La durée est de &answer.',
						},
					],
					correctionDetails: [
						[
							{
								text: '@@&3+&4<60 ?? $$[_&1 h &3 min_HMS_] + &sol = [_&1 h &3 min + &2 h &4 min_HMS_]$$ @@\
              @@&3+&4>59 ?? $$\\begin{align}[_&1 h &3 min + &2 h &4 min_HMS_] &= [_&1 h &3 min_HMS_] + [_60-&3_]\\,min + [_&2_]\\,h + [_&3+&4-60_]\\,min \\\\ \
                 &= [_&1 h &3 min_HMS_] + &sol\\end{align}$$ @@',
							},
						],
					],
					units: ['HMS'],

					'result-type': 'decimal',
					options: [
						'no-penalty-for-extraneous-zeros',
						'no-penalty-for-not-respected-unit',
					],
					defaultDelay: 20,
					grade: SIXIEME,
				},
			],
		},
		Vitesses: {
			Convertir: [
				{
					description: 'Convertir des vitesses',
					enounces: ['Conplète.'],
					variables: [
						{
							'&1': '$e[1;9]',
						},
						{
							'&1': '$l{3600;7200}',
						},
						{
							'&1': '$e[1;9]*1000',
						},
						{
							'&1': '$e[1;2]',
						},
						{
							'&1': '$e[1;9]*1000',
						},
						{
							'&1': '$e[1;9]',
						},
					],
					expressions: [
						'&1 km.h^{-1}= ? m.h^{-1}',
						'&1 km.h^{-1}= ? km.s^{-1}',
						'[_&1_] m.s^{-1}= ? km.s^{-1}',
						'&1 m.s^{-1}= ? m.h^{-1}',
						'[_&1_] m.s^{-1}= ? m.ms^{-1}',
						'&1 m.ms^{-1}= ? m.s^{-1}',
					],
					solutions: [
						['[._&1*1000_]'],
						['[._&1:3600_]'],
						['[._&1:1000_]'],
						['[._&1*3600_]'],
						['[._&1:1000_]'],
						['[._&1*1000_]'],
					],
					correctionDetails: [
						[
							{
								text: '$$[_&1_] \\, km.h^{-1} = \\frac{[_&1_]\\,km}{1\\,h} = \\frac{[_&1*1000_]\\,m}{1\\,h} =$$ &solution $$m.h^{-1}$$',
							},
						],
						[
							{
								text: '$$[_&1_] \\, km.h^{-1} = \\frac{[_&1_]\\,km}{1\\,h} = \\frac{[_&1_]\\,km}{3\\,600\\,s} =$$ &solution $$km.s^{-1}$$',
							},
						],
						[
							{
								text: '$$[_&1_] \\, m.s^{-1} = \\frac{[_&1_]\\,m}{1\\,s} = \\frac{[_&1:1000_]\\,km}{1\\,s} =$$ &solution $$km.s^{-1}$$',
							},
						],
						[
							{
								text: '$$[_&1_] \\, m.s^{-1} = \\frac{[_&1_]\\,m}{1\\,s} = \\frac{[_&1_]\\,m}{\\frac{1}{3\\,600}\\,h} = \\frac{[_&1_] \\times 3\\,600\\,m}{1\\,h}=$$ &solution $$m.h^{-1}$$',
							},
						],
						[
							{
								text: '$$[_&1_] \\, m.s^{-1} = \\frac{[_&1_]\\,m}{1\\,s} = \\frac{[_&1_]\\,m}{1\\,000\\,ms} =$$ &solution $$m.ms^{-1}$$',
							},
						],
						[
							{
								text: '$$[_&1_] \\, m.ms^{-1} = \\frac{[_&1_]\\,m}{1\\,ms} = \\frac{[_&1_]\\,m}{0,001\\,s} =$$ &solution $$m.s^{-1}$$',
							},
						],
					],
					// units: ['min'],
					// options: ['require-specific-unit'],
					type: 'fill in',
					'result-type': 'decimal',
					defaultDelay: 20,
					grade: QUATRIEME,
				},
			],
			Calculer: [
				{
					description: 'Calculer une vitesse moyenne.',
					enounces: [
						"Quelle est la vitesse moyenne d'une voiture parcourant $$[_{&2}*{&3}_km_]$$ en $$&3$$ ? (n'oublie pas l'unité)",
					],
					variables: [
						{
							'&1': '$e[2;9]*10 ',
							'&2': '[_&1_] km.h^{-1}',
							'&3': '$e[2;9] h',
						},
					],
					solutions: [['[_&2_km.h^{-1}_]']],
					correctionFormat: [
						{
							correct: ['La vitesse est de &answer.'],
						},
					],
					correctionDetails: [
						[
							{
								text: "La vitesse d'une voiture parcourant $$[_{&2}*{&3}_km_]$$ en $$[°&3°]$$ est de $$\\frac{[_{&2}*{&3}_km_]}{[_&3_h_]}$$=&solution.",
							},
						],
					],
					'result-type': 'decimal',
					defaultDelay: 20,
					grade: QUATRIEME,
				},
			],
		},
	},
	'Racines carré': {
		Apprivoiser: {
			Définition: [
				{
					description: 'Trouver un nombre positif de carré donné',
					subdescription: 'Entier de $$1$$ à $$12$$',
					enounces: ['Complète avec un nombre <b>positif</b>.'],
					expressions: ['?^2=[_&1^2_]'],
					variables: [{ '&1': '$e[1;12]' }],
					solutions: [['&1']],
					type: 'fill in',
					defaultDelay: 10,
					grade: CINQUIEME,
				},
				{
					description: 'Trouver une racine carré',
					subdescription: 'Entier de $$1$$ à $$12$$',
					enounces: ['Calcule.'],
					expressions: ['sqrt([_&1*&1_])'],
					variables: [{ '&1': '$e[1;15]' }],
					solutions: [['&1']],

					correctionDetails: [
						[{ text: '$$&exp=$$&solution car $$&1 \\times &1 = [_&1^2_]$$.' }],
					],
					defaultDelay: 20,
					grade: QUATRIEME,
				},
				{
					description: "Existence d'une racine carré",
					enounces: ['Est-ce que ce nombre existe ?'],
					expressions: [
						'sqrt([_&1^2_])',
						'sqrt([._&1^2_])',
						'sqrt(&1)',
						'sqrt(-[_&1^2_])',
						'sqrt(-[._&1^2_])',
						'sqrt(-&1)',
						'sqrt(&1)',
						'sqrt(-&1)',
					],
					variables: [
						{ '&1': '$e[2;15]' },
						{ '&1': '$d{1;1}' },
						{ '&1': '$l{2;3;5;7;10;11;13}' },
						{ '&1': '$e[2;15]' },
						{ '&1': '$d{1;1}' },
						{ '&1': '$l{2;3;5;7;10;11;13}' },
						{ '&1': 'pi' },
						{ '&1': 'pi' },
					],
					choices: [[{ text: 'Oui' }, { text: 'Non' }]],

					correctionDetails: [
						[
							{
								text: '&solution, &expression existe car $$[_&1^2_]$$ est positif.',
							},
							{ text: '$$&exp=&1$$ car $$&1 \\times &1 = [_&1^2_]$$.' },
						],
						[
							{
								text: '&solution, &expression existe car $$[._&1^2_]$$ est positif.',
							},
							{
								text: '$$&exp=[._&1_]$$ car $$[._&1_] \\times [._&1_] = [._&1^2_]$$.',
							},
						],
						[
							{ text: '&solution, &expression existe car $$&1$$ est positif.' },
							{
								text: "On ne peut pas mettre &expression sous la forme d'un nombre décimal.",
							},
							{
								text: 'On peut seulement écrire que $$&exp \\times &exp=[_&1_]$$, et trouver une <b>valeur approchée</b> à la calculatrice : $$&exp \\simeq [._sqrt(&1)_]$$.',
							},
						],
						[
							{
								text: "&solution, &expression n'existe pas car $$-[_&1^2_]$$ est négatif.",
							},
						],
						[
							{
								text: "&solution, &expression n'existe pas car $$-[._&1^2_]$$ est négatif.",
							},
						],
						[
							{
								text: "&solution, &expression n'existe pas car $$-&1$$ est négatif.",
							},
						],
						[
							{
								text: '&solution, &expression existe car $$\\pi$$ est positif.',
							},
							{
								text: "On ne peut pas mettre &expression sous la forme d'un nombre décimal.",
							},
							{
								text: 'On peut seulement écrire que $$&exp \\times &exp=\\pi$$, et trouver une <b>valeur approchée</b> à la calculatrice : $$&exp \\simeq [._sqrt(&1)_]$$.',
							},
						],
						[
							{
								text: "&solution, &expression n'existe pas car $$-\\pi$$ est négatif.",
							},
						],
					],
					solutions: [[0], [0], [0], [1], [1], [1], [0], [1]],
					options: ['no-shuffle-choices'],
					defaultDelay: 10,
					grade: QUATRIEME,
				},

				{
					description: "Carré d'une racine",
					enounces: ['Calcule.'],
					expressions: ['(sqrt(&1))^2', 'sqrt(&1)*sqrt(&1)'],
					correctionDetails: [
						[
							{ text: '$$&exp=&solution$$, car par définition,' },
							{
								text: '$$\\sqrt{&1}$$ est le nombre positif dont le carré est $$[_(sqrt(&1))^2_]$$.',
							},
						],
					],
					variables: [{ '&1': '$e{2}' }],

					defaultDelay: 20,
					grade: QUATRIEME,
				},
			],
		},
		Manipuler: {
			Propriétés: [
				{
					description: 'Vrai ou Faux : racines et opérations',
					enounces: ['Vrai ou Faux ?'],
					expressions: [
						'sqrt(&1)+sqrt(&2)=sqrt([_&1+&2_])',
						'sqrt(&1)*sqrt(&2)=sqrt([_&1*&2_])',
					],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
						},
					],
					choices: [[{ text: 'Vrai' }, { text: 'Faux' }]],
					correctionFormat: [
						{
							correct: [
								'&answer, $$\\sqrt{&1}+\\sqrt{&2} \\textcolor{${correct_color}}{\\ne} \\sqrt{[_&1+&2_]}$$',
							],
							answer:
								'$$\\sqrt{&1}+\\sqrt{&2} \\textcolor{red}{=} \\sqrt{[_&1+&2_]}$$',
						},
						{
							correct: [
								'&answer, $$\\sqrt{&1} \\times \\sqrt{&2} \\textcolor{${correct_color}}{=} \\sqrt{[_&1*&2_]}$$',
							],
							answer:
								'$$\\sqrt{&1} \\times \\sqrt{&2} \\textcolor{red}{\\ne} \\sqrt{[_&1*&2_]}$$',
						},
					],
					correctionDetails: [
						[
							{
								text: '&solution, $$\\sqrt{&1} + \\sqrt{&2} \\gt \\sqrt{&1 + &2}$$ ',
							},
							{
								text: "En effet, on peut comparer les carrés des 2 membres de l'inégalité :",
							},
							{
								text: `$$\\begin{align} \\left(\\sqrt{&1} + \\sqrt{&2}\\right)^2 &= \\left(\\sqrt{&1}\\right)^2 +\\left(\\sqrt{&2}\\right)^2 + 2\\sqrt{&1}\\sqrt{&2} \\\\ &= &1 +&2\\textcolor{${color2}}{+2\\sqrt{[_&1*&2_]}} \\\\ \\left(\\sqrt{&1+&2}\\right)^2 &= &1+&2\\end{align}$$`,
							},
						],
						[
							{ text: '&solution' },
							{
								text: '$$\\begin{align} \\sqrt{&1} \\times \\sqrt{&2} &=  \\sqrt{&1 \\times &2} \\\\ &= \\sqrt{[_&1*&2_]} \\\\ \\end{align}$$',
							},
						],
					],
					// corrections: [
					//   'Entre $$[._&5_]$$ et $$[._&6_]$$ le plus petit est ',
					// ],
					solutions: [[1], [0]],
					options: ['no-shuffle-choices'],
					defaultDelay: 20,
					grade: SECONDE,
				},
			],
			Réduire: [
				{
					description: 'Réduire une racine carré',
					enounces: ['Réduis sous la forme $$a\\sqrt{b}$$'],
					expressions: ['sqrt([_&1*&1*&2_])'],
					variables: [
						{
							'&1': '$l{2;3;5;10}',
							'&2': '$l{2;3;5}',
						},
					],
					// solutions: [['&1sqrt(&2)']],

					correctionDetails: [
						[
							{
								text: '$$\\begin{align} \\sqrt{[_&1*&1*&2_]} &= \\sqrt{[_&1*&1_] \\times &2} \\\\ &= \\sqrt{[_&1*&1_]} \\times \\sqrt{&2} \\\\  &= &1 \\times \\sqrt{&2} \\\\  &= &sol  \\\\ \\end{align}$$',
							},
						],
					],
					options: ['penalty-for-factors-permutation'],
					defaultDelay: 20,
					grade: SECONDE,
				},
				{
					description: 'Réduire une expression avec des racines carré',
					enounces: [
						'Réduis sous la forme $$a\\sqrt{b}$$, avec $$b$$ le plus petit possible.',
					],
					expressions: ['sqrt([_&1*&1*&3_])+sqrt([_&2*&2*&3_])'],
					variables: [
						{
							'&1': '$l{2;3;5;10}',
							'&2': '$l{2;3;5;10}\\{&1}',
							'&3': '$l{2;3;5}',
						},
					],
					solutions: [['[_&1+&2_]sqrt(&3)']],

					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
              \\sqrt{[_&1*&1*&3_]} + \\sqrt{[_&2*&2*&3_]} &= \\sqrt{[_&1*&1_]} \\times \\sqrt{&3} + \\sqrt{[_&2*&2_]} \\times \\sqrt{&3} \\\\ \
              &= &1 \\times \\textcolor{${color1}}{\\sqrt{&3}} + &2 \\times \\textcolor{${color1}}{\\sqrt{&3}} \\\\ \
              &= &1 \\textcolor{${color1}}{\\sqrt{&3}} + &2 \\textcolor{${color1}}{\\sqrt{&3}} \\\\ \
              &= &sol  \\\\ \
              \\end{align}$$`,
							},
						],
					],
					options: ['penalty-for-factors-permutation'],
					defaultDelay: 40,
					grade: SECONDE,
				},
			],
			Egalité: [
				{
					description:
						"Vérifier l'égalité de deux expressions comportant des racines carrées",
					enounces: ['Ces 2 expressions sont-elles égales ?'],
					expressions: ['sqrt([_&1*&1*&2_])', 'sqrt([_&1*&1*&2_])'],
					expressions2: ['&1sqrt(&2)', '&1sqrt([_&2+(&3)_])'],

					variables: [
						{
							'&1': '$e[2;5]',
							'&2': '$e[2;4]',
							'&3': '$er[1;1]',
						},
					],
					choices: [[{ text: 'Oui' }, { text: 'Non' }]],
					conditions: ['true', '&2+(&3) !=1'],
					solutions: [[0], [1]],
					options: ['no-shuffle-choices'],

					correctionDetails: [
						[
							{
								text: '$$\\begin{align} \\sqrt{[_&1*&1*&2_]} &= \\sqrt{[_&1*&1_] \\times &2} \\\\ &= \\sqrt{[_&1*&1_]} \\times \\sqrt{&2} \\\\  &= &1 \\times \\sqrt{&2} \\\\  &= &sol  \\\\ \\end{align}$$',
							},
						],
					],

					defaultDelay: 20,
					grade: SECONDE,
				},
			],
			Calculer: [
				{
					description: 'Carré et racine carré',
					enounces: ['Calcule.'],
					expressions: [
						'(sqrt(&1))^2',
						'sqrt(&1^2)',
						'sqrt((-&1)^2)',
						'sqrt(&1)*sqrt(&1)',
					],
					variables: [{ '&1': '$e[2;50]' }],

					defaultDelay: 20,
					grade: QUATRIEME,
				},
				{
					description: 'Calculer avec des racines',
					enounces: ['Calcule.'],
					expressions: ['(&2sqrt(&1))^2', 'sqrt(&1)*&2*sqrt(&1)'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$l{2;3}',
						},
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
						},
					],

					correctionDetails: [
						[
							{
								text: '$$\\begin{align} \
              \\left(&2\\sqrt{&1}\\right)^2 &= &2^2 \\times \\left(\\sqrt{&1}\\right)^2 \\\\ \
               &= [_&2^2_] \\times &1 \\\\ \
              &= &sol  \\\\ \
              \\end{align}$$',
							},
						],
						[
							{
								text: '$$\\begin{align} \
              \\left(&2\\sqrt{&1}\\right)^2 &= &2^2 \\times \\left(\\sqrt{&1}\\right)^2 \\\\ \
               &= [_&2^2_] \\times &1 \\\\ \
              &= &sol  \\\\ \
              \\end{align}$$',
							},
						],
					],
					defaultDelay: 20,
					grade: QUATRIEME,
				},
			],
		},
	},
	Proportionnalité: {
		'Tableaux de proportionnalité': {
			Reconnaître: [
				{
					description:
						'Reconnaître si un tableau est un tableau de proportionnalité',
					subdescription: 'En regardant les colonnes',
					enounces: ['Ce tableau est-il un tableau de proportionnalité ?'],
					enounces2: [
						'$$\\begin{array}{c|c} \
          					&1  &   [_&1*&3_] \\\\ \
          					&2  &   [_&2*&3_] \
        				\\end{array}$$',
						'$$\\begin{array}{c|c} \
        					&1  &   [_&1*&3_] \\\\ \
       						&2  &   [_&2*(&3+1)_] \
      					\\end{array}$$',
					],
					choices: [[{ text: 'Oui' }, { text: 'Non' }]],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]\\{m(&1);d(&1)}',
							'&3': '$e[2;9]',
						},
					],
					solutions: [[0], [1]],
					
					correctionDetails: [
						[
							{
								text: `&solution, $$\\begin{array}{c|c} \
              &1  &   [_&1*&3_] \\\\ \
              &2  &   [_&2*&3_] \
            \\end{array}$$ est un tableau de proportionnalité, car $$ &1 \\textcolor{${color1}}{\\times &3}=[_&1*&3_]$$ et $$ &2 \\textcolor{${color1}}{\\times &3}=[_&2*&3_] $$`,
							},
							{
								text: 'On a multiplité par le même nombre entre les 2 colonnes.',
							},
						],
						[
							{
								text: `&solution, $$\\begin{array}{c|c} \
              &1  &   [_&1*&3_] \\\\ \
              &2  &   [_&2*(&3+1)_] \
            \\end{array}$$ n'est pas un tableau de proportionnalité, car $$ &1 \\textcolor{${color1}}{\\times &3}=[_&1*&3_]$$ et $$ &2 \\textcolor{${color2}}{\\times [_&3+1_]}=[_&2*(&3+1)_]$$.`,
							},
							{
								text: "On n'a <b>pas</b> multiplié par le même nombre entre les 2 colonnes.",
							},
						],
					],
					options: ['no-shuffle-choices'],
					defaultDelay: 20,
					grade: SIXIEME,
				},
				{
					description:
						'Reconnaître si un tableau est un tableau de proportionnalité',
					subdescription: 'En regardant les lignes',
					enounces: ['Ce tableau est-il un tableau de proportionnalité ?'],
					enounces2: [
						'$$\\begin{array}{c|c} \
          &1        &   &2 \\\\ \
          [_&1*&3_]  &  [_&2*&3_] \
        \\end{array}$$',
						'$$\\begin{array}{c|c} \
        &1  &  &2  \\\\ \
        [_&1*&3_]  &   [_&2*(&3+1)_] \
      \\end{array}$$',
					],
					choices: [[{ text: 'Oui' }, { text: 'Non' }]],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]\\{m(&1);d(&1)}',
							'&3': '$e[2;9]',
						},
					],
					solutions: [[0], [1]],
					
					correctionDetails: [
						[
							{
								text: `&solution, $$\\begin{array}{c|c} \
              &1        &   &2 \\\\ \
              [_&1*&3_]  &  [_&2*&3_] \
            \\end{array}$$ est un tableau de proportionnalité, car $$ &1 \\textcolor{${color1}}{\\times &3}=[_&1*&3_]$$ et $$ &2 \\textcolor{${color1}}{\\times &3}=[_&2*&3_] $$`,
							},
							{
								text: 'On a multiplié par le même nombre entre les 2 colonnes.',
							},
						],
						[
							{
								text: `&solution, $$\\begin{array}{c|c} \
              &1  &  &2  \\\\ \
        [_&1*&3_]  &   [_&2*(&3+1)_] \
            \\end{array}$$ n'est pas un tableau de proportionnalité, car $$ &1 \\textcolor{${color1}}{\\times &3}=[_&1*&3_]$$ et $$ &2 \\textcolor{${color2}}{\\times [_&3+1_]}=[_&2*(&3+1)_]$$.`,
							},
							{
								text: "On n'a <b>pas</b> multiplié par le même nombre entre les 2 lignes.",
							},
						],
					],
					options: ['no-shuffle-choices'],
					defaultDelay: 20,
					grade: SIXIEME,
				},
				{
					description: 'Déterminer le coefficent de proportionnalité',
					subdescription: 'Valeur entière',
					enounces: [
						'Quel est le coefficient de proportionnalité de ce tableau ?',
					],
					enounces2: [
						'$$\\begin{array}{c|c} \
          &1        &   &2 \\\\ \
          [_&1*&3_]  &  [_&2*&3_] \
        \\end{array}$$',
					],

					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]\\{m(&1);d(&1)}',
							'&3': '$e[2;9]',
						},
					],
					solutions: [['&3']],
					correctionFormat: [
						{
							correct: ['Le coefficient de proportionnalité est &answer.'],
						},
					],
					correctionDetails: [
						[
							{
								text: 'Le coefficient de proportionnalité du tableau  $$\\begin{array}{c|c} \
              &1        &   &2 \\\\ \
              [_&1*&3_]  &  [_&2*&3_] \
          \\end{array}$$ est &solution car $$[_&1*&3_] \\div &1 = [_&2*&3_] \\div &2 = &sol$$.',
							},
						],
					],
					defaultDelay: 20,
					grade: SIXIEME,
				},
				{
					description: 'Déterminer le coefficent de proportionnalité',
					subdescription: 'Valeur fractionnaire',
					enounces: [
						'Quel est le coefficient de proportionnalité de ce tableau ?',
					],
					enounces2: [
						'$$\\begin{array}{c|c} \
          &1  &  [_&1*&3_] \\\\ \
          &2  &  [_&2*&3_] \
        \\end{array}$$',
					],

					variables: [
						{ '&1': '$e[2;9]', '&2': '$e[2;9]\\{m(&1)}', '&3': '$e[2;9]' },
					],
					solutions: [['&2/&1']],
					correctionFormat: [
						{
							correct: ['Le coefficient de proportionnalité est &answer.'],
						},
					],
					correctionDetails: [
						[
							{
								text: 'Le coefficient de proportionnalité du tableau  $$\\begin{array}{c|c} \
              &1  &   [_&1*&3_] \\\\ \
              &2  &  [_&2*&3_] \
          \\end{array}$$ est &solution car $$&2 \\div &1 = [_&2*&3_] \\div [_&1*&3_] = &sol$$.',
							},
						],
					],
					defaultDelay: 20,
					grade: SIXIEME,
				},
			],
			'Calculer une quatrième proportionnelle': [
				{
					description: 'Calculer une quatrième proportionnelle',
					subdescription: 'En travaillant sur les colonnes',
					enounces: [
						'Ce tableau est un tableau de proportionnalité. Détermine le nombre manquant.',
					],
					answerFields: [
						'$$\\begin{array}{c|c} \
                      &1  &  ...  \\\\ \
                      &2  &   [_&2*&3_] \
                      \\end{array}$$',
						'$$\\begin{array}{c|c} \
                      &1  &   [_&1*&3_] \\\\ \
                      &2  &  ...  \
                      \\end{array}$$',
						'$$\\begin{array}{c|c} \
                      &1  &   [_&1*&3_] \\\\ \
                      ...  &   [_&2*&3_] \
                      \\end{array}$$',
						'$$\\begin{array}{c|c} \
                       ...  &   [_&1*&3_] \\\\ \
                      &2  &   [_&2*&3_] \
                      \\end{array}$$',
					],

					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]\\{m(&1);d(&1)}',
							'&3': '$e[2;9]\\{&1;&2}',
						},
					],
					solutions: [['[_&1*&3_]'], ['[_&2*&3_]'], ['&2'], ['&1']],
					correctionFormat: [
						{
							correct: [
								'$$\\begin{array}{c|c} \
            &1  &   &ans \\\\ \
            &2  &   [_&2*&3_] \
          \\end{array}$$',
							],
						},
						{
							correct: [
								'$$\\begin{array}{c|c} \
            &1  &   [_&1*&3_] \\\\ \
            &2  &   &ans \
          \\end{array}$$',
							],
						},
						{
							correct: [
								'$$\\begin{array}{c|c} \
              &1  &   [_&1*&3_] \\\\ \
                &ans  &  [_&2*&3_]  \
          \\end{array}$$',
							],
						},
						{
							correct: [
								'$$\\begin{array}{c|c} \
              &ans  &   [_&1*&3_] \\\\ \
            &2  &  [_&2*&3_]  \
          \\end{array}$$',
							],
						},
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{array}{c|c} \
                &1  &   &sol \\\\ \
                &2  &   [_&2*&3_] \
              \\end{array}$$ car $$&2 \\textcolor{${color1}}{\\times &3} = [_&2*&3_]$$ et $$&1 \\textcolor{${color1}}{\\times &3} = &sol$$`,
							},
						],
						[
							{
								text: `$$\\begin{array}{c|c} \
                &1  &   [_&1*&3_] \\\\ \
                &2  &   &sol \
              \\end{array}$$ car $$&1\\textcolor{${color1}}{\\times &3} = [_&1*&3_]$$ et $$&2 \\textcolor{${color1}}{\\times &3} = &sol$$`,
							},
						],
						[
							{
								text: `$$\\begin{array}{c|c} \
                &1  &  [_&1*&3_]  \\\\ \
                &sol  &   [_&2*&3_] \
              \\end{array}$$ car $$[_&1*&3_] \\textcolor{${color1}}{\\div &3} = &1$$ et $$[_&2*&3_] \\textcolor{${color1}}{\\div &3} = &sol$$`,
							},
						],
						[
							{
								text: `$$\\begin{array}{c|c} \
                &sol  &  [_&1*&3_]  \\\\ \
                 &2 &   [_&2*&3_] \
              \\end{array}$$ car $$[_&2*&3_] \\textcolor{${color1}}{\\div &3} = &2$$ et $$[_&1*&3_] \\textcolor{${color1}}{\\div &3} = &sol$$`,
							},
						],
					],
					defaultDelay: 20,
					grade: SIXIEME,
				},
				{
					description: 'Calculer une quatrième proportionnelle',
					subdescription: 'En utilisant le coefficient de proportionnalité',
					enounces: [
						'Ce tableau est un tableau de proportionnalité. Détermine le nombre manquant.',
					],
					answerFields: [
						'$$\\begin{array}{c|c} \
                      &1  &  &2  \\\\ \
                       ...  &   [_&2*&3_] \
                      \\end{array}$$',
						'$$\\begin{array}{c|c} \
                      &1  &  &2  \\\\ \
                      [_&1*&3_]  &  ...  \
                      \\end{array}$$',
						'$$\\begin{array}{c|c} \
                      &1  &   ... \\\\ \
                      [_&1*&3_]  &   [_&2*&3_] \
                      \\end{array}$$',
						'$$\\begin{array}{c|c} \
                       ...  &   &2 \\\\ \
                       [_&1*&3_]  &   [_&2*&3_] \
                      \\end{array}$$',
					],

					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]\\{m(&1);d(&1)}',
							'&3': '$e[2;9]\\{&1;&2}',
						},
					],
					solutions: [['[_&1*&3_]'], ['[_&2*&3_]'], ['&2'], ['&1']],
					correctionFormat: [
						{
							correct: [
								'$$\\begin{array}{c|c} \
            						&1  &  &2  \\\\ \
            						&ans  &   [_&2*&3_] \
          						\\end{array}$$',
							],
						},
						{
							correct: [
								'$$\\begin{array}{c|c} \
            						&1  &  &2  \\\\ \
            						[_&1*&3_]  &  &ans \
          						\\end{array}$$',
							],
						},
						{
							correct: [
								'$$\\begin{array}{c|c} \
              						&1  &  &ans  \\\\ \
              						[_&1*&3_]   &  [_&2*&3_]  \
          						\\end{array}$$',
							],
						},
						{
							correct: [
								'$$\\begin{array}{c|c} \
              						&ans  &   &2 \\\\ \
              						[_&1*&3_]  &  [_&2*&3_]  \
          					\\end{array}$$',
							],
						},
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{array}{c|c} \
                &1  &  &2  \\\\ \
                &sol  &   [_&2*&3_] \
              \\end{array}$$ car $$&2 \\textcolor{${color1}}{\\times &3} = [_&2*&3_]$$ et $$&1 \\textcolor{${color1}}{\\times &3} = &sol$$`,
							},
						],
						[
							{
								text: `$$\\begin{array}{c|c} \
                &1  &   &2 \\\\ \
                [_&1*&3_] & &sol \
              \\end{array}$$ car $$&1\\textcolor{${color1}}{\\times &3} = [_&1*&3_]$$ et $$&2 \\textcolor{${color1}}{\\times &3} = &sol$$`,
							},
						],
						[
							{
								text: `$$\\begin{array}{c|c} \
                &1  &  &sol \\\\ \
                [_&1*&3_]  &   [_&2*&3_] \
              \\end{array}$$ car $$[_&1*&3_] \\textcolor{${color1}}{\\div &3} = &1$$ et $$[_&2*&3_] \\textcolor{${color1}}{\\div &3} = &sol$$`,
							},
						],
						[
							{
								text: `$$\\begin{array}{c|c} \
                &sol  &  &2  \\\\ \
                [_&1*&3_] &   [_&2*&3_] \
              \\end{array}$$ car $$[_&2*&3_] \\textcolor{${color1}}{\\div &3} = &2$$ et $$[_&1*&3_] \\textcolor{${color1}}{\\div &3} = &sol$$`,
							},
						],
					],

					defaultDelay: 20,
					grade: SIXIEME,
				},
				{
					description: 'Calculer une quatrième proportionnelle',
					subdescription:
						'En utilisant le coefficient de proportionnalité qui est fractionnaire',
					enounces: [
						'Ce tableau est un tableau de proportionnalité. Détermine le nombre manquant.',
					],
					answerFields: [
						'$$\\begin{array}{c|c} \
                      &1  &  &2  \\\\ \
                       ...  &  &3 \
                      \\end{array}$$',
						'$$\\begin{array}{c|c} \
                      &2  &  &1  \\\\ \
                      &3  &  ...  \
                      \\end{array}$$',
						'$$\\begin{array}{c|c} \
                      &2  &   ... \\\\ \
                      &3  &  [_&1*&3/&2_] \
                      \\end{array}$$',
						'$$\\begin{array}{c|c} \
                       ...  &   &2 \\\\ \
                       [_&1*&3/&2_]  &   &3 \
                      \\end{array}$$',
					],

					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]\\{cd(&1)}',
							'&3': '$e[2;9]\\{cd(&2); &1}',
						},
					],
					solutions: [['[_&1*&3/&2_]'], ['[_&1*&3/&2_]'], ['&1'], ['&1']],
					correctionFormat: [
						{
							correct: [
								'$$\\begin{array}{c|c} \
            &1  &  &2  \\\\ \
            &ans  &   &3 \
          \\end{array}$$',
							],
						},
						{
							correct: [
								'$$\\begin{array}{c|c} \
            &2  &  &1  \\\\ \
            &3 & &ans \
          \\end{array}$$',
							],
						},
						{
							correct: [
								'$$\\begin{array}{c|c} \
              &2  &  &ans  \\\\ \
              &3 & [_&1*&3/&2_] \
            \\end{array}$$',
							],
						},
						{
							correct: [
								'$$\\begin{array}{c|c} \
              &ans  &  &2  \\\\ \
              [_&1*&3/&2_] &  &3 \
            \\end{array}$$',
							],
						},
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{array}{c|c} \
                &1  &  &2  \\\\ \
                &sol  &   &3 \
              \\end{array}$$ car $$&2 \\textcolor{${color1}}{\\times \\frac{&3}{&2}} = &3$$ et $$&1 \\textcolor{${color1}}{\\times \\frac{&3}{&2}} =$$ &solution.`,
							},
						],
						[
							{
								text: `$$\\begin{array}{c|c} \
                &2 & &1  \\\\ \
                &3 & &sol \
              \\end{array}$$ car $$&2 \\textcolor{${color1}}{\\times \\frac{&3}{&2}} = &3$$ et $$&1 \\textcolor{${color1}}{\\times \\frac{&3}{&2}}} =$ &solution.`,
							},
						],
						[
							{
								text: `$$\\begin{array}{c|c} \
                &2 &  &sol \\\\ \
                &3 & [_&1*&3/&2_] \
              \\end{array}$$ car $$&2 \\textcolor{${color1}}{\\times \\frac{&3}{&2}} = &3$$ et $$&sol \\textcolor{${color1}}{\\times \\frac{&3}{&2}} = [_&1*&3/&2_]$$`,
							},
						],
						[
							{
								text: `$$\\begin{array}{c|c} \
                 &sol & &2 \\\\ \
                [_&1*&3/&2_] & &3 \
				\\end{array}$$ car $$&2 \\textcolor{${color1}}{\\times \\frac{&3}{&2}} = &3$$ et $$&sol \\textcolor{${color1}}{\\times \\frac{&3}{&2}} = [_&1*&3/&2_]$$`,
							},
						],
					],
					defaultDelay: 20,
					grade: SIXIEME,
				},
			],
			Appliquer: [
				{
					description: 'Résoudre un petit exercice de proportionnalité',
					subdescription: 'petits nombres',
					enounces: [
						'$$&2$$ shawarmas coûtent $$[_&2*&1_]\\,€$$. Combien coûtent $$[_&3*&2_]$$ shawarmas ?',
						'$$&2$$ shawarmas coûtent $$[_&2*&1_]\\,€$$. Combien puis-je acheter de shawarmas avec $$[_&3*&2*&1_]\\,€$$ ?',
						'$$&2\\,kg$$ de tomates coûtent $$[_&2*&1_]\\,€$$. Combien coûtent $$[_&3*&2_]\\,kg$$ de tomates ?',
						'$$&2\\,kg$$ de tomates coûtent $$[_&2*&1_]\\,€$$. Combien puis-je acheter de tomates avec $$[_&3*&2*&1_]\\,€$$ ?',
						"Une fuite d'eau laisse s'échapper $$[_&2*&1_]\\,L$$ d'eau en $$&2\\,h$$. Combien de litres d'eau s'échappent en $$[_&3*&2_]\\,h$$ ?",
						"Une fuite d'eau laisse s'échapper $$[_&2*&1_]\\,L$$ d'eau en $$&2\\,h$$. En combien de temps s'échappe-t-il $$[_&3*&2*&1_]\\,L$$ d'eau ?",
					],
					variables: [
						{ '&1': '$l{2,5;3,5}', '&2': '$l{2;4;6}', '&3': '$e[2;5]' },
					],
					solutions: [
						['[_&1*&2*&3_] €'],
						['[_&2*&3_]'],
						['[_&1*&2*&3_] €'],
						['[_&2*&3_] kg'],
						['[_&1*&2*&3_] L'],
						['[_&2*&3_] h'],
					],
					units: ['€', '', '€', 'kg', 'L', 'h'],
					correctionFormat: [
						{
							correct: ['$$[_&3*&2_]$$ shawarmas coûtent &answer.'],
						},
						{
							correct: [
								'Je peux acheter &answer shawarmas pour $$[_&1*&2*&3_]\\,€$$.',
							],
							answer: 'Je peux acheter &answer shawarmas.',
						},
						{
							correct: ['$$[_&3*&2_]\\,kg$$ de tomates coûtent &answer.'],
						},
						{
							correct: [
								'Je peux acheter &answer de tomates pour $$[_&3*&2*&1_]\\,€$$.',
							],
						},
						{
							correct: ["Il s'échappe &answer d'eau en $$[_&3*&2_]\\,h$$."],
							answer: "Il s'échappe &answer d'eau.",
						},
						{
							correct: ["Il s'échappe $$[_&3*&2*&1_]\\,L$$ d'eau en &answer."],
						},
					],
					correctionDetails: [
						[
							{
								text: `$$[_&3*&2_]$$ shawarmas, c'est $$\\textcolor{${color1}}{&3\\text{ fois}}$$ plus que $$&2$$ shawarmas à $$[_&1*&2 €_]$$, donc le prix de $$[_&3*&2_]$$ shawarmas est $$[_&1*&2 €_]\\textcolor{${color1}}{\\times &3} = &sol$$.`,
							},
						],
						[
							{
								text: `$$[_&3*&2*&1 €_]$$, c'est $$\\textcolor{${color1}}{&3\\text{ fois}}$$ plus que $$[_&2*&1 €_]$$ pour $$&2$$ shawarmas, donc je peux acheter $$&2\\textcolor{${color1}}{\\times &3} = &sol$$ shawarmas.`,
							},
						],
						[
							{
								text: `$$[_&3*&2_]\\,kg$$ de tomates, c'est $$\\textcolor{${color1}}{&3\\text{ fois}}$$ plus que $$&2\\,kg$$  à $$[_&1*&2€_]$$, donc le prix de $$[_&3*&2_]\\,kg$$ de tomates est $$[_&1*&2 €_]\\textcolor{${color1}}{\\times &3} = &sol$$.`,
							},
						],
						[
							{
								text: `$$[_&3*&2*&1 €_]$$, c'est $$\\textcolor{${color1}}{&3\\text{ fois}}$$ plus que $$[_&2*&1€_]$$ pour $$&2\\,kg$$ de tomates, donc je peux acheter $$&2\\,kg\\textcolor{${color1}}{\\times &3} = &sol$$ de tomates.`,
							},
						],
						[
							{
								text: `$$[_&3*&2_]\\,h$$, c'est $$\\textcolor{${color1}}{&3\\text{ fois}}$$ plus que $$&2\\,h$$ pour $$[_&1*&2_]\\,L$$, donc il s'échappe  $$[_&1*&2_]\\,L\\textcolor{${color1}}{\\times &3} = &sol$$ d'eau en $$[_&3*&2_]\\,h$$.`,
							},
						],
						[
							{
								text: `$$[_&3*&2*&1_]\\,L$$, c'est $$\\textcolor{${color1}}{&3\\text{ fois}}$$ plus que $$[_&2*&1_]\\,L$$ en $$&2\\,h$$, donc il faut $$&2\\,h \\textcolor{${color1}}{\\times &3} = &sol$$ pour perdre $$[_&1*&2*&3_]\\,L$$ d'eau.`,
							},
						],
					],

					defaultDelay: 20,
					grade: SIXIEME,
				},
			],
		},
		Pourcentages: {
			Définition: [
				{
					description: "Définition d'un pourcentage",
					subdescription:
						'Convertir un pourcentage en une fraction de dénominateur $$100$$.',
					enounces: ['Quelle est la fraction correspondant à :'],
					expressions: ['&1%'],
					variables: [{ '&1': '$e[1;100]' }],
					solutions: [['&1/100']],
					options: ['no-penalty-for-non-reduced-fractions'],
					defaultDelay: 10,
					grade: SIXIEME,
				},
				{
					description: "Définition d'un pourcentage",
					subdescription:
						'convertir une fraction de dénominateur $$100$$ en pourcentage.',
					enounces: ['Quelle est pourcentage correspondant à la fraction :'],
					expressions: ['&1/100'],
					variables: [{ '&1': '$e[1;100]' }],
					solutions: [['&1%']],

					defaultDelay: 10,
					grade: SIXIEME,
				},
				{
					description: "Définition d'un pourcentage",
					subdescription:
						'Convertir un pourcentage en une fraction simplifiée.',
					enounces: ['Quelle est la fraction simplifiée correspondant à :'],
					expressions: ['&1%'],
					variables: [
						{
							'&1': '$l{10;20;30;40;50;60;70;80;90;100;25;75;200;300;400}',
							'&2': 'pgcd(&1;100)',
						},
					],

					correctionDetails: [
						[
							{
								text: `@@ &2 = 1 ?? $$ &1\\%=&sol $$ @@ \
                @@ &2 != 1 ?? $$\\begin{align} @@ \
                @@ &2 != 1 ?? &1\\% &= \\frac{&1}{100}  \\\\ @@ \
                @@ &2 != 1 ?? &= \\frac{&1 \\textcolor{${color1}}{\\div [_&2_]}}{100 \\textcolor{${color1}}{\\div [_&2_]}} \\\\ @@\
                @@ &2 != 1 && 100/&2 = 1 ?? &= \\frac{[_&1/&2_]}{1} \\\\  @@ \
                @@ &2 != 1 ?? &= &sol \\\\ @@ \
                @@ &2 != 1 ?? \\end{align}$$ @@`,
							},
						],
					],
					defaultDelay: 10,
					grade: SIXIEME,
				},
			],
			Proportions: [],
			Calculer: [
				{
					description: "Calculer le pourcentage d'une quantité",
					subdescription: '$$50%$$',
					enounces: ['Calcule $$50\\%$$ de $$[_&1*2_]$$.'],
					solutions: [['&1']],
					variables: [{ '&1': '$e[1;50]' }],
					correctionFormat: [
						{
							correct: ['$$50\\%$$ de $$[_&1*2_]$$ est égal à &answer.'],
						},
					],
					correctionDetails: [
						[
							{
								text: '$$50\\%$$ signifie la moitié donc $$50\\%$$ de $$[_&1*2_]$$ est égal à $$[_&1*2_] \\div 2=$$&solution. ',
							},
						],
					],
					defaultDelay: 10,
					grade: SIXIEME,
				},
				{
					description: "Calculer le pourcentage d'une quantité",
					subdescription: "$$10%$$ d'un multiple de $$10$$",
					enounces: ['Calcule $$10\\%$$ de $$[_&1*10_]$$.'],
					solutions: [['&1']],
					variables: [{ '&1': '$e[1;50]' }],
					correctionFormat: [
						{
							correct: ['$$10\\%$$ de $$[_&1*10_]$$ est égal à &answer.'],
						},
					],
					correctionDetails: [
						[
							{
								text: '$$10\\%$$ signifie $$\\frac{1}{10}$$ donc $$10\\%$$ de $$[_&1*10_]$$ est égal à $$[_&1*10_] \\div 10=$$&solution. ',
							},
						],
					],
					defaultDelay: 10,
					grade: SIXIEME,
				},
				{
					description: "Calculer le pourcentage d'une quantité",
					subdescription: "$$10%$$ d'un nombre non multiple de $$10$$",
					enounces: ['Calcule $$10\\%$$ de $$[_&1_]$$.'],
					solutions: [['[._10%*&1_]']],
					variables: [{ '&1': '$e[1;100]\\{m10}' }],
					correctionFormat: [
						{
							correct: ['$$10\\%$$ de $$&1$$ est égal à &answer.'],
						},
					],
					correctionDetails: [
						[
							{
								text: '$$10\\%$$ signifie $$\\frac{1}{10}$$ donc $$10\\%$$ de $$&1$$ est égal à $$&1 \\div 10=$$&solution. ',
							},
						],
					],
					'result-type': 'decimal',
					defaultDelay: 10,
					grade: SIXIEME,
				},
				{
					description: "Calculer le pourcentage d'une quantité",
					subdescription: "$$20%$$-$$40%$$ d'un multiple de $$10$$",
					enounces: ['Calcule $$&1\\%$$ de $$[_&2*10_]$$.'],
					solutions: [['[_&1%*&2*10_]']],
					variables: [{ '&1': '$l{20;30;40}', '&2': '$e[1;40]' }],
					correctionFormat: [
						{
							correct: ['$$&1\\%$$ de $$[_&2*10_]$$ est égal à &answer.'],
						},
					],
					correctionDetails: [
						[
							{
								text: '$$10\\%$$ de $$[_&2*10_]$$ représente $$&2$$ donc $$&1\\%$$ représente $$[_&1:10_] \\times &2 =$$ &solution. ',
							},
						],
					],
					defaultDelay: 10,
					grade: SIXIEME,
				},
				{
					description: "Calculer le pourcentage d'une quantité",
					subdescription: '$$25%$$',
					enounces: ['Calcule $$25\\%$$ de $$[_&1*4_]$$.'],
					solutions: [['&1']],
					variables: [{ '&1': '$e[1;15]' }],
					correctionFormat: [
						{
							correct: ['$$25\\%$$ de $$[_&1*4_]$$ est égal à &answer.'],
						},
					],
					correctionDetails: [
						[
							{
								text: '$$25\\%$$ signifie $$\\frac{1}{4}$$ donc $$25\\%$$ de $$[_&1*4_]$$ est égal à $$[_&1*4_] \\div 4=$$&solution. ',
							},
						],
					],
					defaultDelay: 10,
					grade: SIXIEME,
				},
				{
					description: "Calculer le pourcentage d'une quantité",
					subdescription: '$$75%$$',
					enounces: ['Calcule $$75\\%$$ de $$[_&1*4_]$$.'],
					solutions: [['[_75%*&1*4_]']],
					variables: [{ '&1': '$e[1;12]' }],
					correctionFormat: [
						{
							correct: ['$$75\\%$$ de $$[_&1*4_]$$ est égal à &answer.'],
						},
					],
					correctionDetails: [
						[
							{
								text: '$$25\\%$$ signifie $$\\frac{3}{4}$$ donc $$25\\%$$ de $$[_&1*4_]$$ est égal à $$\\left([_&1*4_] \\div 4 \\right) \\times 3=$$&solution. ',
							},
						],
					],
					defaultDelay: 10,
					grade: SIXIEME,
				},
			],
			Variations: [
				{
					description: 'Augmentation',
					enounces: [
						'Un article qui coûtait initialement $$[_&1_]$$ Qr voit son prix augmenter de $$&2\\%$$. Quel est son nouveau prix?',
					],
					solutions: [['[_&1*(1+&2/100)_]']],
					variables: [
						{ '&1': '$e[2;20]*10', '&2': '10' },
						{ '&1': '$e[2;20]*10', '&2': '20' },
						{ '&1': '$e[2;20]*10', '&2': '50' },
						{ '&1': '$e[2;20]*10', '&2': '100' },
						{ '&1': '$e[2;20]*10', '&2': '200' },
					],
					correctionFormat: [
						{
							correct: ['Le nouveau prix est de &answer Qr.'],
						},
					],
					correctionDetails: [
						[
							{
								text: "L'augmentation est de $$&2\\% \\times [_&1_] = [_&2%*&1_]$$ Qr. Le nouveau prix est donc $$[_&1_] + [_&2%*&1_] =$$ &solution Qr. ",
							},
						],
					],
					defaultDelay: 30,
					grade: SIXIEME,
				},
				{
					description: 'Diminution',
					enounces: [
						'Un article qui coûtait initialement $$[_&1_]$$ Qr voit son prix diminuer de $$&2\\%$$. Quel est son nouveau prix?',
					],
					solutions: [['[_&1*(1-&2/100)_]']],
					variables: [
						{ '&1': '$e[2;20]*10', '&2': '10' },
						{ '&1': '$e[2;20]*10', '&2': '20' },
						{ '&1': '$e[2;20]*10', '&2': '30' },
						{ '&1': '$e[2;20]*10', '&2': '50' },
						{ '&1': '$e[2;20]*10', '&2': '100' },
					],
					correctionFormat: [
						{
							correct: ['Le nouveau prix est de &answer Qr.'],
						},
					],
					correctionDetails: [
						[
							{
								text: 'La diminution est de $$&2\\% \\times [_&1_] = [_&2%*&1_]$$ Qr. Le nouveau prix est donc $$[_&1_] - [_&2%*&1_] =$$ &solution Qr. ',
							},
						],
					],
					defaultDelay: 30,
					grade: SIXIEME,
				},
				{
					description: 'Trouver le coefficient multiplicateur',
					subdescription: 'Augmentation',
					enounces: [
						'Quel est le coefficient multiplicateur correspondant à une augmentation de $$&1\\%$$ ?',
					],
					solutions: [['[._1+&1/100_]']],
					variables: [{ '&1': '$l{$e[1;30];100;200;50}' }],
					correctionFormat: [
						{
							correct: ['Le coefficient multiplicateur est &answer.'],
						},
					],
					correctionDetails: [
						[
							{
								text: 'Le coefficient multiplicateur est $$1+\\frac{&1}{100}=$$ &solution.',
							},
						],
					],
					'result-type': 'decimal',
					defaultDelay: 20,
					grade: SECONDE,
				},
				{
					description: 'Trouver le coefficient multiplicateur',
					subdescription: 'Diminution',
					enounces: [
						'Quel est le coefficient multiplicateur correspondant à une diminution de $$&1\\%$$ ?',
					],
					solutions: [['[._1-&1/100_]']],
					variables: [{ '&1': '$e[1;100]' }],
					correctionFormat: [
						{
							correct: ['Le coefficient multiplicateur est &answer.'],
						},
					],
					correctionDetails: [
						[
							{
								text: 'Le coefficient multiplicateur est $$1-\\frac{&1}{100}=1-[._&1:100_]=$$ &solution.',
							},
						],
					],
					'result-type': 'decimal',
					defaultDelay: 10,
					grade: SECONDE,
				},
				{
					description: "Trouver le pourcentage d'augmentation",
					enounces: [
						"Quel est le pourcentage d'augmentation correspondant à un coefficient multiplicateur de $$[._1+&1/100_]$$ ?",
					],
					solutions: [['&1%']],
					variables: [
						{ '&1': '$l{$e[1;30];$e[31;49];$e[51;70];$e[71;90];100;50;200}' },
					],
					correctionFormat: [
						{
							correct: ["Le pourcentage d'augmentation est &answer."],
						},
					],
					correctionDetails: [
						[
							{
								text: "$$[._1+&1/100_]=1+\\frac{&1}{100}$$ donc le pourcentage d'augmentation est &solution.",
							},
						],
					],
					defaultDelay: 10,
					grade: SECONDE,
				},
				{
					description: 'Trouver le pourcentage de diminution',
					enounces: [
						'Quel est le pourcentage de diminution correspondant à un coefficient multiplicateur de $$[._1-&1/100_]$$ ?',
					],
					variables: [
						{ '&1': '$l{$e[1;30];$e[31;49];$e[51;70];$e[71;90];100;50}' },
					],
					correctionFormat: [
						{
							correct: ['Le pourcentage de diminution est &answer.'],
						},
					],
					correctionDetails: [
						[
							{
								text: '$$[._1-&1/100_]=1-\\frac{&1}{100}$$ donc le pourcentage de diminution est &solution.',
							},
						],
					],

					solutions: [['&1%']],
					defaultDelay: 10,
					grade: SECONDE,
				},
			],
		},
		"Echelle d'une carte": {
			"Trouver l'échelle": [
				{
					description: "Trouver l'échelle d'une carte",
					subdescription: 'Mêmes unités.',
					enounces: [
						"Quelle est l'échelle d'une carte où  $$1cm$$ sur la carte correspond à $$&3$$ en réalité ?",
					],
					solutions: [['[_(1 cm)/&3_]']],
					variables: [
						{ '&1': '$e[1;9]', '&2': '10^$e[1;6]', '&3': '[_&1*&2_] cm' },
					],
					correctionFormat: [
						{
							correct: ["L'échelle est &answer."],
						},
					],
					defaultDelay: 20,
					grade: SIXIEME,
				},
				{
					description: "Trouver l'échelle d'une carte",
					subdescription: 'Unités différentes.',
					enounces: [
						"Quelle est l'échelle d'une carte où $$1 cm$$ sur la carte correspond à $$&1$$ en réalité ?",
					],
					solutions: [['[_(1 cm)/&1_]']],
					variables: [
						{ '&1': '$e[2;9] dm' },
						{ '&1': '$e[2;9] m' },
						{ '&1': '$e[2;9] dam' },
						{ '&1': '$e[2;9] hm' },
						{ '&1': '$e[2;9] km' },
					],
					correctionFormat: [
						{
							correct: ["L'échelle est &answer."],
						},
					],
					correctionDetails: [
						[
							{
								text: '$$\\frac{1\\,cm}{[°&1°]}=\\frac{1\\,cm}{[_&1_cm_]}=&sol$$',
							},
						],
					],

					defaultDelay: 10,
					grade: SIXIEME,
				},
			],
			"Utiliser l'échelle": [
				{
					description: 'Calculer la longueur sur une carte',
					enounces: [
						"Sur une carte à l'échelle $$[_&4_]$$, je veux représenter une longueur de $$&3$$. Quelle est, en <i>cm</i>, la longueur sur la carte ?",
					],
					answerFields: ['$$... cm$$'],
					solutions: [['[_&5/(&1 cm)_]']],
					variables: [
						{ '&1': '10', '&2': '$e[1;9]*10', '&3': '[_&2_] dm', '&4': '1/&1' },
						{
							'&1': '100',
							'&2': '$e[1;9]*10',
							'&3': '[_&2_] dm',
							'&4': '1/&1',
							'&5': '[_&3_cm_]',
						},
						{
							'&1': '100',
							'&2': '$e[1;9]*10',
							'&3': '[_&2_] m',
							'&4': '1/&1',
							'&5': '[_&3_cm_]',
						},
						{
							'&1': '1000',
							'&2': '$e[1;9]*10',
							'&3': '[_&2_] m',
							'&4': '1/&1',
							'&5': '[_&3_cm_]',
						},
						{
							'&1': '100000',
							'&2': '$e[1;9]*10',
							'&3': '[_&2_] km',
							'&4': '1/&1',
							'&5': '[_&3_cm_]',
						},
						{
							'&1': '1000000',
							'&2': '$e[1;9]*10',
							'&3': '[_&2_] km',
							'&4': '1/&1',
							'&5': '[_&3_cm_]',
						},
					],
					// units: ['cm'],
					correctionFormat: [
						{
							correct: ['Sur la carte, la longueur est de &answer $$cm$$.'],
						},
					],
					correctionDetails: [
						[
							{
								text: '$$[_&4_]=\\frac{1\\,cm}{&1\\,cm}= \\frac{1\\,cm}{[_&1:10_]\\,dm}= \\frac{&sol cm}{[°&3°]}$$',
							},
						],
						[
							{
								text: '$$[_&4_]=\\frac{1\\,cm}{&1\\,cm}= \\frac{1\\,cm}{[_&1:10_]\\,dm}= \\frac{&sol cm}{[°&3°]}$$',
							},
						],
						[
							{
								text: '$$[_&4_]=\\frac{1\\,cm}{&1\\,cm}= \\frac{1\\,cm}{[_&1:100_]\\,m}= \\frac{&sol cm}{[°&3°]}$$',
							},
						],
						[
							{
								text: '$$[_&4_]=\\frac{1\\,cm}{&1\\,cm}= \\frac{1\\,cm}{[_&1:100_]\\,m}= \\frac{&sol cm}{[°&3°]}$$',
							},
						],
						[
							{
								text: '$$[_&4_]=\\frac{1\\,cm}{&1\\,cm}= \\frac{1\\,cm}{[_&1:100000_]\\,km}= \\frac{&sol cm}{[°&3°]}$$',
							},
						],
						[
							{
								text: '$$[_&4_]=\\frac{1\\,cm}{&1\\,cm}= \\frac{1\\,cm}{[_&1:100000_]\\,km}= \\frac{&sol cm}{[°&3°]}$$',
							},
						],
					],
					defaultDelay: 20,
					grade: SIXIEME,
				},
				{
					description: 'Calculer la longueur réelle',
					enounces: [
						"Sur une carte à l'échelle $$[_&4_]$$, je mesure une longueur de $$&3$$. Quelle est la longueur réelle ?",
					],
					solutions: [
						['[_(&3)*&1_dm_]'],
						['[_(&3)*&1_m_]'],
						['[_(&3)*&1_m_]'],
						['[_(&3)*&1_dam_]'],
						['[_(&3)*&1_km_]'],
						['[_(&3)*&1_km_]'],
					],
					variables: [
						{
							'&1': '10',
							'&2': '$e[2;9]*10^$e[0;1]',
							'&3': '[_&2_] cm',
							'&4': '1/&1',
						},
						{ '&1': '100', '&2': '$e[2;9]', '&3': '&2 cm', '&4': '1/&1' },
						{
							'&1': '100',
							'&2': '$e[2;9]*10^$e[0;1]',
							'&3': '[_&2_] cm',
							'&4': '1/&1',
						},
						{ '&1': '1000', '&2': '$e[2;9]', '&3': '&2 cm', '&4': '1/&1' },
						{
							'&1': '100000',
							'&2': '$e[2;9]*10^$e[0;1]',
							'&3': '[_&2_] cm',
							'&4': '1/&1',
						},
						{ '&1': '1000000', '&2': '$e[2;9]', '&3': '&2 cm', '&4': '1/&1' },
					],
					units: ['dm', 'dm', 'm', 'm', 'km', 'km'],

					options: ['no-penalty-for-not-respected-unit'],
					correctionFormat: [
						{
							correct: ['La longueur réelle est de &answer.'],
						},
					],
					correctionDetails: [
						[
							{
								text: '$$[_&4_]=\\frac{1\\,cm}{[°&1 cm°]}= \\frac{1\\,cm}{[_(&1:10)_]\\,dm}= \\frac{[°&3°]}{&sol}$$',
							},
						],
						[
							{
								text: '$$[_&4_]=\\frac{1\\,cm}{[°&1 cm°]}= \\frac{1\\,cm}{[_(&1:10)_]\\,dm}= \\frac{[°&3°]}{&sol}$$',
							},
						],
						[
							{
								text: '$$[_&4_]=\\frac{1\\,cm}{[°&1 cm°]}= \\frac{1\\,cm}{[_(&1:100)_]\\,m}= \\frac{[°&3°]}{&sol}$$',
							},
						],
						[
							{
								text: '$$[_&4_]=\\frac{1\\,cm}{[°&1 cm°]}= \\frac{1\\,cm}{[_(&1:100)_]\\,m}= \\frac{[°&3°]}{&sol}$$',
							},
						],
						[
							{
								text: '$$[_&4_]=\\frac{1\\,cm}{[°&1 cm°]}= \\frac{1\\,cm}{[_(&1:100000)_]\\,km}= \\frac{[°&3°]}{&sol}$$',
							},
						],
						[
							{
								text: '$$[_&4_]=\\frac{1\\,cm}{[°&1 cm°]}= \\frac{1\\,cm}{[_(&1:100000)_]\\,km}= \\frac{[°&3°]}{&sol}$$',
							},
						],
					],
					defaultDelay: 20,
					grade: SIXIEME,
				},
			],
		},
		'Vitesse uniforme': {
			'Déterminer une vitesse': [
				{
					description: 'Déterminer une vitesse moyenne',
					enounces: [
						"Une voiture parcourt $$&1$$ en Quelle est l'échelle d'une carte où $$&3$$ sur la carte correspond à $$1\\,cm$$ en réalité ?",
					],
					expressions: ['(1 cm)/&3'],
					variables: [
						{ '&1': '$e[1;9]', '&2': '10^$e[1;6]', '&3': '[_&1*&2_] cm' },
					],

					defaultDelay: 10,
					grade: SIXIEME,
				},
			],
		},
	},
	'Calcul littéral': {
		Calculs: {
			'Par substitution': [
				{
					description: 'Calcule en substituant les variables',
					subdescription:
						'Expressions simples. Pas de simplification de la multiplication.',
					enounces: ['Calcule avec $$&1=&2$$.'],
					expressions: ['&3*&1', '&1*&3', '&3+&1', '&1+&3'],
					variables: [
						{
							'&1': '$l{a;b;c}',
							'&2': '$e[2;9]',
							'&3': '$e[2;9]',
						},
					],
					letters: [
						{
							'&1': '&2',
						},
					],

					correctionDetails: [
						[
							{
								text: `$$\\begin{align} &3 \\times \\textcolor{${color1}}{&1} &= &3 \\times \\textcolor{${color1}}{&2} \\\\ &=  &sol  \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\textcolor{${color1}}{&1} \\times &3 &= \\textcolor{${color1}}{&2} \\times &3 \\\\ &=  &sol  \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} &3 + \\textcolor{${color1}}{&1} &= &3 + \\textcolor{${color1}}{&2} \\\\ &=  &sol   \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \\textcolor{${color1}}{&1} + &3 &= \\textcolor{${color1}}{&2} + &3 \\\\ &=  &sol  \\end{align}$$`,
							},
						],
					],
					defaultDelay: 30,
					grade: CINQUIEME,
				},
				{
					description: 'Calculer en substituant les variables',
					subdescription:
						'Expressions simples. Simplification de la multiplication.',
					enounces: ['Calcule avec $$&1=&2$$'],
					expressions: ['&3&1', '&3+&1'],
					variables: [
						{
							'&1': '$l{a;b;c}',
							'&2': '$e[2;9]',
							'&3': '$e[2;9]',
						},
					],
					letters: [
						{
							'&1': '&2',
						},
					],

					correctionDetails: [
						[
							{
								text: `$$\\begin{align} &3 \\textcolor{${color1}}{&1} &= &3 \\times \\textcolor{${color1}}{&2} \\\\ &=  &sol  \\\\ \\end{align}$$`,
							},
						],

						[
							{
								text: `$$\\begin{align} &3 + \\textcolor{${color1}}{&1} &= &3 + \\textcolor{${color1}}{&2} \\\\ &=  &sol  \\\\ \\end{align}$$`,
							},
						],
					],
					defaultDelay: 30,
					grade: CINQUIEME,
				},
				{
					description: 'Calculer en substituant les variables',
					subdescription: 'Entiers naturels',
					enounces: [
						'Calcule avec $$&1=&2$$',
						'Calcule avec $$&1=&2$$',
						'Calcule avec $$&1=&2$$ et $$&5=&6$$',
					],
					expressions: ['&3&1+&4', '&4+&3&1', '&4&5+&3&1'],
					variables: [
						{
							'&1': '$l{a;b;c}',
							'&2': '$e[2;9]',
							'&3': '$e[2;9]',
							'&4': '$e[2;9]',
							'&5': '$l{a;b;c}\\{&1}',
							'&6': '$e[2;9]',
						},
					],
					letters: [
						{
							'&1': '&2',
							'&5': '&6',
						},
					],

					correctionDetails: [
						[
							{
								text: `$$\\begin{align} &3 \\textcolor{${color1}}{&1} + &4 &= &3 \\times \\textcolor{${color1}}{&2} + &4 \\\\ &= [_&3*&2_] + &4  \\\\ &=  &sol  \\\\ \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} &4 + &3 \\textcolor{${color1}}{&1} &= &4 + &3 \\times \\textcolor{${color1}}{&2} \\\\ &= &4 + [_&3*&2_]  \\\\ &=  &sol  \\\\ \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} &4 \\textcolor{${color2}}{&5} + &3 \\textcolor{${color1}}{&1} &= &4 \\times \\textcolor{${color2}}{&6} + &3 \\times \\textcolor{${color1}}{&2} \\\\ &= [_&4*&6_] + [_&3*&2_]  \\\\ &=  &sol  \\\\ \\end{align}$$`,
							},
						],
					],
					defaultDelay: 30,
					grade: CINQUIEME,
				},
				{
					description: 'Calculer en substituant les variables',
					subdescription: 'Entiers relatifs',
					enounces: [
						'Calcule avec $$&1=&2$$',
						'Calcule avec $$&1=&2$$',
						'Calcule avec $$&1=&2$$',
						'Calcule avec $$&1=&2$$',
						'Calcule avec $$&1=&2$$ et $$&5=&6$$',
					],
					expressions: [
						'&3&1[+_&4_]',
						'&3&1[+_&4_]',
						'&4[+_&3_]&1',
						'&4[+_&3_]&1',
						'&4&5[+_&3_]&1',
					],
					variables: [
						{
							'&1': '$l{a;b;c}',
							'&2': '$e[2;5]',
							'&3': '$er[2;5]',
							'&4': '$er[2;9]',
							'&5': '$l{a;b;c}\\{&1}',
							'&6': '$er[2;9]',
						},
						{
							'&1': '$l{a;b;c}',
							'&2': '-$e[2;5]',
							'&3': '$er[2;5]',
							'&4': '$er[2;9]',
							'&5': '$l{a;b;c}\\{&1}',
							'&6': '$er[2;9]',
						},
						{
							'&1': '$l{a;b;c}',
							'&2': '$e[2;5]',
							'&3': '$er[2;5]',
							'&4': '$er[2;9]',
							'&5': '$l{a;b;c}\\{&1}',
							'&6': '$er[2;9]',
						},
						{
							'&1': '$l{a;b;c}',
							'&2': '-$e[2;5]',
							'&3': '$er[2;5]',
							'&4': '$er[2;9]',
							'&5': '$l{a;b;c}\\{&1}',
							'&6': '$er[2;9]',
						},
						{
							'&1': '$l{a;b;c}',
							'&2': '$e[2;5]',
							'&3': '$er[2;5]',
							'&4': '$er[2;9]',
							'&5': '$l{a;b;c}\\{&1}',
							'&6': '$e[2;9]',
						},
					],
					letters: [
						{
							'&1': '&2',
							'&5': '&6',
						},
					],

					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
              &3 \\textcolor{${color1}}{&1} [+_&4_] \
              &= &3 \\times \\textcolor{${color1}}{&2} [+_&4_] \\\\ \
              &= [_&3*(&2)_] [+_&4_]  \\\\ \
              &=  &sol  \\\\ \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              &3 \\textcolor{${color1}}{&1} [+_&4_] \
              &= &3 \\times  \\textcolor{${color1}}{\\left( &2 \\right) } [+_&4_] \\\\ \
              &= [_&3*(&2)_] [+_&4_]  \\\\ \
              &=  &sol  \\\\ \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              &4 [+_&3_] \\textcolor{${color1}}{&1} \
              &= &4 [+_&3_] \\times \\textcolor{${color1}}{&2} \\\\ \
              &= &4  [+_&3*&2_]  \\\\ \
              &=  &sol  \\\\ \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              &4 [+_&3_] \\textcolor{${color1}}{&1} \
              &= &4 [+_&3_] \\times  \\textcolor{${color1}}{\\left( &2 \\right)}  \\\\ \
              &= &4 [+_&3*(&2)_]  \\\\ \
              &=  &sol  \\\\ \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              &4 \\textcolor{${color2}}{&5}  [+_&3_] \\textcolor{${color1}}{&1} \
              &= &4 \\times \\textcolor{${color2}}{&6} [+_&3_] \\times \\textcolor{${color1}}{&2} \\\\ \
              &= [_&4*&6_] [+_&3*&2_]  \\\\ \
              &=  &sol  \\\\ \
              \\end{align}$$`,
							},
						],
					],
					defaultDelay: 30,
					grade: CINQUIEME,
				},
			],
		},
		Transformation: {
			"Simplification d'écriture": [
				{
					description: 'Simplifier le symbole de multiplication',
					subdescription: 'Devant une lettre',

					enounces: ["Réécris l'expression en la simplifiant."],
					expressions: ['&2*&1', '&1*&2'],
					variables: [
						{
							'&1': '$l{a;b;c;x;y}',
							'&2': '$e[2;9]',
						},
					],
					options: [
						'require-implicit-products',
						'disallow-factors-permutation',
					],
					solutions: [['&2&1']],

					defaultDelay: 30,
					grade: CINQUIEME,
				},
				{
					description: 'Simplifier le symbole de multiplication',
					subdescription: 'Devant une parenthèse',

					enounces: ["Simplifie l'écriture de cette expression."],
					expressions: [
						'&3*(&1+&2)',
						'&3*(&1+&4)',
						'&5*(&1+&2)',
						'&5*(&1+&4)',
						'(&1+&2)*&5',
						'(&1+&4)*&5',
					],
					variables: [
						{
							'&1': '$l{a;b;c;x;y}',
							'&2': '$l{a;b;c;x;y}\\{&1}',
							'&3': '$l{a;b;c;x;y}',
							'&4': '$e[2;9]',
							'&5': '$e[2;9]',
						},
					],
					options: [
						'require-implicit-products',
						'disallow-factors-permutation',
					],
					solutions: [
						['&3(&1+&2)'],
						['&3(&1+&4)'],
						['&5(&1+&2)'],
						['&5(&1+&4)'],
						['&5(&1+&2)'],
						['&5(&1+&4)'],
					],

					defaultDelay: 30,
					grade: CINQUIEME,
				},
				{
					description: 'Simplifier un produit par $$0$$ ou $$1$$',
					enounces: ['Ecris plus simplement cette expression littérale :'],
					expressions: ['1&1', '0&1'],
					variables: [
						{
							'&1': '$l{a;b;c;x;y}',
						},
					],
					options: ['require-no-factor-one', 'require-no-factor-zero'],
					solutions: [['&1'], ['0']],

					defaultDelay: 30,
					grade: CINQUIEME,
				},
				{
					description: "Simplifier à l'aide d'un carré ou d'un cube",
					enounces: ["Simlifie l'écriture de cette expression littérale :"],
					expressions: ['&1*&1', '&1*&1*&1'],
					variables: [
						{
							'&1': '$l{a;b;c;x;y}',
						},
					],
					solutions: [['&1^2'], ['&1^3']],
					defaultDelay: 30,
					grade: CINQUIEME,
				},
			],
			Réduction: [
				{
					description: 'Réduire une somme',
					subdescription: 'Coefficients positifs, $$2$$ littéraux identiques',
					enounces: ['Réduire :'],
					expressions: ['[_&2&1_]+[_&3&1_]', '[_&3&1_]-[_&2&1_]'],
					variables: [
						{
							'&1': '$l{a;b;c}',
							'&2': '$e[1;9]',
							'&3': '$e[1;9]',
						},
						{
							'&1': '$l{a;b;c}',
							'&2': '$e[1;8]',
							'&3': '$e[&2;9]',
						},
					],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} \
              [_&2&1_]+[_&3&1_] \
              &= (&2+&3) \\times &1 \\\\ \
              &= [_&2+&3_] \\times &1 \\\\ \
              &= &sol  \
              \\end{align}$$',
							},
						],
						[
							{
								text: '$$\\begin{align} \
              [_&3&1_]-[_&2&1_] \
              &= (&3-&2) \\times &1 \\\\ \
              &= [_&3-&2_] \\times &1 \\\\ \
              &= &sol  \
              \\end{align}$$',
							},
						],
					],

					options: ['penalty-for-factors-permutation'],
					defaultDelay: 30,
					grade: CINQUIEME,
				},
				{
					description: 'Réduire une somme',
					subdescription:
						'Coefficients positifs, $$2$$ littéraux identiques + un entier',
					enounces: ['Réduire :'],
					expressions: [
						'&4+[_&2&1_]+[_&3&1_]',
						'[_&2&1_]+&4+[_&3&1_]',
						'[_&2&1_]+[_&3&1_]+&4',
						'&4+[_&3&1_]-[_&2&1_]',
						'[_&3&1_]+&4-[_&2&1_]',
						'[_&3&1_]-[_&2&1_]+&4',
					],
					variables: [
						{
							'&1': '$l{a;b;c}',
							'&2': '$e[1;9]',
							'&3': '$e[1;9]',
							'&4': '$e[1;9]',
						},
						{
							'&1': '$l{a;b;c}',
							'&2': '$e[1;9]',
							'&3': '$e[1;9]',
							'&4': '$e[1;9]',
						},
						{
							'&1': '$l{a;b;c}',
							'&2': '$e[1;9]',
							'&3': '$e[1;9]',
							'&4': '$e[1;9]',
						},
						{
							'&1': '$l{a;b;c}',
							'&2': '$e[1;8]',
							'&3': '$e[&2;9]',
							'&4': '$e[1;9]',
						},
						{
							'&1': '$l{a;b;c}',
							'&2': '$e[1;8]',
							'&3': '$e[&2;9]',
							'&4': '$e[1;9]',
						},
						{
							'&1': '$l{a;b;c}',
							'&2': '$e[1;8]',
							'&3': '$e[&2;9]',
							'&4': '$e[1;9]',
						},
					],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} \
              &4+[_&2&1_]+[_&3&1_] \
              &= &4 + (&2+&3) \\times &1 \\\\ \
              &= &4 + [_&2+&3_] \\times &1 \\\\ \
              &= &sol  \
              \\end{align}$$',
							},
						],
						[
							{
								text: '$$\\begin{align} \
              [_&2&1_]+&4+[_&3&1_] \
              &= &4 + (&2+&3) \\times &1 \\\\ \
              &= &4 + [_&2+&3_] \\times &1 \\\\ \
              &= &sol  \
              \\end{align}$$',
							},
						],
						[
							{
								text: '$$\\begin{align} \
              [_&2&1_]+[_&3&1_] + &4\
              &= (&2+&3) \\times &1 + &4\\\\ \
              &= [_&2+&3_] \\times &1  + &4 \\\\ \
              &= &sol  \
              \\end{align}$$',
							},
						],
						[
							{
								text: '$$\\begin{align} \
              &4+[_&3&1_]-[_&2&1_] \
              &= &4 + (&3-&2) \\times &1 \\\\ \
              &= &4 + [_&3-&2_] \\times &1 \\\\ \
              &= &sol  \
              \\end{align}$$',
							},
						],
						[
							{
								text: '$$\\begin{align} \
              [_&3&1_] + &4 -[_&2&1_] \
              &= &4 + (&3-&2) \\times &1 \\\\ \
              &= &4 + [_&3-&2_] \\times &1 \\\\ \
              &= &sol  \
              \\end{align}$$',
							},
						],
						[
							{
								text: '$$\\begin{align} \
              [_&3&1_]-[_&2&1_] + &4\
              &= (&3-&2) \\times &1  + &4 \\\\ \
              &= [_&3-&2_] \\times &1  + &4 \\\\ \
              &= &sol  \
              \\end{align}$$',
							},
						],
					],

					options: ['penalty-for-factors-permutation'],
					defaultDelay: 30,
					grade: CINQUIEME,
				},
				{
					description: 'Réduire une expression',
					subdescription: 'Coefficients positifs',
					enounces: ['Réduire :'],
					expressions: [
						'&2&1+&3&1+&5&4+&6&4',
						'&2&1+&5&4+&3&1+&6&4',
						'&2&1+&5&4+&6&4+&3&1',
					],
					variables: [
						{
							'&1': '$l{a;b;c}',
							'&2': '$e[2;9]',
							'&3': '$e[2;9]',
							'&4': '$l{a;b;c}\\{&1}',
							'&5': '$e[2;9]',
							'&6': '$e[2;9]',
						},
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
              &2\\textcolor{${color1}}{&1}+&3\\textcolor{${color1}}{&1}+&5\\textcolor{${color2}}{&4}+&6\\textcolor{${color2}}{&4} \
              &= (&2+&3) \\times \\textcolor{${color1}}{&1} + (&5+&6) \\times \\textcolor{${color2}}{&4} \\\\ \
              &= [_&2+&3_] \\times \\textcolor{${color1}}{&1} + [_&5+&6_] \\times \\textcolor{${color2}}{&4} \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              &2\\textcolor{${color1}}{&1} + &5\\textcolor{${color2}}{&4} + &3\\textcolor{${color1}}{&1}+&6\\textcolor{${color2}}{&4} \
              &= (&2+&3) \\times \\textcolor{${color1}}{&1} + (&5+&6) \\times \\textcolor{${color2}}{&4} \\\\ \
              &= [_&2+&3_] \\times \\textcolor{${color1}}{&1} + [_&5+&6_] \\times \\textcolor{${color2}}{&4} \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              &2\\textcolor{${color1}}{&1} + &5\\textcolor{${color2}}{&4} + &6\\textcolor{${color2}}{&4} + &3\\textcolor{${color1}}{&1} \
              &= (&2+&3) \\times \\textcolor{${color1}}{&1} + (&5+&6) \\times \\textcolor{${color2}}{&4} \\\\ \
              &= [_&2+&3_] \\times \\textcolor{${color1}}{&1} + [_&5+&6_] \\times \\textcolor{${color2}}{&4} \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
					],
					options: ['penalty-for-factors-permutation'],

					defaultDelay: 30,
					grade: CINQUIEME,
				},
				{
					description: 'Réduire un produit',
					subdescription: 'Coefficients positifs',
					enounces: ['Réduire :'],
					expressions: [
						'&1*&2*&3',
						'&2*&1*&3',
						'&3*&2*&1',
						'&1*&2*&1',
						'&1*&1*&2',
						'&2*&1*&1',
					],
					variables: [
						{
							'&1': '$l{a;b;c;x;y;z}',
							'&2': '$e[2;9]',
							'&3': '$e[2;9]',
						},
					],

					correctionDetails: [
						[
							{
								text: '$$\\begin{align} \
              &1 \\times &2 \\times &3 \
              &= &1 \\times [_&2*&3_] \\\\ \
              &= &sol  \
              \\end{align}$$',
							},
						],
						[
							{
								text: '$$\\begin{align} \
              &2 \\times &1 \\times &3 \
              &= &2 \\times &3 \\times &1 \\\\ \
              &= [_&3*&2_] \\times &1 \\\\ \
              &= &sol  \
              \\end{align}$$',
							},
						],
						[
							{
								text: '$$\\begin{align} \
              &3 \\times &2 \\times &1 \
              &= [_&3*&2_] \\times &1 \\\\ \
              &= &sol  \
              \\end{align}$$',
							},
						],
						[
							{
								text: '$$\\begin{align} \
              &1 \\times &2 \\times &1 \
              &= &2 \\times &1 \\times &1 \\\\ \
              &= &2 \\times &1^2 \\\\ \
              &= &sol  \
              \\end{align}$$',
							},
						],
						[
							{
								text: '$$\\begin{align} \
              &1 \\times &1 \\times &2 \
              &= &1^2 \\times &2 \\\\ \
              &= &sol  \
              \\end{align}$$',
							},
						],
						[
							{
								text: '$$\\begin{align} \
              &2 \\times &1 \\times &1 \
              &= &2 \\times &1^2 \\\\ \
              &= &sol  \
              \\end{align}$$',
							},
						],
					],
					options: ['penalty-for-factors-permutation'],
					defaultDelay: 30,
					grade: CINQUIEME,
				},
				{
					description: 'Réduire une somme',
					subdescription: 'Coefficients relatifs',
					enounces: ['Réduire :'],
					expressions: ['[_&2&1_][+_&3&1_]'],
					variables: [
						{
							'&1': '$l{a;b;c}',
							'&2': '$er[1;9]',
							'&3': '$ers[1;9]',
						},
					],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} \
              [_&2&1_][+_&3&1_] \
              &= (&2[+_&3_]) \\times &1 \\\\ \
              &= [_&2+(&3)_] \\times &1 \\\\ \
              &= &sol  \
              \\end{align}$$',
							},
						],
					],

					defaultDelay: 30,
					options: ['penalty-for-factors-permutation'],
					grade: TROISIEME,
				},

				{
					description: 'Réduire une somme',
					subdescription: 'Coefficients relatifs',
					enounces: ['Réduire :'],
					expressions: [
						'[_&2&1_][+_&3&1_][+_&5&4_][+_&6&4_]',
						'[_&2&1_][+_&3&4_][+_&5&1_][+_&6&4_]',
						'[_&2&1_][+_&3&4_][+_&5&4_][+_&6&1_]',
					],
					variables: [
						{
							'&1': '$l{a;b;c}',
							'&2': '$er[1;9]',
							// '&3': '$l{+$e[2;9];-$e[2;9]}',
							'&3': '$er[1;9]',
							'&4': '$l{a;b;c}\\{&1}',
							'&5': '$er[1;9]',
							// '&5': '$l{+$e[2;9];-$e[2;9]}',
							// '&6': '+$e[2;9]',
							'&6': '$er[1;9]',
						},
					],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} \
              [_&2&1_][+_&3&1_][+_&5&4_][+_&6&4_] \
              &= (&2[+_&3_]) \\times &1 + (&5[+_&6_]) \\times &4 \\\\ \
              &= [_&2+(&3)_] \\times &1 [+_&5+(&6)_] \\times &4 \\\\ \
              &= &sol  \
              \\end{align}$$',
							},
						],
						[
							{
								text: '$$\\begin{align} \
              [_&2&1_][+_&3&4_][+_&5&1_][+_&6&4_] \
              &= (&2[+_&5_]) \\times &1 + (&3[+_&6_]) \\times &4 \\\\ \
              &= [_&2+(&5)_] \\times &1 [+_&3+(&6)_] \\times &4 \\\\ \
              &= &sol  \
              \\end{align}$$',
							},
						],
						[
							{
								text: '$$\\begin{align} \
              [_&2&1_][+_&3&4_][+_&5&4_][+_&6&1_] \
              &= (&2[+_&6_]) \\times &1 + (&3[+_&5_]) \\times &4 \\\\ \
              &= [_&2+(&6)_] \\times &1 [+_&3+(&5)_] \\times &4 \\\\ \
              &= &sol  \
              \\end{align}$$',
							},
						],
					],

					options: ['penalty-for-factors-permutation'],
					defaultDelay: 30,
					grade: TROISIEME,
				},
				{
					description: 'Réduire un produit',
					subdescription: 'Coefficients relatifs',
					enounces: ['Réduire :'],
					expressions: [
						'&1*(-&2)*&3',
						'(-&2)*&1*&3',
						'&3*(-&2)*&1',
						'&1*&2*(-&3)',
						'&2*&1*(-&3)',
						'(-&3)*&2*&1',
						'&1*(-&2)*(-&3)',
						'(-&2)*&1*(-&3)',
						'(-&3)*(-&2)*&1',
						'(-&1)*(-&2)*&3',
						'(-&2)*(-&1)*&3',
						'&3*(-&2)*(-&1)',
						'(-&1)*&2*(-&3)',
						'&2*(-&1)*(-&3)',
						'(-&3)*&2*(-&1)',
						'(-&1)*(-&2)*(-&3)',
						'(-&2)*(-&1)*(-&3)',
						'(-&3)*(-&2)*(-&1)',
					],
					variables: [
						{
							'&1': '$l{a;b;c;x;y;z}',
							'&2': '$e[2;9]',
							'&3': '$e[2;9]',
						},
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
              &1 \\times \\bold{\\textcolor{${color1}}{(-&2) \\times &3}} \
              &= &1 \\times \\bold{\\textcolor{${color1}}{(-[_&2*&3_])}} \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              (-&2) \\times &1 \\times &3 \
              &= \\bold{\\textcolor{${color1}}{(-&2) \\times &3}} \\times &1 \\\\ \
              &=  \\bold{\\textcolor{${color1}}{(-[_&2*&3_])}} \\times &1 \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              \\bold{\\textcolor{${color1}}{&3 \\times (-&2)}} \\times &1 \
              &=  \\bold{\\textcolor{${color1}}{(-[_&2*&3_])}} \\times &1 \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              &1 \\times \\bold{\\textcolor{${color1}}{&2 \\times (-&3)}} \
              &= &1 \\times \\bold{\\textcolor{${color1}}{(-[_&2*&3_])}} \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              &2 \\times &1 \\times (-&3) \
              &= \\bold{\\textcolor{${color1}}{&2 \\times (-&3)}} \\times &1 \\\\ \
              &=  \\bold{\\textcolor{${color1}}{(-[_&2*&3_])}} \\times &1 \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              \\bold{\\textcolor{${color1}}{(-&3) \\times &2}} \\times &1 \
              &=  \\bold{\\textcolor{${color1}}{(-[_&2*&3_])}} \\times &1 \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              &1 \\times \\bold{\\textcolor{${color1}}{(-&2) \\times (-&3)}} \
              &= &1 \\times \\bold{\\textcolor{${color1}}{[_&2*&3_]}} \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              (-&2) \\times &1 \\times (-&3) \
              &=  \\bold{\\textcolor{${color1}}{(-&2) \\times (-&3)}} \\times &1 \\\\ \
              &=  \\bold{\\textcolor{${color1}}{[_&2*&3_]}} \\times &1 \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              \\bold{\\textcolor{${color1}}{(-&3) \\times (-&2)}} \\times &1 \
              &=  \\bold{\\textcolor{${color1}}{[_&2*&3_]}} \\times &1 \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              (-&1) \\times \\bold{\\textcolor{${color1}}{(-&2) \\times &3}} \
              &=  (-&1) \\times \\bold{\\textcolor{${color1}}{([_-&2*&3_])}} \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              (-&2) \\times (-&1) \\times &3 \
              &=  \\bold{\\textcolor{${color1}}{(-&2) \\times &3}} \\times (-&1) \\\\ \
              &=  \\bold{\\textcolor{${color1}}{([_-&2*&3_])}} \\times (-&1) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              \\bold{\\textcolor{${color1}}{&3 \\times (-&2)}} \\times (-&1) \
              &=  \\bold{\\textcolor{${color1}}{([_-&2*&3_])}} \\times (-&1) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              (-&1) \\times \\bold{\\textcolor{${color1}}{&2 \\times (-&3)}} \
              &=  (-&1) \\times \\bold{\\textcolor{${color1}}{([_-&2*&3_])}} \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              &2 \\times (-&1) \\times (-&3) \
              &=  \\bold{\\textcolor{${color1}}{&2 \\times (-&3)}} \\times (-&1) \\\\ \
              &=  \\bold{\\textcolor{${color1}}{([_-&2*&3_])}} \\times (-&1) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              \\bold{\\textcolor{${color1}}{(-&3) \\times &2}} \\times (-&1) \
              &=  \\bold{\\textcolor{${color1}}{([_-&2*&3_])}} \\times (-&1) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              (-&1) \\times \\bold{\\textcolor{${color1}}{(-&2) \\times (-&3)}} \
              &=  (-&1) \\times  \\bold{\\textcolor{${color1}}{[_&2*&3_]}} \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              (-&2) \\times (-&1) \\times (-&3) \
              &=  \\bold{\\textcolor{${color1}}{(-&2) \\times (-&3)}} \\times (-&1) \\\\ \
              &=  \\bold{\\textcolor{${color1}}{[_&2*&3_]}} \\times (-&1) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              \\bold{\\textcolor{${color1}}{(-&3) \\times (-&2)}} \\times (-&1) \
              &=  \\bold{\\textcolor{${color1}}{[_&2*&3_]}} \\times (-&1) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
					],

					options: ['penalty-for-factors-permutation'],
					defaultDelay: 30,
					grade: TROISIEME,
				},
				{
					description: 'Réduire une expression',
					subdescription: 'Coefficients relatifs, expression du second degré',
					enounces: ['Réduire :'],
					expressions: [
						'[_&2&1^2_][+_&3&1_][+_&4_][+_&5&1^2_][+_&6&1_][+_&7_]',
						'[_&2&1_][+_&3&1^2_][+_&4_][+_&5&1^2_][+_&6&1_][+_&7_]',
						'[_&2&1_][+_&3_][+_&4^2_][+_&5&1^2_][+_&6&1_][+_&7_]',
					],
					variables: [
						{
							'&1': '$l{a;b;c}',
							'&2': '$er[1;9]',
							'&3': '$er[1;9]',
							'&4': '$er[1;9]',
							'&5': '$er[1;9]',
							'&6': '$er[1;9]',
							'&7': '$er[1;9]',
						},
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
              [_&2&1^2_][+_&3&1_][+_&4_][+_&5&1^2_][+_&6&1_][+_&7_] \
              &= (&2[+_&5_]) \\times &1^2 + (&3[+_&6_]) \\times &1 [+_&4_] [+_&7_] \\\\ \
              &= [_&2+(&5)_] \\times &1^2  [+_&3+(&6)_] \\times &1 [+_&4+(&7)_] \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              [_&2&1_][+_&3&1^2_][+_&4_][+_&5&1^2_][+_&6&1_][+_&7_] \
              &= (&3[+_&5_]) \\times &1^2 + (&2[+_&6_]) \\times &1 [+_&4_] [+_&7_] \\\\ \
              &= [_&3+(&5)_] \\times &1^2  [+_&2+(&6)_] \\times &1 [+_&4+(&7)_] \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              [_&2&1_][+_&3_][+_&4^2_][+_&5&1^2_][+_&6&1_][+_&7_] \
              &= (&4[+_&5_]) \\times &1^2 + (&2[+_&6_]) \\times &1 [+_&3_] [+_&7_] \\\\ \
              &= [_&4+(&5)_] \\times &1^2  [+_&2+(&6)_] \\times &1 [+_&3+(&7)_] \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
					],
					options: ['penalty-for-factors-permutation'],

					defaultDelay: 30,
					grade: SECONDE,
				},
			],
			"Opposé d'une expression": [
				{
					description: "Déterminer l'opposé d'une expression",
					subdescription: 'Expression simple',
					enounces: ["Quel est l'opposé de cette expression ?"],
					expressions: ['[_&1&2_]'],
					variables: [
						{
							'&1': '$er[1;9]',
							'&2': '$l{a;b;x;y}',
						},
					],
					// solutions: [['[_&2+&3_]&1']],
					solutions: [['[_-(&1)&2_]']],
					options: ['penalty-for-factors-permutation'],
					correctionFormat: [
						{
							correct: ["L'opposé de &expression est &answer"],
						},
					],
					defaultDelay: 30,
					grade: TROISIEME,
				},
				{
					description: "Déterminer l'opposé d'une expression",
					subdescription: "opposé d'une somme algébrique",
					enounces: ["Quel est l'opposé de cette expression ?"],
					expressions: ['[_&1&3_][+_&2_]'],
					variables: [
						{
							'&1': '$er[1;9]',
							'&2': '$er[1;9]',
							'&3': '$l{a;b;x;y}',
						},
					],
					// solutions: [['[_&2+&3_]&1']],
					solutions: [['[_-(&1)&3_][+_-(&2)_]']],
					options: ['penalty-for-factors-permutation'],
					correctionFormat: [
						{
							correct: ["L'opposé de &expression est &answer"],
						},
					],
					defaultDelay: 30,
					grade: TROISIEME,
				},
				{
					description: 'Enlever les parenthèses',
					enounces: ["Réécris l'expression en enlevant les parenthèses."],
					expressions: ['[_&1&2_]+([_&3&4_]&5)', '[_&1&2_]-([_&3&4_]&5)'],
					variables: [
						{
							'&1': '$er[1;9]',
							'&2': '$l{a;b;c}',
							'&3': '$er[1;9]',
							'&4': '$l{a;b;c}\\{&2}',
							'&5': '$ers[1;9]',
						},
					],
					// solutions: [['[_&2+&3_]&1']],

					solutions: [
						['[_&1&2_][+_&3&4_]&5'],
						['[_&1&2_][+_-(&3&4)_][+_-(&5)_]'],
					],
					options: ['penalty-for-factors-permutation'],
					defaultDelay: 30,
					grade: TROISIEME,
				},
				// {
				//   description: 'Réduire avec parenthèses',
				//   enounces: ['Réduire:'],
				//   expressions: [
				//     '[_&1&2_]+([_&3&2_][+_&4_])',
				//     '[_&1&2_]+([_&4_][+_&3&2_])',
				//     '[_&1&2_]-([_&3&2_][+_&4_])',
				//     '[_&1&2_]-([_&4_][+_&3&2_])',
				//   ],
				//   variables: [
				//     {
				//       '&1': '$er[1;9]',
				//       '&2': '$l{a;b;c;x;y;z}',
				//       '&3': '$ers[1;9]',
				//       '&4': '$ers[1;9]',
				//     },
				//   ],
				//   // solutions: [['[_&2+&3_]&1']],
				//
				//   //   solutions:[
				//   //     ['[_&1&2_][+_&3&4_]&5'],
				//   //     ['[_&1&2_][+_-&3&4_][+_-&5_]'],
				//   // ],
				//   defaultDelay: 30,
				//   grade: TROISIEME,
				// },
			],
			Développement: [
				{
					description: 'Développer',
					subdescription: 'Simple - Coefficients positifs',
					enounces: ['Développer et réduire :'],
					expressions: [
						'&1(&2+&3)',
						'&1(&3+&2)',
						'(&2+&3)*&1',
						'(&3+&2)*&1',
						'&1(&2-&3)',
						'&1(&3-&2)',
						'(&2-&3)*&1',
						'(&3-&2)*&1',
					],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]\\{&1}',
							'&3': '$l{a;b;c;x;y;z}',
						},
					],
					solutions: [
						['[_&1*&2_]+&1&3'],
						['&1&3+[_&1*&2_]'],
						['[_&2*&1_]+&1&3'],
						['&1&3+[_&1*&2_]'],
						['[_&2*&1_]-&1&3'],
						['&1&3-[_&2*&1_]'],
						['[_&2*&1_]-&1&3'],
						['&1&3-[_&2*&1_]'],
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
              \\textcolor{${color1}}{&1}(&2+&3) \
              &= \\textcolor{${color1}}{&1} \\times &2 + \\textcolor{${color1}}{&1} \\times &3 \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              \\textcolor{${color1}}{&1}(&3+&2) \
              &= \\textcolor{${color1}}{&1} \\times &3 + \\textcolor{${color1}}{&1} \\times &2 \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              (&2+&3) \\times \\textcolor{${color1}}{&1} \
              &= &2 \\times \\textcolor{${color1}}{&1} + &3 \\times \\textcolor{${color1}}{&1} \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              (&3+&2) \\times \\textcolor{${color1}}{&1} \
              &= &3 \\times \\textcolor{${color1}}{&1} + &2 \\times \\textcolor{${color1}}{&1} \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              \\textcolor{${color1}}{&1}(&2-&3) \
              &= \\textcolor{${color1}}{&1} \\times &2 - \\textcolor{${color1}}{&1} \\times &3 \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              \\textcolor{${color1}}{&1}(&3-&2) \
              &= \\textcolor{${color1}}{&1} \\times &3 - \\textcolor{${color1}}{&1} \\times &2 \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              (&2-&3) \\times \\textcolor{${color1}}{&1} \
              &= &2 \\times \\textcolor{${color1}}{&1} - &3 \\times \\textcolor{${color1}}{&1} \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              (&3-&2) \\times \\textcolor{${color1}}{&1} \
              &= &3 \\times \\textcolor{${color1}}{&1} - &2 \\times \\textcolor{${color1}}{&1} \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
					],

					options: ['penalty-for-factors-permutation'],
					defaultDelay: 30,
					grade: QUATRIEME,
				},
				{
					description: 'Développer',
					subdescription: 'Coefficients positifs',
					enounces: ['Développer et réduire :'],
					expressions: [
						'&1(&2+[_&3&4_])',
						'&1([_&3&4_]+&2)',
						'(&2+[_&3&4_])*&1',
						'([_&3&4_]+&2)*&1',
						'&4(&2+[_&3&4_])',
						'&4([_&3&4_]+&2)',
						'(&2+[_&3&4_])&4',
						'([_&3&4_]+&2)&4',
						'&1(&2-[_&3&4_])',
						'&1([_&3&4_]-&2)',
						'(&2-[_&3&4_])*&1',
						'([_&3&4_]-&2)*&1',
						'&4(&2-[_&3&4_])',
						'&4([_&3&4_]-&2)',
						'(&2-[_&3&4_])&4',
						'([_&3&4_]-&2)&4',
					],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[1;9]\\{&1}',
							'&3': '$e[1;9]\\{&1;&2}',
							'&4': '$l{a;b;c;x;y;z}',
						},
					],
					// solutions: [['[_&2+&3_]&1']],

					solutions: [
						['[_&1*&2_]+[_&1*&3&4_]'],
						['[_&1*&3&4_]+[_&1*&2_]'],
						['[_&1*&2_]+[_&1*&3&4_]'],
						['[_&1*&3&4_]+[_&1*&2_]'],
						['[_&2&4_]+[_&3&4^2_]'],
						['[_&3&4^2_]+[_&2&4_]'],
						['[_&2&4_]+[_&3&4^2_]'],
						['[_&3&4^2_]+[_&2&4_]'],
						['[_&1*&2_]-[_&1*&3&4_])'],
						['[_&1*&3&4_]-[_&1*&2_]'],
						['[_&1*&2_]-[_&1*&3&4_]'],
						['[_&1*&3&4_]-[_&1*&2_]'],
						['[_&2&4_]-[_&3&4^2_]'],
						['[_&3&4^2_]-[_&2&4_]'],
						['[_&2&4_]-[_&3&4^2_]'],
						['[_&3*&4^2_]-[_&2&4_]'],
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
              \\textcolor{${color1}}{&1}(&2+[_&3&4_]) \
              &= \\textcolor{${color1}}{&1} \\times &2 + \\textcolor{${color1}}{&1} \\times [_&3&4_] \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              \\textcolor{${color1}}{&1}([_&3&4_]+&2) \
              &= \\textcolor{${color1}}{&1} \\times [_&3&4_] + \\textcolor{${color1}}{&1} \\times &2 \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              (&2+[_&3&4_]) \\times \\textcolor{${color1}}{&1} \
              &=   &2 \\times \\textcolor{${color1}}{&1} +[_&3&4_] \\times \\textcolor{${color1}}{&1} \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              ([_&3&4_]+&2) \\times \\textcolor{${color1}}{&1} \
              &=  [_&3&4_] \\times \\textcolor{${color1}}{&1} + &2 \\times \\textcolor{${color1}}{&1}  \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              \\textcolor{${color1}}{&4}(&2+[_&3&4_]) \
              &= \\textcolor{${color1}}{&4} \\times &2 + \\textcolor{${color1}}{&4} \\times [_&3&4_] \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              \\textcolor{${color1}}{&4}([_&3&4_]+&2) \
              &= \\textcolor{${color1}}{&4} \\times [_&3&4_] + \\textcolor{${color1}}{&4} \\times &2 \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              (&2+[_&3&4_]) \\times \\textcolor{${color1}}{&4} \
              &=   &2 \\times \\textcolor{${color1}}{&4} +[_&3&4_] \\times \\textcolor{${color1}}{&4} \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              ([_&3&4_]+&2) \\times \\textcolor{${color1}}{&4} \
              &=  [_&3&4_] \\times \\textcolor{${color1}}{&4} + &2 \\times \\textcolor{${color1}}{&4}  \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              \\textcolor{${color1}}{&1}(&2 - [_&3&4_]) \
              &= \\textcolor{${color1}}{&1} \\times &2 - \\textcolor{${color1}}{&1} \\times [_&3&4_] \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              \\textcolor{${color1}}{&1}([_&3&4_]-&2) \
              &= \\textcolor{${color1}}{&1} \\times [_&3&4_] - \\textcolor{${color1}}{&1} \\times &2 \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              (&2-[_&3&4_]) \\times \\textcolor{${color1}}{&1} \
              &=   &2 \\times \\textcolor{${color1}}{&1} - [_&3&4_] \\times \\textcolor{${color1}}{&1} \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              ([_&3&4_] - &2) \\times \\textcolor{${color1}}{&1} \
              &=  [_&3&4_] \\times \\textcolor{${color1}}{&1} - &2 \\times \\textcolor{${color1}}{&1}  \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              \\textcolor{${color1}}{&4}(&2 - [_&3&4_]) \
              &= \\textcolor{${color1}}{&4} \\times &2 - \\textcolor{${color1}}{&4} \\times [_&3&4_] \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              \\textcolor{${color1}}{&4}([_&3&4_] - &2) \
              &= \\textcolor{${color1}}{&4} \\times [_&3&4_] - \\textcolor{${color1}}{&4} \\times &2 \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              (&2-[_&3&4_]) \\times \\textcolor{${color1}}{&4} \
              &=   &2 \\times \\textcolor{${color1}}{&4} - [_&3&4_] \\times \\textcolor{${color1}}{&4} \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              ([_&3&4_]+&2) \\times \\textcolor{${color1}}{&4} \
              &=  [_&3&4_] \\times \\textcolor{${color1}}{&4} - &2 \\times \\textcolor{${color1}}{&4}  \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
					],
					options: ['penalty-for-factors-permutation'],
					defaultDelay: 30,
					grade: QUATRIEME,
				},
				{
					description: 'Développer',
					subdescription: 'Coefficients relatifs',
					enounces: ['Développer et réduire :'],
					expressions: [
						'&1(&2[+_&3&4_])',
						'&1([_&3&4_][+_&2_])',
						'-&1(&2[+_&3&4_])',
						'-&1([_&3&4_][+_&2_])',
						'(&2[+_&3&4_])*&1',
						'([_&3&4_][+_&2_])*&1',
						'(&2[+_&3&4_])*(-&1)',
						'([_&3&4_][+_&2_])*(-&1)',
						'&4(&2[+_&3&4_])',
						'&4([_&3&4_][+_&2_])',
						'(&2[+_&3&4_])&4',
						'([_&3&4_][+_&2_])&4',
						'-&4(&2[+_&3&4_])',
						'-&4([_&3&4_][+_&2_])',
						'(&2[+_&3&4_])*(-&4)',
						'([_&3&4_][+_&2_])*(-&4)',
					],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$er[1;9]\\{&1;-(&1)}',
							'&3': '$er[1;9]\\{&1;-(&1);&2;-(&2)}',
							'&4': '$l{a;b;c;x;y;z}',
						},
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
              \\textcolor{${color1}}{&1}(&2[+_&3&4_]) \
              &=   &2 \\times \\textcolor{${color1}}{&1} [+_&3&4_] \\times \\textcolor{${color1}}{&1} \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              \\textcolor{${color1}}{&1}([_&3&4_][+_&2_]) \
              &=    [_&3&4_] \\times \\textcolor{${color1}}{&1}  [+_&2_] \\times \\textcolor{${color1}}{&1}\\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              \\textcolor{${color1}}{-&1}(&2[+_&3&4_]) \
              &=   &2 \\times \\textcolor{${color1}}{(-&1)} [+_&3&4_] \\times \\textcolor{${color1}}{(-&1)} \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              \\textcolor{${color1}}{-&1}([_&3&4_][+_&2_]) \
              &=    [_&3&4_] \\times \\textcolor{${color1}}{(-&1)}  [+_&2_] \\times \\textcolor{${color1}}{(-&1)}\\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              (&2[+_&3&4_]) \\times \\textcolor{${color1}}{&1} \
              &=   &2 \\times \\textcolor{${color1}}{&1} [+_&3&4_] \\times \\textcolor{${color1}}{&1} \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              ([_&3&4_][+_&2_]) \\times \\textcolor{${color1}}{&1} \
              &=    [_&3&4_] \\times \\textcolor{${color1}}{&1}  [+_&2_] \\times \\textcolor{${color1}}{&1}\\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              (&2[+_&3&4_]) \\times \\textcolor{${color1}}{(-&1)} \
              &=   &2 \\times \\textcolor{${color1}}{(-&1)} [+_&3&4_] \\times \\textcolor{${color1}}{(-&1)} \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              ([_&3&4_][+_&2_]) \\times \\textcolor{${color1}}{(-&1)} \
              &=    [_&3&4_] \\times \\textcolor{${color1}}{(-&1)}  [+_&2_] \\times \\textcolor{${color1}}{(-&1)}\\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],

						[
							{
								text: `$$\\begin{align} \
              \\textcolor{${color1}}{&4}(&2[+_&3&4_]) \
              &=   &2 \\times \\textcolor{${color1}}{&4} [+_&3&4_] \\times \\textcolor{${color1}}{&4} \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              \\textcolor{${color1}}{&4}([_&3&4_][+_&2_]) \
              &=    [_&3&4_] \\times \\textcolor{${color1}}{&4}  [+_&2_] \\times \\textcolor{${color1}}{&4}\\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              (&2[+_&3&4_]) \\times \\textcolor{${color1}}{&4} \
              &=   &2 \\times \\textcolor{${color1}}{&4} [+_&3&4_] \\times \\textcolor{${color1}}{&4} \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              ([_&3&4_][+_&2_]) \\times \\textcolor{${color1}}{&4} \
              &=    [_&3&4_] \\times \\textcolor{${color1}}{&4}  [+_&2_] \\times \\textcolor{${color1}}{&4}\\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              \\textcolor{${color1}}{-&4}(&2[+_&3&4_]) \
              &=   &2 \\times \\textcolor{${color1}}{(-&4)} [+_&3&4_] \\times \\textcolor{${color1}}{(-&4)} \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              \\textcolor{${color1}}{-&4}([_&3&4_][+_&2_]) \
              &=    [_&3&4_] \\times \\textcolor{${color1}}{(-&4)}  [+_&2_] \\times \\textcolor{${color1}}{(-&4)}\\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],

						[
							{
								text: `$$\\begin{align} \
              (&2[+_&3&4_]) \\times \\textcolor{${color1}}{(-&4)} \
              &=   &2 \\times \\textcolor{${color1}}{(-&4)} [+_&3&4_] \\times \\textcolor{${color1}}{(-&4)} \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              ([_&3&4_][+_&2_]) \\times \\textcolor{${color1}}{(-&4)} \
              &=    [_&3&4_] \\times \\textcolor{${color1}}{(-&4)}  [+_&2_] \\times \\textcolor{${color1}}{(-&4)}\\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
					],

					solutions: [
						['[_&2*&1_][+_&3&4*&1_]'],
						['[_&3&4*&1_][+_&2*&1_]'],
						['[_&2*(-&1)_][+_&3&4*(-&1)_]'],
						['[_&3&4*(-&1)_][+_&2*(-&1)_]'],
						['[_&2*&1_][+_&3&4*&1_]'],
						['[_&3&4*&1_][+_&2*&1_]'],
						['[_&2*(-&1)_][+_&3&4*(-&1)_]'],
						['[_&3&4*(-&1)_][+_&2*(-&1)_]'],
						['[_&2&4_][+_&3&4^2_]'],
						['[_&3&4^2_][+_&2&4_]'],
						['[_&2&4_][+_&3&4^2_]'],
						['[_&3&4^2_][+_&2&4_]'],
						['[_&2*(-&4)_][+_-(&3)&4^2_]'],
						['[_-(&3)&4^2_][+_&2*(-&4)_]'],
						['[_&2*(-&4)_][+_-(&3)&4^2_]'],
						['[_-(&3)&4^2_][+_&2*(-&4)_]'],
					],

					defaultDelay: 30,
					options: ['penalty-for-factors-permutation'],
					grade: TROISIEME,
				},
				{
					description: 'Développer un double produit',
					subdescription: 'Coefficients positifs',
					enounces: ['Développer et réduire :'],
					expressions: [
						'(&1+[_&2&3_])(&4+[_&5&3_])',
						'([_&2&3_]+&1)(&4+[_&5&3_])',
						'(&1+[_&2&3_])([_&5&3_]+&4)',
						'([_&2&3_]+&1)([_&5&3_]+&4)',
					],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]\\{&1}',
							'&3': '$l{a;b;c;x;y;z}',
							'&4': '$e[1;9]\\{&1;&2}',
							'&5': '$e[1;9]\\{&1;&2;&3}',
						},
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
              (\\textcolor{${color1}}{&1}+\\textcolor{${color2}}{[_&2&3_]})(&4+[_&5&3_]) \
              &= \\textcolor{${color1}}{&1} \\times &4 + \\textcolor{${color1}}{&1} \\times [_&5&3_] + \\textcolor{${color2}}{[_&2&3_]} \\times &4 + \\textcolor{${color2}}{[_&2&3_]} \\times [_&5&3_] \\\\ \
              &= [_&1*&4_] +   [_&5*&1&3_] + [_&2*&4&3_] + [_&2&3*&5&3_] \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              (\\textcolor{${color2}}{[_&2&3_]} + \\textcolor{${color1}}{&1})(&4+[_&5&3_]) \
              &= \\textcolor{${color2}}{[_&2&3_]} \\times &4 + \\textcolor{${color2}}{[_&2&3_]} \\times [_&5&3_] + \\textcolor{${color1}}{&1} \\times &4 + \\textcolor{${color1}}{&1} \\times [_&5&3_]  \\\\ \
              &= [_&2*&4&3_] + [_&2&3*&5&3_] + [_&1*&4_] +   [_&5*&1&3_] \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              (\\textcolor{${color1}}{&1}+\\textcolor{${color2}}{[_&2&3_]})([_&5&3_]+&4) \
              &= \\textcolor{${color1}}{&1} \\times [_&5&3_] + \\textcolor{${color1}}{&1} \\times &4 + \\textcolor{${color2}}{[_&2&3_]} \\times [_&5&3_] + \\textcolor{${color2}}{[_&2&3_]} \\times &4 \\\\ \
              &= [_&5*&1&3_] + [_&1*&4_] + [_&2&3*&5&3_]  + [_&2*&4&3_] \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              (\\textcolor{${color2}}{[_&2&3_]} + \\textcolor{${color1}}{&1})([_&5&3_]+&4) \
              &= \\textcolor{${color2}}{[_&2&3_]} \\times [_&5&3_] + \\textcolor{${color2}}{[_&2&3_]} \\times &4 + \\textcolor{${color1}}{&1} \\times [_&5&3_] + \\textcolor{${color1}}{&1} \\times &4  \\\\ \
              &= [_&2&3*&5&3_] + [_&2*&4&3_] +  [_&5*&1&3_] + [_&1*&4_]  \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
					],

					defaultDelay: 30,
					options: ['penalty-for-factors-permutation'],
					grade: TROISIEME,
				},
				{
					description: 'Développer un double produit',
					subdescription: 'Coefficients relatifs',
					enounces: ['Développer et réduire :'],
					expressions: [
						'(&1[+_&2&3_])(&4[+_&5&3_])',
						'([_&2&3_][+_&1_])(&4[+_&5&3_])',
						'([_&2&3_][+_&1_])([_&5&3_][+_&4_])',
						'(&1[+_&2&3_])([_&5&3_][+_&4_])',
					],
					variables: [
						{
							'&1': '$er[1;9]',
							'&2': '$er[1;9]\\{&1;-(&1)}',
							'&3': '$l{a;b;c;x;y;z}',
							'&4': '$er[1;9]\\{&1;-(&1);&2;-(&2)}',
							'&5': '$er[1;9]\\{&1;-(&1);&2;-(&2);&4;-(&4)}',
						},
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
              (&1[+_&2&3_])(&4[+_&5&3_]) \
              &= [_&1*(&4)_] [+_&1*(&5)*&3_] [+_&2&3*(&4)_] [+_&2&3*(&5)*&3_] \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              ([_&2&3_][+_&1_])(&4[+_&5&3_]) \
              &= [_&2&3*(&4)_] [+_&2&3*(&5)*&3_] [+_&1*(&4)_] [+_&1*(&5)*&3_] \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              ([_&2&3_][+_&1_])([_&5&3_][+_&4_]) \
              &=  [_&2&3*(&5)*&3_] [+_&2&3*(&4)_] [+_&1*(&5)*&3_] [+_&1*(&4)_] \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              (&1[+_&2&3_])([_&5&3_][+_&4_]) \
              &=  [_&1*(&5)*&3_] [+_&1*(&4)_] [+_&2&3*(&5)*&3_] [+_&2&3*(&4)_] \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
					],

					defaultDelay: 40,
					options: ['penalty-for-factors-permutation'],
					grade: TROISIEME,
				},
			],
			Factorisation: [
				{
					description: 'Trouver un facteur commun',
					subdescription: 'Facteur commun numérique apparent ',
					enounces: ['Trouve un facteur commun.'],
					expressions: [
						'&1*&2+&1*&3',
						'&2*&1+&1*&3',
						'&1*&2+&3*&1',
						'&2*&1+&3*&1',
						'&1*&2-&1*&3',
						'&2*&1-&1*&3',
						'&1*&2-&3*&1',
						'&2*&1-&3*&1',
					],
					answerFields:['Un facteur commun est $$...$$'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]\\{&1}',
							'&3': '$e[2;9]\\{&1;cd(&2)}',
						},
					],
					correctionFormat: [
						{
							correct: ['Un facteur commun est &answer.'],
						},
					],

					solutions: [['&1']],

					defaultDelay: 30,
					grade: QUATRIEME,
				},
				{
					description: 'Factoriser',
					subdescription: 'Facteur commun apparent',
					enounces: ['Factorise.'],
					expressions: [
						'&1*&2+&1*&3',
						'&2*&1+&1*&3',
						'&1*&2+&3*&1',
						'&2*&1+&3*&1',
						'&1*&2-&1*&3',
						'&2*&1-&1*&3',
						'&1*&2-&3*&1',
						'&2*&1-&3*&1',
					],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]\\{&1}',
							'&3': '$e[2;9]\\{&1;cd(&2)}',
						},
					],
					solutions: [
						['&1(&2+&3)'],
						['&1(&2+&3)'],
						['&1(&2+&3)'],
						['&1(&2+&3)'],
						['&1(&2-&3)'],
						['&1(&2-&3)'],
						['&1(&2-&3)'],
						['&1(&2-&3)'],
					],
					
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
              \\textcolor{${color1}}{&1} \\times &2+\\textcolor{${color1}}{&1} \\times &3 \
              &= \\textcolor{${color1}}{&1} \\times (&2+&3) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              &2 \\times \\textcolor{${color1}}{&1}+\\textcolor{${color1}}{&1} \\times &3 \
              &= \\textcolor{${color1}}{&1} \\times &2 + \\textcolor{${color1}}{&1} \\times &3 \\\\ \
              &= \\textcolor{${color1}}{&1} \\times (&2+&3) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              \\textcolor{${color1}}{&1} \\times &2 +  &3 \\times \\textcolor{${color1}}{&1} \
              &= \\textcolor{${color1}}{&1} \\times &2 +  \\textcolor{${color1}}{&1} \\times &3 \\\\ \
              &= \\textcolor{${color1}}{&1} \\times (&2+&3) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              &2 \\times \\textcolor{${color1}}{&1} + &3 \\times \\textcolor{${color1}}{&1} \
              &= \\textcolor{${color1}}{&1} \\times &2 + \\textcolor{${color1}}{&1} \\times &3 \\\\ \
              &= \\textcolor{${color1}}{&1} \\times (&2+&3) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              \\textcolor{${color1}}{&1} \\times &2 - \\textcolor{${color1}}{&1} \\times &3 \
              &= \\textcolor{${color1}}{&1} \\times (&2 - &3) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              &2 \\times \\textcolor{${color1}}{&1} - \\textcolor{${color1}}{&1} \\times &3 \
              &= \\textcolor{${color1}}{&1} \\times &2 - \\textcolor{${color1}}{&1} \\times &3 \\\\ \
              &= \\textcolor{${color1}}{&1} \\times (&2 - &3) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              \\textcolor{${color1}}{&1} \\times &2 -  &3 \\times \\textcolor{${color1}}{&1} \
              &= \\textcolor{${color1}}{&1} \\times &2 -  \\textcolor{${color1}}{&1} \\times &3 \\\\ \
              &= \\textcolor{${color1}}{&1} \\times (&2 - &3) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              &2 \\times \\textcolor{${color1}}{&1} + &3 \\times \\textcolor{${color1}}{&1} \
              &= \\textcolor{${color1}}{&1} \\times &2 + \\textcolor{${color1}}{&1}  \\times &3 \\\\ \
              &= \\textcolor{${color1}}{&1} \\times (&2 - &3) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
					],

					options: ['no-penalty-for-explicit-products'],

					defaultDelay: 30,
					grade: QUATRIEME,
				},
				{
					description: 'Trouver un facteur commun',
					subdescription: 'Facteur commun apparent - littéral',
					enounces: ['Trouve un facteur commun.'],
					expressions: [
						'&1*&2+&1&3',
						'&1&3+&1*&2',
						'&1&3+&1&4',
						'&1&3-&1&4',
						'&1*&2-&1&3',
						'&1&3-&1*&2',

						'&1&3+&2&3',
						'&1&3-&2&3',
						'&4&3+&1&3',
						'&3&4+&1&3',
						'&4&3-&1&3',
						'&3&4-&1&3',
					],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]\\{cd(&1)}',
							'&3': '$l{x;y;z}',
							'&4': '$l{x;y;z}\\{&3}',
						},
					],
					answerFields:['Un facteur commun est $$...$$'],
					correctionFormat: [
						{
							correct: ['Un facteur commun est &answer'],
						},
					],
					solutions: [
						['&1'],
						['&1'],
						['&1'],
						['&1'],
						['&1'],
						['&1'],

						['&3'],
						['&3'],
						['&3'],
						['&3'],
						['&3'],
						['&3'],
					],

					defaultDelay: 30,
					grade: QUATRIEME,
				},
				{
					description: 'Factoriser',
					subdescription: 'Facteur commun apparent - littéral',
					enounces: ['Factorise.'],
					expressions: [
						'&1*&2+&1&3',
						'&1&3+&1*&2',
						'&1&3+&1&4',
						'&1&3-&1&4',
						'&1*&2-&1&3',
						'&1&3-&1*&2',

						'&1&3+&2&3',
						'&1&3-&2&3',
						'&4&3+&1&3',
						'&3&4+&1&3',
						'&4&3-&1&3',
						'&3&4-&1&3',
					],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]\\{cd(&1)}',
							'&3': '$l{x;y;z}',
							'&4': '$l{x;y;z}\\{&3}',
						},
					],
					solutions: [
						['&1(&2+&3)'],
						['&1(&3+&2)'],
						['&1(&3+&4)'],
						['&1(&3-&4)'],
						['&1(&2-&3)'],
						['&1(&3-&2)'],

						['(&1+&2)&3'],
						['(&1-&2)&3'],
						['&3(&4+&1)'],
						['&3(&4+&1)'],
						['&3(&4-&1)'],
						['&3(&4-&1)'],
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
              \\textcolor{${color1}}{&1} \\times &2 + \\textcolor{${color1}}{&1} &3 \
              &= \\textcolor{${color1}}{&1} \\times &2 + \\textcolor{${color1}}{&1}  \\times &3 \\\\ \
              &= \\textcolor{${color1}}{&1} \\times (&2+&3) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
                \\textcolor{${color1}}{&1} &3 + \\textcolor{${color1}}{&1} \\times &2 \
               &= \\textcolor{${color1}}{&1}  \\times &3 + \\textcolor{${color1}}{&1} \\times &2 \\\\ \
              &= \\textcolor{${color1}}{&1} \\times (&3+&2) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
                \\textcolor{${color1}}{&1} &3 + \\textcolor{${color1}}{&1}&4 \
               &= \\textcolor{${color1}}{&1} \\times &3 + \\textcolor{${color1}}{&1} \\times &4 \\\\ \
              &= \\textcolor{${color1}}{&1} \\times (&3+&4) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
                \\textcolor{${color1}}{&1} &3 - \\textcolor{${color1}}{&1}&4 \
              &=  \\textcolor{${color1}}{&1} \\times &3 - \\textcolor{${color1}}{&1} \\times &4 \\\\ \
              &= \\textcolor{${color1}}{&1} \\times (&3-&4) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              \\textcolor{${color1}}{&1} \\times &2 - \\textcolor{${color1}}{&1} &3 \
              &= \\textcolor{${color1}}{&1} \\times &2 - \\textcolor{${color1}}{&1} \\times &3 \\\\ \
              &= \\textcolor{${color1}}{&1} \\times (&2-&3) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
                \\textcolor{${color1}}{&1} &3 - \\textcolor{${color1}}{&1} \\times &2 \
              &= \\textcolor{${color1}}{&1} \\times &3 - \\textcolor{${color1}}{&1} \\times &2 \\\\ \
              &= \\textcolor{${color1}}{&1} \\times (&3-&2) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],

						[
							{
								text: `$$\\begin{align} \
              &1\\textcolor{${color1}}{&3} + &2\\textcolor{${color1}}{&3} \
              &= &1 \\times \\textcolor{${color1}}{&3} + &2 \\times \\textcolor{${color1}}{&3} \\\\ \
              &= (&1+&2)\\times \\textcolor{${color1}}{&3}  \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              &1\\textcolor{${color1}}{&3} - &2\\textcolor{${color1}}{&3} \
              &= &1  \\times \\textcolor{${color1}}{&3} - &2 \\times \\textcolor{${color1}}{&3} \\\\ \
              &= (&1-&2)\\times \\textcolor{${color1}}{&3}  \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              &4\\textcolor{${color1}}{&3} + &1\\textcolor{${color1}}{&3} \
              &= \\textcolor{${color1}}{&3}  \\times &4 + \\textcolor{${color1}}{&3}  \\times &1 \\\\ \
              &= \\textcolor{${color1}}{&3} \\times (&4+&1)  \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              \\textcolor{${color1}}{&3}&4 + &1\\textcolor{${color1}}{&3} \
              &= \\textcolor{${color1}}{&3} \\times &4 + \\textcolor{${color1}}{&3} \\times &1 \\\\ \
              &= \\textcolor{${color1}}{&3}  \\times (&4+&1) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              &4\\textcolor{${color1}}{&3} - &1\\textcolor{${color1}}{&3} \
              &= \\textcolor{${color1}}{&3}  \\times &4 - \\textcolor{${color1}}{&3} \\times &1 \\\\ \
              &= \\textcolor{${color1}}{&3} \\times (&4-&1)  \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              \\textcolor{${color1}}{&3}&4 - &1\\textcolor{${color1}}{&3} \
              &= \\textcolor{${color1}}{&3} \\times &4 - \\textcolor{${color1}}{&3} \\times &1 \\\\ \
              &= \\textcolor{${color1}}{&3}  \\times (&4-&1) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
					],

					defaultDelay: 30,
					grade: QUATRIEME,
				},
				{
					description: 'Trouver le plus grand facteur commun ',
					subdescription:
						'Le facteur commun est apparent dans un seul des produits',
					enounces: ['Trouve le plus grand facteur commun.'],
					expressions: [
						'&1&3+[_&1*&2_]&4',
						'&1&3-[_&1*&2_]&4',
						'[_&1*&2_]&4+&1&3',
						'[_&1*&2_]&4-&1&3',
					],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
							'&3': '$l{x;y;z}',
							'&4': '$l{x;y;z}\\{&3}',
						},
					],
					answerFields:['Le plus grand facteur commun est $$...$$'],
					correctionFormat: [
						{
							correct: ['Le plus grand facteur commun est &answer.'],
						},
					],
					correctionDetails: [
						[
							{
								text: "Dans l'expression &expression le plus grand facteur commun aux 2 produits est &solution,",
							},
							{
								text: 'car $$&1&3=&sol\\times{&3}$$ et $$[_&1*&2_]&4=&sol\\times{&2&4}$$',
							},
						],
					],
					solutions: [['&1']],
					defaultDelay: 30,
					grade: QUATRIEME,
				},
				{
					description: 'Factoriser',
					subdescription:
						'Le facteur commun est apparent dans un seul des produits',
					enounces: ['Factorise.'],
					expressions: [
						'&1&3+[_&1*&2_]&4',
						'[_&1*&2_]&4+&1&3',
						'&1&3-[_&1*&2_]&4',
						'[_&1*&2_]&4-&1&3',
					],
					variables: [
						{
							'&1': '$l{2;3;5;7}',
							'&2': '$e[2;9]\\{cd(&1)}',
							'&3': '$l{x;y;z}',
							'&4': '$l{x;y;z}\\{&3}',
						},
					],
					solutions: [
						['&1(&3+&2&4)'],
						['&1(&2&4+&3)'],
						['&1(&3-&2&4)'],
						['&1(&2&4-&3)'],
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
                &1&3+[_&1*&2_]&4 \
              &= \\textcolor{${color1}}{&1} \\times &3+\\textcolor{${color1}}{&1} \\times &2&4 \\\\ \
              &= \\textcolor{${color1}}{&1} \\times (&3 + &2&4) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
                [_&1*&2_]&4 + &1&3\
              &= \\textcolor{${color1}}{&1} \\times &2&4 + \\textcolor{${color1}}{&1} \\times &3 \\\\ \
              &= \\textcolor{${color1}}{&1} \\times (&2&4 + &3) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
                &1&3 - [_&1*&2_]&4 \
              &= \\textcolor{${color1}}{&1} \\times &3 - \\textcolor{${color1}}{&1} \\times &2&4 \\\\ \
              &= \\textcolor{${color1}}{&1} \\times (&3 - &2&4) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
                [_&1*&2_]&4 - &1&3\
              &= \\textcolor{${color1}}{&1} \\times &2&4 - \\textcolor{${color1}}{&1} \\times &3 \\\\ \
              &= \\textcolor{${color1}}{&1} \\times (&2&4 - &3) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
					],

					defaultDelay: 30,
					grade: QUATRIEME,
				},
				{
					description: 'Trouver le plus grand facteur commun',
					subdescription: "Le plus grand facteur commun n'est pas apparent",
					enounces: [
						'Quel est le plus grand facteur commun dans ces 2 produits ?',
					],
					expressions: ['[_&1*&2_]&5+[_&1*&3_]&4', '[_&1*&2_]&5-[_&1*&3_]&4'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
							'&3': '$e[2;9]\\{cd(&2)}',
							'&4': '$l{x;y;z}',
							'&5': '$l{x;y;z}\\{&4}',
							// '&6': 'pgcd(&1*&2;&1*&3)',
							// '&7': '&1*&2:&6',
							// '&8': '&1*&3:&6',
						},
					],
					answerFields:['Le plus grand facteur commun est $$...$$'],
					correctionFormat: [
						{
							correct: ['Le plus grand facteur commun est &answer.'],
						},
					],
					correctionDetails: [
						[
							{
								text: "Dans l'expression &expression le plus grand facteur commun aux 2 produits est &solution,",
							},
							{
								text: 'car $$[_&1*&2_]&5=&sol\\times{&2&5}$$ et $$[_&1*&3_]&4=&sol\\times{&3&4}$$',
							},
						],
					],
					solutions: [['&1']],

					defaultDelay: 30,
					grade: QUATRIEME,
				},
				{
					description: 'Factoriser',
					subdescription: "Le plus grand facteur commun n'est pas apparent",
					enounces: ['Factorise le plus possible :'],
					expressions: [
						'[_&1*&2_]&5+[_&1*&3_]&4',
						'[_&1*&2_]&5-[_&1*&3_]&4',
						'[_&1*&2_]&5+[_&1*&3_]',
						'[_&1*&2_]&5-[_&1*&3_]',
					],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
							'&3': '$e[2;9]\\{cd(&2)}',
							'&4': '$l{x;y;z}',
							'&5': '$l{x;y;z}\\{&4}',
							// '&6': 'pgcd(&1*&2;&1*&3)',
							// '&7': '&1*&2:&6',
							// '&8': '&1*&3:&6',
						},
					],
					solutions: [
						['&1(&2&5+&3&4)'],
						['&1(&2&5-&3&4)'],
						['&1(&2&5+&3)'],
						['&1(&2&5-&3)'],
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
                [_&1*&2_]&5+[_&1*&3_]&4 \
              &= \\textcolor{${color1}}{&1} \\times &2&5 + \\textcolor{${color1}}{&1} \\times &3&4 \\\\ \
              &= \\textcolor{${color1}}{&1} \\times (&2&5 + &3&4) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
                [_&1*&2_]&5 - [_&1*&3_]&4 \
              &= \\textcolor{${color1}}{&1} \\times &2&5 - \\textcolor{${color1}}{&1} \\times &3&4 \\\\ \
              &= \\textcolor{${color1}}{&1} \\times (&2&5 - &3&4) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
                [_&1*&2_]&5+[_&1*&3_] \
              &= \\textcolor{${color1}}{&1} \\times &2&5 + \\textcolor{${color1}}{&1} \\times &3 \\\\ \
              &= \\textcolor{${color1}}{&1} \\times (&2&5 + &3) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
                [_&1*&2_]&5-[_&1*&3_] \
              &= \\textcolor{${color1}}{&1} \\times &2&5 - \\textcolor{${color1}}{&1} \\times &3 \\\\ \
              &= \\textcolor{${color1}}{&1} \\times (&2&5 - &3) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
					],

					defaultDelay: 30,
					grade: QUATRIEME,
				},
				{
					description: 'Factoriser',
					subdescription: 'Cas particulier',
					enounces: ['Factoriser le plus possible:'],
					expressions: [
						'&1+[_&1*&2_]&3',
						'[_&1*&2_]&3+&1',
						'&1-[_&1*&2_]&3',
						'[_&1*&2_]&3-&1',
					],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
							'&3': '$l{x;y;z}',
						},
					],
					solutions: [
						['&1(1+&2&3)'],
						['&1(&2&3+1)'],
						['&1(1-&2&3)'],
						['&1(&2&3-1)'],
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
                &1+[_&1*&2_]&3 \
              &= \\textcolor{${color1}}{&1} \\times 1 + \\textcolor{${color1}}{&1} \\times &2&3 \\\\ \
              &= \\textcolor{${color1}}{&1} \\times (1 + &2&3) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
                [_&1*&2_]&3 + &1 \
              &= \\textcolor{${color1}}{&1} \\times &2&3 + \\textcolor{${color1}}{&1} \\times 1 \\\\ \
              &= \\textcolor{${color1}}{&1} \\times (&2&3 + 1) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
                &1 - [_&1*&2_]&3 \
              &= \\textcolor{${color1}}{&1} \\times 1 - \\textcolor{${color1}}{&1} \\times &2&3 \\\\ \
              &= \\textcolor{${color1}}{&1} \\times (1 - &2&3) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
                [_&1*&2_]&3 - &1 \
              &= \\textcolor{${color1}}{&1} \\times &2&3 - \\textcolor{${color1}}{&1} \\times 1 \\\\ \
              &= \\textcolor{${color1}}{&1} \\times (&2&3 - 1) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
					],

					defaultDelay: 30,
					grade: QUATRIEME,
				},
				{
					description: 'Factoriser',
					subdescription: 'Cas général - avec des carrés',
					enounces: ['Factoriser le plus possible.'],
					expressions: [
						'[_&1*&2*&4^2_]+[_&1*&3*&4_]',
						'[_&1*&2*&4_]+[_&1*&3*&4^2_]',
						'[_&1*&2*&4^2_]-[_&1*&3*&4_]',
						'[_&1*&2*&4_]-[_&1*&3*&4^2_]',
						'[_&1*&2*&4^2_]+[_&1*&3_]',
						'[_&1*&2_]+[_&1*&3*&4^2_]',
						'[_&1*&2*&4^2_]-[_&1*&3_]',
						'[_&1*&2_]-[_&1*&3*&4^2_]',
					],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[1;9]',
							'&3': '$e[1;9]\\{&2}',
							'&4': '$l{x;y;z}',
							'&5': 'pgcd(&1*&3;&1*&2)',
							'&6': '&1*&2:&5',
							'&7': '&1*&3:&5',
						},
					],
					solutions: [
						['[_&5&4_]([_&6*&4_]+[_&7_])'],
						['[_&5&4_]([_&6_]+[_&7*&4_])'],
						['[_&5&4_]([_&6*&4_]-[_&7_])'],
						['[_&5&4_]([_&6_]-[_&7*&4_])'],

						['[_&5_]([_&6*&4^2_]+[_&7_])'],
						['[_&5_]([_&6_]+[_&7*&4^2_])'],
						['[_&5_]([_&6*&4^2_]-[_&7_])'],
						['[_&5_]([_&6_]-[_&7*&4^2_])'],
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
                [_&1*&2*&4^2_]+[_&1*&3*&4_] \
              &= \\textcolor{${color1}}{[_&5_]&4} \\times [_&6*&4_] + \\textcolor{${color1}}{[_&5_]&4} \\times [_&7_] \\\\ \
              &= \\textcolor{${color1}}{[_&5_]&4} \\times ([_&6*&4_] + [_&7_]) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
                [_&1*&2*&4_]+[_&1*&3*&4^2_] \
              &= \\textcolor{${color1}}{[_&5_]&4} \\times [_&6_] + \\textcolor{${color1}}{[_&5_]&4} \\times [_&7*&4_] \\\\ \
              &= \\textcolor{${color1}}{[_&5_]&4} \\times ([_&6_] + [_&7*&4_]) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
                [_&1*&2*&4^2_] - [_&1*&3*&4_] \
              &= \\textcolor{${color1}}{[_&5_]&4} \\times [_&6*&4_] - \\textcolor{${color1}}{[_&5_]&4} \\times [_&7_] \\\\ \
              &= \\textcolor{${color1}}{[_&5_]&4} \\times ([_&6*&4_] - [_&7_]) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
                [_&1*&2*&4_] - [_&1*&3*&4^2_] \
              &= \\textcolor{${color1}}{[_&5_]&4} \\times [_&6_] - \\textcolor{${color1}}{[_&5_]&4} \\times [_&7*&4_] \\\\ \
              &= \\textcolor{${color1}}{[_&5_]&4} \\times ([_&6_] - [_&7*&4_]) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
                [_&1*&2*&4^2_]+[_&1*&3_] \
              &= \\textcolor{${color1}}{[_&5_]} \\times [_&6*&4^2_] + \\textcolor{${color1}}{[_&5_]} \\times [_&7_] \\\\ \
              &= \\textcolor{${color1}}{[_&5_]} \\times ([_&6*&4^2_] + [_&7_]) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
                [_&1*&2_]+[_&1*&3*&4^2_] \
              &= \\textcolor{${color1}}{[_&5_]} \\times [_&6_] + \\textcolor{${color1}}{[_&5_]} \\times [_&7*&4^2_] \\\\ \
              &= \\textcolor{${color1}}{[_&5_]} \\times ([_&6_] + [_&7*&4^2_]) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
                [_&1*&2*&4^2_] - [_&1*&3_] \
              &= \\textcolor{${color1}}{[_&5_]} \\times [_&6*&4^2_] - \\textcolor{${color1}}{[_&5_]} \\times [_&7_] \\\\ \
              &= \\textcolor{${color1}}{[_&5_]} \\times ([_&6*&4^2_] - [_&7_]) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
                [_&1*&2_] - [_&1*&3*&4^2_] \
              &= \\textcolor{${color1}}{[_&5_]} \\times [_&6_] - \\textcolor{${color1}}{[_&5_]} \\times [_&7*&4^2_] \\\\ \
              &= \\textcolor{${color1}}{[_&5_]} \\times ([_&6_] - [_&7*&4^2_]) \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
					],

					defaultDelay: 30,
					grade: QUATRIEME,
				},
			],
			'Identités remarquables': [
				{
					description: 'Développer $$(a+b)(a-b)$$',
					subdescription: 'Coefficients positifs',
					enounces: ['Développer et réduire :'],
					expressions: [
						'(&1+&2)(&1-&2)',
						'(&1-&2)(&1+&2)',
						'(&2+&1)(&2-&1)',
						'(&2-&1)(&2+&1)',
					],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$l{a;b;c;x;y;z}',
						},
					],
					solutions: [
						['[_&1^2_]-&2^2'],
						['[_&1^2_]-&2^2'],
						['&2^2-[_&1^2_]'],
						['&2^2-[_&1^2_]'],
					],

					defaultDelay: 30,
					options: ['penalty-for-factors-permutation'],
					grade: TROISIEME,
				},
				{
					description: 'Développer $$(a+b)(a-b)$$',
					subdescription: 'Coefficients positifs',
					enounces: ['Développer et réduire :'],
					expressions: [
						'(&1+[_&2&3_])(&1-[_&2&3_])',
						'(&1-[_&2&3_])(&1+[_&2&3_])',
						'([_&2&3_]+&1)([_&2&3_]-&1)',
						'([_&2&3_]-&1)([_&2&3_]+&1)',
					],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]\\{&1}',
							'&3': '$l{a;b;c;x;y;z}',
						},
					],
					solutions: [
						['[_&1^2_]-[_(&2&3)^2_]'],
						['[_&1^2_]-[_(&2&3)^2_]'],
						['[_(&2&3)^2_]-[_&1^2_]'],
						['[_(&2&3)^2_]-[_&1^2_]'],
					],

					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
                (\\textcolor{${color1}}{&1}+\\textcolor{${color2}}{[_&2&3_]})(\\textcolor{${color1}}{&1}-\\textcolor{${color2}}{[_&2&3_]}) \
              &= \\textcolor{${color1}}{&1}^2 -(\\textcolor{${color2}}{[_&2&3_]})^2 \\\\ \
              &= [_&1^2_] -&2^2 \\times &3^2 \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
                (\\textcolor{${color1}}{&1}-\\textcolor{${color2}}{[_&2&3_]})(\\textcolor{${color1}}{&1}+\\textcolor{${color2}}{[_&2&3_]}) \
              &= \\textcolor{${color1}}{&1}^2 -(\\textcolor{${color2}}{[_&2&3_]})^2 \\\\ \
              &= [_&1^2_] -&2^2 \\times &3^2 \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
                (\\textcolor{${color1}}{[_&2&3_]} + \\textcolor{${color2}}{&1})(\\textcolor{${color1}}{[_&2&3_]} - \\textcolor{${color2}}{&1}) \
              &=  (\\textcolor{${color1}}{[_&2&3_]})^2 - \\textcolor{${color2}}{&1}^2 \\\\ \
              &= &2^2 \\times &3^2 - [_&1^2_] \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
                (\\textcolor{${color1}}{[_&2&3_]} - \\textcolor{${color2}}{&1})(\\textcolor{${color1}}{[_&2&3_]} - \\textcolor{${color2}}{&1}) \
              &= (\\textcolor{${color1}}{[_&2&3_]})^2 - \\textcolor{${color2}}{&1}^2 \\\\ \
              &=  &2^2 \\times &3^2 - [_&1^2_] \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
					],
					defaultDelay: 30,
					options: ['penalty-for-factors-permutation'],
					grade: TROISIEME,
				},
				{
					description: 'Factoriser $$a^2-b^2$$',
					enounces: ['Factoriser :'],
					expressions: ['[_&1^2_]-&3^2', '&3^2-[_&1^2_]'],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]',
							'&3': '$l{x;y;z}',
						},
					],
					solutions: [['(&1+&3)(&1-&3)'], ['(&3+&1)(&3-&1)']],

					defaultDelay: 30,
					grade: TROISIEME,
				},
				{
					description: 'Factoriser $$a^2-b^2$$',
					enounces: ['Factoriser :'],
					expressions: ['[_&1^2_]-[_(&2&3)^2_]', '[_(&2&3)^2_]-[_&1^2_]'],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$e[1;9]\\{&1}',
							'&3': '$l{x;y;z}',
						},
					],
					solutions: [
						['(&1+[_&2&3_])(&1-[_&2&3_])'],
						['([_&2&3_]+&1)([_&2&3_]-&1)'],
					],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} \
                [_&1^2_]-[_(&2&3)^2_] \
              &=  &1^2-([_&2&3_])^2 \\\\ \
              &= &sol  \
              \\end{align}$$',
							},
						],
						[
							{
								text: '$$\\begin{align} \
                [_(&2&3)^2_] - [_&1^2_] \
              &=  ([_&2&3_])^2 - &1^2 \\\\ \
              &= &sol  \
              \\end{align}$$',
							},
						],
					],

					defaultDelay: 30,
					grade: TROISIEME,
				},
				{
					description: 'Développer $$(a+b)^2$$',

					enounces: ['Développer et réduire :'],
					expressions: ['(&1+&2)^2', '(&2+&1)^2'],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$l{a;b;c;x;y;z}',
						},
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
                (\\textcolor{${color1}}{&1}+\\textcolor{${color2}}{&2})^2 \
              &=  \\textcolor{${color1}}{&1}^2 + 2 \\times \\textcolor{${color1}}{&1} \\times \\textcolor{${color2}}{&2} + \\textcolor{${color2}}{&2}^2 \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
                (\\textcolor{${color1}}{&2}+\\textcolor{${color2}}{&1})^2 \
              &=  \\textcolor{${color1}}{&2}^2 + 2 \\times \\textcolor{${color1}}{&2} \\times \\textcolor{${color2}}{&1} + \\textcolor{${color2}}{&1}^2 \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
					],
					solutions: [
						['[_&1^2_]+[_2*&1*&2_]+&2^2'],
						['&2^2+[_2*&1*&2_]+[_&1^2_]'],
					],

					defaultDelay: 30,
					options: ['penalty-for-factors-permutation'],
					grade: SECONDE,
				},
				{
					description: 'Développer $$(a-b)^2$$',
					enounces: ['Développer et réduire :'],
					expressions: ['(&1-&2)^2', '(&2-&1)^2'],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$l{a;b;c;x;y;z}',
						},
					],
					solutions: [
						['[_&1^2_]-[_2*&1*&2_]+&2^2'],
						['&2^2-[_2*&1*&2_]+[_&1^2_]'],
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
                (\\textcolor{${color1}}{&1}-\\textcolor{${color2}}{&2})^2 \
              &=  \\textcolor{${color1}}{&1}^2 - 2 \\times \\textcolor{${color1}}{&1} \\times \\textcolor{${color2}}{&2} + \\textcolor{${color2}}{&2}^2 \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
                (\\textcolor{${color1}}{&2} - \\textcolor{${color2}}{&1})^2 \
              &=  \\textcolor{${color1}}{&2}^2 - 2 \\times \\textcolor{${color1}}{&2} \\times \\textcolor{${color2}}{&1} + \\textcolor{${color2}}{&1}^2 \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
					],

					defaultDelay: 30,
					options: ['penalty-for-factors-permutation'],
					grade: SECONDE,
				},
				{
					description: 'Développer $$(a+b)^2$$',

					enounces: ['Développer et réduire :'],
					expressions: ['(&1+[_&2&3_])^2', '([_&2&3_]+&1)^2'],
					variables: [
						{
							'&1': '$e[1;7]',
							'&2': '$e[1;7]\\{&1}',
							'&3': '$l{a;b;c;x;y;z}',
						},
					],
					solutions: [
						['[_&1^2_]+[_2*&1*&2&3_]+[_(&2&3)^2_]'],
						['[_(&2&3)^2_]+[_2*&1*&2&3_]+[_&1^2_]'],
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
                (\\textcolor{${color1}}{&1} + \\textcolor{${color2}}{[_&2&3_]})^2 \
              &=  \\textcolor{${color1}}{&1}^2 + 2 \\times \\textcolor{${color1}}{&1} \\times \\textcolor{${color2}}{[_&2&3_]} + (\\textcolor{${color2}}{[_&2&3_]})^2 \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
                (\\textcolor{${color1}}{[_&2&3_]}+\\textcolor{${color2}}{&1})^2 \
              &=  (\\textcolor{${color1}}{[_&2&3_]})^2 + 2 \\times \\textcolor{${color1}}{[_&2&3_]} \\times \\textcolor{${color2}}{&1} + \\textcolor{${color2}}{&1}^2 \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
					],

					defaultDelay: 30,
					options: ['penalty-for-factors-permutation'],
					grade: SECONDE,
				},
				{
					description: 'Développer $$(a-b)^2$$',

					enounces: ['Développer et réduire :'],
					expressions: ['(&1-[_&2&3_])^2', '([_&2&3_]-&1)^2'],
					variables: [
						{
							'&1': '$e[1;7]',
							'&2': '$e[1;7]\\{&1}',
							'&3': '$l{a;b;c;x;y;z}',
						},
					],
					solutions: [
						['[_&1^2_]-[_2*&1*&2&3_]+[_(&2&3)^2_]'],
						['[_(&2&3)^2_]-[_2*&1*&2&3_]+[_&1^2_]'],
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
                (\\textcolor{${color1}}{&1} - \\textcolor{${color2}}{[_&2&3_]})^2 \
              &=  \\textcolor{${color1}}{&1}^2 - 2 \\times \\textcolor{${color1}}{&1} \\times \\textcolor{${color2}}{[_&2&3_]} + (\\textcolor{${color2}}{[_&2&3_]})^2 \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
                (\\textcolor{${color1}}{[_&2&3_]} - \\textcolor{${color2}}{&1})^2 \
              &=  (\\textcolor{${color1}}{[_&2&3_]})^2 - 2 \\times \\textcolor{${color1}}{[_&2&3_]} \\times \\textcolor{${color2}}{&1} + \\textcolor{${color2}}{&1}^2 \\\\ \
              &= &sol  \
              \\end{align}$$`,
							},
						],
					],

					defaultDelay: 30,
					options: ['penalty-for-factors-permutation'],
					grade: SECONDE,
				},

				{
					description: 'Factoriser une expression du second degré',
					enounces: ['Factoriser :'],
					expressions: ['&3^2-[_2*&1_]&3+[_&1^2_]', '&3^2+[_2*&1_]&3+[_&1^2_]'],
					variables: [
						{
							'&1': '$e[1;9]',
							'&3': '$l{x;y;z}',
						},
					],
					solutions: [['(&3-&1)^2'], ['(&3+&1)^2']],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} \
                &3^2 - [_2*&1_]&3 + [_&1^2_] \
              &= &3^2 - 2 \\times &3 \\times &1 + &1^2 \\\\ \
              &= &sol  \
              \\end{align}$$',
							},
						],
						[
							{
								text: '$$\\begin{align} \
                &3^2 + [_2*&1_]&3 + [_&1^2_] \
              &= &3^2 + 2 \\times &3 \\times &1 + &1^2 \\\\ \
              &= &sol  \
              \\end{align}$$',
							},
						],
					],

					defaultDelay: 30,
					grade: SECONDE,
				},
			],
		},
		Equations: {
			'Dans $$\\N$$': [
				{
					description: 'Addition $$a+x=b$$',
					enounces: ['Résouds cette équation.'],
					expressions: ['x+&1=[_&1+&2_]', '&1+x=[_&1+&2_]'],
					answerFields: ['$$x=...$$'],
					variables: [
						{
							'&1': '$e[5;9]',
							'&2': '$e[2;9]',
						},
					],
					solutions: [['&2']],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} \
                x+&1=[_&1+&2_]  \
              & \\quad \\lrArr \\quad x=[_&1+&2_]-&1 \\\\ \
              & \\quad \\lrArr \\quad  x= &sol  \
              \\end{align}$$',
							},
						],
					],
					type: 'equation',
					defaultDelay: 30,
					grade: CINQUIEME,
				},
				{
					description: 'Soustraction  $$x-a=b$$',
					enounces: ['Résouds cette équation.'],
					expressions: ['x-&1=&2'],
					answerFields: ['$$x=...$$'],
					variables: [
						{
							'&1': '$e[5;9]',
							'&2': '$e[2;9]',
						},
					],
					solutions: [['[_&1+&2_]']],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} \
                x-&1=&2  \
              & \\quad \\lrArr \\quad x=&1+&2\\\\ \
              & \\quad \\lrArr \\quad  x= &sol  \
              \\end{align}$$',
							},
						],
					],
					type: 'equation',
					defaultDelay: 30,
					grade: CINQUIEME,
				},
				{
					description: 'Soustraction (2)  $$a-x=b$$',
					enounces: ['Résouds cette équation.'],
					expressions: ['[_&1+&2_]-x=&1'],
					answerFields: ['$$x=...$$'],
					variables: [
						{
							'&1': '$e[5;9]',
							'&2': '$e[2;9]',
						},
					],
					solutions: [['&2']],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} \
                [_&1+&2_]-x=&1  \
              & \\quad \\lrArr \\quad x=[_&1+&2_]-&1\\\\ \
              & \\quad \\lrArr \\quad  x= &sol  \
              \\end{align}$$',
							},
						],
					],
					type: 'equation',
					defaultDelay: 30,
					grade: CINQUIEME,
				},
				{
					description: 'Multiplication $$a \\times x=b$$',
					enounces: ['Résouds cette équation.'],
					expressions: ['&1x=[_&1*&2_]', 'x*&1=[_&1*&2_]'],
					answerFields: ['$$x=...$$'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
						},
					],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} \
                &1x=[_&1*&2_]  \
              & \\quad \\lrArr \\quad x=\\frac{[_&1*&2_]}{&1}\\\\ \
              & \\quad \\lrArr \\quad  x= &sol  \
              \\end{align}$$',
							},
						],
						[
							{
								text: '$$\\begin{align} \
                x \\times &1=[_&1*&2_]  \
              & \\quad \\lrArr \\quad x=\\frac{[_&1*&2_]}{&1}\\\\ \
              & \\quad \\lrArr \\quad  x= &sol  \
              \\end{align}$$',
							},
						],
					],
					solutions: [['&2']],

					type: 'equation',
					defaultDelay: 30,
					grade: CINQUIEME,
				},
				{
					description: 'Division $$x \\div a=b$$',
					enounces: ['Résouds cette équation.'],
					expressions: ['x/&1=&2'],
					answerFields: ['$$x=...$$'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
						},
					],
					solutions: [['[_&1*&2_]']],
					type: 'equation',
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} \
                \\frac{x}{&1}=&2  \
              & \\quad \\lrArr \\quad x=&2 \\times &1 \\\\ \
              & \\quad \\lrArr \\quad  x= &sol  \
              \\end{align}$$',
							},
						],
					],
					defaultDelay: 30,
					grade: CINQUIEME,
				},
				{
					description: 'Division (2) $$a \\div = b$$',
					enounces: ['Résouds cette équation.'],
					expressions: ['[_&1*&2_]/x=&2'],
					answerFields: ['$$x=...$$'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
						},
					],
					solutions: [['&1']],
					correctionDetails: [
						[
							{
								text: 'Pour $$x \\neq 0$$, ',
							},
							{
								text: '$$\\begin{align} \
                \\frac{[_&1*&2_]}{x}=&2  \
              & \\quad \\lrArr \\quad [_&1*&2_] = &2 \\times x \\\\ \
              & \\quad \\lrArr \\quad x= \\frac {[_&1*&2_]}{&2} \\\\ \
              & \\quad \\lrArr \\quad  x= &sol  \
              \\end{align}$$',
							},
						],
					],
					type: 'equation',
					defaultDelay: 30,
					grade: CINQUIEME,
				},
			],
			'Dans $$\\Z$$': [
				{
					description: 'Opposé $$-x=a$$',
					enounces: ['Résouds cette équation.'],
					expressions: ['-x=&1'],
					answerFields: ['$$x=...$$'],
					variables: [
						{
							'&1': '$er[1;9]',
						},
					],
					solutions: [['[_-(&1)_]']],
					correctionDetails: [
						[
							{
								text: 'Pour $$x \\neq 0$$, ',
							},
							{
								text: '$$\\begin{align} \
                -x=&1 \\quad \\lrArr \\quad  x= &sol  \
              \\end{align}$$',
							},
						],
					],
					type: 'equation',
					defaultDelay: 30,
					grade: CINQUIEME,
				},
				{
					description: 'Addition',
					enounces: ['Résouds cette équation.'],
					expressions: [
						'x+&1=[_&1+(&2)_]',
						'&1+x=[_&1+(&2)_]',
						'x+(&1)=[_&1+(&2)_]',
					],
					answerFields: ['$$x=...$$'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$er[2;9]',
						},
						{
							'&1': '$er[2;9]',
							'&2': '$er[2;9]',
						},
						{
							'&1': '-$e[2;9]',
							'&2': '$er[2;9]',
						},
					],
					solutions: [['&2']],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} \
                x+&1=[_&1+(&2)_]  \
              & \\quad \\lrArr \\quad x=[_&1+(&2)_]-&1 \\\\ \
              & \\quad \\lrArr \\quad  x= &sol  \
              \\end{align}$$',
							},
						],
						[
							{
								text: '$$\\begin{align} \
                &1+x=[_&1+(&2)_]  \
              & \\quad \\lrArr \\quad x=[_&1+(&2)_]-&1 \\\\ \
              & \\quad \\lrArr \\quad  x= &sol  \
              \\end{align}$$',
							},
						],
						[
							{
								text: '$$\\begin{align} \
                x+(&1)=[_&1+(&2)_]  \
              & \\quad \\lrArr \\quad x=[_&1+(&2)_]-(&1) \\\\ \
              & \\quad \\lrArr \\quad x=[_&1+(&2)_] + [_-(&1)_] \\\\ \
              & \\quad \\lrArr \\quad  x= &sol  \
              \\end{align}$$',
							},
						],
					],
					type: 'equation',
					defaultDelay: 30,
					grade: CINQUIEME,
				},
				{
					description: 'Soustraction $$x-a=b$$',
					enounces: ['Résouds cette équation.'],
					expressions: ['x-&1=&2'],
					answerFields: ['$$x=...$$'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '-$e[2;9]',
						},
					],
					solutions: [['[_&1+(&2)_]']],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} \
                x-&1=&2  \
              & \\quad \\lrArr \\quad x=&2+&1 \\\\ \
              & \\quad \\lrArr \\quad  x= &sol  \
              \\end{align}$$',
							},
						],
					],
					type: 'equation',
					defaultDelay: 30,
					grade: CINQUIEME,
				},
				{
					description: 'Soustraction (2) $$a-x=b$$',
					enounces: ['Résouds cette équation.'],
					expressions: ['[_&1+(&2)_]-x=&1', '[_&1+(&2)_]-x=&1'],
					answerFields: ['$$x=...$$'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$er[2;9]',
						},
						{
							'&1': '-$e[2;9]',
							'&2': '$er[2;9]',
						},
					],
					solutions: [['&2']],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} \
                [_&1+(&2)_]-x=&1  \
              & \\quad \\lrArr \\quad x=[_&2+(&1)_]-&1 \\\\ \
              & \\quad \\lrArr \\quad  x= &sol  \
              \\end{align}$$',
							},
						],
						[
							{
								text: '$$\\begin{align} \
                [_&1+(&2)_]-x=&1  \
              & \\quad \\lrArr \\quad x=[_&2+(&1)_]-(&1) \\\\ \
              & \\quad \\lrArr \\quad x=[_&2+(&1)_]+[_-(&1)_] \\\\ \
              & \\quad \\lrArr \\quad  x= &sol  \
              \\end{align}$$',
							},
						],
					],
					type: 'equation',
					defaultDelay: 30,
					grade: CINQUIEME,
				},
				{
					description: 'Multiplication',
					enounces: ['Résouds cette équation.'],
					expressions: [
						'&1x=[_&1*(&2)_]',
						'&1x=[_&1*(&2)_]',
						'x*&1=[_&1*(&2)_]',
						'x*(&1)=[_&1*(&2)_]',
					],
					answerFields: ['$$x=...$$'],
					variables: [
						{
							'&1': '$er[2;9]',
							'&2': '$er[2;9]',
						},
						{
							'&1': '$er[2;9]',
							'&2': '$er[2;9]',
						},

						{
							'&1': '$e[2;9]',
							'&2': '$er[2;9]',
						},
						{
							'&1': '-$e[2;9]',
							'&2': '$er[2;9]',
						},
					],
					solutions: [['&2']],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} \
                &1x=[_&1*(&2)_]  \
              & \\quad \\lrArr \\quad x=\\frac{[_&2*(&1)_]}{&1} \\\\ \
              & \\quad \\lrArr \\quad  x= &sol  \
              \\end{align}$$',
							},
						],
						[
							{
								text: '$$\\begin{align} \
                &1x=[_&1*(&2)_]  \
              & \\quad \\lrArr \\quad x=\\frac{[_&2*(&1)_]}{&1} \\\\ \
              & \\quad \\lrArr \\quad  x= &sol  \
              \\end{align}$$',
							},
						],
						[
							{
								text: '$$\\begin{align} \
                x \\times &1=[_&1*(&2)_]  \
              & \\quad \\lrArr \\quad x=\\frac{[_&2*(&1)_]}{&1} \\\\ \
              & \\quad \\lrArr \\quad  x= &sol  \
              \\end{align}$$',
							},
						],
						[
							{
								text: '$$\\begin{align} \
                x \\times (&1)=[_&1*(&2)_]  \
              & \\quad \\lrArr \\quad x=\\frac{[_&2*(&1)_]}{&1} \\\\ \
              & \\quad \\lrArr \\quad  x= &sol  \
              \\end{align}$$',
							},
						],
					],
					type: 'equation',
					defaultDelay: 30,
					grade: QUATRIEME,
				},
				{
					description: 'Division',
					enounces: ['Résouds cette équation.'],
					expressions: ['x/{&1}=&2'],
					answerFields: ['$$x=...$$'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$er[2;9]',
						},
						{
							'&1': '-$e[2;9]',
							'&2': '$er[2;9]',
						},
					],
					solutions: [['[_&1*(&2)_]']],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} \
                \\frac{x}{&1}=&2  \
              & \\quad \\lrArr \\quad x=&2 \\times &1 \\\\ \
              & \\quad \\lrArr \\quad  x= &sol  \
              \\end{align}$$',
							},
						],
						[
							{
								text: '$$\\begin{align} \
                \\frac{x}{&1}=&2  \
              & \\quad \\lrArr \\quad x=&2 \\times (&1) \\\\ \
              & \\quad \\lrArr \\quad  x= &sol  \
              \\end{align}$$',
							},
						],
					],
					type: 'equation',
					defaultDelay: 30,
					grade: QUATRIEME,
				},
				{
					description: 'Division (2) $$a/x=b',
					enounces: ['Résouds cette équation.'],
					expressions: ['{[_&1*(&2)_]}/x=&2'],
					answerFields: ['$$x=...$$'],
					variables: [
						{
							'&1': '$er[2;9]',
							'&2': '$er[2;9]',
						},
					],
					solutions: [['&1']],
					correctionFormat: [
						{
							correct: ["La solution de l'équation est &answer."],
							answer: 'La solution est &answer.',
						},
					],
					correctionDetails: [
						[
							{
								text: 'Pour $$x \\neq 0$$, ',
							},
							{
								text: '$$\\begin{align} \
                \\frac{[_&1*(&2)_]}{x}=&2  \
              & \\quad \\lrArr \\quad [_&1*(&2)_] = &2 \\times x \\\\ \
              & \\quad \\lrArr \\quad x= \\frac {[_&1*(&2)_]}{&2} \\\\ \
              & \\quad \\lrArr \\quad  x= &sol  \
              \\end{align}$$',
							},
						],
					],
					type: 'equation',
					defaultDelay: 30,
					grade: QUATRIEME,
				},
			],
			'Dans $$\\Q$$': [
				{
					description: 'Addition',
					enounces: ['Résouds cette équation.'],
					expressions: ['x+&2/&1=[_&2+&3_]/&1', '&2/&1+x=[_&3+&2_]/&1'],
					answerFields: ['$$x=...$$'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[5;9]\\{&1}',
							'&3': '$e[2;9]\\{&1}',
						},
					],
					solutions: [['[_&3/&1_]']],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} \
                x+\\frac{&2}{&1}=\\frac{[_&2+&3_]}{&1} \
              & \\quad \\lrArr \\quad x=\\frac{[_&2+&3_]}{&1}-\\frac{&2}{&1} \\\\ \
              @@ pgcd(&3;&1) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@ \
              @@ pgcd(&3;&1) != 1 ?? & \\quad \\lrArr \\quad  x= \\frac{&3}{&1} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@ \
              \\end{align}$$',
							},
						],
						[
							{
								text: '$$\\begin{align} \
                \\frac{&2}{&1} + x = \\frac{[_&2+&3_]}{&1} \
              & \\quad \\lrArr \\quad x=\\frac{[_&2+&3_]}{&1}-\\frac{&2}{&1} \\\\ \
              @@ pgcd(&3;&1) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@ \
              @@ pgcd(&3;&1) != 1 ?? & \\quad \\lrArr \\quad  x= \\frac{&3}{&1} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@ \
              \\end{align}$$',
							},
						],
					],
					type: 'equation',
					defaultDelay: 30,
					grade: CINQUIEME,
				},
				{
					description: 'Soustraction',
					enounces: ['Résouds cette équation.'],
					expressions: ['x-&2/&1=&3/&1'],
					answerFields: ['$$x=...$$'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[5;9]\\{&1}',
							'&3': '$e[2;9]\\{&1}',
						},
					],
					solutions: [['[_(&2+&3)/&1_]']],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} \
                x - \\frac{&2}{&1}=\\frac{&3}{&1} \
              & \\quad \\lrArr \\quad x=\\frac{&3}{&1}+\\frac{&2}{&1} \\\\ \
              @@ pgcd(&3+&2;&1) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@ \
              @@ pgcd(&3+&2;&1) != 1 ?? & \\quad \\lrArr \\quad  x= \\frac{[_&3+&2_]}{&1} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@ \
              \\end{align}$$',
							},
						],
					],
					type: 'equation',
					defaultDelay: 30,
					grade: CINQUIEME,
				},
				{
					description: 'Soustraction (2)',
					enounces: ['Résouds cette équation.'],
					expressions: ['[_&2+&3_]/&1-x=&2/&1'],
					answerFields: ['$$x=...$$'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[5;9]\\{&1}',
							'&3': '$e[2;9]\\{&1}',
						},
					],
					solutions: [['[_&3/&1_]']],
					correctionDetails: [
						[
							{
								text: '$$\\begin{align} \
                \\frac{[_&2+&3_]}{&1} - x = \\frac{&2}{&1} \
              & \\quad \\lrArr \\quad x = \\frac{[_&2+&3_]}{&1}-\\frac{&2}{&1} \\\\ \
              @@ pgcd(&3;&1) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@ \
              @@ pgcd(&3;&1) != 1 ?? & \\quad \\lrArr \\quad  x= \\frac{&3}{&1} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@ \
              \\end{align}$$',
							},
						],
					],
					type: 'equation',
					defaultDelay: 30,
					grade: CINQUIEME,
				},
				{
					description: 'Multiplication',
					enounces: ['Résouds cette équation.'],
					expressions: [
						'&2x=[_&2*&3_]/&1',
						'x*&2=[_&2*&3_]/&1',
						'&2x=&1/&3',
						'x*&2=&1/&3',
						'x*&1=&2',
						'&1x=&2',
					],
					answerFields: ['$$x=...$$'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
							'&3': '$e[2;9]\\{cd(&1)}',
						},
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
							'&3': '$e[2;9]\\{cd(&1)}',
						},
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]\\{cd(&1)}',
							'&3': '$e[2;9]\\{cd(&1)}',
						},
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]\\{cd(&1)}',
							'&3': '$e[2;9]\\{cd(&1)}',
						},

						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
						},
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
						},
					],
					solutions: [
						['[_&3/&1_]'],
						['[_&3/&1_]'],
						['[_&1/(&2*&3)_]'],
						['[_&1/(&2*&3)_]'],
						['[_&2/&1_]'],
						['[_&2/&1_]'],
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
                \\textcolor{${color1}}{&2}x = \\frac{[_&2*&3_]}{&1} \
              & \\quad \\lrArr \\quad x = \\frac{[_&2*&3_]}{&1} \\textcolor{${color1}}{\\div &2} \\\\ \
              & \\quad \\lrArr \\quad x = \\frac{[_&2*&3_] \\div &2 }{&1} \\\\ \
              & \\quad \\lrArr \\quad  x= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
                x \\textcolor{${color1}}{\\times &2} = \\frac{[_&2*&3_]}{&1} \
              & \\quad \\lrArr \\quad x = \\frac{[_&2*&3_]}{&1} \\textcolor{${color1}}{\\div &2} \\\\ \
              & \\quad \\lrArr \\quad x = \\frac{[_&2*&3_] \\div &2 }{&1} \\\\ \
              & \\quad \\lrArr \\quad  x= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
                \\textcolor{${color1}}{&2}x=\\frac{&1}{&3} \
              & \\quad \\lrArr \\quad x = \\frac{&1}{&3} \\textcolor{${color1}}{\\times \\frac{1}{&2}} \\\\ \
              & \\quad \\lrArr \\quad x = \\frac{&1}{&3 \\times &2} \\\\ \
              & \\quad \\lrArr \\quad  x= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
                x \\textcolor{${color1}}{\\times &2} = \\frac{&1}{&3} \
              & \\quad \\lrArr \\quad x = \\frac{&1}{&3} \\textcolor{${color1}}{\\times \\frac{1}{&2}} \\\\ \
              & \\quad \\lrArr \\quad x = \\frac{&1}{&3 \\times &2} \\\\ \
              & \\quad \\lrArr \\quad  x= &sol  \
              \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
                x \\textcolor{${color1}}{\\times &1} = &2\
                @@ pgcd(&2;&1) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@ \
                @@ pgcd(&2;&1) != 1 ?? & \\quad \\lrArr \\quad  x= \\frac{&2}{\\textcolor{${color1}}{&1}} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@ \
                \\end{align}$$`,
							},
						],
						[
							{
								text: '$$\\begin{align} \
                \\textcolor{${color1}}{&1}x = &2\
                @@ pgcd(&2;&1) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@ \
                @@ pgcd(&2;&1) != 1 ?? & \\quad \\lrArr \\quad  x= \\frac{&2}{\\textcolor{${color1}}{&1}} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@ \
                \\end{align}$$',
							},
						],
					],
					type: 'equation',
					defaultDelay: 30,
					grade: QUATRIEME,
				},
				{
					description: 'Division',
					enounces: ['Résouds cette équation.'],
					expressions: ['x/&2=&3/&1'],
					answerFields: ['$$x=...$$'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
							'&3': '$e[2;9]\\{&1}',
						},
					],
					solutions: [['[_&2*&3/&1_]']],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
                \\frac{x}{\\textcolor{${color1}}{&2}}=\\frac{&3}{&1} \
              & \\quad \\lrArr \\quad x = \\frac{&3}{&1} \\textcolor{${color1}}{\\times &2} \\\\ \
              & \\quad \\lrArr \\quad x = \\frac{&3 \\times &2}{&1} \\\\ \
              @@ pgcd(&2*&3;&1) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@ \
              @@ pgcd(&2*&3;&1) != 1 ?? & \\quad \\lrArr \\quad  x= \\frac{[_&2*&3_]}{&1} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@ \
              \\end{align}$$`,
							},
						],
					],
					type: 'equation',
					defaultDelay: 30,
					grade: QUATRIEME,
				},
				{
					description: 'Division (2)',
					enounces: ['Résouds cette équation.'],
					expressions: ['&2/x=&3/&1', '&2/x=&1'],
					answerFields: ['$$x=...$$'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]',
							'&3': '$e[2;9]\\{cd(&1);&2}',
						},
						{
							'&1': '$e[2;9]',
							'&2': '$e[2;9]\\{&1}',
						},
					],
					solutions: [['[_&2*&1/&3_]'], ['[_&2/&1_]']],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
                \\frac{&2}{x}=\\frac{&3}{&1} \
              & \\quad \\lrArr \\quad \\frac{x}{\\textcolor{${color1}}{&2}} = \\frac{&1}{&3} \\\\ \
              & \\quad \\lrArr \\quad x = \\frac{&1}{&3} \\times \\textcolor{${color1}}{&2} \\\\ \
              & \\quad \\lrArr \\quad x = \\frac{&1 \\times &2}{&3} \\\\ \
              @@ pgcd(&2*&1;&3) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@ \
              @@ pgcd(&2*&1;&3) != 1 ?? & \\quad \\lrArr \\quad  x= \\frac{[_&2*&1_]}{&3} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@ \
             \\end{align}$$`,
							},
						],

						[
							{
								text: `$$\\begin{align} \
                \\frac{&2}{x}=&1 \
              & \\quad \\lrArr \\quad \\frac{x}{\\textcolor{${color1}}{&2}} = \\frac{1}{&1} \\\\ \
              & \\quad \\lrArr \\quad x = \\frac{1}{&1} \\times \\textcolor{${color1}}{&2} \\\\ \
              @@ pgcd(&1;&2) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@ \
              @@ pgcd(&1;&2) != 1 ?? & \\quad \\lrArr \\quad  x= \\frac{&2}{&1} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@ \
             \\end{align}$$`,
							},
						],
					],
					type: 'equation',
					defaultDelay: 30,
					grade: QUATRIEME,
				},
			],
			'Linéaire du premier degré': [
				{
					description: 'Equation linéaire du premier degré',
					subdescription: 'Coefficients positifs - Second Membre nul',
					enounces: ['Résouds cette équation.'],
					expressions: ['&1x+&2=0', '&2+&1x=0'],
					answerFields: ['$$x=...$$'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[1;9]\\{&1}',
						},
					],
					solutions: [['[_-&2/&1_]']],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
                &1x\\textcolor{${color1}}{+&2}=0 \
              & \\quad \\lrArr \\quad \\textcolor{${color2}}{&1}x = \\textcolor{${color1}}{-&2}\\\\ \
              & \\quad \\lrArr \\quad x = \\frac{-&2}{\\textcolor{${color2}}{&1}}\\\\ \
              @@ pgcd(&2;&1) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@ \
              @@ pgcd(&2;&1) != 1 ?? & \\quad \\lrArr \\quad  x= -\\frac{&2}{&1} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@ \
             \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
                \\textcolor{${color1}}{&2+}&1x=0 \
              & \\quad \\lrArr \\quad \\textcolor{${color2}}{&1}x = \\textcolor{${color1}}{-&2}\\\\ \
              & \\quad \\lrArr \\quad x = \\frac{-&2}{\\textcolor{${color2}}{&1}}\\\\ \
              @@ pgcd(&2;&1) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@ \
              @@ pgcd(&2;&1) != 1 ?? & \\quad \\lrArr \\quad  x= -\\frac{&2}{&1} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@ \
             \\end{align}$$`,
							},
						],
					],
					type: 'equation',
					defaultDelay: 30,
					grade: QUATRIEME,
				},
				{
					description: 'Equation linéaire du premier degré',
					subdescription: 'Coefficients relatifs - Second membre nul',
					enounces: ['Résouds cette équation.'],
					expressions: [
						'&1x+&2=0',
						'&2+&1x=0',
						'&1x-&2=0',
						'-&2+&1x=0',
						'-&1x+&2=0',
						'&2-&1x=0',
						'-&1x-&2=0',
						'-&2-&1x=0',
					],
					answerFields: ['$$x=...$$'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[1;9]\\{&1}',
						},
					],
					solutions: [
						['[_-&2/&1_]'],
						['[_-&2/&1_]'],
						['[_&2/&1_]'],
						['[_&2/&1_]'],
						['[_&2/&1_]'],
						['[_&2/&1_]'],
						['[_-&2/&1_]'],
						['[_-&2/&1_]'],
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
              &1x\\textcolor{${color1}}{+&2}=0 \
              & \\quad \\lrArr \\quad  \\textcolor{${color2}}{&1}x = \\textcolor{${color1}}{-&2} \\\\ \
              & \\quad \\lrArr \\quad  x = \\frac{-&2}{\\textcolor{${color2}}{&1}} \\\\ \
              @@ pgcd(&2;&1) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@ \
            @@ pgcd(&2;&1) != 1 ?? & \\quad \\lrArr \\quad  x= -\\frac{&2}{&1} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@ \
           \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
            \\textcolor{${color1}}{&2}+&1x=0 \
            & \\quad \\lrArr \\quad  \\textcolor{${color2}}{&1}x = \\textcolor{${color1}}{-&2} \\\\ \
            & \\quad \\lrArr \\quad  x = \\frac{-&2}{\\textcolor{${color2}}{&1}} \\\\ \
            @@ pgcd(&2;&1) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@ \
          @@ pgcd(&2;&1) != 1  ?? & \\quad \\lrArr \\quad  x= -\\frac{&2}{&1} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@ \
         \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              &1x\\textcolor{${color1}}{-&2}=0 \
              & \\quad \\lrArr \\quad  \\textcolor{${color2}}{&1}x = \\textcolor{${color1}}{&2} \\\\ \
              @@ pgcd(&2;&1) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@ \
            @@ pgcd(&2;&1) != 1  ?? & \\quad \\lrArr \\quad  x= \\frac{&2}{&1} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@ \
           \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
            \\textcolor{${color1}}{-&2}+&1x=0 \
            & \\quad \\lrArr \\quad  \\textcolor{${color2}}{&1}x = \\textcolor{${color1}}{&2} \\\\ \
            @@ pgcd(&2;&1) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@ \
          @@ pgcd(&2;&1) != 1  ?? & \\quad \\lrArr \\quad  x= \\frac{&2}{&1} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@ \
         \\end{align}$$`,
							},
						],

						[
							{
								text: `$$\\begin{align} \
              -&1x\\textcolor{${color1}}{+&2}=0 \
              & \\quad \\lrArr \\quad  \\textcolor{${color2}}{-&1}x = \\textcolor{${color1}}{-&2} \\\\ \
              & \\quad \\lrArr \\quad  x = \\frac{-&2}{\\textcolor{${color2}}{-&1}} \\\\ \
              @@ pgcd(&2;&1) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@ \
            @@ pgcd(&2;&1) != 1 ?? & \\quad \\lrArr \\quad  x= \\frac{&2}{&1} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@ \
           \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
            \\textcolor{${color1}}{&2}-&1x=0 \
            & \\quad \\lrArr \\quad  \\textcolor{${color2}}{-&1}x = \\textcolor{${color1}}{-&2} \\\\ \
            & \\quad \\lrArr \\quad  x = \\frac{-&2}{\\textcolor{${color2}}{-&1}} \\\\ \
            @@ pgcd(&2;&1) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@ \
          @@ pgcd(&2;&1) != 1  ?? & \\quad \\lrArr \\quad  x= \\frac{&2}{&1} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@ \
         \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              -&1x\\textcolor{${color1}}{-&2}=0 \
              & \\quad \\lrArr \\quad  \\textcolor{${color2}}{-&1}x = \\textcolor{${color1}}{&2} \\\\ \
              & \\quad \\lrArr \\quad  x = \\frac{&2}{\\textcolor{${color2}}{-&1}} \\\\ \
              @@ pgcd(&2;&1) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@ \
            @@ pgcd(&2;&1) != 1  ?? & \\quad \\lrArr \\quad  x= -\\frac{&2}{&1} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@ \
           \\end{align}$$`,
							},
						],
						[
							{
								text: `$$\\begin{align} \
              \\textcolor{${color1}}{-&2}-&1x=0 \
              & \\quad \\lrArr \\quad  \\textcolor{${color2}}{-&1}x = \\textcolor{${color1}}{&2} \\\\ \
              & \\quad \\lrArr \\quad  x = \\frac{&2}{\\textcolor{${color2}}{-&1}} \\\\ \
              @@ pgcd(&2;&1) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@ \
            @@ pgcd(&2;&1) != 1  ?? & \\quad \\lrArr \\quad  x= -\\frac{&2}{&1} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@ \
           \\end{align}$$`,
							},
						],
					],
					type: 'equation',
					defaultDelay: 30,
					grade: QUATRIEME,
				},
				{
					description: 'Equation linéaire du premier degré',
					subdescription: 'Coefficients positifs  $$ax+b=c$$',
					enounces: ['Résouds cette équation.'],
					expressions: ['&3x+&2=&1', '&2+&3x=&1'],
					answerFields: ['$$x=...$$'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[1;&1-1]',
							'&3': '$e[2;9]',
						},
					],
					solutions: [['[_(&1-&2)/&3_]']],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
                &3x\\textcolor{${color1}}{+&2}=&1 \
              & \\quad \\lrArr \\quad &3x = &1\\textcolor{${color1}}{-&2} \\\\ \
              & \\quad \\lrArr \\quad \\textcolor{${color2}}{&3}x = [_&1-&2_] \\\\ \
              @@ pgcd(&1-&2;&3) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@ \
              @@ pgcd(&1-&2;&3) != 1 ?? & \\quad \\lrArr \\quad  x= \\frac{[_&1-&2_]}{\\textcolor{${color2}}{&3}} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@ \
             \\end{align}$$`,
							},
						],
					],
					type: 'equation',
					defaultDelay: 30,
					grade: QUATRIEME,
				},
				{
					description: 'Equation linéaire du premier degré',
					subdescription: 'Coefficients relatifs',
					enounces: ['Résouds cette équation.'],
					expressions: ['&1x[+_&2_]=&3', '&2[+_&1_]x=&3'],
					answerFields: ['$$x=...$$'],

					variables: [
						{
							'&1': '$er[2;9]',
							'&2': '$er[1;9]\\{&1}',
							'&3': '$er[1;9]\\{&2;-(&2)}',
						},
					],
					solutions: [['[_(&3-(&2))/(&1)_]']],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
              &1x\\textcolor{${color1}}{[+_&2_]}=&3 \
              & \\quad \\lrArr \\quad  &1x = &3\\textcolor{${color1}}{[+_-(&2)_]} \\\\  \
              & \\quad \\lrArr \\quad  \\textcolor{${color2}}{&1}x = [_&3-(&2)_] \\\\ \
              & \\quad \\lrArr \\quad  x = \\frac{[_&3-(&2)_]}{\\textcolor{${color2}}{&1}} \\\\ \
              @@ pgcd(abs(&3-(&2));&1) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@ \
            @@ pgcd(abs(&3-(&2));&1) != 1 && (&3-(&2))*(&1)>0  ?? & \\quad \\lrArr \\quad  x= \\frac{[_abs(&3-(&2))_]}{[_abs(&1)_]} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@ \
            @@ pgcd(abs(&3-(&2));&1) != 1 && (&3-(&2))*(&1)<0  ?? & \\quad \\lrArr \\quad  x= -\\frac{[_abs(&3-(&2))_]}{[_abs(&1)_]} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@ \
           \\end{align}$$`,
							},
						],
						[
							{
								text: '$$\\begin{align} \
              \\textcolor{${color1}}{&2}[+_&1_]x=&3 \
              & \\quad \\lrArr \\quad  &1x = &3\\textcolor{${color1}}{[+_-(&2)_]} \\\\  \
              & \\quad \\lrArr \\quad  \\textcolor{${color2}}{&1}x = [_&3-(&2)_] \\\\ \
              & \\quad \\lrArr \\quad  x = \\frac{[_&3-(&2)_]}{\\textcolor{${color2}}{&1}} \\\\ \
              @@ pgcd(abs(&3-(&2));&1) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@ \
            @@ pgcd(abs(&3-(&2));&1) != 1 && (&3-(&2))*(&1)>0  ?? & \\quad \\lrArr \\quad  x= \\frac{[_abs(&3-(&2))_]}{[_abs(&1)_]} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@ \
            @@ pgcd(abs(&3-(&2));&1) != 1 && (&3-(&2))*(&1)<0  ?? & \\quad \\lrArr \\quad  x= -\\frac{[_abs(&3-(&2))_]}{[_abs(&1)_]} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@ \
           \\end{align}$$',
							},
						],
					],
					type: 'equation',
					defaultDelay: 30,
					grade: QUATRIEME,
				},
				{
					description: 'Equation linéaire du premier degré',
					subdescription: 'Coefficients positifs - Avec second membre',
					enounces: ['Résouds cette équation.'],
					expressions: ['&3x+&2=&4x+&1'],
					answerFields: ['$$x=...$$'],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[1;&1-1]',
							'&3': '$e[3;9]',
							'&4': '$e[1;&3-2]',
						},
					],
					solutions: [['[_(&1-&2)/(&3-&4)_]']],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
                &3x\\textcolor{${color1}}{+&2}=\\textcolor{${color2}}{[_&4x_]}+&1 \
              & \\quad \\lrArr \\quad &3x \\textcolor{${color2}}{-[_&4x_]} = &1\\textcolor{${color1}}{-&2} \\\\ \
              & \\quad \\lrArr \\quad \\textcolor{violet}{[_&3-&4_]}x = [_&1-&2_] \\\\ \
              @@ pgcd(&3-&4;&1-&2) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@ \
              @@ pgcd(&3-&4;&1-&2) != 1 ?? & \\quad \\lrArr \\quad  x= \\frac{[_&1-&2_]}{\\textcolor{violet}{[_&3-&4_]}} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@ \
             \\end{align}$$`,
							},
						],
					],
					type: 'equation',
					defaultDelay: 30,
					grade: QUATRIEME,
				},
				{
					description: 'Equation linéaire du premier degré',
					subdescription: 'Coefficients relatifs - Avec second membre',
					enounces: ['Résouds cette équation.'],
					expressions: ['&3x[+_&2_]=&4x[+_&1_]'],
					answerFields: ['$$x=...$$'],
					variables: [
						{
							'&1': '$er[1;9]',
							'&2': '$er[1;9]\\{&1}',
							'&3': '$er[2;9]',
							'&4': '$er[2;9]\\{&3}',
						},
					],
					solutions: [['[_(&1-(&2))/(&3-(&4))_]']],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
              &3x\\textcolor{${color1}}{[+_&2_]}=\\textcolor{${color2}}{&4x}[+_&1_] \
              & \\quad \\lrArr \\quad &3x \\textcolor{${color2}}{[+_-(&4)x_]} = &1\\textcolor{${color1}}{[+_-(&2)_]} \\\\ \
              & \\quad \\lrArr \\quad  \\textcolor{${color3}}{[_(&3-(&4))x_]} = [_&1-(&2)_] \\\\  \
              & \\quad \\lrArr \\quad  x = \\frac{[_&1-(&2)_]}{\\textcolor{${color3}}{[_&3-(&4)_]}} \\\\ \
              @@ pgcd(abs(&1-(&2));abs(&3-(&4))) = 1 ?? & \\quad \\lrArr \\quad  x= &sol  @@ \
            @@ pgcd(abs(&1-(&2));abs(&3-(&4))) != 1 && (&1-(&2))*(&3-(&4))>0  ?? & \\quad \\lrArr \\quad  x= \\frac{[_abs(&1-(&2))_]}{[_abs(&3-(&4))_]} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@ \
            @@ pgcd(abs(&1-(&2));abs(&3-(&4))) != 1 && (&1-(&2))*(&3-(&4))<0  ?? & \\quad \\lrArr \\quad  x= -\\frac{[_abs(&1-(&2))_]}{[_abs(&3-(&4))_]} \\\\ & \\quad \\lrArr \\quad  x= &sol  @@ \
           \\end{align}$$`,
							},
						],
					],
					type: 'equation',
					defaultDelay: 30,
					grade: QUATRIEME,
				},
			],
		},
	},

	Fonctions: {
		'Fonctions affines': {
			Apprivoiser: [
				{
					description: 'Reconnaître une fonction affine',
					subdescription: "A partir de l'expression algébrique",
					enounces: ['Cette fonction est-elle une fonction affine ?'],
					expressions: [
						'f(x)=[_&1x_][+_&2_]',
						'f(x)=&2[+_&1x_]',
						'f(x)={[_&1/&3_]}x[+_&2/&4_]',
						'f(x)=[_&2/&4_]+{[_abs(&1)/&3_]}x',
						'f(x)=[_&1x_]',
						'f(x)=&2',
						'f(x)=[_&1x^2_][+_&2_]',
						'f(x)=&2[+_&1x^3_]',
						'f(x)=&1/x[+_&2_]',
					],
					variables: [
						{
							'&1': '$er[1;9]',
							'&2': '$er[1;9]',
							'&3': '$e[2;9]\\{cd(&1)}',
							'&4': '$e[2;9]\\{cd(&2)}',
						},
					],

					choices: [[{ text: 'Oui' }, { text: 'Non' }]],

					correctionDetails: [
						[
							{
								text: '&solution, $$f$$ est une fonction affine car son expression est de la forme $$ax+b$$ avec $$a=&1$$ et $$b=&2$$.',
							},
						],
						[
							{
								text: '&solution, $$f$$ est une fonction affine car son expression est de la forme $$ax+b$$ avec $$a=&1$$ et $$b=&2$$.',
							},
						],
						[
							{
								text: '&solution, $$f$$ est une fonction affine car son expression est de la forme $$ax+b$$ avec $$a=[_&1/&3_]$$ et $$b=[_&2/&4_]$$.',
							},
						],
						[
							{
								text: '&solution, $$f$$ est une fonction affine car son expression est de la forme $$ax+b$$ avec $$a=[_abs(&1)/&3_]$$ et $$b=[_&2/&4_]$$.',
							},
						],
						[
							{
								text: '&solution, $$f$$ est une fonction affine car son expression est de la forme $$ax+b$$ avec $$a=&1$$ et $$b=0$$.',
							},
						],
						[
							{
								text: '&solution, $$f$$ est une fonction affine car son expression est de la forme $$ax+b$$ avec $$a=0$$ et $$b=&2$$.',
							},
						],
						[
							{
								text: "&solution, $$f$$ n'est pas une fonction affine car son expression n'est pas de la forme $$ax+b$$.",
							},
						],
						[
							{
								text: "&solution, $$f$$ n'est pas une fonction affine car son expression n'est pas de la forme $$ax+b$$.",
							},
						],
						[
							{
								text: "&solution, $$f$$ n'est pas une fonction affine car son expression n'est pas de la forme $$ax+b$$.",
							},
						],
					],

					solutions: [[0], [0], [0], [0], [0], [0], [1], [1], [1]],
					options: ['no-shuffle-choices'],
					defaultDelay: 20,
					grade: TROISIEME,
				},
				{
					description: 'Reconnaître une fonction affine',
					subdescription: 'A partir de la représentation graphique',
					enounces: ['Cette courbe représente-t-elle une fonction affine ?'],
					images: [
						'fonctions-affines/reconnaitre/reconnaitre_fonction_affine-0-600.png',
						'fonctions-affines/reconnaitre/reconnaitre_fonction_affine-1-600.png',
						'fonctions-affines/reconnaitre/reconnaitre_fonction_affine-2-600.png',
						'fonctions-affines/reconnaitre/reconnaitre_fonction_affine-3-600.png',
						'fonctions-affines/reconnaitre/reconnaitre_fonction_affine-4-600.png',
						'fonctions-affines/reconnaitre/reconnaitre_fonction_affine-5-600.png',
						'fonctions-affines/reconnaitre/reconnaitre_fonction_affine-6-600.png',
						'fonctions-affines/reconnaitre/reconnaitre_fonction_affine-7-600.png',
						'fonctions-affines/reconnaitre/reconnaitre_fonction_affine-8-600.png',
						'fonctions-affines/reconnaitre/reconnaitre_fonction_affine-9-600.png',
						'fonctions-affines/reconnaitre/reconnaitre_fonction_affine-10-600.png',
						'fonctions-affines/reconnaitre/reconnaitre_fonction_affine-11-600.png',
					],

					choices: [[{ text: 'Oui' }, { text: 'Non' }]],

					solutions: [
						[0],
						[0],
						[0],
						[0],
						[0],
						[0],
						[1],
						[1],
						[1],
						[1],
						[1],
						[1],
					],
					correctionDetails: [
						[
							{
								text: "&solution, cette courbe représente une fonction affine car c'est une droite.",
							},
						],
						[
							{
								text: "&solution, cette courbe représente une fonction affine car c'est une droite.",
							},
						],
						[
							{
								text: "&solution, cette courbe représente une fonction affine car c'est une droite.",
							},
						],
						[
							{
								text: "&solution, cette courbe représente une fonction affine car c'est une droite.",
							},
						],
						[
							{
								text: "&solution, cette courbe représente une fonction affine car c'est une droite.",
							},
						],
						[
							{
								text: "&solution, cette courbe représente une fonction affine car c'est une droite.",
							},
						],
						[
							{
								text: "&solution, cette courbe ne représente pas une fonction affine car ce n'est pas une droite.",
							},
						],
						[
							{
								text: "&solution, cette courbe ne représente pas une fonction affine car ce n'est pas une droite.",
							},
						],
						[
							{
								text: "&solution, cette courbe ne représente pas une fonction affine car ce n'est pas une droite.",
							},
						],
						[
							{
								text: "&solution, cette courbe ne représente pas une fonction affine car ce n'est pas une droite.",
							},
						],
						[
							{
								text: "&solution, cette courbe ne représente pas une fonction affine car ce n'est pas une droite.",
							},
						],
						[
							{
								text: "&solution, cette courbe ne représente pas une fonction affine car ce n'est pas une droite.",
							},
						],
					],
					options: ['no-shuffle-choices'],
					defaultDelay: 20,
					grade: TROISIEME,
				},
				{
					description: 'Vocabulaire des fonctions affines',
					enounces: [
						"Dans la fonction affine $$f(x)=&1x[+_&2_]$$, le nombre $$&1$$ s'appelle ...",
						"Dans la fonction affine $$f(x)=&1x[+_&2_]$$, le nombre $$&2$$ s'appelle ...",
						"Dans la fonction affine $$f(x)=&2[+_&1_]x$$, le nombre $$&1$$ s'appelle ...",
						"Dans la fonction affine $$f(x)=&2[+_&1_]x$$, le nombre $$&2$$ s'appelle ...",
					],

					variables: [
						{
							'&1': '$er[2;9]',
							'&2': '$e[1;9]\\{&1;-(&1)}',
						},
					],
					choices: [
						[
							{ text: 'le coefficient directeur' },
							{ text: "l'ordonnée à l'origine " },
						],
					],
					options: ['no-shuffle-choices'],
					solutions: [[0], [1], [0], [1]],
					defaultDelay: 10,
					grade: TROISIEME,
				},
				{
					description: "Déterminer l'ordonnée à l'origine",
					subdescription: 'Graphiquement',
					enounces: [
						"Quelle est l'ordonnée à l'origine de cette fonction affine ?",
					],
					// expressions:['1'],
					images: [
						'fonctions-affines/exemples/fonction_affine-0-600.png',
						'fonctions-affines/exemples/fonction_affine-1-600.png',
						'fonctions-affines/exemples/fonction_affine-2-600.png',
						'fonctions-affines/exemples/fonction_affine-3-600.png',
						'fonctions-affines/exemples/fonction_affine-4-600.png',
						'fonctions-affines/exemples/fonction_affine-5-600.png',
						'fonctions-affines/exemples/fonction_affine-6-600.png',
						'fonctions-affines/exemples/fonction_affine-7-600.png',
						'fonctions-affines/exemples/fonction_affine-8-600.png',
						'fonctions-affines/exemples/fonction_affine-9-600.png',
						'fonctions-affines/exemples/fonction_affine-10-600.png',
						'fonctions-affines/exemples/fonction_affine-11-600.png',
						'fonctions-affines/exemples/fonction_affine-12-600.png',
						'fonctions-affines/exemples/fonction_affine-13-600.png',
						'fonctions-affines/exemples/fonction_affine-14-600.png',
						'fonctions-affines/exemples/fonction_affine-15-600.png',
						'fonctions-affines/exemples/fonction_affine-16-600.png',
						'fonctions-affines/exemples/fonction_affine-17-600.png',
						'fonctions-affines/exemples/fonction_affine-18-600.png',
						'fonctions-affines/exemples/fonction_affine-19-600.png',
						'fonctions-affines/exemples/fonction_affine-20-600.png',
						'fonctions-affines/exemples/fonction_affine-21-600.png',
						'fonctions-affines/exemples/fonction_affine-22-600.png',
						'fonctions-affines/exemples/fonction_affine-23-600.png',
						'fonctions-affines/exemples/fonction_affine-24-600.png',
						'fonctions-affines/exemples/fonction_affine-25-600.png',
						'fonctions-affines/exemples/fonction_affine-26-600.png',
						'fonctions-affines/exemples/fonction_affine-27-600.png',
						'fonctions-affines/exemples/fonction_affine-28-600.png',
						'fonctions-affines/exemples/fonction_affine-29-600.png',
					],
					imagesCorrection: [
						'fonctions-affines/ordonnee-origine/correction_ordonnee_origine-0-600.png',
						'fonctions-affines/ordonnee-origine/correction_ordonnee_origine-1-600.png',
						'fonctions-affines/ordonnee-origine/correction_ordonnee_origine-2-600.png',
						'fonctions-affines/ordonnee-origine/correction_ordonnee_origine-3-600.png',
						'fonctions-affines/ordonnee-origine/correction_ordonnee_origine-4-600.png',
						'fonctions-affines/ordonnee-origine/correction_ordonnee_origine-5-600.png',
						'fonctions-affines/ordonnee-origine/correction_ordonnee_origine-6-600.png',
						'fonctions-affines/ordonnee-origine/correction_ordonnee_origine-7-600.png',
						'fonctions-affines/ordonnee-origine/correction_ordonnee_origine-8-600.png',
						'fonctions-affines/ordonnee-origine/correction_ordonnee_origine-9-600.png',
						'fonctions-affines/ordonnee-origine/correction_ordonnee_origine-10-600.png',
						'fonctions-affines/ordonnee-origine/correction_ordonnee_origine-11-600.png',
						'fonctions-affines/ordonnee-origine/correction_ordonnee_origine-12-600.png',
						'fonctions-affines/ordonnee-origine/correction_ordonnee_origine-13-600.png',
						'fonctions-affines/ordonnee-origine/correction_ordonnee_origine-14-600.png',
						'fonctions-affines/ordonnee-origine/correction_ordonnee_origine-15-600.png',
						'fonctions-affines/ordonnee-origine/correction_ordonnee_origine-16-600.png',
						'fonctions-affines/ordonnee-origine/correction_ordonnee_origine-17-600.png',
						'fonctions-affines/ordonnee-origine/correction_ordonnee_origine-18-600.png',
						'fonctions-affines/ordonnee-origine/correction_ordonnee_origine-19-600.png',
						'fonctions-affines/ordonnee-origine/correction_ordonnee_origine-20-600.png',
						'fonctions-affines/ordonnee-origine/correction_ordonnee_origine-21-600.png',
						'fonctions-affines/ordonnee-origine/correction_ordonnee_origine-22-600.png',
						'fonctions-affines/ordonnee-origine/correction_ordonnee_origine-23-600.png',
						'fonctions-affines/ordonnee-origine/correction_ordonnee_origine-24-600.png',
						'fonctions-affines/ordonnee-origine/correction_ordonnee_origine-25-600.png',
						'fonctions-affines/ordonnee-origine/correction_ordonnee_origine-26-600.png',
						'fonctions-affines/ordonnee-origine/correction_ordonnee_origine-27-600.png',
						'fonctions-affines/ordonnee-origine/correction_ordonnee_origine-28-600.png',
						'fonctions-affines/ordonnee-origine/correction_ordonnee_origine-29-600.png',
					],
					solutions: [
						['0'],
						['2'],
						['0'],
						['2'],
						['-2'],
						['-1'],
						['0'],
						['1'],
						['0'],
						['1'],
						['-2'],
						['0'],
						['2'],
						['1'],
						['-2'],
						['1'],
						['2'],
						['0'],
						['-2'],
						['-2'],
						['1'],
						['-2'],
						['1'],
						['0'],
						['0'],
						['-1'],
						['0'],
						['2'],
						['0'],
						['0'],
					],
					correctionFormat: [
						{
							correct: ["L'ordonnée à l'origine est &answer."],
						},
					],

					defaultDelay: 10,
					grade: SECONDE,
				},
				{
					description: 'Déterminer le coefficient directeur',
					subdescription: 'Graphiquement',
					enounces: [
						'Quel est le coefficient directeur de cette fonction affine ?',
					],
					images: [
						'fonctions-affines/exemples/fonction_affine-0-600.png',
						'fonctions-affines/exemples/fonction_affine-1-600.png',
						'fonctions-affines/exemples/fonction_affine-2-600.png',
						'fonctions-affines/exemples/fonction_affine-3-600.png',
						'fonctions-affines/exemples/fonction_affine-4-600.png',
						'fonctions-affines/exemples/fonction_affine-5-600.png',
						'fonctions-affines/exemples/fonction_affine-6-600.png',
						'fonctions-affines/exemples/fonction_affine-7-600.png',
						'fonctions-affines/exemples/fonction_affine-8-600.png',
						'fonctions-affines/exemples/fonction_affine-9-600.png',
						'fonctions-affines/exemples/fonction_affine-10-600.png',
						'fonctions-affines/exemples/fonction_affine-11-600.png',
						'fonctions-affines/exemples/fonction_affine-12-600.png',
						'fonctions-affines/exemples/fonction_affine-13-600.png',
						'fonctions-affines/exemples/fonction_affine-14-600.png',
						'fonctions-affines/exemples/fonction_affine-15-600.png',
						'fonctions-affines/exemples/fonction_affine-16-600.png',
						'fonctions-affines/exemples/fonction_affine-17-600.png',
						'fonctions-affines/exemples/fonction_affine-18-600.png',
						'fonctions-affines/exemples/fonction_affine-19-600.png',
						'fonctions-affines/exemples/fonction_affine-20-600.png',
						'fonctions-affines/exemples/fonction_affine-21-600.png',
						'fonctions-affines/exemples/fonction_affine-22-600.png',
						'fonctions-affines/exemples/fonction_affine-23-600.png',
						'fonctions-affines/exemples/fonction_affine-24-600.png',
						'fonctions-affines/exemples/fonction_affine-25-600.png',
						'fonctions-affines/exemples/fonction_affine-26-600.png',
						'fonctions-affines/exemples/fonction_affine-27-600.png',
						'fonctions-affines/exemples/fonction_affine-28-600.png',
						'fonctions-affines/exemples/fonction_affine-29-600.png',
					],
					imagesCorrection: [
						'fonctions-affines/coef-directeur/correction_coef_directeur-0-600.png',
						'fonctions-affines/coef-directeur/correction_coef_directeur-1-600.png',
						'fonctions-affines/coef-directeur/correction_coef_directeur-2-600.png',
						'fonctions-affines/coef-directeur/correction_coef_directeur-3-600.png',
						'fonctions-affines/coef-directeur/correction_coef_directeur-4-600.png',
						'fonctions-affines/coef-directeur/correction_coef_directeur-5-600.png',
						'fonctions-affines/coef-directeur/correction_coef_directeur-6-600.png',
						'fonctions-affines/coef-directeur/correction_coef_directeur-7-600.png',
						'fonctions-affines/coef-directeur/correction_coef_directeur-8-600.png',
						'fonctions-affines/coef-directeur/correction_coef_directeur-9-600.png',
						'fonctions-affines/coef-directeur/correction_coef_directeur-10-600.png',
						'fonctions-affines/coef-directeur/correction_coef_directeur-11-600.png',
						'fonctions-affines/coef-directeur/correction_coef_directeur-12-600.png',
						'fonctions-affines/coef-directeur/correction_coef_directeur-13-600.png',
						'fonctions-affines/coef-directeur/correction_coef_directeur-14-600.png',
						'fonctions-affines/coef-directeur/correction_coef_directeur-15-600.png',
						'fonctions-affines/coef-directeur/correction_coef_directeur-16-600.png',
						'fonctions-affines/coef-directeur/correction_coef_directeur-17-600.png',
						'fonctions-affines/coef-directeur/correction_coef_directeur-18-600.png',
						'fonctions-affines/coef-directeur/correction_coef_directeur-19-600.png',
						'fonctions-affines/coef-directeur/correction_coef_directeur-20-600.png',
						'fonctions-affines/coef-directeur/correction_coef_directeur-21-600.png',
						'fonctions-affines/coef-directeur/correction_coef_directeur-22-600.png',
						'fonctions-affines/coef-directeur/correction_coef_directeur-23-600.png',
						'fonctions-affines/coef-directeur/correction_coef_directeur-24-600.png',
						'fonctions-affines/coef-directeur/correction_coef_directeur-25-600.png',
						'fonctions-affines/coef-directeur/correction_coef_directeur-26-600.png',
						'fonctions-affines/coef-directeur/correction_coef_directeur-27-600.png',
						'fonctions-affines/coef-directeur/correction_coef_directeur-28-600.png',
						'fonctions-affines/coef-directeur/correction_coef_directeur-29-600.png',
					],
					solutions: [
						['-3'],
						['3'],
						['-2'],
						['-2'],
						['-4'],
						['2'],
						['4'],
						['4'],
						['-4'],
						['2'],
						['-1'],
						['3'],
						['2'],
						['-2'],
						['-3'],
						['1/2'],
						['-3/2'],
						['-4/3'],
						['4/3'],
						['2/3'],
						['-4/3'],
						['-2/3'],
						['2/3'],
						['-3/2'],
						['-1/3'],
						['-1/2'],
						['-1/2'],
						['3/4'],
						['-3/4'],
						['2/3'],
					],
					correctionFormat: [
						{
							correct: ['Le coefficent directeur est &answer.'],
						},
					],

					defaultDelay: 20,
					grade: SECONDE,
				},
				{
					description: 'Déterminer une image par une fonction affine',
					enounces: ["Quelle est l'image de $$&3$$ par la fonction affine :"],
					expressions: ['f(x)=&1x[+_&2_]'],

					variables: [
						{
							'&1': '$er[2;9]',
							'&2': '$er[1;9]',
							'&3': '$er[0;9]',
							'&4': '&1*(&3)+(&2)',
						},
					],
					answerFields: ['$$f(&3)=...$$'],
					solutions: [['[_&4_]']],

					correctionFormat: [
						{
							correct: ["L'image de $$&3$$ est &answer."],
						},
					],
					correctionDetails: [
						[{ text: '$$f(&3)=&1 \\times [(_&3_][+_&2_]=$$&solution.' }],
					],
					defaultDelay: 20,
					grade: TROISIEME,
				},
				{
					description:
						"Déterminer si un point appartient à la courbe représentative d'un fonction affine",
					enounces: [
						'Le point $$A(&3;[_&4_])$$ appartient-il à la courbe représentative de la fonction affine :',
					],
					expressions: [
						'f(x)=&1x[+_&2_]',
						'f(x)=&1x[+_&2_]', // pour correspondre au nombre de variables
					],

					variables: [
						{
							'&1': '$er[2;6]',
							'&2': '$er[1;9]',
							'&3': '$er[0;5]',
							'&4': '&1*(&3)+(&2)',
						},
						{
							'&1': '$er[2;6]',
							'&2': '$er[1;9]',
							'&3': '$er[0;5]',
							'&4': '&1*(&3)+(&2)+($er[1;3])',
						},
					],
					choices: [[{ text: 'Oui' }, { text: 'Non' }]],
					options: ['no-shuffle-choices'],
					correctionDetails: [
						[
							{
								text: `$$f(\\bold{\\textcolor{${color1}}{&3}})=&1 \\times \\bold{\\textcolor{${color1}}{[(_&3_]}} [+_&2_]= \\bold{\\textcolor{${color2}}{[_&4_]}}$$ donc le point $$A(\\bold{\\textcolor{${color1}}{&3}};\\bold{\\textcolor{${color2}}{[_&4_]}})$$ appartient à la courbe représentative de la fonction affine &expression.`,
							},
						],
						[
							{
								text: `$$f(\\bold{\\textcolor{${color1}}{&3}})=&1 \\times \\bold{\\textcolor{${color1}}{[(_&3_]}} [+_&2_]= [_&1*(&3)+(&2)_] \\bold{\\textcolor{red}{\\ne}} \\bold{\\textcolor{${color2}}{[_&4_]}}$$ donc le point $$A(\\bold{\\textcolor{${color1}}{&3}};\\bold{\\textcolor{${color2}}{[_&4_]}})$$ n'appartient pas à la courbe représentative de la fonction affine &expression.`,
							},
						],
					],
					solutions: [[0], [1]],
					defaultDelay: 20,
					grade: TROISIEME,
				},
			],
			'Variations-Signe': [
				{
					description: "Déterminer le sens de variation d'une fonction affine",
					enounces: ['Quel est le sens de variation de cette fonction?'],
					expressions: [
						'f(x)=&1x[+_&4_]',
						'f(x)=-&1x[+_&4_]',
						'f(x)=[_&4_]+&1x',
						'f(x)=[_&4_]-&1x',
						'f(x)={&3}x[+_&7_]',
						'f(x)={-&3}x[+_&7_]',
						'f(x)=[_&7_]+{&3}x',
						'f(x)=[_&7_]-{&3}x',
					],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$e[1;9]\\{&1}',
							'&3': '$l{-1;1}',
							'&4': '&2*(&3)',
						},
						{
							'&1': '$e[2;9]',
							'&2': '$e[1;9]\\{&1}',
							'&3': '$l{-1;1}',
							'&4': '&2*(&3)',
						},
						{
							'&1': '$e[2;9]',
							'&2': '$e[1;9]\\{&1}',
							'&3': '$l{-1;1}',
							'&4': '&2*(&3)',
						},
						{
							'&1': '$e[2;9]',
							'&2': '$e[1;9]\\{&1}',
							'&3': '$l{-1;1}',
							'&4': '&2*(&3)',
						},

						{
							'&1': '$e[1;9]',
							'&2': '$e[2;9]\\{cd(&1)}',
							'&3': '&1/&2',
							'&4': '$e[1;9]',
							'&5': '$e[2;9]\\{cd(&4)}',
							'&6': '$l{-1;1}',
							'&7': '&6*&4/&5',
						},
						{
							'&1': '$e[1;9]',
							'&2': '$e[2;9]\\{cd(&1)}',
							'&3': '&1/&2',
							'&4': '$e[1;9]',
							'&5': '$e[2;9]\\{cd(&4)}',
							'&6': '$l{-1;1}',
							'&7': '&6*&4/&5',
						},
						{
							'&1': '$e[1;9]',
							'&2': '$e[2;9]\\{cd(&1)}',
							'&3': '&1/&2',
							'&4': '$e[1;9]',
							'&5': '$e[2;9]\\{cd(&4)}',
							'&6': '$l{-1;1}',
							'&7': '&6*&4/&5',
						},
						{
							'&1': '$e[1;9]',
							'&2': '$e[2;9]\\{cd(&1)}',
							'&3': '&1/&2',
							'&4': '$e[1;9]',
							'&5': '$e[2;9]\\{cd(&4)}',
							'&6': '$l{-1;1}',
							'&7': '&6*&4/&5',
						},
					],

					choices: [[{ text: 'croissante' }, { text: 'décroissante' }]],
					correctionDetails: [
						[
							{
								text: 'La fonction &expression est &solution car $$&1$$ est positif.',
							},
						],
						[
							{
								text: 'La fonction &expression est &solution car $$-&1$$ est négatif.',
							},
						],
						[
							{
								text: 'La fonction &expression est &solution car $$&1$$ est positif.',
							},
						],
						[
							{
								text: 'La fonction &expression est &solution car $$-&1$$ est négatif.',
							},
						],
						[
							{
								text: 'La fonction &expression est &solution car $$[°&3°]$$ est positif.',
							},
						],
						[
							{
								text: 'La fonction &expression est &solution car $$-[°&3°]$$ est négatif.',
							},
						],
						[
							{
								text: 'La fonction &expression est &solution car $$[°&3°]$$ est positif.',
							},
						],
						[
							{
								text: 'La fonction &expression est &solution car $$-[°&3$°]$$ est négatif.',
							},
						],
					],
					solutions: [[0], [1], [0], [1], [0], [1], [0], [1]],
					options: ['no-shuffle-choices'],
					defaultDelay: 10,
					grade: TROISIEME,
				},
				{
					description:
						'Déterminer si deux fonctions affines ont des droites représentatives parallèles',
					enounces: [
						'Les droites représentatives de ces 2 fonctions affines sont-elles parallèles?',
					],
					expressions: ['f(x)=&1x[+_&2_]'],
					expressions2: [
						'g(x)=&1x[+_&3_]',
						'g(x)=&3[+_&1_]x',
						'g(x)=&3x[+_&2_]',
						'g(x)=&2[+_&3_]x',
						'g(x)=[_-(&1)_]x[+_&3_]',
						'g(x)=&3[+_-(&1)_]x',
					],
					variables: [
						{
							'&1': '$er[2;9]',
							'&2': '$e[1;9]\\{&1}',
							'&3': '$er[2;9]',
						},
					],
					choices: [
						[{ text: 'parallèles' }, { text: '<b>non</b> parallèles' }],
					],
					options: ['no-shuffle-choices'],
					correctionDetails: [
						[
							{
								text: 'Les droites représentatives des fonctions &expression et &expression2 sont &solution car elles ont le même coefficient directeur $$&1$$.',
							},
						],
						[
							{
								text: 'Les droites représentatives des fonctions &expression et &expression2 sont &solution car elles ont le même coefficient directeur $$&1$$.',
							},
						],
						[
							{
								text: "Les droites représentatives des fonctions &expression et &expression2 sont &solution car elles n'ont pas le même coefficient directeur.",
							},
						],
						[
							{
								text: "Les droites représentatives des fonctions &expression et &expression2 sont &solution car elles n'ont pas le même coefficient directeur.",
							},
						],
						[
							{
								text: "Les droites représentatives des fonctions &expression et &expression2 sont &solution car elles n'ont pas le même coefficient directeur.",
							},
						],
						[
							{
								text: "Les droites représentatives des fonctions &expression et &expression2 sont &solution car elles n'ont pas le même coefficient directeur.",
							},
						],
					],
					solutions: [[0], [0], [1], [1], [1], [1]],
					defaultDelay: 10,
					grade: TROISIEME,
				},
				{
					description: "Reconnaître le tableau de signe d'une fonction affine",
					enounces: [
						'Quel est le tableau de signe correspondant à la fonction affine:',
					],
					expressions: [
						'f(x)=-6x+7',
						'f(x)=-9x-1',
						'f(x)=-5x+9',
						'f(x)=3x+3',
						'f(x)=7x-8',
						'f(x)=-2x-4',
						'f(x)=6x+8',
						'f(x)=4x+9',
						'f(x)=-7x+2',
						'f(x)=2x+5',
						'f(x)=8x-1',
						'f(x)=-4x',
						'f(x)=-5x-1',
						'f(x)=-x+7',
						'f(x)=x-8',
						'f(x)=-7x+6',
						'f(x)=x',
						'f(x)=-3x+4',
						'f(x)=-5x-5',
						'f(x)=5x-7',
					],

					choices: [
						[
							{
								image:
									'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-0-600.png',
							},
							{
								image:
									'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-0-600.png',
							},
						],
						[
							{
								image:
									'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-1-600.png',
							},
							{
								image:
									'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-1-600.png',
							},
						],
						[
							{
								image:
									'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-2-600.png',
							},
							{
								image:
									'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-2-600.png',
							},
						],
						[
							{
								image:
									'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-3-600.png',
							},
							{
								image:
									'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-3-600.png',
							},
						],
						[
							{
								image:
									'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-4-600.png',
							},
							{
								image:
									'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-4-600.png',
							},
						],
						[
							{
								image:
									'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-5-600.png',
							},
							{
								image:
									'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-5-600.png',
							},
						],
						[
							{
								image:
									'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-6-600.png',
							},
							{
								image:
									'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-6-600.png',
							},
						],
						[
							{
								image:
									'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-7-600.png',
							},
							{
								image:
									'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-7-600.png',
							},
						],
						[
							{
								image:
									'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-8-600.png',
							},
							{
								image:
									'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-8-600.png',
							},
						],
						[
							{
								image:
									'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-9-600.png',
							},
							{
								image:
									'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-9-600.png',
							},
						],
						[
							{
								image:
									'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-10-600.png',
							},
							{
								image:
									'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-10-600.png',
							},
						],
						[
							{
								image:
									'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-11-600.png',
							},
							{
								image:
									'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-11-600.png',
							},
						],
						[
							{
								image:
									'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-12-600.png',
							},
							{
								image:
									'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-12-600.png',
							},
						],
						[
							{
								image:
									'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-13-600.png',
							},
							{
								image:
									'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-13-600.png',
							},
						],
						[
							{
								image:
									'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-14-600.png',
							},
							{
								image:
									'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-14-600.png',
							},
						],
						[
							{
								image:
									'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-15-600.png',
							},
							{
								image:
									'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-15-600.png',
							},
						],
						[
							{
								image:
									'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-16-600.png',
							},
							{
								image:
									'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-16-600.png',
							},
						],
						[
							{
								image:
									'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-17-600.png',
							},
							{
								image:
									'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-17-600.png',
							},
						],
						[
							{
								image:
									'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-18-600.png',
							},
							{
								image:
									'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-18-600.png',
							},
						],
						[
							{
								image:
									'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_correct-19-600.png',
							},
							{
								image:
									'fonctions-affines/tableau-de-signe/tableau_de_signe_fonction_affine_uncorrect-19-600.png',
							},
						],
					],

					solutions: [[0]],

					defaultDelay: 20,
					grade: TROISIEME,
				},
			],
			Equations: [
				{
					description: "Racine d'une fonction affine",
					enounces: [
						"Pour quelle valeur de $$x$$ la fonction $$f$$ s'annulle-t-elle?",
					],
					expressions: ['f(x)=&1x[+_&2_]', 'f(x)=&2[+_&1_]x'],
					answerFields: ['$$f(...)=0$$'],
					variables: [
						{
							'&1': '$er[2;9]',
							'&2': '$er[1;9]',
						},
					],
					correctionFormat: [
						{
							correct: ["La fonction s'annule en &answer"],
						},
					],
					solutions: [['[_-(&2)/(&1)_]']],
					defaultDelay: 20,
					grade: TROISIEME,
				},
				{
					description: "Résoudre l'équation $$f(x)=k$$",
					subdescription: 'Graphiquement',
					enounces: ["Résoudre graphiquement l'équation $$f(x)=&1$$"],
					answerFields: ['$$f(...)=&1$$'],
					variables: [
						{
							'&1': '-3',
						},
						{
							'&1': '-1',
						},
						{
							'&1': '2',
						},
						{
							'&1': '-4',
						},
						{
							'&1': '2',
						},
						{
							'&1': '-1',
						},
						{
							'&1': '4',
						},
						{
							'&1': '-3',
						},
						{
							'&1': '4',
						},
						{
							'&1': '1',
						},
						{
							'&1': '1',
						},
						{
							'&1': '3',
						},
						{
							'&1': '-4',
						},
						{
							'&1': '-1',
						},
						{
							'&1': '-2',
						},
						{
							'&1': '2',
						},
						{
							'&1': '-1',
						},
						{
							'&1': '0',
						},
						{
							'&1': '2',
						},
						{
							'&1': '0',
						},
						{
							'&1': '-3',
						},
						{
							'&1': '-2',
						},
						{
							'&1': '1',
						},
						{
							'&1': '0',
						},
						{
							'&1': '0',
						},
						{
							'&1': '0',
						},
						{
							'&1': '-2',
						},
						{
							'&1': '2',
						},
						{
							'&1': '0',
						},
						{
							'&1': '2',
						},
					],
					images: [
						'fonctions-affines/exemples/fonction_affine-0-600.png',
						'fonctions-affines/exemples/fonction_affine-1-600.png',
						'fonctions-affines/exemples/fonction_affine-2-600.png',
						'fonctions-affines/exemples/fonction_affine-3-600.png',
						'fonctions-affines/exemples/fonction_affine-4-600.png',
						'fonctions-affines/exemples/fonction_affine-5-600.png',
						'fonctions-affines/exemples/fonction_affine-6-600.png',
						'fonctions-affines/exemples/fonction_affine-7-600.png',
						'fonctions-affines/exemples/fonction_affine-8-600.png',
						'fonctions-affines/exemples/fonction_affine-9-600.png',
						'fonctions-affines/exemples/fonction_affine-10-600.png',
						'fonctions-affines/exemples/fonction_affine-11-600.png',
						'fonctions-affines/exemples/fonction_affine-12-600.png',
						'fonctions-affines/exemples/fonction_affine-13-600.png',
						'fonctions-affines/exemples/fonction_affine-14-600.png',
						'fonctions-affines/exemples/fonction_affine-15-600.png',
						'fonctions-affines/exemples/fonction_affine-16-600.png',
						'fonctions-affines/exemples/fonction_affine-17-600.png',
						'fonctions-affines/exemples/fonction_affine-18-600.png',
						'fonctions-affines/exemples/fonction_affine-19-600.png',
						'fonctions-affines/exemples/fonction_affine-20-600.png',
						'fonctions-affines/exemples/fonction_affine-21-600.png',
						'fonctions-affines/exemples/fonction_affine-22-600.png',
						'fonctions-affines/exemples/fonction_affine-23-600.png',
						'fonctions-affines/exemples/fonction_affine-24-600.png',
						'fonctions-affines/exemples/fonction_affine-25-600.png',
						'fonctions-affines/exemples/fonction_affine-26-600.png',
						'fonctions-affines/exemples/fonction_affine-27-600.png',
						'fonctions-affines/exemples/fonction_affine-28-600.png',
						'fonctions-affines/exemples/fonction_affine-29-600.png',
					],
					imagesCorrection: [
						'fonctions-affines/equation/correction_equation-0-600.png',
						'fonctions-affines/equation/correction_equation-1-600.png',
						'fonctions-affines/equation/correction_equation-2-600.png',
						'fonctions-affines/equation/correction_equation-3-600.png',
						'fonctions-affines/equation/correction_equation-4-600.png',
						'fonctions-affines/equation/correction_equation-5-600.png',
						'fonctions-affines/equation/correction_equation-6-600.png',
						'fonctions-affines/equation/correction_equation-7-600.png',
						'fonctions-affines/equation/correction_equation-8-600.png',
						'fonctions-affines/equation/correction_equation-9-600.png',
						'fonctions-affines/equation/correction_equation-10-600.png',
						'fonctions-affines/equation/correction_equation-11-600.png',
						'fonctions-affines/equation/correction_equation-12-600.png',
						'fonctions-affines/equation/correction_equation-13-600.png',
						'fonctions-affines/equation/correction_equation-14-600.png',
						'fonctions-affines/equation/correction_equation-15-600.png',
						'fonctions-affines/equation/correction_equation-16-600.png',
						'fonctions-affines/equation/correction_equation-17-600.png',
						'fonctions-affines/equation/correction_equation-18-600.png',
						'fonctions-affines/equation/correction_equation-19-600.png',
						'fonctions-affines/equation/correction_equation-20-600.png',
						'fonctions-affines/equation/correction_equation-21-600.png',
						'fonctions-affines/equation/correction_equation-22-600.png',
						'fonctions-affines/equation/correction_equation-23-600.png',
						'fonctions-affines/equation/correction_equation-24-600.png',
						'fonctions-affines/equation/correction_equation-25-600.png',
						'fonctions-affines/equation/correction_equation-26-600.png',
						'fonctions-affines/equation/correction_equation-27-600.png',
						'fonctions-affines/equation/correction_equation-28-600.png',
						'fonctions-affines/equation/correction_equation-29-600.png',
					],
					solutions: [
						['1'],
						['-1'],
						['-1'],
						['3'],
						['-1'],
						['0'],
						['1'],
						['-1'],
						['-1'],
						['0'],
						['-3'],
						['1'],
						['-3'],
						['1'],
						['0'],
						['2'],
						['2'],
						['0'],
						['3'],
						['0'],
						['3'],
						['0'],
						['0'],
						['0'],
						['0'],
						['-2'],
						['4'],
						['0'],
						['0'],
						['3'],
					],
					correctionFormat: [
						{
							correct: ["La solution de l'équation est &answer."],
						},
					],
					defaultDelay: 20,
					grade: SECONDE,
				},
			],
		},
		'Valeur absolue': {
			Apprivoiser: [
				{
					description: "Opposé d'une expression",
					enounces: ["Quel est l'opposé de l'expression :"],
					expressions: ['[_&1x_]', 'x[+_&2_]', '&2-x'],
					answerFields: ["L'opposé est $$...$$"],
					variables: [
						{
							'&1': '$er[1;2]',
							'&2': '$er[1;9]',
						},
					],
					solutions: [['[_-(&1)x_]'], ['-x[+_-(&2)_]'], ['[_-(&2)_]+x']],
					correctionFormat: [
						{
							correct: ["L'opposé est &answer."],
						},
					],
					defaultDelay: 20,
					grade: SECONDE,
				},
				{
					description: "Signe d'une expression",
					subdescription: "Signe d'une expression simple avec $$x$$ positif",
					enounces: [
						'Si $$x$$ est <b>positif</b>, quel est le signe de cette expression :',
					],
					expressions: ['[_&1x_]', '[_(&2)x_]', 'x+&1', 'x&2'],
					variables: [
						{
							'&1': '$e[2;4]',
							'&2': '-$e[1;3]',
						},
					],
					choices: [
						[
							{ text: 'positive' },
							{ text: 'négative' },
							{ text: 'On ne peut pas savoir.' },
						],
					],
					solutions: [[0], [1], [0], [2]],
					correctionDetails: [
						[
							{
								text: "Si $$x$$ est <b>positif</b>, quand je le multiplie par $$&1$$ qui est positif, j'obtiens une expression &solution.",
							},
						],
						[
							{
								text: "Si $$x$$ est <b>positif</b>, quand je le multiplie par $$&2$$ qui est négatif, j'obtiens une expression &solution.",
							},
						],
						[
							{
								text: "Si $$x$$ est <b>positif</b>, quand je lui ajoute le nombre $$&1$$ qui est positif, j'obtiens une expression &solution.",
							},
						],
						[
							{
								text: 'Si $$x$$ est <b>positif</b>, quand je lui soustrais $$[_-(&2)_]$$, le résultat peut être positif ou négatif, suivant la valeur de $$x$$.',
							},
							{ text: 'Si $$x \\ge [_-(&2)_]$$ , &expression est positif.' },
							{ text: 'Si $$x \\le [_-(&2)_]$$ , &expression est négatif.' },
							{ text: '&solution' },
						],
					],
					options: ['no-shuffle-choices'],
					defaultDelay: 20,
					grade: SECONDE,
				},
				{
					description: "Signe d'une expression",
					subdescription: "Signe d'une expression simple avec $$x$$ négatif",
					enounces: [
						'Si $$x$$ est <b>négatif</b>, quel est le signe de cette expression :',
					],
					expressions: ['[_&1x_]', '[_(&2)x_]', 'x+&1', 'x&2'],
					variables: [
						{
							'&1': '$e[2;4]',
							'&2': '-$e[1;3]',
						},
					],
					choices: [
						[
							{ text: 'positive' },
							{ text: 'négative' },
							{ text: 'On ne peut pas savoir.' },
						],
					],
					solutions: [[1], [0], [2], [1]],
					correctionDetails: [
						[
							{
								text: "Si $$x$$ est <b>négatif</b>, quand je le multiplie par $$&1$$ qui est positif, j'obtiens une expression &solution.",
							},
						],
						[
							{
								text: "Si $$x$$ est <b>négatif</b>, quand je le multiplie par $$&2$$ qui est négatif, j'obtiens une expression &solution.",
							},
						],
						[
							{
								text: 'Si $$x$$ est <b>négatif</b>, quand je lui ajoute $$&1$$, le résultat peut être positif ou négatif, suivant la valeur de $$x$$.',
							},
							{ text: 'Si $$x \\ge -&1$$ , &expression est positif.' },
							{ text: 'Si $$x \\le -&1$$ , &expression est négatif.' },
							{ text: '&solution' },
						],
						[
							{
								text: "Si $$x$$ est <b>négatif</b>, quand je lui soustrais le nombre $$[_-(&2)_]$$, j'obtiens une expression &solution.",
							},
						],
					],
					options: ['no-shuffle-choices'],
					defaultDelay: 20,
					grade: SECONDE,
				},
				{
					description: "Calculer la valeur d'une valeur absolue",
					subdescription: 'Nombres entiers',
					enounces: ['Calcule.'],
					expressions: ['abs(&1)'],
					variables: [
						{
							'&1': '$er[0;9]',
						},
					],

					defaultDelay: 20,
					grade: SECONDE,
				},
				{
					description: "Calculer la valeur d'une valeur absolue",
					subdescription: 'Nombres variés',
					enounces: ['Calcule.'],
					expressions: [
						'abs(&1/&2)',
						'abs(-&1/&2)',
						'abs(sqrt(&3))',
						'abs(-sqrt(&3))',
						'abs(&4)',
						'abs(-&4)',
					],
					solutions: [
						['[_abs(&1/&2)_]'],
						['[_abs(-&1/&2)_]'],
						['[_abs(sqrt(&3))_]'],
						['[_abs(-sqrt(&3))_]'],
						['[._abs(&4)_]'],
						['[._abs(-&4)_]'],
					],
					variables: [
						{
							'&1': '$e[1;9]',
							'&2': '$e[2;9]\\{cd(&1)}',
							'&3': '$l{2;3;5;7}',
							'&4': '$d{1;1}',
						},
					],

					defaultDelay: 20,
					grade: SECONDE,
				},
				{
					description: "Calculer la valeur d'une valeur absolue",
					subdescription: "D'une expression simple à calculer",
					enounces: ['Calcule.'],
					expressions: ['abs(&1[+_&2_])', 'abs(&1*[(_&2_])'],
					variables: [
						{
							'&1': '$er[1;9]',
							'&2': '$er[1;9]',
						},
					],

					correctionDetails: [
						[
							{
								text: '&expression$$=\\left\\lvert [_&1+(&2)_] \\right\\rvert=$$&solution',
							},
						],
						[
							{
								text: '&expression$$=\\left\\lvert [_&1*(&2)_] \\right\\rvert=$$&solution',
							},
						],
					],
					defaultDelay: 20,
					grade: SECONDE,
				},

				{
					description: "Calculer la valeur d'une valeur absolue",
					subdescription: "D'une expression dont il faut étudier le signe",
					enounces: ['Calcule.'],
					expressions: ['abs(sqrt(&1)-&2)'],
					variables: [
						{
							'&1': '$l{2;3;5;7}',
							'&2': '$e[1;3]',
						},
					],
					solutions: [['&1>&2^2 ?? sqrt(&1)-&2 :: &2-sqrt(&1)']],

					correctionDetails: [
						[
							{
								text: '@@ &1>&2^2 ?? $$\\sqrt{&1} \\gt &2$$ donc $$\\sqrt{&1}-&2 \\gt 0$$ et &expression$$=$$&solution @@',
							},
							{
								text: '@@ &1<&2^2 ?? $$\\sqrt{&1} \\lt &2$$ donc $$\\sqrt{&1}-&2 \\lt 0$$ et &expression$$=$$&solution @@',
							},
						],
					],
					defaultDelay: 20,
					grade: SECONDE,
				},
				{
					description: 'Calculer une valeur absolue',
					subdescription:
						"Valeur absolue d'une expression littérale dont il faut étudier le signe",
					enounces: [
						'Calculer cette expression si $$x \\ge 0$$.',
						'Calculer cette expression si $$x \\le 0$$.',
						'Calculer cette expression si $$x \\ge 0$$.',
						'Calculer cette expression si $$x \\le 0$$.',
						'Calculer cette expression si $$x \\ge -&1$$.',
						'Calculer cette expression si $$x \\le -&1$$.',
						'Calculer cette expression si $$x \\ge [_-(&2)_]$$.',
						'Calculer cette expression si $$x \\le [_-(&2)_]$$.',
					],
					expressions: [
						'abs([_&1x_])',
						'abs([_&1x_])',
						'abs([_(&2)x_])',
						'abs([_(&2)x_])',
						'abs(x+&1)',
						'abs(x+&1)',
						'abs(x&2)',
						'abs(x&2)',
					],
					variables: [
						{
							'&1': '$e[1;3]',
							'&2': '-$e[1;3]',
						},
					],

					solutions: [
						['[_&1x_]'],
						['[_-&1x_]'],
						['[_-(&2)x_]'],
						['[_&2x_]'],
						['x+&1'],
						['-x-&1'],
						['x&2'],
						['[_-(&2)_]-x'],
					],
					correctionDetails: [
						[
							{
								text: '@@ &1=1 ?? $$x \\ge 0$$ donc $$\\left \\lvert x \\right \\rvert =$$&solution @@',
							},
							{
								text: '@@ &1!=1 ?? $$x \\ge 0$$ donc $$&1x \\ge 0$$ et $$\\left \\lvert &1x \\right \\rvert =$$&solution @@',
							},
						],
						[
							{
								text: '@@ &1=1 ?? $$x \\le 0$$ donc $$\\left \\lvert x \\right \\rvert =$$&solution @@',
							},
							{
								text: '@@ &1!=1 ?? $$x \\le 0$$ donc $$&1x \\le 0$$ et $$\\left \\lvert &1x \\right \\rvert =$$&solution @@',
							},
						],
						[
							{
								text: '@@ &2=1 ?? $$x \\ge 0$$ donc $$\\left \\lvert -x \\right \\rvert =$$&solution @@',
							},
							{
								text: '@@ &2!=1 ?? $$x \\ge 0$$ donc $$&2x \\le 0$$ et $$\\left \\lvert &2x \\right \\rvert =$$&solution @@',
							},
						],
						[
							{
								text: '@@ &2=-1 ?? $$x \\le 0$$ donc $$\\left \\lvert -x \\right \\rvert =$$&solution @@',
							},
							{
								text: '@@ &2!=-1 ?? $$x \\le 0$$ donc $$&2x \\ge 0$$ et $$\\left \\lvert &2x \\right \\rvert =$$&solution @@',
							},
						],
						[
							{
								text: ' $$x \\ge -&1$$ donc $$x+&1 \\ge 0$$ et $$\\left \\lvert x+&1 \\right \\rvert =$$&solution',
							},
						],
						[
							{
								text: ' $$x \\le -&1$$ donc $$x+&1 \\le 0$$ et $$\\left \\lvert x+&1 \\right \\rvert =$$&solution',
							},
						],
						[
							{
								text: ' $$x \\ge [_-(&2)_]$$ donc $$x&2 \\ge 0$$ et $$\\left \\lvert x&2 \\right \\rvert =$$&solution',
							},
						],
						[
							{
								text: ' $$x \\le [_-(&2)_]$$ donc $$x&2 \\le 0$$ et $$\\left \\lvert x&2 \\right \\rvert =$$&solution',
							},
						],
					],
					defaultDelay: 20,
					grade: SECONDE,
				},
			],
			Equations: [
				{
					description: 'Résoudre une équation avec une valeur absolue',
					enounces: ['Résouds cette équation.'],
					expressions: ['abs(x[+_-(&1)_])=&2'],
					variables: [
						{
							'&1': '$er[1;9]',
							'&2': '$e[1;9]',
						},
					],
					conditions: ['abs(&1) != abs(&2)'],
					solutions: [['[_&1+&2_]', '[_&1-&2_]']],
					answerFields: ['$$x=\\ldots$$ ou $$x=\\ldots$$'],
					correctionFormat: [
						{
							correct: ['Les solutions sont $$x=$$&answer1 et $$x=$$&answer2'],
						},
					],
					correctionDetails: [
						[
							{
								text: `$$\\begin{align} \
								\\left\\lvert x[+_-(&1)_] \\right\\rvert=&2 \
								& \\quad \\lrArr \\quad \
								    \\begin{cases} \
								       x[+_-(&1)_]= &2 \\\\ \
									   \\text{ou} \\\\ \
								       x[+_-(&1)_]= -&2  \
							        \\end{cases} \\\\ \
								& \\quad \\lrArr \\quad \
								    \\begin{cases} \
								       x= &2[+_&1_] \\\\ \
									   \\text{ou} \\\\ \
								       x= -&2[+_&1_]  \
							        \\end{cases} \\\\ \
								& \\quad \\lrArr \\quad \
								    \\begin{cases} \
								       x= &sol1 \\\\ \
									   \\text{ou} \\\\ \
								       x= &sol2  \
							        \\end{cases} \\\\ \
							 \\end{align}$$`,
							},
						],
					],
					defaultDelay: 20,
					options: ['solutions-order-not-important'],
					grade: SECONDE,
				},
			],
		},
		'Polynôme du second degré': {
			Apprivoiser: [
				{
					description: 'Reconnaître un polynôme du second degré',
					enounces: [
						"Cette expression est-elle celle d'un polynôme du second degré ?",
					],
					expressions: [
						'[_&1x^3_][+_&2x^2_][+_&3x_][+_&4_]',
						'[_&1x^2_][+_&2x_][+_&3_]',
						'[_&1x^2_][+_&2x_][+_&4sqrt(x)_][+_&3_]',
						'&1(x[+_&2_])(x[+_&3_])',
						'&1(x[+_&2_])^2[+_&3_]',
						'{[_&1x^2_][+_&2x_][+_&3_]}/{x[+_&4_]}',
					],
					variables: [
						{
							'&1': '$er[1;5]',
							'&2': '$er[0;5]',
							'&3': '$er[0;5]',
							'&4': '$er[0;5]',
						},
						{
							'&1': '$er[1;5]',
							'&2': '$er[0;5]',
							'&3': '$er[0;5]',
						},
						{
							'&1': '$er[1;5]',
							'&2': '$er[0;5]',
							'&3': '$er[0;5]',
							'&4': '$er[1;5]',
						},
						{
							'&1': '$er[2;5]',
							'&2': '$er[1;5]',
							'&3': '$er[1;5]\\{&2}',
						},
						{
							'&1': '$er[2;5]',
							'&2': '$er[1;5]',
							'&3': '$er[1;5]',
						},
						{
							'&1': '$er[1;5]',
							'&2': '$er[0;5]',
							'&3': '$er[0;5]',
							'&4': '$er[1;5]',
						},
					],
					choices: [[{ text: 'Oui' }, { text: 'Non' }]],
					solutions: [[1], [0], [1], [0], [0], [1]],
					correctionDetails: [
						[
							{
								text: "&solution,  dans l'expression &expression, le terme $$[_&1x^3_]$$ fait que c'est un polynôme du 3ème degré et non du second degré.",
							},
						],
						[
							{
								text: "&solution, l'expression &expression est bien de la forme $$ax^2+bx+c$$ avec $$a=&1$$, $$b=&2$$, et $$c=&3$$.",
							},
						],
						[
							{
								text: "&solution, dans l'expression &expression, le terme $$[_&4sqrt(x)_]$$ fait que ce n'est pas un polynôme.",
							},
						],
						[
							{
								text: "&solution, si on développe l'expression &expression, on trouve bien une expression de la forme $$ax^2+bx+c$$.",
							},
						],
						[
							{
								text: "&solution, si on développe l'expression &expression, on trouve bien une expression de la forme $$ax^2+bx+c$$.",
							},
						],
						[
							{
								text: "&solution, l'expression &expression est une fraction entre un polynôme du second degré et l'expression d'une fonction affine, ce n'est pas un polynôme.",
							},
						],
					],
					options: ['no-shuffle-choices', 'remove-null-terms'],
					defaultDelay: 20,
					grade: PREMIERE_SPE_MATHS,
				},
				{
					description: "Reconnaître la forme d'une expression du second degré",
					enounces: [
						'Quelle est la forme de cette expression du second degré ?',
					],
					expressions: [
						'[_&1x^2_][+_&2x_][+_&3_]',
						'&1(x[+_&2_])(x[+_&3_])',
						'&1(x[+_&2_])^2[+_&3_]',
					],
					variables: [
						{
							'&1': '$er[2;5]',
							'&2': '$er[1;5]',
							'&3': '$er[1;5]\\{&2}',
						},
					],
					choices: [
						[
							{ text: 'développée' },
							{ text: 'factorisée' },
							{ text: 'canonique' },
						],
					],
					solutions: [[0], [1], [2]],
					correctionDetails: [
						[
							{
								text: "C'est la forme &solution $$ax^2+bx+c$$ avec $$a=&1$$, $$b=&2$$ et $$c=&3$$",
							},
						],
						[
							{
								text: "C'est la forme &solution $$a(x-x_1)(x-x_2)$$ avec $$a=&1$$, $$x_1=[_-(&2)_]$$,  et $$x_2=[_-(&3)_]$$",
							},
						],
						[
							{
								text: "C'est la forme &solution $$a(x-\\alpha)^2+\\beta$$ avec $$a=&1$$, $$\\alpha=[_-(&2)_]$$,et $$\\beta=&3$$",
							},
						],
					],
					defaultDelay: 20,
					grade: PREMIERE_SPE_MATHS,
				},
				{
					description: '',
					enounces: [
						'Quel est le coefficient du terme de degré 2 dans cette expression  ?',
					],
					expressions: [
						'[_&1x^2_][+_&2x_][+_&3_]',
						'&1(x[+_&2_])(x[+_&3_])',
						'&1(x[+_&2_])^2[+_&3_]',
						'([_&4x_][+_&2_])([_&5x_][+_&3_])',
						'&1([_&4x_][+_&2_])([_&5x_][+_&3_])',
					],
					answerFields:['Le coefficient est $$...$$'],
					variables: [
						{
							'&1': '$er[2;5]',
							'&2': '$er[1;5]',
							'&3': '$er[1;5]',
							'&4': '$er[1;5]',
							'&5': '$er[1;5]',
						},
					],
					correctionFormat: [
						{
							correct: ['Le coefficient est &answer.'],
						},
					],
					correctionDetails: [
						[
							{
								text: `L'expression est sous la forme développée. Le coefficient du terme de degré 2 se lit directement dans $$\\bold{\\textcolor{${color1}}{&1}}x^2[+_&2x_][+_&3_]$$. C'est donc &solution`,
							},
						],
						[
							{
								text: `L'expression est sous la forme factorisée. Le coefficient du terme de degré 2 se lit directement dans $$\\bold{\\textcolor{${color1}}{&1}}(x[+_&2_])(x[+_&3_])$$. C'est donc &solution`,
							},
						],
						[
							{
								text: `L'expression est sous la forme canonique. Le coefficient du terme de degré 2 se lit directement dans $$\\bold{\\textcolor{${color1}}{&1}}(x[+_&2_])^2[+_&3_]$$. C'est donc &solution`,
							},
						],
						[
							{
								text: `Attention, l'expression n'est pas complètement sous la forme factorisée. `,
							},
							{
								text: `Le coefficient du terme de degré 2 s'obtient en multipliant les coefficients des termes de degré 1 dans l'expression $$(\\bold{\\textcolor{${color1}}{[_&4x_]}[+_&2_])(\\bold{\\textcolor{${color1}}{[_&5x_]}[+_&3_])$$.`,
							},
							{
								text: "C'est donc $$&4 \\times [(_&5_]=$$&solution",
							},
						],
						[
							{
								text: `Attention, l'expression n'est pas complètement sous la forme factorisée. `,
							},
							{
								text: `Le coefficient du terme de degré 2 s'obtient en multipliant le coefficient devant la parenthèse et les coefficients des termes de degré 1 dans l'expression $$\\bold{\\textcolor{${color1}}{&1}}(\\bold{\\textcolor{${color1}}{[_&4x_]}}[+_&2_])(\\bold{\\textcolor{${color1}}{[_&5x_]}}[+_&3_])$$.`,
							},
							{
								text: "C'est donc $$&1 \\times [(_&4_] \\times [(_&5_]=$$&solution",
							},
						],
					],
					conditions: ['abs(&1) != abs(&2) && abs(&1) != abs(&3)'],
					solutions: [
						['&1'],
						['&1'],
						['&1'],
						['[_&4*(&5)_]'],
						['[_&1*(&4)*(&5)_]'],
					],

					defaultDelay: 20,
					grade: PREMIERE_SPE_MATHS,
				},
				{
					description: "Déterminer la nature de l'extremum",
					enounces: [
						"Quelle est la nature de l'extremum de cette expression du second degré ?",
					],
					expressions: [
						'[_&1x^2_][+_&2x_][+_&3_]',
						'&1(x[+_&2_])(x[+_&3_])',
						'&1(x[+_&2_])^2[+_&3_]',
						'([_&4x_][+_&2_])([_&5x_][+_&3_])',
						'&1([_&4x_][+_&2_])([_&5x_][+_&3_])',
					],
					variables: [
						{
							'&1': '$er[2;5]',
							'&2': '$er[1;5]',
							'&3': '$er[1;5]',
							'&4': '$er[1;5]',
							'&5': '$er[1;5]',
						},
					],
					solutions: [
						['&1>0 ?? 0 :: 1'],
						['&1>0 ?? 0 :: 1'],
						['&1>0 ?? 0 :: 1'],
						['[_&4*(&5)_] >0 ?? 0 :: 1'],
						['[_&1*(&4)*(&5)_] >0 ?? 0 :: 1'],
					],
					choices: [[{ text: 'un minimum' }, { text: 'un maximum' }]],
					correctionDetails: [
						[
							{
								text: `@@ &1>0 ??  Le coefficient du terme de degré 2 est $$\\bold{\\textcolor{${color1}}{&1}}$$ qui est positif. @@`,
							},
							{
								text: `@@ &1<0 ??  Le coefficient du terme de degré 2 est $$\\bold{\\textcolor{${color1}}{&1}}$$ qui est négatif. @@`,
							},
							{
								text: 'Le polynôme admet donc &solution.',
							},
						],
						[
							{
								text: `@@ &1>0 ??  Le coefficient du terme de degré 2 est $$\\bold{\\textcolor{${color1}}{&1}}$$ qui est positif. @@`,
							},
							{
								text: `@@ &1<0 ??  Le coefficient du terme de degré 2 est $$\\bold{\\textcolor{${color1}}{&1}}$$ qui est négatif. @@`,
							},
							{
								text: 'Le polynôme admet donc &solution.',
							},
						],
						[
							{
								text: `@@ &1>0 ??  Le coefficient du terme de degré 2 est $$\\bold{\\textcolor{${color1}}{&1}}$$ qui est positif. @@`,
							},
							{
								text: `@@ &1<0 ??  Le coefficient du terme de degré 2 est $$\\bold{\\textcolor{${color1}}{&1}}$$ qui est négatif. @@`,
							},
							{
								text: 'Le polynôme admet donc &solution.',
							},
						],
						[
							{
								text: `@@ &4*(&5) >0 ?? Le coefficient du terme de degré 2 est $$&4 \\times [(_&5_]$$ qui est positif. @@`,
							},
							{
								text: `@@ &4*(&5) <0 ?? Le coefficient du terme de degré 2 est $$&4 \\times [(_&5_]$$ qui est négatif. @@`,
							},
							{
								text: 'Le polynôme admet donc &solution.',
							},
						],
						[
							{
								text: `@@ &1*(&4)*(&5) >0 ?? Le coefficient du terme de degré 2 est $$&1 \\times [(_&4_] \\times [(_&5_]$$ qui est positif. @@`,
							},
							{
								text: `@@ &1*(&4)*(&5) <0 ?? Le coefficient du terme de degré 2 est $$&1 \\times [(_&4_]\\times [(_&5_]$$ qui est négatif. @@`,
							},
							{
								text: 'Le polynôme admet donc &solution.',
							},
						],
					],
					conditions: ['abs(&1) != abs(&2) && abs(&1) != abs(&3)'],
					options: ['no-shuffle-choices'],
					defaultDelay: 20,
					grade: PREMIERE_SPE_MATHS,
				},
				{
					description: 'Déterminer les coordonnées du sommet',
					enounces: [
						'Quelles sont les coordonnées du sommet S de la courbe représentative de ce polynôme du second degré ?',
					],
					expressions: ['&1(x[+_&2_])^2[+_&3_]'],
					answerFields: ['$$S\\left( \\, ... \\, ; \\, ... \\, \\right)$$'],
					variables: [
						{
							'&1': '$er[2;5]',
							'&2': '$er[1;5]',
							'&3': '$er[1;5]',
						},
					],
					solutions: [['[_-(&2)_]', '&3']],
					correctionFormat: [
						{
							correct: [
								'Les coordonnées sont $$\\left( \\, &ans1 \\, ; \\, &ans2 \\, \\right)$$.',
							],
						},
					],
					correctionDetails: [
						[
							{
								text: `\
								@@ &2 <0 ?? L'expression $$&1(x-\\textcolor{${color1}}{[_-(&2)_]})^2\\textcolor{${color1}}{[+_&3_]}$$ est déjà sous forme canonique, ce qui nous donne directement les coordonnées du sommet $$S\\left( \\, &sol1 \\, ; \\, &sol2 \\, \\right)$$ @@\
								@@ &2 >0 ?? L'expression &expression se met sous la forme canonique $$&1(x-\\textcolor{${color1}}{[(_-(&2)_]})^2\\textcolor{${color1}}{[+_&3_]}$$ , ce qui nous donne  les coordonnées du sommet $$S\\left( \\, &sol1 \\, ; \\, &sol2 \\, \\right)$$ @@ \
								`,
							},
						],
					],
					defaultDelay: 20,
					grade: PREMIERE_SPE_MATHS,
				},
				{
					description:
						"Déterminer l'équation de l'axe de symétrie de la parabole",
					enounces: [
						"Quelle est l'équation de l'axe de symétrie de la courbe représentative de ce polynôme du second degré ?",
					],
					expressions: ['&1(x[+_&2_])^2[+_&3_]'],
					answerFields: ["L'équation est $$...$$"],
					variables: [
						{
							'&1': '$er[2;5]',
							'&2': '$er[1;5]',
							'&3': '$er[1;5]',
						},
					],
					solutions: [['x=[_-(&2)_]']],
					correctionFormat: [
						{
							correct: ["L'équation est  &answer."],
						},
					],
					correctionDetails: [
						[
							{
								text: `\
								@@ &2 <0 ?? L'expression $$&1(x-\\textcolor{${color1}}{[_-(&2)_]})^2[+_&3_]$$ est déjà sous forme canonique, ce qui nous donne directement l'équation &solution @@\
								@@ &2 >0 ?? L'expression &expression se met sous la forme canonique $$&1(x-\\textcolor{${color1}}{[(_-(&2)_]})^2[+_&3_]$$ , ce qui nous donne l'équation &solution @@ \
								`,
							},
						],
					],
					defaultDelay: 20,
					grade: PREMIERE_SPE_MATHS,
				},
				{
					description: "Déterminer les racines d'un polynôme du second degré.",
					subdescription: 'Graphiquement',
					enounces: [
						'Quelles sont les racines du polynôme représenté par cette parabole ?',
					],
					images: [
						'polynome-second-degre/trouver-racines/trouver_racines-0-600.png',
						'polynome-second-degre/trouver-racines/trouver_racines-1-600.png',
						'polynome-second-degre/trouver-racines/trouver_racines-2-600.png',
						'polynome-second-degre/trouver-racines/trouver_racines-3-600.png',
						'polynome-second-degre/trouver-racines/trouver_racines-4-600.png',
						'polynome-second-degre/trouver-racines/trouver_racines-5-600.png',
						'polynome-second-degre/trouver-racines/trouver_racines-6-600.png',
						'polynome-second-degre/trouver-racines/trouver_racines-7-600.png',
						'polynome-second-degre/trouver-racines/trouver_racines-8-600.png',
						'polynome-second-degre/trouver-racines/trouver_racines-9-600.png',
						'polynome-second-degre/trouver-racines/trouver_racines-10-600.png',
						'polynome-second-degre/trouver-racines/trouver_racines-11-600.png',
						'polynome-second-degre/trouver-racines/trouver_racines-12-600.png',
						'polynome-second-degre/trouver-racines/trouver_racines-13-600.png',
						'polynome-second-degre/trouver-racines/trouver_racines-14-600.png',
					],
					imagesCorrection: [
						'polynome-second-degre/trouver-racines/correction_trouver_racines-0-600.png',
						'polynome-second-degre/trouver-racines/correction_trouver_racines-1-600.png',
						'polynome-second-degre/trouver-racines/correction_trouver_racines-2-600.png',
						'polynome-second-degre/trouver-racines/correction_trouver_racines-3-600.png',
						'polynome-second-degre/trouver-racines/correction_trouver_racines-4-600.png',
						'polynome-second-degre/trouver-racines/correction_trouver_racines-5-600.png',
						'polynome-second-degre/trouver-racines/correction_trouver_racines-6-600.png',
						'polynome-second-degre/trouver-racines/correction_trouver_racines-7-600.png',
						'polynome-second-degre/trouver-racines/correction_trouver_racines-8-600.png',
						'polynome-second-degre/trouver-racines/correction_trouver_racines-9-600.png',
						'polynome-second-degre/trouver-racines/correction_trouver_racines-10-600.png',
						'polynome-second-degre/trouver-racines/correction_trouver_racines-11-600.png',
						'polynome-second-degre/trouver-racines/correction_trouver_racines-12-600.png',
						'polynome-second-degre/trouver-racines/correction_trouver_racines-13-600.png',
						'polynome-second-degre/trouver-racines/correction_trouver_racines-14-600.png',
					],
					answerFields: ['Les racines sont $$...$$ et $$...$$'],
					solutions: [
						['-3', '1'],
						['-3', '-1'],
						['1', '3'],
						['-2', '0'],
						['1', '2'],
						['0', '2'],
						['-1', '2'],
						['2', '3'],
						['0', '3'],
						['0', '1'],
						['-2', '1'],
						['-1', '0'],
						['-1', '1'],
						['-1', '3'],
						['-2', '-1'],
					],
					correctionFormat: [
						{
							correct: ['Les racines sont &answer1 et &answer2.'],
						},
					],
					defaultDelay: 15,
					grade: PREMIERE_SPE_MATHS,
				},
				{
					description: "Déterminer le signe d'une expression du second degré",
					enounces: ['Quel est le signe de cette expression ?'],
					expressions: ['&1(x[+_&2_])^2[+_&3_]'],
					variables: [
						{
							'&1': '$e[2;5]',
							'&2': '$er[1;5]',
							'&3': '$e[1;5]',
						},
						{
							'&1': '-$e[2;5]',
							'&2': '$er[1;5]',
							'&3': '-$e[1;5]',
						},
						{
							'&1': '$er[2;5]',
							'&2': '$er[1;5]',
							'&3': '-{abs(&1)/(&1)}*$e[1;5]',
						},
					],
					solutions: [[0], [1], [2]],
					choices: [
						[
							{ text: 'positif' },
							{ text: 'négatif' },
							{ text: 'son signe dépend de la valeur de $$x$$' },
						],
					],
					correctionDetails: [
						[
							{
								text: '&solution, car $$&1(x[+_&2_])^2 \\ge 0$$ et donc $$&1(x[+_&2_])^2[+_&3_] \\ge 0$$',
							},
						],
						[
							{
								text: '&solution, car $$&1(x[+_&2_])^2 \\le 0$$ et donc $$&1(x[+_&2_])^2[+_&3_] \\le 0$$',
							},
						],
						[
							{
								text: "L'expression &expression est une somme d'un nombre positif et d'un nombre négatif, &solution.",
							},
						],
					],
					options: ['no-shuffle-choices'],
					defaultDelay: 20,
					grade: PREMIERE_SPE_MATHS,
				},
				{
					description: 'Déterminer la forme canonique.',
					subdescription: 'Graphiquement',
					enounces: [
						'Quelle est la forme canonique du polynôme représenté par cette parabole ?',
					],
					images: [
						'polynome-second-degre/forme-canonique/forme-canonique-0-600.png',
						'polynome-second-degre/forme-canonique/forme-canonique-1-600.png',
						'polynome-second-degre/forme-canonique/forme-canonique-2-600.png',
						'polynome-second-degre/forme-canonique/forme-canonique-3-600.png',
						'polynome-second-degre/forme-canonique/forme-canonique-4-600.png',
						'polynome-second-degre/forme-canonique/forme-canonique-5-600.png',
						'polynome-second-degre/forme-canonique/forme-canonique-6-600.png',
						'polynome-second-degre/forme-canonique/forme-canonique-7-600.png',
						'polynome-second-degre/forme-canonique/forme-canonique-8-600.png',
						'polynome-second-degre/forme-canonique/forme-canonique-9-600.png',
						'polynome-second-degre/forme-canonique/forme-canonique-10-600.png',
						'polynome-second-degre/forme-canonique/forme-canonique-11-600.png',
						'polynome-second-degre/forme-canonique/forme-canonique-12-600.png',
						'polynome-second-degre/forme-canonique/forme-canonique-13-600.png',
						'polynome-second-degre/forme-canonique/forme-canonique-14-600.png',
					],
					imagesCorrection: [
						'polynome-second-degre/forme-canonique/correction-forme-canonique-0-600.png',
						'polynome-second-degre/forme-canonique/correction-forme-canonique-1-600.png',
						'polynome-second-degre/forme-canonique/correction-forme-canonique-2-600.png',
						'polynome-second-degre/forme-canonique/correction-forme-canonique-3-600.png',
						'polynome-second-degre/forme-canonique/correction-forme-canonique-4-600.png',
						'polynome-second-degre/forme-canonique/correction-forme-canonique-5-600.png',
						'polynome-second-degre/forme-canonique/correction-forme-canonique-6-600.png',
						'polynome-second-degre/forme-canonique/correction-forme-canonique-7-600.png',
						'polynome-second-degre/forme-canonique/correction-forme-canonique-8-600.png',
						'polynome-second-degre/forme-canonique/correction-forme-canonique-9-600.png',
						'polynome-second-degre/forme-canonique/correction-forme-canonique-10-600.png',
						'polynome-second-degre/forme-canonique/correction-forme-canonique-11-600.png',
						'polynome-second-degre/forme-canonique/correction-forme-canonique-12-600.png',
						'polynome-second-degre/forme-canonique/correction-forme-canonique-13-600.png',
						'polynome-second-degre/forme-canonique/correction-forme-canonique-14-600.png',
					],
					answerFields: ['La forme canonique est $$...$$'],
					solutions: [
						['{[_-1/2_]}(x[+_-(-2)_])^2[+_-1_]'],
						['{[_3/4_]}(x[+_-(-2)_])^2[+_-1_]'],
						['-(x[+_-(-1)_])^2[+_3_]'],
						['{[_3_]}(x[+_-(-1)_])^2[+_-2_]'],
						['{[_-5_]}(x[+_-(-1)_])^2[+_2_]'],
						['{[_4_]}(x[+_-(1)_])^2[+_-1_]'],
						['{[_1/4_]}(x[+_-(-2)_])^2[+_-2_]'],
						['{[_-3_]}(x[+_-(-1)_])^2[+_1_]'],
						['{[_-3/4_]}(x[+_-(-2)_])^2[+_2_]'],
						['-(x[+_-(2)_])^2[+_3_]'],
						['{[_4_]}(x[+_-(-1)_])^2[+_-2_]'],
						['{[_-3/4_]}(x[+_-(2)_])^2[+_1_]'],
						['-(x[+_-(-1)_])^2[+_2_]'],
						['(x[+_-(1)_])^2[+_-3_]'],
						['{[_-1/2_]}(x[+_-(2)_])^2[+_-1_]'],
					],
					correctionFormat: [
						{
							correct: ['La forme canonique est &answer.'],
						},
					],
					defaultDelay: 40,
					grade: PREMIERE_SPE_MATHS,
				},
			],
			Racines: [
				{
					description: "Vérifier si un nombre est racine d'un polynôme",
					enounces: ['Est-ce que $$&3$$ est racine de ce polynôme ?'],
					expressions: ['x^2[+_-(&1+(&2))x_][+_(&1)*(&2)_]'],
					variables: [
						{
							'&1': '$er[1;3]',
							'&2': '$er[1;3]\\{&1}',
							'&3': '$er[1;3]\\{&1;&2}',
						},
						{
							'&1': '$er[1;3]',
							'&2': '$er[1;3]\\{&1}',
							'&3': '$l{&1;&2}',
						},
					],
					choices: [[{ text: 'Oui' }, { text: 'Non' }]],
					solutions: [[1], [0]],
					correctionDetails: [
						[
							{
								text: "&solution, $$&3$$ n'est pas une racine du polynôme &expression car :",
							},
							{
								text: `$$  \\textcolor{${color1}}{[(_&3_]}^2 \
								@@ &2 + (&1) != 0  && &2 + (&1) != 1 && &2 + (&1) != -1 ?? [+_-(&1+(&2))_] \\times \\textcolor{${color1}}{[(_&3_]} @@ \
								@@   &2 + (&1) = 1 ?? -\\textcolor{${color1}}{[(_&3_]} @@ \
								@@   &2 + (&1) = -1 ?? +\\textcolor{${color1}}{[(_&3_]} @@ \
								[+_(&1)*(&2)_] = \
								[_(&3)^2_]\
								@@ &2 + (&1) != 0  && &2 + (&1) != 1 && &2 + (&1) != -1 ?? [+_-(&1+(&2))*(&3)_]  @@ \
									@@   &2 + (&1) = 1 ?? [+_-(&3)_] @@ \
									@@   &2 + (&1) = -1 ?? [+_&3_] @@ \
								[+_&1*(&2)_] = [_(&3)^2-(&1+(&2))*(&3)+(&1)*(&2)_] \\textcolor{red}{\\ne} 0$$`,
							},
						],
						[
							{
								text: '&solution, $$&3$$ est une racine du polynôme  &expression car :',
							},
							{
								text: `$$\\textcolor{${color1}}{[(_&3_]}^2 \
									@@ &2 + (&1) != 0  && &2 + (&1) != 1 && &2 + (&1) != -1 ?? [+_-(&1+(&2))_] \\times \\textcolor{${color1}}{[(_&3_]} @@ \
										@@   &2 + (&1) = 1 ?? -\\textcolor{${color1}}{[(_&3_]} @@ \
										@@   &2 + (&1) = -1 ?? +\\textcolor{${color1}}{[(_&3_]} @@ \
									[+_(&1)*(&2)_] = \
									[_(&3)^2_]\
									@@ &2 + (&1) != 0  && &2 + (&1) != 1 && &2 + (&1) != -1 ?? [+_-(&1+(&2))*(&3)_]  @@ \
									@@   &2 + (&1) = 1 ?? [+_-(&3)_] @@ \
									@@   &2 + (&1) = -1 ?? [+_&3_] @@ \
									[+_&1*(&2)_] = [_(&3)^2-(&1+(&2))*(&3)+(&1)*(&2)_]$$`,
							},
						],
					],
					options: ['remove-null-terms'],
					defaultDelay: 20,
					grade: PREMIERE_SPE_MATHS,
				},
				{
					description: "Trouver une racine évidente d'un polynôme",
					enounces: ['Trouve une racine évidente de ce polynôme :'],
					expressions: ['x^2[+_-(&1+(&2))x_][+_(&1)*(&2)_]'],
					answerFields: ['Une racine évidente est $$...$$'],
					solutions: [['&1']],
					variables: [
						{
							'&1': '$er[1;3]',
							'&2': '$er[1;3]\\{&1}',
						},
					],
					testAnswers: [['(&answer)^2-(&1+(&2))*(&answer)+(&1)*(&2)=0']],
					correctionFormat: [
						{
							correct: ['&answer est une racine évidente.'],
						},
					],
					correctionDetails: [
						[
							{
								text: '&solution est une racine évidente du polynôme &expression car :',
							},
							{
								text: `$$  \\textcolor{${color1}}{[(_&1_]}^2 \
								@@ &2 + (&1) != 0  && &2 + (&1) != 1 && &2 + (&1) != -1 ?? [+_-(&1+(&2))_] \\times \\textcolor{${color1}}{[(_&1_]} @@ \
								@@   &2 + (&1) = 1 ?? -\\textcolor{${color1}}{[(_&1_]} @@ \
								@@   &2 + (&1) = -1 ?? +\\textcolor{${color1}}{[(_&1_]} @@ \
								[+_(&1)*(&2)_] = \
								[_(&1)^2_]\
								@@ &2 + (&1) != 0  && &2 + (&1) != 1 && &2 + (&1) != -1 ?? [+_-(&1+(&2))*(&1)_]  @@ \
									@@   &2 + (&1) = 1 ?? [+_-(&1)_] @@ \
									@@   &2 + (&1) = -1 ?? [+_&1_] @@ \
								[+_&1*(&2)_] = [_(&1)^2-(&1+(&2))*(&1)+(&1)*(&2)_] $$`,
							},
						],
					],
					options: ['remove-null-terms'],
					defaultDelay: 20,
					grade: PREMIERE_SPE_MATHS,
				},
				{
					description: "Déterminer les racines d'un polynôme du second degré",
					subdescription: "A l'aide de la forme factorisée",
					enounces: [
						'Quelles sont les racines de ce polynôme du second degré ?',
					],
					expressions: ['&1(x[+_&2_])(x[+_&3_])'],
					variables: [
						{
							'&1': '$er[2;5]',
							'&2': '$er[1;5]',
							'&3': '$er[1;5]',
						},
					],
					conditions: ['abs(&2) != abs(&3)'],
					answerFields: ['Las racines sont $$...$$ et $$...$$'],
					solutions: [['[_-(&2)_]', '[_-(&3)_]']],
					correctionFormat: [
						{
							correct: [
								'Les racines sont &answer1 et &answer2',
							],
						},
					],
					options: ['solutions-order-not-important'],
					defaultDelay: 20,
					grade: PREMIERE_SPE_MATHS,
				},
				{
					description: "Déterminer les racines d'un polynôme du second degré",
					subdescription: "Le polynôme n'est pas complètement factorisé",
					enounces: [
						'Quelles sont les racines de ce polynôme du second degré ?',
					],
					expressions: [
						'(&1x[+_&1*(&2)_])(x[+_&3_])',
						'(x[+_&2_])(&1x[+_&1*(&3)_])',
					],
					variables: [
						{
							'&1': '$er[2;5]',
							'&2': '$er[1;5]',
							'&3': '$er[1;5]',
						},
					],
					conditions: ['abs(&2) != abs(&3)'],
					answerFields: ['Las racines sont $$...$$ et $$...$$'],
					solutions: [['[_-(&2)_]', '[_-(&3)_]']],
					correctionFormat: [
						{
							correct: ['Les racines sont &answer1 et &answer2'],
						},
					],
					correctionDetails: [
						[
							{ text: "Le polynôme n'est <b>pas</b> sous forme factorisée. " },
							{
								text: 'La forme factorisée est $$&1(x[+_&2_])(x[+_&3_])$$, les racines sont donc &solution1 et &solution2',
							},
						],
					],
					options: ['solutions-order-not-important'],
					defaultDelay: 20,
					grade: PREMIERE_SPE_MATHS,
				},
			],
			'Vrai ou Faux': [
				{
					description: 'Vrai ou Faux sur les polynômes du second degré',
					enounces: [
						"La courbe représentative d'un polynôme du second degré est une droite.",
						'Un polynôme du second degré peut ne pas avoir de racine.',
						"Un polynôme du second degré peut n'avoir qu'une seule racine.",
						'Un polynôme du second degré a au maximum deux racines.',
						'La forme factorisée permet de trouver les racines du polynôme.',
						'La forme canonique permet de trouver les coordonnées du sommet de la parabole.',
						"La courbe représentative d'un polynôme du second degré admet un axe de symétrie.",
					],
					variables: [],
					choices: [[{ text: 'Vrai' }, { text: 'Faux' }]],
					solutions: [[1], [0], [0], [0], [0], [0], [0]],
					correctionDetails: [
						[
							{
								text: "&solution, la courbe représentative d'un polynôme du second degré est une parabole.",
							},
						],
						[
							{
								text: "&solution, c'est le cas lorsque la courbe représentative ne coupe ni ne touche l'axe des abscisses. Le discriminant est alors négatif.",
							},
						],
						[
							{
								text: "&solution, c'est le cas lorsque la courbe représentative touche l'axe des abscisses sans le traverser. Le discriminant est alors nul.",
							},
						],
						[
							{
								text: "&solution, c'est le nombre de fois maximum où la courbe représentative peut couper l'axe des abscisses. Le discriminant est alors positif.",
							},
						],
						[
							{
								text: '&solution, dans la forme factorisée $$a(x-x_1)(x-x_2)$$, les racines sont $$x_1$$ et $$x_2$$.',
							},
						],
						[
							{
								text: '&solution, dans la forme canonique $$a(x-\\alpha)^2+\\beta$$, les coordonnées du sommet de la parabole sont $$(\\alpha; \\beta)$$.',
							},
						],
						[
							{
								text: '&solution, la courbe représentative admet un axe de symétrie passant par le sommet de la parabole.',
							},
						],
					],
					options: ['no-shuffle-choices'],
					defaultDelay: 20,
					grade: PREMIERE_SPE_MATHS,
				},
			],
		},
	},

	Suites: {
		Apprivoiser: {
			'Calculer un terme': [
				{
					description: 'Calculer un terme',
					subdescription: "A l'aide d'une formule explicite",
					enounces: [
						'Calcule $$u_&1$$ pour la suite $$(u_n)$$ définie par $$u_n=&2n[+_&3_]$$ pour $$n \\ge 0$$',
						'Calcule $$u_&1$$ pour la suite $$(u_n)$$ définie par $$u_n=&2n^2$$ pour $$n \\ge 0$$',
						'Calcule $$u_&1$$ pour la suite $$(u_n)$$ définie par $$u_n=(-1)^n$$ pour $$n  \\ge 0$$',
					],
					solutions: [['[_&2*&1+(&3)_]'], ['[_&2*&1^2_]'], ['[_(-1)^&1_]']],
					variables: [
						{
							'&1': '$e[2;9]',
							'&2': '$er[2;9]',
							'&3': '$er[2;9]',
						},
						{
							'&1': '$e[3;7]',
							'&2': '$l{2;-2}',
						},
						{
							'&1': '$e[2;9]',
						},
					],
					correctionFormat: [
						{
							correct: ['$$u_&1=&ans$$'],
						},
					],

					correctionDetails: [
						[
							{
								text: `Avec $$u_n=&2n[+_&3_]$$, $$u_\\textcolor{${color1}}{&1}=&2 \\times \\textcolor{${color1}}{&1} [+_&3_]=&sol$$`,
							},
						],
						[
							{
								text: `Avec $$u_n=&2n^2$$, $$u_\\textcolor{${color1}}{&1}=&2 \\times \\textcolor{${color1}}{&1}^2=&sol$$`,
							},
						],
						[
							{
								text: `Avec $$u_n=(-1)^&1$$, $$u_\\textcolor{${color1}}{&1}=(-1)^\\textcolor{${color1}}{&1}=&sol$$`,
							},
						],
					],

					defaultDelay: 30,
					grade: PREMIERE_SPE_MATHS,
				},
				{
					description: 'Calculer un terme',
					subdescription: "A l'aide d'une formule de récurrence",
					enounces: [
						'Calculer $$u_1$$ pour la suite $$(u_n)$$ définie par $$u_0=&1$$ et $$u_{n+1}=&2u_n[+_&3_]$$',
					],
					solutions: [['&4']],
					variables: [
						{
							'&1': '$er[2;5]',
							'&2': '$er[2;3]',
							'&3': '$er[1;3]',
							'&4': '[_&2*(&1)+(&3)_]',
						},
					],
					correctionFormat: [
						{
							correct: ['$$u_1=&ans$$'],
						},
					],

					correctionDetails: [
						[
							{
								text: `Avec $$u_0=&1$$ et $$u_{n+1}=&2u_n[+_&3_]$$`,
							},
							{
								text: `$$u_1=&2u_0[+_&3_]= &2 \\times [(_&1_] [+_&3_]=$$&solution`,
							},
						],
					],
					defaultDelay: 30,
					grade: PREMIERE_SPE_MATHS,
				},
				{
					description: 'Calculer un terme',
					subdescription: "A l'aide d'une formule de récurrence",
					enounces: [
						'Calculer $$u_2$$ pour la suite $$(u_n)$$ définie par $$u_0=&1$$ et $$u_{n+1}=&2u_n[+_&3_]$$',
					],
					solutions: [['&5']],
					variables: [
						{
							'&1': '$er[2;5]',
							'&2': '$er[2;3]',
							'&3': '$er[1;3]',
							'&4': '[_&2*(&1)+(&3)_]',
							'&5': '[_&2*(&4)+(&3)_]',
						},
					],
					correctionFormat: [
						{
							correct: [`$$u_2=&ans$$`],
						},
					],

					correctionDetails: [
						[
							{
								text: `Avec $$u_0=&1$$ et $$u_{n+1}=&2u_n[+_&3_]$$`,
							},
							{
								text: `$$u_1=&2u_0[+_&3_]= &2 \\times [(_&1_] [+_&3_]=\\textcolor{${color1}}{&4}$$`,
							},
							{
								text: `$$u_2=&2u_1[+_&3_]= &2 \\times \\textcolor{${color1}}{[(_&4_]} [+_&3_]=$$&solution`,
							},
						],
					],
					defaultDelay: 30,
					grade: PREMIERE_SPE_MATHS,
				},
			],
			'Deviner le terme général': [
				{
					description:
						"Deviner le terme général à partir d'une liste des premiers termes",
					subdescription: 'Suite arithmétique',
					enounces: [
						'Quel semble être le terme général de la suite dont les premiers termes sont:',
					],
					enounces2: ['$$&3 \\quad &4 \\quad &5 \\quad &6 \\quad &7$$'],
					solutions: [['&1[+_&2_]n']],
					answerFields: ['$$u_n=?$$'],
					variables: [
						{
							'&1': '$er[2;9]',
							'&2': '$er[2;9]',
							'&3': '[_&1_]',
							'&4': '[_&1+(&2)_]',
							'&5': '[_&1+(&2)*2_]',
							'&6': '[_&1+(&2)*3_]',
							'&7': '[_&1+(&2)*4_]',
						},
					],

					correctionFormat: [
						{
							correct: [`$$u_n=$$&answer`],
						},
					],

					correctionDetails: [
						[
							{
								text: `@@ &2>=0 ?? Le premier terme de la suite est $$u_0=&3$$ et on ajoute $$&2$$ entre chaque terme, donc $$u_n=$$&solution.@@ \
								@@ &2<0 ?? Le premier terme de la suite est $$u_0=&3$$ et on enlève $$[_-(&2)_]$$ entre chaque terme, donc $$u_n=$$&solution.@@`,
							},
						],
					],
					defaultDelay: 30,
					grade: PREMIERE_SPE_MATHS,
				},
				{
					description:
						"Deviner le terme général à partir d'une liste des premiers termes",
					subdescription: 'Suite géométrique',
					enounces: [
						'Quel semble être le terme général de la suite dont les premiers termes sont:',
					],
					enounces2: ['$$&3 \\quad &4 \\quad &5 \\quad &6 \\quad &7$$'],
					solutions: [['[_&1*(&2)^n_]']],
					answerFields: ['$$u_n=?$$'],
					variables: [
						{
							'&1': '$er[1;4]',
							'&2': '$er[2;3]',
							'&3': '[_&1_]',
							'&4': '[_&1*(&2)_]',
							'&5': '[_&1*(&2)^2_]',
							'&6': '[_&1*(&2)^3_]',
							'&7': '[_&1*(&2)^4_]',
						},
					],
					conditions: ['abs(&1) != abs(&2)'],
					correctionFormat: [
						{
							correct: ['$$u_n=$$&answer'],
						},
					],

					correctionDetails: [
						[
							{
								text: `Le premier terme de la suite est $$u_0=&3$$ et on multiplie par $$[°&2°]$$ entre chaque terme, donc $$u_n=$$&solution.`,
							},
						],
					],
					defaultDelay: 30,
					grade: PREMIERE_SPE_MATHS,
				},
				{
					description:
						"Deviner le terme général à partir d'une liste des premiers termes",
					subdescription: 'Suite géométrique - raison fractionnaire',
					enounces: [
						'Quel semble être le terme général de la suite dont les premiers termes sont:',
					],
					enounces2: [
						'$$&4$$' +
							'  ' +
							'$$&5$$' +
							'  ' +
							'$$&6$$' +
							'  ' +
							'$$&7$$' +
							'  ' +
							'$$&8$$',
					],
					solutions: [['&1*(&3)^n']],
					answerFields: ['$$u_n=?$$'],
					variables: [
						{
							'&1': '$er[2;9]',
							'&2': '$er[2;5]\\{cd(&1)}',
							'&3': '[_1/(&2)_]',
							'&4': '[_&1_]',
							'&5': '[_&1*(&3)_]',
							'&6': '[_&1*(&3)^2_]',
							'&7': '[_&1*(&3)^3_]',
							'&8': '[_&1*(&3)^4_]',
						},
					],
					correctionFormat: [
						{
							correct: ['Le terme général est $$u_n=&ans$$'],
						},
					],

					correctionDetails: [
						[
							{
								text: `Le premier terme de la suite est $$u_0=&4$$ et on multiplie par $$[°&3°]$$ entre chaque terme, donc $$u_n=$$&solution.`,
							},
						],
					],
					defaultDelay: 30,
					grade: PREMIERE_SPE_MATHS,
				},
			],
		},
		Limites: {
			'Determiner une limite': [
				{
					description: "Déterminer la limite d'une suite",
					subdescription: 'Suites usuelles',
					enounces: [
						'Quelle est la limite de la suite dont le terme général est :',
					],
					expressions: [
						'(-1)^n',
						'&1',
						'n',
						'n^&4',
						'sqrt(n)',
						'1/n',
						'1/n^&4',
						'[(_&2_]^n',
						'([_1/(&2)_])^n',
						'&3^n',
					],
					choices: [
						[
							{
								text: '$$+\\infin$$',
							},
							{
								text: '$$-\\infin$$',
							},
							{
								text: '$$1$$',
							},
							{
								text: '$$-1$$',
							},
							{
								text: "Cette suite n'a pas de limite",
							},
						],
						[
							{
								text: '$$+\\infin$$',
							},
							{
								text: '$$-\\infin$$',
							},
							{
								text: '$$&1$$',
							},
							{
								text: '$$0$$',
							},
							{
								text: "Cette suite n'a pas de limite",
							},
						],
						[
							{
								text: '$$+\\infin$$',
							},
							{
								text: '$$-\\infin$$',
							},
							{
								text: '$$1$$',
							},
							{
								text: '$$0$$',
							},
							{
								text: "Cette suite n'a pas de limite",
							},
						],
						[
							{
								text: '$$+\\infin$$',
							},
							{
								text: '$$-\\infin$$',
							},
							{
								text: '$$1$$',
							},
							{
								text: '$$0$$',
							},
							{
								text: "Cette suite n'a pas de limite",
							},
						],
						[
							{
								text: '$$+\\infin$$',
							},
							{
								text: '$$-\\infin$$',
							},
							{
								text: '$$1$$',
							},
							{
								text: '$$0$$',
							},
							{
								text: "Cette suite n'a pas de limite",
							},
						],
						[
							{
								text: '$$+\\infin$$',
							},
							{
								text: '$$-\\infin$$',
							},
							{
								text: '$$1$$',
							},
							{
								text: '$$0$$',
							},
							{
								text: "Cette suite n'a pas de limite",
							},
						],
						[
							{
								text: '$$+\\infin$$',
							},
							{
								text: '$$-\\infin$$',
							},
							{
								text: '$$1$$',
							},
							{
								text: '$$0$$',
							},
							{
								text: "Cette suite n'a pas de limite",
							},
						],
						[
							{
								text: '$$+\\infin$$',
							},
							{
								text: '$$-\\infin$$',
							},
							{
								text: '$$1$$',
							},
							{
								text: '$$0$$',
							},
							{
								text: "Cette suite n'a pas de limite",
							},
						],
						[
							{
								text: '$$+\\infin$$',
							},
							{
								text: '$$-\\infin$$',
							},
							{
								text: '$$1$$',
							},
							{
								text: '$$0$$',
							},
							{
								text: "Cette suite n'a pas de limite",
							},
						],
						[
							{
								text: '$$+\\infin$$',
							},
							{
								text: '$$-\\infin$$',
							},
							{
								text: '$$1$$',
							},
							{
								text: '$$0$$',
							},
							{
								text: "Cette suite n'a pas de limite",
							},
						],
					],
					solutions: [
						[4],
						[2],
						[0],
						[0],
						[0],
						[3],
						[3],
						['&2>0 ?? 0 :: 4'],
						[3],
						[3],
					],
					variables: [
						{
							'&1': '$er[1;9]',
							'&2': '$er[2;9]',
							'&3': '$d{0;1}',
							'&4': '$e[2;9]',
						},
					],
					correctionFormat: [
						{
							correct: ['&answer'],
							answer: '&answer',
						},
						{
							correct: ['La limite est &answer'],
							answer: '&answer',
						},
						{
							correct: ['La limite est &answer'],
							answer: '&answer',
						},
						{
							correct: ['La limite est &answer'],
							answer: '&answer',
						},
						{
							correct: ['La limite est &answer'],
							answer: '&answer',
						},
						{
							correct: ['La limite est &answer'],
							answer: '&answer',
						},
						{
							correct: ['La limite est &answer'],
							answer: '&answer',
						},
						{
							correct: [
								'@@ &2>0 ?? La limite est &answer @@',
								'@@ &2<0 ?? &answer @@',
							],
							answer: '&answer',
						},
						{
							correct: ['La limite est &answer'],
							answer: '&answer',
						},
						{
							correct: ['La limite est &answer'],
							answer: '&answer',
						},
					],
					correctionDetails: [
						[
							{
								text: 'La suite de terme général &expression oscille entre les valeurs $$1$$ et $$-1$$ : &solution.',
							},
						],
						[
							{
								text: 'La suite de terme général &expression est constante donc sa limite est &solution.',
							},
						],
						[],
						[],
						[],
						[],
						[],
						[],
						[
							{
								text: '$$-1<[_1/(&2)_]<1$$ donc la limite est $$0$$.',
							},
						],
						[],
					],
					options: ['no-shuffle-choices'],
					defaultDelay: 30,
					grade: PREMIERE_SPE_MATHS,
				},
				{
					description: "Déterminer la limite d'une suite",
					subdescription: 'En utilisant les règles de calcul sur les limites',
					enounces: ['Quelle est la limite obtenue ?'],
					enounces2: [
						'$$\\frac{\\infin}{\\infin}$$',

						'$$\\frac{0}{\\infin}$$',

						'$$\\frac{+\\infin}{\\O^+}$$',
						'$$\\frac{-\\infin}{\\O^+}$$',
						'$$\\frac{+\\infin}{\\O^-}$$',
						'$$\\frac{-\\infin}{\\O^-}$$',

						'$$\\frac{&1}{+\\infin}$$',
						'$$\\frac{-&1}{+\\infin}$$',
						'$$\\frac{&1}{-\\infin}$$',
						'$$\\frac{-&1}{-\\infin}$$',

						'$$\\frac{+\\infin}{&1}$$',
						'$$\\frac{+\\infin}{-&1}$$',
						'$$\\frac{-\\infin}{&1}$$',
						'$$\\frac{-\\infin}{-&1}$$',

						'$$\\infini\\times 0$$',
						'$$+\\infini \\times \\left( +\\infini  \\right)$$',
						'$$+\\infini \\times \\left( -\\infini \\right)$$',
						'$$-\\infini \\times \\left( -\\infini \\right)$$',
						'$$-\\infini \\times \\left( +\\infini \\right)$$',

						'$$&1 \\times \\left( +\\infini  \\right)$$',
						'$$&1 \\times \\left( -\\infini \\right)$$',
						'$$-&1 \\times \\left( -\\infini \\right)$$',
						'$$-&1 \\times \\left( +\\infini \\right)$$',

						'$$+\\infini + \\left( +\\infini \\right)$$',
						'$$+\\infini + \\left( -\\infini \\right)$$',
						'$$-\\infini + \\left( -\\infini \\right)$$',
						'$$-\\infini + \\left( +\\infini \\right)$$',
						'$$+\\infini - \\left( +\\infini \\right)$$',
						'$$+\\infini - \\left( -\\infini \\right)$$',
						'$$-\\infini - \\left( -\\infini \\right)$$',
						'$$-\\infini - \\left( +\\infini \\right)$$',
						'$$+\\infini[+_&1_]$$',
						'$$+\\infini[+_&1_]$$',
						'$$-\\infini[+_&1_]$$',
						'$$-\\infini[+_&1_]$$',
					],
					choices: [
						[
							{
								text: '$$+\\infin$$',
							},
							{
								text: '$$-\\infin$$',
							},
							{
								text: '$$0$$',
							},
							{
								text: 'Forme indéterminée',
							},
						],

						[
							{
								text: '$$+\\infin$$',
							},
							{
								text: '$$-\\infin$$',
							},
							{
								text: '$$0$$',
							},
							{
								text: 'Forme indéterminée',
							},
						],

						[
							{
								text: '$$+\\infin$$',
							},
							{
								text: '$$-\\infin$$',
							},
							{
								text: '$$0$$',
							},
							{
								text: 'Forme indéterminée',
							},
						],
						[
							{
								text: '$$+\\infin$$',
							},
							{
								text: '$$-\\infin$$',
							},
							{
								text: '$$0$$',
							},
							{
								text: 'Forme indéterminée',
							},
						],
						[
							{
								text: '$$+\\infin$$',
							},
							{
								text: '$$-\\infin$$',
							},
							{
								text: '$$0$$',
							},
							{
								text: 'Forme indéterminée',
							},
						],
						[
							{
								text: '$$+\\infin$$',
							},
							{
								text: '$$-\\infin$$',
							},
							{
								text: '$$0$$',
							},
							{
								text: 'Forme indéterminée',
							},
						],
					],
					solutions: [[3]],
					variables: [
						{
							'&1': '$er[1;9]',
							'&2': '$e[2;9]',
						},
					],
					correctionFormat: [
						{
							correct: ['&answer'],
							answer: '&answer',
						},
					],
					options: ['no-shuffle-choices'],
					defaultDelay: 30,
					grade: TERMINALE_SPE_MATHS,
				},
			],
		},
		'Suites arithmétiques': {
			'Calculer un terme': [
				{
					description: "Calculer un terme d'une suite arithmétique",
					subdescription: 'Calculer le terme suivant',
					enounces: [
						'Pour une suite arithmétique de raison &1, quel est le terme suivant &2 ?',
					],
					solutions: [['[_&1+(&2)_]']],
					variables: [
						{
							'&1': '$er[1;9]',
							'&2': '$er[2;9]',
						},
					],

					correctionFormat: [
						{
							correct: [
								'Si la raison est $$&1$$, le terme suivant &2 est &answer',
							],
							answer: 'Le terme suivant est &answer',
						},
					],
					correctionDetails: [
						[
							{
								text: 'Si la raison est $$&1$$, le terme suivant est $$&2[+_&1_]=$$&solution',
							},
						],
					],
					defaultDelay: 30,
					grade: PREMIERE_SPE_MATHS,
				},
				{
					description: "Calculer un terme d'une suite arithmétique",
					subdescription: 'Calculer le terme précédent',
					enounces: [
						'Pour une suite arithmétique de raison &1, quel est le terme précédant &2 ?',
					],
					solutions: [['[_&2-(&1)_]']],
					variables: [
						{
							'&1': '$er[1;9]',
							'&2': '$er[2;9]',
						},
					],

					correctionFormat: [
						{
							correct: [
								'Si la raison est $$&1$$, le terme précédant &2 est &answer',
							],
							answer: 'Le terme précédent est &answer',
						},
					],
					correctionDetails: [
						[
							{
								text: 'Si la raison est $$&1$$, le terme précédent est $$&2[+_-(&1)_]=$$&solution',
							},
						],
					],
					defaultDelay: 30,
					grade: PREMIERE_SPE_MATHS,
				},
				{
					description: "Calculer un terme d'une suite arithmétique",
					subdescription: "Calculer un terme à partir d'un autre",
					enounces: [
						'Pour une suite $$(u_n)$$ arithmétique de raison $$&3$$, que vaut $$u_&2$$ si $$u_&1=[_&1*(&3)_]$$ ?',
					],
					solutions: [['[_&2*(&3)_]']],
					variables: [
						{
							'&1': '$e[1;8]',
							'&2': '$e[&1+1;9]',
							'&3': '$er[2;9]\\{&1}',
						},
					],

					correctionFormat: [
						{
							correct: [
								'Si la raison est $$&3$$ et $$u_&1=[_&1*(&3)_]$$, alors $$u_&2=$$&answer',
							],
							answer: '$$u_&2=$$&answer',
						},
					],
					correctionDetails: [
						[
							{
								text: `Si la raison est $$\\textcolor{${color1}}{&3}$$ et $$u_&1=[_&1*(&3)_]$$, alors $$u_&2=u_&1\\textcolor{${color1}}{[+_&3_]} \\times [_&2-&1_]=u_&1[+_(&2-&1)*(&3)_]=$$&solution`,
							},
						],
					],
					defaultDelay: 30,
					grade: PREMIERE_SPE_MATHS,
				},
				{
					description: "Calculer un terme d'une suite arithmétique",
					subdescription: "Calculer un terme à partir d'un autre",
					enounces: [
						'Pour une suite $$(u_n)$$ arithmétique de raison $$&3$$, que vaut $$u_&2$$ si $$u_&1=[_&1*(&3)_]$$ ?',
					],
					solutions: [['[_&2*(&3)_]']],
					variables: [
						{
							'&1': '$e[1;8]',
							'&2': '$e[&1+1;9]',
							'&3': '$er[2;9]\\{&1}',
						},
					],

					correctionFormat: [
						{
							correct: [
								'Si la raison est $$&3$$ et $$u_&1=[_&1*(&3)_]$$, alors $$u_&2=$$&answer',
							],
							answer: '$$u_&2=$$&answer',
						},
					],
					correctionDetails: [
						[
							{
								text: `Si la raison est $$\\textcolor{${color1}}{&3}$$ et $$u_&1=[_&1*(&3)_]$$, alors $$u_&2=u_&1\\textcolor{${color1}}{[+_&3_]} \\times [_&2-&1_]=u_&1[+_(&2-&1)*(&3)_]=$$&solution`,
							},
						],
					],
					defaultDelay: 30,
					grade: PREMIERE_SPE_MATHS,
				},
			],
			'Determiner la raison': [
				{
					description: "Déterminer la raison d'une suite arithmétique",
					subdescription: 'A partir de deux termes consécutifs',
					enounces: [
						"Quelle est la raison d'une suite arithmétique où $$u_&1=&3$$ et $$u_&2=[_&3+(&4)_]$$ ?",
					],
					solutions: [['&4']],
					variables: [
						{
							'&1': '$e[1;8]',
							'&2': '[_&1+1_]',
							'&3': '$er[2;9]',
							'&4': '$er[2;9]',
						},
					],

					correctionFormat: [
						{
							correct: [
								'Si $$u_&1=&3$$ et $$u_&2=[_&3+(&4)_]$$, alors la raison est &answer.',
							],
							answer: 'La raison est &answer.',
						},
					],
					correctionDetails: [
						[
							{
								text: 'Si $$u_&1=&3$$ et $$u_&2=[_&3+(&4)_]$$, alors la raison est $$[_&3+(&4)_]-[(_&3_]$$=&solution.',
							},
						],
					],
					defaultDelay: 30,
					grade: PREMIERE_SPE_MATHS,
				},
				{
					description: "Déterminer la raison d'une suite arithmétique",
					subdescription: 'A partir de deux termes',
					enounces: [
						"Quelle est la raison d'une suite arithmétique où $$u_&1=&3$$ et $$u_&2=[_&3+(&2-&1)*(&4)_]$$ ?",
					],
					solutions: [['&4']],
					variables: [
						{
							'&1': '$e[1;5]',
							'&2': '$e[&1+2;9]',
							'&3': '$er[2;9]',
							'&4': '$er[2;9]',
						},
					],

					correctionFormat: [
						{
							correct: [
								'Si $$u_&1=&3$$ et $$u_&2=[_&3+(&2-&1)*(&4)_]$$, alors la raison est &answer.',
							],
							answer: 'La raison est &answer.',
						},
					],
					correctionDetails: [
						[
							{
								text: 'Si $$u_&1=&3$$ et $$u_&2=[_&3+(&2-&1)*(&4)_]$$, alors la raison est $$\\frac{[_&3+(&2-&1)*(&4)_]-[(_&3_]}{[_&2-&1_]}$$=&solution.',
							},
						],
					],
					defaultDelay: 30,
					grade: PREMIERE_SPE_MATHS,
				},
			],
		},
	},
}

const questionsWithID = {}
const ids = {}
const themes = Object.getOwnPropertyNames(questions)

themes.forEach((theme, t_id) => {
	questionsWithID[theme] = {}

	let domains = Object.getOwnPropertyNames(questions[theme])
	domains.forEach((domain, d_id) => {
		questionsWithID[theme][domain] = {}
		let subdomains = Object.getOwnPropertyNames(questions[theme][domain])
		subdomains.forEach((subdomain, s_id) => {
			questionsWithID[theme][domain][subdomain] = []
			let qs = questions[theme][domain][subdomain]
			qs.forEach((q, q_id) => {
				const id = code[t_id] + code[d_id] + code[s_id] + code[q_id + 1]
				const newq = { ...q, id }
				// console.log(theme, domain, subdomain, q_id + 1, id)
				questionsWithID[theme][domain][subdomain].push(newq)
				ids[id] = { theme, domain, subdomain, level: q_id + 1 }
			})
		})
	})
})

export function getQuestion(theme, domain, subdomain, level) {
	// on retourne une copie car on doit modifier les questions à la volée
	return {
		...questionsWithID[theme][domain][subdomain].find(
			(q) =>
				questionsWithID[theme][domain][subdomain].indexOf(q) + 1 ===
				parseInt(level, 10),
		),
	}
}

export default { questions: questionsWithID, ids }
