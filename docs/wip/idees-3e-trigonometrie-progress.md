# Chantier `idees-3e-trigonometrie`

## Reprendre ici

_Mis à jour le 2026-11-25, PR de rangement ouverte (branche `feat/idees-3e-trigonometrie-rangement`)._

- **État** : migration de contenu des publiés (#3139) en prod (`db:migrate --include-all` joué
  par David). N1-N4 créés en brouillon en prod par David ; ids commités. Migration de rangement
  `20261125113650_…_rangement_tags.sql` générée : test vert, rouge sans elle (4 échecs).
  · **Prochaine action** : merger la PR de rangement (CI verte), `db:migrate` après
  `migration list --linked`, puis relecture de N1-N4 dans `/dev/modeles` (`?point=3-061`) et des
  variations F1-F2 (série de relecture), lire les verdicts, `publier-lot.ts` en simulation.
  · **En attente de David** : rien. · **Pièges en cours** : `e` interdit comme variable (Euler) ;
  réponses de specs ≥ 4 chiffres avec `\,` ; `create-questions` vise la PROD sans
  `set -a; . ./.env.local; set +a` ; une case choix ne porte pas d'erreurs prévues.
  · **Worktree / branche** : `ubumaths-wt-idees-3e-trigonometrie-rangement` /
  `feat/idees-3e-trigonometrie-rangement`.

## Phase 0 (2026-11-25)

Rubrique « Trigonométrie » de 3e, 13 exercices. Nos modèles : dbd5debf « Écrire cos, sin ou tan
d'un angle » (QCM, point 3-023) et 57c73be1 « Calculer une longueur ou un angle » (point 3-061),
rangés sur la notion « Trigonométrie du triangle rectangle ». Ses sous-notions « calcul de
longueurs » et « calcul d'angles » sont vides.

Bornes (3-023, 3-061) : angle aigu d'un triangle rectangle ; cosinus, sinus, tangente ; angles en
degrés, calculatrice pour les valeurs. Toutes les idées ci-dessous sont dans ces bornes. Aucun
hors programme.

Question d'accès de la migration : **personne** ne gagne de lecture (on range et on tague des
modèles de questions).

Chaque fiche : chez eux → chez nous, ma recommandation, point (un seul), variations, plages, forme
de réponse, erreurs prévues. Chaque variation aura son coup de pouce (sans la réponse) et ses
`testSpecs`.

### F1 — Les cas qui manquent au calcul de longueur et d'angle (variations de 57c73be1, 3-061)

