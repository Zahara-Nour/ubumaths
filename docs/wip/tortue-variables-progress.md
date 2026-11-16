# tortue-variables — la tortue avec variables (4e / 3e)

## Reprendre ici

_Mis à jour le 2026-11-16, phase 0 validée, aucun code écrit._

- **État** : phase 0 validée par David le 2026-11-16 (« je te suis ») ; worktree ouvert, rien codé · **Prochaine action** : PR A (logique, sans écran) — tests rouges d'abord : interpréteur tortue avec `niveau:`, notation, compte des blocs ; réutiliser l'évaluation des expressions et la gestion des variables de `calcul/interpreteur.ts` (ne pas dupliquer) · **En attente de David** : rien · **Pièges en cours** : aucun · **Worktree / branche** : `../ubumaths-wt-tortue-variables` · `feat/tortue-variables-logique`

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
