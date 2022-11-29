import math from 'tinycas'
import { getLogger } from '$lib/utils'
import { createCorrection } from './correctionItem'
export const STATUS_EMPTY = 'empty'
export const STATUS_CORRECT = 'correct'
export const STATUS_INCORRECT = 'incorrect'
export const STATUS_UNOPTIMAL_FORM = 'unoptimal form'
export const STATUS_BAD_FORM = 'bad form'
export const STATUS_BAD_UNIT = 'bad unit'

let { fail, trace, info } = getLogger('correction', 'info')

// VALIDATION DES REPONSES
// 1) on regarde si il y a eu une réponse -> STATUS_EMPTY
// 2) on regarde si l'expression est valide mathématiquement -> STATUS_INCORRECT
// 3) on regarde si la réponse de l'utilisateur est équivalente à la solution -> STATUS_INCORRECT
// 4) on vérifie les contraintes (options require et no-penalty) :
//   espaces, zéros inutiles, produits implicites, parenthèses superflues,
//   signes superflus, termes nuls, facteurs nuls, facteurs égaux à 1,
//   fractions réduites, unités
//   -> STATUS_BAD_FORM ou STATUS_UNOPTIMAL_FORM
// 5) si la solution n'est pas explicitement calculable un test (testAnswer) de validation
//    peut être effectué -> STATUS_INCORRECT ou STATUS_CORRECT ou inchangé (peut deja etre STATUS_UNOPTIMAL_FORM ou STATUS_BAD_FORM)
// 6) Sinon après avoir mis en ordre les termes et facteurs, on compare strictement la réponse à la solution explicite -> STATUS_BAD_FORM ou STATUS_CORRECT
// TODO: Formats

const EMPTY_ANSWER = "Tu n'as rien répondu."
const EMPTY_MULTIPLE_ANSWERS = "Tu n'as pas tout complété."
const ZEROS =
	"<span style='color:_COLORANSWER_'>Ta réponse</span> contient un ou des zéros inutiles."
const ZEROS_MULTIPLE_ANSWERS =
	'Il y a un ou des zéros inutiles dans tes réponses :'
const FACTORE_ONE =
	"Dans <span style='color:_COLORANSWER_'>ta réponse</span>, tu peux simplifier le ou les facteurs 1."
const FACTORE_ONE_MULTIPLE_ANSWERS =
	'Il y a un ou des facteurs 1 inutiles dans tes réponses :'
const FACTORE_ZERO =
	"Tu peux simplifier <span style='color:_COLORANSWER_'>ta réponse</span> qui contient un ou des facteurs nuls."
const FACTORE_ZERO_MULTIPLE_ANSWERS =
	'Dans tes réponses, tu peux simplifier un ou des facteurs nuls.'

const NULL_TERMS =
	"<span style='color:_COLORANSWER_'>Ta réponse</span> contient un terme nul que tu peux enlever."
const NULL_TERMS_MULTIPLE_ANSWERS =
	'Il y a un ou des termes nuls que tu peux enlever dans tes réponses.'
const BRACKETS =
	"<span style='color:_COLORANSWER_'>Ta réponse</span> contient des parenthèses inutiles."
const BRACKETS_MULTIPLE_ANSWERS =
	'il y a des parenthèses inutiles dans tes réponses.'
const BRACKETS_FIRST_TERM =
	"<span style='color:_COLORANSWER_'>Ta réponse</span> contient des parenthèses inutiles en début de somme."
const SPACES =
	"Les chiffres sont mal espacés dans <span style='color:_COLORANSWER_'>ta réponse</span>."
const SPACES_MULTIPLE_ANSWERS =
	'Les chiffres sont mal espacés dans tes réponses'
const SIGNS =
	"Tu peux faire des simplifications de signes dans <span style='color:_COLORANSWER_'>ta réponse</span>."
const SIGNS_MULTIPLE_ANSWERS =
	'Tu peux faire des simplifications de signes dans tes réponses.'
const MATH_INCORRECT =
	"<span style='color:_COLORANSWER_'>Ta réponse</span> n'est pas écrite correctement."
