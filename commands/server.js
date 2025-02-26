const logalog = require('log-a-log')
const WebSocket = require('ws')

function builder (yarg) {
  yarg
    .option('bind-port', {
      type: 'number',
      desc: 'TCP port to which the server should bind',
      default: 29873,
    })
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
  bindPort,
} = {}) {
  logalog()

  console.info(`Running WebSocket server on port ${bindPort}`)

  const server = new WebSocket.Server({ port: bindPort })

  server.on('connection', (ws, req) => {
    const clientIp = req.socket.remoteAddress
    console.info(`Client connected: ${clientIp}`)

    ws.isAlive = true

    ws.on('message', msg => {
      console.info(`Received message: ${msg}`)

      if (msg === 'PING') {
        sendMessage({ ws,  msg: 'PONG' })
      }
    })

    const pingInterval = setInterval(() => {
      sendMessage({ ws, msg: "PING" })
    }, 1000)

    ws.on('close', () => {
      console.info(`Connection closed: ${clientIp}`)
      clearInterval(pingInterval)
    })

  })
}

module.exports = {
  command: 'server',
  desc: 'Run an ISP Watch server',
  builder,
  handler,
}
