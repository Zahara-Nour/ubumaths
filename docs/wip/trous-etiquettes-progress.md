# Chantier `trous-etiquettes` — texte à trous à étiquettes (outils-manquants n° 34)

> Demande de David du 2026-11-14. Même mécanique que ` ```associer `, `geste: étiquettes`
> (chantier [`associer`](../archive/wip/associer-progress.md)) : associer ne place qu'un trou par
> ligne, en bout de ligne ; ici, les trous sont au milieu d'un paragraphe.

## Reprendre ici

_Mis à jour le 2026-11-14, ouverture du chantier._

- **État** : phase 0 validée · **Prochaine action** : lot 1 (tests rouges d'abord) · **En attente de David** : rien
  · **Pièges en cours** : `[…]` sert déjà aux liens markdown, à `[…]{.type}` et aux intervalles écrits en
  texte (`]2 ; 3[`) · **Worktree / branche** : `../ubumaths-wt-trous-etiquettes`, `feat/trous-etiquettes`

## Phase 0 (validée le 2026-11-14)

Le prof écrit :

````
```trous
Une suite définie par $u_{n+1} = u_n + r$ est [arithmétique], de raison [$r$].
Une suite définie par $u_{n+1} = q \times u_n$ est [géométrique], de raison [$q$].
intrus: croissante ; $u_0$
```
````

Un trou = une étiquette entre crochets, à sa place dans le texte ; `intrus:` = étiquettes en plus dans la
réserve, séparées par `;`.

**Nominal**

1. Le texte s'affiche tel qu'écrit (formules, gras, variables résolues), chaque trou remplacé par une place
   vide de la largeur de la plus longue étiquette ; au-dessus, la réserve : les étiquettes, chacune une
   fois, mélangées (jamais l'ordre écrit), intrus compris.
2. Geste : glisser l'étiquette sur la place, ou toucher l'étiquette puis la place ; toucher une étiquette
   posée la retire ; clavier : Tab, Entrée, flèches, Échap (comme `geste: étiquettes` d'associer).
3. Une étiquette reste dans la réserve après avoir été posée (réutilisable).
4. Une case par trou (note partielle) ; juge : l'étiquette posée, égalité stricte.
5. Corrigé à l'écran : places vertes / rouges, la bonne étiquette sous une place fausse.
6. Toutes les formes de série, contrôles compris ; Valider grisé tant qu'une place est vide.
7. PDF énoncé : la réserve encadrée au-dessus, chaque trou en pointillés « …… » ; corrigé PDF : le texte
   avec les bonnes étiquettes en gras dans les trous. Série d'automatismes : trous numérotés (« ①… »),
   corrigé « 1 → arithmétique ; 2 → $r$ ».
8. Texte, formules et variables dans le texte comme dans les étiquettes.

**Limite** : deux trous peuvent avoir la même bonne étiquette (montrée une fois dans la réserve) ; deux
étiquettes identiques au tirage → tirage refait ; téléphone : la réserve en haut, le texte revient à la
ligne, les places suivent le texte ; hors question (cours, aide, aperçu) le geste marche, rien n'est jugé ;
un crochet dans une formule (`$[0 ; 1]$`) n'est pas un trou.

**Erreur (message au prof)** : aucun trou ; plus de 10 trous ; trou vide `[]` ; plus de 12 étiquettes
différentes ; moins de 3 étiquettes différentes (réserve devinable) ; `[_]` ou `?` en formule dans le bloc
(une autre case) ; un bloc (` ```courbe `…) dans le texte ; `case:` écrite.

**Questions (recommandations en premier)**

1. **Où vivent les trous** : dans un bloc ` ```trous ` **(reco : le texte du bloc est lu à part, aucun
   lien ni `[…]{.type}` existant ne change de sens)** ; ou n'importe où dans l'énoncé, `[…]` faisant trou
   (risque : tout crochet de texte, intervalle `]2 ; 3[`, devient trou).
2. **Écriture d'un trou** : `[étiquette]` **(reco, courte ; une formule s'écrit `[$r$]`)** ; ou `[[étiquette]]`
   (déjà pris par les liens internes) ; ou `{étiquette}`.
3. **Étiquette réutilisable** : oui, comme associer **(reco : permet deux trous à la même étiquette, et on
   ne devine pas le dernier trou par élimination)** ; ou étiquette qui disparaît de la réserve une fois posée
   (texte à trous classique).
4. **Intrus** : réglage `intrus: a ; b` en dernière ligne **(reco)** ; ou une ligne par intrus `- -> a`
   comme associer.
5. **Bornes** : 1 à 10 trous, 3 à 12 étiquettes différentes **(reco)** ; ou d'autres nombres.
6. **Nom du bloc et du chantier** : `trous` **(reco)** ; ou `texte-a-trous`, `completer`.

**Tranché (David, 2026-11-14, « je valide » sur les recommandations)** : 1. bloc ` ```trous ` ; 2. trou `[étiquette]`, formule `[$r$]` ; 3. étiquette réutilisable ; 4. `intrus: a ; b` en dernière ligne ; 5. 1 à 10 trous, 3 à 12 étiquettes différentes ; 6. nom `trous`.

## Journal

- 2026-11-14 : worktree ouvert (`feat/trous-etiquettes`), phase 0 écrite puis validée.
