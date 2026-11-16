# tortue-variables — la tortue avec variables (4e / 3e)

## Reprendre ici

_Mis à jour le 2026-11-16, après #2735._

- **État** : PR A (logique) mergée (#2735) : moteur commun, `tortue/niveaux.ts`, `niveau:` du parseur, réponse attendue `4e | …` · **Prochaine action** : PR B (écran) — nouveau worktree `ubumaths-wt-tortue-variables` sur `feat/tortue-variables-ecran` : boîtes à outils par niveau, `TortueEditeur` / `TortueProgramme` / `TortueCorrige` au niveau (`texteVersEtatTortue`, `etatVersTexteTortue`, `nombreDeBlocsTortue`, `lireProgrammeTortue(…, niveau)`), sélecteur « base · 4e · 3e » de `/tortue` (Q6) · **En attente de David** : `départ:` doit-il refuser une variable jamais mise (empêche « complète le programme ») ? cf. § Revue PR A · **Pièges en cours** : écran pas encore au niveau → aucun modèle `niveau:` publié avant la PR B · **Worktree / branche** : aucun (supprimé après #2735)

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
