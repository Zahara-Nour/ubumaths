import {
	STATUS_BAD_FORM,
	STATUS_CORRECT,
	STATUS_INCORRECT,
	STATUS_UNOPTIMAL_FORM,
	STATUS_EMPTY,
	STATUS_BAD_UNIT,
} from './correction'
import { correct_color, incorrect_color, unoptimal_color } from '$lib/stores'
import { formatLatexToHtml } from '$lib/stores'
import math from '@repo/tinycas'
import { formatToLatex, formatToTexmacs } from '$lib/utils'
import { get } from 'svelte/store'
import {
	isQuestionChoice,
	type Choice,
	type CorrectedQuestion,
	type Line,
	type LineChoice,
	isQuestionFillIn,
	isQuestionResultOrRewrite,
	isQuestionChoices,
	type Question,
	isQuestionAnswerField,
} from '../../types/type'

const regexSol = /&sol([1-9]?)/g
const regexExp = /&exp/g
const regexExpression = /&expression/g
const regexExpression2 = /&expression2/g
const regexSolution = /&solution([1-9]?)/g
const regexExp2 = /&exp2/g
const regexAns = /&ans([1-9]?)/g
const regexAnswer = /&answer([1-9]?)/g

export function createCorrection(item: CorrectedQuestion) {
	i_answer = -1
	i_solution = -1
	const {
		expression,
		expression_latex,
		solutions,
		answers,
		answers_latex = [],
		correctionFormat,
		status = STATUS_EMPTY,
		choices,
		answerFormat,
	} = item

	if (!solutions.length && !item.testAnswers.length) return

	let lines: Line[] = []
	let coms = item.coms || []

	let answerColor = get(correct_color)
	if (status === STATUS_BAD_FORM || status === STATUS_INCORRECT || status === STATUS_BAD_UNIT) {
		answerColor = get(incorrect_color)
	} else if (status === STATUS_UNOPTIMAL_FORM) {
		answerColor = get(unoptimal_color)
	}

	if (correctionFormat) {
		console.log('corectionFormat', correctionFormat)
		// la correction
		if (status === STATUS_CORRECT) {
			correctionFormat.correct.forEach((format) => {
				if (format === 'image') {
					const img = choices[solutions[0] as number].imageBase64
					const html = `<img src='${img}' style="max-width:400px;max-height:40vh;" alt='toto'>`
					lines.push({
						html,
					})
				} else {
					const text = (formatToLatex(format) as string)
						.replace(regexExpression2, replaceExpression2)
						.replace(regexExpression, replaceExpression)
						.replace(regexExp2, replaceExp2)
						.replace(regexExp, replaceExp)
						.replace(regexAnswer, replaceAnswerCorrect)
						.replace(regexAns, replaceAnsCorrect)
					lines.push({
						text,
					})
				}
			})
		} else {
			;(correctionFormat.uncorrect as string[]).forEach((format) => {
				if (format === 'image') {
					let img = choices[solutions[0] as number].imageBase64
					const html = `<img style="max-width:400px;max-height:40vh;" src='${img}' alt='toto'>`
					lines.push({ html })
				} else {
					const text = (formatToLatex(format) as string)
						.replace(regexExpression2, replaceExpression2)
						.replace(regexExpression, replaceExpression)
						.replace(regexExp2, replaceExp2)
						.replace(regexExp, replaceExp)
						.replace(regexSolution, replaceSolution)
						.replace(regexSol, replaceSol)
					const texmacs = (formatToTexmacs(format) as string)
						.replace(regexExpression2, replaceExpression2)
						.replace(regexExpression, replaceExpression)
						.replace(regexExp2, replaceExp2)
						.replace(regexExp, replaceExp)
						.replace(regexSolution, replaceSolutionTexmacs)
						.replace(regexSol, replaceSolTexmacs)
					lines.push({ text, texmacs })
				}
			})

			// le commentaire avec la réponse de l'utilisateur

			if (status !== STATUS_EMPTY && item.answers.length) {
				if (correctionFormat.answer === 'image') {
					// TODO: A revoir
					const img = choices[answers[0] as number].imageBase64
					coms.unshift(
						`<img src='${img}' style="padding:2px; border: 2px solid ${get(
							incorrect_color,
						)} ;max-width:400px;max-height:40vh;" alt='toto'>`,
					)
					coms.unshift('Ta réponse:')
				} else {
					coms.unshift(
						'Ta réponse : ' +
							(correctionFormat.answer as string)
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
	} else if (isQuestionAnswerField(item)) {
		const answerField = item.answerField
			.replace(/\\text\{(.*?)\}/g, (_, p1) => p1)
			.replace(/\$\$(.*?)\$\$/g, (_, p1) => '$$' + math(p1).latex + '$$')
		if (status === STATUS_CORRECT) {
			const text = putAnswers(answerField, item, /\.\.\./g)
			lines.push({
				text,
			})
		} else {
			const text = putSolutions(answerField, item, /\.\.\./g)
			lines.push({
				text,
			})
			if (status !== STATUS_EMPTY) {
				coms.unshift('Ta réponse : ' + putAnswers(answerField, item, /\.\.\./g) + ' ')
			}
		}
	} else if (isQuestionChoice(item) || isQuestionChoices(item)) {
		// line = '<div class="flex flex-wrap justify-start">'
		let choices: LineChoice[] = []
		item.choices.forEach((choice, i) => {
			const c: LineChoice = {}

			if (solutions.includes(i)) {
				c.solution = true
				if (answers.includes(i)) {
					c.badge = 'correct'
				}
			} else if (answers.includes(i)) {
				c.badge = 'incorrect'
			}

			if (choice.image) {
				c.image = choice.imageBase64
			} else {
				c.text = choice.text
			}
			if (answers.length || c.solution) {
				choices.push(c)
			}
		})

		lines.push({ choices })
	} else if (isQuestionFillIn(item)) {
		//TODO : empty ?
		let text
		if (status === STATUS_CORRECT) {
			text = '$$' + (expression_latex as string).replace(/\\ldots/g, () => putAnswer(item)) + '$$'
		} else {
			text = '$$' + (expression_latex as string).replace(/\\ldots/g, () => putSolution(item)) + '$$'
			if (status !== STATUS_EMPTY) {
				coms.unshift(
					'Ta réponse : $$' +
						(expression_latex as string).replace(/\\ldots/g, () => putAnswer(item)) +
						'$$. ',
				)
			}
		}
		let i = -1
		const putSolutions = () => {
			i++
			return `<with|color|#66bb6a|${math(solutions[i]).texmacs}>`
		}

		const texmacs =
			'<math|' + math(expression as string).texmacs.replace(/\.\.\.\.\.\./g, putSolutions) + '>'
		lines.push({ text, texmacs })
	} else if (isQuestionResultOrRewrite(item)) {
		const answer = item.answerFormat_latex.replace(/\\ldots/g, () => putAnswer(item))
		const solution = item.answerFormat_latex.replace(/\\ldots/g, () => putSolution(item))
		let text = `$$\\begin{align*}  ${expression_latex}`
		if (status !== STATUS_CORRECT && status !== STATUS_EMPTY) {
			text +=
				'&' +
				(status === STATUS_INCORRECT && item.statuss.some((status) => status === STATUS_INCORRECT)
					? `\\textcolor{${get(incorrect_color)}}{\\ne}`
					: '=')
			text += answer + '\\\\'
		}

		if (status === STATUS_CORRECT) {
			text += `&=\\enclose{roundedbox}[2px solid ${get(correct_color)}]{${answer}}`
		} else {
			text += `&=\\enclose{roundedbox}[2px solid ${get(correct_color)}]{${solution}}`
		}
		text += '\\end{align*}$$'

		// console.log('expression', expression)
		// console.log('solutions[0]', solutions[0])
		let texmacs = ''
		if (expression) {
			texmacs =
				'<math|' +
				math(expression as string).texmacs +
				`=<with|color|#66bb6a|${math(solutions[0]).texmacs}>>`
		}

		lines.push({
			text,
			texmacs,
		})
	}

	if (item.answers.length) {
		// mode projection
		coms = coms.map((com) =>
			(get(formatLatexToHtml)(com) as string).replace(/_COLORANSWER_/g, answerColor),
		)
	}
	lines = lines.map((l) => {
		if (l.text) {
			return {
				...l,
				html: get(formatLatexToHtml)(l.text) as string,
			}
		} else if (l.choices) {
			return {
				...l,
				choices: l.choices.map((c) =>
					c.text ? { ...c, html: get(formatLatexToHtml)(c.text) as string } : c,
				),
			}
		} else return l
	})
	item.coms = coms
	item.simpleCorrection = lines
}

export function createDetailedCorrection(item: CorrectedQuestion) {
	const { correctionDetails } = item
	let lines: Line[] = []
	let line: Line

	correctionDetails.forEach((detail) => {
		if (detail.type === 'image') {
			// le base64 de l'image a été préparé lors de la génération de la question
			let img = detail.base64
			line = {
				html: `<img src='${img}' style="max-width:400px;max-height:40vh;" alt='toto'>`,
			}
		} else {
			// console.log('text', detail.text)
			line = {
				text: detail.text
					.replace(regexExpression2, () => replaceExpression2(item))
					.replace(regexExpression, () => replaceExpression(item))
					.replace(regexExp2, () => replaceExp2(item))
					.replace(regexExp, () => replaceExp(item))
					.replace(regexSolution, (_, p1) => replaceSolution(item, p1))
					.replace(regexSol, (_, p1) => replaceSol(item, p1)),
			}
			// console.log('line', line.text)
		}
		lines.push(line)
	})
	lines = lines.map((l) => ({
		...l,
		html: get(formatLatexToHtml)(l.text!) as string,
	}))
	item.detailedCorrection = lines
	return lines
}

function createSolutionsLatex(item: Question) {
	return item.solutions?.length
		? item.solutions.map((solution) => {
				if (isQuestionChoice(item)) {
					return item.choices[solution as number]
				} else {
					const e = math(solution)
					return e.latex
				}
			})
		: []
}

function replaceExpression(item: CorrectedQuestion) {
	return '$$' + item.expression_latex + '$$'
}

function replaceExpression2(item: CorrectedQuestion) {
	return '$$' + item.expression2_latex + '$$'
}

// &exp est déjà dans une expression LaTeX : on ne rajoute pas les $$
function replaceExp(item: CorrectedQuestion) {
	return item.expression_latex || ''
}

// &exp2 est déjà dans une expression LaTeX : on ne rajoute pas les $$
function replaceExp2(item: CorrectedQuestion) {
	return item.expression2_latex || ''
}

function replaceAnswerCorrect(p1: number, item: CorrectedQuestion) {
	return (
		`<span style="color:${get(correct_color)}; border:2px solid ${get(
			correct_color,
		)}; border-radius: 5px;  margin:2px; padding:5px;display:inline-block">` +
		(isQuestionChoice(item)
			? item.choices[item.answers[p1 ? p1 - 1 : 0] as number].text
			: '$$' + item.answers_latex[p1 ? p1 - 1 : 0] + '$$') +
		'</span>'
	)
}

// &ans est déjà dans une expression LaTeX : on ne rajoute pas les $$

function replaceAnsCorrect(p1: number, item: CorrectedQuestion) {
	return (
		`\\enclose{roundedbox}[3px solid ${get(correct_color)}]{\\textcolor{${get(correct_color)}}{` +
		item.answers_latex[p1 ? p1 - 1 : 0] +
		'}}'
	)
}

function replaceSolution(item: CorrectedQuestion, p1?: number) {
	const solutions_latex = createSolutionsLatex(item)
	return (
		`<span style="color:${get(correct_color)}; border:2px solid ${get(
			correct_color,
		)}; border-radius: 5px; margin:2px;padding:5px;display:inline-block">` +
		(isQuestionChoice(item)
			? item.choices[item.solutions[p1 ? p1 - 1 : 0] as number].text
			: '$$' + (solutions_latex[p1 ? p1 - 1 : 0] as string) + '$$') +
		'</span>'
	)
}

function replaceSolutionTexmacs(p1: number, item: CorrectedQuestion) {
	const solutions_latex = createSolutionsLatex(item)
	return isQuestionChoice(item)
		? (item.choices[item.solutions[p1 ? p1 - 1 : 0] as number].text as string)
		: `$\\textcolor{green}{` + solutions_latex[p1 ? p1 - 1 : 0] + '}$'
}

function replaceSolTexmacs(p1: number, item: CorrectedQuestion) {
	const solutions_latex = createSolutionsLatex(item)
	return isQuestionChoice(item)
		? (item.choices[item.solutions[p1 ? p1 - 1 : 0] as number].text as string)
		: `\\textcolor{green}{` + solutions_latex[p1 ? p1 - 1 : 0] + '}'
}

function replaceAnswerUncorrect(p1: number, item: CorrectedQuestion) {
	return (
		`<span style="color:${
			item.statuss[p1 ? p1 - 1 : 0] === STATUS_UNOPTIMAL_FORM
				? get(unoptimal_color)
				: item.statuss[p1 ? p1 - 1 : 0] === STATUS_CORRECT
					? get(correct_color)
					: get(incorrect_color)
		};display:inline-block">` +
		(isQuestionChoice(item)
			? item.choices[item.answers[p1 ? p1 - 1 : 0] as number].text
			: '$$' + item.answers_latex[p1 ? p1 - 1 : 0] + '$$') +
		'</span>'
	)
}

function replaceAnsUncorrect(p1: number, item: CorrectedQuestion) {
	return (
		`\\textcolor{${
			item.statuss[p1 ? p1 - 1 : 0] === STATUS_UNOPTIMAL_FORM
				? get(unoptimal_color)
				: item.statuss[p1 ? p1 - 1 : 0] === STATUS_CORRECT
					? get(correct_color)
					: get(incorrect_color)
		}}{` +
		item.answers_latex[p1 ? p1 - 1 : 0] +
		'}'
	)
}

let i_answer = -1
function putAnswer(item: CorrectedQuestion) {
	i_answer++
	const color =
		item.statuss[i_answer] === STATUS_UNOPTIMAL_FORM
			? get(unoptimal_color)
			: item.statuss[i_answer] === STATUS_CORRECT
				? get(correct_color)
				: get(incorrect_color)
	const answer = item.answers_latex[i_answer]
		? `\\textcolor{${color}}{${item.answers_latex[i_answer]}}`
		: '\\ldots'

	return answer
}

export function putAnswers(s: string, item: CorrectedQuestion, regex = /\\ldots/g) {
	i_answer = -1
	return s.replace(regex, () => putAnswer(item))
}

// &sol est déjà dans une expression LaTeX : on ne rajoute pas les $$
function replaceSol(item: CorrectedQuestion, p1?: number) {
	const solutions_latex = createSolutionsLatex(item)

	let solution = ''

	if (isQuestionChoice(item)) {
		solution = item.choices[item.solutions[p1 ? p1 - 1 : 0] as number].text as string
	} else if (isQuestionFillIn(item)) {
		solution = p1
			? `\\textcolor{${get(correct_color)}}{` + (solutions_latex[p1 - 1] as string) + '}'
			: putSolutions(item.expression_latex, item)
	} else if (isQuestionResultOrRewrite(item)) {
		solution = p1
			? `\\enclose{roundedbox}[2px solid ${get(correct_color)}]{\\textcolor{${get(
					correct_color,
				)}}{` +
				(solutions_latex[p1 - 1] as string) +
				'}}'
			: putSolutions(item.answerFormat_latex, item)
	} else if (isQuestionAnswerField(item)) {
		solution = p1
			? `\\textcolor{${get(correct_color)}}{` + (solutions_latex[p1 - 1] as string) + '}'
			: putSolutions(
					item.answerField.replace(/\\text\{(.*)\}/g, (_, p1) => p1),
					item,
					/\.\.\./,
				)
	} else {
		solution = solutions_latex[0] as string
	}

	return solution
}

let i_solution = -1
function putSolution(item: Question) {
	const solutions_latex = createSolutionsLatex(item)
	i_solution++
	const solution = `\\textcolor{${get(correct_color)}}{${solutions_latex[i_solution]}}`
	return solution
}

export function putSolutions(s: string, item: Question, regex = /\\ldots/g) {
	i_solution = -1
	return s.replace(regex, () => putSolution(item))
}
