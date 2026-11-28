---
title: Lot d'outils formes-messages (n° 75 puis 76)
date: 2026-11-28
status: n° 75 livré (#3329) ; n° 76 à faire
---

# Lot `formes-messages` : n° 75 puis n° 76

## Reprendre ici

_Mis à jour le 2026-11-28, après #3329._

- **État** : n° 75 livré (#3329, mergée) ; n° 76 pas commencé.
- **Prochaine action** : n° 76 (forme « produit de facteurs premiers ») : vérifier qu'il manque
  encore, puis phase 0 à David (`pnpm prevenir question`), rien de codé avant sa réponse.
- **En attente de David** : rien.
- **Pièges en cours** : le n° 76 nomme le facteur fautif par le message du n° 75
  (`requiredForm.message`, `getRequiredFormFeedback`).
- **Worktree / branche** : à recréer (`../ubumaths-wt-outil-formes-messages`,
  `feat/outil-formes-messages-76` depuis `origin/main`).

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

**Tranché** (David, 2026-11-28, « je te suis » en réponse aux 4 questions) : Q1 à Q4 = les
recommandations (motif seulement ; pas de message pour « acceptable » ; erreur prévue de même
valeur comparée sur l'écriture ; `{ pattern, acceptable?, message? }`).

## N° 75 : livré (#3329, 2026-11-28)

- `required-form-validator.ts` `getRequiredFormFeedback` : `message` du motif, sinon la phrase
  générale. Schémas souple et strict : `message` non vide, 500 caractères au plus.
- Générateur : message résolu à l'étape 7 bis, comme celui d'une erreur prévue (source à part).
- `expected-errors.ts` : sur `bad_form` d'une case à forme exigée, erreur prévue écrite telle quelle
  (`nodesEqual` des arbres) ; `expected-result.ts` : son message remplace celui de la forme.
- Rejeu `checkTemplate` : une erreur prévue de mauvaise forme (case à forme exigée) doit déclencher
  son message ; sans forme exigée, ignorée comme avant.
- Éditeur : champ « Message si la forme n'est pas respectée » (variation, partagé, défauts des cases).
- Tests : `required-form-message.test.ts` (15, rouges avant), `QuestionTemplateForm-message-de-forme`
  (2), verif `message-de-forme.spec.ts` (3, captures vues : clair, sombre, éditeur).
- Revue (`code-reviewer` opus) : 5 findings, aucun bloquant. Corrigés : erreur prévue lue sur une
  mauvaise forme comptée dans les « Types d'erreur » du prof ; message vide → phrase générale (`||`) ;
  forme de la variation copiée sur l'instance sans son message non résolu ; test d'une forme nommée
  (`fraction`), qui a révélé la virgule nue (`1,4` illisible) → relue comme dans le validateur.
  Laissé : rejeu qui échouerait sur une erreur prévue de plus de 300 caractères (cas théorique).
