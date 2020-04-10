import { AnyConstructor, Mixin } from "../class/BetterMixin.js"
import { MIN_SMI } from "../util/Helpers.js"
import { compact, Uniqable } from "../util/Uniqable.js"

//---------------------------------------------------------------------------------------------------------------------
type Listener<Payload extends Array<unknown>> = (...payload : Payload) => any

export type Disposer = () => any

//---------------------------------------------------------------------------------------------------------------------
class EventMeta<Payload extends Array<unknown>> extends Array<Listener<Payload>> {
}


//---------------------------------------------------------------------------------------------------------------------
export class Event<Payload extends Array<unknown>> extends Array<Listener<Payload>> {
    compacted       : boolean       = false


    get listeners () : Array<Listener<Payload>> {
        return this
    }


    initialize (config) {
    }


    on (listener : Listener<Payload>) : Disposer {
        (listener as unknown as Uniqable).uniqable   = MIN_SMI

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
        compact(this as unknown as Uniqable[])
    }
}



//---------------------------------------------------------------------------------------------------------------------
export const event = <T extends EventMeta<Payload>, Payload extends Array<unknown>>(eventConfig? : Partial<T>, eventCls : typeof Event = Event) : PropertyDecorator => {

    return function (target : EventEmitter, propertyKey : string) : void {
        let eventStorageKeys  = target.eventStorageKeys

        if (!target.hasOwnProperty(propertyKey)) {
            target.eventStorageKeys   = eventStorageKeys = (eventStorageKeys || []).slice()
        }

        const storageKey        = 'event:' + propertyKey

        eventStorageKeys.push(storageKey)

        Object.defineProperty(target, propertyKey, {
            // generate a new Function where the storageKey will be encoded directly into source code?
            get     : function (this : EventEmitter) : any {
                if (this[ storageKey ] !== undefined) return this[ storageKey ]

                const eventProperty : Event<Payload> = new eventCls()

                eventProperty.initialize(eventConfig)

                return this[ storageKey ] = eventProperty
            }
        })
    }
}

//---------------------------------------------------------------------------------------------------------------------
export class EventEmitter extends Mixin(
    [],
    (base : AnyConstructor) => {

    class EventEmitter extends base {
        // prototype-only property
        eventStorageKeys        : string[]

        constructor (...args : any[]) {
            super(...args)

            // init all storage keys to `undefined` to allocate memory
            if (this.eventStorageKeys) {
                for (let i = 0; i < this.eventStorageKeys.length; i++) this[ this.eventStorageKeys[ i ] ] = undefined
            }
        }
    }

    return EventEmitter
}){}


