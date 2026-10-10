# 0007 — Un moteur de simplification, quatre intentions

- **Statut** : acceptée — mise en œuvre en cours (voir `docs/wip/tidy-*-progress.md`)
- **Date** : 2026-09-21 · **Décidée par** : David

## Contexte

Le panel (`docs/systeme/mathast/panel-simplifications.md`) a montré 13 écarts sur 51 entre `simplify` et le mode
`auto` de `pedagogical-simplify`. Cause : ce sont **deux moteurs** — `simplify` (`tidy` → `normalize`
sous barrière de coût, a un juge) et `pedagogical-simplify` (règles de motifs par intention, a le
vocabulaire). `pattern/rule-sets/index.ts` le dit : « The `simplify()` pipeline does NOT use these ».

## Décision

**Un seul moteur, quatre politiques sur une seule question : faut-il développer ?**

| Intention    | Politique                              |
| ------------ | -------------------------------------- |
| `réduire`    | jamais développer (= `tidy`)           |
| `développer` | toujours développer, puis `tidy`       |
| `auto`       | développer **seulement si moins cher** |
| `factoriser` | jamais développer, et factoriser       |

- `auto` ≠ `réduire` : sa spec case par case est `docs/systeme/mathast/tidy-spec.md` §C (colonne « attendu »).
- `auto` **ne factorise jamais** : garder `(x+1)²` est de la conservation, produire `(x+1)²` depuis
  `x²+2x+1` répond à une autre consigne.
- `développer` contient `réduire` (« développer et réduire »), l'inverse est faux.
- **Les règles définissent ce qui est atteignable** : ce qu'on ne sait pas expliquer en étapes, on ne
  le fait pas. Les étapes de `normalize` ne sont pas pédagogiques.

## Écarté

- Supprimer `auto` : il a une spec validée.
- Déléguer le développement à `normalize` : ses étapes sont du calcul interne, pas une leçon.

## Conséquences

- `auto` dépend du niveau scolaire (l'inventaire de règles l'est déjà).
- « Développer si moins cher » calcule un candidat et peut le jeter : les étapes vont dans un tampon,
  retenues seulement si le candidat gagne.
- Le décideur n'est **pas** concerné (chemin propre, cf. ADR 0006) : la fusion ne peut pas casser la
  validation des réponses.
- Nom envisagé en dernier : `rewrite(node, { toward: 'reduced' | 'expanded' | 'factored' | 'cleanest' })`.
