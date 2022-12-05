import {
	STATUS_BAD_FORM,
	STATUS_CORRECT,
	STATUS_INCORRECT,
	STATUS_UNOPTIMAL_FORM,
	STATUS_EMPTY,
	STATUS_BAD_UNIT,
} from './correction'
import {
	mdc_colors,
	correct_color,
	incorrect_color,
	unoptimal_color,
} from '$lib/colors'
import { toMarkup, formatToHtml } from '$lib/stores'
import math from 'tinycas'
import { formatToLatex, formatToTexmacs } from '$lib/utils'
import { get } from 'svelte/store'

function createSolutionsLatex(item) {
	return item.solutions
		? item.solutions.map((solution) => {
				if (item.type === 'choice') {
					return item.choices[solution]
				} else {
					// console.log('solution', solution)
					const e = math(solution)
					return e.latex
				}
		  })
		: null
}

export function createCorrection(item) {
	const {
		expression,
		expression_latex,
		solutions,
		answers,
		answers_latex = [],
		correctionFormat,
		status = STATUS_EMPTY,
		choices,
	} = item

	if (!solutions && !item.testAnswer) return

	const lines = []
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
		return '$$' + item.expression_latex + '$$'
	}

	const regexExpression2 = /&expression2/g
	function replaceExpression2() {
		return '$$' + item.expression2_latex + '$$'
	}

	const regexExp = /&exp/g
	function replaceExp() {
		return item.expression_latex
	}

	const regexExp2 = /&exp2/g
	function replaceExp2() {
		return item.expression2_latex
	}

	const regexAnswer = /&answer([1-9]?)/g
	function replaceAnswerCorrect(match, p1) {
		return (
			`<span style="color:${correct_color}; border:2px solid ${correct_color}; border-radius: 5px;  margin:2px; padding:5px;display:inline-block">` +
			(item.type === 'choice'
				? item.choices[item.answers[p1 ? p1 - 1 : 0]].text
				: get(toMarkup)('$$' + answers_latex[p1 ? p1 - 1 : 0] + '$$')) +
			'</span>'
		)
	}

	const regexAns = /&ans([1-9]?)/g
	function replaceAnsCorrect(match, p1) {
		return (
			`\\enclose{roundedbox}[3px solid ${correct_color}, padding="auto"]{\\textcolor{${correct_color}}{` +
			answers_latex[p1 ? p1 - 1 : 0] +
			'}}'
		)
	}

	const regexSolution = /&solution([1-9]?)/g
	function replaceSolution(match, p1) {
		return (
			`<span style="color:${correct_color}; border:2px solid ${correct_color}; border-radius: 5px; margin:2px;padding:5px;display:inline-block">` +
			(item.type === 'choice'
				? item.choices[solutions[p1 ? p1 - 1 : 0]].text
				: '$$' + solutions_latex[p1 ? p1 - 1 : 0] + '$$') +
			'</span>'
		)
	}

	function replaceSolutionTexmacs(match, p1) {
		return item.type === 'choice'
			? item.choices[solutions[p1 ? p1 - 1 : 0]].text
			: `$\\textcolor{green}{` + solutions_latex[p1 ? p1 - 1 : 0] + '}$'
	}

	const regexSol = /&sol([1-9]?)/g
	function replaceSol(match, p1) {
		return item.type === 'choice'
			? item.choices[solutions[p1 ? p1 - 1 : 0]].text
			: `\\enclose{roundedbox}[3px solid ${correct_color}, padding="6"]{\\textcolor{${correct_color}}{` +
					solutions_latex[p1 ? p1 - 1 : 0] +
					'}}'
	}

	function replaceSolTexmacs(match, p1) {
		return item.type === 'choice'
			? item.choices[solutions[p1 ? p1 - 1 : 0]].text
			: `\\textcolor{green}{` + solutions_latex[p1 ? p1 - 1 : 0] + '}'
	}

	function replaceAnswerUncorrect(match, p1) {
		return (
			`<span style="color:${
				item.statuss[p1 ? p1 - 1 : 0] === STATUS_UNOPTIMAL_FORM
					? unoptimal_color
					: item.statuss[p1 ? p1 - 1 : 0] === STATUS_CORRECT
					? correct_color
					: incorrect_color
			};display:inline-block">` +
			(item.type === 'choice'
				? item.choices[item.answers[p1 ? p1 - 1 : 0]].text
				: '$$' + answers_latex[p1 ? p1 - 1 : 0] + '$$') +
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
			let html
			correctionFormat.correct.forEach((format) => {
				if (format === 'image') {
					let img = choices[solutions[0]].imageBase64
					html = `<img src='${img}' style="max-width:400px;max-height:40vh;" alt='toto'>`
				} else {
					html = formatToLatex(format)
						.replace(regexExpression2, replaceExpression2)
						.replace(regexExpression, replaceExpression)
						.replace(regexExp2, replaceExp2)
						.replace(regexExp, replaceExp)
						.replace(regexAnswer, replaceAnswerCorrect)
						.replace(regexAns, replaceAnsCorrect)
				}

				lines.push({ html: get(formatToHtml)(formatToLatex(html)) })
			})
		} else {
			correctionFormat.uncorrect.forEach((format) => {
				let html
				let texmacs
				if (format === 'image') {
					let img = choices[solutions[0]].imageBase64
					html = `<img style="max-width:400px;max-height:40vh;" src='${img}' alt='toto'>`
				} else {
					html = formatToLatex(format)
						.replace(regexExpression2, replaceExpression2)
						.replace(regexExpression, replaceExpression)
						.replace(regexExp2, replaceExp2)
						.replace(regexExp, replaceExp)
						.replace(regexSolution, replaceSolution)
						.replace(regexSol, replaceSol)
					texmacs = formatToTexmacs(format)
						.replace(regexExpression2, replaceExpression2)
						.replace(regexExpression, replaceExpression)
						.replace(regexExp2, replaceExp2)
						.replace(regexExp, replaceExp)
						.replace(regexSolution, replaceSolutionTexmacs)
						.replace(regexSol, replaceSolTexmacs)
				}

				lines.push({ html: get(formatToHtml)(html), texmacs })
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
				let html

				// if (status === STATUS_CORRECT) {
				// 	html =
				// 		`$$${expression_latex}=$$` +
				// 		`<span style="color:${correct_color}; border:2px solid ${correct_color}; border-radius: 5px;  margin:2px; padding:5px;display:inline-block">` +
				// 		'$$' +
				// 		answers_latex[0] +
				// 		'$$' +
				// 		'</span>'
				// } else if (status === STATUS_EMPTY) {
				// 	html =
				// 		`$$${expression_latex}=$$` +
				// 		`<span style="color:${correct_color}; border:2px solid ${correct_color}; border-radius: 5px;  margin:2px; padding:5px;display:inline-block">` +
				// 		'$$' +
				// 		solutions_latex[0] +
				// 		'$$' +
				// 		'</span>'
				// } else {
				html = `$$\\begin{align*}  ${expression_latex}`
				if (status === STATUS_INCORRECT) {
					html += `&= \\enclose{updiagonalstrike}[3px solid ${incorrect_color}]{${answers_latex[0]}} \\\\`
				} else if (status === STATUS_BAD_FORM || status === STATUS_BAD_UNIT) {
					html += `&= \\textcolor{${incorrect_color}}{${answers_latex[0]}} \\\\`
				} else if (status === STATUS_UNOPTIMAL_FORM) {
					html += `&= \\textcolor{${unoptimal_color}}{${answers_latex[0]}} \\\\`
				}
				if (status === STATUS_CORRECT) {
					html += `&=\\enclose{roundedbox}[2px solid ${correct_color}, padding='2']{\\textcolor{${correct_color}}{${answers_latex[0]}}}`
				} else {
					html += `&=\\enclose{roundedbox}[2px solid ${correct_color}, padding='2']{\\textcolor{${correct_color}}{${solutions_latex[0]}}}`
				}
				html += '\\end{align*}$$'
				// }
				const texmacs =
					'<math|' +
					math(expression).texmacs +
					`=<with|color|#66bb6a|${math(solutions[0]).texmacs}>>`

				lines.push({ html: get(formatToHtml)(formatToLatex(html)), texmacs })

				break
			}

			case 'equation': {
				// let exp = '$$\\begin{align*}x & =5-3 \\\\  & =2\\end{align*}$$'
				let html
				html = `$$\\begin{align*}  x`
				if (status === STATUS_EMPTY) {
					html +=
						`=\\enclose{roundedbox}[3px solid ${correct_color}]{\\textcolor{${correct_color}}{${solutions_latex[0]}}}` +
						'\\end{align*}$$'
				} else if (status === STATUS_INCORRECT) {
					html +=
						`&= \\enclose{updiagonalstrike}[6px solid rgba(205, 0, 11, .4)]{\\textcolor{${incorrect_color}}{${answers_latex[0]}}}` +
						`\\\\&= \\enclose{roundedbox}[3px solid ${correct_color}]{\\textcolor{${correct_color}}{${solutions_latex[0]}}}\\end{align*}$$`
				} else if (
					status === STATUS_BAD_FORM ||
					status === STATUS_UNOPTIMAL_FORM
				) {
					html +=
						`&= \\textcolor{${unoptimal_color}}{${answers_latex[0]}}` +
						`\\\\&= \\enclose{roundedbox}[3px solid ${correct_color}]{\\textcolor{${correct_color}}{${solutions_latex[0]}}}\\end{align*}$$`
				} else {
					html += `=\\enclose{roundedbox}[3px solid ${correct_color}]{\\textcolor{${correct_color}}{${answers_latex[0]}}}\\end{align*}$$`
				}
				lines.push({ html: get(formatToHtml)(html) })

				break
			}
			case 'choice':
			case 'choices': {
				// line = '<div class="flex flex-wrap justify-start">'
				let choices = []
				item.choices.forEach((choice, i) => {
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
						c.html = get(formatToHtml)(formatToLatex(choice.text))
					}
					if (answers || c.solution) {
						choices.push(c)
					}
				})

				lines.push({ choices })
				break
			}

			case 'fill in': {
				//TODO : empty ?
				let html
				if (status === STATUS_CORRECT) {
					html =
						'$$' +
						expression_latex.replace(
							/\\ldots/,
							`\\enclose{roundedbox}[2px solid ${correct_color}]{\\textcolor{${correct_color}}{${answers_latex[0]}}}`,
						) +
						'$$'
				} else {
					html =
						'$$' +
						expression_latex.replace(
							/\\ldots/,
							`\\enclose{roundedbox}[2px solid ${correct_color}]{\\textcolor{${correct_color}}{${solutions_latex[0]}}}`,
						) +
						'$$'

					if (status === STATUS_INCORRECT || status === STATUS_BAD_FORM) {
						coms.unshift(
							'Ta réponse : $$' +
								expression_latex.replace(
									/\\ldots/,
									`\\textcolor{${incorrect_color}}{${answers_latex[0]}}`,
								) +
								'$$',
						)
					} else if (status === STATUS_UNOPTIMAL_FORM) {
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
				let i = -1
				const putSolutions = () => {
					i++
					return `<with|color|#66bb6a|${math(solutions[i]).texmacs}>`
				}
				expression
				const texmacs =
					'<math|' +
					math(expression).texmacs.replace(/\.\.\.\.\.\./g, putSolutions) +
					'>'
				lines.push({ html: get(formatToHtml)(html), texmacs })
			}
		}
	}

	if (item.answers) {
		coms = coms.map((com) =>
			get(formatToHtml)(com).replace(/_COLORANSWER_/g, answerColor),
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
				? get(formatToHtml)(item.choices[solutions[p1 ? p1 - 1 : 0]].text)
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
							? get(formatToHtml)(item.choices[solutions[0]].text)
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
	lines = lines.map(get(formatToHtml))
	return lines
}
