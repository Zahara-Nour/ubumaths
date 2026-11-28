# tortue-variables — la tortue avec variables (4e / 3e)

## Reprendre ici

_Mis à jour le 2026-11-17, après #2761 — **chantier clos**._

- **État** : clos. PR A (#2735), B (#2742), C (#2746), D (#2755) livrées en 0.93.0 ; 4 modèles publiés (25991652, 81bacf03, a0b27395, d64ddd78) ; correctif #2761 mergé · **Versé** : `docs/systeme/blockly.md` § Tortue de 4e et 3e ; `docs/wip/outils-manquants.md` § 4 (4-067, 3-047) ; deux lignes dans `verifications-manuelles.md` (#2746/#2755, #2761) · **En attente de David** : `deploy:prod` pour livrer #2761 · **Worktree / branche** : aucun

## Origine

Suite « tortue avec variables » du chantier `blockly` (clos le 2026-11-16, journal
`docs/archive/wip/blockly-progress.md` § Suites ; Q8 de sa piste 4e / 3e). Doc système :
`docs/systeme/blockly.md` ; ADR 0039 (blocs interprétés par Chiphre, jamais de JavaScript exécuté).
Le BO du cycle 4 n'exige pas la tortue avec variables : c'est un ajout pédagogique (exercices
Scratch du brevet : spirale, polygone régulier).

## Phase 0 — validée par David le 2026-11-16 (« je te suis »)

Exemples visés : spirale `mettre côté à 1 ; répéter 10 [ avancer côté ; tourner à gauche 90 ;
ajouter 1 à côté ]` ; polygone `mettre n à 6 ; répéter n [ avancer 3 ; tourner à gauche 360 ÷ n ]`.

- **Q1 — Forme** : même bloc ```tortue, clé `niveau: 4e | 3e` ; absente → rien ne change (modèles
  publiés compris). Le niveau choisit les blocs proposés **et** admis, comme pour le calcul.
- **Q2 — Blocs** : ceux du calcul, déjà écrits. 4e : variables (« mettre x à », « ajouter … à x »,
  lire x), opérations + − × ÷ dans les entrées, « répéter n fois » à n calculé (arrondi, négatif → 0).
  3e : + « si / sinon », comparaisons, ET / OU / NON, « répéter jusqu'à ». Variable jamais mise = 0 ;
  20 variables au plus, noms réservés refusés (mêmes règles que le calcul).
- **Q3 — Notation** : celle du calcul étendue aux blocs tortue : `avancer côté × 2`,
  `tourner à gauche 360 ÷ n`.
- **Q4 — Jugement** : inchangé (tracés comparés, `position` ou `forme`). `blocs:` compte les
  instructions (mettre, ajouter, avancer, tourner, répéter, si), pas les calculs dans les entrées.
- **Q5 — Erreurs** : ÷ 0 → arrêt avec message ; nombre trop grand → arrêt « trop loin » existant ;
  boucle sans fin → « trop long » (10 000 pas). Distance négative = recule ; angle non entier admis ;
  « si » vide ne fait rien ; « jusqu'à » déjà vrai = 0 tour.
- **Q6 — Bac à sable `/tortue`** : sélecteur « Blocs : base · 4e · 3e » (base par défaut), comme
  `/programmes-de-calcul`. Pas d'aperçu Python en 4e / 3e (blocs de calcul sans générateur) ; il
  reste au niveau de base.
- **Q7 — Modèles** : relevé prod des points d'abord, puis liste proposée à David. Pistes : 4-067,
  4-068 (spirale, carrés grandissants), 3-047, 3-051 (polygone à n côtés, escalier) ; jugés par le
  tracé, à la position.
- **Découpage** : **PR A** logique (interpréteur, notation, `niveau:`, compte des blocs ; revue
  `code-reviewer` Opus — correction des réponses) ; **PR B** écran (boîtes à outils par niveau,
  sélecteur du bac à sable, corrigé, catalogue) ; **PR C** modèles ; **PR D** ids de prod +
  rangement (nœud du point + tag, migration comme #2727). Pas de migration avant la PR D.

## PR A — logique (2026-11-16)

- **Moteur commun** (`calcul/interpreteur.ts`) : `creerMoteur(noms, domaine, limitePas)` exécute
  variables, calculs, conditions, « si », répétitions ; le domaine (calcul ou tortue) lui confie
  ses blocs (`valeur`, `instruction`) et, pour la tortue sans niveau, l'arrondi inférieur des
  répétitions calculées (`toursCalcules`). `preparerProgramme` : lecture + blocs connus + noms.
  Sans niveau, la tortue garde exactement ses pas et son arrondi (tests d'avant verts).
- **Notation** : option `{ tortue: true }` de `texteVersEtatCalcul` / `etatVersTexteCalcul` /
  `variableJamaisMise` ; sans niveau, `notation.ts` de la tortue inchangée.
- **Choix faits sans question** (dans le cadre de la phase 0) : `reste de … par` non admis pour la
  tortue (Q2 ne le liste pas) ; `nombre`, `résultat`, `afficher` jamais admis ; nombre infini →
  `trop-loin` (Q5) ; ÷ 0 → nouvelle erreur `division-par-zero` ; le parseur lit `attendu:` /
  `départ:` après toutes les lignes (`niveau:` peut venir après) ; sans niveau, un programme de
  4e reçoit « ajouter niveau: 4e » plutôt qu'« instruction inconnue ».

### Revue PR A (`code-reviewer` Opus, 2026-11-16)

Aucune régression de jugement, ni pour la tortue sans niveau, ni pour le calcul (vérifié sur les
30 blocs ```tortue de `scripts/questions/`). Corrigé : ordre des erreurs du parseur, `avancer
trois` sans niveau. Reste :

