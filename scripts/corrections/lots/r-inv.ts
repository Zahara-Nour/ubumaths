/**
 * Lot « r-inv » : opération à trou → opération inverse (36 modèles)
 * =================================================================
 *
 * Classement : docs/wip/corrections-manquantes-frontiere.md, tous les modèles
 * `R-INV` SAUF les six trous chez les relatifs (décision du 2026-09-29) :
 * × et : → N-SIGNES (0b6d749f, a5d4c3ee, faits dans le lot pilote) ;
 * + et − → N-REL-ADD (24331791, 84755a7b, b1550840, 372d4f79, lot à venir).
 * Les opérations à trou des tables (00497e5e, 987d3641…) restent classées F.
 *
 * Correction générée depuis l'opération posée (lib/r-inv.ts). Ids complets
 * relus en prod (lecture seule) le 2026-09-29 ; aucun n'avait de correction.
 */

import type { Lot, LotEntry } from '../lib/lot';

// ============================================================================
// CONSTANTS
// ============================================================================

const TEMPLATE_IDS = [
	// Décimaux — addition à trou
	'e49b0cf8-3b48-4f0b-90ab-9687f8e37b1e',
	'c9c1966e-f644-412c-807e-b0620489a1e6',
	'421e9fc9-b141-48b8-aed8-bb3a6c35bf7a',
	'b4b5cf8b-32bc-4273-8c5a-20dc0e7550db',
	// Décimaux — division à trou (par 10, 100, 1000, 0,1…)
	'668b1fe6-12e2-4c51-899e-646556e69675',
	'651836d4-4caf-4318-8a19-31c193349683',
	'4b1968b9-2210-4f08-a1b8-69eae735d714',
	'45e06ece-246e-4182-ae1f-8d04a98e6aae',
	'6632e5c2-45eb-4b6f-afff-c162bcb382e8',
	// Entiers — addition à trou
	'32beec3b-7d78-4d07-808b-0b0091ce89cf',
	'4372eb03-6281-470f-817d-fa1a0de7b799',
	'8a843682-a849-47ac-8762-cfb098c4a4c3',
	'1507465f-8fd9-4442-ae43-156662758d12',
	'777dc505-7be7-4675-97f4-7c1f4fbd8c41',
	'de71495c-b88c-4b42-9cd7-3562847aedfc',
	'18b7cc5c-65ed-491d-9fbc-ce217e528bd4',
	'22b8da83-a8ea-4d8e-b500-ff24e08cf260',
	'6661b9ae-ece2-4d5c-8bcf-91f6825cf56f',
	// Entiers — division à trou
	'8d6d79a2-0b99-4dcb-a751-2105bbb8b441',
	'6ca01910-6b66-4dce-91f2-7a22154282b6',
	// Entiers — multiplication à trou
	'31c3963e-e1e2-4fe2-bce1-83379f93b867',
	'9c32b3cc-f8d8-4fe8-808b-e2e021fbb146',
	'ee0ae544-946a-4c5a-a1cf-4761c4288cb2',
	'e4e3b16e-76f9-471a-966c-cca9a3cea9e4',
	'a5d5a7a0-2b7f-4174-a487-4c673fee5eeb',
	'ae96d7af-e1f6-4390-8100-c779260e4152',
	'883fbf29-693b-45b0-8d83-4882fa7fdde4',
	'7ac0e898-2063-4321-82e9-c8ab1ad534a4',
	'd22731c2-d6bd-4aca-8aac-f90d4aaa3d8f',
	// Entiers — soustraction à trou
	'e7e7662d-74c2-456f-a409-f7130c86c608',
	'1e93a463-38a4-411b-8c35-31ce93b42d43',
	'27bf3101-faf4-4d55-8233-ef8bb3548179',
	'caa02a8c-2af1-4e19-94f0-8df06e8467e0',
	'3d6def48-eefd-4015-9090-ec2396ec3483',
	'7d2d412b-843c-446f-8394-2a31856556d5',
	'9f4cbd66-4fab-460b-8872-4a2b36d94267'
];

// ============================================================================
// LOT
// ============================================================================

export const R_INV_LOT: Lot = {
	name: 'r-inv',
	description: 'R-INV (opération à trou → opération inverse), hors relatifs',
	entries: TEMPLATE_IDS.map((templateId): LotEntry => ({ templateId, classe: 'R', code: 'R-INV' }))
};
