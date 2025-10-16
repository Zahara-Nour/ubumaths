export const apiFunctions = [
  'setApiDoc',
  'updateFigDisplay',
  'reDisplay',
  'updateDependantDisplay',
  'deleteAfter',
  'recalculate',
  'sleep',
  'getFigDim',
  'setAngleUnity',
  'getElement',
  'setPointNameOffset',
  'setPointStyle',
  'setMarked',
  'setUnmarked',
  'activateTraceMode',
  'addAngleMark',
  'addSegmentMark',
  'addFreePoint',
  'addPointXY',
  'addPointZ',
  'addMidpoint',
  'addLinkedPointCircle',
  'addLinkedPointLine',
  'addLinkedPointLocus',
  'addLineAB',
  'addLineHor',
  'addLineVer',
  'addLineAx',
  'addLinePar',
  'addLinePerp',
  'addLineMedAB',
  'addLineBisAOB',
  'addSegment',
  'addVector',
  'addRay',
  'addCircleOA',
  'addCircleOr',
  'addArcOAB',
  'addArcOAx',
  'addArcMajorOAB',
  'addArcMajorOAx',
  'addArcDirectOAB',
  'addArcIndirectOAB',
  'addImPointTranslation',
  'addImPointTranslationxy',
  'addImPointRotation',
  'addImPointDilation',
  'addImPointSymCent',
  'addImPointSymAx',
  'addTranslation',
  'addTranslationxy',
  'addRotation',
  'addDilation',
  'addSymCent',
  'addSymAx',
  'addSimilitude',
  'addPointIm',
  'addLineIm',
  'addRayIm',
  'addCircleIm',
  'addText',
  'addLatex',
  'addLinkedText',
  'addLinkedLatex',
  'addIntLineLine',
  'addIntLineCircle',
  'addIntCircleCircle',
  'getPointPosition',
  'getPointByName',
  'setFreePointPosition',
  'addXMeasure',
  'addYMeasure',
  'addZMeasure',
  'addLengthMeasure',
  'addAbsMeasure',
  'setUnity',
  'addCalc',
  'addCalcComp',
  'addVariable',
  'addCalcMat',
  'addFunc',
  'addFuncComp',
  'addDerivative',
  'addTest',
  'addTestComp',
  'addMatrix',
  'getFuncImage',
  'addPolygon',
  'addBrokenLine',
  'addSurfaceCircle',
  'addSurfacePoly',
  'addSurface',
  'addDuplicatedObject',
  'addSystemOfAxis',
  'addPointLocus',
  'addObjectLocus',
  'addCurve',
  'addEltListener',
  'removeEltListener',
  'addSvgListener',
  'removeSvgListener',
  'setColor',
  'setBackgroundColor',
  'setLineStyle',
  'setThickness',
  'setLinkPointPoint',
  'removePointLink',
  'zoomFig',
  'translateFig',
  'setVisible',
  'setHidden',
  'reclassMax',
  'reclassMin',
  'reclassBefore',
  'reclassAfter',
  'displayOnTop',
  'deleteElt',
  'deleteObj',
  'fixPoint',
  'releasePoint',
  'giveFormulaTo',
  'getValue',
  'getMatValue',
  'getCalcName',
  'addZoomButtons',
  'addTimerButton',
  'addActionButton',
  'getBase64Code'
]

// liste des fcts en minuscule
const fnsLc = apiFunctions.map(fn => fn.toLowerCase())
// correspondance lowerCase => fonction
const fnsMap = {}
for (const fn of apiFunctions) fnsMap[fn.toLowerCase()] = fn

// dans 99% des cas getCompletions est appelé avec une seule lettre,
// et c'est ensuite ace qui affine les propositions avec les lettres suivantes
// sans rappeler getCompletions
// on prépare des résultats pour toutes nos premières lettres (probablement pas les 26)
const oneLetterResults = {}
for (const fn of apiFunctions) {
  const firstLetter = fn[0].toLowerCase()
  if (!oneLetterResults[firstLetter]) oneLetterResults[firstLetter] = []
  oneLetterResults[firstLetter].push({ caption: fn, value: fn, meta: 'Mathgraph' })
}

export const mtgCompleter = {
  getCompletions: function (editor, session, pos, prefix, callback) {
    if (prefix.length < 1) return callback(null, [])
    const start = prefix.toLowerCase()
    if (start.length === 1) return callback(null, oneLetterResults[start] ?? [])
    // y'a plusieurs lettres (y'a eu un ctrl+c ou un appel explicite avec ctrl+space)
    // => faut filtrer sur la liste complète
    const fnMatches = fnsLc.filter(fn => fn.startsWith(start))
    const results = fnMatches.map(fnMin => {
      const fn = fnsMap[fnMin]
      return { caption: fn, value: fn, meta: 'Mathgraph' }
    })
    callback(null, results)
  }
}
