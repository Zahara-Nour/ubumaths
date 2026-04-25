import { readFileSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { convertXmlToDsl } from '$lib/constructions-v2/converter';
import type { PageServerLoad } from './$types';

interface ConvertedFixture {
	filename: string;
	dsl: string;
	warnings: string[];
}

export const load: PageServerLoad = async () => {
	const fixturesDir = resolve('extern/instrumenpoche-main/devServer/fixtures');
	const files = readdirSync(fixturesDir)
		.filter((f) => f.endsWith('.xml'))
		.sort();

	const fixtures: ConvertedFixture[] = [];

	for (const file of files) {
		const xml = readFileSync(resolve(fixturesDir, file), 'utf-8');
		const result = await convertXmlToDsl(xml);
		if (result.success && result.dsl) {
			fixtures.push({
				filename: file,
				dsl: result.dsl,
				warnings: result.warnings
			});
		}
	}

	return { fixtures };
};
