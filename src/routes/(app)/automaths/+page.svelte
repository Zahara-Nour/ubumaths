<script>
	import Tab, { Label } from '@smui/tab'
	import TabBar from '@smui/tab-bar'
	import Accordion, { Panel, Header, Content } from '@smui-extra/accordion'
	import Badge from '@smui-extra/badge'
	import IconButton, { Icon } from '@smui/icon-button'
	import Fab from '@smui/fab'
	import Select, { Option } from '@smui/select'
	import data, { getQuestion } from '$lib/questions/questions'
	import { gradeMatchesClass, grades } from '$lib/grades'
	import generateQuestion from '$lib/questions/generateQuestion'
	import Buttons from './Buttons.svelte'
	import Basket from './Basket.svelte'
	import QuestionCard from '$lib/components/questions/QuestionCard.svelte'
	import { fetchImage } from '$lib/images'
	import { goto } from '$app/navigation'
	import { getLogger } from '$lib/utils'
	import { darkmode, formatToHtml } from '$lib/stores'
	import { assessItem } from '$lib/questions/correction'
	import { dev } from '$app/environment'
	import { page } from '$app/stores'

	let { info, fail, warn } = getLogger('Automaths', 'info')
	const questions = data.questions

	let domain
	let subdomain
	let level
	let panelOpenStatus
	let domains = []
	let subdomains = []
	let grade = grades[grades.length - 1]
	let availableLevels
	let themes
	let theme
	let displayExemple = false
	let generated
	let showBasket = false
	let classroom = false
	let flash = false
	let basket = []
	let courseAuxNombres = false
	let correction = false

	// mode interactif pour l'exemple
	let interactive = true
	const ids = data.ids
	const first_theme = decodeURI($page.url.searchParams.get('theme'))
	const first_domain = decodeURI($page.url.searchParams.get('domain'))
	const first_subdomain = decodeURI($page.url.searchParams.get('subdomain'))
	const first_level = parseInt(
		decodeURI($page.url.searchParams.get('level')),
		10,
	)

	// $: console.log('theme', theme)
	// $: console.log('domain', domain)
	// $: console.log('subdomain', subdomain)
	// $: console.log('level', level)

	$: changeGrade(grade)
	$: changeTheme(theme)
	// $ changeDomain(domain)

	function generateExoLatex() {
		let questions = []
		if (basket.length) {
			questions = basket
		} else {
			const q = getQuestion(theme, domain, subdomain, level)
			questions.push({ id: q.id, count: 10 })
		}

		let offset = 0
		let enounce
		let solution = ''
		let generateds = []

		questions.forEach((q) => {
			const { theme, domain, subdomain, level } = ids[q.id]
			const question = getQuestion(theme, domain, subdomain, level)

			if (q.enounceAlone) {
				enounce =
					question.enounces[0]
						.replace(/\$\$/g, '$')
						.replace(/\\lt/g, '<')
						.replace(/\\gt/g, '>') + '\n'
				enounce += '\\begin{enumerate} \n'
				solution += '\\begin{enumerate} \n'
				for (let i = 0; i < q.count; i++) {
					const generated = generateQuestion(
						question,
						generateds,
						q.count,
						offset,
					)
					assessItem(generated)
					enounce += '\\item '
					solution +=
						'\\item ' +
						generated.simpleCorrection.map((line) => line.texmacs).join(' ')
					if (generated.expression) {
						enounce +=
							'$' +
							generated.expression_latex.replace(
								/\\ldots/g,
								'\\text{\\ \\ldots\\ldots \\ }',
							) +
							'$' +
							'\n'
					}
					if (generated.answerFields) {
						enounce +=
							generated.answerFields
								.replace(/\$\$/g, '$')
								.replace(/\.\.\./g, '\\text{\\ \\ldots\\ldots \\ }') + '\n'
					}
					generateds.push(generated)
				}
			} else {
				enounce = '\\begin{enumerate} \n'
				solution += '\\begin{enumerate} \n'
				for (let i = 0; i < q.count; i++) {
					const generated = generateQuestion(
						question,
						generateds,
						q.count,
						offset,
					)
					assessItem(generated)
					// console.log('simpleCorrectiopn', generated.simpleCorrection)
					solution +=
						'\\item ' +
						generated.simpleCorrection.map((line) => line.texmacs).join(' ')
					enounce +=
						'\\item ' +
						generated.enounce
							.replace(/\$\$/g, '$')
							.replace(/\\lt/g, '<')
							.replace(/\\gt/g, '>') +
						'\n'
					if (generated.expression) {
						enounce +=
							generated.expression_latex.replace(
								/\\ldots/g,
								'\\text{\\ \\ldots\\ldots \\ }',
							) + '\n'
					}
					if (generated.answerFields) {
						enounce +=
							generated.answerFields
								.replace(/\$\$/g, '$')
								.replace(/\.\.\./g, '\\text{\\ \\ldots\\ldots \\ }') + '\n'
						// console.log('enounce', enounce)
					}
					generateds.push(generated)
				}
			}

			offset += q.count
		})
		enounce += '\\end{enumerate}\n'
		solution += '\\end{enumerate}\n'

		const output = enounce + '\n' + solution
		navigator.clipboard
			.writeText(output)
			.then(function () {
				info('latex to clipboard: ', output)
			})
			.catch(function () {
				fail('failed to write exercice in latex to clipboard')
			})
	}

	function changeGrade(grade) {
		// console.log('-change grade')
		availableLevels = getAvailablesLevels(grade)
		themes = Object.keys(availableLevels)
		if (!theme && first_theme && themes.includes(first_theme)) {
			theme = first_theme
		} else {
			theme = themes[0]
		}
		domains = []
		subdomains = []
	}

	function changeTheme(t) {
		// console.log('-change theme', t)
		const domains = Object.keys(availableLevels[t])
		// console.log('domains', domains)
		if (domains) {
			panelOpenStatus = {}
			domains.forEach((d) => {
				panelOpenStatus[d] = false
			})
			const d =
				!domain && first_domain && domains.includes(first_domain)
					? first_domain
					: domains[0]

			panelOpenStatus[d] = true
			if (domains.length) {
				changeDomain(d)
			}
		}
	}

	function changeDomain(d) {
		// console.log('-change domain', d)
		domain = d
		const subdomains = Object.keys(availableLevels[theme][domain])
		// console.log('subdomains', subdomains)
		if (subdomains && subdomains.length) {
			const subd =
				!subdomain && first_subdomain && subdomains.includes(first_subdomain)
					? first_subdomain
					: subdomains[0]
			const levels = availableLevels[theme][domain][subd]
			// console.log('levels', levels)
			if (levels) {
				const l =
					!level && first_level && levels.includes(first_level)
						? first_level
						: levels[0]
				changeLevel(subd, l)
			}
		}
	}

	function changeLevel(subd, l) {
		// console.log('-change subd level', subd, l)
		subdomain = subd
		level = l
		// console.log('generate')
		generated = generateExemple(theme, domain, subdomain, level)

		// console.log('generated', generated)
	}

	function generateExemple(theme, domain, subdomain, level) {
		
		const q = getQuestion(theme, domain, subdomain, level)
		const generated = generateQuestion(q)
		if (generated.image) {
			generated.imageBase64P = fetchImage(generated.image)
		}
		if (generated.imageCorrection) {
			generated.imageCorrectionBase64P = fetchImage(generated.imageCorrection)
		}
		if (generated.choices) {
			generated.choices.forEach(async (choice) => {
				if (choice.image) {
					choice.imageBase64P = fetchImage(choice.image)
				}
			})
		}
		return generated
	}

	// suivant le niveau (grade), retourne l'ensemble des levels disponibles par theme/domaine/sous-domaine
	function getAvailablesLevels(grade) {
		const available = {}
		Object.keys(questions).forEach((theme) => {
			available[theme] = {}
			Object.keys(questions[theme]).forEach((domain) => {
				available[theme][domain] = {}
				Object.keys(questions[theme][domain]).forEach((subdomain) => {
					available[theme][domain][subdomain] = []
					questions[theme][domain][subdomain].forEach((q, i) => {
						if (gradeMatchesClass(q.grade, grade)) {
							available[theme][domain][subdomain].push(i + 1)
						}
					})
					if (!available[theme][domain][subdomain].length) {
						delete available[theme][domain][subdomain]
					}
				})
				if (!Object.keys(available[theme][domain]).length) {
					delete available[theme][domain]
				}
			})
			if (!Object.keys(available[theme]).length) {
				delete available[theme]
			}
		})
		// console.log('availables', available)
		return available
	}

	function launchTest() {
		let questions = []
		if (basket.length) {
			questions = basket
		} else {
			const q = getQuestion(theme, domain, subdomain, level)
			questions.push({ id: q.id, count: 10 })
		}

		let href = '/automaths/assessment/?questions='
		href += encodeURI(JSON.stringify(questions))
		if (classroom) href += '&classroom=true'
		if (flash) href += '&flash=true'
		if (courseAuxNombres) href += '&courseAuxNombres=true'
		goto(href)
	}
	function fillBasket() {
		addToBasket(theme, domain, subdomain, level, 1)
	}
	function flushBasket() {
		basket = []
	}
	function copyLink() {
		let questions = []
		if (basket.length) {
			questions = basket
		} else {
			const q = getQuestion(theme, domain, subdomain, level)
			questions.push({ id: q.id, count: 10 })
		}

		const base = dev ? 'http://localhost:5173/' : 'http://ubumaths.net/'

		let href = base + 'automaths/assessment/?questions='
		href += encodeURI(JSON.stringify(questions))
		if (classroom) href += '&classroom=true'
		if (flash) href += '&flash=true'
		if (courseAuxNombres) href += '&courseAuxNombres=true'
		navigator.clipboard
			.writeText(href)
			.then(function () {
				info('copy test url to clipboard: ', href)
			})
			.catch(function () {
				fail('failed to write exercice url to clipboard')
			})
	}

	function addToBasket(theme, domain, subdomain, level, count, delay) {
		let qs = questions[theme][domain][subdomain]
		const q = qs.find((q) => qs.indexOf(q) + 1 === parseInt(level, 10))
		if (!delay) delay = q.defaultDelay
		const index = basket.findIndex((item) => item.id === q.id)
		if (index !== -1) {
			basket[index].count++
		} else {
			basket = [
				...basket,
				{
					id: q.id,
					count,
					delay,
				},
			]
		}
	}

	$: if (courseAuxNombres) {
		basket.forEach((item) => {
			item.count = 1
		})
		basket = basket
	}

