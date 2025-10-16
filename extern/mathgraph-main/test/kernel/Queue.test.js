import { afterEach, beforeEach, describe, it } from 'vitest'
import * as chai from 'chai'
import sinon from 'sinon'
import sinonChai from 'sinon-chai'

import Queue from 'src/kernel/Queue'

const expect = chai.expect
chai.use(sinonChai)

describe('Queue', function () {
  // pour le stub de la console
  let consoleErrorStub
  beforeEach(() => {
    consoleErrorStub = sinon.stub(console, 'error')
  })
  afterEach(() => {
    consoleErrorStub.restore()
  })

  it('add retourne le résultat d’une fct sync dans une promesse', async () => {
    let q = new Queue()
    let retour = q.add(() => 42)
    expect(retour).is.a('Promise')
    let value = await retour
    expect(value).to.equals(42)
    // idem avec un fonction "normale"
    q = new Queue() // test unitaire => on recommence sur une nouvelle queue, le test d'empilement est plus loin
    retour = q.add(function () { return 'foo' })
    expect(retour).is.a('Promise')
    value = await retour
    expect(value).to.equals('foo')
  })

  it('add retourne une promesse résolue avec undefined si on lui passe une fct sync qui plante, et l’erreur est affichée en console', async () => {
    const q = new Queue()
    const retour = q.add(() => { throw Error('fake Error') })
    expect(retour).is.a('Promise')
    const value = await retour
    expect(value).to.equals(undefined)
    expect(consoleErrorStub).to.have.been.calledOnce
    expect(consoleErrorStub).to.have.been.calledWithMatch((error) => /fake Error/.test(error.message))
  })

  it('add retourne une promesse résolue si on lui passe une fct async', async () => {
    const q = new Queue()
    const retour = q.add(() => new Promise((resolve) => {
      setTimeout(() => resolve(42), 1)
    }))
    expect(retour).is.a('Promise')
    const value = await retour
    expect(value).to.equals(42)
  })

  it('add retourne une promesse résolue avec undefined si on lui passe une fct async qui plante, et l’erreur est affichée en console', async () => {
    const q = new Queue()
    const retour = q.add(() => new Promise((resolve, reject) => {
      setTimeout(() => reject(Error('fake Error')), 1)
    }))
    expect(retour).is.a('Promise')
    const value = await retour
    expect(value).to.equals(undefined)
    expect(consoleErrorStub).to.have.been.calledOnce
    expect(consoleErrorStub).to.have.been.calledWithMatch((error) => /fake Error/.test(error.message))
  })

  it('tout ça fonctionne aussi si on les empile', async () => {
    const q = new Queue()
    let retour = await q.add(() => 42)
    expect(retour).to.equals(42)

    retour = q.add(() => { throw Error('fake Error') })
    expect(retour).is.a('Promise')
    let value = await retour
    expect(value).to.equals(undefined)
    expect(consoleErrorStub).to.have.been.calledOnce
    expect(consoleErrorStub).to.have.been.calledWithMatch((error) => /fake Error/.test(error.message))

    retour = q.add(function () { return 'foo' })
    expect(retour).is.a('Promise')
    value = await retour
    expect(value).to.equals('foo')

    retour = q.add(() => new Promise((resolve, reject) => {
      setTimeout(() => reject(Error('bouh')), 1)
    }))
    expect(retour).is.a('Promise')
    value = await retour
    expect(value).to.equals(undefined)
    expect(consoleErrorStub).to.have.been.calledTwice
    // expect(consoleErrorStub).to.have.been.calledWithMatch(function () { console.log(arguments) })
    expect(consoleErrorStub).to.have.been.calledWithMatch(error => /bouh/.test(error.message))
  })

  it('les fonctions sont bien exécutées l’une après l’autre, même si une sync suit une async, mais après le code sync des appels', async () => {
    const q = new Queue()
    const results = []
    q.add(() => results.push(3)) // première promesse à être lancée, mais après les appels sync fait ici
    results.push(0) // doit être effectué d'abord
    q.add(() => new Promise((resolve) => {
      setTimeout(() => { results.push(4); resolve() }, 10)
    }))
    results.push(1)
    const last = q.add(() => results.push(5)) // devra être effectué en dernier
    results.push(2) // ici aucune des deux fonctions dans la pile ne devrait être lancée
    await last
    expect(results.every((value, index) => value === index)).to.be.true
  })

  it('add nous renvoie la promesse rejetée si on le demande (sans appeler la console), et on peut continuer à empiler ensuite', async () => {
    const q = new Queue()
    let r = q.add(() => { throw Error('foo') }, true)
    try {
      await r
      // on doit pas passer là, ici c'est à mocha qu'on retourne une promesse rejetée
      return Promise.reject(Error('La promesse n’est pas rejetée comme elle le devrait'))
    } catch (error) {
      expect(error.message).to.match(/foo/)
    }
    expect(consoleErrorStub).to.not.have.been.called
    r = await q.add(() => 1)
    expect(r).to.equals(1)
  })
})
