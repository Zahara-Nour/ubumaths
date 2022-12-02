<script>
	import {
		touchDevice,
		toMarkup,
		formatToHtml,
		mathliveReady,
		MathfieldElement,
	} from '$lib/stores'
	import { afterUpdate, onMount } from 'svelte'

	const math = '3+\\frac{4}{5}'
	let mfe

	afterUpdate(() => {
		if (!mfe && $mathliveReady) {
			mfe = new $MathfieldElement()
			mfe.setOptions({
				soundsDirectory: '/sounds',
				// virtualKeyboardMode: 'onfocus',
				virtualKeyboardMode: 'off',
				// virtualKeyboardMode: 'manual',
				decimalSeparator: ',',
				// ...virtualKeyboard,
				inlineShortcuts: {
					xx: {},
				},
				keypressSound: null,
				keypressVibration: false,
				removeExtraneousParentheses: false,
				smartFence: false,
				superscript: false,
				mathModeSpace: '\\,',
				placeholderSymbol: '?',
				readOnly:true
			})
			mfe.value = '\\frac{\\pi}{2}+\\placeholder[blank1]{}+3456'
			document.body.appendChild(mfe)
		}
	})
</script>

<h1>Hello</h1>
{#if mathliveReady}
	{@html $toMarkup(math)}
{/if}
