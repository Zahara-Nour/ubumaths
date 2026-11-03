# Automatismes de 1re — point de reprise

> Mis à jour le 2026-09-28. Pour reprendre dans une nouvelle session : lire ce fichier, puis
> [ADR 0011](../adr/0011-fiche-d-automatismes-figee-par-graine.md) et
> [`docs/pratiques/fiches-exercices.md`](../pratiques/fiches-exercices.md) § 2 bis.

## Reprendre ici

_Mis à jour le 2026-11-03, après #2344._

- **État** : lots « évolutions » et « droites » faits ; lot « Lectures graphiques » : 3 modèles neufs
  en **brouillon** (`95ee57c8`, `5397c20f`, `7f82d15a`) et script de fiche
  `create-automatismes-lectures-graphiques-1spe.ts` (simulation propre), mergés (#2344) · **Prochaine
  action** : écrire la fiche (`--publier`, par David ou sur sa demande), vérifier
  les PDF (`regen-depuis-base.ts`, `compile-prod.mjs --polices-corrige`, `debord.py`), ajouter la ligne
  à `fiches-exercices.md` § 1 · **En attente de David** : écrire la fiche ; publier `f5585668`,
  `95ee57c8`, `5397c20f`, `7f82d15a` et les fiches `9217dfaa`, `0f98be04` ; corriger ou non
  l'ensemble fini `{a}∪{b}` du corrigé (§ Lot « Lectures graphiques ») ; garder ou non les 2 figures
  d'un corrigé de tracé ; questions 2 à 4 (§ Questions ouvertes) · **Pièges en cours** :
  `compile-prod.mjs --polices-corrige` pour un corrigé ; `?v=` de `CORRECTION_FONT_FILES` à changer
  à chaque reconstruction des polices ; `~…~` non nettoyé par `cleanCoefficients` dans `buildSerie`
  · **Worktree / branche** : aucun (la fiche s'écrit depuis `main`).
- Hors de ce chantier, même niveau : 18 fiches « Entraînement technique » / « Applications » de 1re spé en
  brouillon depuis septembre, à relire et publier par David (`docs/pratiques/fiches-exercices.md` § 1, § 3).

## Décisions de David (figées)

- Les **automatismes** de 1re (partie « Automatismes » du nouveau programme) passent par le
  **système de questions** (modèles paramétrés, corrigés automatiquement, Automaths), puis on en
  tire des fiches.
- Fiche = exercices ordinaires (« séries ») faits d'**instances figées par une graine** : même copie
  pour toute la classe. Lien vivant (une copie par élève) écarté. → ADR 0011.
- Une série par exercice (≈ 8 questions), ≈ 2 séries par fiche ; script versionné d'abord, bouton
  dans l'application plus tard si l'usage le justifie.
- Les modèles d'autres niveaux (seconde) sont **réutilisés tels quels** : on n'ajoute pas `1_SPE` à
  leurs `grades` (un niveau accède déjà aux niveaux inférieurs ; Automaths ne filtre pas par niveau).
- Rangement : thème d'exercices « Automatismes », fiches « Automatismes : <sujet> (n) ».
- Tout est créé en **brouillon** : David publie (questions comme fiches).

## Fait (pilote « évolutions », PR #508)

| Élément                                                                                                                        | Où                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| `buildSerie` (instances → énoncé à pointillés / corrigé, réponses en gras) + 14 tests                                          | `src/lib/worksheets/serie-automatismes.ts`                                                                        |
| Création de modèles neufs en brouillon (`checkTemplate` obligatoire, `--mettre-a-jour`)                                        | `scripts/create-questions.ts`                                                                                     |
| 5 modèles « évolutions » de 1re (70 specs), niveaux 7-11 de Proportionnalité › Pourcentages › Variations                       | `scripts/questions/evolutions-1spe/*.json` (en base : `c4372fd8`, `1c443c35`, `bbd511cb`, `36abc642`, `8b59ca4b`) |
| Fiche « Automatismes : évolutions (1) », 2 séries de 8 (+ 4 modèles de seconde `e12e58cb`, `d98aa53a`, `2562438e`, `e05bb79b`) | `scripts/create-automatismes-evolutions-1spe.ts` ; fiche `9217dfaa`                                               |

Vérifié : `pnpm question:specs` vert pour les 5 modèles, réponses recalculées indépendamment ;
fiche régénérée depuis la base, compilée par le compilateur de prod, 0 débord, pages relues.

## Lot « Droites » — phase 0 (2026-11-03)

Relevé en prod, séries essayées par `buildSerie` (lecture seule, 3 graines par modèle) :

| Capacité (BO 1re, Automatismes)                     | Modèles                                                                                                                                | Série                                             |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Coefficient directeur par deux points               | `7d6cf480` (déjà 1re)                                                                                                                  | ✅                                                |
| Lire graphiquement l'équation réduite               | aucun ; lectures séparées `f381c646` (pente), `c64028b0` (ordonnée à l'origine), `0d0e88f5`, `b9771108` (coef. entier / fractionnaire) | ✅                                                |
| Tracer (équation réduite ; point + coef. directeur) | `8d4bd94d`, `dc5d7cb6`                                                                                                                 | ❌ « 0 case pour 1 réponse » : `tracer:` non figé |
| Entretien seconde                                   | `49df6491`, `7f308eb4`, `c23f5a94`, `336451af`, `e6552232`, `6e074f0e`                                                                 | ✅                                                |

Écartés : `09f0c9ec`, `ae0ad163` (image PNG fixe parmi 30 ; préférer les `courbe`).

**Tranché par David (2026-11-03)** : (1) apprendre à `buildSerie` à figer une droite à
tracer (énoncé : repère vide ; corrigé : droite tracée) ; (2) modèle neuf « lire l'équation
réduite sur un graphique », en brouillon.

### Fait (PR du lot « Droites », 2026-11-03)

- `droitesATracer` dans `src/lib/worksheets/serie-automatismes.ts` + 9 tests
  (`serie-automatismes-tracer.test.ts`) ; le PDF ne posait jamais `solved` hors des tests, d'où la
  réécriture du bloc dans le corrigé.
- `scripts/questions/droites-1spe/01-lire-equation-reduite.json` (11 specs, 100 tirages) → `f5585668`.
- `scripts/create-automatismes-droites-1spe.ts` : série 1 = pente par deux points, pente sur équation,
  tracer (réduite), pente lue, lire l'équation réduite, équation réduite, tracer (point + pente),
  parallèles ; série 2 = pente par deux points, lire l'équation (×2), équation par point + pente,
  tracer (point + pente), équation par deux points, tracer (réduite), parallèles (m à trouver).
  Graines changées : pente lue 1 → 5 (même droite que le tracé), pente par deux points 4 → 12
  (« a-t-elle une pente ? »).

### Fiche « Automatismes : droites (1) » écrite (2026-11-03)

Fiche `0f98be04` (brouillon, 2 séries) écrite par David. Vérifiée (`regen-depuis-base.ts`,
`compile-prod.mjs`, avec **`--polices-corrige` pour le corrigé**, sinon « current font does not support
math » ; `debord.py`) : fiche 2 p., réponses 1 p., corrigé 4 p., 0 débord ; repères vides à l'énoncé,
droite verte au corrigé.

⚠️ **Défaut trouvé, antérieur au lot** : au corrigé PDF, les réponses en gras (`\mathbf` → `bold()`
Typst) s'affichent en **carrés vides** : la police du corrigé (Chiphre Math) n'a pas les chiffres gras
mathématiques. Touche aussi la fiche « évolutions » `9217dfaa` (vérifié), donc toute série figée.
L'écran (KaTeX) n'est pas touché. Corrigé par #2337 (gras ajouté à la police, choix de David).

## Lot « Lectures graphiques » — phase 0 (2026-11-03)

Capacités (BO 1re, Automatismes, « Fonctions et représentations ») : résoudre graphiquement
$f(x) = k$, $f(x) < k$ ; déterminer graphiquement le signe d'une fonction ou son tableau de
variations. Entretien de 2de : images et antécédents. Relevé en prod (modèles à ` ```courbe ` ou
` ```variation `), séries essayées par `buildSerie` (lecture seule, graines 1-3) : **les 29 candidats
passent** (✅ ci-dessous).

| Capacité                               | Modèles (courbe quelconque d'abord)                                                                                                                                                                     | Manque                                               |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| Images (2de)                           | `cc88ebd3`                                                                                                                                                                                              | —                                                    |
| $f(x) = k$ / antécédents               | `17809937` (courbe quelconque) ; `406fd9a8` ($f = g$) ; références : `9c4f6b4f` x², `98892db9` x³, `60207cfd` 1/x, `1ac09759` √x, `b807cc6c` \|x\| ; `eb04ebf7` (linéaire, 3e)                          | —                                                    |
| $f(x) < k$                             | `a55ad3b4` (affine), `77500c81` (linéaire), `7efd2e76` ($f < g$), `33dffa7a` v2 ($f \geqslant 0$) ; références : `08c059b8`, `52e58bd6`, `2d4c0b35`, `a371b402`, `cbf00ce7`                             | **$f(x) < k$ sur une courbe quelconque, $k \neq 0$** |
| Signe lu sur la courbe                 | `33dffa7a` (signe sur un intervalle en choix, $f \geqslant 0$, tableau de signes **en choix**)                                                                                                          | tableau de signes **à compléter** (outil existant)   |
| Tableau de variations lu sur la courbe | `3810a06c` v0 (courbe → quel tableau ?, **parabole** seulement ; v1 : tableau → quelle courbe ?), `93bc8b5e` (croissante sur un intervalle ?), `39154ac5` (extremums), `275cb665` (comparer des images) | **courbe → tableau de variations** : aucun modèle    |

**Tranché par David (2026-11-03)** : 3 modèles neufs, en brouillon — (1) $f(x) < k$ (et $\leqslant$,
$>$, $\geqslant$) sur une courbe quelconque, $k \neq 0$ ; (2) « courbe → quel tableau de variations ? »
en choix multiple (l'inverse de `3810a06c`), le geste « tableau de variations à compléter » passé à
`outils-manquants.md` ; (3) tableau de signes à compléter, lu sur la courbe.

Aucun modèle ne fait compléter un tableau à partir d'une courbe (seuls `f0163416`, `9c7ab1c7`, de 2de,
sans courbe, ont des cellules cachées). Le parseur **refuse `?` dans une ligne `variation:`**
(`docs/systeme/ubumark.md`, « Cellules cachées ») : un tableau de variations à compléter est un geste
neuf ; un tableau de signes à compléter se fait déjà (`buildSerie` le fige, lot `tableau-signes`).

### Fait (PR #2344 du lot « Lectures graphiques », 2026-11-03)

- ⚠️ Correction du relevé : `3810a06c` (2de) a déjà une variante « courbe → quel tableau ? », mais
  sur une parabole (une bosse, 2 flèches) ; le modèle neuf (3) prend une cubique à deux extremums
  (3 flèches).
- `scripts/questions/lectures-graphiques-1spe/` → brouillons en prod :
  `95ee57c8` « Résoudre graphiquement une inéquation f(x) < k sur une courbe » (cubique
  $k + a(x-r)(x-s)(x-t)/4$, v0 sans la droite $y = k$, v1 avec ; 8 specs, 100 tirages) ;
  `5397c20f` « Dresser le tableau de signes d'une fonction lu sur sa courbe » (cubique 3 zéros /
  parabole 2 zéros ; 9 specs) ; `7f82d15a` « Dresser le tableau de variations d'une fonction lu sur
  sa courbe » (cubique $(u^3 - 12u)/4$, 4 tableaux : juste, flèches inversées, une flèche, dernier
  changement oublié ; 5 specs). Les 3 passent `buildSerie` (12 graines chacun).
- `scripts/create-automatismes-lectures-graphiques-1spe.ts` : série 1 = image, antécédents,
  f < k (droite tracée), f ⩾ 0 (`33dffa7a`), tableau de signes (cubique), extremums, tableau de
  variations, f = g ; série 2 = image, antécédents, sens de variation, f < k (sans droite), tableau de
  signes (parabole), f ⩽ g, tableau de variations, x² > k. Graines changées hors cas limites :
  antécédents 2 → 15 (S = ∅), x² < k 1 → 7 (S = ℝ ; ce modèle tombe sur ∅ ou ℝ 8 fois sur 15).
- ⚠️ **Défaut relevé, antérieur au lot** : au corrigé d'une série, la réponse en gras d'un ensemble
  fini s'écrit `{−3}∪{−1}∪{1}` (forme normalisée de l'attendu) au lieu de `{−3 ; −1 ; 1}` ;
  touche `17809937`, `406fd9a8`. L'étape de correction juste en dessous l'écrit bien.

