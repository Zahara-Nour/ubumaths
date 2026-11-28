---
title: Lot d'outils formes-messages (n° 75 puis 76)
date: 2026-11-28
status: n° 75 livré (#3329) ; n° 76 livré (#3337)
---

# Lot `formes-messages` : n° 75 puis n° 76

## Reprendre ici

_Mis à jour le 2026-11-28, après #3337._

- **État** : lot `formes-messages` fini : n° 75 (#3329) et n° 76 (#3337) mergés.
- **Prochaine action** : aucune dans ce lot ; à David de dire s'il le clôt (versement du journal
  dans `docs/archive/wip/`). Fiches à reprendre hors lot : b-04-1, b-10-1, c1-03-1, c1-07-0
  (n° 75), b-12-1 (n° 76), par une session de modèles.
- **En attente de David** : clôture du chantier.
- **Pièges en cours** : message de forme qui dépend de la réponse → `judgeRequiredForm`.
- **Worktree / branche** : aucun (retirés par `pr:merger`).

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

## Phase 0 du n° 76 (posée et tranchée le 2026-11-28)

Forme exigée « produit de facteurs premiers », puissances permises (`primeFactors`) ou exigées
(`primeFactorsPowers`). Exemple 84 : 2² × 3 × 7 dans tout ordre juste ; 2 × 2 × 3 × 7 juste si
permises ; remarque « produits » coupée pour la case ; `37` seul juste ; `2¹` juste ; 4 × 21 →
« 4 et 21 ne sont pas des nombres premiers. » ; 84 seul → « Écris 84 comme un produit de facteurs
premiers. » ; 2 × 3 × 7 = faux (juge de valeur).

**Tranché** (David, « ok pour tout ») : Q1 puissances exigées et facteurs non regroupés →
demi-point, « Regroupe les facteurs égaux en puissance : 2² × 3 × 7. » ; Q2 facteur 1 refusé
(« 1 n'est pas un nombre premier. ») ; Q3 tous les facteurs non premiers nommés ; Q4 la forme écrit
toujours son message (pas de message d'auteur) ; Q5 négatifs hors champ (refusés).

## N° 76 : code (2026-11-28)

- `questions/prime-factors-form.ts` : lecture du produit (`analyzePrimeFactors`), messages,
  verdict ; `types.ts` `PrimeFactorForm`, `PRIME_FACTOR_FORMS` (schémas, éditeur, `form-options`).
- `required-form-validator.ts` : `judgeRequiredForm` (verdict + message de la réponse) ;
  `requiredFormVerdict` et `checkRequiredForm` le suivent.
- `answer-validator.ts` : étape 3 (case seule) et cases appariées lisent `judgeRequiredForm` ;
  `requiredFormCosmetics` coupe `products` pour cette forme ; `expected-result.ts` retire le bon
  message de forme quand une erreur prévue passe devant.
- Tests : `required-form-prime-factors.test.ts` (36 ; 35 rouges avant le code).
- Vérif à l'écran `e2e/verifs/facteurs-premiers.spec.ts` (2, captures vues clair et sombre :
  formules du message rendues, ½ point affiché).
- Revue (`code-reviewer` opus) : aucun bloquant ; 3 mineurs corrigés (JSDoc de
  `checkRequiredForm` déplacé, condition redondante, cas « attendu écrit décomposé » ajouté).
- PR #3337 mergée le 2026-11-28. CI : cliquet rouge (rétrécissement de type perdu en corrigeant
  un mineur de la revue, typecheck non relancé), corrigé ; puis E28 de `lecture-graphique`
  (grapheur, hors PR) rouge une fois, vert à la relance du job.
