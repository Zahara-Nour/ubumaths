import {
	STATUS_BAD_FORM,
	STATUS_CORRECT,
	STATUS_INCORRECT,
	STATUS_UNOPTIMAL_FORM,
	STATUS_EMPTY,
	STATUS_BAD_UNIT,
} from './correction'
import { correct_color, incorrect_color, unoptimal_color } from '$lib/colors'
import { toMarkup, formatLatex } from '$lib/stores'
import math from 'tinycas'
import { get } from 'svelte/store'

function createSolutionsLatex(item) {
	return item.solutions
		? item.solutions.map((solution) => {
				if (item.type === 'choice') {
					return item.choices[solution]
				} else {
					console.log('solution', solution)
					const e = math(solution)
					return e.type === '!! Error !!' ? solution : e.toLatex()
				}
		  })
		: null
}

export function createCorrection(item) {
	const {
		expression_latex,
		solutions,
		answers,
		answers_latex = [],
		correctionFormat,
		status = STATUS_EMPTY,
		choices,
	} = item

	if (!solutions && !item.testAnswer) return

	let line
	let lines = []
	let coms = item.coms || []

	let answerColor = correct_color
	if (
		status === STATUS_BAD_FORM ||
		status === STATUS_INCORRECT ||
		status === STATUS_BAD_UNIT
	) {
		answerColor = incorrect_color
	} else if (status === STATUS_UNOPTIMAL_FORM) {
		answerColor = unoptimal_color
	}

	let solutions_latex = createSolutionsLatex(item)

	const regexExpression = /&expression/g
	function replaceExpression() {
		return get(toMarkup)('$$' + item.expression_latex + '$$')
	}

	const regexExpression2 = /&expression2/g
	function replaceExpression2() {
		return get(toMarkup)('$$' + item.expression2_latex + '$$')
	}

	const regexExp = /&exp/g
	function replaceExp() {
		return item.expression_latex
	}

	const regexExp2 = /&exp/g
	function replaceExp2() {
		return item.expression2_latex
	}

	const regexAnswer = /&answer([1-9]?)/g
	function replaceAnswerCorrect(match, p1) {
		return (
			`<span style="color:${correct_color}; border:2px solid ${correct_color}; border-radius: 5px;  margin:2px; padding:5px;display:inline-block">` +
			(item.type === 'choice'
				? get(formatLatex)(item.choices[item.answers[p1 ? p1 - 1 : 0]].text)
				: get(toMarkup)('$$' + answers_latex[p1 ? p1 - 1 : 0] + '$$')) +
			'</span>'
		)
	}

	const regexAns = /&ans([1-9]?)/g
	function replaceAnsCorrect(match, p1) {
		return (
			`\\enclose{roundedbox}[3px solid ${correct_color}]{\\textcolor{${correct_color}}{` +
			answers_latex[p1 ? p1 - 1 : 0] +
			'}}'
		)
	}

	const regexSolution = /&solution([1-9]?)/g
	function replaceSolution(match, p1) {
		return (
			`<span style="color:${correct_color}; border:2px solid ${correct_color}; border-radius: 5px; margin:2px;padding:5px;display:inline-block">` +
			(item.type === 'choice'
				? get(formatLatex)(item.choices[solutions[p1 ? p1 - 1 : 0]].text)
				: get(toMarkup)(solutions_latex[p1 ? p1 - 1 : 0])) +
			'</span>'
		)
	}

	const regexSol = /&sol([1-9]?)/g
	function replaceSol(match, p1) {
		return item.type === 'choice'
			? item.choices[solutions[p1 ? p1 - 1 : 0]].text
			: `\\enclose{roundedbox}[3px solid ${correct_color}]{\\textcolor{${correct_color}}{` +
					solutions_latex[p1 ? p1 - 1 : 0] +
					'}}'
	}

	function replaceAnswerUncorrect(match, p1) {
		console.log('answers', item.answers)
		return (
			`<span style="color:${
				item.statuss[p1 ? p1 - 1 : 0] === STATUS_UNOPTIMAL_FORM
					? unoptimal_color
					: item.statuss[p1 ? p1 - 1 : 0] === STATUS_CORRECT
					? correct_color
					: incorrect_color
			};display:inline-block">` +
			(item.type === 'choice'
				? get(formatLatex)(item.choices[item.answers[p1 ? p1 - 1 : 0]].text)
				: get(toMarkup)('$$' + answers_latex[p1 ? p1 - 1 : 0] + '$$')) +
			'</span>'
		)
	}

	function replaceAnsUncorrect(match, p1) {
		return (
			`\\textcolor{${
				item.statuss[p1 ? p1 - 1 : 0] === STATUS_UNOPTIMAL_FORM
					? unoptimal_color
					: item.statuss[p1 ? p1 - 1 : 0] === STATUS_CORRECT
					? correct_color
					: incorrect_color
			}}{` +
			answers_latex[p1 ? p1 - 1 : 0] +
			'}'
		)
	}

	if (correctionFormat) {
		// la correction
		if (status === STATUS_CORRECT) {
			correctionFormat.correct.forEach((format) => {
				if (format === 'image') {
					let img = choices[solutions[0]].imageBase64
					line = `<img src='${img}' style="max-width:400px;max-height:40vh;" alt='toto'>`
				} else {
					line = format
						.replace(regexExpression2, replaceExpression2)
						.replace(regexExpression, replaceExpression)
						.replace(regexExp2, replaceExp2)
						.replace(regexExp, replaceExp)
						// .replace(new RegExp('&exp2', 'g'), '$$$$'+expression2_latex+'$$$$')
						// .replace(new RegExp('&exp', 'g'), '$$$$'+expression_latex+'$$$$')
						.replace(regexAnswer, replaceAnswerCorrect)
						.replace(regexAns, replaceAnsCorrect)
				}

				lines.push({ html: line })
			})
		} else {
			correctionFormat.uncorrect.forEach((format) => {
				if (format === 'image') {
					let img = choices[solutions[0]].imageBase64
					line = `<img style="max-width:400px;max-height:40vh;" src='${img}' alt='toto'>`
				} else {
					line = format
						.replace(regexExpression2, replaceExpression2)
						.replace(regexExpression, replaceExpression)
						.replace(regexExp2, replaceExp2)
						.replace(regexExp, replaceExp)
						// .replace(new RegExp('&exp2', 'g'), '$$$$'+expression2_latex+'$$$$')
						// .replace(new RegExp('&exp', 'g'), '$$$$'+expression_latex+'$$$$')
						.replace(regexSolution, replaceSolution)
						.replace(regexSol, replaceSol)
				}

				lines.push({ html: line })
			})

			// le commentaire avec la réponse de l'utilisateur
			if (status !== STATUS_EMPTY && item.answers) {
				if (correctionFormat.answer === 'image') {
					let img = choices[answer_choice].imageBase64
					coms.unshift(
						`<img src='${img}' style="padding:2px; border: 2px solid ${incorrect_color} ;max-width:400px;max-height:40vh;" alt='toto'>`,
					)
					coms.unshift('Ta réponse:')
				} else {
					coms.unshift(
						'Ta réponse : ' +
							correctionFormat.answer
								// .replace(new RegExp('&exp2', 'g'), '$$$$'+expression2_latex+'$$$$')
								// .replace(new RegExp('&exp', 'g'), '$$$$'+expression_latex+'$$$$')
								.replace(regexExpression2, replaceExpression2)
								.replace(regexExpression, replaceExpression)
								.replace(regexExp2, replaceExp2)
								.replace(regexExp, replaceExp)
								.replace(regexAnswer, replaceAnswerUncorrect)
								.replace(regexAns, replaceAnsUncorrect),
					)
				}
			}
		}
	} else {
		switch (item.type) {
			case 'result': {
				line = `$$\\begin{align*}  ${expression_latex}`
				if (status === STATUS_INCORRECT) {
					line += `&= \\enclose{updiagonalstrike}[3px solid ${incorrect_color}]{${answers_latex[0]}} \\\\`
				} else if (status === STATUS_BAD_FORM || status === STATUS_BAD_UNIT) {
					line += `&= \\textcolor{${incorrect_color}}{${answers_latex[0]}} \\\\`
				} else if (status === STATUS_UNOPTIMAL_FORM) {
					line += `&= \\textcolor{${unoptimal_color}}{${answers_latex[0]}} \\\\`
				}

				line += `&=\\enclose{roundedbox}[2px solid ${correct_color}]{\\textcolor{${correct_color}}{${
					status === STATUS_CORRECT ? answers_latex[0] : solutions_latex[0]
				}}}`

				line += '\\end{align*}$$'
				lines.push({ html: line })

				break
			}

			case 'equation': {
				// let exp = '$$\\begin{align*}x & =5-3 \\\\  & =2\\end{align*}$$'

				line = `$$\\begin{align*}  x`
				if (status === STATUS_EMPTY) {
					line +=
						`=\\enclose{roundedbox}[3px solid ${correct_color}]{\\textcolor{${correct_color}}{${solutions_latex[0]}}}` +
						'\\end{align*}$$'
				} else if (status === STATUS_INCORRECT) {
					line +=
						`&= \\enclose{updiagonalstrike}[6px solid rgba(205, 0, 11, .4)]{\\textcolor{${incorrect_color}}{${answers_latex[0]}}}` +
						`\\\\&= \\enclose{roundedbox}[3px solid ${correct_color}]{\\textcolor{${correct_color}}{${solutions_latex[0]}}}\\end{align*}$$`
				} else if (
					status === STATUS_BAD_FORM ||
					status === STATUS_UNOPTIMAL_FORM
				) {
					line +=
						`&= \\textcolor{${unoptimal_color}}{${answers_latex[0]}}` +
						`\\\\&= \\enclose{roundedbox}[3px solid ${correct_color}]{\\textcolor{${correct_color}}{${solutions_latex[0]}}}\\end{align*}$$`
				} else {
					line += `=\\enclose{roundedbox}[3px solid ${correct_color}]{\\textcolor{${correct_color}}{${answers_latex[0]}}}\\end{align*}$$`
				}
				lines.push({ html: line })

				break
			}
			case 'choice':
			case 'choices': {
				// line = '<div class="flex flex-wrap justify-start">'
				let choices = []
				console.log('item.choices', item.choices)
				item.choices.forEach((choice, i) => {
					console.log('choice', choice)
					const c = {}

					if (solutions.includes(i)) {
						c.solution = true
						if (answers && answers.includes(i)) {
							c.badge = 'correct'
						}
					} else if (answers && answers.includes(i)) {
						c.badge = 'incorrect'
					}

					if (choice.image) {
						c.image = choice.base64
					} else {
						c.text = choice.text
					}
					if (answers || c.solution) {
						choices.push(c)
					}
				})
				console.log('choices', choices)

				// item.choices.forEach((choice, i) => {
				// 	let border = 'solid'
				// 	let color = 'grey'
				// 	if (solutions.includes(i)) {
				// 		color = correct_color
				// 		if (!answers || !answers.includes(i)) {
				// 			border = 'dashed'
				// 		}
				// 	} else if (answers && answers.includes(i)) {
				// 		color = incorrect_color
				// 	}

				// 	line += `<span
				// 	class="rounded-lg  m-2 p-1"
				// 	style="border: 4px ${border} ${color}"
				// >`

				// 	if (choice.image) {
				// 		line += `<img src="${choice.base64}" style="max-width:min(400px,80%);max-height:40vh;" alt="choice ${i}"/>`
				// 	} else {
				// 		line += `<div class="text-base " style="{font-size:1rem}">`
				// 		line += choice.text
				// 		line += '</div>'
				// 	}
				// 	line += '</span>'
				// })

				lines.push({ choices })
				break
			}

			case 'trou':
				//TODO : empty ?
				if (status === STATUS_CORRECT) {
					line =
						'$$' +
						expression_latex.replace(
							/\\ldots/,
							`\\enclose{roundedbox}[2px solid ${correct_color}]{\\textcolor{${correct_color}}{${answers_latex[0]}}}`,
						) +
						'$$'
				} else {
					line =
						'$$' +
						expression_latex.replace(
							/\\ldots/,
							`\\enclose{roundedbox}[2px solid ${correct_color}]{\\textcolor{${correct_color}}{${solutions_latex[0]}}}`,
						) +
						'$$'

					if (status === STATUS_INCORRECT) {
						coms.unshift(
							'Ta réponse : $$' +
								expression_latex.replace(
									/\\ldots/,
									`\\textcolor{${incorrect_color}}{${answers_latex[0]}}`,
								) +
								'$$',
						)
					} else if (
						status === STATUS_BAD_FORM ||
						status === STATUS_UNOPTIMAL_FORM
					) {
						coms.unshift(
							'Ta réponse : $$' +
								expression_latex.replace(
									/\\ldots/,
									`\\textcolor{${unoptimal_color}}{${answers_latex[0]}}`,
								) +
								'$$',
						)
					}
				}
				lines.push({ html: line })
		}
	}

	lines = lines.map((line) => {
		if (line.html) {
			return { html: get(formatLatex)(line.html) }
		} else if (line.choices) {
			return {
				choices: line.choices.map((choice) => ({
					...choice,
					html: get(formatLatex)(choice.text),
				})),
			}
		}
	})

	if (item.answers) {
		coms = coms.map((com) =>
			get(formatLatex)(com).replace(/_COLORANSWER_/g, answerColor),
		)
	}
	item.coms = coms
	item.simpleCorrection = lines
}

