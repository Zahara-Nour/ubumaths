<script>
	// import '../tailwind.scss'
	import '../app.scss'
	
	import {
		touchDevice,
		toMarkup,
		formatToHtml,
		mathliveReady,
		MathfieldElement
	} from '$lib/stores'
	import { getLogger, formatToLatex } from '$lib/utils'
	import { onMount, onDestroy } from 'svelte'

	// import { dev } from '$app/environnment'

	let { info, fail, warn } = getLogger('Global layout', 'info')

	info('-- Initialization --')
	// info(dev ? '. developpement version' : '. production version')

	onMount(() => {
		// detects a touche screen device at the first touch
		//  https://codeburst.io/the-only-way-to-detect-touch-with-javascript-7791a3346685
		window.addEventListener(
			'touchstart',
			function onFirstTouch() {
				touchDevice.set(true)
				window.removeEventListener('touchstart', onFirstTouch, false)
			},
			false,
		)

		import('tinymathlive/dist/mathlive.min.mjs')
			.then((m) => {
				mathliveReady.set(true)
				MathfieldElement.set(m.MathfieldElement)
				toMarkup.set(m.convertLatexToMarkup)
				const regex = /\$\$(.*?)\$\$/g
				const replacement = (_, p1) => m.convertLatexToMarkup(p1)
				const _formatToHtml = (o) => {
					if (!o) {
						return ''
					}
					
					if (Array.isArray(o)) {
						return o.map((elmt) => _formatToHtml(elmt))
					} else if (o.text) {
						return { ...o, text: _formatToHtml(o.text) }
					} else if (typeof o === 'string') {
						return o.replace(regex, replacement)
					} else {
						return o
					}
				}
				formatToHtml.set(_formatToHtml)
			})
			.catch((e) => {
				fail('erreur while importing mathlive', e)
			})
	})

	$: console.log('touchDevice :', $touchDevice)
</script>

<svelte:head>
	<title>UbuMaths - Les maths de la chandelle verte</title>
</svelte:head>

<slot />