</script>

<h3>Les automaths !</h3>

<Buttons
	bind:showBasket
	bind:classroom
	bind:flash
	bind:displayExemple
	bind:courseAuxNombres
	basket="{basket}"
	launchTest="{launchTest}"
	fillBasket="{fillBasket}"
	copyLink="{copyLink}"
	generateExoLatex="{generateExoLatex}"
	flushBasket="{flushBasket}"
/>

{#if !showBasket}
	<Select variant="filled" bind:value="{grade}" label="Niveau">
		<Option value="" />
		{#each grades as grade}
			<Option value="{grade}">{grade}</Option>
		{/each}
	</Select>
{/if}

{#if showBasket}
	<!-- {#if isTeacher && showBasket} -->
	<Basket
		bind:basket
		courseAuxNombres="{courseAuxNombres}"
		addToBasket="{addToBasket}"
	/>
{:else if theme}
	<TabBar tabs="{themes}" let:tab bind:active="{theme}">
		<!-- Note: the `tab` property is required! -->
		<Tab tab="{tab}">
			<Label>{tab}</Label>
		</Tab>
	</TabBar>

	<div class="accordion-container">
		<Accordion>
			{#each Object.keys(availableLevels[theme]) as d (theme + '-' + d)}
				<Panel
					bind:open="{panelOpenStatus[d]}"
					on:click="{() => {
						changeDomain(d)
					}}"
				>
					<Header>
						{d}
						<IconButton slot="icon" toggle pressed="{panelOpenStatus[d]}">
							<Icon class="material-icons" on>expand_less</Icon>
							<Icon class="material-icons">expand_more</Icon>
						</IconButton>
					</Header>
					<Content>
						<div class="pl-5">
							{#each Object.keys(availableLevels[theme][d]) as subd}
								<div class="my-5 flex items-center">
									<span>{@html $formatToHtml(subd)}</span>
									<div flex flex-wrap>
										{#each availableLevels[theme][d][subd] as i}
											{@const q = questions[theme][d][subd][i - 1]}

											<Fab
												class="m-2"
												style="position: relative;"
												color="{domain === d &&
												subdomain === subd &&
												level === i
													? 'primary'
													: 'secondary'}"
												on:click="{(event) => {
													event.stopPropagation()
													changeLevel(subd, i)
												}}"
												mini
											>
												{i}
												<Badge color="custom-green" aria-label="question grade"
													>{q.grade}</Badge
												>
											</Fab>
										{/each}
									</div>
									<div style="flex-grow:1;"></div>
								</div>
							{/each}
						</div>
					</Content>
				</Panel>
			{/each}
		</Accordion>
	</div>
{/if}

{#if displayExemple}
	<!-- <div class=" px-2 py-5" style="{'position:sticky; bottom:0; z-index:2;'}"> -->
	<div
		class="flex items-center justify-center py-2"
		style="{`${
			$darkmode ? 'border-radius:5px;background:#fff' : ''
		};position:sticky; bottom:0; z-index:2;`}"
	>
		<div style="{`width:95vw;max-width:600px;`}">
			<QuestionCard
				card="{generated}"
				showDescription="{true}"
				bind:correction
				bind:interactive
				immediateCommit="{false}"
			/>
		</div>
	</div>
{/if}
