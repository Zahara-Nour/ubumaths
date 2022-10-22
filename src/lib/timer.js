export function createTimer(delay, tick, timeout) {
	let ticker
	let status = 'done'
	let days
	let hours
	let minutes
	let seconds
	let remaining = delay
	calculate(remaining)

	function calculate(remaining) {
		days = Math.floor((remaining * 1000) / (1000 * 60 * 60 * 24))
		hours = Math.floor(
			((remaining * 1000) % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
		)
		minutes = Math.floor(((remaining * 1000) % (1000 * 60 * 60)) / (1000 * 60))
		seconds = Math.floor(((remaining * 1000) % (1000 * 60)) / 1000)
	}

	const callback = () => {
		remaining -= 1
		calculate(remaining)
		tick()
		if (remaining <= 0) {
			status === 'done'
			clearInterval(ticker)
			timeout()
		}
	}

	const timer = {
		status() {
			return status
		},
		start() {
			remaining = delay
			calculate(remaining)
			if (ticker) clearInterval(ticker)
			ticker = setInterval(callback, 1000)
			status = 'running'
		},
		pause() {
			if (status === 'running') {
				status = 'paused'
				clearInterval(ticker)
				ticker = null
			}
		},
		stop() {
			if (status === 'running') {
				clearInterval(ticker)
				ticker = null
				status = 'done'
			}
		},
		resume() {
			if (status === 'paused') {
				ticker = setInterval(callback, 1000)
				status = 'running'
			}
		},

		getTime() {
			return { days, hours, minutes, seconds }
		},
	}
	return timer
}
