Créer les packages mathgraph
============================

Linux
-----

Préalable : electron-packager n'est pas compatible avec pnpm, il faut installer les
paquets avec `npm install` (dans le dossier electron), sinon le build plante car il trouve pas ses modules (il faudrait tous les ajouter en dépendances de l'appli, et y'en a beaucoup)

1) Build, il faut lancer
- dans le dossier racine `pnpm run build-electron`
- dans le dossier electron `npm run package-linux`

Si /tmp n'a pas assez de place pour compiler, lancer manuellement la commande qui s'est affichée en ajoutant `--tmpdir=/chemin/vers/un/dossier/temporaire`

2) À l'exécution, en cas de message du type `
The SUID sandbox helper binary was found, but is not configured correctly. Rather than run without sandboxing I'm aborting now.`, il faut lancer l'application avec `--no-sandbox` (ou bien passer la commande `sudo sysctl kernel.unprivileged_userns_clone=1` si vous avez les droits, mais ce n'est pas conseillé, cf par ex [cette note](https://github.com/electron/electron/issues/17972#issuecomment-558880631))

Vous pouvez vous créer un raccourci pour lancer cette commande (le logo de l'appli est resources/app/logoMathGraph.png).
