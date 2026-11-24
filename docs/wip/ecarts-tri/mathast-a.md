# Lot mathast-a : 19 points (39 blocs)

Sondes : chemin de l'Atelier (`runInput` avec `new Atelier()` et `new WebReplEngine()`), sonde vitest jetable `tests/ecarts/_sonde-mathast-a.test.ts` (supprimée), le 2026-11-24. Les saisies sont écrites telles que tapées ; « rendu » = le champ `latex` de la réponse, « bouton » = le champ `alternative`.

| verdict      | nombre |
| ------------ | -----: |
| VRAI         |     27 |
| CORRIGÉ      |      5 |
| FAUX         |      0 |
| PAS UN ÉCART |      5 |
| NON VÉRIFIÉ  |      2 |

Aucun DOUBLON : les lignes mathAST du registre (V17, V34, V35, V39, V40, V48, V64, L15, L25, L28 bis) portent sur d'autres sujets.

## Points

### mathast/README.md:1808 a [V] — PAS UN ÉCART

- **Point** : `.developper (x+1)/π` → `x/π + 1/π`.
- **Vu** : `.developper \frac{x+1}{\pi}` rend `\dfrac{x}{\pi} + \dfrac{1}{\pi}`, une étape « On distribue 1/π ». Écriture juste et usuelle ; la doc dit déjà que c'est voulu (coefficient devant seulement pour un dénominateur entier).

### mathast/README.md:1808 b [V] — CORRIGÉ

- **Point** : `√8(x+1)` développé garde `√8`.
- **Vu** : `.developper \sqrt{8}(x+1)` rend `2 \sqrt{2} x + 2 \sqrt{2}`. La doc (« `√8` seul reste écrit ») est périmée.

### mathast/README.md:1808 c [V] — VRAI

- **Point** : `x(1/x − 1)` → `−x + x/x`.
- **Vu** : `.developper x(\frac{1}{x}-1)` rend `-x + \dfrac{x}{x}` ; le bouton « Simplifier pour x ≠ 0 » donne `-x + 1`.
- **Registre** : V · mathAST · développer x(1/x − 1) affiche −x + x/x, la fraction x/x reste sur la ligne (seul le bouton « pour x ≠ 0 » donne −x + 1) · preuve : test à écrire, `run('.developper x(\\frac{1}{x}-1)')` ne contient pas `\dfrac{x}{x}`.

### mathast/README.md:1808 d [V] — VRAI