const MATH_INCORRECT_MULTIPLE_ANSWERS =
	'Une ou plusieurs de tes réponses ne sont pas écrites correctement:'
const MATH_GLOBALLY_INCORRECT =
	"L'expression obtenue n'est pas mathématiquement correcte."
const PRODUCTS =
	"Tu peux simplifier certains symboles de multiplication dans <span style='color:_COLORANSWER_'>ta réponse</span>."
const PRODUCTS_MULTIPLE_ANSWERS =
	'Tu peux simplifier certains symboles de multiplication dans tes réponses>.'
const FRACTIONS =
	"<span style='color:_COLORANSWER_'>Ta réponse</span> contient une ou des fractions non simplifiées."

const FRACTIONS_MULTIPLE_ANSWERS =
	'Il y a une ou des fractions non simplifiées dans tes réponses.'

const BAD_FORM =
	"<span style='color:_COLORANSWER_'>Ta réponse</span> n'est pas écrite sous la forme demandée."

const BAD_FORM_MULTIPLE_ANSWERS =
	"La forme demandée n'est pas respectée dans tes réponses."

const BAD_UNIT =
	"<span style='color:_COLORANSWER_'>Ta réponse</span> n'est pas écrite avec l'unité demandée."
const BAD_UNIT_MULTIPLE_ANSWERS =
	"Tes réponses n'utilisent pas l'unité demandée."

const TERMS_PERMUTATION =
	"Dans <span style='color:_COLORANSWER_'>ta réponse</span> les termes doivent être écrits dans un certain ordre."

const TERMS_PERMUTATION_MULTIPLE_ANSWERS =
	'Les termes doivent être écrits dans un certain ordre dans tes réponses.'

const FACTORS_PERMUTATION =
	"Dans <span style='color:_COLORANSWER_'>ta réponse</span> les facteurs doivent être écrits dans un certain ordre."

const FACTORS_PERMUTATION_MULTIPLE_ANSWERS =
	'Les facteurs doivent être écrits dans un certain ordre dans tes réponses.'

const TERMS_FACTORS_PERMUTATION =
	"Dans <span style='color:_COLORANSWER_'>ta réponse</span> les termes et facteurs doivent être écrits dans un certain ordre."

const TERMS_FACTORS_PERMUTATION_MULTIPLE_ANSWERS =
	'Les termes et facteurs doivent être écrits dans un certain ordre dans tes réponses.'

const INCOMPLETE_CHOICES = "Tu n'as pas choisi toutes les bonnes réponses."

