# Chantier « réponses à placer » — l'élève répond en plaçant un objet

## Reprendre ici

_Mis à jour le 2026-10-27, PR 2 en cours._

- **État** : PR 1 (#1846) et « téléphone » (#1848) mergées, pas en prod. PR 2 (plusieurs points) en cours, décisions § 10.
- **Prochaine action** : finir la PR 2 (parseur → générateur → écran → copie corrigée), § 11.
- **En attente de David** : essai sur un vrai téléphone de la droite à placer (après un `deploy:prod`, ou en local).
- **Pièges en cours** : `BuildKind` = patron commun construire/placer (`generator/build-answer.ts`) ; une droite à K points porte K cases consécutives (`case:` = la première, comme ```operation) ; `placerAnswer` des deux côtés.
- **Worktree / branche** : `../ubumaths-wt-reponses-a-placer`, `feat/reponses-a-placer-2`.

---

## 1. Le besoin

Un type de réponse qui n'existe pas encore : l'élève **place** un objet (point, étiquette,
aiguille, hauteur de barre) et la réponse jugée est sa **position**. Formes notées dans le
chantier « questions » : point sur une droite graduée, étiquettes à ranger, aiguilles.

Points du programme qui l'attendent :

- **CP-008** — placer des nombres sur une demi-droite graduée de un en un (borne : graduée de un
  en un uniquement). Verdict du conseil (`geometrie-validation`), suivi par David le 2026-10-25.
- **CP-072** — présenter des données en diagramme en barres (hauteur des barres ; caractère à 2-5
  valeurs, moins de 40 individus).
- **CP-058** — vérifier un alignement à la règle : à réexaminer (placer, case « figure », ou ni l'un
  ni l'autre).
- Horloge : placer les aiguilles (aujourd'hui CP-047 se joue en QCM entre cadrans).

## 2. Questions de la phase 0 (à poser à David, pas tranchées)

1. Par quel geste commencer ? (recommandation à donner après lecture de l'existant)
2. Le geste à l'écran : glisser, toucher une graduation, ou les deux ? Sur téléphone ?
3. Ce qui est jugé : la position exacte (graduation) ; une tolérance ?
4. Écriture par le prof : une ligne dans le bloc existant (comme `construire:`), ou un bloc neuf ?
5. Correction et PDF : comment montrer la position juste ; que donne la fiche imprimée ?

## 3. Phase 0 — l'existant (lu le 2026-10-26)

- **Patron déjà établi : « à construire »** (`collection`, `monnaie`, `construire: N`). Une ligne dans le
  bloc existant ; le générateur pose `case: N` ; **une** case `math` jugée comme une case ordinaire (la
  valeur posée) ; correction « Ta collection vaut 32. » + construction juste à côté ; copie corrigée
  `BuildAnswer.svelte` ; PDF = plan vide en pointillés où l'enfant dessine ; nom accessible sans la réponse.
- **Droite graduée** (` ```line `) : `start`, `end`, `step`, `major`, `labels`, `hidden`, `points`,
  `segments`. Purement affichée aujourd'hui.
- **Code mort à rebrancher** : `question-inputs/NumberLineInput.svelte` a déjà un mode `place-point`
  (toucher / glisser, aimant sur les graduations, flèches ← → Début Fin). Aucun composant ne l'importe,
  aucun générateur ne produit la case `graphical` + `graphicalConfig` (questions.md § écarts).
  Défaut vu : la réponse est un décimal (`0.3333333333` pour un tiers) → à écrire en fraction.
- **Horloge** : dessin seul ; CP-047 se joue en QCM entre cadrans. **Barres** : bloc `barres` (stat-chart),
  dessin seul. **Étiquettes à ranger** : `OrderingInput.svelte`, mort aussi, glisser-déposer HTML5
  (ne marche pas au doigt).
- **Portée** : droite graduée = CP-008, CE1-010, CE2-010, CM1/CM2 (entiers, fractions, décimaux :
  ~12 points) ; aiguilles = CP-047, CE1-060, CE2-058, CM1-093, CM2-083 ; barres = CP-072, CE1-088,
  CE2-082, CM1-135, CM2-121.

## 4. Phase 0 — comportements proposés (premier geste : le point sur la droite)

Écriture par le prof (calquée sur `construire:`) :

````text
Place le nombre {{a}} sur la droite.
```line
start: 0
end: 20
step: 1
labels: 0, 10, 20
placer: {{a}}
```
````

**Nominal**

1. L'élève touche la droite : un point apparaît sur la graduation la plus proche (aimant). Il le glisse
   pour corriger, ou le retouche ailleurs. Au clavier : ← → d'une graduation.
2. Il valide : la case vaut la graduation choisie, jugée comme une case ordinaire (7 attendu, 7 posé → juste).
3. Juste : point vert. Faux : « Tu as placé le point sur 9. » + la droite juste à côté (point sur 7).
4. Copie corrigée et verso de flash-card : la droite verrouillée avec le point de l'élève ou le point juste.
5. PDF : la droite sans point ; l'enfant fait une croix au crayon.
6. Nom accessible « Droite graduée » ; jamais la valeur attendue, ni dite ni dans le DOM.

**Limites**

- Rien posé → réponse vide (comme « Tu n'as rien posé. »).
- Graduation qui porte déjà une étiquette (0, 10) : permise (c'est une vraie réponse possible).
- Pas fractionnaire (`step: 1/4`, CM1) : réponse écrite `3/4`, jamais `0.75` ni `0.333…`.
- Téléphone : la droite tient dans la largeur ; graduations trop serrées au doigt (≈ 30 graduations
  et plus sur 360 px) → boutons ◀ ▶ sous la droite pour ajuster d'un cran.

**Erreurs (messages situés pour le prof)**

- `placer:` hors de `start`…`end`, ou pas sur une graduation → refus au parseur.
- `placer:` avec `points:` déjà présents : à trancher (Q4).
- Bloc avec `placer:` hors d'une question (cours, aperçu) : le même geste, rien de jugé.

## 5. Questions à David (phase 0)

1. **Ordre des gestes** — recommandation : (a) point sur la droite d'abord (code à moitié écrit, ~12 points
   du CP au CM2), (b) aiguilles ensuite, (c) barres en dernier ; étiquettes à ranger hors chantier
   (CP-007 se fait déjà en case texte). D'accord ?
2. **Écriture** — une ligne `placer:` dans le bloc existant, comme `construire:` (recommandé), plutôt
   qu'un bloc neuf ?
3. **Ce qui est jugé** — la graduation exacte, sans tolérance (l'aimant rend la tolérance inutile) ?
4. **Plusieurs nombres sur une même droite** (« place 3, 7 et 12 ») : `placer: A=3 ; B=7 ; C=12`, une
   case par point (note partielle naturelle) ; ou un seul point par droite au départ ?
5. **Téléphone** : boutons ◀ ▶ en plus du toucher, ou toucher seul ?
6. **PDF** : la droite sans point (l'enfant fait sa croix) — ça te va ?

## 6. Décisions (David, 2026-10-26 : « go sur tes recos »)

1. Ordre : **droite graduée** → aiguilles → barres ; étiquettes à ranger hors chantier.
2. Écriture : ligne **`placer:`** dans le bloc ` ```line ` (patron `construire:`).
3. Jugé : la **graduation exacte**, sans tolérance (aimant).
4. **PR 1 : un seul point par droite** (`placer: 7`) ; PR 2 : plusieurs (`placer: A=3 ; B=7`, une case par
   point) — syntaxe de la PR 1 choisie pour s'étendre sans casse.
5. Boutons **◀ ▶ toujours visibles** sous la droite (d'un cran), en plus du toucher et du clavier.
6. PDF : la droite **sans point**, l'enfant fait sa croix.

## 7. PR 1 — droite à placer, un point (2026-10-26)

- Parseur : `placer:` et `case:` dans ` ```line ` (refus : hors droite, hors graduation, `log`, avec
  `points:`, illisible ; `case:` sans `placer:`) ; `findLinesToPlace`, `hasLineToPlace`.
- Calcul pur `ubumark/utils/number-line-placer.ts` : réponse `placerAnswer` (entier, décimal à point,
  sinon `\frac{p}{q}`), commune à la réponse attendue et à l'élève.
- Générateur : `BuildKind` gagne `'line'` (patron « à construire » repris) ; lecture commune
  `generator/build-answer.ts` ; messages au prof « droite graduée » (`buildKindName`).
- Écran : `NumberLinePlacer.svelte` (toucher/glisser, ◀ ▶, clavier, `role="slider"`), point bleu
  sur la droite ; faux → « Tu as placé le point sur 9. » + droite juste (point vert) ; copie corrigée
  par `BuildAnswer` ; Entrée sur une droite vide → focus sur la droite.
- Vu en vrai (port 5177, admin local, aperçu d'un brouillon local `e8d7b0e3…`) : poser, valider,
  carte de correction OK.
- **Limite trouvée** : sur téléphone (375 px), la droite (viewBox 600 × 120) rétrécit entière : chiffres
  minuscules, graduations à ~12 px. Vaut pour tout bloc ```line. Les boutons ◀ ▶ compensent la précision,
  pas la lisibilité. Question posée à David.

## 8. Décisions (David, 2026-10-26, après #1846 : « ok pour tes recos »)

1. **Téléphone** : PR à part, **avant la PR 2**. Dessiner la droite ```line à la largeur réelle du
   conteneur (chiffres, points, traits à taille fixe ; seul l'écart entre graduations se resserre), au
   lieu de réduire la viewBox 600 × 120. PDF inchangé. L'aperçu du modèle avertit le prof si les
   graduations tombent sous ~20 px sur un écran de téléphone. Pas de défilement horizontal (il se battrait
   avec le glisser). Vaut pour toutes les droites graduées.
2. **Droite à placer (ou collection / monnaie à construire) dans un QCM** : rien à coder. L'ADR 0033
   fait du QCM une case choix, et `multiple_choice` disparaît après la migration ; le trou n'existe que
   pour l'ancien type. À la migration : un test qui mêle ```choix et une droite à placer (deux cases jugées).

## 9. PR « téléphone » — droite à la largeur réelle (2026-10-26)

Branche `feat/reponses-a-placer-telephone`. `NumberLine.svelte` dessine la droite en px à la largeur
du conteneur (plus de viewBox 600 réduite) ; `valueToX` / `xToValue` / `computeGraduations` /
`computeLineExtents` prennent la largeur (défaut 600 : PDF et `NumberLineInput`, code mort hors tests,
inchangés). `phoneGapWarning` (droites à placer seulement, après revue : une droite d'affichage garde ses graduations fines) : avertissement d'auteur si l'écart minimal entre graduations, sur un
conteneur de 320 px, passe sous 20 px (0 à 20 au pas de 1 → 12 px : avertie). Droite de correction :
`showErrors={false}` (pas d'avertissement en double). Tests : `number-line-largeur.test.ts`,
`NumberLine-largeur.svelte.test.ts` (320 / 700 px, chiffres de même taille, geste à 320 px).

## 10. Décisions PR 2 (David, 2026-10-27 : « ok go » sur les recos)

Plusieurs points sur une même droite : `placer: A=3 ; B=7 ; C=12`.

1. **Geste** : rangée d'étiquettes A B C sous la droite (à côté de ◀ ▶), une active (A au départ).
   Toucher la droite pose le point actif ; l'étiquette suivante non placée devient active. Toucher /
   glisser un point posé le reprend. ◀ ▶ et flèches : le point actif.
2. **Séparateur `;`** (pas `,` : « 3,5 » à la française serait mal lu).
3. **Correction** : « Tu as placé B sur 9. » par point faux, « Tu n'as pas placé C. » ; la droite juste
   avec **tous** les points, en vert.
4. **Au plus 6 points.** Noms : une lettre majuscule, distincts ; obligatoires dès 2 points. Deux points
   sur la même graduation : permis (vraie erreur possible).
5. Une case par point (note partielle) ; PDF : la droite sans point.

## 11. PR 2 — plusieurs points (2026-10-27)

Branche `feat/reponses-a-placer-2`. Tests rouges d'abord : `number-line-placer-plusieurs.test.ts`
(parseur), `generation-placer.test.ts` (une case par point).
