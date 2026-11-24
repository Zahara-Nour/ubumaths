# 0043 — Noms anglais des nœuds de l'arbre

- **Statut** : acceptée — phase 0 du chantier `notions-en-anglais` (journal
  [`docs/wip/notions-en-anglais-progress.md`](../wip/notions-en-anglais-progress.md))
- **Date** : 2026-11-23 · **Décidée par** : David (« je suis tes recos »)
- Suite de l'[ADR 0041](0041-categorie-et-notions-d-une-fiche.md), décision 5 : une fiche en
  anglais imprime ses notions en anglais.

## Contexte

Un nœud de l'arbre ([ADR 0019](0019-classement-branche-notion-sous-notion.md)) n'a qu'un nom, en
français. Une fiche anglaise au titre composé n'imprime donc que sa catégorie traduite (« Technical
practice »), sans ses notions. Mesuré en prod le 2026-11-23 : 27 fiches sur 50 ont une version
anglaise, 24 au titre composé ; l'arbre compte 19 branches, 134 notions et 484 sous-notions
actives.

## Décision

| Sujet              | Décision                                                                                                                                                                      |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nœuds traduits     | Branches, notions et sous-notions (une branche s'imprime en titre quand plusieurs notions en viennent)                                                                        |
| Étendue            | Tout l'arbre, proposé en un lot et relu par David sur une page à cocher                                                                                                       |
| Rangement          | `classification_nodes.translations` (jsonb, `{}` par défaut), forme `{"en": {"name": "…"}}`, comme `worksheets.translations` ; nom anglais non vide, vérifié par la base      |
| Qui écrit          | L'admin, par migration, comme les noms français ; pas d'écran d'édition                                                                                                       |
| Qui lit            | Comme le nom français : tout le monde, visiteur compris. Les liens de partage rendent les traductions des notions de la fiche                                                 |
| Nom anglais absent | Fiche anglaise : il suffit qu'un nom à imprimer (notion ou branche) n'ait pas d'anglais pour n'imprimer aucune notion (catégorie seule). Jamais de mélange français / anglais |
| Signalement        | L'éditeur d'une fiche qui a une version anglaise nomme les notions sans nom anglais                                                                                           |

## Écarté

- **Une colonne `name_en`** : une colonne par langue ; le champ de traductions suit le modèle des
  fiches et accueille une autre langue sans migration de schéma.
- **Seulement les nœuds des fiches anglaises actuelles** (15 nœuds) : la prochaine fiche anglaise
  tomberait sur un trou.
- **Le nom français à la place d'un nom anglais manquant** : une fiche anglaise à moitié en
  français.
- **Un écran où le prof corrige un nom anglais** : l'arbre s'écrit par migration ; un écran
  ouvrirait une écriture qui n'existe pas pour les noms français.

## Conséquences

- Migration additive (`20261124180821_noms_anglais_noeuds.sql`) : le champ, et
  `classifications[].translations` dans les deux fonctions des liens de partage.
- Le PDF anglais (`printedTitle`) lit le nom anglais ; les traductions arrivent par une migration
  de données relue par David.
