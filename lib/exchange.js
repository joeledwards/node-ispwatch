const c = require('@buzuli/color')
const buzJson = require('@buzuli/json')
const WebSocket = require('ws')
const { PingPong } = require('../lib/ping.js')
const { ClientAuth, ServerAuth } = require('../lib/auth.js')

/**
 * This class is responsible for exchanging between client and server as
 * the two are indistinguishable once the connection has been established.
 **/
class Exchange {
  constructor ({ ws, isServer, authKey }) {
    this.ws = ws
    this.isServer = isServer
    this.auth = isServer ? new ServerAuth({ authKey }) : new ClientAuth({ authKey })
    this.authKey = authKey
    this.pingPong = new PingPong()
    this.pingInterval = null
    this.connected = false
    this.authenticated = false
  }

  // Determines whether the exchange is in a state where it can send a message
  connectionReady () {
    if (!this.connected) {
      return false
    }

    if (!this.ws.readyState === WebSocket.OPEN) {
      return false
    }

    return true
  }

  isAuthenticated () {
    return this.auth.isAuthenticated()
  }

  // Deliver a message if the socket is open
  sendMessage ({ msg, logMessage = false, requireAuth = true }) {
    if (!this.connectionReady()) {
      console.verbose('Connection is not ready. Cannot send message.')
    } else if (requireAuth && !this.isAuthenticated()) {
      console.verbose('Connection not authenticated. Cannot send message.')
    }  else {
      if (logMessage) {
        console.verbose(`Sending message: ${msg}`)
      } else {
        console.verbose(`Sending message of length ${msg.length}`)
      }

      this.ws.send(msg)
    }
  }

  // Authenticate the client if configured with an auth key
  authenticateClient () {
    this.auth.authenticate(authRecord => {
      const json = JSON.stringify(authRecord)
      this.sendMessage({ msg: json, requireAuth: false })
    })
  }

  // Send a ping
  pinger () {
    if (this.connectionReady() && this.isAuthenticated()) {
      const record = this.pingPong.makePing()
      console.verbose(`Sending ping: ${buzJson(record, {indent:false})}`)
      const json = JSON.stringify(record)
      this.sendMessage({ msg: json, logMessage: true })
    }
  }

  // Handle the client's connection opening
  async handleOpen () {
    try {
      console.info('Connected to the server.')
      this.connected = true
      this.authenticateClient()
      this.runExchange()
    } catch (error) {
      console.error(`Error handling open conneciton in handler : ${error}`, error)
    }
  }

  // Handle the connection closing
  handleClose () {
    console.info('Disconnected.')

    this.connected = false
    this.auth.deauth()

    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }

    if (this.isServer) {
      this.ws.removeAllListeners()
    }
  }

  handleError (error) {
    console.error('Websocket error:', error.message)
  }

  handleEvent (record) {
    try {
      if (record.event === 'PING') {
        console.verbose(`Received PING record: ${buzJson(record, {indent:false})}`)
        const pong = this.pingPong.handlePing(record)
        const json = JSON.stringify(pong)
        this.sendMessage({ msg: json, logMessage: true })
      } else if (record.event === 'PONG') {
        console.verbose(`Received PONG record: ${buzJson(record, {indent:false})}`)
        const summary = this.pingPong.handlePong(record)
        console.verbose(`PING/PONG exchange took ${c.blue(summary.watch)}`)
      } else {
        console.verbose(`Received record with unrecognized event: ${record.event}`)
      }
    } catch (error) {
      console.error(`Error processing message ${error}`, error)
    }
  }

  handleMessage (msg) {
    try {
      console.verbose("Handling a message...")

      const record = JSON.parse(msg)
      this.auth.withAuth({
        record,
        action: this.handleEvent.bind(this),
        failureAction: () => {
          console.warn('Not authenticated. Closing connection.')
          this.ws.close()
        },
        authAction: () => {
          console.info('Authentication key accepted.')
        }
      })
    } catch (error) {
      console.error(`Invalid message format (JSON required): ${error}`)
      this.ws.close()
    }
  }

  runExchange () {
    console.info("Starting exchange ...")
    this.ws.on('message', this.handleMessage.bind(this))
    this.pingInterval = setInterval(this.pinger.bind(this), 1000)
  }

  async run () {
    this.ws.on('close', this.handleClose.bind(this))
    this.ws.on('error', this.handleError.bind(this))

    if (this.isServer) {
      this.connected = true
      this.runExchange()
    } else {
      this.ws.on('open', this.handleOpen.bind(this))
    }
  }
}

module.exports = {
  Exchange
}
