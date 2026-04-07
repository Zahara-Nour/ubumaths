# Simplification UI Marketplace - Progression

## Statut : TERMINE

## Objectif

Reduire la complexite de l'UI marketplace de 3 niveaux de tabs (11 tabs) a 1 seul niveau (3 tabs).

## Avant / Apres

```
AVANT (3 niveaux, 11 tabs) :
  [Boutique] [Echanges]
      └─ [Parcourir] [Annonces] [Propositions] [Echanges]
              └─ [Actives] [Completees] [Expirees]
                                  └─ [Negociations] [Termines]

APRES (1 niveau, 3 tabs) :
  [Boutique]  [Annonces]  [Activite]
```

## Fichiers modifies

| Fichier                                                             | Changement                                                  |
| ------------------------------------------------------------------- | ----------------------------------------------------------- |
| `src/routes/(protected)/dashboard/student/marketplace/+page.svelte` | Reecrit : 3 tabs plats, pills toggle, badge unifie          |
| `src/lib/components/marketplace/MarketplaceListings.svelte`         | Simplifie : filtres mobile-first, supprime grid/list toggle |
| `src/lib/components/marketplace/MarketplaceListingCard.svelte`      | Simplifie : supprime vue liste, garde uniquement grille     |
| `src/lib/components/marketplace/MyListings.svelte`                  | Simplifie : dropdown MySelect au lieu de 3 sub-tabs         |
| `src/lib/components/marketplace/StudentActivityFeed.svelte`         | NOUVEAU : feed unifie propositions + echanges               |

## Fichiers devenus inutilises (non supprimes)

- `src/lib/components/marketplace/MyProposals.svelte` — absorbe dans StudentActivityFeed
- `src/lib/components/marketplace/MyTrades.svelte` — absorbe dans StudentActivityFeed

## Ameliorations mobile-first

- 3 tabs lisibles sur 320px (label court "Activite")
- Filtres masques par defaut sur mobile (bouton toggle)
- Boutons icon-only sur mobile, icon+texte sur sm+
- Grille responsive : 1 col → 2 → 3 → 4
- Feed d'activite vertical pleine largeur
- Layout adaptatif : vertical mobile, horizontal desktop

## Zero changement backend

- Aucune modification API, store, ou types
- Tous les modals existants inchanges
