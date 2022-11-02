import math from 'tinycas'
import emptyQuestion from './emptyQuestion'
import { getLogger, lexicoSort, shuffle } from '$lib/utils'

let { warn, trace } = getLogger('generateQuestion', 'warn')

export default function generateQuestion(
	question,
	generateds = [],
	nbquestions = 1,
	offset = 0,
) {
	let expression
	let expression2
	let solutions
	let variables = {}
	let details
	let correctionDetails
	let correctionFormat
	let choices
	let i
	let enounce
	let enounce2
	let letters
	let correction
	let testAnswer
	let image
	let imageCorrection
	let unit
	let tests
	let answerFields
	let type

	type = type || question.choices ? 'choice' : 'result'

	const { options = [] } = question

	// les questions de la série déjà générées

	const generatedExpressions = generateds
		? generateds.map((g) => g.expression)
		: []
	const generatedEnounces = generateds ? generateds.map((g) => g.enounce) : []
	const generatedEnounces2 = generateds ? generateds.map((g) => g.enounce2) : []
	// const generatedChoices = generateds ? generateds.map((g) => g.choices) : []
	const generatedImages = generateds ? generateds.map((g) => g.image) : []

	// les regex correpondant aux expressions à évaluer
	// const regexEval = /\[([.+(]*)_([^_]*?)(_(.+?))??_\]/g
	const regexEval = /\[([.+(]*)_([^_]*?)(_([^_]*))??_\]/g
	// const regexEval = /\[([.+(]*)_([^_]+)_(([^_])_)??\]/g

	// [° °] : simple mise en forme LaTeX
	const regexLatex = /\[°(.*?)°\]/g

	const replace = (matched, p1, p2, p3, p4) => {
		const modifiers = p1
		let e = math(p2)
		const unit = p4
		const params = {}

		if (e.string === 'Error') {
			throw new Error('Error while replacing', matched, p1, p2, p3, p4)
		}

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

		return e
	}

	const replaceEval = (matched, p1, p2, p3, p4) => {
		const e = replace(matched, p1, p2, p3, p4)
		return e.toString({ implicit: true })
	}

	const replaceEvalLatex = (matched, p1, p2, p3, p4) => {
		const e = replace(matched, p1, p2, p3, p4)
		return e.toLatex({ implicit: true })
	}

	const replaceLatex = (matched, p1) => {
		const e = math(p1)
		if (e.string === 'Error') {
			throw new Error('Error while replacing', matched, p1)
		}
		return e.toLatex()
	}

	function generateVariables() {
		const variables = question.variables
			? { ...getSelectedElement('variables') }
			: {}

		// génération de la table des variables
		Object.getOwnPropertyNames(variables)
			.sort(lexicoSort)
			.forEach((name, i) => {
				let generated = variables[name]

				// replace the precedent variables by their generated value
				for (let j = 1; j < i + 1; j++) {
					const precedentName = `&${j}`
					const regex = new RegExp(precedentName, 'g')
					generated = generated.replace(regex, variables[precedentName])
				}

				generated = generated.replace(regexEval, replaceEval)

				// on génère les valeurs aléatoires
				generated = math(generated).generate().string
				variables[name] = generated
			})
		return variables
	}

	function replacement(_, p1, p2) {
		const tests = p1.split('&&')
		let text
		if (tests.every((t) => math(t).eval().string === 'true')) {
			text = p2
		} else {
			text = ''
		}
		return text
	}

	function replaceVariables(o) {
		function replace(s) {
			let result = s
			Object.getOwnPropertyNames(variables).forEach((name) => {
				const regex = new RegExp(name, 'g')
				result = result.replace(regex, variables[name])
			})

			return result
		}

		return typeof o === 'string'
			? replace(o)
			: Array.isArray(o)
			? o.map((s) =>
					s.text
						? { ...s, text: replace(s.text) }
						: typeof s === 'string'
						? replace(s)
						: s,
			  )
			: o
	}

	function getSelectedElement(field) {
		if (!question[field]) return null
		const length = question[field].length
		return question[field][length === 1 ? 0 : i]
	}

	function toLatex(o) {
		return typeof o === 'string'
			? o.replace(regexLatex, replaceLatex)
			: Array.isArray(o)
			? o.map((s) =>
					s.text
						? { ...s, text: s.text.replace(regexLatex, replaceLatex) }
						: typeof s === 'string'
						? s.replace(regexLatex, replaceLatex)
						: s,
			  )
			: o
	}

	function evaluateToLatex(o) {
		return typeof o === 'string'
			? o.replace(regexEval, replaceEvalLatex)
			: Array.isArray(o)
			? o.map((s) =>
					s.text
						? { ...s, text: s.text.replace(regexEval, replaceEvalLatex) }
						: typeof s === 'string'
						? s.replace(regexEval, replaceEvalLatex)
						: s,
			  )
			: o
	}

	function evaluate(o) {
		return typeof o === 'string'
			? o.replace(regexEval, replaceEval)
			: Array.isArray(o)
			? o.map((s) =>
					typeof s === 'string' ? s.replace(regexEval, replaceEval) : s,
			  )
			: o
	}

	function checkDuplicate() {
		let duplicate
		console.log('checkDuplicate')
		// on vérifie en premier lieu si les variables sont identiques
		if (Object.getOwnPropertyNames(variables).length) {
			console.log('checking variables', variables)
			duplicate = generateds.some(
				(g) =>
					g.i === i &&
					Object.getOwnPropertyNames(variables).every((key) => {
						console.log('key', key, variables[key], g.generatedVariables[key])
						const e1 = math(variables[key])
						const e2 = math(g.generatedVariables[key])
						return e1.isCorrect() && e2.isCorrect()
							? e1.string === e2.string
							: variables[key] === g.generatedVariables[key]
					}),
			)
			if (repeat) warn('mêmes variables', variables)
		}

		if (enounce) {
			duplicate = duplicate && generateds.some(
				(g) =>
					g.i === i &&
					g.enounce === enounce
			)
		}

		if (enounce2) {
			duplicate = duplicate && generateds.some(
				(g) =>
					g.i === i &&
					g.enounce2 === enounce2
			)
		}

		if (expression) {
			duplicate = duplicate && generateds.some(
				(g) =>
					g.i === i &&
					g.expression === expression
			)
		}

		if (answerFields) {
			duplicate = duplicate && generateds.some(
				(g) =>
					g.i === i &&
					g.answerFields === answerFields
			)
		}


		if (choices) {
			duplicate = duplicate && generateds.some(
				(g) =>
					g.i === i &&
					JSON.stringify(g.choices) === JSON.stringify(choices)
			)
		}

		if (image) {
			duplicate = duplicate && generateds.some(
				(g) =>
					g.i === i &&
					g.image === image
			)
		}

		if (duplicate) {
			warn('duplicate question')
		}

		// if (expression && enounce && enounce2 && choices) {
		// 	repeat = generateds.some(
		// 		(g) =>
		// 			g.enounce === enounce &&
		// 			g.enounce2 === enounce2 &&
		// 			JSON.stringify(g.choices) === JSON.stringify(choices) &&
		// 			g.expression === expression,
		// 	)
		// 	if (repeat)
		// 		warn(
		// 			'même énoncé ET même énoncé2 ET choix ET image',
		// 			enounce,
		// 			enounce2,
		// 			JSON.stringify(choices),
		// 			expression,
		// 		)
		// } else if (image && enounce && enounce2 && choices) {
		// 	repeat = generateds.some(
		// 		(g) =>
		// 			g.enounce === enounce &&
		// 			g.enounce2 === enounce2 &&
		// 			JSON.stringify(g.choices) === JSON.stringify(choices) &&
		// 			g.image === image,
		// 	)
		// 	if (repeat)
		// 		warn(
		// 			'même énoncé ET même enoncé2 ET choix ET image',
		// 			enounce,
		// 			enounce2,
		// 			JSON.stringify(choices),
		// 			image,
		// 		)
		// } else if (expression && enounce && enounce2) {
		// 	repeat = generateds.some(
		// 		(g) =>
		// 			g.expression === expression &&
		// 			g.enounce === enounce &&
		// 			g.enounce2 === enounce2,
		// 	)
		// 	if (repeat)
		// 		warn(
		// 			'même énoncé ET même énoncé2 ET expression: ',
		// 			enounce,
		// 			enounce2,
		// 			expression,
		// 		)
		// } else if (enounce && enounce2 && choices) {
		// 	repeat = generateds.some(
		// 		(g) =>
		// 			g.enounce === enounce &&
		// 			g.enounce2 === enounce2 &&
		// 			JSON.stringify(g.choices) === JSON.stringify(choices),
		// 	)
		// 	if (repeat)
		// 		warn(
		// 			'même énoncé ET même enoncé2 ET choix ',
		// 			enounce,
		// 			enounce2,
		// 			JSON.stringify(choices),
		// 		)
		// } else if (enounce && enounce2 && image) {
		// 	repeat = generateds.some(
		// 		(g) =>
		// 			g.enounce === enounce && g.enounce2 === enounce2 && g.image === image,
		// 	)
		// 	if (repeat)
		// 		warn('même énoncé ET même énoncé2 ET image', enounce, enounce, image)
		// } else if (expression && enounce && choices) {
		// 	repeat = generateds.some(
		// 		(g) =>
		// 			g.enounce === enounce &&
		// 			JSON.stringify(g.choices) === JSON.stringify(choices) &&
		// 			g.expression === expression,
		// 	)
		// 	if (repeat)
		// 		warn(
		// 			'même énoncé ET choix ET image',
		// 			enounce,
		// 			JSON.stringify(choices),
		// 			expression,
		// 		)
		// } else if (image && enounce && choices) {
		// 	repeat = generateds.some(
		// 		(g) =>
		// 			g.enounce === enounce &&
		// 			JSON.stringify(g.choices) === JSON.stringify(choices) &&
		// 			g.image === image,
		// 	)
		// 	if (repeat)
		// 		warn(
		// 			'même énoncé ET choix ET image',
		// 			enounce,
		// 			JSON.stringify(choices),
		// 			image,
		// 		)
		// } else if (expression && enounce) {
		// 	repeat = generateds.some(
		// 		(g) => g.expression === expression && g.enounce === enounce,
		// 	)
		// 	if (repeat) warn('même énoncé ET expression: ', enounce, expression)
		// } else if (enounce && choices) {
		// 	repeat = generateds.some(
		// 		(g) =>
		// 			g.enounce === enounce &&
		// 			JSON.stringify(g.choices) === JSON.stringify(choices),
		// 	)
		// 	if (repeat)
		// 		warn('même énoncé ET choix ', enounce, JSON.stringify(choices))
		// } else if (enounce && image) {
		// 	repeat = generateds.some(
		// 		(g) => g.enounce === enounce && g.image === image,
		// 	)
		// 	if (repeat) warn('même énoncé ET image', enounce, image)
		// } else if (expression && !options.includes('allow-same-expression')) {
		// 	repeat = generatedExpressions.includes(expression)
		// 	if (repeat) warn('même image expression', expression)
		// } else if (enounce && enounce2 && !options.includes('allow-same-enounce')) {
		// 	repeat =
		// 		generatedEnounces.includes(enounce) &&
		// 		generatedEnounces2.includes(enounce2)
		// 	if (repeat) warn('même énoncé ET même énoncé2', enounce, enounce2)
		// } else if (enounce && !options.includes('allow-same-enounce')) {
		// 	repeat = generatedEnounces.includes(enounce)
		// 	if (repeat) warn('même énoncé', enounce)
		// } else if (image) {
		// 	const test = generatedImages.includes(image)
		// 	if (test) warn('même image pour la question', image)
		// 	repeat = repeat || test
		// }
		return duplicate
	}

	if (!question) return emptyQuestion

	question.num = question.num ? question.num + 1 : offset + 1
	let count = 0
	let repeat = false
	let availables = []

	// sur combien d'éléments peut-onchour une question
	const n = Math.max(
		(question.choices && question.choices.length) || 0,
		(question.expressions && question.expressions.length) || 0,
		(question.expressions2 && question.expressions2.length) || 0,
		(question.enounces && question.enounces.length) || 0,
		(question.enounces2 && question.enounces2.length) || 0,
		(question.variables && question.variables.length) || 0,
		(question.images && question.images.length) || 0,
		(question.answerFields && question.answerFields.length) || 0,
	)

	// les limites permettent que les différentes expressions possibles pour la question
	// soient générées à peu près dans la même proportion
	// les limites sont mises à jours à chaque nouvelle génération, dans l'objet initial
	if (!question.limits && nbquestions !== 1) {
		question.limits = { limits: [] }
		let nbuniques = 0
		for (let i = 0; i < n; i++) {
			question.limits.limits[i] = {}
			question.limits.limits[i].count = 0

			if (question.options && question.options.includes('exhaust')) {
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
				question.limits.reached += question.limits.limits[i].limit
			}
		}
		// on met à jour les limites des expressions aléatoires
		for (let i = 0; i < n; i++) {
			let limit = question.limits.limits[i].limit
			// si l'initialisation n'a pas été encore faite
			if (!limit) {
				limit = Math.ceil((1 / question.limits.nbrandoms) * nbquestions)
			}
			// sinon on doit mettre à jour en prenant en compte les expressions qui
			// ont pu atteindre leur maximum
			else if (limit !== 1 && limit !== question.limits.limits[i].count) {
				limit = Math.ceil(
					(1 / (question.limits.nbrandoms - question.limits.nbmax)) *
						(nbquestions - question.limits.nbuniques - question.limits.reached),
				)
			}
			question.limits.limits[i].limit = limit
			if (question.limits.limits[i].count !== limit) {
				availables.push(i)
			}
		}
	}
	// console.log('limits', JSON.parse(JSON.stringify(question.limits.limits)))

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

		image = getSelectedElement('images')
		expression = getSelectedElement('expressions')
		expression2 = getSelectedElement('expressions2')
		enounce = getSelectedElement('enounces')
		enounce2 = getSelectedElement('enounces2')
		choices = getSelectedElement('choices')
		tests = getSelectedElement('conditions')

		expression = replaceVariables(expression)
		expression2 = replaceVariables(expression2)
		enounce = replaceVariables(enounce)
		enounce2 = replaceVariables(enounce2)
		choices = replaceVariables(choices)
		tests = replaceVariables(tests)

		expression = evaluate(expression)
		expression2 = evaluate(expression2)
		enounce = evaluateToLatex(enounce)
		enounce = toLatex(enounce)
		enounce2 = evaluateToLatex(enounce2)
		enounce2 = toLatex(enounce2)
		choices = evaluateToLatex(choices)
		choices = toLatex(choices)
		tests = evaluate(tests)

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

		if (!repeat && tests) {
			if (tests.includes('||')) {
				tests = tests.split('||')
				repeat = !tests.some((test) => math(test).eval().string === 'true')
			} else {
				tests = tests.split('&&')
				repeat = !tests.every((test) => math(test).eval().string === 'true')
			}
			if (repeat) trace('tests non passé', tests)
		}
	} while (repeat && count < 100)

	if (count >= 100) {
		warn("can't generate a different question from others")
	}

	if (question.limits) {
		question.limits.limits[i].count += 1
	}

	solutions = getSelectedElement('solutions')
	testAnswer = getSelectedElement('testAnswers')
	letters = getSelectedElement('letters')
	imageCorrection = getSelectedElement('imagesCorrection')
	correctionDetails = getSelectedElement('correctionDetails')
	correctionFormat = getSelectedElement('correctionFormat')
	unit = getSelectedElement('units')
	answerFields = getSelectedElement('answerFields')

	let correct, uncorrect, answer
	if (correctionFormat) {
		correct = correctionFormat.correct
		uncorrect = correctionFormat.uncorrect
		answer = correctionFormat.answer
	}

	solutions = replaceVariables(solutions)
	testAnswer = replaceVariables(testAnswer)
	correctionDetails = replaceVariables(correctionDetails)
	correct = replaceVariables(correct)
	uncorrect = replaceVariables(uncorrect)
	answer = replaceVariables(answer)
	answerFields = replaceVariables(answerFields)

	solutions = evaluate(solutions)
	testAnswer = evaluate(testAnswer)

	correctionDetails = toLatex(correctionDetails)
	correctionDetails = evaluateToLatex(correctionDetails)
	correct = toLatex(correct)
	correct = evaluateToLatex(correct)
	uncorrect = toLatex(uncorrect)
	uncorrect = evaluateToLatex(uncorrect)
	answer = toLatex(answer)
	answer = evaluateToLatex(answer)
	answerFields = toLatex(answerFields)
	answerFields = evaluateToLatex(answerFields)

	if (correctionFormat) {
		const regex = /@@(.*?)\?\?(.*?)@@/g

		correctionFormat = {
			correct: correct.map((c) => c.replace(regex, replacement)),
			uncorrect: uncorrect
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

	if (solutions) {
		solutions = solutions.map((solution) => {
			// si ce n'est pas une string, c'est qu'on est dans un type choice
			if (typeof solution === 'string') {
				const regex = /(.*)\?\?(.*)::(.*)/
				const found = solution.match(regex)
				if (found) {
					const test = math(found[1]).eval()
					let success = math(replaceVariables(found[2]))
					let failure = math(replaceVariables(found[3]))
					if (type === 'choices' || type === 'choice') {
						success = success.value.toNumber()
						failure = failure.value.toNumber()
					} else {
						success = success.string
						failure = failure.string
					}
					return test.isTrue() ? success : failure
				}
			}
			// if (question.type === 'choice' && typeof solution === 'number') {
			//   solution = choices[solution]
			// }

			return solution
		})
	}
	// Il faut évaluer l'expression
	else if (expression) {
		let params = { decimal: question['result-type'] === 'decimal' }

		if (letters) {
			Object.getOwnPropertyNames(letters).forEach((letter) => {
				if (letter.startsWith('&')) {
					const value = letters[letter]
					letters[variables[letter]] = value.startsWith('&')
						? variables[value]
						: value
				} else if (letters[letter].startsWith('&')) {
					letters[letter] = variables[letters[letter]]
				}
			})

			params = { ...params, ...letters }
		}

		if (unit) {
			params.unit = unit
		}

		// TODO: i lfaut peut etre purifier encore plus la solution, quoique c'est surement fait plus tard
		solutions = [
			math(expression).eval(params).removeMultOperator().removeFactorsOne()
				.string,
		]
	}

	if (choices) {
		// choices = choices.map(c => {
		//   const choice = { ...c }
		//   if (c.image) {
		//     choice.imageBase64P = fetchImage(c.image)
		//     choice.imageBase64P.then(base64 => { choice.imageBase64 = base64 })
		//   }
		//   return choice
		// })

		// mélange des choix
		if (!options.includes('no-shuffle-choices')) {
			const a = []
			for (let i = 0; i < choices.length; i++) {
				a[i] = i
			}
			// les indices mélangés
			shuffle(a)

			choices = choices.map((_, i) => choices[a[i]])
			if (solutions) {
				solutions = solutions.map((solution) =>
					typeof solution === 'number'
						? a.indexOf(solution) // il faut retrouver le nouvel index de la solution
						: solution,
				)
				if (type === 'choices') {
					solutions.sort()
				}
			}
		}
	}

	if (correctionDetails) {
		correctionDetails = correctionDetails.reduce((acc, d) => {
			const regex = /@@(.*?)\?\?(.*?)@@/g

			if (d.text) {
				acc.push({ text: d.text.replace(regex, replacement) })
			} else {
				acc.push(d)
			}

			return acc
		}, [])
	}

	let expression_latex
	if (expression) {
		expression_latex = math(expression).toLatex({
			addSpaces: !(
				question.options && question.options.includes('exp-no-spaces')
			),
			keepUnecessaryZeros:
				question.options &&
				question.options.includes('exp-allow-unecessary-zeros'),
		})
	}
	let expression2_latex
	if (expression2) {
		expression2_latex = math(expression2).toLatex({
			addSpaces: !(
				question.options && question.options.includes('exp-no-spaces')
			),
			keepUnecessaryZeros:
				question.options &&
				question.options.includes('exp-allow-unecessary-zeros'),
		})
	}

	const generated = {
		points: 1,
		i,
		type,
		generatedVariables: variables,
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
	if (solutions) generated.solutions = solutions
	if (details) generated.details = details
	if (unit) generated.unit = unit
	if (expression) generated.expression = expression
	if (expression_latex) generated.expression_latex = expression_latex
	if (expression2_latex) generated.expression2_latex = expression2_latex
	if (enounce) generated.enounce = enounce
	if (enounce2) generated.enounce2 = enounce2
	if (correction) generated.correction = correction
	if (correctionFormat) generated.correctionFormat = correctionFormat
	if (correctionDetails) generated.correctionDetails = correctionDetails
	if (expression2) generated.expression2 = expression2
	if (testAnswer) generated.testAnswer = testAnswer
	if (answerFields) generated.answerFields = answerFields

	if (image) {
		generated.image = image
		// generated.imageBase64P = fetchImage(image)
	}
	if (imageCorrection) {
		generated.imageCorrection = imageCorrection
		// generated.imageCorrectionBase64P = fetchImage(imageCorrection)
	}

	return generated
}
