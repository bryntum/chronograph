//---------------------------------------------------------------------------------------------------------------------
export type Listener<Payload extends unknown[]> = (...payload : Payload) => any

export type Disposer = () => any

//---------------------------------------------------------------------------------------------------------------------
export class Hook<Payload extends unknown[]> {
    hooks       : Listener<Payload> []  = []


    on (listener : Listener<Payload>) : Disposer {
        this.hooks.push(listener)

        return () => this.un(listener)
    }


    un (listener : Listener<Payload>) {
        const index = this.hooks.indexOf(listener)

        if (index !== -1) this.hooks.splice(index, 1)
    }


    trigger (...payload : Payload) {
        const listeners     = this.hooks.slice()

        for (let i = 0; i < listeners.length; ++i) {
            listeners[ i ](...payload)
        }
    }
}
