# Arbre des notions (version .16, 2026-10-09)

Classement branche > notion > sous-notion décidé avec David ([ADR 0019](../../adr/0019-classement-branche-notion-sous-notion.md),
[ADR 0020](../../adr/0020-arbre-central-programmes-pointeurs.md)).

**L'arbre est en base** (table `classification_nodes`) depuis le 2026-10-08. La version .16 est en base depuis le
2026-10-10 (#1002) : c'est le nettoyage des facettes, avec un seul découpage par notion, par contenu mathématique
(ADR 0020 § 3 précisé ; [audit-facettes.md](audit-facettes.md)). **La source de vérité est la base** ;
`arbre-notions.json` en est la copie de doc. Un changement de l'arbre passe par une migration, puis se reporte ici.

- **`REPRISE.md` : document de reprise du chantier, à lire en premier.**
- `arbre-notions.json` : la copie de doc de l'arbre .16.
  - Les nœuds actifs : 19 branches, 134 notions et 472 sous-notions, avec leurs niveaux indicatifs et leurs notes.
  - La liste `archives` : les 74 nœuds archivés, dont 3 notions.
- `arbre-notions.html` : la page visuelle.
- `dessin_branches.py`, `page.py`, `tpl.html` : génération de la page. Depuis ce dossier, lancer
  `python3 dessin_branches.py && python3 page.py`.
  - Les deux scripts **lisent** `arbre-notions.json` et ne le réécrivent plus.
  - Les comptes de la page en viennent.
- `seed-*.md` : les points des programmes, niveau par niveau, avec le nœud de chacun (à jour pour l'arbre .16).
