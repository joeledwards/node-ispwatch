const logalog = require('log-a-log')
const WebSocket = require('ws')
const { Exchange } = require('../lib/exchange.js')
const { PingPong } = require('../lib/ping.js')

function builder (yarg) {
  yarg
    .env("ISPWATCH")
    .positional('server-address', {
      type: 'string',
      desc: 'The address (<host>:<port>) of the server',
    })
    .option('secure', {
      type: 'boolean',
      desc: 'Connect using TLS',
    })
    .option('auth-key', {
      type: 'string',
      desc: 'If specified, send this to the server immediately after connecting to authenticate',
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
  authKey,
  serverAddress,
  secure,
} = {}) {
  logalog()

  const { host, port } = parseAddress(serverAddress)

  const scheme = secure ? 'wss' : 'ws'
  const url = `${scheme}://${host}:${port}`

  console.info(`Connecting to server at ${url} ...`)

  const ws = new WebSocket(url)

  const exchange = new Exchange({ ws, isServer: false, authKey })
  exchange.run()
}

module.exports = {
  command: 'client <server-address>',
  desc: 'Run an ISP Watch client',
  builder,
  handler,
}
