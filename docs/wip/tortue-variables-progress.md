# tortue-variables — la tortue avec variables (4e / 3e)

## Reprendre ici

_Mis à jour le 2026-11-17, PR B ouverte._

- **État** : PR A (logique) mergée (#2735) ; PR B (écran) en cours sur `feat/tortue-variables-ecran` : boîtes à outils par niveau, carte / corrigé / bac à sable au niveau, sélecteur « base · 4e · 3e » de `/tortue`, `départ:` sans contrôle des variables, messages au vocabulaire tortue · **Prochaine action** : CI de la PR B (revue faite, 2 mineurs corrigés), merge ; puis PR C (modèles : relevé prod des points 4-067, 4-068, 3-047, 3-051, liste proposée à David — Q7) · **En attente de David** : rien · **Pièges en cours** : aucun modèle `niveau:` publié avant le merge de la PR B ; reste en suspens (revue PR A) : `1e2` lu sans niveau / refusé en 4e, `répéter 2,5 [ … ]` arrondi sans prévenir l'auteur · **Worktree / branche** : `ubumaths-wt-tortue-variables` / `feat/tortue-variables-ecran`

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
