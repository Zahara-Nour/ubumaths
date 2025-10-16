Pour exécuter MathGraph32 version Linux, placez-vous dans le dossier où vous avez décompressé le logiciel
et faites un double click sur MathGraph32JS (ou démarrez un terminal dans le dossier et entrez la commande `./MathGraph32JS`).

À l'enregistrement, le suffixe .mgj n'est pas automatiquement ajouté, vous pouvez le faire manuellement afin
de pouvoir démarrer Mathgraph avec un double clic sur un fichier contenant la figure.

La première fois (que vous faites un double clic sur un fichier .mgj), ça devrait vous demander avec quel application
ouvrir ce fichier, indiquez le chemin de l'exécutable MathGraph32JS et le système ne devrait plus vous poser la question ensuite.

À l'exécution, en cas de message du type
`The SUID sandbox helper binary was found, but is not configured correctly.
Rather than run without sandboxing I'm aborting now.`,
il faut lancer l'application avec `--no-sandbox`
(ou bien passer la commande `sudo sysctl kernel.unprivileged_userns_clone=1` si vous avez les droits,
mais ce n'est pas conseillé, cf par ex [cette note](https://github.com/electron/electron/issues/17972#issuecomment-558880631))

Vous pouvez vous créer un raccourci pour lancer cette commande (le logo de l'appli est resources/app/logoMathGraph.png).