// retourne un tableau des contraintes non respectées
function checkConstraints(item) {
	const checks = [
		{
			option: ['no-penalty-for-incorrect-spaces', 'require-correct-spaces'],
			function: checkSpaces,
			com: SPACES,
			comMultipleAnswers: SPACES_MULTIPLE_ANSWERS,
			text: 'spaces',
		},
		{
			option: ['no-penalty-for-explicit-products', 'require-implicit-products'],
			function: checkProducts,
			com: PRODUCTS,
			comMultipleAnswers: PRODUCTS_MULTIPLE_ANSWERS,
			text: 'implicits products',
		},
		{
			option: [
				'no-penalty-for-extraneous-brackets',
				'require-no-extraneaous-brackets',
			],
			function: checkBrackets,
			com: BRACKETS,
			comMultipleAnswers: BRACKETS_MULTIPLE_ANSWERS,
			text: 'extraneous brackets',
		},

		// la vérifiaction pour le premiet terme se fait dans check_brackets

		// {
		//     option: [
		//         'no-penalty-for-extraneous-brackets-in-first-negative-term',
		//         'require-no-extraneaous-brackets',
		//     ],
		//     function: checkBrackets,
		//     com: BRACKETS_FIRST_TERM,
		// },
		{
			option: [
				'no-penalty-for-extraneous-zeros',
				'require-no-extraneaous-zeros',
			],
			function: checkZeros,
			com: ZEROS,
			comMultipleAnswers: ZEROS_MULTIPLE_ANSWERS,
			text: 'extraneous zeros',
		},
		{
			option: [
				'no-penalty-for-extraneous-signs',
				'require-no-extraneaous-signs',
			],
			function: checkSigns,
			com: SIGNS,
			comMultipleAnswers: SIGNS_MULTIPLE_ANSWERS,
			text: 'extraneous signs',
		},
		{
			option: ['no-penalty-for-factor-one', 'require-no-factor-one'],
			function: checkFactorsOne,
			com: FACTORE_ONE,
			comMultipleAnswers: FACTORE_ONE_MULTIPLE_ANSWERS,
			text: 'factor one',
		},
		{
			option: ['no-penalty-for-factor-zero', 'require-no-factor-zero'],
			function: checkFactorsZero,
			com: FACTORE_ZERO,
			comMultipleAnswers: FACTORE_ZERO_MULTIPLE_ANSWERS,
			text: 'factor zero',
		},
		{
			option: ['no-penalty-for-null-terms', 'require-no-null-terms'],
			function: checkNullTerms,
			com: NULL_TERMS,
			comMultipleAnswers: NULL_TERMS_MULTIPLE_ANSWERS,
			text: 'null term',
		},
		{
			option: [
				'no-penalty-for-non-reduced-fractions',
				'require-reduced-fractions',
			],
			function: checkFractions,
			com: FRACTIONS,
			comMultipleAnswers: FRACTIONS_MULTIPLE_ANSWERS,
			text: 'non reduced fraction',
		},
		{
			option: ['no-penalty-for-not-respected-unit', 'require-specific-unit'],
			function: checkUnits,
			com: BAD_UNIT,
			comMultipleAnswers: BAD_UNIT_MULTIPLE_ANSWERS,
			text: 'bad unit',
		},
	]

	// on doit checker chaque contrainte si require est positionnée ou si no-penalty n'est pas positionnée
	// (les 2 ne peuvent pas etre positionnées en même temps)
	//
	checks.forEach((check) => {
		if (!item.options.includes(check.option[0])) {
			console.log('check', check.text)
			const problematicAnswers = check.function(item)
			if (problematicAnswers.length) {
				item.unoptimals.push(check.text)
				item.coms.push(
					item.answers.length === 1 ? check.com : check.comMultipleAnswers,
				)
				problematicAnswers.forEach((i) => {
					if (i === -1) {
						console.log("i=-1")
						item.status =
							!item.options.includes(check.option[1]) &&
							item.status !== STATUS_BAD_FORM
								? STATUS_UNOPTIMAL_FORM
								: STATUS_BAD_FORM
					} else {
						console.log('item.statuss', item.statuss[i], check.option[1])
						item.statuss[i] =
							!item.options.includes(check.option[1]) &&
							item.statuss[i] !== STATUS_BAD_FORM
								? STATUS_UNOPTIMAL_FORM
								: STATUS_BAD_FORM
						console.log('item.statuss', item.statuss[i])
					}
				})
			}
		}
	})
}

