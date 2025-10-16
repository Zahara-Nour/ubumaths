import { figRepereVide } from 'src/start/figures'

function apiCallBackAfterReady (app) {
  console.debug('figure chargée pour le test api', app)
  /**
   * @name app
   * @type {MtgAppApi}
   */
  app.addFreePoint({ x: 100, y: 100, tag: 'A', offsetX: -20, offsetY: -10 })
  app.addFreePoint({ x: 3, y: -2, name: 'B', rep: 'rep', fontSize: 24, color: '#cc33ff' })
  app.addFreePoint({ x: 3, y: 2, name: 'B1', rep: 'rep', color: '#cc33ff' })
  app.addPointXY({ x: 4, y: 2, name: 'C', rep: 'rep', color: '#33ee33' })
  app.addPointXY({ x: 4, y: -2, name: 'C2', rep: 'rep', color: '#33ee33' })
  app.addLineAB({ a: 'A', b: 'B', name: 'D', tag: 'D' })
  app.addLineAB({ a: 'O', b: 'A', name: 'D1', tag: 'D1' })
  app.addLineAB({ a: 'O', b: 'B1', name: 'D4', tag: 'D4' })
  app.addLinePerp({ a: 'A', d: 'D', name: 'D2', tag: 'D2' })
  app.addLinePar({ a: 'B', d: 'D2', name: 'D3', tag: 'D3' })
  app.addSegment({ a: 'B', b: 'C', lineStyle: '-', tag: 'segment' })
  app.addVector({ a: 'A', b: 'C', lineStyle: '-..' })
  app.addRay({ o: 'O', a: 'C', lineStyle: '-...', tag: 'ray' })
  app.addCircleOA({ o: 'O', a: 'C', lineStyle: '-...' })
  app.addCircleOr({ o: 'O', r: 5, color: '#aa2222', tag: 'cercleray' })
  app.addArcOAB({ o: 'O', a: 'B', b: 'B1', color: '#cc33ff' })
  app.addArcMajorOAB({ o: 'O', a: 'B', b: 'B1', color: '#4b2d56', tag: 'bigarc' })
  app.addPointXY({ x: 8, y: 3, name: 'M', rep: 'rep' })
  app.addArcOAx({ o: 'O', a: 'M', x: Math.PI / 4, color: '#0000cc', tag: 'arc' })
  app.addArcMajorOAx({ o: 'O', a: 'M', x: Math.PI / 2, color: '#00aaff' })
  app.addText({ text: 'Un texte simple et fixe', x: 50, y: 50, backgroundColor: '#dddddd' })
  app.deleteElt({ elt: 'ray' })
  app.addLinkedText({
    text: 'Un texte simple et lié à B',
    a: 'B',
    x: 250,
    backgroundColor: '#dddddd'
  })
  app.addLatex({
    latex: '\\text{Un texte latex et fixe avec des} \\frac{\\sqrt{2}}{2}\\textit{dedans}',
    x: 50,
    y: 100,
    backgroundColor: 'yellow',
    border: '3D'
  })
  app.addLinkedLatex({
    latex: '\\text{Une racine liée} \\sqrt{\\pi}',
    a: 'M',
    backgroundColor: '#dddddd'
  })
  app.addIntLineLine({ d: 'D1', d2: 'D3', color: 'red' })
  app.addIntLineCircle({ d: 'D1', c: 'cercleray', color: 'blue' })
  app.addIntLineCircle({ d: 'D3', c: 'arc', color: 'red' })
  app.addIntLineCircle({ d: 'D4', c: 'bigarc', color: 'maroon' })
  app.addPointXY({ x: 2, y: 6, name: 'E', rep: 'rep', color: 'black', pointStyle: 'mult' })
  app.addCircleOA({ o: 'E', a: 'B1', lineStyle: '-...', tag: 'cerc' })
  app.addIntCircleCircle({ c: 'cerc', c2: 'bigarc', color: 'maroon', name: 'G' })
  app.addXMeasure({ a: 'A', rep: 'rep', nameCalc: 'xA' })
  app.addYMeasure({ a: 'A', rep: 'rep', nameCalc: 'yA' })
  app.addLinkedLatex({
    latex: 'A(\\Val{xA}, \\Val{yA})',
    a: 'A',
    decy: -10
  })
  app.addPolygon({ points: ['B1', 'G', 'E'], color: 'blue', thickness: 2, tag: 'poly' })
  app.addSurfaceCircle({ color: 'green', c: 'arc', tag: 'surface' })
  app.addSurfaceCircle({ color: 'red', c: 'cercleray', fillStyle: '/' })
  const surf = app.addSurfacePoly({ color: 'blue', poly: 'poly', tag: 'surfacepoly', opacity: 0.2 })
  app.setColor({ elt: surf, color: 'red', opacity: 0.5 })
  app.addLinkedPointCircle({ c: 'cercleray', x: -1, y: 1, rep: 'rep', name: 'P' })
  app.addMidpoint({ a: 'O', b: 'P', name: "P'" })
  app.addLinkedPointLine({ d: 'D', rep: 'rep', x: 0, y: 0, color: 'red', name: 'Q' })
  app.addAngleMark({ a: 'G', o: 'E', b: 'B1', r: 20, angleMarkStyle: 'full--', thickness: 2, color: 'red' })
  app.addAngleMark({ a: 'I', o: 'O', b: 'J', r: 20, angleMarkStyle: 'simple', thickness: 2, color: 'blue' })
  app.addSegmentMark({ elt: 'segment', color: 'red', segmentMarkStyle: '---', thickness: 2 })
  app.addArcDirectOAB({ o: 'G', a: 'E', b: 'B1' })
  app.addArcIndirectOAB({ o: 'B1', a: 'G', b: 'E', thickness: 2, lineStyle: '.', color: 'green' })
  app.addFreePoint({ x: 6, y: 2, name: 'N', rep: 'rep', color: 'red', hiddenName: true })
  app.addCircleOr({ o: 'N', r: 2, color: 'red' })
  app.addPointXY({ x: -11, y: -2, name: 'U', rep: 'rep', color: 'red' })
  app.addCircleOr({ o: 'U', r: 1.5, color: 'red', tag: 'cerc1' })
  app.addSurfaceCircle({ c: 'cerc1', color: 'red', tag: 'surf1' })
  app.addPointXY({ x: -11, y: -6, name: 'V', rep: 'rep', color: 'blue' })
  app.addCircleOr({ o: 'V', r: 1.5, color: 'blue', tag: 'cerc2' })
  app.addSurfaceCircle({ c: 'cerc2', color: 'blue', tag: 'surf2' })
  app.addPointXY({ x: -8, y: -2, name: 'T', rep: 'rep', color: 'red' })
  app.addCircleOr({ o: 'T', r: 1.5, color: 'red', tag: 'cerc3' })
  app.addSurfaceCircle({ c: 'cerc3', color: 'red', tag: 'surf3' })
  app.addPointXY({ x: -8, y: -6, name: 'X', rep: 'rep', color: 'blue' })
  app.addCircleOr({ o: 'X', r: 1.5, color: 'blue', tag: 'cerc4' })
  app.addSurfaceCircle({ c: 'cerc4', color: 'blue', tag: 'surf4' })
  app.addFreePoint({ x: 4, y: -3, name: 'W', rep: 'rep', offsetX: -20, offsetY: -10, tag: 'W' })
  app.addFreePoint({ x: 3, y: -6, name: 'Z', rep: 'rep', fontSize: 18, color: '#cc33ff' })
  app.addLineAB({
    a: 'W',
    b: 'Z',
    color: 'red',
    tag: 'WZ'
  })

  app.reclassMin({ elt: 'surf4' })
  app.addText({
    text: 'Translater à droite',
    rep: 'rep',
    x: -11,
    y: 2,
    transparent: false,
    backgroundColor: 'rgb(255,255,0)',
    tag: 'txt1',
    border: '3D'
  })
  app.addText({
    text: 'Fixer le point W',
    rep: 'rep',
    x: 8,
    y: 1,
    transparent: false,
    backgroundColor: 'yellow',
    tag: 'fixW',
    border: '3D'
  })
  app.addText({
    text: 'Libérer le point W',
    rep: 'rep',
    x: 8,
    y: -1,
    transparent: false,
    backgroundColor: 'yellow',
    tag: 'freeW',
    border: '3D'
  })
  app.addEltListener({
    elt: 'surfacepoly',
    eventName: 'mouseover',
    callBack: () => {
      app.setColor({ elt: 'surfacepoly', color: 'red', opacity: 0.5 })
      app.setLineStyle({ elt: 'poly', lineStyle: '--' })
      app.setThickness({ elt: 'poly', thickness: 1 })
    }
  })
  app.addEltListener({
    elt: 'surfacepoly',
    eventName: 'mouseout',
    callBack: () => {
      app.setColor({ elt: 'surfacepoly', color: 'blue', opacity: 0.2 })
      app.setLineStyle({ elt: 'poly', lineStyle: '-' })
      app.setThickness({ elt: 'poly', thickness: 2 })
    }
  })
  app.addLengthMeasure({ a: 'O', b: 'P' })
  app.addCalc({ nameCalc: 'calctest', formula: 'pi/2' })
  const circ = app.addCircleOr({ o: 'O', r: 'OP', color: 'red', thickness: 3, tag: 'tagcerc' })
  // app.setColor({ elt: 'tagcerc', color: 'blue', opacity: 0.2 })
  // app.reclassMax({ elt: 'poly' })
  app.setColor(circ, 'blue', 0.5)
  app.addImPointTranslation({ o: 'O', a: 'A', b: 'B', name: 'O\'', color: 'maroon' })
  app.addImPointRotation({ o: 'O', a: 'O\'', name: 'O"', color: 'red', x: 'calctest/2' })
  app.addImPointDilation({ o: 'O', a: 'O"', name: 'O1', color: 'blue', x: '1/2' })
  app.addImPointSymCent({ o: 'O', a: 'O1', name: 'O2', color: 'black' })
  app.addImPointSymAx({ d: 'D', a: 'O2', name: 'O3', color: 'black' })
  app.addMidpoint({ a: 'O2', b: 'O3', name: 'O4', tag: 'O4' })

  // app.addDuplicatedObject({ elt: 'poly', tag: 'polydup' })
  app.addText({
    text: 'Translater à gauche',
    rep: 'rep',
    x: -11,
    y: 3,
    transparent: false,
    backgroundColor: 'yellow',
    tag: 'txt2',
    border: '3D'
  })
  app.setHidden({ elt: 'txt2' })
  app.addEltListener({
    elt: 'txt1',
    eventName: 'mousedown',
    callBack: () => {
      app.setVisible({ elt: 'txt2' })
      app.addEltListener({
        elt: 'txt2',
        eventName: 'mousedown',
        callBack: () => {
          app.translateFig({ x: -10, y: 0 })
        }
      })
      app.translateFig({ x: 10, y: 0 })
    }
  })
  app.addEltListener({
    elt: 'freeW',
    eventName: 'mousedown',
    callBack: () => {
      app.releasePoint({ a: 'W' })
    }
  })
  app.addEltListener({
    elt: 'surf2',
    eventName: 'mousedown',
    callBack: () => {
      app.removePointLink({ a: 'N' })
    }
  })
  app.addEltListener({
    elt: 'surf3',
    eventName: 'mousedown',
    callBack: () => {
      app.zoomFig({ rep: 'rep', x: 0, y: 0, k: 1.2 })
    }
  })
  app.addEltListener({
    elt: 'surf4',
    eventName: 'mousedown',
    callBack: () => {
      app.zoomFig({ rep: 'rep', x: 0, y: 0, k: 1 / 1.2 })
      app.deleteElt({ elt: 'W' })
    }
  })
  app.addEltListener({
    elt: 'fixW',
    eventName: 'mousedown',
    callBack: () => {
      app.fixPoint({ a: 'W' })
    }
  })
  app.addEltListener({
    elt: 'surf1',
    eventName: 'mousedown',
    callBack: () => {
      app.setLinkPointPoint({ a: 'N', b: 'P' })
    }
  })
  app.reclassAfter({ elt: 'poly', elt2: 'O4' }).then(() => {
    console.debug('Reclassement effectué')
  })
  app.addSystemOfAxis({
    o: 'G',
    a: 'B1',
    b: 'E',
    hidden: false,
    lineStyle: '.',
    verticalGrid: true,
    horizontalGrid: true,
    tag: 'rep2'
  })
  app.addPointXY({
    rep: 'rep2',
    x: 2,
    y: -1,
    name: 'Q3'
  })
  app.addText({
    text: 'Changer de figure',
    absCoord: true,
    x: 20,
    y: 20,
    transparent: false,
    backgroundColor: 'yellow',
    tag: 'newfig',
    border: '3D'
  })
  app.addEltListener({
    elt: 'newfig',
    eventName: 'mousedown',
    callBack: () => {
      app.setFig({ container: document.getElementById('main'), id: 'svgMtg0', fig: 'TWF0aEdyYXBoSmF2YTEuMAAAABUAAmZy####AQD#AQAAAAAAAAAABR4AAALKAAABAQAAAAAAAAABAAAAOP####8AAAABAApDQ2FsY0NvbnN0AP####8AAnBpABYzLjE0MTU5MjY1MzU4OTc5MzIzODQ2#####wAAAAEACkNDb25zdGFudGVACSH7VEQtGP####8AAAABAApDUG9pbnRCYXNlAP####8AAAAAP4AAAAAOAAFPAMAoAAAAAAAAAAAAAAAAAAAAAAUAAUCEeCj1wo9cQHZWuFHrhR######AAAAAQAUQ0Ryb2l0ZURpcmVjdGlvbkZpeGUA#####wEAAAA#gAAAABAAAAEAAAABAAAAAQE#8AAAAAAAAP####8AAAABAA9DUG9pbnRMaWVEcm9pdGUA#####wAAAAA#gAAAAQ4AAUkAwBgAAAAAAAAAAAAAAAAAAAAABQABQEHe+dsi0OYAAAAC#####wAAAAEACUNEcm9pdGVBQgD#####AAAAAD+AAAAAEAAAAQAAAAEAAAABAAAAA#####8AAAABABZDRHJvaXRlUGVycGVuZGljdWxhaXJlAP####8AAAAAP4AAAAAQAAABAAAAAQAAAAEAAAAE#####wAAAAEACUNDZXJjbGVPQQD#####AQAAAD+AAAAAAAABAAAAAQAAAAP#####AAAAAQAQQ0ludERyb2l0ZUNlcmNsZQD#####AAAABQAAAAb#####AAAAAQAQQ1BvaW50TGllQmlwb2ludAD#####AQAAAD+AAAAAEAAAAQAABQABAAAABwAAAAkA#####wAAAAA#gAAAAQ4AAUoAwCgAAAAAAADAEAAAAAAAAAAABQACAAAAB#####8AAAACAAdDUmVwZXJlAP####8A5ubmP4AAAAAAAAEAAAABAAAAAwAAAAkBAQAAAAABAAAAAAAAAAAAAAABAAAAAAAAAAAAAAABP#AAAAAAAAAAAAABP#AAAAAAAAD#####AAAAAQAKQ1VuaXRleFJlcAD#####AAR1bml0AAAACv####8AAAABAAtDSG9tb3RoZXRpZQD#####AAAAAf####8AAAABAApDT3BlcmF0aW9uAwAAAAE#8AAAAAAAAP####8AAAABAA9DUmVzdWx0YXRWYWxldXIAAAAL#####wAAAAEAC0NQb2ludEltYWdlAP####8BAAAAP4AAAAAQAAJXIgEAAAEAAAAAAwAAAAz#####AAAAAQAJQ0xvbmd1ZXVyAP####8AAAABAAAADf####8AAAABAAdDQ2FsY3VsAP####8AB25iZ3JhZHgAAjIwAAAAAUA0AAAAAAAAAAAAEQD#####AAduYmdyYWR5AAIyMAAAAAFANAAAAAAAAP####8AAAABABRDSW1wbGVtZW50YXRpb25Qcm90bwD#####ABRHcmFkdWF0aW9uQXhlc1JlcGVyZQAAABsAAAAIAAAAAwAAAAoAAAAPAAAAEP####8AAAABABNDQWJzY2lzc2VPcmlnaW5lUmVwAAAAABEABWFic29yAAAACv####8AAAABABNDT3Jkb25uZWVPcmlnaW5lUmVwAAAAABEABW9yZG9yAAAACgAAAAsAAAAAEQAGdW5pdGV4AAAACv####8AAAABAApDVW5pdGV5UmVwAAAAABEABnVuaXRleQAAAAr#####AAAAAQAQQ1BvaW50RGFuc1JlcGVyZQAAAAARAAAAAD+AAAAAEAAAAQAABQAAAAAKAAAADgAAABIAAAAOAAAAEwAAABYAAAAAEQAAAAA#gAAAABAAAAEAAAUAAAAACgAAAA0AAAAADgAAABIAAAAOAAAAFAAAAA4AAAATAAAAFgAAAAARAAAAAD+AAAAAEAAAAQAABQAAAAAKAAAADgAAABIAAAANAAAAAA4AAAATAAAADgAAABUAAAAMAAAAABEAAAAWAAAADgAAAA8AAAAPAAAAABEAAAAAP4AAAAAQAAABAAAFAAAAABcAAAAZAAAADAAAAAARAAAAFgAAAA4AAAAQAAAADwAAAAARAAAAAD+AAAAAEAAAAQAABQAAAAAYAAAAG#####8AAAABAAhDU2VnbWVudAAAAAARAQAAAD+AAAAAEAAAAQAAAAEAAAAXAAAAGgAAABcAAAAAEQEAAAA#gAAAABAAAAEAAAABAAAAGAAAABwAAAAEAAAAABEBAAAAP4AAAAALAAFXAMAUAAAAAAAAwDQAAAAAAAAAAAUAAT#cVniavN8OAAAAHf####8AAAACAAhDTWVzdXJlWAAAAAARAAZ4Q29vcmQAAAAKAAAAHwAAABEAAAAAEQAFYWJzdzEABnhDb29yZAAAAA4AAAAg#####wAAAAIAEkNMaWV1T2JqZXRQYXJQdExpZQEAAAARAGZmZj+AAAAAAAAAAB8AAAAOAAAADwAAAB8AAAACAAAAHwAAAB8AAAARAAAAABEABWFic3cyAA0yKmFic29yLWFic3cxAAAADQEAAAANAgAAAAFAAAAAAAAAAAAAAA4AAAASAAAADgAAACEAAAAWAAAAABEBAAAAP4AAAAAQAAABAAAFAAAAAAoAAAAOAAAAIwAAAA4AAAATAAAAGQEAAAARAGZmZj+AAAAAAAAAACQAAAAOAAAADwAAAB8AAAAFAAAAHwAAACAAAAAhAAAAIwAAACQAAAAEAAAAABEBAAAAP4AAAAALAAFSAEAgAAAAAAAAwCAAAAAAAAAAAAUAAT#RG06BtOgfAAAAHv####8AAAACAAhDTWVzdXJlWQAAAAARAAZ5Q29vcmQAAAAKAAAAJgAAABEAAAAAEQAFb3JkcjEABnlDb29yZAAAAA4AAAAnAAAAGQEAAAARAGZmZj+AAAAAAAAAACYAAAAOAAAAEAAAACYAAAACAAAAJgAAACYAAAARAAAAABEABW9yZHIyAA0yKm9yZG9yLW9yZHIxAAAADQEAAAANAgAAAAFAAAAAAAAAAAAAAA4AAAATAAAADgAAACgAAAAWAAAAABEBAAAAP4AAAAAQAAABAAAFAAAAAAoAAAAOAAAAEgAAAA4AAAAqAAAAGQEAAAARAGZmZj+AAAAAAAAAACsAAAAOAAAAEAAAACYAAAAFAAAAJgAAACcAAAAoAAAAKgAAACv#####AAAAAgAMQ0NvbW1lbnRhaXJlAAAAABEBZmZmP4AAAAAAAAAAAAAAAEAYAAAAAAAAAAAAAAAfCwAB####AAAAAQAAAAAAAAABAAAAAAAAAAAAAAsjVmFsKGFic3cxKQAAABkBAAAAEQBmZmY#gAAAAAAAAAAtAAAADgAAAA8AAAAfAAAABAAAAB8AAAAgAAAAIQAAAC0AAAAbAAAAABEBZmZmP4AAAAAAAAAAAAAAAEAYAAAAAAAAAAAAAAAkCwAB####AAAAAQAAAAAAAAABAAAAAAAAAAAAAAsjVmFsKGFic3cyKQAAABkBAAAAEQBmZmY#gAAAAAAAAAAvAAAADgAAAA8AAAAfAAAABgAAAB8AAAAgAAAAIQAAACMAAAAkAAAALwAAABsAAAAAEQFmZmY#gAAAAMAgAAAAAAAAP#AAAAAAAAAAAAAAACYLAAH###8AAAACAAAAAQAAAAEAAAAAAAAAAAAACyNWYWwob3JkcjEpAAAAGQEAAAARAGZmZj+AAAAAAAAAADEAAAAOAAAAEAAAACYAAAAEAAAAJgAAACcAAAAoAAAAMQAAABsAAAAAEQFmZmY#gAAAAMAcAAAAAAAAAAAAAAAAAAAAAAAAACsLAAH###8AAAACAAAAAQAAAAEAAAAAAAAAAAAACyNWYWwob3JkcjIpAAAAGQEAAAARAGZmZj+AAAAAAAAAADMAAAAOAAAAEAAAACYAAAAGAAAAJgAAACcAAAAoAAAAKgAAACsAAAAz#####wAAAAIACUNDZXJjbGVPUgD#####AAAA#z+AAAAAAAACAAAAAQAAAAFAFAAAAAAAAAAAAAACAP####8AAAAAP4AAAAAQAAFBAAAAAAAAAAAAQAgAAAAAAAAAAAkAAUB7wAAAAAAAQF81wo9cKPYAAAACAP####8AAAAAP4AAAAAQAAFCAAAAAAAAAAAAQAgAAAAAAAAAAAkAAUB3MAAAAAAAQHANcKPXCj4AAAAO##########8=' })
    }
  })
  app.addPointLocus({ a: "P'", b: 'P', x: 300, color: 'green', lineStyle: '.', thickness: 2, closed: true })
}

