# Chantier `calcul-aligne` — calculs et raisonnements alignés dans les blocs `$$`

## Reprendre ici

_Mis à jour le 2026-11-06, après #2422._

- **État** : #2410 puis #2422 mergées (calcul **centré** `array{rcl}`, revue traitée) ; rien en prod tant que David ne lance pas `deploy:prod` · **Prochaine action** : PR à part « éditeur inactif plusieurs secondes » (état « chargement » visible + MathLive chargé plus tôt, accord de David le 2026-11-06 — voir Journal) · **En attente de David** : essai du calcul centré (5176) ; bouton = 1 ligne (fait) ou 2 vides, pas tranché ; regarder ou non le cahier de texte de la démo sans formules · **Pièges en cours** : voir « Pièges » · **Worktree / branche** : `../ubumaths-wt-calcul-aligne` sur `fix/calcul-aligne-relations` (mergée, distante supprimée) — gardé pour le serveur de test 5176 ; la PR suivante y part d'une nouvelle branche depuis `origin/main`

## Décisions de David (2026-11-06)

- **Relation centrée dans sa colonne** : `\begin{array}{rcl}` (gauche alignée à droite, relation centrée, droite alignée à gauche), proposé par David après l'essai (un ⇒ tapé à la place d'un ⇔ décalait la ligne). Les raccourcis `=>` → `\implies` envisagés avant sont abandonnés.
- **Cmd+Entrée dans un bloc `aligned` existant le convertit** en calcul centré (option a).

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
- `aligned` à 3 colonnes (`a &\iff& b`) ne centre pas : ses colonnes alternent droite / gauche / droite → `array{rcl}`.
- Dans un `array` MathLive : Retour arrière au début d'une cellule ne fait **rien** (ne passe pas à la précédente), **Tab sort du champ** → `effacerRelation` et `rangerRelation`.
- MathLive affiche `\implies` **sans** les espaces de `\iff` (KaTeX les met) : ne pas compter sur `\implies` pour égaliser les largeurs.

## Journal

- 2026-11-05 — phase 0 validée ; `calcul-aligne.ts` (pur) + câblage `MathBlock` + bouton ; tests : 23 purs, 7 chaîne (aller-retour, rendu, PDF), 5 navigateur (preuve rouge faite sans le câblage).
- 2026-11-05 — PR #2410. Revue : (1) marqueur retiré avec l'espace → `\alpha x` soudé en `\alphax` → `sansMarqueur` garde l'espace entre commande et lettre ; (2) Retour arrière sur une sélection n'effaçait qu'un caractère quand une ligne vide existait → laissé à MathLive si sélection ; (3) `[0,1)` faisait perdre la coupure → parenthèses comptées à part, jamais sous zéro ; (4) `try/finally` : jamais de marqueur oublié. Tests ajoutés (rouges vérifiés).
- 2026-11-06 — Essai de David sur `/demo/editeur` (5176). (1) Changer la relation d'une nouvelle ligne (⇔ → ⇒) décalait la ligne : le LaTeX était juste, mais `aligned` aligne sur le bord gauche des flèches, de largeurs différentes. → calcul centré `array{rcl}` (`ajouterLigne` convertit, `effacerRelation`, `rangerRelation`, PDF : `generateMathBlock` envoie `array{rcl}` à la grille). Tests : 44 purs, 10 chaîne, 8 navigateur dont le scénario de David (preuve rouge faite sans le câblage). (2) « L'éditeur ne réagit pas » : **pas lié au chantier** — `RichTextEditor` n'est créé qu'après `await import('mathlive')` (ligne de 2025-12-16) ; en dev, MathLive non minifié (1,3 Mo) + ~250 modules → plusieurs secondes où la barre est là sans éditeur. David d'accord pour une PR à part : état « chargement » visible + MathLive chargé plus tôt. (3) Vu au passage : la section « cahier de texte » de la démo n'affiche aucune formule (déjà le cas avant ce chantier) — à signaler à David.
- 2026-11-06 — PR #2422, revue `code-reviewer` (3 importants, 2 mineurs, tous traités) : (1) ligne déjà remplie, Retour arrière puis `=>` : le `=` était rangé aussitôt, le `>` tombait à droite → rien tant que l'atome avant le curseur est une relation (`relationEnCours`, lu par `getValue` sans poser de marqueur), rangement au `blur` sinon ; (2) `\subset` / `\in` au milieu rabaissés à droite → milieu gardé tel quel ; (3) PDF : relation hors motif (`\approx`, `\subset`) → la 2e cellule d'un `array{rcl}` est prise telle quelle ; (4) `\left(0;1\right]` bloquait la coupure → délimiteur de `\left`/`\right` non compté ; (5) états avec marqueur poussés dans ProseMirror → `synchroniser` les ignore. Tests : 49 purs, 11 chaîne, 9 navigateur (preuve rouge du scénario (1) faite).
- 2026-11-06 — Éditeur « inactif » de David : **cause trouvée**, il ouvrait 5176 par **tunnel SSH depuis son MacBook** ; en dev ~250 modules + MathLive non minifié (4,3 Mo) traversent le tunnel (en local : 59 ms / 140 ms). Pas un bug. Reste éventuel pour la PR « éditeur lent » : message si `import('mathlive')` échoue (l'IIFE de `RichTextEditor` n'a aucun `catch`) + état « chargement » — question posée à David.
- 2026-11-06 — PR « éditeur : chargement et échec » (`fix/editeur-chargement`), demandée par David malgré la cause trouvée (tunnel). Constat en codant : `RichTextEditor` importait DÉJÀ MathLive statiquement (`import 'mathlive'`) → « charger MathLive plus tôt » ne gagnait rien, abandonné ; le `await import('mathlive')` est retiré, l'éditeur naît au montage (synchrone). État `chargement` (`en-cours` / `pret` / `erreur`) : barre `inert` tant qu'il n'est pas prêt, « Chargement de l'éditeur… », et en cas d'exception « L'éditeur n'a pas pu se charger » + « Recharger la page ». `/demo/editeur` n'est pas rendu côté serveur : l'indicateur ne se voit qu'un instant. Tests : `RichTextEditor-chargement` (1), `RichTextEditor-echec` (1, `vi.mock` d'`editor-config` ; TipTap ne lève pas sur un nœud inconnu, il avertit et repart vide).
- 2026-11-06 — PR #2423, revue `code-reviewer` : (1) **bloquant** — l'import nommé `{ MathfieldElement } from 'mathlive'` casse le SSR en build (condition `node` → `mathlive-ssr.min.mjs`, qui ne l'exporte pas ; vu par `node -e`, invisible en dev et en tests) → retour à `import 'mathlive'` + `import type`, classe lue par `customElements.get('math-field')` ; garde `mathlive-imports-ssr.test.ts` (tout nom importé de `mathlive` existe dans la version serveur ; rouge vérifié sur l'ancien commit) ; (2) région `role="status"` permanente ; (3) bouton markdown désactivé tant que l'éditeur n'est pas prêt, alerte au-dessus (`z-20`).
