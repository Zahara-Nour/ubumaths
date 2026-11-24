# Chantier `idees-3e-fonctions` — journal

Skill [`idees-rubrique`](../../.claude/skills/idees-rubrique/SKILL.md). Rubrique « généralités sur
les fonctions » de Troisième d'une autre plateforme (codes 3F1, 19 exercices). Relevé :
[idees-3e-fonctions-releve.md](idees-3e-fonctions-releve.md).

## Reprendre ici

_Mis à jour le 2026-11-24, PR ouverte (rendu vérifié à l'écran)._

- **État** : phase 0 validée (F1-F5, N1-N3 ; Q1 pas de quotient, Q2 outil n° 60 noté, Q3 F5 sur
  cb545bd7). Lot écrit, commité, rendu vérifié : 3 neufs (brouillons locaux 6f2a8a4b N1,
  502ab371 N2, 03cce164 N3), +11 variations sur d820232a, 6ad254b4, cb545bd7, migration de
  contenu `20261124123959_…` + fixture ; test d'intégration vert. Les 3 modèles publiés sont
  réservés dans le tableau de répartition.
- **Prochaine action** : CI de la PR → `pnpm pr:merger <n>` ; puis `db:migrate` (contenu) selon
  les 4 conditions, et relecture des brouillons dans `/dev/modeles` (§ 5 de la skill).
- **En attente de David** : après le merge, `create-questions --publier` des 3 brouillons en prod ;
  description de d820232a à compléter (tableau mélangé, ∅, cubique) ?
- **Pièges en cours** : sur téléphone, le tableau à 4 cases de N3 défile en largeur
  (`TableNode`, `overflow-x-auto`, comportement commun) ; le port 51839 n'est pas à moi.
- **Worktree / branche** : `../ubumaths-wt-idees-3e-fonctions`, `docs/idees-3e-fonctions`

## Phase 0 (2026-11-24, en attente de David)

Page à cocher : https://claude.ai/artifact/JMLSjCdiNpUrVoVPyLrJzK (Oui / Non / Autrement + note,
collection `verdicts`).

Verdicts : relevé, § Verdicts (2 retirés, 12 🟡, 5 ❌). Une fiche par idée, avec ma
recommandation. Un seul point par modèle (ADR 0020) ; une variation ajoutée à un modèle publié
garde son point et son nœud. Chaque variation aura ses `testSpecs`, trois erreurs prévues par case
et son coup de pouce. Question d'accès de la migration de rangement : personne ne gagne d'accès,
on range des modèles de questions.

### Variations de modèles publiés

- **F1. d820232a « Image et antécédent » (3-040)** · 3F10, 3F14DNB-1. Chez eux : tableau de cinq
  colonnes mélangées, six lectures, antécédents en liste « ; ». Chez nous, trois variations, case
  numérique ou ensemble (`intervalles`, comme la v4) : (v6) tableau quelconque (valeurs de −20 à
  20, pas affine), « Détermine le ou les antécédents de d » avec **deux** antécédents ; (v7) même
  tableau, un nombre absent de la ligne f(x) : réponse ∅ (aucun antécédent dans le tableau) ; (v8)
  tableau à deux lignes f(x) et g(x) : « Pour quel nombre f et g ont-elles la même image ? ».
  Tournure « Quel nombre a pour image … ? » dans la v6. Erreurs prévues : image donnée à la place
  de l'antécédent, un seul des deux antécédents, la valeur commune au lieu du nombre (v8).
- **F2. 6ad254b4 « Formule, tableau de valeurs, courbe » (3-039)** · 3F12-3. Chez eux : tableau de
  trois cases. Chez nous, deux variations, tableau markdown à trois cases (x = −3, 0, 3 ou −2, 0, 2) :
  (v5) f(x) = ax² + bx + c, a de ±1 à ±3, b de ±1 à ±5, c de ±1 à ±9 ; (v6) f(x) = (x + a)(x + b),
  a, b de ±1 à ±6. Erreurs prévues : (−3)² = −9, signe de b × x avec x négatif, ax² calculé
  (ax)².
