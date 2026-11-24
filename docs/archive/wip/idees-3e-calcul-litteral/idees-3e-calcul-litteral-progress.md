# Chantier `idees-3e-calcul-litteral` — journal

Idées reprises d'ailleurs, rubrique « Calcul littéral, équations » de Troisième (code 3L1,
47 exercices hors anciennes versions), selon le skill `idees-rubrique`. Relevé :
[idees-3e-calcul-litteral-releve.md](idees-3e-calcul-litteral-releve.md).

## Reprendre ici

_Mis à jour le 2026-11-24, chantier clos._

- **État** : rubrique publiée : 5 modèles neufs publiés par David (N1, N2, N4, N5, N6), 12 publiés
  complétés de 24 variations, le tout validé par David ; journal archivé · **Prochaine action** :
  aucune · **En attente de David** : rien · **Pièges en cours** : N3 (62528060, « Développer avec un
  tableau ») reste en brouillon jusqu'à l'outil n° 57 de `outils-manquants.md` ; à publier quand il
  sera fait · **Worktree / branche** : aucun.

## Phase 0 (2026-11-23, validée par David le jour même)

Page à cocher : https://claude.ai/artifact/EvCcEkmmjkvZ1qaupra5x6 (Oui / Non / Autrement + note,
collection `verdicts`).

Verdicts : relevé, § Verdicts (9 ✅, 23 🟡, 9 ❌). Une fiche par idée, avec ma recommandation.
« Chez eux → chez nous » : la forme que notre format permet. Un seul point par modèle (ADR 0020) ;
une variation ajoutée à un modèle publié garde son point et son nœud. Chaque variation aura ses
`testSpecs`, trois erreurs prévues par case et son coup de pouce. Réponses jugées par nos règles
(forme réduite, forme factorisée par `requiredForm`), jamais par comparaison de texte. Question
d'accès de la migration de rangement : personne ne gagne d'accès, on range des modèles de questions.

### Variations de modèles publiés

- **F1. c32ebff9 « Enlever les parenthèses » (3-011)** · 3L10, 3L10-1, 3L10-2, 3L11-13. Chez eux :
  supprimer les parenthèses puis réduire, une ou deux parenthèses, degré 1 ou 2. Chez nous, trois
  variations, consigne « Supprime les parenthèses, puis réduis » : (v2) k ± (ax + b) et kx ± (ax + b) ;
  (v3) (ax + b) − (cx + d) et −(ax + b) + (cx + d) ; (v4) (ax² + bx + c) − (dx² + ex + f). Entiers
  de −9 à 9 non nuls. Case : forme réduite exigée. Erreurs prévues : signe du second terme non
  changé (−(cx + d) → −cx + d), parenthèses ôtées sans réduire, x² et x additionnés.
- **F2. 54107079 « Développer » (4-022)** · 3L11, 3L11-0, 3L11-17. Deux variations : (v16)
  kx(ax + b) avec k de 2 à 9 signé (résultat en x²) ; (v17) k(ax + b) + c et c − k(ax + b). Le
  tableau de simple distributivité de 3L11-17 : rien (le tableau de N3 suffit, en 3e). Case : forme
  réduite. Erreurs prévues : k × b oublié, kx × ax = kax (sans carré), signe de c − k(…).
- **F3. 93a5f7a9 « Réduire un produit » (3-012)** · 3L11-2, 3L11-12. Deux variations : (v18)
  ax × bx et ax² × bx (une lettre) ; (v19) produit de deux monômes à deux lettres, exemple du BO
  (a²b) × (bc), coefficients de −9 à 9. Case : forme réduite. Erreurs prévues : x × x = 2x,
  coefficients additionnés au lieu de multipliés, signe du produit.
- **F4. 77b82211 « Réduire une somme » (sans point)** · 3L11-2, 3L11-11. Deux variations : (v3)
  somme de termes en x² et en x et de constantes (5 à 6 termes) ; (v4) une somme **déjà réduite**
  (3x + 5x²), la réponse est elle-même. Le modèle reste sans point (décision du chantier
  `questions-3`). Erreurs prévues : x² et x additionnés (8x³ ou 8x²), constante oubliée.