export function createDetailedCorrection(item) {
	const { solutions, correctionDetails } = item

	let lines = []
	let line
	let solutions_latex = createSolutionsLatex(item)

	const regexExpression = /&expression/g
	function replaceExpression() {
		return get(toMarkup)('$$' + item.expression_latex + '$$')
	}

	const regexExpression2 = /&expression2/g
	function replaceExpression2() {
		return get(toMarkup)('$$' + item.expression2_latex + '$$')
	}

	const regexExp = /&exp/g
	function replaceExp() {
		return item.expression_latex
	}

	const regexExp2 = /&exp/g
	function replaceExp2() {
		return item.expression2_latex
	}

	const regexSolution = /&solution([1-9]?)/g
	function replaceSolution(match, p1) {
		return (
			`<span style="color:${correct_color}; border:2px solid ${correct_color}; border-radius: 5px; margin:2px;padding:5px;display:inline-block">` +
			(item.type === 'choice'
				? get(formatLatex)(item.choices[solutions[p1 ? p1 - 1 : 0]].text)
				: get(toMarkup)(solutions_latex[p1 ? p1 - 1 : 0])) +
			'</span>'
		)
	}

	const regexSol = /&sol([1-9]?)/g
	function replaceSol(match, p1) {
		return item.type === 'choice'
			? item.choices[solutions[p1 ? p1 - 1 : 0]].text
			: `\\enclose{roundedbox}[3px solid ${correct_color}]{\\textcolor{${correct_color}}{` +
					solutions_latex[p1 ? p1 - 1 : 0] +
					'}}'
	}

	correctionDetails.forEach((detail) => {
		if (detail.type === 'image') {
			// le base64 de l'image a été préparé lors de la génération de la question
			let img = detail.base64
			line = `<img src='${img}' style="max-width:400px;max-height:40vh;" alt='toto'>`
		} else {
			line = detail.text
				// .replace(new RegExp('&exp2', 'g'), '$$$$'+expression2_latex+'$$$$')
				// .replace(new RegExp('&exp', 'g'), '$$$$'+expression_latex+'$$$$')
				.replace(regexExpression2, replaceExpression2)
				.replace(regexExpression, replaceExpression)
				.replace(regexExp2, replaceExp2)
				.replace(regexExp, replaceExp)
				.replace(regexSolution, replaceSolution)
				.replace(regexSol, replaceSol)
				.replace(
					'&solution',
					() =>
						`<span style="color:${correct_color}; border:2px solid ${correct_color}; border-radius: 5px;  margin:2px; padding:5px;display:inline-block">` +
						(item.type === 'choice'
							? get(formatLatex)(item.choices[solutions[0]].text)
							: get(toMarkup)(solutions_latex[0])) +
						'</span>',
				)
				.replace(
					new RegExp('&sol', 'g'),
					item.type === 'choice'
						? item.choices[solutions[0]].text
						: `\\enclose{roundedbox}[3px solid ${correct_color}]{\\textcolor{${correct_color}}{` +
								solutions_latex[0] +
								'}}',
				)
		}
		lines.push(line)
	})
	lines = lines.map(get(formatLatex))
	return lines
}
