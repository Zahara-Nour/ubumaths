# 0027 — Les figures géométriques ont leur propre table, publiques pour tous

- **Statut** : acceptée — mise en œuvre en cours (journal `docs/wip/figures-geometriques-progress.md`)
- **Date** : 2026-10-13 · **Décidée par** : David

## Contexte

Un script du DSL de géométrie (`geometry-core`) ne vivait que dans un bloc ` ```figure ` d'exercice
(statique, sans curseur) ou écrit en dur dans une page de démo (le flocon de Von Koch,
`/geometry-demo/sliders/koch`). Rien ne permettait de l'enregistrer, de le retrouver ni de le
donner aux élèves, par exemple depuis le cahier de texte.

## Décision

| Sujet       | Décision                                                                                                   |
| ----------- | ---------------------------------------------------------------------------------------------------------- |
| Stockage    | **Table à part** `geometry_figures` : titre, description, script, niveaux, `is_public`                     |
| Lecture     | **Publique = tout le monde, même sans compte** ; privée = son auteur seul                                  |
| Écriture    | **Prof et admin** créent ; chacun ne modifie et ne supprime **que ses** figures                            |
| Rangement   | Niveaux (`grades`, contrôle `is_valid_grade_array` des exercices) + tags partagés (`resource_tags`)        |
| Taille      | Script ≤ 100 000 caractères (`MAX_DSL_SOURCE_LENGTH` de l'interpréteur)                                    |
| Suppression | Les liens de tag partent avec la figure (trigger DEFINER gardé) ; supprimer le compte supprime ses figures |

## Écarté

- **La table `constructions`** (constructions-v2) avec un type « figure » : colonnes héritées d'avant
  le DSL (`format`, `script` JSON), et deux lecteurs différents (toile à curseurs, animation pas à pas)
  mêlés dans un même catalogue.
- **Publique = comptes connectés seulement** (comme les constructions) : un lien depuis le cahier de
  texte partagé ne s'ouvrirait pas pour une famille sans compte.
- **Accès hérité de la classe** (comme les fiches, ADR 0005) : une figure ne contient rien de personnel,
  et les gardes par classe plus la lecture par lien coûtaient beaucoup pour rien.
- **Élèves auteurs** : contenu écrit par des mineurs, donc modération.

## Conséquences

- Une figure publique est lisible par `anon` : ne jamais y mettre de donnée personnelle.
- La policy de lecture de `resource_tags` (`authenticated`, `true`) laisse un compte connecté lire
  les liens de tag d'une figure privée (tag et identifiant, jamais le contenu) — accepté, comme pour
  les exercices. `anon` ne lit pas ces liens : la page publique d'une figure n'affiche pas ses tags.
- L'admin ne modifie pas les figures du prof : une figure à reprendre se copie.
