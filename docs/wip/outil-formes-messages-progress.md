---
title: Lot d'outils formes-messages (n° 75 puis 76)
date: 2026-11-28
status: phase 0 du n° 75 posée, en attente de David
---

# Lot `formes-messages` : n° 75 puis n° 76

## Reprendre ici

_Mis à jour le 2026-11-28, avant la première PR._

- **État** : phase 0 du n° 75 (message propre à une forme exigée) posée à David, rien de codé.
- **Prochaine action** : réponse de David → tests rouges → code (n° 75), PR ; puis phase 0 du n° 76.
- **En attente de David** : les 4 questions de la phase 0 du n° 75 ci-dessous.
- **Pièges en cours** : le rejeu de `checkTemplate` refuse aujourd'hui une erreur prévue qui n'est
  pas jugée fausse avec son message : à revoir pour une erreur prévue de même valeur.
- **Worktree / branche** : `../ubumaths-wt-outil-formes-messages` · `feat/outil-formes-messages`.

## Origine

Revue du lot « nombres et calculs » de Seconde, passe 2 (`idees-format-progress.md` § « Passe 2
tranchée », 2026-11-28) : oui pour n° 75 et 76. Fiches qui attendent le n° 75 : b-04-1, b-10-1,
c1-03-1, c1-07-0 ; le n° 76 : b-12-1 (les modèles ne font pas partie du lot).

## Relevé du code (n° 75)

- `required-form-validator.ts` : motif `{ pattern, acceptable? }` ; violé → message fixe
  `REQUIRED_FORM_FEEDBACK.pattern` (« La réponse ne respecte pas la forme demandée. ») ;
  `getRequiredFormFeedback`.
- `answer-validator.ts` (étape 3, ~l. 1910 et ~l. 2590) : forme violée → `bad_form` + ce message.
- `expected-errors.ts` `expectedErrorOf` : seulement si `status === 'incorrect'` → une erreur
  prévue de même valeur que la bonne réponse (mauvaise forme) n'est jamais lue.
- Éditeur : champs du motif dans `QuestionTemplateForm.svelte` / `SharedFieldsEditor.svelte`.

## Phase 0 du n° 75 (posée le 2026-11-28)

Exemple : « Écris 7/5 sous la forme d'un entier plus une fraction plus petite que 1. »
Bonne réponse : 1 + 2/5.

1. **Message de l'auteur** (nominal) : un champ « Message si la forme n'est pas respectée » à côté
   du motif. L'élève répond `0 + 7/5` → il lit ce message au lieu de « La réponse ne respecte pas
   la forme demandée. ». Variables résolues (« le reste doit être plus petit que {{b}} »). Note
   inchangée (0, mauvaise forme).
2. **Erreur prévue de même valeur** (nominal) : l'auteur a prévu `7/5` avec « 7/5 n'est pas plus
   petite que 1 : il reste un entier dedans ». L'élève écrit `7/5` → il lit ce message-là (il passe
   avant le message de forme).
3. **Limite** : l'élève écrit `14/10` (même valeur, autre écriture) → ce n'est pas l'erreur prévue
   `7/5` (comparée sur l'écriture, sinon toute mauvaise forme la déclencherait) → message de forme.
4. **Erreur d'auteur** : message vide ou trop long → refusé à l'enregistrement, comme une erreur
   prévue.

Questions à David :

- Q1 : message seulement pour un **motif**, pas pour les formes nommées (produit, fraction…) qui ont
  déjà leur phrase ? (recommandé : oui, motif seulement)
- Q2 : un second message pour la forme « acceptable » (½ point) ? (recommandé : non, pas de cas réel)
- Q3 : erreur prévue de même valeur comparée sur l'**écriture** (`7/5` ≠ `14/10`) ? (recommandé : oui)
- Q4 : syntaxe : `{ pattern, acceptable?, message? }` dans `requiredForm` ? (recommandé : oui)