function checkTermsAndFactors(item) {
	if (item.solutions) {
		let sols = item.solutions.map((solution) => math(solution))
		sols = sols.map((solution) =>
			solution
				.removeZerosAndSpaces()
				.reduceFractions()
				.simplifyNullProducts()
				.removeNullTerms()
				.removeFactorsOne()
				.removeSigns()
				.removeUnecessaryBrackets()
				.removeMultOperator(),
		)

		item.answers.forEach((answer, i) => {
			if (
				item.statuss[i] !== STATUS_EMPTY &&
				item.statuss[i] !== STATUS_INCORRECT
			) {
				let e = math(answer)

				// Les tests de contraintes ont été faits. Il faut simplifier la réponse pour pouvoir
				// la comparer à la solution : on enlève les parenthèses inutiles, les signes inutiles....
				e = e
					.removeZerosAndSpaces()
					.reduceFractions()
					.simplifyNullProducts()
					.removeNullTerms()
					.removeFactorsOne()
					.removeSigns()
					.removeUnecessaryBrackets()
					.removeMultOperator()

				// item.cleanedExp = e.string
				// item.cleanedSolutions = sols.map((s) => s.string)
				// }

				if (
					item.options.includes('disallow-terms-and-factors-permutation') ||
					item.options.includes('penalty-for-terms-and-factors-permutation')
				) {
					if (!sols[i].strictlyEquals(e)) {
						if (
							item.options.includes(
								'penalty-for-terms-and-factors-permutation',
							) &&
							item.statuss[i] !== STATUS_BAD_FORM &&
							item.statuss[i] !== STATUS_BAD_UNIT
						) {
							item.unoptimals.push('terms and factors unordered')
							item.statuss[i] = STATUS_UNOPTIMAL_FORM
							item.coms.push(
								item.answers.length === 1
									? TERMS_FACTORS_PERMUTATION
									: TERMS_FACTORS_PERMUTATION_MULTIPLE_ANSWERS,
							)
						} else {
							item.statuss[i] = STATUS_BAD_FORM
							item.coms.push(
								item.answers.length === 1
									? BAD_FORM
									: BAD_FORM_MULTIPLE_ANSWERS,
							)
						}
					}
				} else if (
					item.options.includes('disallow-terms-permutation') ||
					item.options.includes('penalty-for-terms-permutation')
				) {
					e = e.sortFactors()
					sols = sols.map((solution) => solution.sortFactors())
					if (!sols[i].strictlyEquals(e)) {
						if (
							item.options.includes('penalty-for-terms-permutation') &&
							item.statuss[i] !== STATUS_BAD_FORM &&
							item.statuss[i] !== STATUS_BAD_UNIT
						) {
							item.unoptimals.push('terms unordered')
							item.statuss[i] = STATUS_UNOPTIMAL_FORM
							item.coms.push(
								item.answers.length === 1
									? TERMS_PERMUTATION
									: TERMS_PERMUTATION_MULTIPLE_ANSWERS,
							)
						} else {
							item.statuss[i] = STATUS_BAD_FORM
							item.coms.push(
								item.answers.length === 1
									? BAD_FORM
									: BAD_FORM_MULTIPLE_ANSWERS,
							)
						}
					}
				} else if (
					item.options.includes('disallow-factors-permutation') ||
					item.options.includes('penalty-for-factors-permutation')
				) {
					e = e.sortTerms()
					sols = sols.map((solution) => solution.sortTerms())
					if (!sols[i].strictlyEquals(e)) {
						if (
							item.options.includes('penalty-for-factors-permutation') &&
							item.statuss[i] !== STATUS_BAD_FORM &&
							item.statuss[i] !== STATUS_BAD_UNIT
						) {
							item.unoptimals.push('factors unordered')
							item.statuss[i] = STATUS_UNOPTIMAL_FORM
							item.coms.push(
								item.answers.length === 1
									? FACTORS_PERMUTATION
									: FACTORS_PERMUTATION_MULTIPLE_ANSWERS,
							)
						} else {
							item.statuss[i] = STATUS_BAD_FORM
							item.coms.push(
								item.answers.length === 1
									? BAD_FORM
									: BAD_FORM_MULTIPLE_ANSWERS,
							)
						}
					}
				}
			}
		})
	}
}

function checkUnits(item) {
	const result = []
	if (item.unit) {
		item.answers.forEach((answer, i) => {
			if (
				item.statuss[i] !== STATUS_EMPTY &&
				item.statuss[i] !== STATUS_INCORRECT
			) {
				const e = math(answer)

				if (
					(item.unit === 'HMS' && !e.isTime()) ||
					(item.unit !== 'HMS' && !e.unit) ||
					(item.unit !== 'HMS' && e.unit.string !== item.unit)
				)
					result.push(i)
			}
		})
	}

	return result
}

function checkProducts(item) {
	const result = []
	item.answers.forEach((answer, i) => {
		if (
			item.statuss[i] !== STATUS_EMPTY &&
			item.statuss[i] !== STATUS_INCORRECT
		) {
			const e = math(answer)
			console.log('checkProducts', e.string)
			if (e.removeMultOperator().string !== e.string) result.push(i)
		}
	})
	return result
}

