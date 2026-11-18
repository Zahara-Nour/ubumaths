# Mises à jour des dépendances — journal du chantier

## Reprendre ici

_Mis à jour le 2026-11-18, après #2814._

- **État** : PR 1 mergée (#2814) : SvelteKit 2.70.4, ferme les 2 alertes qui nous concernent. Pas encore en prod.
- **Prochaine action** : PR 2, SvelteKit 3 + adapter-vercel 7 : nouveau worktree, lire les changements cassants de la 3.0 d'abord, vérifier les 2 faibles (`use:enhance`, pages prérendues).
- **En attente de David** : `deploy:prod` pour livrer #2814, quand il le voudra.
- **Pièges en cours** : dépendances retenues exprès (mémoire `project_dependances-epinglees`) ; `minimumReleaseAge` 3 j, ne jamais le contourner.
- **Worktree / branche** : aucun (supprimés après #2814).

## Origine

Après le `deploy:prod` v0.95.0 (2026-11-18), GitHub signale 11 failles dans les dépendances (3 graves, 4 moyennes, 4 faibles). David : « ouvre un chantier mises à jour ».

## Décisions de David

- 2026-11-18 : **choix 1** — SvelteKit 2.70.4 d'abord (ferme les 2 alertes qui nous concernent), SvelteKit 3 ensuite dans une PR à part. Autres montées hors du chantier (lot mensuel de Dependabot).

## Relevé des alertes (2026-11-18)

SvelteKit installé : 2.70.3. Dernières versions : 2.70.4 (2026-11-05), 3.3.1 (2026-11-17).

| Gravité    | Paquet                                                  | Corrigé en     | Nous concerne ?                                                                   |
| ---------- | ------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------- |
| moyenne    | kit (import de module `//…` à la résolution des routes) | 2.70.4         | oui                                                                               |
| moyenne    | kit (adapter-node, `reroute` et URL mal formée)         | 2.70.4         | non (adapter-vercel), corrigé au passage                                          |
| grave ×2   | kit (formulaire des « remote functions »)               | 3.1.1          | non : aucune remote function (`$app/server`, `query.batch` : 0 usage dans `src`)  |
| moyenne ×2 | kit (`query.batch` privées)                             | 3.1.1          | non : même raison                                                                 |
| faible ×2  | kit (redirection par formulaire amélioré)               | 3.0.0          | à voir (`use:enhance`)                                                            |
| faible ×2  | kit (en-tête cache-control d'une page prérendue)        | 3.0.0          | à voir (pages prérendues)                                                         |
| grave      | picomatch 4.0.7 (ReDoS sur des motifs de fichiers)      | aucune version | non : outil de construction seulement (vite → tinyglobby), motifs écrits par nous |

Les « ×2 » = la même faille comptée deux fois (dépendance de dev et d'exécution).

## Autres versions en retard (pnpm outdated, 2026-11-18)

- Mineures : tiptap 3.34, bits-ui 2.21, vite 8.3.8, prettier 3.10 (épinglé), oxlint 1.93, playwright 1.65.1…
- Majeures : kit 3 + adapter-vercel 7, vitest 5 (chemin dans la mémoire `project_vitest-5-chemin`), TypeScript 7, ESLint 10, marked 18, Brevo 6, supabase CLI 3, tailwind-variants 4…

## Historique

- 2026-11-18 : #2814 mergée (CI verte, 16 contrôles) : SvelteKit 2.70.3 → 2.70.4.
