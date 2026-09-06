# Erreurs Supabase ignorées — chantier

> ✅ **TERMINÉ le 2026-09-06** — 479 sites → 0. PR #141.
> Suite directe de [typage-locals-supabase-progress.md](typage-locals-supabase-progress.md).

## Le mécanisme

Une requête PostgREST qui échoue **ne lève pas**. Elle rend `data === null` et
remplit `error`. Écrire :

```ts
const { data } = await supabase.from('x').select('*');
const lignes = data ?? [];
```

confond donc « aucune ligne » et « la requête a échoué ». L'écran se rend vide,
sans trace.

Le chantier précédent a branché le générique `Database` : une colonne
inexistante est désormais impossible. Mais il n'oblige pas à lire `error`, et
une policy RLS qui refuse, une contrainte violée ou un réseau qui lâche
produisent exactement le même symptôme.

**Départ : 479 destructurations sans `error`** (362 dans `src/routes`, 117 dans
`src/lib`). **Arrivée : 0.**

## La règle qui empêche la récidive

`eslint-rules/require-supabase-error-check.js`, branchée en `error` sur
`src/**/*.{ts,svelte}` (tests exclus). Elle n'impose **aucun traitement** :
elle exige seulement que l'erreur soit nommée. Ce qu'on en fait reste une
décision de contexte.

## La doctrine appliquée

| Situation                                             | Traitement                                                                          |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Requête dont dépend l'affichage principal             | erreur visible (500 / `fail(500)`), jamais une page vide qui ment                   |
| Requête accessoire (ornement, statistique décorative) | repli conservé, mais **journalisé**                                                 |
| Contrôle d'accès                                      | reste fermé par défaut, mais un refus dû à une panne se distingue d'un refus mérité |
| `.single()` sur zéro ligne                            | `PGRST116` = **absence**, pas panne. Les deux n'appellent pas la même réponse.      |

## Écarts avec conséquence trouvés en chemin

| Écran                            | Ce qu'une panne produisait                                                                          |
| -------------------------------- | --------------------------------------------------------------------------------------------------- |
| Tentatives d'évaluation          | comptage à 0 → l'élève repartait avec son quota entier, autant de fois que la requête échouait      |
| Visibilité des corrections       | l'exception qui masque retombait sur le défaut « visible » → correction dévoilée sur un devoir noté |
| Succès de jeu (2048, Mathemo)    | succès déjà obtenus invisibles → gidouilles créditées une seconde fois                              |
| Consentement parental            | quota d'envois à 0 → les parents pouvaient être relancés sans fin                                   |
| Suppression de compte            | fichiers non listés → les pièces jointes d'un élève mineur survivaient à la suppression             |
| Marché d'échange                 | une carte non résolue disparaît de l'offre → troc falsifié                                          |
| Libération d'une correction      | destinataires réduits en silence → une partie de la classe ne la voit jamais                        |
| Restauration de sauvegarde       | clés étrangères toutes invalides → restauration « réussie » avec zéro ligne                         |
| Énigme du jour                   | l'automate écrasait le choix manuel du professeur                                                   |
| Duplication d'une fiche          | la copie sortait amputée                                                                            |
| Snapshot d'un modèle de chapitre | écrit en base amputé d'une section, hérité par toutes les instanciations                            |
| Réglages du marché               | insertion au lieu de mise à jour → configuration en double                                          |
| Ciblage d'une notification       | le professeur s'entendait reprocher de cibler des classes qui ne sont pas les siennes               |

## Méthode

1. Mesurer d'abord (`eslint` avec la nouvelle règle), corriger par lots
   cohérents, mesurer à nouveau.
2. **Lire chaque site** : le transformateur applique la garde, il ne la choisit
   pas. C'est la lecture qui dit si une panne doit fermer l'écran ou seulement
   laisser une trace.
3. Une simulation de test qui décrit une panne là où elle prétend décrire une
   absence est un test qui ne prouve rien : trois fixtures ont été corrigées
   pour porter `PGRST116`.

## Reste

- La règle ne voit pas les helpers qui rendent `{ data, error }` sans être une
  chaîne Supabase (six routes `chapter-templates` traitées à la main). Étendre
  la règle à ces helpers demanderait de les nommer explicitement.
- `src/lib/server/exercise-assignments.ts` garde `fromUnknownTable(): any` et
  `callUnknownRpc`, écrits pour des « tables de Phase 4 » qui existent
  aujourd'hui. Ce sont les derniers îlots où le générique `Database` est
  désactivé — petit chantier autonome.