- **F5. dcaabf69 « Factoriser avec un facteur commun » (3-054)** · 3L11-6. Deux variations :
  (v5) c(ax + b) ± x(ax + b), la forme d'entrée ; (v6) (ax + b)(cx + d) − (ex + f)(ax + b), facteur
  commun en second et signe moins. Case : forme factorisée (`requiredForm` produit). Erreurs
  prévues : −(ex + f) non changé en −ex − f, développement au lieu de factoriser.
- **F6. 18e2afca « Développer (a + b)² et (a − b)² » (3-016)** · 3L11-7. Une variation : (v5)
  (b − ax)² et (b + ax)², a de 2 à 5, b de 1 à 9. Erreurs prévues : double produit oublié, b² − a²x²,
  signe du double produit.
- **F7. ff9bb2fb « Factoriser a² − b² » (3-058)** · 3L12-2, 3L12-4. Une variation : (v2)
  k·x² − k·a² (2x² − 18, 3x² − 75), k de 2 à 5, consigne « Factorise le plus possible ». Case :
  produit de trois facteurs (`requiredForm`). Erreurs prévues : 2(x² − 9) non fini, (2x − 18)(…),
  (x − 3)(x + 3) sans le 2.
- **F8. c81c5852 « Équation linéaire du premier degré » (4-024)** · 3L13. Deux variations : (v2)
  x/a = b ; (v3) ax/b = c, solutions fractionnaires possibles (fraction irréductible acceptée,
  décimale si exacte). Le « solveur » ligne par ligne : outil (question 3). Erreurs prévues :
  x = b/a au lieu de ab, x = c·a/b inversé.
- **F9. 779ee55a « Équation linéaire du premier degré » (4-025)** · 3L13-1. Deux variations :
  (v1) k(ax + b) = cx + d ; (v2) k − (ax + b) = cx + d. En 4e, la distributivité simple est
  connue : dans les bornes. Erreurs prévues : k × b oublié, signe de −(ax + b).
- **F10. 44a3062b « Calculer une quatrième proportionnelle » (4-055)** · 3L13-2. Une variation :
  (v4) « Trouve x : x/4 = 3/5 » (et 4/x = 5/3), entiers ou décimaux simples. Erreurs prévues :
  produit en croix inversé, a × b × c.
- **F11. 2ab49a6f « Résoudre une équation produit nul » (3-015)** · 3L15, 3L14DNB-0, 3L14DNB-2.
  Quatre variations : (v5) ax² + bx = 0 ; (v6) a²x² − b² = 0 ; (v7) (ax + b)² = 0, une seule
  solution ; (v8) un programme de calcul donne (x + a)(x − b) : « Quels nombres de départ donnent
  0 ? ». Case : ensemble des solutions (`intervalles`, comme les variations publiées). Erreurs
  prévues : la solution x = 0 oubliée, une seule solution de a²x² = b², {−b/a ; −b/a} doublée.
- **F12. 3806ee3d « Résoudre x² = a » (3-008)** · 3L15-1, 3L15-2. Deux variations : (v3)
  x² = p²/q² (49/9), q ≤ 10 ; (v4) kx² + c = 0, k de 1 à 3, solutions entières, fractionnaires, en
  √ ou aucune (∅). Erreurs prévues : la solution négative oubliée, √ du numérateur seul, une
  solution quand il n'y en a pas.

### Modèles neufs (3e)

- **N1. « Développer et réduire une expression »** · 3-013 · 3L11-3, 3L11-3b (3L11-14 en
  question 1). Chez eux : une case par expression, étapes possibles. Chez nous, une case, forme
  réduite exigée, quatre variations (cx + e(ax + b) relève de la 4e, proche de F2) : (v0)
  e ± (ax + b)(cx + d) ; (v1) k(ax + b)(cx + d), k ∈ {±2, ±3} ; (v2) k(ax + b) − (cx + d)(ex + f) ;
  (v3) (ax + b)(cx + d) − (ex + f)(gx + h). Entiers de −9 à 9 non nuls. Erreurs prévues : le moins
  devant le produit appliqué au seul premier terme, terme en x oublié, k appliqué aux deux
  parenthèses. Coup de pouce : « Développe d'abord le produit entre parenthèses. »
