const durations = require('durations')

class PingPong {
  constructor () {
    this.nextId = 0
    this.outstanding = new Map()
  }

  now () {
    return new Date().toISOString()
  }

  makePing () {
    const id = this.nextId++

    const ping = {
      event: 'PING',
      id,
      ts: this.now(),
    }

    this.outstanding.set(id, {
      ...ping,
      watch: durations.stopwatch().start(),
    })

    return ping
  }

  handlePong (pong) {
    const { id } = pong
    const ping = this.outstanding.get(id)
    ping.watch.stop()

    return ping
  }

  handlePing (ping) {
    const { id } = ping
    return {
      event: 'PONG',
      id,
      ts: this.now(),
    }
  }
}

module.exports = {
  PingPong
}
