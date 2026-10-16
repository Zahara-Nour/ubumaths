# Conventions — fiches « Loi binomiale », Terminale maths complémentaires (T_COMP), 2026-10-16

Guide de référence (à lire, § 2.3, § 3, § 4, § 5) : `docs/pratiques/fiches-exercices.md` du worktree
`/Users/david/Coding/js/ubumaths-wt-binomiale` (toutes les commandes `pnpm` se lancent depuis ce worktree).

## Public

Terminale **mathématiques complémentaires** : élèves qui ont suivi la spécialité en 1re puis l'ont
abandonnée. Niveau plus modeste que la Terminale spécialité : phrases courtes, questions très
découpées dans les versions guidées, calculs détaillés au corrigé. La **calculatrice** est un outil
du programme (TCOMP-297) : les probabilités binomiales pour n grand se calculent à la calculatrice ;
le corrigé dit ce qu'on tape en termes neutres (« à la calculatrice, avec la loi binomiale
cumulée : $P(X\leqslant 9)\approx 0.8782$ ») sans nommer de marque ni de touche.

## Programme (référentiel en base, rubrique « Probabilités et statistique > Lois discrètes »)

Au programme et dans ce thème :

- TCOMP-286 Épreuve de Bernoulli, loi de Bernoulli : définition, espérance $p$, écart type $\sqrt{p(1-p)}$.
- TCOMP-287 Schéma de Bernoulli, représentation par un arbre.
- TCOMP-288 / 296 Coefficients binomiaux : nombre de chemins à $k$ succès dans un schéma de taille $n$,
  triangle de Pascal, symétrie $\binom{n}{n-k}=\binom{n}{k}$.
- TCOMP-289 / 290 Loi binomiale $\mathcal{B}(n,p)$ : nombre de succès ; $P(X=k)=\binom{n}{k}p^k(1-p)^{n-k}$.
- TCOMP-291 Espérance $np$ et écart type $\sqrt{np(1-p)}$ (admis).
- TCOMP-292 Représentation graphique (diagramme en barres).
- TCOMP-295 Identifier une situation binomiale (ou non).
- TCOMP-297 $P(X=k)$, $P(X\leqslant k)$, etc. à la calculatrice.
- TCOMP-299 Déterminer un intervalle $I$ tel que $P(X\in I)\geqslant 1-\alpha$ (ou une probabilité < α).
- TCOMP-300 Utiliser l'espérance en résolution de problème.
- TCOMP-303 Probabilités dans des répétitions d'expériences.
- TCOMP-239 (analyse) Seuil avec $\ln q^n = n\ln q$.
- Rappels de 1re (connus) : variable aléatoire, loi, espérance, variance, linéarité $E(aX+b)=aE(X)+b$,
  probabilités conditionnelles, arbres, indépendance d'épreuves.

**Hors de ce thème** : loi géométrique, loi uniforme (autres thèmes du même chapitre) — on peut
seulement dire « ce n'est pas une loi binomiale : le nombre d'épreuves n'est pas fixé ».
**Hors programme T_COMP** : la formule $\binom{n}{k}=\frac{n!}{k!(n-k)!}$ et les factorielles
(dénombrement = Terminale spécialité), $V(aX+b)$ n'est pas exigé (ne pas l'utiliser), Bienaymé-Tchebychev,
loi des grands nombres, intervalles de fluctuation « asymptotiques ».

## Notation (décidée)

- Loi : $\mathcal{B}(n\,;p)$ — écrire `$\mathcal{B}(20\,;0.35)$` (point-virgule, décimal avec POINT).
  Bernoulli : « loi de Bernoulli de paramètre $p$ », $\mathcal{B}(p)$ seulement après l'avoir dit.
