# Chantier `deploy-sans-attente` — journal

## Reprendre ici

_Mis à jour le 2026-11-24, après la mise en prod de v0.106.0._

- **État** : chantier clos, vérifié en vrai, journal archivé · **Prochaine action** : aucune · **En attente de David** : rien · **Pièges en cours** : aucun · **Worktree / branche** : retirés

## Demande (2026-11-23)

David, après la mise en prod de v0.105.0 juste après le merge de #3055 : « pourquoi encore une
CI ? ». Analyse mesurée (300 CI de main depuis le 17/11, 18 versions) :

- CI allégée de main (typecheck et build) : 0 erreur de code sur 300 (1 échec = panne du cache pnpm).
- CI de version (complète) : 0 erreur de code sur 18 (2 annulées ; ce soir une panne GitHub, port 54322).
- `deploy:prod` attendait la CI allégée de main avant de créer la version : 6 mises en prod sur 18
  ont attendu (lancées juste après un merge), ~6 min chaque fois.
- La protection de `main` n'exige pas une branche à jour (`strict: false`) : deux PR mergées à
  quelques minutes d'écart ne sont testées ensemble qu'après le merge.

Options présentées : A (ne plus attendre la CI allégée), B (plus de commit de version, ADR 0021),
rien. **David : A.**

## Fait

- `scripts/deploy-prod.sh` étape 1 : CI de main en cours → la version est créée dessus sans
  attendre (« ⏩ CI allégée en cours… non attendue ») ; CI rouge → arrêt, comme avant. Boucle
  d'attente et contrôle « origin/main a bougé pendant l'attente » retirés (plus d'attente).
- `.github/workflows/quality.yml` : un commit `chore(release): …` a son propre groupe de
  concurrence. Sans ça, sa CI attendait derrière celle du merge (sur `main`, un seul run à la fois,
  sans annulation) et le gain était nul.
- Tests `scripts/__tests__/deploy-prod.test.ts` (vus rouges avant le code), 62 verts.
- Doc : `git-workflow.md` § 5, `environnement-de-dev.md`, amendement de l'ADR 0021.

## Vérifié en vrai (2026-11-23, v0.106.0)

Mise en prod lancée 4 min après le merge de #3058 : « ⏩ CI allégée en cours… non attendue » ;
CI de la version créée à 22:51:48 et démarrée aussitôt (13 jobs), pendant que celle du merge
(22:48:06) tournait encore. v0.106.0 en ligne, 54 chemins répondent.
