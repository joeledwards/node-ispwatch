
class BaseAuth {
    constructor ({ authKey }) {
        this._authKey = authKey
        this._authenticated = this._authKey == null
    }

    isAuthenticated () {
        return this._authenticated
    }

    setAuthenticated () {
        this._authenticated = true
    }

    deauth () {
        this._authenticated = this._authKey == null
    }
}

class ServerAuth extends BaseAuth {
    constructor (options) {
        super(options)
    }

    withAuth({ record, action, failureAction, authAction }) {
        console.verbose("Checking authentication status ...")

        let passedAuth = false
        let wasAuthMessage = false

        if (this.isAuthenticated()) {
            passedAuth = true
        } else {
            try {
                if (record.event === "AUTH") {
                    wasAuthMessage = true

                    if (record.key === this._authKey) {
                        passedAuth = true
                    }
                }
            } catch (error) {
                console.error(`Error processing expected authentication message ${error}`)
            }
        }

        if (passedAuth) {
            if (wasAuthMessage) {
                this.setAuthenticated()
                if (authAction != null) {
                    authAction()
                }
            } else {
                if (action != null) {
                    action(record)
                }
            }
        } else {
            if (failureAction != null) {
                failureAction()
            }
        }
    }
}

class ClientAuth extends BaseAuth {
    constructor (options) {
        super(options)
    }

    authenticate (authTarget) {
        if (this._authKey == null) {
            console.info("Authentication not need (no auth key configured).")
        } else if (this.isAuthenticated()) {
            console.info("Already authenticated.")
        } else {
            console.info("Sending the authentication key ...")

            const authRecord = {
                event: "AUTH",
                key: this._authKey,
            }

            authTarget(authRecord)
            this.setAuthenticated()
        }
    }

    withAuth({ record, action }) {
        if (action != null) {
            action(record)
        }
    }
}

module.exports = {
    ClientAuth,
    ServerAuth,
}