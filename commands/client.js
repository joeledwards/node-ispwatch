const logalog = require('log-a-log')
const WebSocket = require('ws')

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

function sendMessage ({ ws, msg }) {
  if (ws.readyState === WebSocket.OPEN) {
    console.info(`Sending message "${msg}"`)
    ws.send(msg)
  } else {
    console.info('Connection is down. Cannot send message.')
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

  ws.on('open', () => {
    console.info('Connected.')
  })

  ws.on('message', msg => {
    console.info(`Received message: ${msg}`)

    if (msg === 'PING') {
      sendMessage({ ws,  msg: 'PONG' })
    }
  })

  const pingInterval = setInterval(() => {
    sendMessage({ ws, msg: 'PING' })
  }, 1000)

  ws.on('close', () => {
    console.info('Disconnected.')
    clearInterval(pingInterval)
  })

  ws.on('error', error => {
    console.error('Websocket error:', error.message)
  })
}

module.exports = {
  command: 'client <server-address>',
  desc: 'Run an ISP Watch client',
  builder,
  handler,
}
