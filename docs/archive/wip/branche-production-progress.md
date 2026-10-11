# Branche `production` — progression

ADR 0021. Branche `chore/branche-production`.

## Bascule, dans cet ordre

1. PR fusionnée : `vercel.json` ne déploie plus `main` ; la prod reste sur la version en ligne.
2. David : Vercel → Settings → Environments → Production → branche de production = `production`.
3. Claude, à la demande de David : `pnpm deploy:prod` crée la branche et déploie ; vérifier le
   build (`vercel ls --prod`), puis protéger `production` sur GitHub (ni force-push, ni suppression).
4. Mémoire et CLAUDE.md : « main = prod » retiré partout (fait dans la PR pour CLAUDE.md).