- Chez eux (3G30, 3G31) : les 6 cas de longueur, la longueur cherchée au numérateur (× cos, sin,
  tan) ou au dénominateur (÷) ; l'angle avec des côtés décimaux, ou avec les trois côtés donnés
  (l'élève choisit le rapport). Chez nous : v1 hyp × cos, v2 opp ÷ sin, v3 adj × tan, v4 angle
  (côtés entiers, deux côtés donnés).
- **Recommandation** : 5 variations ajoutées à la fin, même figure, saisie au dixième (longueur)
  ou au degré (angle) :
  - v5 côté opposé = hyp × sin ;
  - v6 hypoténuse = adj ÷ cos ;
  - v7 côté adjacent = opp ÷ tan ;
  - v8 angle, côtés décimaux au dixième (de 4,0 à 15,0 cm) ;
  - v9 angle, les trois côtés donnés (le troisième vient de Pythagore, arrondi au dixième),
    l'élève choisit cos, sin ou tan.
- Plages : angle de 20 à 70°, côté donné de 3 à 15 (Q2 pour l'unité), réponse arrondie au dixième.
- Erreurs prévues : × au lieu de ÷ (v6, v7 : adj × cos), mauvais rapport (sin au lieu de cos),
  calculatrice en radians (valeur négative ou absurde, message « Règle ta calculatrice en degrés »),
  pour v8-v9 : rapport renversé (arccos de hyp/adj impossible, ou tan⁻¹ de adj/opp = l'autre angle,
  90° − l'angle).

### F2 — Écrire le rapport soi-même, et le même rapport de deux façons (variations de dbd5debf, 3-023)

- Chez eux (3G30-1) : l'élève **écrit** cos, sin, tan d'un angle (deux cases : numérateur,
  dénominateur) ; jusqu'à 6 rapports (les deux angles aigus) ; deux triangles imbriqués par la
  hauteur [AH] : cos B = AB/BC = HB/AB. Chez nous : dbd5debf ne propose qu'un QCM.
- **Chez nous, mieux que leurs deux cases** : une seule case où l'élève tape le quotient
  `\frac{AB}{BC}`. Deux majuscules collées se lisent comme une longueur et `BA` vaut `AB` : le juge
  ordinaire suffit, sans étiquettes.
- **Recommandation** : 2 variations ajoutées à la fin :
  - v5 saisie libre : « Écris cos B (ou sin, tan ; angle B ou C) avec les longueurs du
    triangle » ;
  - v6 triangles imbriqués : triangle ABC rectangle en A, H pied de la hauteur issue de A ;
    « écris cos B de deux façons » (deux cases, ordre libre : AB/BC et HB/AB), et de même pour sin
    et tan.
- Erreurs prévues : rapport renversé (BC/AB), côté opposé pris pour l'adjacent, et pour v6 la même
  écriture deux fois, ou l'hypoténuse du grand triangle utilisée dans le petit (HB/BC).

### N1 — Quel calcul donne la longueur ? (modèle neuf, 3-061, sous-notion « calcul de longueurs »)

- Chez eux (3G30, version papier) : QCM « Quel calcul effectuer pour calculer AB ? », 6 choix (BC ×
  cos 40°, BC × sin 40°, BC × tan 40°, BC ÷ cos 40°, BC ÷ sin 40°, BC ÷ tan 40°).
- **Recommandation** : modèle neuf, **QCM gardé**, et la fiche dit pourquoi : le but est de choisir
  la méthode sans calculer. Une saisie du calcul (`12\cos(40)`) serait jugée sur sa valeur et
  accepterait 9,2 tapé directement. 2 variations : longueur cherchée au numérateur (réponse en ×),
  au dénominateur (réponse en ÷). Fonction tirée parmi cos, sin, tan ; 6 choix mélangés.
- Erreurs prévues : ce sont les 5 autres choix, chacun avec son message (« La longueur cherchée est
  l'hypoténuse : elle est au dénominateur, on divise »).

### N2 — Résoudre une équation trigonométrique (modèle neuf, 3-061, sur la notion)

- Chez eux (3G30-2) : sans figure, cos(40°) = AC / 4,2 ; cos(40°) = 4,2 / AC ; cos B = 4,2 / 7,5.
  Longueurs décimales de 3,0 à 9,0, angle de 25 à 75°. Chez nous : rien (57c73be1 part toujours
  d'une figure).
- **Recommandation** : modèle neuf, 3 variations (longueur au numérateur, longueur au
  dénominateur, angle), fonction tirée parmi cos, sin, tan. Saisie au dixième ou au degré. Pour
  l'angle : longueur du dénominateur plus grande que celle du numérateur (cos, sin).
- Erreurs prévues : × au lieu de ÷ (et l'inverse), calculatrice en radians, pour l'angle : cos au
  lieu de cos⁻¹ (la valeur du cosinus de 4,2/7,5 prise pour un angle).

### N3 — Deux triangles rectangles accolés : tous les angles (modèle neuf, 3-061, sous-notion « calcul d'angles »)

- Chez eux (3G31-1) : triangles CBA rectangle en B et CAD rectangle en A, côté [AC] commun. On
  donne BA, AD et un angle ; tous les angles de la figure, au degré.
- **Recommandation** : modèle neuf, 2 variations (angle connu en A ou en C). Trois cases au degré :
  le troisième angle de CBA (somme des angles), l'angle ACD (par AC puis tan), l'angle ADC. AC est
  gardé exact dans le calcul (pas d'arrondi intermédiaire), et le corrigé le dit. BA de 4 à 7, AD de
  0,7 à 1,2 fois AC (jamais isocèle), angle de 25 à 65°.
- Erreurs prévues : AC arrondi trop tôt (angle décalé d'un degré, message « Garde la valeur exacte
  de AC dans la calculatrice »), tan renversé (AC/AD), 90° oublié dans la somme des angles.

### N4 — Problèmes concrets de trigonométrie (modèle neuf, 3-061, sur la notion)

- Chez eux (3G32-0 à 3G32-5 et la rivière, 3G30DNB0) : rivière vue sous deux angles, parallèle
  terrestre, hauteur d'un objet vu sous un angle, falaise vue de deux points, montagne, triangle
  inscrit dans un autre, terrain en pente (brevet). Figures 3D, questions intermédiaires
  littérales.
- **Recommandation** : modèle neuf, 6 variations, une figure plane chacune, réponse en grandeur
  (`unit`) arrondie comme dans l'énoncé :
  - v1 rivière : CS = AB (tan β − tan α), deux cases (BC puis CS), au mètre ;
  - v2 parallèle terrestre : **coupe plane** de la Terre au lieu de leur sphère en perspective
    (cercle, axe des pôles, rayon OP, parallèle [HP]) ; deux cases (HP, puis la longueur du
    parallèle 2π × HP), au km ;
  - v3 hauteur d'un arbre ou d'un immeuble : œil à 1,50 à 1,90 m, distance de 10 à 80 m, angle
    d'élévation du sommet de 20 à 60° ; hauteur = œil + d × tan α ; deux cases (partie au-dessus de
    l'œil, hauteur totale), au dixième de mètre ;
  - v4 falaise vue de deux points : deux cases (distance au pied, puis hauteur), au mètre ;
  - v5 triangle rectangle inscrit dans un autre (3G32-5) : angle en A par cos⁻¹(AD/AE), puis AB =
    AC × cos Â ; deux cases (angle au dixième de degré, AB au millimètre) ;
  - v6 terrain en pente (l'idée trigo du sujet de brevet) : angle par le sinus, au dixième de degré,
    puis « Y a-t-il un surcoût ? » (choix oui / non, réponse décidée par le seuil de 8,5°).
- **Pas la montagne** (3G32-4) : six étapes et une formule en sin(β − α), la même idée que la
  falaise (deux visées) en plus long.
- **Pas de questions littérales** (« exprimer BC en fonction de AB et α ») : Q1.
- Erreurs prévues : par variation, la valeur sans l'œil (v3), tan β + tan α (v1), le rayon de la
  Terre pris pour HP (v2), l'arrondi intermédiaire (v4, v5).

### Décisions de David (2026-11-25)

« Je te suis » après le résumé des recommandations : **toutes les recommandations sont prises**.
F1, F2, N1 à N4 comme les fiches ; Q1 non (pas de questions littérales) ; Q2 oui (unités
variées dans v5-v7 de F1) ; Q3 oui (N1 sous « calcul de longueurs », N3 sous « calcul
d'angles », N2 et N4 sur la notion). Précisions annoncées dans le résumé et retenues :

- F1 v9 (trois côtés) : le troisième côté est arrondi, donc cos, sin et tan pourraient donner un
  degré d'écart ; on ne tire que des triangles où les trois calculs donnent le même degré (plus
  simple pour l'élève que d'accepter trois réponses).
- N4 v6 (terrain en pente) : angles tirés loin du seuil de 8,5°.
- N4 : pas la montagne.

## Historique

### 2026-11-25 — Brouillons en prod, migration de rangement

- Migrations en attente jouées par David (`db:migrate --include-all`, dont `20261125072915`).
- `create-questions --publier` lancé par David : N1 1e018c93, N2 4484919e, N3 ed662be1,
  N4 2fd12448 (brouillons). Ids portés de `main` vers la branche de rangement.
- `migration-rangement.ts` → `20261125113650_questions_idees_3e_trigonometrie_rangement_tags.sql`
  (N1 sous « calcul de longueurs », N3 sous « calcul d'angles », N2 et N4 sur la notion, tous
  3-061, Q3) + fixture. `migrations-rangement-tags` vert ; migration vidée : 4 échecs, tous sur
  elle ; fichier restauré depuis une copie. Accès : aucune policy ni grant ne change.

### 2026-11-25 — N1-N4 écrits, rendu vérifié, migration de contenu

- Script `docs/wip/questions/idees-3e-trigonometrie-neufs.py` → `scripts/questions/idees-3e-trigonometrie-neufs/` :
  N1 2 var. / 10 specs, N2 3 / 16, N3 2 / 8, N4 6 / 31. `question:specs` 300 tirages verts,
  `sonde-figures` 0 problème (neufs et publiés).
- Écarts aux fiches (dits en tête du script) : N1 sans erreurs prévues (une case choix n'en porte
  pas), les messages des mauvais choix vont dans le corrigé ; N4 réponses en nombre, unité après la
  case (comme 57c73be1) ; N4 « garde les valeurs exactes » dans chaque énoncé, l'arrondi trop tôt
  en erreur prévue (v1-v4), et en v5 seuls les tirages où l'angle arrondi donne le même AB ;
  fenêtres des figures réglées sur la hauteur tirée.
- Essai en base locale : 4 brouillons créés, ids locaux retirés. `db:a-jour` a joué la migration
  de contenu en local. Captures de `/dev/modeles` dépliées (admin fictif, Chromium) : toutes les
  figures de N1, N3, N4 et de F1-F2 justes, réponses attendues recalculées à la main sur chaque
  tirage affiché.
- Migration `20261125072915_questions_idees_3e_trigonometrie_publies_contenu.sql` (57c73be1 +5
  variations, dbd5debf +2) : `migrations-contenu-publie` vert (165), rouge avec la migration vidée
  (5 échecs, tous sur elle), fichier restauré depuis une copie.

### Questions

- **Q1** — Questions littérales des problèmes (« exprimer BC en fonction de AB et de α ») ?
  **Recommandation : non pour ce lot.** Les données chiffrées portent déjà le raisonnement, et
  taper `AB\tan(\alpha)` avec une lettre grecque au clavier MathLive est une difficulté d'outil, pas
  de trigonométrie. Si oui : une case littérale en tête de v1 et v4.
- **Q2** — Unités variées (m, dm, mm, comme chez eux) dans les variations neuves de F1 ?
  **Recommandation : oui**, tirée parmi cm, m, mm pour v5-v7 ; les problèmes N4 ont leur unité
  propre.
- **Q3** — Rangement : N1 sous « calcul de longueurs », N3 sous « calcul d'angles », N2 et N4 sur la
  notion (ils mêlent longueurs et angles), comme 57c73be1 et dbd5debf ? **Recommandation : oui.**
