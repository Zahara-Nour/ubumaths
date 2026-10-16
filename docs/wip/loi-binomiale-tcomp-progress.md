---
title: Fiches « Loi binomiale » T_COMP — point de reprise
date: 2026-10-16
status: publié en brouillon, PR en cours
---

# Fiches « Loi binomiale », Terminale maths complémentaires

Commande de David (2026-10-16) : skill `fiches-exercices`, `grade=T_COMP`, `theme="Loi binomiale"`.

## Étape 1 — inventaire en production (lecture seule)

- Aucune fiche T_COMP sur la loi binomiale ; aucun exercice T_COMP en base (thème inexistant).
- Référentiel : TCOMP-286 à 306 (« Lois discrètes ») ; ce thème couvre Bernoulli, schéma, coefficients
  binomiaux, loi binomiale (formule, calculatrice, E, σ, intervalle) ; loi géométrique et uniforme exclues
  (autres thèmes).

## Fichiers de travail

Scratchpad de la session (`.../22d784b7-…/scratchpad/binom/`) : `CONVENTIONS.md`, `PLAN-technique.md`
(14 ex., 7 sections), `PLAN-applications.md` (8 ex., 4 sections), `technique/`, `applications/`.

## Étapes

- [x] 1. Inventaire · [x] 2. Cadrage + CONVENTIONS + plans
- [x] 3. Rédaction (2 agents Opus) : technique 136 assertions, applications 191 ; check:ubumark 0 problème
- [x] 4. Rendu vert (`fiche:verifier` réparé : polices du corrigé) + pages relues
- [x] 5. Script `create-loi-binomiale-tcomp.ts` + simulation (2026-10-16 : 22 exercices, 11 sections, 6 images) · [ ] 6. Publication (accord de David)
- [ ] 7. Vérification en base

## Ajout « Les crêpes au plafond » (2026-10-16)

Exercice d'application demandé par David : deux lois de même espérance (B(20 ; 0.8) et B(32 ; 0.5)),
écarts types comparés, puis seuil de 95 % (21 crêpes contre 37). Variantes guidée et autonome, FR + EN,
35 assertions, check:ubumark 0 problème, rendu relu. Sources : scratchpad de la session
(`.../a45cd49e-…/scratchpad/crepes/`). Script `add-crepes-loi-binomiale-tcomp.ts` : section
« Espérance et décision », position 3. Simulation faite · [x] publié le 2026-10-16 (exercice `7a0865c0`, accord de David), vérifié en base ; PR #1451 mergée.
En discussion : titre de la partie B (« La fournée de Mme Bougouin ») et section 3 renommée « Espérance et écart type ».
