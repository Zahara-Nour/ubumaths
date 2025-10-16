import { describe, it } from 'vitest'
import { traiteAccents } from 'src/kernel/kernel'
import { expect } from 'chai'

// kernel utilise window.navigator => faut préciser ça
/* @vitest-environment happy-dom */

describe('traiteAccents', () => {
  it('traite les accents « ancienne mode »', () => new Promise((resolve) => {
    // on crée la batterie de tests
    const accents = {
      é: '\\acute{e}',
      è: '\\grave{e}',
      à: '\\grave{a}',
      ù: '\\grave{u}',
      â: '\\hat{a}',
      ê: '\\hat{e}',
      ô: '\\hat{o}',
      î: '\\hat{i}'
    }
    const tests = []
    Object.entries(accents).forEach(([char, latex]) => {
      const base = '\\text{blà é blâ}'
      tests.push({
        src: base + latex,
        dst: base.replace('}', char + '}')
      })
      tests.push({
        src: base + latex + base,
        dst: `\\text{blà é blâ${char}blà é blâ}`
      })
    })
    // on ajoute qq chaines qui ne doivent pas être modifées
    for (const txt of [
      '\\text{blabla}\frac{3}{2}\\text{ bla bla}',
      '\\sqrt{42}\\text{blabla}\frac{3}{2}\\text{ bla bla}'
    ]) {
      tests.push({ src: txt, dst: txt })
    }
    // et une concat de \text
    tests.push({
      src: '\\text{toto}\\text{tutu}',
      dst: '\\text{tototutu}'
    })
    // et un test plus compliqué
    tests.push({
      src: '\\begin{array}{l}\\text{Trouver le ou les ant}\\acute{e} \\text{c}\\acute{e} \\text{dents de }\\If{form}{\\ForSimp{y1}}{\\If{form2}{\\ForSimp{y2}}{\\If{form3}{\\ForSimp{y3}}{\\If{form4}{\\ForSimp{y4}}{\\If{form5}{\\ForSimp{y5}}{\\ForSimp{y6}}}}}}\\text{ par }f',
      dst: '\\begin{array}{l}\\text{Trouver le ou les antécédents de }\\If{form}{\\ForSimp{y1}}{\\If{form2}{\\ForSimp{y2}}{\\If{form3}{\\ForSimp{y3}}{\\If{form4}{\\ForSimp{y4}}{\\If{form5}{\\ForSimp{y5}}{\\ForSimp{y6}}}}}}\\text{ par }f'
    })
    tests.forEach(({ src, dst }) => expect(traiteAccents(src)).to.equals(dst))
    return resolve()
  }))
})