- **F3. 6ad254b4 (3-039)** · 3F12-4, 3F10-4. Chez eux : 2 ou 3 images sur une courbe, ou 1 à 5 à
  0,1 près. Chez nous, une variation (v7) : courbe tracée (` ```courbe `, quadrillage d'unité 1),
  droite, parabole ou cubique passant par des nœuds, tableau de trois cases à compléter par
  lecture. Lecture aux nœuds seulement (pas de 0,1 : leur point mobile n'existe pas chez nous, et
  la lecture fine n'est pas au programme). Erreurs prévues : abscisse et ordonnée inversées,
  lecture décalée d'un carreau.
- **F4. d820232a (3-040)** · 3F13, 3F13-1, 3F13-2. Trois variations, case ensemble : (v9) parabole,
  k = ordonnée du sommet, un seul antécédent ; (v10) cubique, « Résous graphiquement f(x) = k »,
  trois solutions ; (v11) k hors de la courbe, réponse ∅. Erreurs prévues : un antécédent oublié,
  l'image donnée au lieu des antécédents, {x₀ ; x₀} doublé (v9).
- **F5. cb545bd7 « Produire une formule » (4-062)** · 3F14-1. Idée de 3e qui relève d'un point de
  4e (la mise en formule ; en 3e, la fonction affine est la rubrique 3F2, libre). Deux variations,
  expression jugée par équivalence : (v6) grandeur qui diminue (abonnés : N(t) = 8 000 − 50t) ;
  (v7) coefficients décimaux (facture d'eau : abonnement 52,40 € et 3,15 € le m³). Erreurs
  prévues : a et b inversés, signe de la diminution, abonnement multiplié.

### Modèles neufs (3e)

- **N1. « Traduire f(a) = b avec image et antécédent »** · 3-040 · 3F10-1, 3F10-3, 3F1QCM-3. Chez
  eux : QCM à plusieurs réponses. Chez nous aussi : ce sont des phrases, la saisie ne fait pas
  mieux (` ```choix `, `plusieurs: oui`, quatre propositions dont deux vraies). Quatre
  variations : (v0) « f(3) = −5 » → phrases vraies (−5 est l'image de 3, 3 est un antécédent de
  −5) ; (v1) phrase « 4 a pour image 7 par g » → égalité g(4) = 7 parmi g(7) = 4… ; (v2)
  f(2) = f(−6) = 1 → « 1 a deux antécédents » ; (v3) f(x) = ax² + b (a, b de ±2 à ±5), vrai ou
  faux sur f(0) = b, f(b) = 0, image de −b. Nom de fonction tiré (f, g, h). Distracteurs : x et y
  inversés. Coup de pouce : « L'image s'écrit à droite du signe = : f(antécédent) = image. »
- **N2. « Calculer une image ou un antécédent avec une formule »** · 3-040 · 3F10-2, 3F10-5,
  3F10-6, 3F12-2. Chez eux : un champ, fractions jugées par égalité. Chez nous, case numérique,
  cinq variations : (v0) image par ax² + bx + c, x de −4 à 4 ; (v1) image par (ax + b)(cx + d) ;
  (v2) image par −x² + c, x négatif (le piège −x² ≠ (−x)²) ; (v3) antécédent de k par f(x) = ax
  (k multiple de a) ; (v4) antécédent de k par f(x) = ax + b, solution entière. Erreurs prévues :
  (−3)² = −9, −x² pris pour (−x)², image calculée à la place de l'antécédent (v3, v4). Coup de
  pouce : « L'antécédent est le nombre x tel que f(x) = k : écris l'équation. »
