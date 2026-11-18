/**
 * L'Atelier (`runInput`, réponse affichée) contre le corpus de réponses
 * attendues du registre — chantier `registre-reference`, D4 : un outil
 * habille la réponse du registre, il ne la remplace jamais.
 */

import { describeCorpus } from '#lib/mathAST/cli/__tests__/registre-corpus/harness.ts';
import { produceAtelier } from '#lib/mathAST/cli/__tests__/registre-corpus/produce.ts';
import { ATELIER_CONNUES_FAUSSES } from '#lib/mathAST/cli/__tests__/registre-corpus/connues-fausses.ts';

describeCorpus('L’Atelier', produceAtelier, ATELIER_CONNUES_FAUSSES);