- **Point** : `√x³√x` se regroupe en `(√x)⁴`.
- **Vu** : `.developper \sqrt{x}^3\sqrt{x}` rend `\sqrt{x}^4` (étape « On calcule chaque terme »). Valeur juste, écriture lourde (x² attendu pour x ≥ 0).
- **Registre** : V · mathAST · développer √x³·√x affiche (√x)⁴ au lieu de x² · preuve : test à écrire, `run('.developper \\sqrt{x}^3\\sqrt{x}')` rend `x^2` (ou garde l'écriture tapée).

### mathast/README.md:1842 a [V] — VRAI

- **Point** : `.factoriser ln(xy) − ln(xy)`, bouton non réduit.
- **Vu** : réponse « Je ne sais pas factoriser « ln(xy)-ln(xy) ». », bouton « Simplifier pour x > 0 et y > 0 » qui donne `\ln(x) + \ln(y) - (\ln(x) + \ln(y))`, avec deux étapes `ln-product` identiques (même ligne avant, même ligne après).
- **Registre** : V · mathAST · factoriser ln(xy) − ln(xy) propose un bouton qui rend ln x + ln y − (ln x + ln y) au lieu de 0, avec la même étape écrite deux fois · preuve : test à écrire, le bouton de `run('.factoriser \\ln(xy)-\\ln(xy)')` a un `latex` qui commence par `0`.

### mathast/README.md:1842 b [V] — VRAI

- **Point** : `.simplifier ln x + ln y − ln(xy)`, bouton « pour xy > 0 » non réduit.
- **Vu** : rendu `\ln(x) + \ln(y) - \ln(xy)` ; bouton « Simplifier pour xy > 0 » → `\ln(x) + \ln(y) - (\ln(x) + \ln(y))`.
- **Registre** : V · mathAST · simplifier ln x + ln y − ln(xy) propose un bouton « pour xy > 0 » qui ne va pas jusqu'à 0 · preuve : test à écrire, le bouton de `run('.simplifier \\ln x+\\ln y-\\ln(xy)')` rend `0`.

### mathast/README.md:1842 c [V] — VRAI

- **Point** : `.simplifier ln(2x) − ln(2x)` garde `ln x − ln x`.
- **Vu** : rendu `\ln(x) - \ln(x)` (la ligne principale, pas un bouton), après des étapes `ln-product`, « au propre », « on enlève la parenthèse », « on réduit ». La réponse affichée n'est pas finie.
- **Registre** : V · mathAST · simplifier ln(2x) − ln(2x) s'arrête sur ln x − ln x au lieu de 0 · preuve : test à écrire, `run('.simplifier \\ln(2x)-\\ln(2x)')` a un `latex` égal à `0` (ou un bouton `0`, la réponse principale sans `\ln`).

### mathast/README.md:1867 a [V] — CORRIGÉ

- **Point** : `.intégrer` à borne décimale mêle les registres (`1/2 e^{0,5} − 1/2`).
- **Vu** : `.intégrer 0.5e^x de 0 à 0.5` rend `\dfrac{\exponentialE^{\dfrac{1}{2}} - 1}{2}` : un seul registre dans le rendu. Seule la sortie texte (non affichée en LaTeX) garde `{1/2}e^0,5-1/2`.

### mathast/README.md:1867 b [V→D] — VRAI

- **Point** : paramètre au dénominateur laissé en fraction.
- **Vu** : `.intégrer 0.5e^{ax} de 0 à 1` rend `\dfrac{\exponentialE^a - 1}{2 a} \quad (a \neq 0)`. Juste ; c'est une écriture à choisir (la doc range ce point sous « à trancher par David »).
- **Question à David** : quand on intègre 0,5·e^{ax} de 0 à 1, l'Atelier écrit (eᵃ − 1)/(2a). Préfères-tu (1) cette fraction unique, (2) ½ × (eᵃ − 1)/a (le coefficient devant), (3) (eᵃ − 1)/(2a) seulement si a est une lettre, ½(eᵃ − 1)/a sinon ?

### mathast/README.md:1870 a [V] — VRAI

- **Point** : `.simplifier x(−eˣ)e` non regroupé.
- **Vu** : rendu `-\exponentialE x \exponentialE^x` (étape « au propre ») ; la forme normale interne est pourtant `−x·e^{x+1}`.
- **Registre** : V · mathAST · simplifier x(−eˣ)e affiche −e·x·eˣ sans regrouper e·eˣ en e^{x+1} · preuve : test à écrire, `run('.simplifier x(-e^x)e')` rend `-x \exponentialE^{x + 1}`.

### mathast/README.md:1870 b [V] — CORRIGÉ

- **Point** : `e^{2x}x/(eˣx)` → `x eˣ / x`.
- **Vu** : `.simplifier \frac{e^{2x}x}{e^xx}` rend `\dfrac{x \exponentialE^{2 x}}{x \exponentialE^x}` (écriture tapée, réordonnée) et un bouton → `\exponentialE^x`. Le `x eˣ / x` décrit n'existe plus. Mais le bouton s'intitule « Simplifier pour e ≠ 0 et x ≠ 0 » : voir « Vu en passant ».

### mathast/README.md:1800 a [L] — PAS UN ÉCART

- **Point** : conventions d'échec des évaluateurs (NaN ou exception), lot 6c non fait.
- **Vu** : aucun fichier de `src/lib/mathAST` ne cite un lot 6c ; c'est un chantier d'harmonisation jamais lancé, pas un défaut observé. À garder comme idée tant qu'aucune entrée ne montre un NaN affiché.

### mathast/README.md:1800 b [L→D] — NON VÉRIFIÉ

- **Point** : signe d'un pôle `1/(−x)` en 0 non tranché.
- **Vu** : pas de sonde rejouable sans savoir quelle sortie (tableau de signes, limite) expose ce signe ; la doc dit « ancienne règle par défaut ».
- **Question à David** : pour 1/(−x) quand x vaut 0, faut-il dire que la fonction « part » vers −∞ à droite de 0 (on regarde le signe du dénominateur, −x) ou laisser la règle actuelle ? Réponses : (1) toujours le signe du dénominateur, (2) garder la règle actuelle, (3) ne rien afficher en 0 (valeur interdite seulement).

### mathast/README.md:1806 [L] — CORRIGÉ

- **Point** : Q29, `(eˣ)²` tapé doit rester tel quel.
- **Vu** : `(e^x)^2` (calcul direct) rend `\left( \exponentialE^x \right)^2`, tel que tapé ; `.simplifier (e^x)^2` rend `\exponentialE^{2 x}` avec l'étape « (aᵐ)ⁿ = aᵐⁿ », ce qui est voulu.

### mathast/README.md:1815 a [L] — VRAI

- **Point** : à plusieurs lettres, une réécriture qui rétrécit le domaine n'a ni bouton ni simplification ; `√x√y → √(xy)` sans note.
- **Vu** : `.simplifier \ln((x+y)z)` rend `\ln( z ( x + y ) )` sans bouton ; `.simplifier \sqrt{x}\sqrt{y}` rend `\sqrt{x} \sqrt{y}` sans note ni bouton.
- **Registre** : L · mathAST · simplifier ln((x+y)z) ne propose aucun bouton « pour … » vers ln(x+y) + ln z · preuve : test à écrire, `run('.simplifier \\ln((x+y)z)')` a un bouton.

### mathast/README.md:1815 b [L] — VRAI

- **Point** : `.simplifier ln(6x) − ln(2x)` s'arrête sur `ln 6 + ln x − (ln 2 + ln x)`.
- **Vu** : rendu `\ln(6) + \ln(x) - (\ln(x) + \ln(2))` ; la forme normale interne vaut `ln 3`.
- **Registre** : V (visible) · mathAST · simplifier ln(6x) − ln(2x) s'arrête sur ln 6 + ln x − (ln x + ln 2) au lieu de ln 3 · preuve : test à écrire, `run('.simplifier \\ln(6x)-\\ln(2x)')` rend `\ln\left( 3 \right)` (en principal ou en bouton).

### mathast/README.md:1815 c [L] — VRAI

- **Point** : bouton de `e^{ln(x²)}` sans étapes.
- **Vu** : `.simplifier e^{\ln(x^2)}` rend l'écriture tapée, bouton « Simplifier pour x ≠ 0 » → `x^2`, sans champ `steps` dans le bouton.
- **Registre** : L · mathAST · le bouton « pour x ≠ 0 » de e^{ln(x²)} donne x² sans aucune étape · preuve : test à écrire, le bouton de `run('.simplifier e^{\\ln(x^2)}')` a des `steps`.

### mathast/README.md:1834 a [L] — VRAI

- **Point** : `cot`, `sec`, `csc`, `arccosh` sans condition écrivable (pas de simplification).
- **Vu** : `.simplifier \cot(x)\sin(x)` rend `\cot(x) \sin(x)` ; `.simplifier \frac{\sin x}{\cos x}\cot(x)` rend `\cot(x) \tan(x)` ; aucun bouton.
- **Registre** : L · mathAST · simplifier cot x · sin x ou tan x · cot x ne propose rien (ni cos x, ni 1 pour les x permis) · preuve : test à écrire, `run('.simplifier \\cot(x)\\sin(x)')` a un bouton vers `\cos`.

### mathast/README.md:1834 b [L→V] — VRAI, VALEUR FAUSSE

- **Point** : `computeDomain(1/(sin x cos x))` rend kπ au lieu de kπ/2.
- **Vu** : `.domaine \frac{1}{\sin x\cos x}` rend `D = \mathbb{R}\setminus\left\{k\pi,\ k\in\mathbb{Z}\right\}`. C'est faux : π/2 est dans l'ensemble annoncé alors que cos(π/2) = 0. La doc dit « aucune valeur fausse » : elle se trompe sur ce point. Lettre corrigée : V.
- **Registre** : V · mathAST · l'ensemble de définition de 1/(sin x cos x) est donné comme ℝ privé des kπ, il oublie les π/2 + kπ où cos x s'annule · preuve : test à écrire, `run('.domaine \\frac{1}{\\sin x\\cos x}')` contient `\dfrac{k\pi}{2}` (ou exclut π/2).

### mathast/README.md:1834 c [L] — VRAI

- **Point** : libellés bruts, conditions redondantes ou portées par le facteur ; `ln(xy) − ln y` sans bouton.
- **Vu** : `.simplifier \ln(\ln(x)y)` : bouton « Simplifier pour ln(x) > 0 et y > 0 » (condition sur le facteur, pas sur x) ; `.simplifier \ln(xy)-\ln y` rend l'écriture tapée sans bouton (forme normale interne `ln x`).
- **Registre** : L · mathAST · simplifier ln(xy) − ln y ne propose aucun bouton vers ln x · preuve : test à écrire, `run('.simplifier \\ln(xy)-\\ln y')` a un bouton qui rend `\ln\left( x \right)`.

### mathast/README.md:1834 d [L] — VRAI

- **Point** : `engineAlternative` ne vérifie pas chaque étape sur l'ensemble annoncé quand le domaine rétrécit.
- **Vu** : `src/lib/atelier/domain-guard.ts:182-189` : `change.narrows || (…)` accepte toutes les étapes dès que la réponse rétrécit le domaine ; la vérification par étape ne joue que pour un domaine qui ne rétrécit pas.
- **Registre** : L · mathAST · aucun effet visible connu, les étapes d'un bouton qui rétrécit le domaine ne sont pas vérifiées une à une · preuve : test à écrire, un calcul dont une étape intermédiaire exige plus que la condition annoncée n'a pas d'étapes dans son bouton.

### mathast/README.md:1845 a [L] — VRAI

- **Point** : `tidy` ne regroupe pas deux termes sous une barre (`1/(1/x) + 1/(1/x)`).
- **Vu** : `tidy(parseLatex('\frac{1}{\frac{1}{x}}+\frac{1}{\frac{1}{x}}'))` rend l'écriture tapée ; dans l'Atelier, `.simplifier` garde la ligne et propose le bouton « pour x ≠ 0 » → `2 x`.
- **Registre** : L · mathAST · simplifier 1/(1/x) + 1/(1/x) ne regroupe pas en 2/(1/x) sur la ligne (le bouton « pour x ≠ 0 » donne 2x) · preuve : test à écrire, `toLatex(tidy(parseLatex(...)))` ne contient plus `+`.

### mathast/README.md:1845 b [L] — VRAI, ATELIER BLOQUÉ 12 s

- **Point** : `exp(10000000 ln 2)` sans plafond.
- **Vu** : `.simplifier \exp(10000000\ln 2)` met **12,6 s** et rend l'entier 2^10000000 en clair (des millions de chiffres) ; `.simplifier e^{10000000\ln 2}` rend `2^10000000` mais met 1,4 s (la forme normale calcule quand même l'entier). Le plafond `MAX_EXACT_LOG_COEFFICIENT` (`src/lib/mathAST/normal/normalize.ts:1997`, `:2025`) ne couvre que `e^{k ln a}` dans `splitRationalLogs`.
- **Registre** : V · mathAST · simplifier exp(10000000 ln 2) fige l'Atelier une douzaine de secondes puis affiche un nombre de millions de chiffres · preuve : test à écrire, `run('.simplifier \\exp(10000000\\ln 2)')` répond en moins de 1 s et son `latex` fait moins de 100 caractères.

