# Rédiger une correction (mode A) — style maison et couleurs

Une correction en mode A est une liste `correction.steps` de chaînes markdown, rendues dans l'ordre.
Style relevé sur les 176 corrections relues (`data/relecture/**/*.json`) :

- **le calcul** dans un bloc aligné, une égalité par ligne, alignement sur `&=` :
  `$$\begin{align} A &= B \\ &= C \\ &= {{solution}} \end{align}$$` ;
- **l'explication** en prose, dans une étape séparée du calcul ;
- les nombres tirés `{{a}}`, les valeurs calculées `{{eval:…}}`, la réponse attendue `{{solution}}`
  (celle de la case, ou le texte du bon choix d'un QCM) ;
- un choix selon les nombres tirés : `{{if:condition|alors|sinon}}` (résolu à la génération ; une
  condition qui ne porte pas sur les variables reste au navigateur).

Pièges vérifiés le 2026-09-29 : `{{expression1}}` rend l'expression **brute** (`(-3)*2`), pas du
LaTeX — écrire le calcul à la main ; un `{{eval}}` ne s'imbrique pas dans un autre ; `mod(a*10+7,10)`
échoue (la virgule est lue comme décimale) → `mod((a*10+7),10)`. Une variable `e` est la constante
d'Euler dans un `{{if:…}}` (même écrite `{{e}}`) ; une condition qui nomme une variable
d'expression n'est pas évaluée à la génération ; une formule `$…$` entière est relue en syntaxe
maison (`$1/5 = …$` devient `\dfrac{1}{5}`), pas un bloc `align` ; `\hline` est refusé par
MathLive (tableau : `\begin{array}{|c|c|}` sans `\hline`).

## Couleurs : trois rôles, pas plus

| Rôle                   | Couleur              | Ce qu'elle désigne                                                               |
| ---------------------- | -------------------- | -------------------------------------------------------------------------------- |
| ce que l'on transforme | `primary.0` (orange) | le nombre qu'on décompose et ses morceaux ; les signes « − » que l'on regarde    |
| l'étape intermédiaire  | `primary.1` (bleu)   | la dizaine atteinte ; « même signe / signes contraires » ; le compte de négatifs |
| ce que l'on conclut    | `primary.2` (vert)   | le signe du résultat, le choix de QCM                                            |

La réponse finale `{{solution}}` reste **en noir** (usage des corrections existantes). Écriture :
`\textcolor{{{color:primary.0}}}{…}` (palettes : `src/lib/questions/colors.ts`). Une couleur garde
le même rôle dans la prose et dans le calcul d'une même correction.

### Exemple 1 — R-PASS, compléter à la dizaine (`26 + 5`)

```text
On complète $26$ à la dizaine : il manque $\textcolor{{{color:primary.0}}}{4}$ pour arriver à
$\textcolor{{{color:primary.1}}}{30}$. On décompose donc $\textcolor{{{color:primary.0}}}{5}$ en
$\textcolor{{{color:primary.0}}}{4} + \textcolor{{{color:primary.0}}}{1}$.

$$\begin{align} 26 + \textcolor{…0}{5} &= 26 + \textcolor{…0}{4} + \textcolor{…0}{1}
\\ &= \textcolor{…1}{30} + 1 \\ &= 31 \end{align}$$
```

### Exemple 2 — N-SIGNES, produit de relatifs (`(−3) × 2`)

```text
**Règle des signes.** Le produit de deux nombres de même signe est positif ; le produit de deux
nombres de signes contraires est négatif.

$\textcolor{…0}{-}3$ est négatif et $2$ est positif : ils sont de
$\textcolor{…1}{\text{signes contraires}}$, donc le produit est $\textcolor{…2}{\text{négatif}}$.

$$\begin{align} \left( \textcolor{…0}{-}3 \right) \times 2 &= \textcolor{…2}{-}\left( 3 \times 2 \right)
\\ &= -6 \end{align}$$
```

(`…0` abrège `{{color:primary.0}}`.) Rendus réels, sur 3 tirages par modèle :
[data/corrections/pilote/APERCU.md](../../data/corrections/pilote/APERCU.md).

## Outil : `scripts/corrections/`

Mode « 2b » : l'outil écrit **une fois** un texte à variables dans le modèle ; l'auteur le retouche
ensuite dans l'éditeur. Aucun mécanisme nouveau à l'exécution.

```bash
pnpm corrections:generate pilote                  # lit les modèles en prod (lecture seule) → data/corrections/pilote/
pnpm corrections:generate pilote --source x.json  # ou depuis un JSON local ; --source snapshot = instantané présent
pnpm corrections:check pilote                     # domaine entier ou 5 000 graines, rapport par modèle
pnpm corrections:preview pilote                   # APERCU.md, 3 tirages rendus par modèle
pnpm corrections:import pilote                    # SIMULATION ; --publier écrit, après feu vert seulement
```

- Un **lot** (`scripts/corrections/lots/<lot>.ts`) liste les modèles, leur classe et leur code.
  Stratégie **R** : générée depuis la variable d'expression (`lib/r-pass.ts`) ; règle **N** : rédigée
  dans le lot, au même format.
- Sortie : `data/corrections/<lot>/_modeles.json` (instantané), une proposition `<id>.json` par
  modèle (`{ templateId, title, classe, code, source, steps: { shared } | { byVariation }, notes }`),
  `APERCU.md`.
- `corrections:check` tire chaque variation sur **tout son domaine** quand il compte au plus 20 000
  combinaisons (intervalles, bornes dépendantes, unions, listes, `;±`), sinon sur 5 000 graines (le
  rapport dit lequel et pourquoi) ; il rougit si : un `{{` ou `<<` survit, le LaTeX est invalide pour
  MathLive, un calcul écrit `+ 0` ou `+ -3`, une égalité d'un `align` est fausse, **un membre ne se
  lit pas comme un nombre** (seule exception : `?` en tête d'une question à trou, suivi de la réponse
  attendue), le calcul **ne part pas de l'opération posée** ou ne finit pas sur la réponse de la case,
  ou la conclusion d'un QCM ne nomme pas le bon choix (ou en nomme un mauvais) — comme un mot ou un
  nombre entier : « 3 » n'est nommé ni dans « 13 » ni dans « 3,5 » ; pour un trou : `? = calcul =
réponse`, et la valeur trouvée vérifie l'égalité posée ; plusieurs cases : chacune finit un
  calcul ; hors calcul : ni `NaN` / `undefined`, ni égalité numérique fausse dans la prose.
- Les branches `{{if:…}}` d'une stratégie R sont choisies sur le même domaine entier.
- L'instantané `_modeles.json` ne contient aucun identifiant d'utilisateur (`created_by`…).
- `corrections:import` écarte un modèle modifié en prod depuis l'instantané (`updated_at`), une
  variation qui a déjà une correction, une proposition rouge ; avec `--publier`, **une seule entrée
  écartée fait refuser le lot entier** (rien n'est écrit) ; l'écriture relit la ligne rendue.
- Règles N rédigées : `lots/signes.ts` (N-SIGNES), `lots/numeration.ts` (briques des lots
  `n-decomp.ts` et `n-fracdec.ts`, N-DECOMP, N-FRACDEC :
  tableau de numération, chiffre et valeur en orange, zéros ajoutés en bleu).
- Stratégies générées : `R-PASS` (`lib/r-pass.ts`), `R-INV` (`lib/r-inv.ts` : `a + ? = s → ? = s − a`,
  `a × ? = s → ? = s : a`, `? : a = s → ? = s × a`…).

Vérifié contre le code le 2026-10-10.
