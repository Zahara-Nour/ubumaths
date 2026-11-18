/**
 * `pnpm migrer:diese` : conversion `$lib` → `#lib` des branches parties avant #2826.
 * Tout est en chaînes ; l'existence des fichiers est simulée.
 */
import { describe, it, expect } from 'vitest';
import { convertir } from '../migrer-diese';

const FICHIERS = new Set([
	'lib:utils/logger.ts',
	'lib:stores/toaster.svelte.ts',
	'lib:components/ui/button/index.ts',
	'lib:components/navigation/BackLink.svelte',
	'lib:vendor/ancien.js',
	'lib:index.ts',
	'tests:helpers/supabase.ts'
]);
const existe = (d: 'lib' | 'tests', chemin: string) => FICHIERS.has(`${d}:${chemin}`);

describe('convertir', () => {
	it('écrit l’extension du fichier qui existe', () => {
		const src = [
			"import { log } from '$lib/utils/logger';",
			'import { toaster } from "$lib/stores/toaster.svelte";',
			"import { Button } from '$lib/components/ui/button';",
			"import BackLink from '$lib/components/navigation/BackLink.svelte';",
			"import { x } from '$lib/vendor/ancien';",
			"vi.mock('$tests/helpers/supabase');",
			"const m = await import('$lib/utils/logger');"
		].join('\n');
		const { source, changes, introuvables } = convertir(src, existe);
		expect(source).toBe(
			[
				"import { log } from '#lib/utils/logger.ts';",
				'import { toaster } from "#lib/stores/toaster.svelte.ts";',
				"import { Button } from '#lib/components/ui/button/index.ts';",
				"import BackLink from '#lib/components/navigation/BackLink.svelte';",
				"import { x } from '#lib/vendor/ancien.js';",
				"vi.mock('#tests/helpers/supabase.ts');",
				"const m = await import('#lib/utils/logger.ts');"
			].join('\n')
		);
		expect(changes).toBe(7);
		expect(introuvables).toEqual([]);
	});

	it('ne change que le préfixe : requête, motif, fichier introuvable', () => {
		const src = [
			"import css from '$lib/styles/a.css?raw';",
			"import corpus from '$lib/data/corpus?raw';",
			"import.meta.glob('$lib/questions/**/*.ts');",
			"import { y } from '$lib/disparu';"
		].join('\n');
		const { source, introuvables } = convertir(src, existe);
		expect(source).toBe(
			[
				"import css from '#lib/styles/a.css?raw';",
				"import corpus from '#lib/data/corpus?raw';",
				"import.meta.glob('#lib/questions/**/*.ts');",
				"import { y } from '#lib/disparu';"
			].join('\n')
		);
		expect(introuvables).toEqual(['#lib/disparu']);
	});

	it('laisse les commentaires, les chaînes hors import, les #lib et les autres alias', () => {
		const src = [
			'// voir $lib/utils/logger pour le détail',
			"// import { a } from '$lib/utils/logger';",
			" * @example import { a } from '$lib/utils/logger';",
			"if (s.startsWith('$lib/')) {}",
			'const msg = `voir $lib/utils/logger`;',
			"import { log } from '#lib/utils/logger.ts';",
			"import { page } from '$app/state';",
			"import { env } from '$env/dynamic/private';"
		].join('\n');
		const { source, changes } = convertir(src, existe);
		expect(source).toBe(src);
		expect(changes).toBe(0);
	});
});
