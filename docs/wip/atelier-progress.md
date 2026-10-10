---
title: Atelier de recherche — chapeau du chantier
date: 2026-10-10
status: v1 livrée (dont /grapheur par l'atelier, #811) ; reste le remplacement de /cas ; v2 et v3 non commencées
---

# Atelier — où en est le chantier

- **Ce qui est livré, et comment ça marche** : [docs/systeme/atelier.md](../systeme/atelier.md)
  (vérifié contre le code le 2026-10-10) ; syntaxe des commandes : [atelier-syntaxe.md](../systeme/atelier-syntaxe.md).
- **Historique** (phase 1, lots et PR, décisions D1-D8) : [atelier-progress-historique.md](../archive/wip/atelier-progress-historique.md).

> **Objectif (David, 2026-10-01)** : l'atelier a vocation à **remplacer le REPL web** (`/cas`). Il garde
> `WebReplEngine` comme calculateur (`atelier/engine.ts`) : le moteur reste, la page `/cas` partira.

## Les trois versions du cadrage

| Version | Contenu                                                              | État                                  |
| ------- | -------------------------------------------------------------------- | ------------------------------------- |
| **v1**  | page publique, panneau d'objets, vues Calcul · Graphe · Données, URL | ✅ livrée, `/grapheur` compris (#811) |
| **v2**  | géométrie à la souris (barre d'outils sur `GeometryCanvas`)          | ⏸ non commencée, aucune phase 0      |
| **v3**  | Python, banc d'essai de conjecture (lycée, réseau requis)            | ⏸ non commencée, aucune phase 0      |

## Reste à faire

1. **Remplacer `/cas`** : `/cas` existe toujours (`ReplContainer`), hors barre latérale. Le catalogue de
   l'atelier (`commands.ts`) traduit toutes les commandes du moteur ; 7 sont déclarées indisponibles avec
   leur raison. Pas encore fait : l'inventaire de ce que `/cas` offre et que l'atelier n'offre pas, puis
   le retrait de la page. `/calc` existe aussi (et figure dans le sitemap) ; le cadrage visait la fusion
   `/calc` + `/cas`.
2. **v2, puis v3** : phase 0 à écrire.

### Dettes encore ouvertes (vérifiées dans le code)

- **D10 depuis les vues** — `create`/`update` ont un paramètre de provenance,
  mais `ObjectPanel` et `DataView` appellent sans lui (défaut `'url'`) ; seule
  la vue Calcul passe `'text'` (`desk.svelte.ts:401`). Sans effet observé.
- **`recomputeAll` réassigne tout le tableau** (`atelier.svelte.ts`,
  `this.items = this.items.map(...)`). Jamais mesuré sur une vue réelle.
- **Curseur recréé par `build()`** — sans effet tant qu'on ne peut pas régler
  les bornes d'un curseur depuis l'atelier : aucune action ne le permet encore.
- **Composant de saisie des unités** (macro `\unit`, palette) — pas extrait ;
  aucune trace de `\unit` dans `components/atelier`.
- **Renommer la liste partenaire choisie** fait revenir en silence au
  partenaire par défaut (#615).
