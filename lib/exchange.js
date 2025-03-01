const c = require('@buzuli/color')
const WebSocket = require('ws')
const { PingPong } = require('../lib/ping.js')

/**
 * This class is responsible for exchanging between client and server as
 * the two are indistinguishable once the connection has been established.
 **/
class Exchange {
  constructor (ws, isClient) {
    this.ws = ws
    this.isClient = isClient
    this.pingPong = new PingPong()
    this.pingInterval = null
  }

  sendMessage (msg) {
    if (this.ws.readyState === WebSocket.OPEN) {
      console.info(`Sending message "${msg}"`)
      this.ws.send(msg)
    } else {
      console.info('Connection is down. Cannot send message.')
    }
  }

  run () {
    if (this.isClient) {
      this.ws.on('open', () => {
        console.info('Connected.')
      })
    }

    this.ws.on('message', msg => {
      try {
        console.info(`Received message: ${msg}`)

        const record = JSON.parse(msg)

        if (record.event === 'PING') {
          const pong = this.pingPong.handlePing(record)
          const json = JSON.stringify(pong)
          this.sendMessage(json)
        } else if (record.event === 'PONG') {
          const summary = this.pingPong.handlePong(record)
          console.info(`Exchange took ${c.blue(summary.watch)}`)
        }
      } catch (error) {
        console.error(`Error processing message ${error}`, error)
      }
    })

    this.pingInterval = setInterval(() => {
      const record = this.pingPong.makePing()
      const json = JSON.stringify(record)
      this.sendMessage(json)
    }, 1000)

    this.ws.on('close', () => {
      console.info('Disconnected.')
      if (this.pingInterval) {
        clearInterval(this.pingInterval)
      }
    })

    this.ws.on('error', error => {
      console.error('Websocket error:', error.message)
    })
  }
}

module.exports = {
  Exchange
}