### mathast/README.md:1845 c [L] — VRAI

- **Point** : `2^{1/3}` et `∛2` ont des formes normales différentes.
- **Vu** : `.simplifier 2^{1/3}-\sqrt[3]{2}` rend `2^{\dfrac{1}{3}} - \sqrt[3]{2}` (forme normale `2^(1/3) + -1·R3:2`), pas `0`.
- **Registre** : L · mathAST · 2^{1/3} − ∛2 ne se simplifie pas en 0, les deux écritures ne sont pas reconnues égales · preuve : test à écrire, `run('.simplifier 2^{1/3}-\\sqrt[3]{2}')` rend `0`.

### mathast/README.md:1845 d [L] — VRAI

- **Point** : Q14, `√2 − √3 − 1` s'écrit `√2 − 1 − √3`.
- **Vu** : `.simplifier \sqrt2-\sqrt3-1` rend `\sqrt{2} - 1 - \sqrt{3}`, avec une étape intitulée « On range par degré décroissant » et l'explication « On range les termes par puissances décroissantes de x » (il n'y a pas de x).
- **Registre** : V · mathAST · simplifier √2 − √3 − 1 réordonne en √2 − 1 − √3 avec une étape « par puissances décroissantes de x » sans x · preuve : test à écrire, `run('.simplifier \\sqrt2-\\sqrt3-1')` n'a aucune étape `tidy-sort-terms`.