function checkFractions(item) {
	const result = []
	item.answers.forEach((answer, i) => {
		if (
			item.statuss[i] !== STATUS_EMPTY &&
			item.statuss[i] !== STATUS_INCORRECT
		) {
			const e = math(answer)
			if (e.reduceFractions().string !== e.string) result.push(i)
		}
	})
	return result
}

function checkNullTerms(item) {
	const result = []
	item.answers.forEach((answer, i) => {
		if (
			item.statuss[i] !== STATUS_EMPTY &&
			item.statuss[i] !== STATUS_INCORRECT
		) {
			const e = math(answer)
			if (e.removeNullTerms().string !== e.string) result.push(i)
		}
	})
	return result
}

function checkBrackets(item) {
	const result = []
	const allowBracketsInFirstNegativeTerm = item.options.includes(
		'no-penalty-for-extraneous-brackets-in-first-negative-term',
	)

	if (item.type === 'fill in' && item.expression && !item.answerFields) {
		let i = -1
		const putAnswers = () => {
			i++
			return item.answers[i]
		}

		const exp = math(item.expression.replace(/\?/g, putAnswers))
		console.log('exp', exp.removeUnecessaryBrackets(allowBracketsInFirstNegativeTerm).string, exp.string)
		if (
			exp.removeUnecessaryBrackets(allowBracketsInFirstNegativeTerm).string !==
			exp.string
		) {
			result.push(-1)
		}
	} else {
		item.answers.forEach((answer, i) => {
			if (
				item.statuss[i] !== STATUS_EMPTY &&
				item.statuss[i] !== STATUS_INCORRECT
			) {
				const e = math(answer)
				if (
					e.removeUnecessaryBrackets(allowBracketsInFirstNegativeTerm)
						.string !== e.string
				) {
					result.push(i)
				}
			}
		})
	}
	return result
}

function checkSigns(item) {
	const result = []
	item.answers.forEach((answer, i) => {
		if (
			item.statuss[i] !== STATUS_EMPTY &&
			item.statuss[i] !== STATUS_INCORRECT
		) {
			// pourquoi tout ce bordel déjà ??????
			const e1 = math(answer)
				.reduceFractions()
				.simplifyNullProducts()
				.removeNullTerms()
				.removeFactorsOne()
				.removeUnecessaryBrackets()
				.removeMultOperator()
				.removeSigns()
			const e2 = math(answer)
				.reduceFractions()
				.simplifyNullProducts()
				.removeNullTerms()
				.removeFactorsOne()
				.removeUnecessaryBrackets()
				.removeMultOperator()
			// il faut enlever les * inutiles
			// console.log('check signs', e1.string, e2.string, e1.string === e2.string)
			if (e1.string !== e2.string) result.push(i)
		}
	})
	return result
}

function checkFactorsOne(item) {
	const result = []
	item.answers.forEach((answer, i) => {
		if (
			item.statuss[i] !== STATUS_EMPTY &&
			item.statuss[i] !== STATUS_INCORRECT
		) {
			const e = math(answer)
			if (e.removeFactorsOne().string !== e.string) result.push(i)
		}
	})
	return result
}

function checkFactorsZero(item) {
	const result = []
	item.answers.forEach((answer, i) => {
		if (
			item.statuss[i] !== STATUS_EMPTY &&
			item.statuss[i] !== STATUS_INCORRECT
		) {
			const e = math(answer)
			if (e.simplifyNullProducts().string !== e.string) result.push(i)
		}
	})
	return result
}

