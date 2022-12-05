import math from 'tinycas'
// loggers
const loggers = {}
function getLogger(name, level = 'info') {
	if (
		!Object.prototype.hasOwnProperty.call(loggers, name) ||
		loggers[name].level !== level
	) {
		const levels = ['trace', 'debug', 'info', 'warn', 'fail']
		// const getTimestamp = () => ''
		// const getTimestamp = () => moment().format('YY-MM-DD HH:mm:ss')
		// const coloredPrefix = `%c[${getTimestamp()}] [${name}] `
		// const prefix = `[${getTimestamp()}] [${name}] `
		const coloredPrefix = `%c[${name}] `
		const prefix = `[${name}] `
		const noop = () => {}

		const fail =
			levels.indexOf(level) <= levels.indexOf('fail')
				? console.error.bind(console, coloredPrefix, 'color:#ED8784')
				: noop
		const warn =
			levels.indexOf(level) <= levels.indexOf('warn')
				? console.warn.bind(console, coloredPrefix, 'color:#F3D9A2')
				: noop
		const info =
			levels.indexOf(level) <= levels.indexOf('info')
				? console.info.bind(console, coloredPrefix, 'color:#8CE9FF')
				: noop
		const debug =
			levels.indexOf(level) <= levels.indexOf('debug')
				? console.log.bind(console, prefix)
				: noop
		const trace =
			levels.indexOf(level) <= levels.indexOf('trace')
				? console.log.bind(console, prefix)
				: noop

		loggers[name] = {
			level,
			fail,
			warn,
			info,
			debug,
			trace,
		}
	}
	return loggers[name]
}

/**
 * Randomly shuffle an array (in place shuffle)
 * https://stackoverflow.com/a/2450976/1293256
 * @param  {Array} array The array to shuffle
 * @return {String}      The first item in the shuffled array
 */
const shuffle = function (array) {
	let currentIndex = array.length
	let temporaryValue, randomIndex

	// While there remain elements to shuffle...
	while (0 !== currentIndex) {
		// Pick a remaining element...
		randomIndex = Math.floor(Math.random() * currentIndex)
		currentIndex -= 1

		// And swap it with the current element.
		temporaryValue = array[currentIndex]
		array[currentIndex] = array[randomIndex]
		array[randomIndex] = temporaryValue
	}

	return array
}

// test if a variable is an object and is empty
function isEmpty(obj) {
	return obj.constructor === Object && Object.entries(obj).length === 0
}

function getPropertyName(obj) {
	return Object.getOwnPropertyNames(obj)[0]
}

// lexical sort
const lexicoSort = (a, b) => {
	if (a < b) return -1
	if (a > b) return 1
	return 0
}

// clean string for url
const cleanString = (str) =>
	str
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/\s/g, '')
		.toLowerCase()

// test if the device is a touche device (not reliable)
export function isTouchScreendevice() {
	return (
		'ontouchstart' in window ||
		navigator.maxTouchPoints(navigator.msMaxTouchPoints > 0) ||
		window.matchMedia('(pointer: coarse)').matches
	)
}

export function getRandomIntInclusive(min, max) {
	min = Math.ceil(min)
	max = Math.floor(max)
	return Math.floor(Math.random() * (max - min + 1)) + min
}

const regex = /\$\$(.*?)\$\$/g
const replacementLatex = (_, p1) => '$$' + math(p1).latex + '$$'

const replacementTexmacs = (_, p1) => '$' + math(p1).texmacs + '$'

export const formatToLatex = (o) => {
	if (!o) {
		return ''
	}
	if (Array.isArray(o)) {
		return o.map((elmt) => formatToLatex(elmt))
	} else if (o.text) {
		return { ...o, text: formatToLatex(o.text) }
	} else if (typeof o === 'string') {
		return o.replace(regex, replacementLatex)
	} else {
		return o
	}
}

export const formatToTexmacs = (o) => {
	if (!o) {
		return ''
	}
	if (Array.isArray(o)) {
		return o.map((elmt) => formatToTexmacs(elmt))
	} else if (o.text) {
		return { ...o, text: formatToTexmacs(o.text) }
	} else if (typeof o === 'string') {
		return o.replace(regex, replacementTexmacs)
	} else {
		return o
	}
}

export { getLogger, shuffle, isEmpty, getPropertyName, lexicoSort, cleanString }
