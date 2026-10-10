# 0021 — La prod se met à jour à la main, par la branche `production`

- **Statut** : acceptée
- **Date** : 2026-10-10 · **Décidée par** : David

## Contexte

Jusqu'ici, `main` était la prod : chaque merge déclenchait un build Vercel. Du 30/09 au 10/10, il y a
eu 734 pushes sur `main`, dont 451 avec du code, soit ~45 builds de prod par jour. Trois limites du
plan gratuit en ont souffert :

- le quota de 100 déploiements par jour (prod gelée 10 h le 2026-09-30) ;
- les 10 Go de stockage (alerte 100 % le 2026-10-10) ;
- un seul build à la fois, donc une file d'attente.

Surtout, chaque merge partait en prod sans autre décision que « la CI est verte ».

David voulait que les mises à jour du site ne se fassent que manuellement. La première idée était
une branche `dev` qui recevrait les PR. Elle aurait obligé à rebrancher toutes les PR, les commits
de doc et les relectures du Shtam, ainsi que CLAUDE.md, les agents et les hooks. Il a retenu
l'inverse.

## Décision

- **`main` reste la branche de travail.** PR, CI, commits de doc et worktrees ne changent pas.
  Un merge sur `main` ne déploie plus rien.
- **Vercel ne déploie que la branche `production`**
  (`git.deploymentEnabled = { "**": false, "production": true }`, branche de production du projet
  Vercel = `production`).
- **`pnpm deploy:prod`** (`scripts/deploy-prod.sh`) fait une mise en prod complète, **toujours avec une
  nouvelle version** (demande de David) :

  1. il part du dernier commit de `main` dont « CI Summary » est vert, en enjambant les commits de
     doc sans CI qui le suivent ;
  2. il crée la version (`pnpm release` : numéro, CHANGELOG, tag) et la pousse sur `main` ;
  3. il attend que la CI de ce commit de version soit verte ;
  4. il avance `production` jusqu'à lui, en avance rapide seulement.

  Il refuse : main local pas à jour, CI en cours ou rouge, code sans CI, production divergente.
  Rien de nouveau : ni version, ni prod. CI de la version rouge : la version reste, la prod ne bouge
  pas, et une relance réutilise ce commit déjà tagué. `--essai` montre sans rien créer.

- **Qui lance `deploy:prod`** : David, ou Claude à sa **demande explicite**. Jamais Claude de sa
  propre initiative, même CI verte.
- **Migrations** :
  - une migration additive passe au merge (`db:migrate` depuis `main`) ; la base est alors en avance
    sur le code en prod, sans risque ;
  - une migration destructive attend que le `deploy:prod` qui livre le code n'en dépendant plus soit
    en prod.
- La branche `production` est protégée sur GitHub : ni force-push, ni suppression.

## Conséquences

- Quelques builds par jour au lieu de ~45 : plus de souci de quota ni de stockage.
- Un correctif urgent demande un geste de plus (`pnpm deploy:prod` juste après le merge).
- « Fusionné » ne veut plus dire « en prod ». Pour savoir ce qui attend :
  `git log --first-parent origin/production..origin/main`.
- Les Deployment Checks de Vercel (« CI Summary ») restent en place. Le commit livré a déjà sa CI,
  la promotion est donc immédiate.
- Le script `vercel:deploy` (`vercel --prod` depuis l'arbre local) est retiré : il contournait
  `production` et la CI.