// retourne true si la vérification est OK
function checkSpaces(item) {
	//  TODO: a Remplacer par searchMisplacedSpaces
	// la sortie asciimaths du mathfield ne garde pas les espaces

	const result = []
	item.answers_latex.forEach((answer, i) => {
		if (
			item.statuss[i] !== STATUS_EMPTY &&
			item.statuss[i] !== STATUS_INCORRECT
		) {
			const a = answer.replace(/\\,/g, ' ').replace('{,}', '.').trim()
			const regex = /\d+[\d\s]*(\.[\d\s]*\d+)?/g
			const matches = a.match(regex)
			const regexsInt = [
				/\d{4}/,
				/\s$/,
				/\s\d{2}$/,
				/\s\d{2}\s/,
				/\s\d$/,
				/\s\d\s/,
			]
			const regexsDec = [
				/\d{4}/,
				/^\s/,
				/^\d{2}\s/,
				/\s\d{2}\s/,
				/^\d\s/,
				/\s\d\s/,
			]
			const findIncorrectSpace = (s) => {
				let [int, dec] = s.split('.')
				// Dans le cas des entiers, il peut y a voir un espace à la fin,
				// il faut l'enlever
				int = int.trim()

				if (
					regexsInt.some((regex) => int.match(regex)) ||
					(dec && regexsDec.some((regex) => dec.match(regex)))
				) {
					return true
				}

				return false
			}
			// on a trouvé des nombres
			if (matches && matches.some(findIncorrectSpace)) {
				result.push(i)
			}
		}
	})
	return result
}

// function checkOrder() {
//     return true
// }

function checkZeros(item) {
	const result = []
	item.answers.forEach((answer, i) => {
		if (
			item.statuss[i] !== STATUS_EMPTY &&
			item.statuss[i] !== STATUS_INCORRECT
		) {
			const e = math(answer)
			if (e.searchUnecessaryZeros()) result.push(i)
		}
	})
	return result
}

function checkForm(item) {
	if (!item.testAnswer && item.solutions) {
		// const result = []
		item.answers.forEach((answer, i) => {
			if (
				item.statuss[i] !== STATUS_EMPTY &&
				item.statuss[i] !== STATUS_INCORRECT
			) {
				// A REVOIR
				let e = math(answer)
					.removeZerosAndSpaces()
					.reduceFractions()
					.simplifyNullProducts()
				if (!item.options.includes('no-penalty-for-null-terms')) {
					e = e.removeNullTerms()
				}
				e = e
					.removeFactorsOne()
					.removeSigns()
					.removeUnecessaryBrackets()
					.removeMultOperator()
					.sortTermsAndFactors()

				const indexSolution = item.options?.includes(
					'solutions-order-not-important',
				)
					? item.solutionsIndexs[i]
					: i

				// pourquoi le faire pour solutions ?
				// la solution est censé est écrite sous une forme correcte.
				// oui mais pas toujours sous sorme optimale
				let solution = math(item.solutions[indexSolution])
					.removeZerosAndSpaces()
					.reduceFractions()
					.simplifyNullProducts()
				// if (!item.options.includes('no-penalty-for-null-terms')) {
				solution = solution.removeNullTerms()
				// }
				solution = solution
					.removeFactorsOne()
					.removeSigns()
					.removeUnecessaryBrackets()
					.removeMultOperator()
					.sortTermsAndFactors()

				console.log('answer & solution', e.string, solution.string)

				// il faut trouver une autre solution quand il y a des unités
				if (!e.unit && !e.strictlyEquals(solution)) {
					item.statuss[i] = STATUS_BAD_FORM
					item.coms.push(
						item.answers.length === 1 ? BAD_FORM : BAD_FORM_MULTIPLE_ANSWERS,
					)
				}
			}
		})

		// return result
	}
}

