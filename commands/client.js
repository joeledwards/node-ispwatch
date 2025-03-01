const logalog = require('log-a-log')
const WebSocket = require('ws')
const { Exchange } = require('../lib/exchange.js')
const { PingPong } = require('../lib/ping.js')

function builder (yarg) {
  yarg
    .positional('server-address', {
      type: 'string',
      desc: 'The address (<host>:<port>) of the server',
    })
    .option('secure', {
      type: 'boolean',
      desc: 'Connect using TLS',
    })
}

function parseAddress (addressString) {
  const [host, port] = addressString.split(':', 2)

  return {
    host,
    port: Number(port),
  }
}

async function handler ({
  serverAddress,
  secure,
} = {}) {
  logalog()

  const { host, port } = parseAddress(serverAddress)

  const scheme = secure ? 'wss' : 'ws'
  const url = `${scheme}://${host}:${port}`

  console.info(`Connecting to server at ${url} ...`)

  const ws = new WebSocket(url)

  const exchange = new Exchange(ws)
  exchange.run()
}

module.exports = {
  command: 'client <server-address>',
  desc: 'Run an ISP Watch client',
  builder,
  handler,
}