- **N3. « Calculer des images puis placer les points de la courbe »** · 3-039 · 3F10-7. Chez eux :
  l'élève trace une ligne brisée. Chez nous : un tableau de quatre cases (x donnés), puis
  ` ```courbe ` avec `placer:` des quatre points. Trois variations : ax + b, ax² (a de ±1 à ±2),
  (x + a)(x + b). Erreurs prévues : signe d'une image, point placé en (y ; x). Le tracé de la
  courbe elle-même : outil (Q2).

### Questions à David

Réponse de David (2026-11-24) : « je valide les modèles » — fiches F1 à F5 et N1 à N3 validées
telles qu'écrites (page à cocher non remplie). Q3 tranchée par là (F5 sur cb545bd7). Q1 et Q2
reposées, puis « je suis tes recos » : Q1 pas de quotient dans N2 ; Q2 outil n° 60 noté dans
`outils-manquants.md` (commit sur `main`).

1. **Quotients** (3F10-2, 3F10-6, 3F12-2 : image par (ax + b)/(cx + d), réponse en fraction) :
   « expression littérale simple » des bornes de 3-040 ? Je recommande **non** (pas de variation).
2. **Tracer une courbe point par point** (ligne brisée jugée, 3F10-7) : l'ajouter à
   `outils-manquants.md` ? Je recommande **oui**, sans modèle dans ce lot (N3 se contente de
   placer les points).
3. **F5 sur un modèle de 4e** : la mise en formule relève de 4-062 ; je recommande de compléter
   cb545bd7 plutôt qu'un modèle de 3e (pas de point de 3e pour « produire une formule »).

## Historique

### 2026-11-24 — rendu vérifié à l'écran

- Serveur du worktree sur 5176, `db:a-jour` (migration de contenu jouée en local), captures de
  `/dev/modeles` dépliées (WebKit, admin fictif), 0 erreur de page. Toutes les variations neuves
  lues, réponses attendues recalculées à la main : justes.
- N1 : les bonnes cases changent de place d'une variation à l'autre (mélange effectif). N3 : repère
  sous le tableau, échelle qui couvre les 4 images, boutons A-D. 6ad254b4 v7 : f(−3) = 1, f(0) = −2,
  f(1) = 1 lus sur la courbe agrandie. d820232a v7 et v11 : ∅ attendu, juste.
- Téléphone (390 px) : le tableau de N3 (5 colonnes) défile en largeur, comme tout tableau
  Markdown de `TableNode`. Pas corrigé ici (composant commun).

### 2026-11-24 — lot écrit

- Écrit par deux agents (`pedagogy-expert`), relu par moi : simulation `create-questions` verte
  (3 neufs à créer), variations et specs d'origine des 3 publiés identiques à l'export (script de
  comparaison). Scripts : `docs/wip/questions/idees-3e-fonctions-{neufs,publies}.py`.
- **Neufs** : N1 4 var. / 14 specs (choix `plusieurs: oui`, une seule bonne case = ½) ; N2 5 / 25
  (sans quotient) ; N3 3 / 14 (tableau de 4 cases puis ` ```courbe ` `placer:` de 4 points : premier
  modèle qui mêle les deux, numérotation vérifiée dans `assign-blank-indices.ts`). Essai en base
  locale : 3 brouillons créés, ids locaux retirés.
- **Publiés** : d820232a +6 var. (39 specs), 6ad254b4 +3 (30), cb545bd7 +2 (25) ; `question:specs`
  300 tirages verts, `sonde-courbes` 0 problème. Migration de contenu
  `20261124123959_questions_idees_3e_fonctions_publies_contenu.sql` + fixture.
- Écarts aux fiches : N1 nom de fonction tiré par `t = 0..2` (une variable « f|g|h » est lue comme
  inconnue) ; N2 plages resserrées (v1 a, c de ±2 à ±3, x de ±1 à ±3 ; v2 x ≠ −2) ; N2 v1, v2 et
  plusieurs cases de F2 n'ont que deux erreurs prévues (pas de troisième vraie) ; N3 abscisses
  fixées (−2, −1, 1, 2) ; F4 v9 : {x₀ ; x₀} est jugé juste (même ensemble), spec retirée ; F5 v7
  abonnement en …5 centimes (jamais « 52,4 € »). N2 v3-v4 (antécédent par le calcul) dépassent la
  borne « accompagnement » de 3-040 : validés par la fiche.
- Reste à voir à l'écran : N3 (repère sous un tableau à cases), N1 (mélange des phrases), courbes
  et tableaux de F2-F4. Description de d820232a à compléter (tableau mélangé, ∅, cubique) ?

### 2026-11-24 — rubrique prise

Ligne 3F1 du tableau de répartition passée à « prise » (commit direct sur `main`). Nos modèles
voisins relevés en prod : 3e 6ad254b4 (3-039), d820232a (3-040), 7407f328 (3-046), 81dda1bd
(3-064), 15ddcc75 et 7c07749c (3-066) ; 4e cb545bd7, 46ca97e7, e678f1d0, 15dd2a0f ; 5e 87e396e4,
5e4f9ecf, 6f3c6c5f ; 2de cc88ebd3, 17809937, 42c19a19, bcfbf5f8. Aucun n'est réservé.
