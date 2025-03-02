const c = require('@buzuli/color')
const WebSocket = require('ws')
const { PingPong } = require('../lib/ping.js')

/**
 * This class is responsible for exchanging between client and server as
 * the two are indistinguishable once the connection has been established.
 **/
class Exchange {
  constructor ({ ws, isServer, authKey }) {
    this.ws = ws
    this.isServer = isServer
    this.authKey = authKey
    this.pingPong = new PingPong()
    this.pingInterval = null
    this.connected = false
    this.authenticated = false
  }

  // Deliver a message if the socket is open
  sendMessage (msg, quiet = false) {
    if (this.ws.readyState === WebSocket.OPEN) {
      if (!quiet) {
        console.info(`Sending message "${msg}"`)
      }
      this.ws.send(msg)
    } else {
      console.info('Connection is down. Cannot send message.')
    }
  }

  // Deliver the auth key
  sendAuth () {
    console.info("Sending auth to the server ...")

    const authRecord = {
      event: "AUTH",
      key: this.authKey,
    }

    const json = JSON.stringify(authRecord)

    this.sendMessage(json, true)
  }

  // Authenticate the client if configured with an auth key
  authenticateClient () {
    if (this.authKey != null) {
      this.sendAuth()
    }

    this.authenticated = true
  }

  // Pass msg on to action() if auth passes.
  // Close the websocket if auth fails.
  //
  // If this is a server, and the auth key is set, and the client has not yet authenticated,
  // process the message as an auth message.
  withAuth (msg, action) {
    console.info("Checking auth status ...")

    let passedAuth = false
    let wasAuthMessage = false

    if (!this.isServer) {
      passedAuth = true
    } else if (this.authKey == null) {
      passedAuth = true
    } else if (this.authenticated === true) {
      passedAuth = true
    } else {
      try {
        const record = JSON.parse(msg)
        if (record.event === "AUTH") {
          wasAuthMessage = true

          if (record.key === this.authKey) {
            console.info('Authentication key accepeted.')
            passedAuth = true
            this.authenticated = true
          }
        }
      } catch (error) {
        console.error(`Error processing expected authentication message ${error}`)
      }
    }

    if (passedAuth) {
      if (!wasAuthMessage) {
        action(msg)
      } else {
        console.info("")
      }
    } else {
      console.warn('Not authorized. Closing connection.')
      this.ws.close()
    }
  }

  // Send a ping
  pinger () {
    if (this.connected && this.authenticated) {
      const record = this.pingPong.makePing()
      const json = JSON.stringify(record)
      this.sendMessage(json)
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
    this.authenticated = false

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

  handleEvent (msg) {
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
  }

  handleMessage (msg) {
    this.withAuth(msg, this.handleEvent.bind(this))
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
