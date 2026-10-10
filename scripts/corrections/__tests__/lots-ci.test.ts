/**
 * Lots de corrections : garde de non-régression en CI
 * ===================================================
 *
 * Chaque lot du registre (`lots/index.ts`) a ses propositions commitées dans
 * `data/corrections/<lot>/<id>.json`, à côté de l'instantané `_modeles.json` des
 * lignes de prod. Ce test rejoue le vérificateur (`verifyProposal`) sur chaque
 * proposition, HORS LIGNE : aucune base, seulement les fichiers du dépôt.
 * Une modification du générateur, de mathAST ou du vérificateur qui casse une
 * correction déjà livrée rougit ici.
 *
 * ⚠️ Échantillonnage RÉDUIT : `SEEDS` graines par variation, au lieu du domaine
 * entier (≤ 20 000 combinaisons) ou de 5 000 graines. Le fichier doit tenir en
 * moins d'une minute. Ce n'est pas une preuve : la vérification complète reste
 * `pnpm corrections:check <lot>`.
 *
 * Aucun lot n'est exclu : `vague3-unites`, annoncé rouge dans lots/vague3.ts,
 * passe depuis que le vérificateur lit les unités (clôture, 2026-09-30).
 */

import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CORRECTIONS_ROOT, lotDir, readProposal, readSnapshot } from '../lib/files';
import { verifyProposal } from '../lib/verify';
import { LOTS } from '../lots';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Graines par variation (réduction CI ; cf. en-tête) */
const SEEDS = 30;
const TIMEOUT_MS = 30_000;
/** Garde contre un dossier déplacé : le test passerait sans rien vérifier */
const MINIMUM_LOTS = 13;
const MINIMUM_PROPOSALS = 230;

/**
 * Dossiers de `data/corrections/` qui ne sont PAS des lots du registre :
 * - `retouches` : instantané des retouches ciblées (retouches.test.ts) ;
 * - `vague3-publies` : lot vide (RESUME.md seul) ;
 * - `vague4-cloture` : propositions sans instantané `_modeles.json`, reprises
 *   par les lots `cloture-*`.
 */
const NOT_LOTS = new Set(['retouches', 'vague3-publies', 'vague4-cloture']);

// ============================================================================
// FIXTURES
// ============================================================================

const lots = Object.values(LOTS).filter((lot) => existsSync(lotDir(lot.name)));

const cases = lots.flatMap((lot) => {
	const templates = readSnapshot(lot.name);
	return lot.entries.map((entry) => ({
		label: `${lot.name}/${entry.templateId.slice(0, 8)}`,
		lot: lot.name,
		entry,
		template: templates.get(entry.templateId)
	}));
});

// ============================================================================
// TESTS
// ============================================================================

describe('lots de corrections (data/corrections)', () => {
	it(`couvre au moins ${MINIMUM_LOTS} lots et ${MINIMUM_PROPOSALS} propositions`, () => {
		expect(lots.length).toBeGreaterThanOrEqual(MINIMUM_LOTS);
		expect(cases.length).toBeGreaterThanOrEqual(MINIMUM_PROPOSALS);
	});

	it('chaque dossier est un lot du registre ou une exception documentée', () => {
		const folders = readdirSync(CORRECTIONS_ROOT).filter((name) =>
			statSync(join(CORRECTIONS_ROOT, name)).isDirectory()
		);
		const unknown = folders.filter((name) => !LOTS[name] && !NOT_LOTS.has(name));
		expect(unknown).toEqual([]);
	});

	it.each(cases)(
		'$label reste valide',
		({ lot, entry, template }) => {
			expect(template, `${entry.templateId} absent de l'instantané`).toBeDefined();
			if (!template) return;
			const report = verifyProposal(template, readProposal(lot, entry.templateId), {
				seeds: SEEDS,
				checks: entry.checks
			});
			const reasons = [
				...report.templateErrors,
				...report.failures
					.slice(0, 3)
					.map((f) => `variation ${f.variationIndex}, ${f.draw} : ${f.reasons.join(' ; ')}`)
			];
			expect(reasons).toEqual([]);
			expect(report.instances).toBeGreaterThan(0);
		},
		TIMEOUT_MS
	);
});
