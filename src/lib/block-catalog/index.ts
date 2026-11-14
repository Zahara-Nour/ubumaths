/**
 * Catalogue des blocs ubumark — liste ordonnée des fiches
 *
 * L'ordre est celui de l'accueil de l'aide (`/aide-ecriture/blocs`).
 *
 * @module block-catalog
 */
import { collectionEntry } from './collection';
import { courbeEntry } from './courbe';
import { figureEntry } from './figure';
import { figureACompleterEntry } from './figure-a-completer';
import { figureDeTravailEntry } from './figure-de-travail';
import { horlogeEntry } from './horloge';
import { monnaieEntry } from './monnaie';
import { numberLineEntry } from './number-line';
import { partageEntry } from './partage';
import { schemaBarresEntry } from './schema-barres';
import { cubesEntry } from './cubes';
import { solideEntry } from './solide';
import { patronEntry } from './patron';
import { operationEntry } from './operation';
import { probtreeEntry } from './probtree';
import { qrEntry } from './qr';
import { scratchEntry } from './scratch';
import { rangerEntry } from './ranger';
import { associerEntry } from './associer';
import { trousEntry } from './trous';
import { tortueEntry } from './tortue';
import { boxPlotEntry, statChartEntry } from './stat-chart';
import { trigEntry } from './trig';
import { variationEntry } from './variation';
import type { BlockCatalogEntry } from './types';

export type * from './types';

export const BLOCK_CATALOG: BlockCatalogEntry[] = [
	variationEntry,
	probtreeEntry,
	numberLineEntry,
	courbeEntry,
	figureEntry,
	figureACompleterEntry,
	figureDeTravailEntry,
	statChartEntry,
	boxPlotEntry,
	qrEntry,
	horlogeEntry,
	collectionEntry,
	monnaieEntry,
	partageEntry,
	schemaBarresEntry,
	cubesEntry,
	solideEntry,
	patronEntry,
	rangerEntry,
	associerEntry,
	trousEntry,
	operationEntry,
	trigEntry,
	scratchEntry,
	tortueEntry
];

/** Fiche d'un bloc par son segment d'adresse */
export function findBlockEntry(slug: string): BlockCatalogEntry | undefined {
	return BLOCK_CATALOG.find((entry) => entry.slug === slug);
}
