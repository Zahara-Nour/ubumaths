# Fiches de la phase 0 « géométrie dans l'espace » de Terminale (2026-11-26)

Chantier [`idees-tle-geometrie-espace`](idees-tle-geometrie-espace-progress.md), relevé :
[idees-tle-geometrie-espace-releve.md](idees-tle-geometrie-espace-releve.md). Copie des fiches de la page à cocher https://claude.ai/artifact/6Cx9jxScwsv78fkiAM9znZ. Validées par David le 2026-11-26 (« je valide » : toutes oui, Q1 oui).

Toutes les variations auront leurs `testSpecs` (réponses justes sous plusieurs écritures, erreurs
typiques refusées), trois erreurs prévues par case et un coup de pouce qui ne donne pas la réponse.

## Modèles neufs

### N1 — Écrire une représentation paramétrique d'une droite

- **Recommandation** : Nouveau modèle, 3 variations
- **Chez eux** : TSG2-30 : droite passant par A de vecteur directeur v ; l'élève écrit x =, y =, z = (trois cases), toute représentation de la même droite est acceptée.
- **Chez nous** : Le point et le vecteur sont imposés par la consigne (« de point A et de vecteur directeur u ») : la représentation est alors unique, et trois cases d'expression en t suffisent (3t + 2 et 2 + 3t acceptées). Aucun de nos modèles ne fait écrire la représentation : 0003deae demande seulement un vecteur directeur, 33be404b fait lire. Accepter toute représentation équivalente demande un outil (fiche Q1).
- **Modèle** : Nouveau : « Espace : écrire une représentation paramétrique de droite »
- **Point** : TSPE-365 (déterminer une représentation paramétrique d'une droite), nœud de 0003deae
- **Variations** :
  - Point A (coordonnées de −5 à 5) et vecteur u (de −4 à 4, au moins deux coordonnées non nulles) : x = ?, y = ?, z = ?
  - Droite (AB), de point A et de vecteur directeur AB : l'élève calcule AB d'abord
  - Droite passant par A et parallèle à d′ (d′ donnée par une représentation de paramètre s) : point A, vecteur directeur lu sur d′
- **Réponse** : Trois expressions en t. Erreurs prévues : rôles échangés (x = u₁ + x_A·t), signe d'une coordonnée perdu, B − A pris pour A − B (v1), point de d′ gardé au lieu de A (v2)

### N2 — Position relative de deux droites en repère

- **Recommandation** : Nouveau modèle, 3 variations
- **Chez eux** : TSG2-33 : deux droites données par leurs représentations paramétriques, sécantes, strictement parallèles ou non coplanaires ; une affirmation à dire vraie ou fausse, puis à justifier (sujet rédigé).
- **Chez nous** : L'élève choisit la position parmi quatre (sécantes, strictement parallèles, non coplanaires, confondues), le type étant tiré par construction comme dans 3bace561. Pour des droites sécantes, il donne le point d'intersection. d6d9d5f7 ne travaille que sur un cube.
- **Modèle** : Nouveau : « Espace : position relative de deux droites en repère »
- **Point** : TSPE-567 (configuration traduite par un système : positions relatives), nœud de 3bace561
- **Variations** :
  - d (paramètre t) et d′ (paramètre s), points de −5 à 5, vecteurs de −3 à 3 : choix parmi les quatre positions
  - d et d′ sécantes par construction (paramètres entiers) : coordonnées du point d'intersection, trois cases
  - (AB) donnée par deux points et d′ paramétrée : choix parmi les quatre positions
- **Réponse** : Choix, puis trois nombres. Erreurs prévues : « strictement parallèles » pour des droites non coplanaires (vecteurs non colinéaires), le même paramètre pour les deux droites (t = s), le point de d′ en s = 0

### N3 — Coordonnées d'un point dans un repère construit sur un cube

- **Recommandation** : Nouveau modèle, 4 variations
- **Chez eux** : TSG2-10 : cube en perspective, repère tiré parmi (A ; AB, AD, AE), (B ; BC, BA, BF), (H ; HE, HG, HD), (E ; EA, EF, EH), coordonnées de quatre sommets d'un coup (12 cases). TSG2-17 : points aux 1/2, 1/3, 1/4 des arêtes, composantes de trois vecteurs (9 cases).
- **Chez nous** : Un point par question (trois cases), sur notre figure ` ```solide ` (cube marqué, arêtes du repère en couleur). 63669e60 donne les coordonnées de vecteurs dans la base (AB, AD, AE) ; aucun modèle ne fait lire un point, ni ne change l'origine. Les quarts passent par le milieu d'un milieu ; les tiers attendent un outil (fiche Q1).
- **Modèle** : Nouveau : « Espace : coordonnées d'un point dans un repère du cube »
- **Point** : TSPE-332 (bases et repères de l'espace), nœud de 63669e60
- **Variations** :
  - Repère (A ; AB, AD, AE) : coordonnées d'un sommet tiré parmi les sept autres
  - Repère d'une autre origine, tiré parmi (B ; BC, BA, BF), (H ; HE, HG, HD), (E ; EA, EF, EH) : coordonnées d'un sommet
  - Repère (A ; AB, AD, AE) : milieu d'une arête ou centre d'une face, coordonnées en demis
  - Repère (A ; AB, AD, AE) : point au quart ou aux trois quarts d'une arête (milieu d'un milieu), coordonnées en quarts
- **Réponse** : Trois nombres (fractions acceptées sous toute écriture). Erreurs prévues : coordonnées lues dans le repère (A ; AB, AD, AE) au lieu du repère donné, deux coordonnées échangées, 1 au lieu de −1 (axe dans l'autre sens)

## Variations de modèles publiés

### V1 — Équation cartésienne du plan (ABC), puis d'un plan dirigé par deux vecteurs

- **Recommandation** : 2 variations de d192da3e
- **Chez eux** : TSG2-41 : équation du plan (ABC) à partir de trois points (saisie d'une équation, toute équation équivalente acceptée). TSG2-44 : P donné par A, u et v ; justifier qu'une équation donnée est celle de P (rédigé).
- **Chez nous** : Même case que d192da3e v3 (`answerKind: equation`, tout multiple accepté). Aujourd'hui il faut enchaîner deux modèles (2b240d8c pour le vecteur normal, d192da3e pour l'équation). Pour TSG2-44, on fait trouver l'équation au lieu de la vérifier : c'est le même raisonnement, et la saisie le juge.
- **Modèle** : d192da3e Équation cartésienne d'un plan (calculer d) (6 var.)
- **Point** : Celui du modèle (TSPE-364)
- **Variations** :
  - A, B, C non alignés (coordonnées de −3 à 3, vecteur normal simplifié aux coefficients de −4 à 4) : une équation de (ABC)
  - Plan passant par A et dirigé par u et v (non colinéaires, de −3 à 3) : une équation
- **Réponse** : Équation. Erreurs prévues : d oublié (= 0), d de signe opposé, AB pris pour vecteur normal

### V2 — Point M défini par une combinaison de vecteurs

- **Recommandation** : Variation de d6938108
- **Chez eux** : TSG2-14 : A, B, C donnés ; coordonnées de M tel que AM = k·AB + z·AC (k, z de −5 à 5, sauf −1, 0, 1).
- **Chez nous** : Trois cases. d6938108 v1 combine deux vecteurs donnés, sans passer par les points ni ajouter A.
- **Modèle** : d6938108 Espace : coordonnées de vecteurs et de points (5 var.)
- **Point** : Celui du modèle
- **Variations** :
  - A, B, C de −4 à 4 ; k et z parmi ±2, ±3
- **Réponse** : Trois nombres. Erreurs prévues : A pas ajouté (on donne AM), k·B + z·C calculé sur les points, k et z échangés

### V3 — Quels points sont dans le plan (ABC) ?

- **Recommandation** : Variation de ac94a453
- **Chez eux** : TSG2-16 : A, B, C, D coplanaires ou non (D = A + l₁·AB + l₂·AC, ou une cote décalée de 1) ; sujet rédigé.
- **Chez nous** : Quatre points proposés, un ou deux dans le plan par construction, les autres décalés de 1 sur une coordonnée : l'élève coche ceux qui sont dans (ABC). ac94a453 v1 ne traite que le cas où D est dans le plan.
- **Modèle** : ac94a453 Espace : décomposer un vecteur, vecteurs coplanaires (2 var.)
- **Point** : Celui du modèle
- **Variations** :
  - A, B, C de −3 à 3 ; points du plan avec l₁, l₂ de −2 à 2 non nuls
- **Réponse** : Choix multiple. Erreurs prévues : cocher le point décalé, oublier un point du plan dont un coefficient est négatif

### V4 — Quels points sont sur la droite d ?

- **Recommandation** : Variation de 33be404b
- **Chez eux** : TSG2-31 : M appartient-il à (Δ) donnée par une représentation paramétrique ? (sur la droite, ou une coordonnée décalée de 1 ; rédigé).
- **Chez nous** : Quatre points proposés, cocher ceux de d. 33be404b v2 donne M sur d et fait trouver t : aucune variation ne fait décider.
- **Modèle** : 33be404b Espace : lire une représentation paramétrique de droite (4 var.)
- **Point** : Celui du modèle
- **Variations** :
  - Même droite que les variations publiées ; un ou deux points de d (t de −3 à 3 non nul), les autres décalés de 1
- **Réponse** : Choix multiple. Erreurs prévues : un point qui vérifie deux équations sur trois, t différent selon la coordonnée

### V5 — Vecteur orthogonal à deux vecteurs, vecteurs normaux à (ABC)

- **Recommandation** : 2 variations de 2b240d8c
- **Chez eux** : TSG2-24 : u et v donnés, une composante de n imposée, trouver les deux autres. TSG2-43 : n est-il normal au plan (ABC) ? (rédigé).
- **Chez nous** : TSG2-24 : u et v sont donnés directement, et tout vecteur colinéaire non nul est accepté (réglage du modèle). Imposer une composante n'apporte rien, puisque notre case juge la colinéarité. TSG2-43 : quatre vecteurs proposés, cocher ceux qui sont normaux à (ABC).
- **Modèle** : 2b240d8c Espace : trouver un vecteur directeur ou un vecteur normal (2 var.)
- **Point** : Celui du modèle (TSPE-375)
- **Variations** :
  - u et v non colinéaires, de −3 à 3 : un vecteur orthogonal aux deux
  - A, B, C de −3 à 3 : parmi n, 2n, AB et un vecteur orthogonal à AB seulement, cocher les normaux à (ABC)
- **Réponse** : Vecteur ; choix multiple. Erreurs prévues : orthogonal à un seul des deux, un des vecteurs donnés, le multiple de n oublié

### V6 — Projeté orthogonal sur la droite (AB)

- **Recommandation** : Variation de eae25eba
- **Chez eux** : TSG2-25 : projeté H de M sur (AB), H à coordonnées entières par construction.
- **Chez nous** : Même calcul qu'eae25eba v0, la droite étant donnée par deux points (l'élève calcule AB).
- **Modèle** : eae25eba Espace : projeté orthogonal d'un point sur une droite (2 var.)
- **Point** : Celui du modèle (TSPE-370)
- **Variations** :
  - A de −4 à 4, AB de −3 à 3, H = A + k·AB (k de −2 à 2 non nul), M = H + un vecteur orthogonal à AB
- **Réponse** : Trois nombres. Erreurs prévues : A donné, paramètre k donné à la place de H, M donné

### V7 — Distance à une droite par le minimum de AM(t)²

- **Recommandation** : Variation de 4f056eb3
- **Chez eux** : TSG2-26 : AM(t) = √(at² + bt + c), dérivée, minimum, valeur du minimum, puis le projeté (4 cases d'expression, guidé).
- **Chez nous** : Une variation à deux cases : la valeur de t qui rend AM(t)² minimal (sommet du trinôme, −b/(2a)), puis la distance. AM(t)² est donné dans l'énoncé développé ; pas de dérivée de √ : le sommet d'un trinôme suffit et reste dans le programme de Première.
- **Modèle** : 4f056eb3 Espace : distance d'un point à une droite (1 var.)
- **Point** : Celui du modèle (TSPE-356)
- **Variations** :
  - d paramétrée (point de −2 à 2, vecteur de −2 à 2), A construit pour un t entier et une distance √N
- **Réponse** : Deux nombres. Erreurs prévues : t = b/(2a), la distance donnée au carré, AM(0)

### V8 — Volume d'un tétraèdre quelconque

- **Recommandation** : Variation de aaa16821
- **Chez eux** : TSG2-50 : problème en sept questions, de l'équation de (ABC) au volume du tétraèdre ABCD (rédigé).
- **Chez nous** : Les étapes existent déjà en modèles séparés (2b240d8c, d192da3e, 95f04c3e, 31b49cdf, aaa16821 v0). Il manque le volume d'un tétraèdre dont aucune arête n'est sur un axe : V = ⅓ × aire(ABC) × distance de D au plan (ABC). L'énoncé donne l'équation de (ABC) et dit que ABC est rectangle en A.
- **Modèle** : aaa16821 Espace : aire et volume en repère (2 var.)
- **Point** : Celui du modèle (TSPE-625)
- **Variations** :
  - ABC rectangle en A (comme v0), D construit au-dessus du plan pour un volume rationnel
- **Réponse** : Nombre exact. Erreurs prévues : ⅓ oublié, aire = AB × AC sans le ½, distance au carré

### V9 — Distance à un plan, valeur approchée

- **Recommandation** : Variation de 31b49cdf
- **Chez eux** : TSG2-27 : distance de A au plan, valeur approchée au centième, valeurs quelconques.
- **Chez nous** : 31b49cdf v0 construit les valeurs pour que la distance soit k·‖n‖. On ajoute le cas courant au bac : valeurs quelconques, formule |ax + by + cz + d|/‖n‖, arrondi au centième.
- **Modèle** : 31b49cdf Espace : distance d'un point à un plan (1 var.)
- **Point** : Celui du modèle (TSPE-562)
- **Variations** :
  - Coefficients de −5 à 5 non nuls, point de −6 à 6 hors du plan
- **Réponse** : Décimal au centième. Erreurs prévues : valeur absolue oubliée (négatif), sans diviser par ‖n‖, divisé par ‖n‖²

## Idées laissées

### R — Ce que je ne reprends pas

- **Recommandation** : Rien
- **Chez eux** : TSG2-11, 12, 13, 15, 20, 23, 40, 42 (milieu, vecteur, norme, alignement, produit scalaire, angle, équation par un normal, normal lu). TSG2-441 et 45 (positions relatives droite-plan et deux plans). TSG2-34 (cas mixte de l'orthogonalité de deux droites). TSG2-50 en sept questions. Les 9 et 12 cases d'un coup de TSG2-10 et 17.
- **Chez nous** : Déjà couverts : d6938108 v0 et v2, 119b9148, 40ddef82, 1277a5b6, ca36b9c4, d192da3e v3 et v4, 91c7b083 ; 3bace561 v0 et 0808e518 ; 3bace561 v1 et 536db399. TSG2-34 : dcabc409 traite déjà les deux formes, et son choix Oui / Non ne doit pas s'étendre. TSG2-50 : découpé en modèles existants, sauf le volume (V8). Les cases groupées : une question par point, mieux jugée.
- **Modèle** : —
- **Point** : —
- **Réponse** : —

## Questions

### Q1 — Deux outils à noter dans outils-manquants.md

- **Recommandation** : Oui
- **Chez eux** : TSG2-30 accepte toute représentation paramétrique de la même droite. TSG2-17 place des points aux tiers d'une arête du cube, avec des graduations.
- **Chez nous** : (1) Une nature de case « représentation paramétrique », jugée « même droite » (le point est sur la droite, le vecteur est colinéaire) : N1 s'en passe en imposant le point et le vecteur. (2) Un point « au tiers » d'une arête dans le bloc ` ```solide ` (aujourd'hui `milieu` et `centre` seulement) : N3 s'arrête aux quarts. Je les note sans les construire dans ce lot.
- **Modèle** : —
- **Point** : —
- **Réponse** : Oui = je les note ; Non = on ne les note pas ; Autrement = je construis l'un d'eux d'abord
