# Chantier `idees-6e-entiers-decimaux` : idées reprises d'ailleurs, rubrique « Nombres entiers et décimaux » de 6e

Skill [`idees-rubrique`](../../.claude/skills/idees-rubrique/SKILL.md). Tableau :
[idees-ailleurs-repartition.md](idees-ailleurs-repartition.md) (section Sixième, ligne 6N1 prise le
2026-11-23). Relevé : [idees-6e-entiers-decimaux-releve.md](idees-6e-entiers-decimaux-releve.md).

## Reprendre ici

_Mis à jour le 2026-11-23, outil n° 54 livré (#3052)._

- **État** : rubrique 6N1 PUBLIÉE (6 neufs, 23 variations sur 13 publiés, relecture validée) · **Prochaine
  action** : l'outil n° 54 (droite graduée avec zoom) vit dans son chantier
  [droite-zoom](droite-zoom-progress.md) (outil #3052 ; modèle 6N1H-3 / 6N1H-4 publié, 6dba93c8, #3071) ; puis outil n° 53 (labyrinthe), phase 0 d'abord ; puis verser ce journal en archive ·
  **En attente de David** : renommer N5 (c178356b) dans l'éditeur en « Écrire un nombre en décimal, en
  fraction et en pourcentage » (écriture en prod, la sienne) · **Pièges en cours** : aucun ·
  **Worktree / branche** : aucun.

## Phase 0 (2026-11-23, validée par David le jour même)

Page à cocher : https://claude.ai/artifact/KZhhKJMKcTi5aUsAFSpkdV (Oui / Non / Autrement + note, collection
`verdicts` ; si tout est oui : 6 modèles neufs, 18 variations, et 23 variations sur 13 modèles publiés).

Une fiche par idée, avec ma recommandation. « Chez eux → chez nous » : la forme que notre format
permet. Point : un seul par modèle (ADR 0020). Une variation ajoutée à un modèle publié garde son
point et son nœud. Chaque variation aura ses `testSpecs`, trois erreurs prévues par case et son
coup de pouce. Question d'accès de la migration de rangement : personne ne gagne d'accès, on range
des modèles de questions.

### Variations de modèles publiés

- **F1. 4bcbbaae « Le nombre de dizaines, de centièmes… » (6-101)** · 6N1A, 6N1A-2. Chez eux :
  « le nombre de centaines de 52 138,742 », « le nombre de dizaines de mille de 482 913 057 ».
  Chez nous, deux variations : (v2) nombre de dizaines, de centaines ou de milliers d'un décimal
  à 4 ou 5 chiffres avant la virgule et 2 ou 3 après (réponse : l'entier 521) ; (v3) nombre de
  milliers, de dizaines de mille ou de millions d'un grand nombre de 7 à 10 chiffres. Case
  numérique. Erreurs prévues : le chiffre seul, la partie entière entière, un rang de trop.
- **F2. 4d825d44 « Le chiffre d'un rang » (6-101)** · idée du labyrinthe 6N1A-4. Chez eux : un
  chemin dans un labyrinthe. Chez nous : case choix `plusieurs: oui`, « Coche les nombres dont le
  chiffre des centièmes est 7 », 6 nombres décimaux (2 à 4 justes), les intrus ont le 7 à un
  autre rang (dixièmes, millièmes, unités). Le labyrinthe lui-même reste l'outil n° 53.
- **F3. a2ae7206 « Fraction décimale et écriture décimale » (6-106)** · 6N1A-1, 6N1D, 6N1F-1,
  6N1F-5. Quatre variations : (v3) somme à dénominateurs différents avec un rang vide, exemple du
  BO : 4 + 1/10 + 7/1 000 → 4,107 ; (v4) « Écris 3,07 sous forme d'une fraction décimale », sans
  dénominateur donné, `requiredForm` fraction de dénominateur 10, 100 ou 1 000, nombres avec
  zéros intérieurs (0,07 ; 3,07 ; 12,405) ; (v5) différence a + b/D − c/D → décimal, D = 10 ou
  100 ; (v6) somme a + b/100 → une seule fraction décimale (437/100), `requiredForm`.
- **F4. 2c5bae8f « Liens entre les unités de numération » (6-102)** · 6N1B, 6N1A-1. Deux
  variations : (v6) vers une unité plus grande, « 1 centième = ? dixième » → 0,1, « 1 dizaine = ?
  centaine » → 0,1 (écart d'un ou deux rangs) ; (v7) « 347 centièmes = ? unités » → 3,47
  (résultat décimal, dixièmes, centièmes ou millièmes, 2 à 4 chiffres).
- **F5. 8d7edbde « Grands nombres jusqu'aux milliards » (6-103)** · 6N1A-5. Une variation :
  deux unités de numération avec chevauchement, « 35 millions et 12 centaines de mille = ? »
  → 36 200 000 (comptes de 2 à 99, rangs des milliers aux milliards). Case numérique, espaces
  acceptés. Erreurs prévues : juxtaposition des deux nombres (3 512 00 000), oubli de la retenue.
- **F6. d7781eed « Reconnaître un nombre décimal » (6-104)** · 6N1D-1, 6N1D. Chez eux : Vrai /
  Faux, ou une rédaction sans saisie. Chez nous : « Montre que 7/25 est un nombre décimal : écris-le
  avec un dénominateur 10, 100 ou 1 000 », dénominateurs 2, 4, 5, 20, 25, 50, 200, 250, 500,
  `requiredForm` fraction de dénominateur puissance de 10 (toute fraction égale de cette forme est
  juste : 28/100 comme 280/1 000).
- **F7. 8adac6d1 « Repérer un nombre décimal » (6-108)** · 6N1H, 6N1H-1, 6N1H-2, 6N1G-1, 6N1C-1.
  Quatre variations : (v3) millièmes (pas 0,001, étiquettes au centième) ; (v4) subdivisions en 5
  ou en 8, pas principal 1 ou 2, origine de 2 à 15 (deux graduations étiquetées) ; (v5) grand
  entier, pas de 10 000 ou de 100 000 (dans les bornes de 6-103) ; (v6) un point lu sous trois
  écritures, trois cases : décimal, entier + fraction décimale < 1, fraction décimale
  (`requiredForm` sur les deux dernières).
- **F8. 0ce253ea « Placer un nombre décimal » (6-107)** · 6N1G, 6N1C-2. Deux variations : (v4)
  millièmes ; (v5) grand entier, pas de 10 000 ou de 100 000. Geste `placer:`.
- **F9. a1b46489 « Comparer deux nombres décimaux » (6-109)** · 6N1I. Deux variations : (v4)
  parties entières différentes, plus de décimales du côté du plus petit (12,45 … 11,987 6) ;
  (v5) zéros intercalés, 0,0ab contre 0,0a0b et 0,a0b contre 0,b0a. Case choix <, =, >.
- **F10. e75cb1a3 « Arrondir un nombre décimal » (6-111)** · 6N1K-2. Une variation : arrondir une
  grandeur, longueur en m au cm (centième), masse en kg à la centaine de grammes (dixième), prix
  à l'euro (unité). Case avec unité (`unit`), toute unité égale acceptée (45,40 m = 4 540 cm).
  Arrondis vers une unité plus grande (rang négatif chez eux) : non, hors des trois rangs du BO.
- **F11. 36991abb « Arrondir un quotient, arrondir π » (6-112)** · 6N1L. Une variation : « La
  calculatrice affiche 22 ÷ 7 = 3,142 857 1… », arrondi à l'unité, au dixième ou au centième ;
  diviseurs 7, 11, 13 ; troncature et millième non (hors bornes de 6-111 et 6-112).
- **F12. 2e982062 « Intercaler un nombre décimal » (6-202)** · 6N1M-1. Une variation, trois cas
  tirés : a,99 < … < a + 1 ; a < … < a,1 ; a,bcd < … < a,(b + 1). Même règle « dans
  l'intervalle » que les variations publiées.
- **F13. 8fd459da « Définition d'un pourcentage » (6-105)** · 6N1F-3. Une variation, deux cases :
  « 3/20 = ?/100 = ? % », dénominateurs 2, 4, 5, 10, 20, 25, 50 (pourcentages de 1 % à 100 %).

### Modèles neufs

- **N1. « Recomposer un nombre décimal » (6-101)** · 6N1A-3, 6N1A-1. Quatre variations : (v0)
  somme de produits « 7 × 100 + 3 × 1 + 5 × 0,01 » dans le désordre, rangs vides → 703,05 ;
  (v1) décomposition à trous : 3 054,7 = (? × 1 000) + (? × 10) + (? × 1) + (? × 0,1), une case
  par chiffre non nul ; (v2) groupements, « 23 dixièmes et 5 centièmes » → 2,35 ; (v3) en mots
  avec un rang vide, « 3 unités et 7 centièmes » → 3,07. Nombres de 3 à 6 chiffres, au plus 3
  décimales.
- **N2. « Écrire un nombre sans zéros inutiles » (6-101)** · 6N1A-6, 6N1C. Chez eux : comparaison
  de texte. Chez nous : case numérique avec les règles `zeros` et `spaces` (superflu) : (v0)
  décimal « 004 012,500 » → 4 012,5 ; (v1) grand entier « 000 012 004 300 » → 12 004 300, au
  plus 10 chiffres. Erreur prévue : un zéro utile retiré (4 12,5).
- **N3. « Le nombre mystère » (6-101)** · 6N1A-7. Indices sur les chiffres par rang : un chiffre
  donné, double, moitié, somme, « plus grand que ». Solution unique par construction (chaque
  indice fixe un chiffre), donc pas besoin de leur solveur. (v0) entier de 4 ou 5 chiffres ;
  (v1) décimal avec dixièmes et centièmes. Case numérique.
- **N4. « Lire et écrire un nombre décimal » de 6e (6-101)** · 6N1F-2. Le CM2 (bc2cc245) va
  jusqu'à 57 unités et aux millièmes ; la 6e monte à 999 999,999. (v0) lettres → chiffres, avec
  le mot « virgule » ; (v1) lettres → chiffres, « … unités et … millièmes » ; (v2) chiffres →
  lettres, mots à glisser (bloc ` ```trous `, comme e76ab26f), parce qu'une saisie libre en
  lettres a trop d'écritures justes. Voir Q1.
- **N5. « Compléter un tableau d'écritures » (6-106)** · 6N1E-1, 6N1E. Tableau markdown à cases :
  trois lignes (écriture décimale, fraction, pourcentage), quatre colonnes, une case donnée par
  colonne. (v0) fractions usuelles 1/4, 1/2, 3/4, 1/5, k/10, toute fraction égale acceptée ;
  (v1) centièmes, fraction sur 100 exigée (`requiredForm`). Pourcentages entre 0 % et 100 %.
- **N6. « Nombre mixte et écriture décimale » (6-106)** · 6N1F. (v0) décimal → nombre mixte
  (3,47 = 3 + 47/100, `requiredForm` entier + fraction décimale < 1) ; (v1) nombre mixte →
  fraction décimale ; (v2) fraction décimale > 1 → nombre mixte ; (v3) exemple du BO, 6/5 = 1 +
  1/5 = 1,2, dénominateurs 2, 4, 5 ; (v4) décimal < 1 → pourcentage (0,125 = 12,5 %). Pas de
  pourcentage au-delà de 100 % (bornes de 6-105).

### Rien

- ✅ couverts : 6N12-1 (67954fbb), 6N1J (92db5823), 6N1K (e75cb1a3, 030e3554), 6N1M (030e3554).
- 6N1K-1 : arrondi couvert ; « valeur approchée par défaut ou par excès » n'est pas au BO de 6e.
- 6N1F-4 (pourcentage approché) : hors bornes de 6-140 (« cas simples ») ; idée pour le cycle 4.
- 6N1H-3, 6N1H-4 (zooms successifs) : outil n° 54 des outils manquants, rien en attendant.

### Questions à David

- **Q1.** Décimaux en lettres (N4) : un modèle neuf de 6e (ma recommandation : les plages de 6e
  restent à part de celles du CM2), ou bien des variations ajoutées au modèle du CM2 bc2cc245,
  qui gagnerait le niveau 6e ?
- **Q2.** Droite graduée avec zoom (outil n° 54) : chantier d'outil à ouvrir plus tard, ou tout de
  suite après ce lot ? Ma recommandation : plus tard. Il sert à 6N1H-3 et 6N1H-4 seulement.
- **Q3.** Pourcentage approché (6N1F-4) : le noter dans « Idées en attente » pour la 5e ou la 4e,
  ou l'abandonner ?
- **Q4.** Labyrinthe (outil n° 53) : je l'ai seulement complété dans la liste (usage en 6-101).
  D'accord pour ne rien faire de plus ici ?

## Historique

- 2026-11-23 : ligne 6N1 réservée (commit 0f378b4ac sur `main`). Worktree créé. Points de 6e relevés
  en prod (MCP) : chaque point de 6-101 à 6-113 a au moins un modèle publié (6-101 : 4d825d44,
  4bcbbaae, 67954fbb ; 6-102 : 2c5bae8f, 111ba9c5 ; 6-103 : 8d7edbde, et e76ab26f au point du CM2 ;
  6-104 : d7781eed ; 6-105 : 62590cd3, 8fd459da ; 6-106 : 5d7726eb, c1a83c8f, 81a64b0a, 000368e1,
  a2ae7206 ; 6-107 : 0ce253ea ; 6-108 : 8adac6d1 ; 6-109 : a1b46489 ; 6-110 : 92db5823 ; 6-111 :
  e75cb1a3 ; 6-112 : 36991abb ; 6-113 : 030e3554 ; 6-202 : 2e982062, intercaler).
- 2026-11-23 : lots A et B lus par agents, versés dans le relevé. Vu en prod : aucun modèle de 6e
  n'écrit un décimal en lettres ni en chiffres (CM1 2cff4ef5, CM2 bc2cc245 seulement ; e76ab26f =
  grands entiers, CM2 + 6) ; 6-105 et 6-106 n'ont qu'une forme à la fois (pas de tableau décimal /
  fraction / pourcentage).
- 2026-11-23 : lot C lu, relevé complet (38 exercices).
- 2026-11-23 : points douteux vérifiés dans leur code (labyrinthe, 6N1A-3, 6N1H-4, 6N1F-5) ;
  verdicts écrits dans le relevé ; modèles voisins relevés (5077e030 6-130, 35754c24 et 5c8a6da6
  6-140, ade95ae4 5e, CM1 2cff4ef5, CM2 bc2cc245, 0dd3de90, cda36cc2) ; règles `zeros` et `spaces`
  trouvées (`src/lib/mathAST/superflu/rules.ts`) ; pas de zoom dans ` ```line ` (parseur) ; outil
  n° 54 ajouté et n° 53 complété sur `main` (8e0bb0996a) ; phase 0 écrite.
- 2026-11-23 : David valide toutes les recommandations de la phase 0 et demande de lancer la
  construction des outils juste après le lot (Q2 passe de « plus tard » à « juste après ») ;
  13 modèles réservés et pourcentage approché noté dans « Idées en attente » (`main`).
- 2026-11-23 : gros lot écrit par 4 agents (`neufs-a.py` N1-N3, `neufs-b.py` N4-N6, `publies-a.py` F1-F6,
  `publies-b.py` F7-F13) ; 19 fichiers verts (`question:specs`), sonde des droites 0 problème, origine des
  13 publiés intacte. Écarts : N1 v1 et F4 v6 à 2 erreurs prévues ; N3 ~70 % d'indices « plus grand / plus
  petit de k » ; N5 tableau tourné (écritures en colonnes) ; F7 v6, F10, F11 tirages écartés pour éviter
  « à améliorer » ; F13 de 2 % à 98 %.
- 2026-11-23 : F3 v4 et F6 se heurtaient à « fractions irréductibles » (28/100 « à améliorer ») ; le
  générateur de migration de contenu refusait de changer `options`, sans raison écrite (exclusion ajoutée
  par la session de l'outil, hors de la phase 0 du 2026-11-20). David : étendre l'outil (B1) → #3042 ;
  sessions idee-3, idee-tale, idee-1re prévenues. F3 v4, v6 et F6 revenus à une case (fiche validée).
- 2026-11-23 : essai en base locale (6 brouillons), aperçus `pnpm voir` sans erreur ; N5 : colonne
  « Pourcentage » hors de l'écran sur iPhone.
- 2026-11-23 : #3042 (outil) et #3044 (lot) mergés ; CI du lot rouge une fois : `\euro` dans 4 specs de F10,
  refusé par la liste blanche des réponses → `\,\text{€}`.
- 2026-11-23 : David a créé les 6 brouillons en prod (`create-questions --publier`) ; ids commités. N5 : tableau
  remplacé par une égalité par ligne (choix b de David) ; un « 25 % » tapé dans une case suivie d'un % écrit était
  jugé faux sans message → le % est tapé par l'élève, erreur prévue « 25 » sans le signe ; contrainte pourcentage
  `strict` sur N5. Rendu iPhone vérifié (`pnpm voir`, copie locale). Migrations générées : rangement (intégration
  31 verts) et contenu (intégration 76 verts), garde des niveaux sans écart.
- 2026-11-23 : #3047 mergé. `db:migrate` refusé (« inserted before the last migration on remote ») ;
  `--dry-run --include-all` : seules nos 2 migrations ; le push réel est laissé à David (écriture en prod).
- 2026-11-23 : migrations poussées par David (`db push --include-all`), vérifiées en base ; série de relecture
  f9db7096 enregistrée par David (#3048) ; relecture validée ; 6 neufs publiés par David (`publier-lot.ts`),
  vérifiés en base (6 `published`). Rubrique passée à « publiée » dans le tableau.
- 2026-11-23 : #3048 mergé. David suit les recos : outils 54 puis 53 ; titre de N5 proposé ; branche de la
  phase 0 supprimée (contenu identique sur main).
