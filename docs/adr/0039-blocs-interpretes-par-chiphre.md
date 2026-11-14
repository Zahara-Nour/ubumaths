# 0039 — Les blocs tortue et calcul sont interprétés par Chiphre, jamais évalués en JavaScript

- **Statut** : acceptée — mise en œuvre par le chantier `blockly` (journal :
  [`docs/wip/blockly-progress.md`](../wip/blockly-progress.md))
- **Date** : 2026-11-14 · **Décidée par** : David

## Contexte

Blockly devient une fonctionnalité élève : un bac à sable public, puis un geste de réponse
« programme » dans les modèles de questions (tortue au cycle 3, programmes de calcul en 5e). Le
prototype `/dev/blockly` génère du JavaScript et l'exécute dans un worker
(`js-sandbox.worker.ts`).

La revue `security-auditor` de #2627 a montré que ce worker s'évade :
`(() => {}).constructor('return this')()` rend la portée globale du worker, d'où `fetch`
same-origin avec les cookies de l'élève et `importScripts`. Les regex de `checkDangerousPatterns`
se contournent. Le risque est réel dès que le programme exécuté vient d'un autre que l'élève
(programme partagé, exemple du prof, devoir). Ce sont des données d'élèves mineurs.

La correction par tracé exige de toute façon de rejouer le programme pour obtenir ses segments.

## Décision

Les blocs tortue et calcul sont exécutés par un **interpréteur de blocs écrit par Chiphre** : il
parcourt l'arbre des blocs et applique chaque bloc connu ; aucun code n'est généré puis évalué. Un
bloc inconnu est refusé. Le même interpréteur rejoue le programme pour la correction (segments
tracés, sortie d'un programme de calcul).

Le code JavaScript / Python généré par Blockly ne sert plus que d'**aperçu** affiché à l'élève. Le
sandbox JavaScript actuel ne doit **jamais** exécuter un programme écrit par un autre que la
personne qui le lance.

## Écarté

- **Durcir le worker** (neutraliser `.constructor` des prototypes de fonctions, retirer `fetch` /
  `importScripts` du global, CSP du worker) : course aux contournements, chaque nouveauté du
  langage rouvre une porte.
- **Interpréteur JavaScript isolé** (JS-Interpreter, QuickJS-wasm) : une dépendance de plus, lente,
  pour exécuter un langage dont on n'a pas besoin — l'élève écrit des blocs, pas du JavaScript.

## Conséquences

- Rien à évader : l'interpréteur ne connaît que les blocs qu'on lui a appris.
- Chaque bloc proposé à l'élève doit être implémenté dans l'interpréteur (et testé) ; la boîte à
  outils élève se limite à ces blocs. Les blocs génériques de Blockly ne passent pas tels quels.
- L'interpréteur doit borner lui-même le nombre de pas, pour qu'une boucle infinie s'arrête.
- Le sandbox JavaScript reste pour l'aperçu du prototype admin ; il n'est pas une frontière de
  sécurité.