### mathast/README.md:1856 a [L] — VRAI

- **Point** : `.simplifier cos(0.5π)x` → `0` sans étape.
- **Vu** : rendu `0`, aucun champ `steps`.
- **Registre** : L · mathAST · simplifier cos(0,5π)x donne 0 sans aucune étape · preuve : test à écrire, `run('.simplifier \\cos(0.5\\pi)x')` a des `steps`.

### mathast/README.md:1856 b [L] — CORRIGÉ

- **Point** : `cos(−π/3)` refusé comme écriture mélangée.
- **Vu** : `\cos(\frac{-\pi}{3})` rend `\dfrac{1}{2}` ; `.simplifier \cos(\frac{-\pi}{3})` rend `\dfrac{1}{2}` en deux étapes (période → `cos(5π/3)`, valeur remarquable). Plus de refus.

### mathast/README.md:1858 a [L] — VRAI

- **Point** : `sin(−(π/6))` n'atteint pas la valeur.
- **Vu** : `.simplifier \sin(-(\pi/6))` rend `-\sin\left( \left( \pi / 6 \right) \right)` (double parenthèse visible), pas `-\dfrac{1}{2}`.
- **Registre** : V · mathAST · simplifier sin(−(π/6)) s'arrête sur −sin((π/6)) avec une double parenthèse, sans donner −1/2 · preuve : test à écrire, `run('.simplifier \\sin(-(\\pi/6))')` rend `-\dfrac{1}{2}`.