// on évalue la réponse de l'utilisateur en donnant un statut à chaque élément de la réponse,
// ainsi qu'à la réponse globale
export function assessItem(item) {
	// console.log('correcting', item)

	// essentiellement pour les tests
	if (!item.answers_latex && item.answers) {
		item.answers_latex = item.answers.map((answer) =>
			math(answer).toLatex({ addSpaces: false }),
		)
	}

	item.options = item.options || []
	item.coms = []

	item.unoptimals = []

	// le status de la réponse globale
	item.status = STATUS_CORRECT

	if (!item.answers) {
		// mode projection en classe : pas de réponse
		item.statuss = [STATUS_EMPTY]
		item.status = STATUS_EMPTY
	} else {
		// le statut de chaque réponse si il y a plusieurs champs réponses
		// initialisée à CORRECT ou EMPTY
		item.statuss = item.answers.map((answer) =>
			((item.type === 'choice' || item.type === 'choices') &&
				answer !== '' &&
				answer >= 0) ||
			answer
				? STATUS_CORRECT
				: STATUS_EMPTY,
		)
		// si toutes les réponses sont vides, pas besoin d'aller plus loin
		if (item.statuss.every((status) => status === STATUS_EMPTY)) {
			if (item.answers) item.coms.push(EMPTY_ANSWER)
			item.status = STATUS_EMPTY
		}
		// le cas simple à traiter des réponses à choix (multiples ou non)
		else if (
			item.type === 'choice' &&
			item.solutions.toString() !== item.answers.toString()
		) {
			item.statuss = [STATUS_INCORRECT]
			item.status = STATUS_INCORRECT
		}
		// choix multiples
		else if (
			item.type === 'choices' &&
			item.solutions.toString() !== item.answers.toString()
		) {
			// on veut compter une partie des points si la ou les réponses choisies
			// sont correctes mais qu'il en manque
			item.answers.forEach((answer, i) => {
				if (!item.solutions.includes(answer)) {
					item.statuss[i] = STATUS_INCORRECT
					item.status = STATUS_INCORRECT
				}
			})
			if (item.status !== STATUS_INCORRECT) {
				item.status = STATUS_UNOPTIMAL_FORM
				item.coms.push(INCOMPLETE_CHOICES)
			}
		}
		// cas général
		else {
			if (item.statuss.some((status) => status === STATUS_EMPTY)) {
				item.coms.push(EMPTY_MULTIPLE_ANSWERS)
			}

			// On vérifie que les réponses sont écrites correctement
			// dans le cas d'une expression à trou, il faut vérifier que l'expression globale est
			// écrite correctement
			// TODO: ne faudrait-il pas mettre toutes les égalités à compléter dans un answerFields ?
			if (item.type === 'fill in') {
				let i = -1
				const putAnswers = () => {
					i++
					return item.answers[i]
				}

				// if (item.answerFields) {
				// dans ce cas c'est un answerFields qu'il faut compléter, et il correspond à une
				// expression mathématique. La différence c'est que le champs réponse peut contenir une expression
				//  qui n'est pas une expression mathématique correcte mais juste un symboel par exemple.
				// donc pas besoin de positionner item.statuss[i]

				// ENFAIT, c'est trop compliqué car l'expression est en latex
				// {
				// 	const regex = /\$\$.*?\.\.\..*?\$\$/g
				// 	const matched = item.answerFields.match(regex)
				// 	matched.forEach((match) => {
				// 		// on enlève les $$ au début et à la fin
				// 		match = match.replace(/\$\$/g, '')
				// 		const exp = match.replace(/\.\.\./g, putAnswers)
				// 		console.log('exp', exp)
				// 		if (math(exp).isIncorrect()) {
				// 			item.status = STATUS_INCORRECT
				// 			item.coms.push(
				// 				"L'expression $$" + exp + "$$ n'est pas écrite correctement.",
				// 			)
				// 		}
				// 	})
				// }
				// }
				// c'est une expression à compléter
				// else {
				if (item.expression && !item.answerFields) {
					let incorrectForm = false
					item.answers.forEach((answer, i) => {
						console.log('answer', answer)
						if (
							item.statuss[i] !== STATUS_EMPTY &&
							math(answer).isIncorrect()
						) {
							item.statuss[i] = STATUS_INCORRECT
							item.status = STATUS_INCORRECT
							incorrectForm = true
						}
					})
					const exp = math(item.expression.replace(/\?/g, putAnswers))
					if (exp.isIncorrect()) {
						item.status = STATUS_INCORRECT
						if (!incorrectForm) item.coms.push(MATH_GLOBALLY_INCORRECT)
					}
					if (incorrectForm && item.answers.length === 1) {
						item.coms.push(MATH_INCORRECT)
					} else if (incorrectForm) {
						item.coms.push(MATH_INCORRECT_MULTIPLE_ANSWERS)
					}
				}
			} else {
				item.answers.forEach((answer, i) => {
					console.log('answer', answer)
					if (item.statuss[i] !== STATUS_EMPTY && math(answer).isIncorrect()) {
						item.statuss[i] = STATUS_INCORRECT
						item.status = STATUS_INCORRECT
					}
				})
			}

			if (
				!item.statuss.every(
					(status) => status === STATUS_INCORRECT || status === STATUS_EMPTY,
				)
			) {
				// Premièrement, vérification que la ou les réponses sont seulement équivalentes à la solution
				//  ou vérifient le critère de validation
				if (item.testAnswer) {
					console.log('correction with testAnswer')
					item.answers.forEach((answer, i) => {
						if (
							(item.testAnswer[i] &&
								item.statuss[i] !== STATUS_EMPTY &&
								item.statuss[i] !== STATUS_INCORRECT) ||
							(item.statuss[0] !== STATUS_EMPTY &&
								item.statuss[0] !== STATUS_INCORRECT)
						) {
							const t = item.testAnswer[i] || item.testAnswer[0]
							const tests = t
								.replace(/&answer/g, answer)
								.replace(/,/g, '.')
								.split('&&')
							const failed = tests.some((test) => {
								const failure =
									math(test).isIncorrect() || math(test).eval().isFalse()
								return failure
							})
							if (failed) {
								item.statuss[i] = STATUS_INCORRECT
								item.status = STATUS_INCORRECT
							}
						}
					})
				}
				// les solutions sont explicites et sont dans item.solutions
				else {
					console.log('item', item)
					item.answers.forEach((answer, i) => {
						if (
							item.statuss[i] !== STATUS_EMPTY &&
							item.statuss[i] !== STATUS_INCORRECT
						) {
							if (item.options?.includes('solutions-order-not-important')) {
								if (!item.solutionsUsed) {
									item.solutionsUsed = []
								}
								if (!item.solutionsIndexs) {
									item.solutionsIndexs = {}
								}
								const index = item.solutions.findIndex(
									(solution, j) =>
										!item.solutionsUsed.includes(j) &&
										math(answer).equals(math(solution)),
								)
								if (index === -1) {
									item.statuss[i] = STATUS_INCORRECT
									item.status = STATUS_INCORRECT
								} else {
									item.solutionsUsed.push(index)
									item.solutionsIndexs[i] = index
								}
							} else if (!math(answer).equals(math(item.solutions[i]))) {
								item.statuss[i] = STATUS_INCORRECT
								item.status = STATUS_INCORRECT
							}
						}
					})
				}

				//  A ce stade,le status chaque élément de réponse est STATUS_EMPTY, STATUS_CORRECT
				// ou STATUS_INCORRECT
				// On vérifie les contraintes de formes
				checkConstraints(item)
				checkTermsAndFactors(item)
				// TODO : tester les formats
				checkForm(item)
				console.log('item after check form', item)
				if (item.status !== STATUS_EMPTY && item.status !== STATUS_INCORRECT) {
					if (item.statuss.some((status) => status === STATUS_BAD_FORM)) {
						console.log('bad form')
						item.status = STATUS_BAD_FORM
					} else if (
						item.statuss.some((status) => status === STATUS_UNOPTIMAL_FORM) ||
						(item.statuss.filter((status) => status === STATUS_EMPTY).length >
							0 &&
							item.statuss.filter((status) => status === STATUS_EMPTY).length <=
								item.statuss.length / 2)
					) {
						item.status = STATUS_UNOPTIMAL_FORM
					} else if (
						item.statuss.filter((status) => status === STATUS_EMPTY).length > 0
					) {
						item.status = STATUS_INCORRECT
					} else if (
						item.type === 'choices' &&
						item.answers &&
						item.answers.length &&
						item.answers.length >= item.solutions.length / 2 &&
						item.answers.length < item.solutions.length
					) {
						// pour les qcm ou on accorde un demi point si au moins la moitié des bonnes
						//  ont été sélectionnées (sans erreur à côté)
						item.status = STATUS_UNOPTIMAL_FORM
					}
				}
			}
		}
	}
	console.log('assessed item', item)
	createCorrection(item)
}