- **N2. « Calculer astucieusement avec une identité remarquable »** · 3-016 (question 2) · 3L11-5.
  Chez eux : réponse numérique, correction avec les deux méthodes. Chez nous, trois variations,
  case numérique : (v0) 103² ou 1 003² ((a·10ⁿ + b)², b de 1 à 4) ; (v1) 98² ((a·10ⁿ − b)²) ;
  (v2) 302 × 298 ((a·10ⁿ + b)(a·10ⁿ − b), b de 1 à 9). Corrigé : l'identité écrite. Erreurs prévues :
  10 009 pour 103² (double produit oublié), 9 596 pour 98² (b² soustrait), 90 004 pour 302 × 298.
- **N3. « Développer avec un tableau »** · 3-013 · 3L11-10. Chez eux : tableau 2 × 2, puis
  développement, puis réduction. Chez nous : un tableau à trous (` ```tableau ` avec cases) : en
  ligne ax et b, en colonne cx et d ; quatre cases produits, puis une case « forme réduite ». Deux
  variations : (x + b)(x + d) ; (ax ± b)(cx ± d), a, b, c, d de 2 à 9. Erreurs prévues par case :
  ax × cx = acx (sans carré), signe d'un produit.
- **N4. « Factoriser a² + 2ab + b² et a² − 2ab + b² »** · 3-058 · 3L11-16. Le BO de 3e cite les
  trois identités pour factoriser (bornes de 3-058) ; seul d1648508 (2de) le fait. Quatre
  variations : (v0) x² + 2ax + a² ; (v1) x² − 2ax + a² ; (v2) b²x² ± 2abx + a², a, b de 1 à 9 ;
  (v3) identité à trous « x² + … + 9 = (…)² » (deux cases : le terme du milieu, puis la forme
  factorisée). Case : forme factorisée (`requiredForm`). Erreurs prévues : (x + a)(x − a),
  (x + 2a)², (x² + a)².
- **N5. « Résoudre un problème par une équation »** · 4-071, niveaux 4 et 3 · 3L13-3, 3L13-4,
  3L13-6. 5e2db3d1 fait choisir l'équation ; ici on va **jusqu'au nombre**. Une case numérique,
  avec unité s'il y a lieu. Six variations, contextes à nous : âges (« Dans k ans, le père aura
  le double de l'âge de son fils »), trois entiers consécutifs de somme S, paniers à 2 et à 3
  points (total des paniers et des points), parking (deux-roues et quatre-roues), triangle isocèle
  de périmètre P (base = côté + d), rectangle aux côtés en x (côtés opposés égaux, puis aire).
  Solutions entières. Coup de pouce : « Appelle x … et écris ce que dit l'énoncé avec x. »
- **N6. « Programmes de calcul équivalents »** · 3-016 · 3L13-5, 3L14DNB-1. Chez eux : tester
  avec deux nombres, puis exprimer chaque programme en x. Chez nous, une question, trois cases :
  le résultat du programme A pour x (forme réduite), celui du B, puis « Les deux programmes
  donnent-ils toujours le même résultat ? » (Oui / Non). Trois variations, une identité par
  variation : (x + a)² − x² et 2ax + a² ; (x + a)(x − a) + a² et x² ; (x + a)² − a² et x(x + 2a).
  Le choix Oui / Non vient après les deux expressions : il se déduit, il ne se devine pas.

### Questions à David

Réponse de David (2026-11-23) : « je suis tes recos », à la liste des recommandations (toutes les
fiches, et Q1 à Q4). Donc : Q1 pas de deux lettres ; Q2 N2 sur 3-016 ; Q3 outils n° 55 et 56 notés
(commit sur `main`) ; Q4 motifs notés dans « Idées en attente ». Les 12 modèles publiés sont réservés
dans le tableau de répartition ; exports de prod dans `scripts/questions/idees-3e-calcul-litteral-publies/`.

1. **N1, deux lettres** : ajouter (v4) (2x + 3y)(x − y) (3L11-14, 3L11-15) ? Le BO de 3e n'en
   parle pas ; je recommande **non**.
2. **N2, le point** : 103² par (100 + 3)², c'est « développer avec les identités remarquables »
   appliqué à un nombre. Je recommande **3-016** ; sinon, sans point.
3. **Deux outils** à ajouter à `outils-manquants.md` (n° 55 et 56) : la **résolution ligne par
   ligne** (l'élève écrit les équations successives, chaque ligne est jugée équivalente à la
   précédente ; 3L13, 3L13-1, 3L13-2) et la **grille à contraintes** (Yohaku : plusieurs
   remplissages justes, la grille est jugée par ses produits ; même famille que le n° 53). Je
   recommande de les ajouter, sans modèle dans ce lot.
4. **Motifs itératifs** (3L13-7, 3L16 : nombre de formes du motif n, ratio) : idée de 4e-5e. Je
   recommande de les mettre dans « Idées en attente » du tableau de répartition.

## Historique

### 2026-11-24 — relecture, publication, clôture

- David valide tout (« je valide tout ») : les 6 neufs et les 24 variations des 12 publiés ; aucun
  verdict « À revoir » en base.
- Séries de relecture enregistrées en prod par David (3e : 8 modèles, 9b3b0f74 ; 4e : 4 modèles,
  8bd8112d ; une série n'accepte que son niveau), fichiers et ids mergés dans #3080.
- `publier-lot.ts` sur une copie du dossier des neufs sans N3 (le script publie tout le dossier) :
  simulation verte, David publie ; vérifié en prod : 8c291e87, ea76da91, eef988e6, bf8a9d2d,
  bfbd40fc publiés, 62528060 en brouillon.
- Tableau de répartition : rubrique « publiée », 12 réservations levées.

### 2026-11-24 — #3062 mergée, migrations en prod

- `security-auditor` : aucun finding bloquant (deux faibles : `lock_timeout` hors bloc, sans effet ;
  la migration de contenu saute en silence un modèle absent, à durcir dans le générateur).
- #3062 mergée par `pr:merger` ; `migration list --linked` : seules nos 2 migrations en attente ;
  `db:migrate` fait ; vérifié en prod (nœuds, points, nombres de variations).

### 2026-11-24 — brouillons en prod, migrations générées

- David valide mes recommandations : N6 garde ses programmes non équivalents une fois sur deux ;
  N3 reste en brouillon jusqu'au correctif du tableau à cases (outil n° 57, commit sur `main`) ;
  le corrigé de dcaabf69 v1 est corrigé dans la même migration (termes écrits à part, signe forcé :
  `{{eval:-(d)*x;+}}{{eval:-(f);+}}` ; 60 tirages relus, plus aucun nombre soudé).
- David a lancé `create-questions --publier` : 6 brouillons en prod (vérifié en lecture seule).
- Sous-notions : N1, N3 « Algèbre > Calcul littéral > développement » (3-013) ; N2, N6 (3-016) et
  N4 (3-058) « … > identités remarquables » ; N5 « Algèbre > Équations : premier degré > ax + b =
  cx + d » (4-071), comme 5e2db3d1 : le nœud « mettre en équation » existe, mais 4-071 pend à
  « ax + b = cx + d », et le tag doit être sur le nœud du modèle ou sa notion.
- Question d'accès : personne ne gagne d'accès (rangement et contenu de modèles de questions).
- Tests d'intégration rangement + contenu : 137 verts ; sans nos deux migrations, 12 rouges.

### 2026-11-23 — lot écrit

- Écrit par deux agents (`pedagogy-expert`), relu par moi : simulation verte (neufs 128 specs, publiés
  12 fichiers sans refus), variations publiées d'origine intactes (comparées au commit d'export),
  tirages lus (N1, N6, F1, F11, F12). Scripts : `docs/wip/questions/idees-3e-calcul-litteral-{neufs,publies}.py`.
- Écarts aux fiches : F12 v4, le cas fractionnaire prend k = 4 ou 9 (avec k de 1 à 3, jamais de
  fraction) ; F1, F2, F5, F7 sans `requiredForm` (la forme stricte par défaut refuse déjà le non
  réduit) ; « 2(x² − 9) », « développé » : specs `bad_form`, pas erreurs prévues (même valeur) ;
  moins de trois erreurs prévues là où il n'y en a pas de vraies (F1 v3, F5, F7, F8, F10, N3) ;
  F11, F12 (`intervalles`) sans erreurs prévues. N1 : coefficients de x de −5 à 5. N4 : a de 2 à 9,
  pgcd(a, b) = 1 en v2, signe du terme du milieu donné dans la variation à trous. **N6 : une fois sur
  deux, un programme est changé pour ne PAS être équivalent** (sinon « Oui » toujours juste) : écart
  de l'agent, à valider par David.
- Base locale : 6 neufs créés (ids locaux retirés des fichiers ensuite), aperçu admin sans erreur de
  console ; N3 : le tableau 2 × 2 à cases est plus large qu'un iPhone (seconde colonne coupée).
- Défaut de prod relevé, non corrigé : corrigé de dcaabf69 v1, `{{eval:(b)*x+(c)}}{{eval:-(d)*x-(f)}}`
  peut souder deux nombres.
- Migration de contenu générée (+24 variations, 0 corrigée), `migrations-contenu-publie.test.ts` vert.

### 2026-11-23 — rubrique prise

- Rubrique 3L1 choisie par David, ligne « prise » poussée sur `main`. Le tableau annonçait 55
  exercices : 47 hors `-old`, `Old`, `JSOld`.
- Relevé du code confié à quatre agents (Sonnet, 11 à 12 exercices chacun) ; nos modèles relevés en
  prod (lecture seule).
- BO 3e (`transcriptions/cycle-4/3-nombres.md`, l. 70-104) : automatismes (équations ax = c,
  x + b = c, ax + b = c ; simplifier ; valeur d'une expression ; somme ou produit ; développer et
  factoriser simple ; pair / impair ; opposé) ; objectifs : double distributivité, ax ⩾ b, produit
  nul, trois identités remarquables, analyse-synthèse.
- Points de 3e et modèles tagués en prod : 3-011 opposé (843c3186, aeb86af9, c32ebff9) · 3-012
  réduire un produit (93a5f7a9, 18 var.) · 3-013 double distributivité (1703620c, 9fefb94c) · 3-054
  facteur commun apparent (dcaabf69, 5 var.) · 3-014 ax ⩾ b (24aff7b0, 06601c87) · 3-015 produit nul
  (2ab49a6f, 5 var.) · 3-016 développer IR (18e2afca, 32cf5766, a6a6c491) · 3-058 factoriser a² − b²
  (ff9bb2fb, ff8082bd) · 3-008 x² = a (3806ee3d) · **3-017 analyse-synthèse : 0 modèle**. Sans
  point : 77b82211 « Réduire une somme » (3e). Aucun modèle de 3e pour factoriser a² ± 2ab + b²
  (seulement d1648508, 2de).
- Voisins de 4e : équations 4-024 (12 modèles, dont dcf060e6), 4-025 ax + b = cx + d (779ee55a,
  8c173562), mise en équation 4-071 (5e2db3d1), développer 4-022 (54107079, 32a81f6f), factoriser
  4-070 (2120ce5f, dac2e771, d7f2568a, 11607586), programme de calcul 4-081 (15dd2a0f), pair /
  impair 4-021 (9a06de2e). 5e : tester une égalité 5-036 (13d31ece, 8263693b), réduire 5-039.