- Coefficient binomial : `$\binom{5}{2}$` (LaTeX), lu « 2 parmi 5 ».
- Événements : `$\{X = 3\}$`, `$\{X\leqslant 2\}$` ; `\leqslant`, `\geqslant`. Jamais [X = a].
- Succès / échec : $S$ et $\overline{S}$ dans les arbres (bloc ` ```probtree `, étiquettes `S` et `S̄`
  comme dans les fiches de 1re : regarder le modèle).
- Variable aléatoire : X quand c'est « le nombre de succès » générique ; lettre parlante en contexte
  (N nombre de bonnes réponses, G gain, D nombre de défectueux…), jamais P, E, V, ni une lettre d'événement.
- Décimaux : toujours avec un POINT dans le source, dans les deux langues (`$0.35$`). Jamais `0{,}35`.
- Arrondis : probabilités arrondies à $10^{-4}$ (« arrondir à $10^{-4}$ » dans l'énoncé), symbole
  `\approx`. Valeur exacte quand elle est simple ($0.7^4=0.2401$).
- Fractions irréductibles ; `\dfrac` dans le texte.

## Forme

- Thème (topic) en base : « Loi binomiale ». Titres d'exercices **uniques** dans ce thème (les deux
  fiches ensemble), en texte brut (pas de `[`, pas de LaTeX).
- Fiche technique : variation unique `guided` par exercice. Fiche d'applications : `guided`, plus
  `autonomous` là où le plan le demande (mêmes données, 2-3 questions ouvertes, corrigé complet mais direct).
- Listes : `1.` seul sur sa ligne puis `   a. …` ; affichage a) 1) i) ; renvois « question b) 2) »
  cohérents avec l'affichage — RELIRE chaque renvoi.
- JAMAIS de `$$…$$` dans une sous-liste si le modèle ne le fait pas ; `align*` au-delà de ~35
  caractères ou 2 « = » ; jamais `\quad`.
- Tableaux markdown : formules en `$…$`, au plus 6 colonnes de valeurs. Une table de $P(X\leqslant k)$
  pour beaucoup de valeurs de k s'écrit **verticale** (colonnes `$k$` | `$P(X\leqslant k)$`).
- Diagramme d'une loi : bloc ` ```barres ` (voir l'exemple du modèle, `applications/md/PLACEMENTS-guided.md`).
- Arbre : ` ```probtree ` (3 épreuves au plus).
- Illustrations (fiche d'applications seulement, 2 ou 3 au plus) : SVG dessiné à la main → PNG
  1 200 px (Chromium headless de Playwright, voir `gen-svg.mjs` du modèle), fond blanc, version
  `-en.png` s'il y a du texte, fichiers `binom-<sujet>.png` dans `images/`. Dans le texte :
  `![alt](https://cnevnzsvixxpnurautls.supabase.co/storage/v1/object/public/exercise-images/97c1d5e4-5fa0-44ce-be83-ed5467f3a424/binom-<sujet>.png){size=large align=center}`
  sur sa propre ligne, entourée de lignes vides ; alt anglais dans la version anglaise. Une image
  d'énoncé ne donne aucune réponse. (Le script d'écriture en base enverra les PNG.)
- Anglais britannique scolaire, décimales à point, « binomial distribution $\mathcal{B}(n\,;p)$ »,
  « Bernoulli trial », « at least », « at most ».

## Modèle validé à imiter (même chapitre, 1re spé)

`/private/tmp/claude-501/-Users-david-Coding-js-ubumaths/f2116999-53aa-43b1-b92b-02d696355328/scratchpad/va/`
— `technique/` et `applications/` (md, sol, en, sol-en), `images/`, `gen-svg.mjs`. Lire 3 ou 4 exercices
de chaque avant d'écrire : ton, longueur, phrase d'introduction du corrigé (rappel de la méthode),
mise en forme. Ne rien écrire dans ce dossier.

## Disposition de sortie

```
<dossier>/
  plan.json                 sections {id,title,position,en}, exercices {key,section,title,en_title}
  md/<CLÉ>-guided.md (+ -autonomous.md)   énoncés FR
  sol/  en/  sol-en/        mêmes noms
  generic.txt               vide (aucune lettre-fonction)
  verif/assert_all.py       UNE assertion par résultat chiffré des corrigés (Fraction / sympy / math.comb),
                            FR et EN identiques en valeurs ; les arrondis vérifiés contre la valeur exacte
  images/ (applications)    SVG + PNG
```

Python : `python3 -I verif/assert_all.py` (sympy dispo dans
`/private/tmp/claude-501/-Users-david-Coding-js-ubumaths/42af618c-23e6-4765-a2f0-9404109c0d64/scratchpad/venv-sympy/bin/python`).

## Vérifications obligatoires (à rendre)

1. `verif/assert_all.py` passe.
2. `pnpm check:ubumark <dossier>` → 0 problème.
3. `pnpm fiche:verifier <dossier> "<titre de la fiche>"` → vert ; RELIRE les PNG des pages (renvois,
   tableaux, arbres, barres, débords, align*, virgules en anglais).
4. Rendre la liste de tes écarts au plan, et pourquoi.

Ne JAMAIS écrire en base. Ne pas lancer `pnpm check`, `build`, `lint`, ni de serveur. Pas de commit.
