# Chantier `calcul-aligne` — calculs et raisonnements alignés dans les blocs `$$`

## Reprendre ici

_Mis à jour le 2026-11-05, PR #2410 ouverte, revue traitée._

- **État** : PR #2410 ouverte, revue `code-reviewer` traitée (4 findings corrigés) · **Prochaine action** : CI verte → merge ; essai par David dans l'éditeur de correction · **À trancher par David** : bouton = 1 ligne (au lieu de 2 vides) · **En attente de David** : essai réel (Cmd+Entrée dans un bloc, bouton « Calcul aligné ») · **Pièges en cours** : voir « Pièges » · **Worktree / branche** : `../ubumaths-wt-calcul-aligne` · `feat/calcul-aligne`

## Décisions de David (2026-11-05)

- Deux gestes : raccourci **Cmd/Ctrl/Alt+Entrée** dans un bloc `$$` + bouton **« Calcul aligné »** dans la section « Formule » du menu.
- Mise en page **centrée** (le bloc reste centré, ses lignes s'alignent entre elles).
- Coupure (le `&`) : **premier connecteur logique** (⇔, ⇒, ⇐) hors parenthèses, sinon **première relation** (=, <, ≤, >, ≥, ≠, ≈). La nouvelle ligne reprend la relation de la ligne du dessus.
- « ou » / « et » tapés dans un bloc deviennent des mots droits — dans **ce** chantier, **blocs seulement** (pas les formules en ligne, pas les champs de réponse élève).

## Phase 0 — comportements

Nominal : 1 bouton (bloc aligné, curseur dedans) · 2 Cmd+Entrée sur un bloc simple → aligné, coupé · 3 Cmd+Entrée sur un aligné → ligne sous le curseur, relation reprise · 4 rendu élève centré, aligné · 5 PDF aligné (grille Typst existante) · 6 aller-retour markdown identique.
Limites : 7 sans relation → aligné à gauche · 8 formule en ligne `$…$` inchangée · 9 bloc vide → deux lignes vides · 10 ligne vide + Retour arrière → retirée.
Erreur : 11 LaTeX mal formé tapé à la main → rien ne casse (le bloc n'est pas reconnu comme aligné : traité comme une formule simple).

**Écart à signaler à David** : le bouton insère **une** ligne (et non deux vides) ; Cmd+Entrée découpe ensuite la ligne tapée. Deux lignes vides obligeaient à taper `=7` dans la cellule de gauche, mal alignée.

## Pièges (mesurés en navigateur, MathLive 0.111)

- `addRowAfter` natif de MathLive, curseur en fin de champ : enveloppe tout dans `\displaylines{…}` → la touche est interceptée en capture, avant MathLive.
- Retour arrière sur une ligne vide : MathLive ne la retire jamais → `retirerLigneVide`.
- `\text{ ou }` en raccourci laisse MathLive **en mode texte** (toute la suite s'y écrit) → `\:\mathrm{ou}\:`. Typst : `upright(o u)`, rendu « ou ».
- `typedText` (frappe simulée) applique mal les raccourcis : tester avec `userEvent.keyboard`, après une pause de ~300 ms au clic.
- Curseur repéré par un marqueur `\maltese` inséré puis retiré (MathLive n'expose pas la ligne du curseur).
- Dans une commande TipTap, `editor.state` n'a pas encore l'insertion : lire `tr.doc` / `tr.selection`.

## Journal

- 2026-11-05 — phase 0 validée ; `calcul-aligne.ts` (pur) + câblage `MathBlock` + bouton ; tests : 23 purs, 7 chaîne (aller-retour, rendu, PDF), 5 navigateur (preuve rouge faite sans le câblage).
- 2026-11-05 — PR #2410. Revue : (1) marqueur retiré avec l'espace → `\alpha x` soudé en `\alphax` → `sansMarqueur` garde l'espace entre commande et lettre ; (2) Retour arrière sur une sélection n'effaçait qu'un caractère quand une ligne vide existait → laissé à MathLive si sélection ; (3) `[0,1)` faisait perdre la coupure → parenthèses comptées à part, jamais sous zéro ; (4) `try/finally` : jamais de marqueur oublié. Tests ajoutés (rouges vérifiés).
