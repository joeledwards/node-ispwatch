const logalog = require('log-a-log')
const WebSocket = require('ws')
const { Exchange } = require('../lib/exchange.js')
const { PingPong } = require('../lib/ping.js')

function builder (yarg) {
  yarg
    .option('bind-port', {
      type: 'number',
      desc: 'TCP port to which the server should bind',
      default: 29873,
    })
}

async function handler ({
  bindPort,
} = {}) {
  logalog()

  console.info(`Running WebSocket server on port ${bindPort}`)

  const server = new WebSocket.Server({ port: bindPort })

  server.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress
    console.info(`Client connected: ${clientIp}`)

    const exchange = new Exchange(ws)
    exchange.run()
  })
}

module.exports = {
  command: 'server',
  desc: 'Run an ISP Watch server',
  builder,
  handler,
}