### mathast/README.md:1858 b [L] — VRAI

- **Point** : l'étape réunie de `withValuesTogether` montre la ligne entière, une période y passe sans être nommée.
- **Vu** : `.simplifier \sin(\pi/3)+\cos(\pi/6)+\tan(7\pi/3)` : étape 1 « valeurs remarquables sin et cos » où `tan(7π/3)` devient déjà `tan(π/3)` ; étape 2 « tan est π-périodique » montre exactement la même transformation (même avant, même après).
- **Registre** : V · mathAST · dans sin(π/3) + cos(π/6) + tan(7π/3), la période de tan est faite dans l'étape des valeurs de sin et cos, puis l'étape suivante répète la même ligne · preuve : test à écrire, deux étapes consécutives de `run(...)` n'ont jamais le même `expressionLatex`.

### mathast/README.md:1858 c [L] — VRAI

- **Point** : `cos(30° + 30°)` devient `cos(60°)` sans que la valeur suive.
- **Vu** : `.simplifier \cos(30°+30°)` rend `\cos\left( 60{}^{\circ} \right)` (la sortie texte, elle, vaut `1/2`).
- **Registre** : V · mathAST · simplifier cos(30° + 30°) s'arrête sur cos(60°) au lieu de 1/2 · preuve : test à écrire, `run('.simplifier \\cos(30°+30°)')` rend `\dfrac{1}{2}`.

