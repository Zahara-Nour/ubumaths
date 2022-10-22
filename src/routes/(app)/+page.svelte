
<script>
    import {
		touchDevice,
		toMarkup,
		formatLatex,
		mathliveReady,
	} from '$lib/stores'

    const math = "3+\\frac{4}{5}"
</script>


<h1>Hello</h1>
{@html $toMarkup(math)}
