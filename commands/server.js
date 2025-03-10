const WebSocket = require('ws')
const { Exchange } = require('../lib/exchange.js')
const { configureLogger } = require('../lib/logging.js')

function builder (yarg) {
  yarg
    .env("ISPWATCH")
    .option('auth-key', {
      type: 'string',
      desc: 'If specified, every clients must supply this in its first message to the server, or be disconnected',
    })
    .option('bind-port', {
      type: 'number',
      desc: 'TCP port to which the server should bind',
      default: 29873,
    })
    .option('log-level', {
      type: 'string',
      choices: ['off', 'error', 'warn', 'info', 'verbose'],
      default: 'info',
    })
    .option('max-payload-bytes', {
      type: 'number',
      default: 2 * 1024 * 1024,
    })
}

async function handler ({
  authKey,
  bindPort,
  logLevel,
  maxPayloadBytes
} = {}) {
  configureLogger({ logLevel })

  console.info(`Running WebSocket server on port ${bindPort}`)

  let nextConnectionId = 0

  const server = new WebSocket.Server({
    port: bindPort,

    // We need to keep the original size as the intent is to test link performance.
    perMessageDeflate: false,

    // Cap the payload so we have at least some protection against DoS attacks
    maxPayload: maxPayloadBytes,
  })

  server.on('connection', (ws, req) => {
    const id = nextConnectionId++
    const clientIp = req.socket.remoteAddress
    console.info(`Client connected: ${clientIp}`)

    const exchange = new Exchange({ ws, isServer: true , authKey, id })
    exchange.run()
  })
}

module.exports = {
  command: 'server',
  desc: 'Run an ISP Watch server',
  builder,
  handler,
}
