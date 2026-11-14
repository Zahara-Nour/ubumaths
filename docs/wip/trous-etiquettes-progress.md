# Chantier `trous-etiquettes` — texte à trous à étiquettes (outils-manquants n° 34)

> Demande de David du 2026-11-14. Même mécanique que ` ```associer `, `geste: étiquettes`
> (chantier [`associer`](../archive/wip/associer-progress.md)) : associer ne place qu'un trou par
> ligne, en bout de ligne ; ici, les trous sont au milieu d'un paragraphe.

## Reprendre ici

_Mis à jour le 2026-11-14, après #2653._

- **État** : lot 1 mergé (#2653, CI verte, revue opus « prêt pour PR », mineurs corrigés) ; bloc ` ```trous ` complet sur `main`, pas encore en prod · **Prochaine action** : essai de David (`verifications-manuelles.md`), puis clore le chantier (versement, journal archivé) · **En attente de David** : corrigé PDF de la série — garder « 1 → pair ; 2 → impair » (reco) ou le texte avec les étiquettes en gras (`trousAFiger`) ; `deploy:prod` · **Pièges en cours** : rouge non prouvé pour le parseur et le composant seul ; ~150 lignes du geste copiées d'`AssocierEtiquettes` (module commun plus tard) ; échappement Typst de `#`/`@` en texte nu laissé (commun avec associer, ranger) · **Worktree / branche** : aucun

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
- 2026-11-14 : **lot 1 codé** sur `feat/trous-etiquettes` (pas encore poussé). Parseur
  `ubumark/parser/trous-parser.ts` (+ types, `utils/trous.ts`), nœud `trous` dans `parseMarkdown` (et
  dans un item de liste), génération (une case par trou, `construire: 'trous'`, réserve mélangée par
  `rangerOrder`, énoncé réécrit aux trous vides, tirage refait si deux étiquettes deviennent identiques),
  juge strict, résultat attendu, garde anti-fuite, validateur de modèle, écran `TrousEtiquettes.svelte`
  (question, corrigé, bonne réponse, hors question), `BuildAnswer`, PDF `generateTrousTypst`, série
  d'automatismes (`trousAFiger`), cadres de réponse, catalogue des blocs, éditeur riche. Tests :
  `trous-parser.test.ts` (23), `generation-trous.test.ts` (17), `trous-typst-compilation.test.ts` (3,
  compilation réelle), `serie-automatismes-trous.test.ts` (2), `TrousEtiquettes.svelte.test.ts` (14),
  `trous-bloc.test.ts` (3), une ligne dans `blocs-sur-ligne-item.test.ts`.
  **Écarts à la phase 0** (raisons) :
  1. **Forme d'instance** non décrite en phase 0 : l'énoncé d'une instance écrit les trous vides `[]` et
     la réserve dans l'ordre affiché en dernière ligne `étiquettes: a ; b ; c` (il faut bien écrire le
     bloc sans réponse). Écrite par le prof, elle se lit sans réponse (geste libre d'un cours) et elle
     est refusée dans une question (« le trou 1 est vide »).
  2. **Corrigé PDF « texte avec les bonnes étiquettes en gras » : non fait.** Aucun chemin ne produit le
     corrigé PDF d'une question hors série d'automatismes, et le générateur Typst n'a pas de mode
     corrigé. Le corrigé de la série suit la phrase de la phase 0 qui la vise : « 1 → pair ; 2 →
     impair ». **Question à David** : préfère-t-il, au corrigé de la série, le texte avec les étiquettes
     en gras dans les trous (facile à changer, `trousAFiger`) ?
  3. **Trous numérotés dans tout PDF**, pas seulement en série (un seul rendu ; le numéro est écrit en
     petit devant les pointillés, pas « ① » cerclé : la police des fiches n'a pas ces caractères).
  4. **Erreurs en plus** de la phase 0 : `[` sans `]` (un intervalle `]2 ; 3[` écrit en texte ouvre un
     trou : message « un intervalle s'écrit en formule »), `;` hors formule dans une étiquette (il
     séparerait la réserve de l'instance), `intrus:` ailleurs qu'en dernière ligne, `étiquettes:` avec
     un trou rempli ou avec `intrus:`.
  5. **Texte** : une ligne non vide = une ligne affichée, lignes vides ignorées ; un trou au milieu d'un
     gras (`**a [x] b**`) coupe le gras (chaque morceau de texte est rendu à part).
  6. **Ajout** : la ponctuation qui suit un trou (`.`, `,`) lui reste collée à l'écran (sinon, au
     téléphone, un point revenait seul à la ligne).
  7. **Pas de factorisation d'`AssocierEtiquettes`** : composant à part, `TrousEtiquettes.svelte` (même
     geste, même clavier, mêmes noms de classes en `trous-…`) ; la mise en page diffère (places dans le
     texte) et `AssocierEtiquettes` est en prod. La logique du geste (~150 lignes) est donc copiée :
     factorisation possible plus tard (un module `.svelte.ts` commun).
     **Non vérifié** : iPhone réel (glisser au doigt, loupe) ; « Valider grisé tant qu'une place est vide »
     repose sur le mécanisme commun des cases à construire (`data-construire-cases`), non testé à part.
- 2026-11-14 : **revue `code-reviewer` (opus) du lot 1** : « prêt pour PR », aucun bloquant. **Corrigés** :
  (1) `[texte](adresse)` n'est plus lu comme un trou → « pas de lien dans un bloc trous » ; `[0 ; 1]` en
  texte → le message du `;` propose l'intervalle en formule (`$[0 ; 1]$`) ; `[0, 1]` reste un trou ;
  (2) un intrus égal à l'étiquette d'un trou → « l'intrus « x » est déjà l'étiquette d'un trou » ;
  (3) trou dans du gras ou de l'italique (`**a [x] b**`, `*a [x] b*`) → refusé avec un message (les `*`
  s'affichaient tels quels à l'écran et dans le PDF ; l'italique `_…_` n'est pas repéré) ;
  (4) garde anti-fuite : `trousHasFilledHole` signale un trou rempli même avec `étiquettes:` ;
  (6) test de la série : la réponse de la case de formule assertée à sa place (`\mathbf{2}`, avant
  « 1 → pair ») ; (7) cadres de réponse PDF : une ligne par rangée de la réserve (6 étiquettes par rangée,
  `TROUS_RESERVE_COLUMNS`, partagé avec `generateTrousTypst`). **Laissé** : (5) `inlineUbumarkTypst`
  commun avec associer et ranger (décision du coordinateur).
- 2026-11-14 : #2653 mergée (conflit avec le bloc `tortue` de #2651 résolu dans `questions.md`), worktree retiré.
