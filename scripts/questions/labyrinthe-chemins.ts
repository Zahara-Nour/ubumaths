/**
 * Chemins des specs d'un modèle à labyrinthe (chantier `labyrinthe`)
 *
 * Le bloc ```labyrinthe tire sa grille d'une graine qu'il pose dans l'énoncé ; une spec tourne
 * à graine fixe (`generateInstanceWithFixedVariables`), son bon chemin est donc connu d'avance.
 * Ce script le calcule pour chaque spec dont la réponse vaut `A_CALCULER` (le bon chemin),
 * `A_CALCULER:sans-fin` (sans sa dernière case) ou `A_CALCULER:sans-debut` (sans la première).
 *
 * Usage :
 *   pnpm tsx scripts/questions/labyrinthe-chemins.ts --dir scripts/questions/<lot>            # montre
 *   pnpm tsx scripts/questions/labyrinthe-chemins.ts --dir scripts/questions/<lot> --ecrire   # écrit
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { generateInstanceWithFixedVariables } from '#lib/questions/generator/test-instance-builder.ts';
import type { QuestionTemplate } from '#lib/questions/types.ts';

// ============================================================================
// Types
// ============================================================================

interface SpecBrute {
	description: string;
	variationIndex?: number;
	variables: Record<string, string>;
	answers: string[];
}

// ============================================================================
// Constantes
// ============================================================================

const MARQUE = 'A_CALCULER';

// ============================================================================
// Functions
// ============================================================================

function argument(nom: string): string | undefined {
	const i = process.argv.indexOf(nom);
	return i >= 0 ? process.argv[i + 1] : undefined;
}

/** Le bon chemin d'une spec, écrit comme la réponse de l'élève (`2,1 2,2 3,2`) */
function bonChemin(modele: QuestionTemplate, spec: SpecBrute): string {
	const result = generateInstanceWithFixedVariables(
		modele,
		spec.variables,
		spec.variationIndex ?? 0
	);
	if (!result.success) throw new Error(`${spec.description} : ${result.errors.join('; ')}`);
	const blank = result.instance.blanks?.[0];
	if (blank?.construire !== 'labyrinthe' || !blank.expectedAnswerLatex) {
		throw new Error(`${spec.description} : pas de labyrinthe à parcourir`);
	}
	return blank.expectedAnswerLatex;
}

function reponse(marque: string, chemin: string): string {
	const cases = chemin.split(' ');
	if (marque === MARQUE) return chemin;
	if (marque === `${MARQUE}:sans-fin`) return cases.slice(0, -1).join(' ');
	if (marque === `${MARQUE}:sans-debut`) return cases.slice(1).join(' ');
	throw new Error(`marque inconnue : ${marque}`);
}

function main(): void {
	const dir = argument('--dir');
	if (!dir) throw new Error('--dir <dossier du lot> manquant');
	const ecrire = process.argv.includes('--ecrire');
	for (const fichier of readdirSync(dir).filter((f) => f.endsWith('.json'))) {
		const chemin = join(dir, fichier);
		const modele = JSON.parse(readFileSync(chemin, 'utf-8')) as QuestionTemplate & {
			testSpecs: SpecBrute[];
		};
		let change = false;
		for (const spec of modele.testSpecs) {
			spec.answers = spec.answers.map((a) => {
				if (!a.startsWith(MARQUE)) return a;
				change = true;
				const r = reponse(a, bonChemin(modele, spec));
				console.log(`${fichier} · ${spec.description} → ${r}`);
				return r;
			});
		}
		if (ecrire && change) writeFileSync(chemin, `${JSON.stringify(modele, null, '\t')}\n`);
	}
	if (!ecrire) console.log('(simulation : --ecrire pour remplacer les marques)');
}

main();
