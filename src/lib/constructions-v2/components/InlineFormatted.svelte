<!--
	InlineFormatted — minimal inline formatter for short messages.
	Supports `code` (backticks) and **bold**. Plain text otherwise.
	Used by the runtime error panel to avoid pulling in the full markdown renderer
	for one-line snippets.
-->
<script lang="ts">
	interface Props {
		text: string;
		class?: string;
	}

	let { text, class: className = '' }: Props = $props();

	type Segment = { kind: 'text' | 'code' | 'bold'; value: string };

	function parse(input: string): Segment[] {
		const out: Segment[] = [];
		let i = 0;
		while (i < input.length) {
			const ch = input[i];
			if (ch === '`') {
				const end = input.indexOf('`', i + 1);
				if (end > i) {
					out.push({ kind: 'code', value: input.slice(i + 1, end) });
					i = end + 1;
					continue;
				}
			}
			if (ch === '*' && input[i + 1] === '*') {
				const end = input.indexOf('**', i + 2);
				if (end > i) {
					out.push({ kind: 'bold', value: input.slice(i + 2, end) });
					i = end + 2;
					continue;
				}
			}
			// accumulate plain text until next backtick/star or end
			let j = i;
			while (j < input.length && input[j] !== '`' && !(input[j] === '*' && input[j + 1] === '*')) {
				j++;
			}
			out.push({ kind: 'text', value: input.slice(i, j) });
			i = j;
		}
		return out;
	}

	let segments = $derived(parse(text));
</script>

<span class={className}
	>{#each segments as seg, i (i)}{#if seg.kind === 'code'}<code
				class="rounded bg-muted px-1 py-[1px] font-mono text-[0.95em] text-foreground"
				>{seg.value}</code
			>{:else if seg.kind === 'bold'}<strong>{seg.value}</strong
			>{:else}{seg.value}{/if}{/each}</span
>
