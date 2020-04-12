//---------------------------------------------------------------------------------------------------------------------
import { MIN_SMI } from "../util/Helpers.js"
import { compact, Uniqable } from "../util/Uniqable.js"
import { Disposer, Listener } from "./Hook.js"


//---------------------------------------------------------------------------------------------------------------------
export class Event<Payload extends unknown[]> {
    compacted       : boolean                           = false
    listeners       : Listener<Payload> [] & Uniqable[] = []


    on (listener : Listener<Payload>) : Disposer {
        // @ts-ignore
        listener.uniqable   = MIN_SMI

        this.listeners.push(listener)

        this.compacted  = false

        return () => this.un(listener)
    }


    un (listener : Listener<Payload>) {
        if (!this.compacted) this.compact()

        const index = this.listeners.indexOf(listener)

        if (index !== -1) this.listeners.splice(index, 1)
    }


    trigger (...payload : Payload) {
        if (!this.compacted) this.compact()

        const listeners     = this.listeners.slice()

        for (let i = 0; i < listeners.length; ++i) {
            listeners[ i ](...payload)
        }
    }


    compact () {
        compact(this.listeners)
    }
}