- **Écran pas encore au niveau** : ne pas publier de modèle `niveau:` (ni `deploy:prod`, si
  David le juge utile) avant la PR B.
- **Question pour David** : `départ:` refuse une variable lue jamais mise (comme le calcul) ;
  cela empêche « complète le programme » (`départ: répéter n [ … ]` sans `mettre n`).
- Pour la PR B ou plus tard : en 4e / 3e, des messages de lecture citent le vocabulaire du calcul
  (`nombre`, `afficher`) ; `afficher` refusé sans nommer le bloc ; `1e2` lu sans niveau, refusé en
  4e ; `répéter 2,5 [ … ]` écrit tel quel est arrondi sans prévenir l'auteur.

## PR B — écran (2026-11-17)

- **Boîtes à outils** : `toolboxTortue(niveau)` (`tortue/toolbox.ts`) ; base = `TORTUE_TOOLBOX`
  inchangée ; 4e = Tortue, Calcul (+ − × ÷), Variables (catégorie dynamique), Boucles
  (`controls_repeat_ext` seul) ; 3e + Conditions et « répéter jusqu'à ». Catégories partagées avec
  le calcul (`operation`, `CATEGORIE_DES_VARIABLES`, `categorieConditions` exportés de
  `calcul/toolbox.ts`). Test : chaque bloc proposé (variables de la catégorie dynamique comprises)
  est admis au niveau.
- **Éditeur, carte, corrigé** : `TortueEditeur` prend `niveau` (boîte à outils, notation, tracé
  verrouillé, noms de variables surveillés) ; `TortueProgramme` lui passe `spec.niveau` et compte
  les blocs au niveau ; attendu en pointillés et `TortueCorrige` au niveau de la réponse attendue,
  sinon du bloc.
- **Bac à sable** (Q6) : sélecteur « Blocs : base · 4e · 3e » sur `/tortue` ; boîte à outils
  changée à chaud (`updateToolbox`), blocs gardés ; « Voir en Python » au niveau de base seulement.
- **`départ:`** : variable lue jamais mise admise (validé par David le 2026-11-17 : « complète le
  programme ») ; `attendu:` garde le contrôle.
