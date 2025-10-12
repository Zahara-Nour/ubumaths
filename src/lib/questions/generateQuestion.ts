import math from '@repo/tinycas'
// import emptyQuestion from './emptyQuestion'
import { getLogger, lexicoSort, shuffle } from '$lib/utils'
import {
	isVariableName,
	type AnsweredQuestion,
	type Basket,
	type Choice,
	type CorrectionDetail,
	type CorrectionFormat,
	type GeneratedQuestion,
	type Letters,
	type Option,
	type QuestionBase,
	type QuestionWithID,
	type VariableName,
	type Variables,
	type Question,
} from '../../types/type'
import { getQuestion } from './questions'
import type { Bool, Numbr } from '@repo/tinycas/dist/math/types'
import type { EvalArg } from '@repo/tinycas'
import { fetchImage } from '$lib/images'
import { questions_ids } from '$lib/questions/questions.js'
import { prepareAnsweredQuestion } from './correction'

let { warn, trace } = getLogger('generateQuestion', 'warn')

export function generateQuestionsFromBasket(basket: Basket, questions: AnsweredQuestion[]) {
	let offset = 0

	basket.forEach((q) => {
		const { theme, domain, subdomain, level } = questions_ids[q.id]
		const question = getQuestion(theme, domain, subdomain, level)
		let delay = q.delay || question.defaultDelay
		//  check that delay is a multiple of five
		const rest = delay % 5
		delay = delay + 5 - rest
		let count = q.count
		if (question.options?.includes('exhaust')) {
			const n = Math.max(
				question.choicess?.length || 0,
				question.expressions?.length || 0,
				question.expressions2?.length || 0,
				question.enounces?.length || 0,
				question.enounces2?.length || 0,
				question.variabless?.length || 0,
				question.images?.length || 0,
				question.answerFields?.length || 0,
				question.answerFormats?.length || 0,
				question.prefilleds?.length || 0,
			)
			count = Math.min(count, n)
		}

		for (let i = 0; i < count; i++) {
			const generated = generateQuestion(question, questions, count, offset)
			generated.delay = delay
			console.log('generated', generated)

			questions.push(prepareAnsweredQuestion(generated))
		}
		offset += count
	})
}
export default function generateQuestion(
	question: QuestionWithID,
	generateds: Question[] = [],
	nbquestions = 1,
	offset = 0,
) {
	let expression: string
	let expression2: string
	let rawSolutions: string[]
	let solutions: (number | string)[] = []
	let variables: Variables
	let correctionDetails: CorrectionDetail[]
	let correctionFormat: CorrectionFormat
	let choices: Choice[]
	let i: number // l'index de la question retenue parmi les différentes possibilités
	let enounce = ''
	let enounce2 = ''
	// let letters: Letters
	let testAnswers: string[]
	let image: string
	// let imageCorrection: string
	// let unit: string
	let test: string
	let tests: string[]
	let answerField: string
	let answerFormat: string
	let prefilled: string[]

	const options: Option[] = question.options || []

	// les questions de la série déjà générées

	// les regex correpondant aux expressions à évaluer
	// const regexEval = /\[([.+(]*)_([^_]*?)(_(.+?))??_\]/g
	// [._..._] : évaluation décimale
	// [+_..._] : évaluation en rajoutant un + si le résultat est positif
	// [(_..._] : évaluation en rajoutant des parenthèses au résultat
	// ['_..._] : dérivée de l'expression
	const regexEval = /\[([.+(']*)_([^_]*?)(_([^_]*))??_\]/g
	// const regexEval = /\[([.+(]*)_([^_]+)_(([^_])_)??\]/g

	// [° °] : simple mise en forme LaTeX
	const regexLatex = /\[°(.*?)°\]/g

	const replace = (matched: string, p1: string, p2: string, p3: string, p4: string) => {
		const modifiers = p1
		let e = math(p2)
		const unit = p4
		const params: EvalArg = {}

		if (e.string === 'Error') {
			throw new Error(`Error while replacing : ${matched} - ${p1} - ${p2} - ${p3} - ${p4}`)
		}

		if (modifiers.includes("'")) {
			e = e.derivate()
		} else {
			if (unit) {
				params.unit = unit.trim()
			}

			if (modifiers.includes('.')) {
				params.decimal = true
			}

			e = e.eval(params)

			if (modifiers.includes('+') && !e.isOpposite()) {
				e = e.positive()
			}

			if (modifiers.includes('(') && (e.isOpposite() || e.isPositive())) {
				e = e.bracket()
			}
		}

		return e
	}

	const replaceEval = (matched: string, p1: string, p2: string, p3: string, p4: string) => {
		const e = replace(matched, p1, p2, p3, p4)
		return e.toString({ implicit: true })
	}

	const replaceEvalLatex = (matched: string, p1: string, p2: string, p3: string, p4: string) => {
		const e = replace(matched, p1, p2, p3, p4)
		return e.toLatex({ implicit: true })
	}

	const replaceLatex = (matched: string, p1: string) => {
		const e = math(p1)
		if (e.isIncorrect()) {
			throw new Error(`Error while replacing : ${matched} - ${p1}`)
		}
		return e.toLatex()
	}

	function generateVariables() {
		const variables: Variables = question.variabless
			? { ...(getSelectedElement('variabless') as Variables) }
			: {}

		// génération de la table des variables
		Object.getOwnPropertyNames(variables)
			.sort(lexicoSort)
			.forEach((name, i) => {
				let generated = variables[name as VariableName]

				// replace the precedent variables by their generated value
				for (let j = 1; j < i + 1; j++) {
					const precedentName: VariableName = `&${j}`
					const regex = new RegExp(precedentName, 'g')
					generated = generated.replace(regex, variables[precedentName])
				}

				generated = generated.replace(regexEval, replaceEval)

				// on génère les valeurs aléatoires
				generated = math(generated).generate().string

				variables[name as VariableName] = generated
			})
		return variables
	}

	function replacement(_: string, p1: string, p2: string) {
		const tests = p1.split('&&')
		let text: string
		if (tests.every((t) => math(t).eval().string === 'true')) {
			text = p2
		} else {
			text = ''
		}
		return text
	}

	function replaceVariables(o: string | Array<{ text?: string } | string> | null | undefined) {
		function replace(s: string) {
			let result = s
			Object.getOwnPropertyNames(variables).forEach((name) => {
				const regex = new RegExp(name, 'g')
				result = result.replace(regex, variables[name as VariableName])
			})

			return result
		}

		return typeof o === 'string'
			? replace(o)
			: Array.isArray(o)
				? o.map((s) =>
						typeof s === 'string' ? replace(s) : s.text ? { ...s, text: replace(s.text) } : s,
					)
				: o
	}

	function getSelectedElement(field: keyof QuestionBase) {
		const elements = question[field]

		if (elements && Array.isArray(elements) && elements.length) {
			const length = elements.length
			return elements[length === 1 ? 0 : i]
		}
	}

	function toLatex(o: string | Array<{ text?: string } | string> | null | undefined) {
		return typeof o === 'string'
			? o.replace(regexLatex, replaceLatex)
			: Array.isArray(o)
				? o.map((s) =>
						typeof s === 'string'
							? s.replace(regexLatex, replaceLatex)
							: s.text
								? { ...s, text: s.text.replace(regexLatex, replaceLatex) }
								: s,
					)
				: o
	}

	function evaluateToLatex(o: string | Array<{ text?: string } | string> | null | undefined) {
		return typeof o === 'string'
			? o.replace(regexEval, replaceEvalLatex)
			: Array.isArray(o)
				? o.map((s) =>
						typeof s === 'string'
							? s.replace(regexEval, replaceEvalLatex)
							: s.text
								? { ...s, text: s.text.replace(regexEval, replaceEvalLatex) }
								: s,
					)
				: o
	}

	function evaluate(o: string | Array<string> | null | undefined) {
		return typeof o === 'string'
			? o.replace(regexEval, replaceEval)
			: Array.isArray(o)
				? o.map((s) => (typeof s === 'string' ? s.replace(regexEval, replaceEval) : s))
				: o
	}

	function checkDuplicate() {
		let duplicate = false
		// on vérifie en premier lieu si les variables sont identiques
		if (Object.getOwnPropertyNames(variables).length) {
			duplicate = generateds.some(
				(g) =>
					g.id === question.id &&
					g.i === i &&
					Object.getOwnPropertyNames(variables).every((key) => {
						if (isVariableName(key)) {
							const e1 = math(variables[key])
							const e2 = math(g.generatedVariables[key])
							return e1.isCorrect() && e2.isCorrect()
								? e1.string === e2.string
								: variables[key] === g.generatedVariables[key]
						} else return false
					}),
			)
			if (duplicate) warn('mêmes variables', variables)
		}

		if (enounce) {
			duplicate = duplicate && generateds.some((g) => g.i === i && g.enounce === enounce)
		}

		if (enounce2) {
			duplicate = duplicate && generateds.some((g) => g.i === i && g.enounce2 === enounce2)
		}

		if (expression) {
			duplicate = duplicate && generateds.some((g) => g.i === i && g.expression === expression)
		}

		if (answerField) {
			duplicate = duplicate && generateds.some((g) => g.i === i && g.answerField === answerField)
		}

		if (choices) {
			duplicate =
				duplicate &&
				generateds.some((g) => g.i === i && JSON.stringify(g.choices) === JSON.stringify(choices))
		}

		if (image) {
			duplicate = duplicate && generateds.some((g) => g.i === i && g.image === image)
		}

		if (duplicate) {
			warn('duplicate question')
		}

		return duplicate
	}

	if (!question) throw new Error('Empty question')

	question.num = question.num ? question.num + 1 : offset + 1
	let count = 0
	let repeat = false
	const availables: number[] = [] // liste des index encore disponibles dans la liste de questions possibles

	// sur combien d'éléments peut-on choisir une question
	const n = Math.max(
		question.choicess?.length || 0,
		question.expressions?.length || 0,
		question.expressions2?.length || 0,
		question.enounces?.length || 0,
		question.enounces2?.length || 0,
		question.variabless?.length || 0,
		question.images?.length || 0,
		question.answerFields?.length || 0,
		question.answerFormats?.length || 0,
		question.prefilleds?.length || 0,
	)
	console.log('****  n', n)

	// les limites permettent que les différentes expressions possibles pour la question
	// soient générées à peu près dans les mêmes proportions
	// les limites sont mises à jours à chaque nouvelle génération, dans l'objet initial
	if (!question.limits && nbquestions !== 1) {
		question.limits = { limits: [] }
		let nbuniques = 0
		for (let i = 0; i < n; i++) {
			question.limits.limits[i] = {}
			question.limits.limits[i].count = 0

			// questions ou il n'y a pas d'aléatoires
			if (options.includes('exhaust')) {
				nbuniques += 1
				question.limits.limits[i].limit = 1
			}
		}
		question.limits.nbuniques = nbuniques
		// const nbrandoms = question.expressions.length - nbuniques
		const nbrandoms = n - nbuniques
		question.limits.nbrandoms = nbrandoms
	}

	if (question.limits) {
		// nombre de sous-expressions qui ont atteint leur maximum
		question.limits.nbmax = 0
		// total atteint par ces questions
		question.limits.reached = 0

		// recherche des expressions qui ont déjà été utilisées
		// un nombre maximum de fois (à part celles qui sont uniques)
		for (let i = 0; i < n; i++) {
			if (
				question.limits.limits[i].limit &&
				question.limits.limits[i].limit !== 1 &&
				question.limits.limits[i].limit === question.limits.limits[i].count
			) {
				question.limits.nbmax += 1
				question.limits.reached += question.limits.limits[i].limit as number
			}
		}
		// on met à jour les limites des expressions aléatoires
		for (let i = 0; i < n; i++) {
			let limit = question.limits.limits[i].limit
			// si l'initialisation n'a pas été encore faite
			if (!limit) {
				limit = Math.ceil((1 / (question.limits.nbrandoms as number)) * nbquestions)
			}
			// sinon on doit mettre à jour en prenant en compte les expressions qui
			// ont pu atteindre leur maximum
			else if (limit !== 1 && limit !== question.limits.limits[i].count) {
				limit = Math.ceil(
					(1 / ((question.limits.nbrandoms as number) - question.limits.nbmax)) *
						(nbquestions - (question.limits.nbuniques as number) - question.limits.reached),
				)
			}
			// console.log('limit', limit)
			// console.log(
			// 	'question.limits.limits[i].count',
			// 	i,
			// 	question.limits.limits[i].count,
			// )

			question.limits.limits[i].limit = limit
			if (question.limits.limits[i].count !== limit) {
				availables.push(i)
			}
		}
	}

	do {
		count++
		repeat = false

		// first select an expression
		if (question.limits) {
			i = availables[Math.floor(availables.length * Math.random())]
		} else {
			i = Math.floor(n * Math.random())
		}
		variables = generateVariables()

		image = getSelectedElement('images') as string
		expression = getSelectedElement('expressions') as string
		expression2 = getSelectedElement('expressions2') as string
		enounce = getSelectedElement('enounces') as string
		enounce2 = getSelectedElement('enounces2') as string
		choices = getSelectedElement('choicess') as Choice[]
		test = getSelectedElement('conditions') as string

		expression = replaceVariables(expression) as string
		expression2 = replaceVariables(expression2) as string
		enounce = replaceVariables(enounce) as string
		enounce2 = replaceVariables(enounce2) as string
		choices = replaceVariables(choices) as Choice[]
		test = replaceVariables(test) as string

		expression = evaluate(expression) as string
		expression2 = evaluate(expression2) as string
		// enounce = evaluate(enounce) as string
		enounce = evaluateToLatex(enounce) as string
		enounce = toLatex(enounce) as string
		// enounce2 = evaluate(enounce2) as string
		enounce2 = evaluateToLatex(enounce2) as string
		enounce2 = toLatex(enounce2) as string
		choices = evaluateToLatex(choices) as Choice[]
		choices = toLatex(choices) as Choice[]
		test = evaluate(test) as string

		if (expression) {
			if (options.includes('remove-null-terms')) {
				expression = math(expression).removeNullTerms().string
			}

			if (options.includes('shuffle-terms-and-factors')) {
				expression = math(expression).shuffleTermsAndFactors().string
			} else if (options.includes('shuffle-terms')) {
				expression = math(expression).shuffleTerms().string
			} else if (options.includes('shuffle-factors')) {
				expression = math(expression).shuffleFactors().string
			} else if (options.includes('shallow-shuffle-terms')) {
				expression = math(expression).shallowShuffleTerms().string
			} else if (options.includes('shallow-shuffle-factors')) {
				expression = math(expression).shallowShuffleFactors().string
			}

			// TODO: ce ne doit plus être utile maintenant que j'ai rajouté la syntaxe {} dans tinycas
			if (options.includes('exp-remove-unecessary-brackets')) {
				expression = math(expression).removeUnecessaryBrackets().string
			}
		}

		repeat = checkDuplicate()

		if (!repeat && test) {
			if (test.includes('||')) {
				tests = test.split('||')
				repeat = !tests.some((test) => math(test).eval().string === 'true')
			} else {
				tests = test.split('&&')
				repeat = !tests.every((test) => math(test).eval().string === 'true')
			}
			if (repeat) trace('tests non passé', test)
		}
	} while (repeat && count < 100)

	if (count >= 100) {
		warn("can't generate a different question from others")
	}

	// TODO: bug si je ne mets pas le test
	if (
		question.limits?.limits[i]?.count !== undefined &&
		question.limits?.limits[i]?.count !== null
	) {
		question.limits.limits[i].count = (question.limits.limits[i].count as number) + 1
	}

	rawSolutions = getSelectedElement('solutionss') as string[]
	prefilled = getSelectedElement('prefilleds') as string[]
	testAnswers = getSelectedElement('testAnswerss') as string[]
	const letters = getSelectedElement('letterss') as Letters
	const imageCorrection = getSelectedElement('imagesCorrection') as string
	correctionDetails = getSelectedElement('correctionDetailss') as CorrectionDetail[]
	correctionFormat = getSelectedElement('correctionFormats') as CorrectionFormat
	const unit = getSelectedElement('units') as string
	answerField = getSelectedElement('answerFields') as string
	if (answerField) answerField = answerField.replace(/\s\s+/g, ' ')
	answerFormat = (getSelectedElement('answerFormats') as string) || '?'

	let correct: string[] = correctionFormat?.correct || []
	let uncorrect: string[] = correctionFormat?.uncorrect || []
	let answer: string = correctionFormat?.answer || ''

	rawSolutions = replaceVariables(rawSolutions) as string[]
	prefilled = replaceVariables(prefilled) as string[]
	testAnswers = replaceVariables(testAnswers) as string[]
	correctionDetails = replaceVariables(correctionDetails) as CorrectionDetail[]
	correct = replaceVariables(correct) as string[]
	uncorrect = replaceVariables(uncorrect) as string[]
	answer = replaceVariables(answer) as string
	answerField = replaceVariables(answerField) as string
	answerFormat = replaceVariables(answerFormat) as string

	prefilled = evaluate(prefilled) as string[]
	rawSolutions = evaluate(rawSolutions) as string[]
	testAnswers = evaluate(testAnswers) as string[]
	answerFormat = evaluate(answerFormat) as string
	correctionDetails = toLatex(correctionDetails) as CorrectionDetail[]
	correctionDetails = evaluateToLatex(correctionDetails) as CorrectionDetail[]
	correct = toLatex(correct) as string[]
	correct = evaluateToLatex(correct) as string[]
	uncorrect = toLatex(uncorrect) as string[]
	uncorrect = evaluateToLatex(uncorrect) as string[]
	answer = toLatex(answer) as string
	answer = evaluateToLatex(answer) as string
	answerField = toLatex(answerField) as string
	answerField = evaluateToLatex(answerField) as string

	if (correctionFormat) {
		const regex = /@@(.*?)\?\?(.*?)@@/g

		correctionFormat = {
			correct: correct.map((c) => c.replace(regex, replacement)),
			uncorrect: uncorrect.length
				? uncorrect.map((u) => u.replace(regex, replacement))
				: correct.map((c) =>
						c
							.replace(regex, replacement)
							.replace(/&answer/g, '&solution')
							.replace(/&ans/g, '&sol'),
					),
			answer:
				(answer && answer.replace(regex, replacement)) ||
				correct.map((c) => c.replace(regex, replacement)).filter((m) => !!m)[0],
		}
	}

	if (rawSolutions) {
		solutions = rawSolutions.map((solution) => {
			// si ce n'est pas une string, c'est qu'on est dans un type choice, et
			// la solution est l'indice de la bonne réponse
			if (typeof solution === 'string') {
				const regex = /(.*)\?\?(.*)::(.*)/
				const found = solution.match(regex)
				// la solution est de la forme ... ?? ... : ....
				if (found) {
					const test = math(found[1]).eval() as Bool
					const successExp = math(replaceVariables(found[2]) as string)
					const failureExp = math(replaceVariables(found[3]) as string)
					let success: string | number
					let failure: string | number
					if (question.choicess) {
						success = (successExp as Numbr).value.toNumber()
						failure = (failureExp as Numbr).value.toNumber()
					} else {
						success = successExp.string
						failure = failureExp.string
					}
					return test.isTrue() ? success : failure
				}
			}

			return solution
		})
	}
	// Il faut évaluer l'expression
	else if (expression) {
		let params: EvalArg = { decimal: question['result-type'] === 'decimal' }

		const values: Record<string, string> = {}
		if (letters) {
			Object.getOwnPropertyNames(letters).forEach((letter) => {
				if (isVariableName(letter)) {
					const value = letters[letter]
					const real_letter = variables[letter]
					const real_value = isVariableName(value) ? variables[value] : value
					values[real_letter] = real_value
				} else {
					// letter est une lettre
					const value = letters[letter] as VariableName
					values[letter] = variables[value]
				}
			})

			params = { ...params, values }
		}

		if (unit) {
			params.unit = unit
		}

		// TODO: il faut peut etre purifier encore plus la solution, quoique c'est surement fait plus tard
		solutions = [math(expression).eval(params).removeMultOperator().removeFactorsOne().string]
	} else if (!testAnswers && !question.flash) {
		throw new Error('impossible de determiner une bonne réponse')
	}

	if (choices) {
		// mélange des choix
		if (!options.includes('no-shuffle-choices')) {
			const a: number[] = []
			for (let i = 0; i < choices.length; i++) {
				a[i] = i
			}
			// les indices mélangés
			shuffle(a)

			choices = choices.map((_, i) => choices[a[i]])
			if (solutions.length) {
				solutions = solutions.map((solution) =>
					typeof solution === 'number'
						? a.indexOf(solution) // il faut retrouver le nouvel index de la solution
						: solution,
				)
				// ????
				// 	if (type === 'choices') {
				// 		solutions.sort()
				// 	}
			}
		}
	}

	if (correctionDetails) {
		// TODO: pourquoi pas un map ?
		correctionDetails = correctionDetails.reduce((acc, d) => {
			const regex = /@@(.*?)\?\?(.*?)@@/g

			if (d.text) {
				acc.push({ text: d.text.replace(regex, replacement) })
			} else {
				acc.push(d)
			}

			return acc
		}, [] as CorrectionDetail[])
	}

	let expression_latex = ''
	if (expression) {
		expression_latex = math(expression).toLatex({
			addSpaces: !options.includes('exp-no-spaces'),
			keepUnecessaryZeros: options.includes('exp-allow-unecessary-zeros'),
		})
	}
	let expression2_latex = ''
	if (expression2) {
		expression2_latex = math(expression2).toLatex({
			addSpaces: !options.includes('exp-no-spaces'),
			keepUnecessaryZeros: options.includes('exp-allow-unecessary-zeros'),
		})
	}

	let answerFormat_latex = ''
	if (answerFormat) {
		answerFormat_latex = math(answerFormat).toLatex({
			addSpaces: !options.includes('exp-no-spaces'),
			keepUnecessaryZeros: options.includes('exp-allow-unecessary-zeros'),
		})
	}

	const generated: GeneratedQuestion = {
		points: 1,
		i,
		generatedVariables: variables,
		enounce: '',
		delay: question.defaultDelay,
		// delay:question.defaultDelay
		...question,
		// TODO: le mettre ailleurs ça alourdit ici
		order_elements: question.order_elements || [
			'enounce',
			'enounce2',
			'enounce-image',
			'expression',
			'choices',
		],
	}

	if (choices) generated.choices = choices
	if (solutions.length) generated.solutions = solutions
	if (prefilled) generated.prefilled = prefilled
	if (unit) generated.unit = unit
	if (expression) generated.expression = expression
	if (expression_latex) generated.expression_latex = expression_latex
	if (expression2_latex) generated.expression2_latex = expression2_latex
	if (enounce) generated.enounce = enounce
	if (enounce2) generated.enounce2 = enounce2
	if (correctionFormat) generated.correctionFormat = correctionFormat
	if (correctionDetails) generated.correctionDetails = correctionDetails
	if (expression2) generated.expression2 = expression2
	if (testAnswers) generated.testAnswers = testAnswers
	if (answerField) generated.answerField = answerField
	if (answerFormat) generated.answerFormat = answerFormat
	if (answerFormat_latex) generated.answerFormat_latex = answerFormat_latex

	if (image) {
		generated.image = image
		generated.imageBase64P = fetchImage(image)
	}
	if (imageCorrection) {
		generated.imageCorrection = imageCorrection
		generated.imageCorrectionBase64P = fetchImage(imageCorrection)
	}

	if (choices) {
		choices.forEach(async (choice) => {
			if (choice.image) {
				choice.imageBase64P = fetchImage(choice.image).then((base64) => {
					choice.imageBase64 = base64
					return base64
				})
			}
		})
	}

	return generated
}
