/**
 * Le registre (`WebReplEngine`, champ `answer`) contre le corpus de réponses
 * attendues — chantier `registre-reference`, D4.
 */

import { describeCorpus } from './harness';
import { produceRegistre } from './produce';
import { REGISTRE_CONNUES_FAUSSES } from './connues-fausses';

describeCorpus('Le registre', produceRegistre, REGISTRE_CONNUES_FAUSSES);
