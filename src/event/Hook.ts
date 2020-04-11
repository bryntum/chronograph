//---------------------------------------------------------------------------------------------------------------------
type Listener<Payload extends Array<unknown>> = (...payload : Payload) => any

export type Disposer = () => any

//---------------------------------------------------------------------------------------------------------------------
export class Hook<Payload extends Array<unknown>> {
    listeners       : Listener<Payload> []  = []


    on (listener : Listener<Payload>) : Disposer {
        this.listeners.push(listener)

        return () => this.un(listener)
    }


    un (listener : Listener<Payload>) {
        const index = this.listeners.indexOf(listener)

        if (index !== -1) this.listeners.splice(index, 1)
    }


    trigger (...payload : Payload) {
        const listeners     = this.listeners.slice()

        for (let i = 0; i < listeners.length; ++i) {
            listeners[ i ](...payload)
        }
    }
}
