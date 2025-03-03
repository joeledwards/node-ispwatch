const logalog = require('log-a-log')

function configureLogger ({ logLevel = 'warn' } = {}) {
    const logConfig = {
        error: false,
        warn: false,
        info: false,
        verbose: false,
    }

    switch (logLevel) {
        case 'verbose':
            logConfig.verbose = true
        case 'info':
            logConfig.info = true
        case 'warn':
            logConfig.warn = true
        case 'error':
            logConfig.error = true
        case 'off':
        default:
    }

    logalog(logConfig)
}

module.exports = {
    configureLogger
}