- **Messages de la notation (option `tortue`)** : `afficher`, `nombre`, `résultat`, `reste de`
  refusés à la lecture en les nommant (« « afficher » n'existe pas pour la tortue… ») ; exemples
  `si n > 0 alors [ avancer 1 ]`, `n > 0` ; calcul inchangé.
- **Catalogue** : clé `niveau`, exemples « polygone à n côtés (4e) » et « spirale à compléter
  (4e) », erreur « variable sans niveau ».
- Laissés pour plus tard (revue PR A) : `1e2`, `répéter 2,5 [ … ]` arrondi sans prévenir.

### Revue PR B (`code-reviewer` Sonnet, 2026-11-17)

Aucun bloquant. Deux mineurs corrigés : `ajouter 1 à résultat` / `à nombre` donnent le même refus
que `avancer résultat` (« n'existe pas pour la tortue ») ; le bac à sable ne génère plus le Python
hors du niveau de base.

## PR C — modèles : relevé prod (2026-11-17, MCP lecture seule)

Points visés et modèles déjà tagués (tous des programmes de calcul, aucun ```tortue au-delà de la
5e) :

| Point | Libellé (borne)                                                | Modèles                                          |
| ----- | -------------------------------------------------------------- | ------------------------------------------------ |
| 4-067 | Manipuler une variable (une seule, ex. accumulation en boucle) | 20cb9b55 texte, 01109f75 calcul — publiés        |
| 4-068 | Écrire un programme simple pour un objectif (sans borne)       | f91149f2 calcul — publié                         |
| 3-047 | Approfondir les variables (plusieurs dans un même programme)   | 962da675 texte (draft), dbab36af calcul — publié |
| 3-051 | Écrire un programme pour un objectif (sans borne)              | 6e99d291 calcul — publié                         |

Tortue en prod : 6-197, 5-100, 5-105, 5-106 seulement. Quadrillage ±10 carreaux autour du départ.

**Contrainte relevée** : le jugement compare les tracés ; sans `blocs:`, une spirale se trace
aussi en `avancer 1 ; tourner … ; avancer 2 ; …` sans variable. Chaque variation « avec variable »
porte donc un `blocs: N` qui rend la variable nécessaire. Deux suites arithmétiques se déduisent
toujours l'une de l'autre (`avancer a + 2`) : le tracé seul ne peut pas exiger **deux** variables
(3-047), sauf une suite de Fibonacci (`ajouter a à b ; mettre a à b − a`).

### Décisions (David, 2026-11-17 : « je valide »)

Un modèle par point (ADR 0020), tous jugés à la position, `blocs: N` pour rendre la variable
nécessaire :

1. **4-067 « Spirale avec une variable »** (4e) : spirale carrée (`mettre côté à a ; répéter n [
avancer côté ; tourner à gauche 90 ; ajouter p à côté ]`, 5 blocs) ; escalier aux marches
   croissantes (7 blocs) ; spirale à compléter (`départ:` sans « ajouter »).
2. **4-068 « Tracer une figure avec un programme (4e) »** : polygone régulier à compléter
   (`départ: mettre n à … ; répéter n [ avancer c ]`, n ∈ {3, 5, 6, 8}) ; carrés emboîtés (6 blocs).
3. **3-047 « Deux variables (tortue) »** : spirale de Fibonacci (1, 1, 2, 3, 5, 8), 8 blocs (admet
   aussi la solution à trois variables `mettre c à a + b ; …`) ; la même à compléter (il manque
   `mettre a à b − a`). Pas de spirale rectangulaire : une seule variable y suffit.
4. **3-051 « Tracer une figure avec un programme (3e) »** : spirale « répéter jusqu’à » (5 blocs ;
   `répéter n` admis, même tracé) ; créneaux de hauteurs alternées avec « si / sinon » (13 blocs ;
   `mettre h à 3 − h` admis).

### Écriture (2026-11-17)

- JSON écrits directement dans `scripts/questions/tortue-variables/` ; quadrillage vérifié (spirales
  n ≤ 9 : ≤ 10 carreaux du départ ; Fibonacci n ≤ 6).
- `question:specs` : 12 + 9 + 8 + 9 specs vertes, 450 tirages réussis ; preuve du juge : specs
  inversées → 0/8.
- Base locale : `create-questions --publier` depuis une copie (les ids locaux ne vont pas dans le
  dépôt).

### Relecture (David, 2026-11-17 : « je valide les essais »)

Les 4 modèles relus en base locale, validés tels quels (`répéter 8` admis pour la spirale de 3e,
8 blocs pour Fibonacci). Reste : publication en prod par David, puis PR D.

## PR D — rangement (2026-11-17)

- Ids de prod (publiés par David) : 25991652 Spirale avec une variable (4-067), 81bacf03 Tracer une
  figure (4e) (4-068), a0b27395 Deux variables (tortue) (3-047), d64ddd78 Tracer une figure (3e)
  (3-051) ; relevé `docs/wip/questions/etat-prod-2026-11-17-tortue-variables/` (4 brouillons, sans
  nœud ni tag).
- Accès (David, 2026-11-17 : « je te suis ») : personne ne gagne de lecture.
- Migration `20261117140132_questions_tortue_variables_rangement_tags` générée par
  `docs/wip/questions/lot-tortue-variables-rangement.py` (gabarit #2727) : 4 nœuds (variables et
  affectation pour 4-067 / 3-047, la notion Variables et instructions pour 4-068 / 3-051), 4 tags.
- Test d'intégration : 19 verts ; rouge sans la migration (8 échecs) ; `security-auditor` : aucun
  finding (diff avec #2727 = données seules ; gardes vérifiées sur la prod en lecture).
- Merge #2755 puis `db:migrate` (dépôt principal ; le worktree n'est pas lié au projet) : la commande
  a appliqué AUSSI `20261117140233_questions_1techno_lot0_retrait_118` (destructive, décidée par
  David) et `20261117142038_questions_1gen_lot1_rangement_tags`, mergées mais pas encore migrées par
  leurs sessions. Sessions questions-1techno et questions-1gen prévenues ; David prévenu. Leçon :
  `supabase migration list --linked` AVANT `db:migrate`, et s'arrêter si d'autres migrations
  attendent.
- Prod (MCP) : 25991652 → variables et affectation, 4-067 ; 81bacf03 → Variables et instructions,
  4-068 ; a0b27395 → variables et affectation, 3-047 ; d64ddd78 → Variables et instructions, 3-051 ;
  tous `draft`.

## Publication (2026-11-17)

- `deploy:prod` 0.93.0 par David : #2735, #2742, #2746, #2755 dans `origin/production` (vérifié).
- `publier-lot --dir scripts/questions/tortue-variables --publier` lancé par David ; MCP : 25991652,
  81bacf03, a0b27395, d64ddd78 → `published`.

## Correctif `fix/tortue-nombres` — phase 0 validée par David le 2026-11-17 (« je valide »)

Constat (sonde) : sans niveau `avancer 1e2` lu, en 4e / 3e refusé ; en 4e / 3e `répéter 2,5` → 3
tours, `répéter -2` → 0 tour, `mettre n à 2,5 ; répéter n` → 3 tours, sans message (sans niveau :
refusés). David : « je veux quelque chose de propre ».

1. Nombre de tours = entier ≥ 0 à tous les niveaux : `répéter 2,5` / `répéter -2` écrits →
   refusés à la lecture (« il faut un nombre entier de fois ») ; calculé non entier ou négatif →
   arrêt avec message nommant la valeur. `répéter 0` inchangé.
2. Aucune écriture à exposant (`1e2`) à aucun niveau : refus « écrire le nombre en entier : 100 » ;
   le texte tiré des blocs n'écrit jamais d'exposant.
3. Relevé prod des modèles tortue (exposant, `répéter` non entier ou négatif) avant de coder ;
   un cas → stop, le montrer à David.

Calcul de 5e (arrondi façon Scratch) hors correctif. Une PR, revue `code-reviewer` Opus, pas de
migration ; puis clôture du chantier.

### Correctif — implémentation (2026-11-17, worktree `ubumaths-wt-tortue-nombres`)

- Relevé prod (MCP) : 8 modèles tortue, aucun exposant, aucun `répéter` décimal ou négatif écrit.
- `nombres.ts` (nouveau) : `ecrireSansExposant`, `messageExposant`, `toursEntiers` (tolérance
  1e-9 : `0,1 × 30` = 3 tours, pas un arrêt). Interpréteur : `toursDeLaTortue` à tous les niveaux,
  erreur `tours-non-entier` (valeur dans le message, `−` typographique). Notation 4e / 3e : nombre
  écrit non entier ou négatif après `répéter` refusé, cité par `cite` (« répéter − 2 »). Notation
  sans niveau : plus d'exposant lu ni écrit ; `controls_repeat_ext` écrit sa valeur brute.
- Tests rouges d'abord (10), puis verts : 355 tests `blockly` ; specs des 9 modèles tortue du dépôt
  vertes ; `check:incremental` 0 erreur ; `docs/systeme/blockly.md` mise à jour.
- Hors correctif, inchangé : `controls_repeat` (champ entier, Blockly interdit virgule et
  négatif) ; calcul de 5e (arrondi façon Scratch).
- Revue `code-reviewer` Opus : aucun bloquant, 3 comportements tenus, modèles existants intacts.
  Corrigé : `exposantEcrit` ne recolle que ce qui est écrit d'un seul tenant (`1e − 2` cite « 1e ») ;
  `−` typographique dans le message d'exposant (aussi lu : `1e−2`) ; doc (arrondi Scratch = programmes
  de calcul 4e / 3e ; champ de `controls_repeat` lu à l'entier inférieur, état fabriqué seulement).
- #2761 mergée (CI verte ; 2 corrections de CI : motif `nombres.ts` du filtre d'intégration,
  `Doc-inchangée:` pour `environnement-de-dev.md`). Worktree et branche supprimés.