export function getOptsApiEditeur () {
  return {
    loadApi: true,
    fig: {
      type: 'orthonormal',
      datarep: {
        quadhor: false,
        quadver: false,
        grid: true,
        withvect: false,
        grad: 'simple'
      },
      unity: 'rad'
    },
    isEditable: true,
    zoomOnWheel: true,
    callBackAfterReady: apiCallBackAfterReady
  }
}

export function getOptsApiLecteur (mtgOptions) {
  return {
    loadApi: true,
    fig: figRepereVide,
    isEditable: false,
    zoomOnWheel: true,
    callBackAfterReady: apiCallBackAfterReady
  }
}

export function getOptsApiLecteurBis (mtgOptions) {
  return {
    loadApi: true,
    fig: figRepereVide,
    isEditable: false,
    callBackAfterReady: function apiLecteurBisCallback (app) {
      console.debug('figure chargée pour le test api', app)
      /**
       * @name app
       * @type {MtgAppApi}
       */
      const A = app.addPointXY(-3, 0)
      const B = app.addPointXY(3, 4)
      const d = app.addLineAB(A, B, '', 'green')
      const C = app.addFreePoint(5, 5, 'C1')
      const K = app.addMidpoint(A, C, 'K')
      const D = app.addLinkedPointLine(d, 8, 6, 'M', 'red')
      app.addImPointTranslation(D, C, K, 'N')
    }
  }
}
