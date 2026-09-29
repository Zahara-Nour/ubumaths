/**
 * Lots « vague1-brouillons » et « vague1-publies » : calcul réfléchi (35 modèles)
 * ==============================================================================
 *
 * Classement : docs/wip/corrections-manquantes-frontiere.md, codes R-COMPL,
 * R-RANGPARRANG, R-RANG, R-DISTRIB, R-DIV-DIZ, R-QUAD, R-DOUBLE, R-XDIZ,
 * R-PETIT-DIV, R-ECART, R-POSE (42 modèles). Corrections GÉNÉRÉES
 * (lib/r-mental.ts). Découpe selon le statut relu en prod (lecture seule,
 * 2026-09-29) : 2 brouillons, 33 publiés.
 *
 * Écartés (7) : aucune variable d'expression, le vérificateur ne peut pas
 * contrôler le point de départ du calcul (« point de départ invérifiable ») :
 * R-QUAD 56b2737d, b7cd1846, 3c79eb9c ; R-DOUBLE 022130ca, 47f97c9f ;
 * R-DIV-DIZ 4ee04b22 (« Dans 80, combien de fois 2 ? ») ; R-COMPL 17a3c039
 * (« Combien faut-il ajouter à 7900… ? »).
 */

import type { Lot, LotEntry } from '../lib/lot';

// ============================================================================
// CONSTANTS
// ============================================================================

const DRAFTS: [string, string][] = [
	['b19167c8-49f8-427f-b493-2e2e14fb8508', 'R-COMPL'], // Trouver le complément (décimaux)
	['814a46a9-2f73-4b2d-91e4-2052fc425b53', 'R-DISTRIB'] // Calculer un produit (décimaux)
];

const PUBLISHED: [string, string][] = [
	// R-COMPL
	['5706769f-d29d-410d-a2e0-2943d3c11a25', 'R-COMPL'],
	['c381596f-f278-4f29-a205-5c60f748b590', 'R-COMPL'],
	['cba5b70a-6b03-405c-955c-01554a4e55a2', 'R-COMPL'],
	['b2ad1cc0-55cf-41be-9db7-3f24f77fc200', 'R-COMPL'],
	['6ac9df91-c5e0-4a59-9ce5-029eeab9f6fd', 'R-COMPL'],
	['ff427b27-6f6c-4679-9fc7-fc6c66aaa867', 'R-COMPL'],
	['d186d4ef-6880-4261-95f4-6d9e64b75388', 'R-COMPL'],
	['115745fe-b2ac-49fb-b6b3-447503077924', 'R-COMPL'],
	['45e9fa53-1c61-40e8-88a4-183fcb162ce5', 'R-COMPL'],
	// R-RANGPARRANG
	['716d5c68-4b13-4cdb-b063-bdfa07ead4db', 'R-RANGPARRANG'],
	['ce3247c0-d642-4bf9-ba3e-b8de60f76d72', 'R-RANGPARRANG'],
	['5d4dfd32-bc56-49a5-827c-7233881a68ad', 'R-RANGPARRANG'],
	['fe9df9ba-2017-4027-b678-bae8196c3651', 'R-RANGPARRANG'],
	['fc29d0c2-cb55-4b38-89b4-ab275b3442ae', 'R-RANGPARRANG'],
	['b0b30022-ed72-45e9-bbf9-628711470573', 'R-RANGPARRANG'],
	['810f1824-18ac-48e5-bf15-1c0b3854f78b', 'R-RANGPARRANG'],
	// R-RANG
	['54468151-387e-425d-bc4f-74bcf1c7fb01', 'R-RANG'],
	['579d0b00-b3a5-46e6-a076-04ec265c1c4f', 'R-RANG'],
	['ed5f5f52-ba4f-4c51-a843-2be19156b4b7', 'R-RANG'],
	['201b17f0-a12e-4772-abc4-fe75cb81ef44', 'R-RANG'],
	['4d94ec28-27a9-4af5-8b11-42dc9d9aa103', 'R-RANG'],
	['a0cae721-afb8-46af-b966-8856fb012be0', 'R-RANG'],
	// R-DISTRIB
	['59b781cc-1e3c-45e7-8b31-9773931129b3', 'R-DISTRIB'],
	['e58b1357-6fa8-4fce-9518-91d09d9acc49', 'R-DISTRIB'],
	['3d0d175f-0d2a-40d1-bc08-104c564d66d3', 'R-DISTRIB'],
	['d793de49-b065-46ea-aa8b-d09adcbb7617', 'R-DISTRIB'],
	// R-DIV-DIZ
	['61baef92-f8ff-4641-91f3-74ce63f04232', 'R-DIV-DIZ'],
	['09f22a2f-9a2d-404a-b0b4-be00046b3d49', 'R-DIV-DIZ'],
	// R-XDIZ
	['68bb6eda-b853-4a98-aad6-4fea055a7482', 'R-XDIZ'],
	['0e39dbfb-cd2c-4d78-b070-7bdc1d7a62cc', 'R-XDIZ'],
	// R-PETIT-DIV, R-ECART, R-POSE
	['7caa084f-655c-49ce-8658-1e253efbbeda', 'R-PETIT-DIV'],
	['5f78bd0e-9913-483f-808b-73d4b7d7a0a4', 'R-ECART'],
	['08fbcd26-6068-47cc-8384-8aeed96c6a78', 'R-POSE']
];

const toEntry = ([templateId, code]: [string, string]): LotEntry => ({
	templateId,
	classe: 'R',
	code
});

// ============================================================================
// LOTS
// ============================================================================

export const VAGUE1_DRAFTS_LOT: Lot = {
	name: 'vague1-brouillons',
	description: 'Vague 1, calcul réfléchi : modèles en brouillon',
	entries: DRAFTS.map(toEntry)
};

export const VAGUE1_PUBLISHED_LOT: Lot = {
	name: 'vague1-publies',
	description: 'Vague 1, calcul réfléchi : modèles publiés (visibles des élèves)',
	entries: PUBLISHED.map(toEntry)
};
