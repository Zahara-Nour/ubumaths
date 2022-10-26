<script>
	import {
		toMarkup,
		formatLatex,
		MathfieldElement,
		virtualKeyboardMode,
	} from '$lib/stores'
	import { afterUpdate, onDestroy, tick } from 'svelte'
	import { getLogger } from '$lib/utils'
	import virtualKeyboard from '$lib/mathlive/virtualKeyboard'
	import Button, { Label } from '@smui/button'
	import { createDetailedCorrection } from '$lib/questions/correctionItem'
	import { mdc_colors as colors } from '$lib/colors'
	import CorrectionLine from './CorrectionLine.svelte'
	import { assessItem } from '$lib/questions/correction'

	export let question
	export let interactive = false
	export let masked = false
	export let magnify = 1
	export let correction = false
	export let simpleCorrection = []
	export let detailedCorrection = null
	export let commit
	export let immediateCommit

	let { fail, trace, info } = getLogger('correction', 'trace')

	let enounce
	let enounce2
	let expression
	let expression2
	let mfs = []
	let nmfs = 0
	let answers
	let answers_latex
	let answerFields
	let keyListeners = []
	let inputListeners = []
	let changeListeners = []
	let fieldsNb = 0
	let coms

	// console.log('context', params)

	function onChoice(i) {
		if (interactive) {
			if (question.type === 'choices') {
				if (answers.includes(i)) {
					answers = answers.filter((a) => a != i)
				} else {
					answers = [...answers, i]
				}
			} else {
				answers = answers[0] === i ? [] : [i]
				if (immediateCommit) commit.exec()
			}
		}
	}

	function recordAnswer(i) {
		answers_latex[i] = mfs[i]
			.getValue()
			// on remplace plusieurs espaces par un seul, bizarrz normalement pas besoin
			.replace(/(\\,){2,}/g, '\\,')
			.trim()
		answers[i] = mfs[i]
			.getValue('ascii-math')
			// .replace(/xx/g, '*')
			.replace(/÷/g, ':')
			.replace(/\((\d+(,\d+)*)\)\//g, (_, p1) => p1 + '/')
			.replace(/\(([a-z])\)\//g, (_, p1) => p1 + '/')
			.replace(/\/\((\d+(,\d+)*)\)/g, (_, p1) => '/' + p1)
			.replace(/\/\(([a-z])\)/g, (_, p1) => '/' + p1)
			.trim()
	}

	function removeListeners() {
		if (mfs) {
			mfs.forEach((mf) => {
				if (mf.hasFocus()) {
					mf.blur()
				}
			})
		}
		keyListeners.forEach((listener, i) =>
			mfs[i].removeEventListener('key', listener),
		)
		inputListeners.forEach((listener, i) =>
			mfs[i].removeEventListener('input', listener),
		)
		changeListeners.forEach((listener, i) =>
			mfs[i].removeEventListener('change', listener),
		)
		keyListeners = []
		inputListeners = []
		changeListeners = []
	}

	// onChange est appelée quand :
	// - l'utilisateur appuie sur entrée du clavier virtuel ou du clavier physique
	//  (même si le mathfield est vide)
	// - quand le mathfield perd le focus et que le contenu a changé
	function onChange(ev, i) {
		if (mfs[i].hasFocus()) {
			// TODO: empêcher le commit quand le mathfield est vide
			// la touche entrée a été appuyée et il n'y a qu'un seul mathfield, on commit
			if (mfs.length === 1 && immediateCommit) {
				// removeListeners ????
				removeListeners()
				commit.exec()
			} else {
				// mfs[(i + 1) % mfs.length].focus()
			}
		}
	}

	function onInput(ev, i) {
		recordAnswer(i)
	}

	// keystroke on physical keyboard
	function onKeystroke(ev, i) {
		const mf = mfs[i]
		const key_allowed = 'azertyuiopsdfghjklmwxcvbn0123456789,.=<>/*-+()^%€L'
		const key_allowed2 = [
			'Backspace',
			'ArrowLeft',
			'ArrowRight',
			'ArrowDown',
			'ArrowUp',
		]
		const keystroke_allowed = ['Enter', 'NumpadEnter']

		const keystroke = ev.code
		const key = ev.key
		// console.log('onKeyStroke')
		// console.log('answers_latex', answers_latex[i])
		if (
			keystroke === 'Space'
			//  &&
			// !(
			// 	answers_latex[i] &&
			// 	answers_latex[i].length >= 2 &&
			// 	answers_latex[i].slice(answers_latex[i].length - 2) === '\\,'
			// )
		) {
			// console.log('prevent space')
			// ev.preventDefault()
			mfs[i].insert('2\\,3')
		} else if (key === '%') {
			ev.preventDefault()
			mf.insert('\\%')
		} else if (key === 'r') {
			ev.preventDefault()
			mf.insert('\\sqrt')
		} else if (key === '*') {
			ev.preventDefault()
			mf.insert('\\times ')
		} else if (key === ':') {
			ev.preventDefault()
			mf.insert('\\div ')
			// }
		} else if (
			!key_allowed.includes(key) &&
			!key_allowed2.includes(key) &&
			!keystroke_allowed.includes(keystroke)
		) {
			ev.preventDefault()
		}
	}

	function addMathfield() {
		let id = `mf-${question.num}-${nmfs}`
		if (masked) id = id + '-masked'
		nmfs++
		return `<span id='${id}'}/>`
	}

	function manageFocus() {
		mfs.forEach((mfe) => {
			mfe.virtualKeyboardState =
				mfe.hasFocus() && $virtualKeyboardMode ? 'visible' : 'hidden'
		})
	}

	function initQuestion(question) {
		if (!masked) console.log('init question')

		removeListeners()

		mfs = []
		nmfs = 0

		// pour  empecher un update
		const q = question
		if (!question.detailedCorrection && question.correctionDetails) {
			q.detailedCorrection = createDetailedCorrection(question)
		}
		detailedCorrection = question.detailedCorrection
		answers = question.answers
		answers_latex = question.answers_latex

		enounce = question.enounce ? $formatLatex(question.enounce) : null
		enounce2 = question.enounce2 ? $formatLatex(question.enounce2) : null
	}

	function makeCorrection(answers) {
		if (!masked) console.log('makeCorrection')
		if (interactive) {
			const item = { ...question, answers, answers_latex }
			assessItem(item)
			if (!masked) console.log('assess item', item)
			coms = item.coms
			simpleCorrection = item.simpleCorrection
		} else if (question.simpleCorrection) {
			simpleCorrection = question.simpleCorrection
		} else {
			const q = question
			assessItem(q)
			if (!masked) console.log('assess item', q)
			simpleCorrection = q.simpleCorrection
			detailedCorrection = q.detailedCorrection
		}
	}

	function commitAnswers() {
		// pour prévenir un update de question
		const q = question
		q.answers = answers
		q.answers_latex = answers_latex
		assessItem(q)
		if (!masked) console.log('assess item', q)
	}

	async function prepareInteractive() {
		if (!masked) console.log('prepare interactive')
		mfs = []
		nmfs = 0

		expression = question.expression_latex
		expression2 = question.expression2_latex

		if (
			expression &&
			(question.type === 'result') &&
			!question.answerFields
		) {
			expression += '=\\ldots'
		}

		answerFields = question.answerFields
		if (
			!answerFields &&
			!expression &&
			question.type !== 'choice' &&
			question.type !== 'choices'
		) {
			answerFields = '$$?$$'
		}

		if (answerFields) {
			answerFields = $formatLatex(
				answerFields.replace(/\?/g, '\\ldots'),
			).replace(/…/g, addMathfield)
		}

		if (expression) {
			expression = $toMarkup(expression).replace(/…/g, addMathfield)
		}

		if (expression2) {
			expression2 = $toMarkup(expression2)
		}

		possiblyResetAnswers()

		if (!masked) console.log('tick')
		await tick()
		if (!masked) console.log('ticked')
		insertMathFields()
	}

	function stopInteractive() {
		if (!masked) console.log('stop interactive')
		removeListeners()
		mfs = null

		expression = question.expression_latex
		expression2 = question.expression2_latex
		answerFields = question.answerFields

		if (answerFields) {
			answerFields = $formatLatex(answerFields.replace(/\?/g, '\\ldots'))
		}

		if (expression) {
			expression = $toMarkup(expression)
		}

		if (expression2) {
			expression2 = $toMarkup(expression2)
		}

		possiblyResetAnswers()
	}

	function possiblyResetAnswers() {
		if (!interactive) {
			answers = null
			answers_latex = null
		} else {
			// if faut garder les réponses si on sort du mode correction
			if (!answers)
				answers = question.solutions
					? question.solutions.map((s) => '')
					: question.testAnswer.map((s) => '')
			if (!answers_latex)
				answers_latex = question.solutions
					? question.solutions.map((s) => '')
					: question.testAnswer.map((s) => '')
		}
	}

	$: initQuestion(question)

	$: if (question && !correction && interactive) {
		prepareInteractive()
	} else {
		stopInteractive()
	}

	$: makeCorrection(answers)

	onDestroy(() => {
		removeListeners()
	})

	function insertMathFields() {
		if (!masked) console.log('insertathFields', answers, answers_latex)
		const elements = []
		if (answerFields) {
			for (let i of document
				.querySelector(
					`#answerFields-${question.num}${masked ? '-masked' : ''}`,
				)
				.querySelectorAll('*')) {
				if (/^mf/g.test(i.id)) {
					elements.push(i)
				}
			}
		} else if (expression) {
			// console.log(`${question.num}${masked ? '-masked' : ''}`)
			const expressionElements = document.querySelector(
				`#expression-${question.num}${masked ? '-masked' : ''}`,
			)
			if (expressionElements) {
				for (let i of expressionElements.querySelectorAll('*')) {
					if (/^mf/g.test(i.id)) {
						elements.push(i)
					}
				}
			}
			if (expression2) {
				const expression2Elements = document.querySelector(
					`#expression2-${question.num}${masked ? '-masked' : ''}`,
				)
				for (let i of expression2Elements.querySelectorAll('*')) {
					if (/^mf/g.test(i.id)) {
						elements.push(i)
					}
				}
			}
		}

		let added
		elements.forEach((elt, i) => {
			if (!elt.hasChildNodes()) {
				const mfe = new $MathfieldElement()
				mfe.setOptions({
					soundsDirectory: '/sounds',
					// virtualKeyboardMode: 'onfocus',
					virtualKeyboardMode: 'off',
					// virtualKeyboardMode: 'manual',
					decimalSeparator: ',',
					...virtualKeyboard,
					inlineShortcuts: {
						xx: {},
					},
					keypressSound: null,
					keypressVibration: false,
					removeExtraneousParentheses: false,
					smartFence: false,
					superscript: false,
					mathModeSpace: '\\,',
				})

				if (answers_latex[i]) {
					mfe.value = answers_latex[i]
				}

				mfs.push(mfe)
				// answers.push('')
				// answers_latex.push('')
				elt.appendChild(mfe)
				elt.style.display = 'inline-block'
				elt.style.minWidth = '2em'
				mfe.style.overflow = 'unset'
				mfe.style.paddingLeft = '2px'
				mfe.style.paddingRight = '2px'
				elt.style.border = '2px dashed grey'
				elt.style.borderRadius = '5px'
				// const i = mfs.length - 1
				if (!masked) {
					const keyListener = (ev) => onKeystroke(ev, i)
					const inputListener = (ev) => onInput(ev, i)
					const changeListener = (ev) => onChange(ev, i)
					keyListeners.push(keyListener)
					inputListeners.push(inputListener)
					changeListeners.push(changeListener)
					mfe.addEventListener('keydown', keyListener)
					mfe.addEventListener('input', inputListener)
					mfe.addEventListener('change', changeListener)
					mfe.addEventListener('focus', manageFocus)
					mfe.addEventListener('blur', manageFocus)
				}
				added = true
			}
		})
		if (added && !masked) {
			if (!mfs[0].hasFocus()) {
				mfs[0].focus()
			}
		}

		fieldsNb = mfs?.length || 0
	}

	if (commit) {
		commit.hook = commitAnswers
	} else {
		commit = { exec: commitAnswers }
	}
</script>

<div class="flex flex-col items-center justify-around">
	{#each question.order_elements as element}
		{#if element === 'enounce' && enounce}
			<div
				id="enounce"
				class="{(correction ? 'mb-1' : 'my-3') +
					' text-center max-w-4xl leading-normal'}"
				style="{`font-size:${correction ? 1 : magnify}rem;` +
					(correction ? 'color:' + colors['grey-600'] : '')}"
			>
				{@html enounce}
			</div>
		{:else if element === 'enounce2' && enounce2}
			<div
				id="enounce2"
				class="{(correction ? 'my-1' : 'my-3') + ' text-center max-w-4xl'}"
				style="{`font-size:${correction ? 1 : magnify}rem` +
					(correction ? 'color:' + colors['grey-600'] : '')}"
			>
				{@html enounce2}
			</div>
		{:else if element === 'enounce-image' && question.image}
			{#if correction && question.imageCorrection}
				{#await question.imageCorrectionBase64P}
					loading image
				{:then base64}
					<div style="display:inline-block;background-color:white;">
						<img
							src="{base64}"
							class="my-3 w-full max-w-lg"
							style="max-height:40vh; object-fit: contain;"
							alt="Alright Buddy!"
						/>
					</div>
				{:catch error}
					{error}
				{/await}
			{:else}
				{#await question.imageBase64P}
					loading image
				{:then base64}
					<div style="display:inline-block;background-color:white;">
						<img
							src="{base64}"
							class="my-3 w-full max-w-lg"
							style="max-height:40vh; object-fit: contain;"
							alt="Alright Buddy!"
						/>
					</div>
				{:catch error}
					{error}
				{/await}
			{/if}
		{:else if element === 'expression' && expression && (!correction || question.answerFields || (question.type !== 'result' && question.type !== 'trou'))}
			<div
				id="expressions"
				class=" flex flex-col items-center justify-center"
				style="{`max-width:100%;font-size:${
					correction ? 1 : magnify * 1.5
				}rem;` + (correction ? 'color:' + colors['grey-600'] : '')}"
			>
				<div
					id="{`expression-${question.num}${masked ? '-masked' : ''}`}"
					class="{correction ? 'my-1' : 'my-3'}"
					style="display:flex; align-items: baseline;max-width:100%"
				>
					{@html expression}
				</div>
				{#if expression2 && !(!interactive && question.type === 'equation')}
					<div
						id="{`expression2-${question.num}${masked ? '-masked' : ''}`}"
						class="{correction ? 'my-1' : 'my-3'}"
					>
						{@html expression2}
					</div>
				{/if}
			</div>
		{:else if !correction && element === 'choices' && question.choices}
			<div
				class="mt-3 flex flex-wrap justify-around"
				style="{`font-size:${magnify}rem`}"
			>
				{#each question.choices as choice, i}
					<button
						class="rounded-lg  m-2 p-2"
						style="{`font-size:1em; min-width:2em;border: 4px solid ${
							interactive && answers.includes(i)
								? 'var(--mdc-theme-primary)'
								: 'var(--mdc-theme-secondary)'
						};`}"
						on:click="{() => onChoice(i)}"
					>
						{#if choice.image}
							{#await choice.imageBase64P}
								loading image
							{:then base64}
								<img
									class="white"
									src="{base64}"
									style="max-width:min(400px,80%);max-height:40vh;"
									alt="{`choice ${i}`}"
								/>
							{:catch error}
								{error}
							{/await}
						{/if}
						{#if choice.text}
							<div>
								{@html $formatLatex(choice.text)}
							</div>
						{/if}
					</button>
				{/each}
			</div>
		{/if}
	{/each}
	{#if (!correction && question.answerFields && question.type === 'trou') || (!correction && answerFields && interactive)}
		<div
			id="{`answerFields-${question.num}${masked ? '-masked' : ''}`}"
			class="my-3 flex flex-col items-center justify-center"
		>
			<div
				id="{`answerFields-${question.num}${masked ? '-masked' : ''}`}"
				class="my-3"
				style="{`font-size:${magnify}rem`}"
			>
				{@html answerFields}
			</div>
		</div>
	{/if}
	{#if !correction && interactive && (question.type === 'choices' || fieldsNb > 1) && immediateCommit}
		<Button
			class="mt-3 p-1"
			on:click="{() => {
				commit.exec()
			}}"
			variant="raised"
		>
			<Label>Valider 2</Label>
		</Button>
	{/if}

	{#if correction}
		<div class="mt-3">
			{#each simpleCorrection as line}
				<div
					class=" my-1 z-0 relative"
					style="{`word-break: break-word ;white-space: normal;font-size:${
						magnify === 1 ? 1.2 : magnify
					}rem`}"
				>
					<CorrectionLine line="{line}" />
				</div>
			{/each}
		</div>

		{#if coms && interactive}
			<div>
				{#each coms as com}
					{@html com}
				{/each}
			</div>
		{/if}
	{/if}
</div>

<style>
	math-field {
		min-height: 200px;
	}
</style>
