# Correction à trois niveaux, questions de cours, QCM — décisions

Décisions de David du 2026-10-02 (Q91–Q101), à la suite de l'ADR 0017 (correction concise /
détaillée, lot 1 livré #636). Aucun code écrit pour ces points à ce stade.

## Trois niveaux de correction

**Résultat attendu** → **correction concise** → **correction détaillée** (glossaire `CONTEXT.md`).

- **Q91 — Places.**
  - Flash-cards et révision SRS : verso = résultat attendu en haut, correction concise en bas
    (bascule vers la détaillée).
  - Entraînement, En classe, résultats d'une évaluation : carte de correction, recto = résultat
    attendu, verso = correction concise (bascule vers la détaillée).
- **Q92 — Réponse fausse (façon TinyMath)** : `3 + 5 ≠ 9` (≠ et 9 en rouge), ligne suivante `= 8`
  encadré vert ; juste : une ligne `3 + 5 = 8` encadrée vert ; vide : la ligne de la solution et
  « Tu n'as rien répondu. » ; forme non optimale : ambre + remarque (ex. « parenthèses inutiles »).
- **Q93 — Trous au milieu, plusieurs cases** : l'expression complète avec les solutions en vert dans
  les trous, puis une ligne « Ta réponse : » où chaque case de l'élève est colorée selon son statut.
- **Q94 — Le résultat attendu est construit automatiquement** depuis l'énoncé, les cases et les
  solutions du modèle (rien à rédiger).

Référence TinyMath (clone `new-tinymath/apps/ubumaths/src`) : `lib/questions/correctionItem.ts`
(`createCorrection`, `putAnswer`, `putSolution`), `lib/questions/correction.ts` (`assessItem`,
statuts par case, `coms`), `lib/ui/{FrontCard,BackCard,CorrectionLine}.svelte`. Couleurs : correct
`#a3d651`, non optimal `#ffc400`, faux rouge. Le 9 n'y était **pas barré** (≠ rouge).

## Questions de cours

- **Q95 — Définition** : vérifier une connaissance ou la compréhension (définition, fait, propriété,
  méthode) sans procédure.
- **Q96 — Correction d'une carte de cours** : correction concise = la réponse de cours ; détail =
  explication, exemple, contre-exemple, lien avec la méthode.
- **Q97 — Rangement** : avec les questions du thème qu'elles éclairent, repérées par leur type ;
  plus de sous-domaine « Flash » (les 4 cartes existantes, Fonctions › Étude de fonction › Flash,
  en sortent).
- **Q98 — Usage** : chapitres du cours **et** révision SRS dans le paquet du chapitre.
  ⚠️ **Rouvre** la décision 7 du 2026-09-28 (`cartes-de-cours-progress.md` : « jamais ajoutée à un
  paquet »). David ne se souvient pas l'avoir voulue ; elle est remplacée par Q98.
- **Q99 — Question de cours = intention** (marqueur sur un modèle : carte, QCM, vrai/faux) ;
  **carte de cours = une forme** (type `course_card`, ADR 0009 inchangé). Un QCM de cours est noté
  automatiquement et compte comme une question ordinaire ; la carte reste auto-évaluée.

## QCM

- **Q100 — Vrai / faux** : préréglage de l'éditeur (bouton qui crée deux choix), pas de nouveau type.
- **Q101 — QCM à plusieurs réponses autorisé** (`multipleAnswers` existe, jamais utilisé : 0 des 47
  QCM publiés au 2026-10-02). Barème : toutes les bonnes et aucune mauvaise = juste ; une partie des
  bonnes sans mauvaise = demi-point (ambre, « il manque des réponses ») ; une mauvaise cochée = faux ;
  l'énoncé affiche « plusieurs réponses possibles ». Couvrir de tests avant d'ouvrir, y compris en
  évaluation notée corrigée par le serveur.
