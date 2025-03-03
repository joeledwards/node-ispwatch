# ISP Watch

Monitors the health of your connection to the Internet.

I created this out of a need to keep an eye on the reliability
of the service I receive from my ISP.

Requires an ispwatch server running elsewhere on the Internet,
which itself has a stable Internet connection.

## How it Works

The ispwatch server opens a TCP port to which clients connect.
Each client needs to authenticate and uniquely identify itself.

Once a connection is established, the client and server perform regular
exchanges. Each exchange starts with one end sending a PING and the
responding with a PONG.

These exchanges are initiated on either side every second.
Each exchange is uniquely identified, allowing mutiple to be in
flight simultaneously.

The client reconnects any time it is disconnected, or as soon
as a connect attempt times out.
A connection attempt times out after 5 seconds. 

Events are colllected from which metrics can be derived:
* Disconnect
* Successful connect
* Failed connect attempt
* PING sent
* PING received
* PONG sent
* PONG received

Metrics:
* Number of disconnects
* Number of failed connects
* Connect delay
* Ping delays
* Total pings received
* Total pongs received (successful round-trips)

In addition to general connection health metrics, regular speed tests
can be performed. Should default to hourly and can be capped. Sometimes
you don't care what the total capacity is, just that a minimum is
being met.

## Server

To run the server:

```shell
./bin/daemon.js server
```

The default bind port is `29873`

To enable auth, you can set the auth key via the `--auth-key` CLI option or the
`ISPWATCH_AUTH_KEY` environment variable.

## Client

To run the client:

```shell
./bin/daemon.js client <server-url>
```

For example, to connect to a server run locally with the default bind port:

```shell
./bin/daemon client ws://localhost:29873
```

If the server has auth enabled, you can configure the auth key via the `--auth-key` CLI 
option or the `ISPWATCH_AUTH_KEY` environment variable.

## Auth

The `--auth-key` CLI option or `ISPWATCH_AUTH_KEY` environment variable can be used to
supply an auth key to the daemon (either the client or the server).

If the server has an auth key configured, it will require the client to use that key
to authenticate as its first action, otherwise the client will be disconnected.
