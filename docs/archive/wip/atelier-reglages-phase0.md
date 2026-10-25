---
title: Atelier — une fenêtre de réglages, et le choix de la saisie (phase 0)
date: 2026-10-14
status: #1385 et #1388 mergées, en prod ; archivé le 2026-10-25
---

# Atelier — la fenêtre de réglages

Demande de David du 2026-10-14 : une fenêtre de réglages dans l'atelier, où l'on choisit le mode
de saisie de Calcul — le mode texte d'aujourd'hui, ou le mode MathLive à venir.

⚠️ **Change la décision 1 du 2026-10-13** ([atelier-saisie-naturelle.md](atelier-saisie-naturelle.md)) :
« un seul champ MathLive, aucun mode à choisir ». Le mode texte reste, au choix de l'élève.

## État des lieux (lu dans le code le 2026-10-14)

- La barre du haut de l'atelier (`AtelierContainer.svelte`) porte le partage et « Repartir de
  zéro ». Aucun réglage n'existe ; le seul choix retenu est « Résumé / Détaillé » des étapes, fait
  dans la ligne même et gardé dans ce navigateur (`chiphre-atelier-etapes`, à part de l'atelier).
- Le mode exact / décimal est une commande (`.mode décimal`), pas un réglage.
- Le champ de Calcul est un `<input>` texte (`CalculView.svelte`) ; les cartes de « Mes objets »
  sont déjà en MathLive (`DefinitionField.svelte`).
- Le prototype `/test-saisie` (en production depuis la v0.31.0) a le champ MathLive
  (`NaturalField.svelte`) et les deux conversions : texte → champ (`fieldLatexFromText`) et champ
  → texte envoyé au moteur (`calcTextOf`).
- Le même conteneur sert `/atelier` et `/grapheur`.

## A. La fenêtre

- Un bouton **« Réglages »** (icône d'engrenage et le mot) dans la barre du haut, à côté de
  « Repartir de zéro ». Présent sur `/atelier` et `/grapheur`, et aussi sur un atelier reçu par
  lien : c'est une préférence de l'élève, pas le contenu de l'atelier.
- Une fenêtre **« Réglages de l'atelier »** ; Échap, la croix ou un clic dehors la ferment, le
  focus revient au bouton.
- Un seul réglage pour l'instant, **« Saisie dans Calcul »**, deux choix :
  - **Texte** — « On tape x^2, sqrt(2), et un point devant les commandes : .résoudre x^2=4 »
  - **Écriture mathématique** — « x², √2 et les fractions s'affichent comme sur le cahier ; les
    commandes s'écrivent sans point : résoudre x² = 4. Clavier mathématique à l'écran. »
- Le choix prend effet **tout de suite**, sans bouton « Enregistrer ».
- Il est retenu **dans ce navigateur**, comme « Résumé / Détaillé » : ni dans le lien de partage,
  ni dans l'historique exporté, ni sur un compte (l'atelier est public et rien ne quitte le
  navigateur). Un navigateur qui refuse le stockage garde le choix jusqu'au rechargement, sans
  message.

## B. Ce que change le mode

- **Le champ de Calcul seulement.** Les cartes restent en écriture mathématique, Données ne change
  pas.
- **Mêmes réponses** : les deux champs envoient le même texte au moteur (décision 10 du
  2026-10-13). Commandes, rejeu, exports, historique gardé au rechargement : inchangés.
- **La ligne en cours de frappe suit la bascule**, convertie : `x^2+1` devient x² + 1, et
  inversement.
- **↑ / ↓** rappellent les saisies précédentes dans le mode du moment, quel que soit celui où
  elles ont été tapées.
- Les lignes déjà dans l'historique ne changent pas d'aspect.
- En mode texte, rien ne change : point devant les commandes, liste des commandes, modèles.

## C. Par défaut

Reco : **Texte**, tant que l'écriture mathématique n'est pas finie. Un élève qui n'ouvre pas les
réglages ne voit rien changer. Le passage du défaut à « Écriture mathématique » sera une décision
à part, quand tu jugeras ce mode prêt.

## D. Découpage proposé

1. **PR 1 — la fenêtre et le choix** : A, B, C. Le mode « Écriture mathématique » branche le champ
   du prototype tel qu'il est (déplacé de `/test-saisie` vers `src/lib/atelier/`), avec la mention
   « nouveau, en essai » dans la fenêtre. Tests d'abord ; `code-reviewer` et revue a11y (fenêtre,
   boutons radio, focus).
2. **Ensuite, le mode mathématique lui-même** : la phase 0 de
   [atelier-saisie-naturelle.md](atelier-saisie-naturelle.md), nourrie de tes essais sur
   `/test-saisie` et maintenant dans l'atelier ; puis Copier, les étapes d'un calcul simple, le
   retrait de `/test-saisie` et de `/calc`.

## Questions à trancher

1. Le défaut : **Texte** (reco) ou Écriture mathématique ?
2. Le découpage : **brancher le champ du prototype dès la PR 1, marqué « en essai »** (reco), ou une
   fenêtre où « Écriture mathématique » est grisée (« bientôt ») tant que le mode n'est pas fini ?
3. Tes essais sur `/test-saisie` : quelque chose à corriger avant de le brancher dans l'atelier ?

Rien d'autre n'entre dans la fenêtre pour l'instant : le mode exact / décimal reste la commande
`.mode`.

## Journal

- 2026-10-14 — phase 0 écrite après lecture de l'atelier et du prototype.
- 2026-10-14 — **décisions de David** : (1) défaut **Texte** ; (2) le champ du prototype est branché
  dès la PR 1, marqué « en essai » ; (3) rien à corriger au prototype pour l'instant. PR 1 sur la
  branche `feat/atelier-reglages` (worktree `ubumaths-wt-reglages`).
- 2026-10-14 — **PR 1 mergée (#1385)**. Mesuré en branchant le prototype : « développer » et « limite »
  en double, point d'une ligne du mode texte gardé, `.mode exact` lu `e x a c t`, double ↑ bloqué.
  Revue de code : arguments d'une commande collés à l'écran (`simuler LM100`), `G = fille` lu
  `fi lle`, ligne perdue au passage par le Graphe. Revue a11y : liste muette pour un lecteur
  d'écran (shadow DOM), option surlignée à 2,04:1, liste coupée en bas d'écran, croix « Close ».
  Tout corrigé. **Restent pour la suite** : l'historique montre le texte envoyé (avec le point) ;
  pas de consigne dans le champ mathématique vide ; `Sheet.Content` dit encore « Close ».
- 2026-10-14 — **#1388 mergée** (« corrige les 3 points », David) : l'historique montre la saisie
  écrite (`Entry.inputLatex`, gardée au rechargement, liste blanche à la relecture ET à l'affichage
  — audit : une saisie forgée rappelée par ↑ posait un calque dans la page) ; consigne du champ
  vide ; croix « Fermer » des panneaux latéraux. Reste : une ligne rejouée revient en texte ;
  `breadcrumb-ellipsis` dit encore « More » (composant inutilisé).
