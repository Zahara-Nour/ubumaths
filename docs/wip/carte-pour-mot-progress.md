# Chantier `carte-pour-mot` — « pour » devient un mot dans la carte d'une fonction

## Reprendre ici

_Mis à jour le 2026-11-28, avant la PR (tout commité sur la branche, rien poussé)._

- **État** : fait sur `feat/carte-pour-mot`, tests verts, doc à jour ; revue `code-reviewer` (Sonnet) lancée avant le /clear — son rapport est perdu : la relancer.
- **Prochaine action** : relancer la revue, corriger, push, PR, `pnpm pr:merger <n>` ; puis archiver ce journal.
- **En attente de David** : son essai sur https://serveur.tail99357e.ts.net:8446/atelier (serveur 5179 de ce worktree). Un autre lien, 8445 (port 5178, worktree `ubumaths-wt-fonctions-domaines-essai`, sur main), à arrêter (`pnpm lien --stop` + kill du port) et worktree à retirer quand David a fini.
- **Pièges en cours** : `pnpm test:client` sur ~90 fichiers d'un coup en perd au chargement (`wrapDynamicImport`) → lots de 10.
- **Worktree / branche** : `ubumaths-wt-carte-pour-mot` / `feat/carte-pour-mot`.

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
