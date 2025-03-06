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
  constructor ({ id, ws, isServer, authKey }) {
    this.id = id
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
      this.logVerbose('Connection is not ready. Cannot send message.')
    } else if (requireAuth && !this.isAuthenticated()) {
      this.logVerbose('Connection not authenticated. Cannot send message.')
    }  else {
      if (logMessage) {
        this.logVerbose(`Sending message: ${msg}`)
      } else {
        this.logVerbose(`Sending message of length ${msg.length}`)
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
      this.logVerbose(`Sending ping: ${buzJson(record, {indent:false})}`)
      const json = JSON.stringify(record)
      this.sendMessage({ msg: json, logMessage: true })
    }
  }

  // Handle the client's connection opening
  async handleOpen () {
    try {
      this.logInfo('Connected to the server.')
      this.connected = true
      this.authenticateClient()
      this.runExchange()
    } catch (error) {
      this.logError(`Error handling open conneciton in handler : ${error}`, error)
    }
  }

  // Handle the connection closing
  handleClose (code, reason) {
    this.logInfo('Disconnected.')

    this.connected = false
    this.auth.deauth()

    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }

    if (this.isServer) {
      this.ws.removeAllListeners()
    }

    this.logInfo(`Connection closed: ${code} ${reason}`)
  }

  handleError (error) {
    this.logError('Websocket error:', error.message)
  }

  // Handle JSON control records
  handleEvent (record) {
    try {
      if (record.event === 'PING') {
        this.logVerbose(`Received PING record: ${buzJson(record, {indent:false})}`)
        const pong = this.pingPong.handlePing(record)
        const json = JSON.stringify(pong)
        this.sendMessage({ msg: json, logMessage: true })
      } else if (record.event === 'PONG') {
        this.logVerbose(`Received PONG record: ${buzJson(record, {indent:false})}`)
        const summary = this.pingPong.handlePong(record)
        this.logVerbose(`PING/PONG exchange took ${c.blue(summary.watch)}`)
      } else {
        this.logVerbose(`Received record with unrecognized event: ${record.event}`)
      }
    } catch (error) {
      this.logError(`Error processing message ${error}`, error)
    }
  }

  // Entry-point handler for all messages received from the websocket
  handleMessage (msg) {
    // TODO: add the ability to handle raw messages

    try {
      this.logVerbose("Handling a message...")

      const record = JSON.parse(msg)
      this.auth.withAuth({
        record,
        action: this.handleEvent.bind(this),
        failureAction: () => {
          this.logWarn('Not authenticated. Closing connection.')
          this.ws.close(1008, 'Not authenticated')
        },
        authAction: () => {
          this.logInfo('Authentication key accepted.')
        }
      })
    } catch (error) {
      this.logError(`Invalid message format (JSON required): ${error}`)
      this.ws.close(1008, 'Message not JSON')
    }
  }

  // Initialize the exchange (after any setup has completed)
  runExchange () {
    this.logInfo("Starting exchange ...")
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

  logError (...args) {
    this.log(console.error.bind(console), ...args)
  }

  logWarn (...args) {
    this.log(console.warn.bind(console), ...args)
  }

  logInfo (...args) {
    this.log(console.info.bind(console), ...args)
  }

  logVerbose (...args) {
    this.log(console.verbose.bind(console), ...args)
  }

  logLog (...args) {
    this.log(console.log.bind(console), ...args)
  }

  log (target, ...args) {
    const [msg, ...rest] = args
    let message

    if (typeof msg === 'string' && this.id != null) {
      message = `[${c.orange(this.id)}] ${msg}`
    } else {
      message = msg
    }

    target(message, ...rest)
  }
}

module.exports = {
  Exchange
}
