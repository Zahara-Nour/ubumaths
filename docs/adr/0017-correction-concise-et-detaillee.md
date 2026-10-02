# 0017 — Correction concise et détaillée : détails marqués dans le texte

- **Statut** : acceptée
- **Date** : 2026-10-02 · **Décidée par** : David

## Contexte

David veut que l'élève voie d'abord une correction concise, puis bascule s'il le veut vers une
correction détaillée. Constat en prod (2026-10-02) : les 640 modèles publiés et 72 brouillons ont des
étapes **écrites à la main** (`correction.steps`, mode A) ; **aucun** n'utilise les étapes générées
(`generatedSteps`, mode B), seules à porter une verbosité `summarized` / `detailed`. Un « détail »
recouvre trois choses de nature et de place différentes.

## Décision

- Un **détail** est une partie de la correction masquée en vue concise, de l'un de quatre types :
  **calcul intermédiaire**, **rappel**, **méthode**, **attention** (erreur fréquente).
- Les détails sont **marqués dans le texte de la correction** :
  - `\detail{…}` autour de rangées d'un calcul (y compris dans un `align`) ;
  - `> [!méthode]`, `> [!rappel]`, `> [!attention]` pour un bloc ;
  - `[texte]{.rappel}` (ou `.méthode`, `.attention`, `.calcul`) au milieu d'une phrase.
- Une **transformation de texte** produit les deux versions **avant** le rendu (MathLive à l'écran,
  Typst en PDF) : concise = marqueurs et contenu retirés ; détaillée = enveloppe retirée, contenu
  gardé.
- Toute correction s'ouvre **concise** ; **un seul interrupteur** pour toute la correction, mémorisé
  sur l'appareil de l'élève ; sans marqueur, pas d'interrupteur. En classe aussi, concise par défaut.
- Places : calcul intermédiaire dans le calcul ; méthode en encadré avant ; rappel en marge (sous la
  ligne sur téléphone) ; attention en encadré d'alerte.
- Mode B : concise = `summarized`, détaillée = `detailed` (lot séparé).

## Écarté

- **Macro MathLive `\detail`** : mesuré le 2026-10-02, MathLive refuse un `&` / `\\` dans l'argument
  d'une macro (vue détaillée en erreur dans un `align`).
- **Concis automatique** (n'afficher que la dernière étape) : un résultat seul n'est pas une
  correction concise.
- **Migrer les modèles vers les étapes générées** pour obtenir deux niveaux : ne couvre que les
  calculs que le moteur sait faire, et remplace la rédaction du professeur.
- **Un dépliage par détail** (« pourquoi ? » ligne à ligne) : écarté pour l'instant au profit d'un
  interrupteur unique.
- **Syntaxe à base de `{{…}}`** : réservée aux variables des modèles.

## Conséquences

- Les 589 corrections existantes ne changent pas tant qu'elles ne sont pas marquées.
- Un marqueur mal formé ne casse pas l'affichage : version détaillée pour l'élève, message d'auteur
  pour le professeur.
- Le parseur ubumark gagne les encadrés typés `> [!type]` et les attributs sur du texte `[…]{.type}`.