## Questions ouvertes (à poser à David)

1. **Collision de vocabulaire « série ».** `CONTEXT.md` définit désormais **Série** = exercice de
   fiche fait d'instances figées (ADR 0011). Mais la spec en attente
   [`series-de-questions-dans-un-chapitre-spec.md`](../archive/wip/series-de-questions-dans-un-chapitre-spec.md)
   (2026-09-14) appelle « série » une évaluation interactive (`assessments`). Deux sens pour un même
   mot : faire trancher lequel garde « série » et renommer l'autre (puis corriger `CONTEXT.md`).
2. **Modèle 5 (évolution répétée)** : `(1+0{,}03)^5`, `(103/100)^5` sont jugés `bad_form` (calcul
   non effectué). `requiredForm: "power"` les accepterait mais refuserait les décimaux exacts
   (`1{,}159\,274\,074\,3`). Quelle écriture privilégier ?
3. **Bug du moteur** : `==` ne fonctionne pas dans les `conditions` d'un modèle (`!=` oui) —
   contourné dans le modèle 4 ; à corriger ?
4. Séries 1 q7 (−40 % puis +10 %) et 2 q8 (+10 % puis −40 %) ont la même réponse — gardées pour
   montrer que l'ordre ne compte pas ; changer une graine si David préfère.

## Suite

Même démarche (§ 2 bis du guide) pour les autres automatismes du programme de 1re :

1. **Droites** : coefficient directeur (deux points, lecture), ordonnée à l'origine, équation
   réduite, droites parallèles — réutiliser les modèles de seconde « Déterminer le coefficient
   directeur », « Déterminer l'ordonnée à l'origine » (à retrouver en base).
2. **Lectures graphiques** : image, antécédents, signe, variations, résolution graphique
   d'équations et d'inéquations (demande des figures : vérifier ce que le moteur de questions sait
   afficher avant de rédiger).
3. **Statistiques** : moyenne, médiane, écart type, fréquences conditionnelles.

Pour chaque lot : phase 0 (liste des modèles, validation par David), modèles JSON + specs,
`question:specs`, `create-questions.ts`, fiche par séries, vérification PDF, PR.
