const logalog = require('log-a-log')
const WebSocket = require('ws')
const { Exchange } = require('../lib/exchange.js')
const { configureLogger } = require('../lib/logging.js')

function builder (yarg) {
  yarg
    .env("ISPWATCH")
    .positional('server-url', {
      type: 'string',
      desc: 'The URL of the server (e.g. ws://localhost:29873)',
    })
    .option('auth-key', {
      type: 'string',
      desc: 'If specified, send this to the server immediately after connecting to authenticate',
    })
    .option('log-level', {
      type: 'string',
      choices: ['off', 'error', 'warn', 'info', 'verbose'],
      default: 'warn',
    })
}

async function handler ({
  authKey,
  serverUrl: url,
  logLevel,
} = {}) {
  configureLogger({ logLevel })

  console.info(`Connecting to server at ${url} ...`)

  const ws = new WebSocket(url)

  const exchange = new Exchange({ ws, isServer: false, authKey })
  exchange.run()
}

module.exports = {
  command: 'client <server-url>',
  desc: 'Run an ISP Watch client',
  builder,
  handler,
}
