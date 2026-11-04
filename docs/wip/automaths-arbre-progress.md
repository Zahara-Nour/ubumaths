# Chantier `automaths-arbre` — le catalogue Automaths rangé selon l'arbre des notions

## Reprendre ici

_Mis à jour le 2026-11-04, à l'ouverture du chantier._

- **État** : chantier ouvert, rien de codé. Phase 0 à faire.
- **Prochaine action** : relevé (rangement actuel dans `buildCatalogue`, clés de catégorie du panier, des séries enregistrées, de leurs liens et QR codes, des contrôles ; arbre des notions, ADR 0019), puis comportements en français et questions à David.
- **En attente de David** : rien pour l'instant ; la phase 0 tranchera ce que deviennent les clés `theme`/`domain`/`subdomain` + `level` (séries déjà distribuées aux élèves).
- **Pièges en cours** : base locale sans modèle publié → catalogue vide en local.
- **Worktree / branche** : `../ubumaths-wt-automaths-arbre` · `feat/automaths-arbre`.

---

## Origine (2026-11-04)

Décidé pendant le chantier `automaths-apercus` (#2376, journal dans `docs/archive/wip/`) : le
catalogue `/automaths` range les modèles par les colonnes `theme` / `domain` / `subdomain`
(+ `category-order.ts`), pas selon l'arbre des notions (`classification_node_id`, ADR 0019).
Mesuré en prod : 39 modèles publiés sur 1 921 rangés comme dans l'arbre, 471 à la notion près.
David : chantier à part. Le rangement est isolé dans `buildCatalogue`
(`src/lib/questions/catalogue.ts`).

Vocabulaire : branche → notion → sous-notion (CONTEXT.md), jamais les noms de colonnes.