### mathast/README.md:1796 [D] — NON VÉRIFIÉ

- **Point** : bascule des modèles existants vers la correction automatique, « plus tard ».
- **Vu** : le champ des étapes générées existe (`src/lib/components/QuestionTemplateForm.svelte`, `src/lib/worksheets/serie-automatismes.ts`) ; combien de modèles l'utilisent demande la base (prod). Décision de report déjà prise.
- **Question à David** : les modèles de questions écrits avant la correction automatique gardent leur correction tapée à la main. Exemple : un modèle « développer 3(x + 2) » a une correction écrite, alors qu'un neuf aurait les étapes du moteur. Veux-tu (1) les basculer tous d'un coup, (2) au fil des relectures, (3) ne jamais y toucher ?

### mathast/README.md:1798 [D] — VRAI

- **Point** : `pnpm math` à brancher sur l'Atelier ; aujourd'hui les deux divergent.
- **Vu** : `package.json:126` : `"math": "tsx src/lib/mathAST/cli/cli.ts"`, pas le chemin `runInput` de l'Atelier.
- **Registre** : D · mathAST · la console `pnpm math` ne répond pas comme l'Atelier · preuve : commande `test -f package.json && ! grep -q '"math": "tsx src/lib/mathAST/cli/cli.ts"' package.json` (sortie 1 aujourd'hui).
- **Question à David** : en ligne de commande, `pnpm math` peut donner une autre réponse que l'Atelier pour la même saisie (par exemple un calcul simplifié d'un côté et laissé tel quel de l'autre). Veux-tu (1) brancher `pnpm math` sur l'Atelier, (2) la supprimer, (3) la garder telle quelle en la marquant « outil de développeur, ne fait pas foi » ?

### mathast/README.md:1804 [D] — PAS UN ÉCART

- **Point** : `tidy` dans `evaluate` (option B possible plus tard).
- **Vu** : option A en place : `src/lib/mathAST/eval/exact-value.ts:16,116` (valeur exacte à afficher, passée par `tidy`) ; `eval/evaluate.ts` n'importe pas `tidy`. Idée d'évolution, sans défaut.

### mathast/README.md:1851 [D] — VRAI

