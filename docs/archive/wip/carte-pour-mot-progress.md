# Chantier `carte-pour-mot` — « pour » devient un mot dans la carte d'une fonction

## Reprendre ici

_Mis à jour le 2026-11-28, après #3321. Chantier clos, journal archivé._

- **État** : « pour » en mot et espaces visibles dans la carte d'une fonction, mergés (#3321), essayés par David (« ça marche ») ; pas encore en prod.
- **Prochaine action** : aucune ; doc durable dans `docs/systeme/atelier.md`.
- **En attente de David** : rien.
- **Pièges en cours** : `pnpm test:client` sur ~90 fichiers d'un coup en perd au chargement (`wrapDynamicImport`) → lots de 10.
- **Worktree / branche** : aucun ; serveurs d'essai 8445 et 8446 arrêtés.

## Demande

Après `fonctions-domaines` (#3304, #3310) : dans la carte, MathLive collait « pour » (`xpourx>2`,
en italique) jusqu'à la validation ; la console en faisait déjà un mot. « oui fais le » (David,
2026-11-28).

## Comportement

- Carte d'une fonction : l'espace tapée après « pour » ou « sur » (et « ou », « et » après « pour »)
  remplace le mot par `\text{ pour }` — l'écriture que la carte réaffiche après validation.
- MathLive ignore l'espace dans la carte : le mot est la FIN de la suite de lettres (`xpour`).
- Inchangé : `e t` sans « pour » reste e·t ; « surface » reste des lettres ; les autres cartes
  (valeur, suite…) ne sont pas touchées.

## Fait

- `natural-input.ts` : `cardWordAtCaret` (même règle que `definitionWord` de la console).
- `DefinitionField.svelte` : `finishWordOnSpace` à la touche Espace (carte d'une fonction, niveau
  0), puis `switchMode math` — mesuré : sans lui, `x>2` partait dans le `\text{…}`.
- Tests : `natural-input.test.ts` (+11), `carte-mot-pour.svelte.test.ts` (5, au vrai clavier dans
  Chromium ; 3 rouges avant).
- Piège mesuré : `pnpm test:client` sur 92 fichiers d'un coup en perd une partie au chargement
  (`wrapDynamicImport`, nombre variable) ; par lots de 10, tous verts.

## Revue (`code-reviewer`, Sonnet)

1. Sélection non vide + espace : la sélection était remplacée par la zone du mot → garde
   `selectionIsCollapsed`.
2. Mineur, accepté (même compromis que la console) : seule la FIN de la suite de lettres compte,
   `x>aet` après « pour » donne a·« et ».
3. Mineur : `handleInput`/`updateSmartFence` rejoués par l'`input` de l'insertion — inoffensif.
4. Non testés : mode `typing`, Échap après un mot remplacé — lus sûrs.

## Suite : les espaces se voient dans la carte (2026-11-28)

- David, à l'essai : « je n'arrive pas à mettre les espaces » ; la console les montre (`mathModeSpace`
  = `\,`), pas la carte. « je veux le même réglage ».
- `DefinitionField` : `mathModeSpace` aussi pour une fonction ; `withoutTypedSpaces` retire les `\,`
  avant de ranger ; `leaveSimpleDenominator` (comme la console) à l'espace seulement.
- `cardWordAtCaret` prend avec le mot l'espace tapée juste avant (`x\,pour` → un seul blanc).
- Mesuré avant : une espace après `\text{ pour }x` repassait en mode texte (`x\text{  > 3}`) ; réglé.
- Tests : `carte-mot-pour.svelte.test.ts` 8 (+3), `natural-input.test.ts` +1.
