/**
 * Réponses attendues d'un modèle sous des variables fixées
 * ========================================================
 *
 * Pour écrire les specs d'un modèle à étapes à ranger (ou à cases) : tire la variation demandée
 * avec les variables données et affiche les réponses attendues des cases. Pour des étapes à ranger,
 * ce sont les places dans l'ordre AFFICHÉ, qui dépend du tirage (piège du chantier cours-suites :
 * sous le tirage fixe des specs, l'ordre est `['3','0','1','2']`).
 *
 *   pnpm tsx scripts/questions/ranger-attendus.ts \
 *     '[["scripts/questions/1spe-cours-suites/B7-….json", 0, {}]]'
 *
 * Argument : un tableau JSON de triplets [fichier, indice de variation, variables].
 * Ne lit ni n'écrit aucune base : seulement les fichiers.
 */

import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { generateInstanceWithFixedVariables } from '../../src/lib/questions/generator/test-instance-builder';
import type { QuestionTemplate } from '../../src/lib/questions/types';

// Types
type Demande = [fichier: string, variation: number, variables: Record<string, string>];

// Functions
function lireDemandes(argument: string | undefined): Demande[] {
	if (!argument)
		throw new Error('argument manquant : tableau JSON [[fichier, variation, variables], …]');
	const lu: unknown = JSON.parse(argument);
	if (!Array.isArray(lu)) throw new Error('l’argument doit être un tableau JSON');
	return lu.map((d: unknown) => {
		if (
			!Array.isArray(d) ||
			typeof d[0] !== 'string' ||
			typeof d[1] !== 'number' ||
			typeof d[2] !== 'object' ||
			d[2] === null
		) {
			throw new Error(`demande invalide : ${JSON.stringify(d)}`);
		}
		return [d[0], d[1], d[2] as Record<string, string>];
	});
}

for (const [fichier, variation, variables] of lireDemandes(process.argv[2])) {
	const modele = JSON.parse(readFileSync(fichier, 'utf8')) as QuestionTemplate;
	const r = generateInstanceWithFixedVariables(modele, variables, variation);
	const attendus = r.success ? r.instance.blanks?.map((b) => b.expectedAnswer) : undefined;
	console.log(
		basename(fichier),
		variation,
		JSON.stringify(variables),
		attendus,
		r.success ? '' : r.errors.join(' ; ')
	);
}
