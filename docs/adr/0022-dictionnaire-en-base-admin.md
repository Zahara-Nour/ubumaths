# 0022 — Le dictionnaire vit en base, l'admin le modifie

- **Statut** : acceptée
- **Date** : 2026-10-10 · **Décidée par** : David

## Contexte

Le dictionnaire (671 entrées, définitions par niveau, synonymes, formes, étiquettes de sens, filières
partagées) vit dans `src/lib/data/math-dictionary-fr.ts`. Chaque correction passe par Claude : page à
cocher, codemod, copie figée testée, PR, CI (lots 0a à 0h, #979 → #1000). David veut corriger et
ajouter des définitions lui-même. Il l'avait prévu « pour plus tard » le 2026-10-08.

## Décision

- **La base est la seule source** : les entrées sont reprises une fois en base, puis le fichier est
  supprimé. Le glossaire, Mathémo et les mots cliquables lisent la base.
- **Accès** : lecture par tous, visiteurs compris (c'est déjà le cas : le dictionnaire est dans le
  code envoyé au navigateur) ; modification par l'admin seul, après élévation, par le serveur. Aucun
  accès en lecture nouveau.
- **Les règles de cohérence refusent l'enregistrement**, avec un message en français : première
  définition au niveau du mot puis niveaux croissants, renvoi vers un mot visible, homonymes tous
  étiquetés, partage avec une filière parallèle seulement, forme conjuguée à un seul mot. Les mêmes
  règles tournent en CI sur un jeu de données de référence.
- **Historique** : chaque enregistrement garde la version précédente de l'entrée, avec sa date.
- **Pas de suppression** : une entrée se masque (un renvoi ou un marquage `{.def=…}` peut la viser).
- Page d'admin, première version : chercher, modifier définitions (aperçu des formules), synonymes,
  formes, étiquette, « jamais souligné », filières partagées ; ajouter une entrée.

## Écarté

- **Base et copie régénérée dans le code** : deux sources finissent par diverger.
- **Le fichier reste la source, la page d'admin ouvre une PR** : une PR et une CI par virgule, le
  besoin (corriger soi-même, tout de suite) n'est pas couvert.
- **Suppression d'une entrée** : casserait les renvois et les marquages des énoncés.

## Conséquences

- La garantie « relu par David » ne vient plus des copies figées testées (`tests/fixtures/lexique/`) :
  elle vient de l'admin, sur la page. Ces copies servent à la reprise des données, puis au jeu de
  référence de la CI.
- Le dictionnaire se charge par le réseau (aujourd'hui : un morceau de code chargé à la demande) ; le
  repérage des mots cliquables doit garder son coût (index par niveau, ~19 ms une fois).
- Migration additive (tables, policies) : `db:migrate` au merge ; la suppression du fichier suit la
  mise en prod du code qui lit la base.