- **Point** : `.domaine 1/(x − cos(π/3))` rend `ℝ \ {cos(π/3)}`, `ℝ \ {1/2}` voulu plus tard.
- **Vu** : rendu `D = \mathbb{R} \setminus \left\{\cos\left( \pi / 3 \right)\right\}`.
- **Registre** : D · mathAST · l'ensemble de définition de 1/(x − cos(π/3)) garde cos(π/3) au lieu de 1/2 · preuve : test à écrire, `run('.domaine \\frac{1}{x-\\cos(\\pi/3)})` contient `\dfrac{1}{2}`.
- **Question à David** : tu as voulu « plus tard » ℝ \ {1/2} au lieu de ℝ \ {cos(π/3)}. On le fait maintenant (1), on le laisse en attente (2), ou on garde cos(π/3) qui suit la saisie (3) ?

### mathast/README.md:1853 [D] — VRAI

- **Point** : corrections d'exercices de résolution sans l'étape de valeur remarquable.
- **Vu** : `generateRemarkableValueSteps` n'est appelé que par `src/lib/atelier/solve-steps.ts:274` ; ni `src/lib/questions/generator/correction-generator.ts` ni `src/lib/mathAST/pedagogical-solve/` ne l'appellent.
- **Registre** : D · mathAST · la correction d'un exercice « résoudre cos(π/3)x = 1 » ne passe pas par cos(π/3) = 1/2, alors que l'Atelier le fait · preuve : commande `test -f src/lib/questions/generator/correction-generator.ts && grep -rq "generateRemarkableValueSteps" src/lib/questions/generator/correction-generator.ts src/lib/mathAST/pedagogical-solve` (sortie 1 aujourd'hui).
- **Question à David** : dans l'Atelier, « résoudre cos(π/3)x = 1 » commence par remplacer cos(π/3) par 1/2 ; dans la correction d'un exercice, cette étape manque. Faut-il (1) l'ajouter aux corrections, (2) la garder pour l'Atelier seul ?

### mathast/README.md:1863 [C→V] — VRAI

- **Point** : `.résoudre cos(π/5) x = 1` titre « On divise par cos(1/5 π) ».
- **Vu** : `.résoudre \cos(\pi/5)x=1` : étape `divide-both-sides` « On divise les deux membres par $\cos\left( \dfrac{1}{5}\pi \right)$ » ; la solution rendue est juste (`\dfrac{1}{\cos( \dfrac{\pi}{5} )}`). Lettre corrigée : V (le titre est vu par l'élève, ce n'est pas un commentaire).
- **Registre** : V · mathAST · en résolvant cos(π/5)x = 1, l'étape annonce « On divise par cos(1/5 π) » au lieu de cos(π/5) · preuve : test à écrire, le titre de l'étape `divide-both-sides` de `run('.résoudre \\cos(\\pi/5)x=1')` contient `\dfrac{\pi}{5}`.

### mathast/pattern-matching.md:264 a [L] — VRAI

- **Point** : `sqrt-product` ne regarde pas encore `power`.
- **Vu** : `src/lib/mathAST/pattern/rule-sets/sqrt.ts:52-58` : `isPlainSqrt` exige `base === undefined` mais ne teste pas `power`, alors que `sqrt.ts:123` (règles sœurs) refuse une racine avec `power`. Aucun effet visible mesuré : le parseur lit `\sqrt{x}^3` en nœud `superscript`, pas en `function.power` ; `.simplifier \sqrt{x}^3\sqrt{y}` rend `\sqrt{x}^3 \sqrt{y}`, sans fusion fausse.
- **Registre** : L · mathAST · aucun effet visible, la règle √a·√b = √(ab) ne vérifie pas qu'une racine n'est pas élevée à une puissance · preuve : commande `test -f src/lib/mathAST/pattern/rule-sets/sqrt.ts && sed -n 52,59p src/lib/mathAST/pattern/rule-sets/sqrt.ts | grep -q "power"` (sortie 1 aujourd'hui).

### mathast/pattern-matching.md:264 b [L] — PAS UN ÉCART

- **Point** : `\exp(x)` hors des motifs `ln-exp`.
- **Vu** : les motifs restent aveugles à `exp` (limite assumée, la doc le dit), mais `.simplifier \ln(\exp(x))` rend `x` par la règle `ln-exp-inverse` (`expFunctionRules`). Le calcul direct `\ln(\exp(x))` garde l'écriture, ce qui est le comportement voulu sans commande.

### mathast/pattern-matching.md:275 [L] — PAS UN ÉCART

- **Point** : coût combinatoire de `P.sum` / `P.prod` sur de longues sommes (pas de mémoïsation).
- **Vu** : aucune mémoïsation dans `src/lib/mathAST/pattern/` (grep `memo|cache` vide). Limite connue sans entrée réelle mesurée ; le cas lent connu (factoriser 30 termes) est déjà au registre (L25).

## Vu en passant

- `.simplifier \frac{e^{2x}x}{e^xx}` : le bouton s'intitule « Simplifier pour e ≠ 0 et x ≠ 0 », une condition posée sur le nombre e (constante d'Euler, toujours non nul). Défaut visible, à inscrire (V · mathAST · test : le libellé du bouton ne contient pas `e ≠ 0`).
- `.simplifier \frac{1}{x}\cdot\frac{1}{0}` rend `\dfrac{1}{x 0}` (sortie texte vide) au lieu d'un refus « division par 0 ».
- `.simplifier \sqrt{2}^3\sqrt{3}` rend `2 \sqrt{2} \sqrt{3}` au lieu de `2\sqrt{6}` (forme normale interne `2·√6`).
- `.intégrer 0.5e^x de 0 à 0.5` : la sortie texte garde `{1/2}e^0,5-1/2` alors que le rendu LaTeX est `(e^{1/2} − 1)/2`.
