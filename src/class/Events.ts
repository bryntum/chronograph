import { AnyConstructor, Base, Mixin, PrototypeOf } from "./BetterMixin.js"

// //---------------------------------------------------------------------------------------------------------------------
// export const ContextSync    = Symbol('ContextSync')
// export const ContextAsync   = Symbol('ContextSync')
//
// export type Context         = typeof ContextSync | typeof ContextAsync
//
// export type Contexts<ResultT> = {
//     [ContextSync]   : ResultT,
//     [ContextAsync]  : Promise<ResultT>
// }

//---------------------------------------------------------------------------------------------------------------------
class EventMeta<Payload> extends Array<Listener<Payload>> {
    Payload     : Payload
}


//---------------------------------------------------------------------------------------------------------------------
type Listener<Payload> = (event : Event<Payload>, payload : Payload) => any


//---------------------------------------------------------------------------------------------------------------------
class EventInstance<Payload> extends Array<Listener<Payload>> {
    // Type-only
    Payload     : Payload

    emitter     : EventEmitter      = undefined

    get listeners () : Array<Listener<Payload>> {
        return this
    }


    on (listener : Listener<Payload>) {
        this.listeners.push(listener)
    }


    un (listener : Listener<Payload>) {
        const index = this.listeners.indexOf(listener)

        this.listeners.splice(index, 1)
    }


    trigger (payload : Payload) : Event<Payload> {
        const event     = new Event<Payload>({ payload, emitter : this })

        this.reduce((event, listener) => listener(event, payload), event)

        return event
    }
}



//---------------------------------------------------------------------------------------------------------------------
export const event = <T extends EventMeta<Payload>, Payload>(eventConfig? : Partial<T>, eventCls : typeof EventInstance = EventInstance) : PropertyDecorator => {

    return function (target : EventEmitter, propertyKey : string) : void {
        const eventNames        = target.eventNames

        if (!target.hasOwnProperty(propertyKey)) {
            target.eventNames   = target.eventNames.slice()
        }

        eventNames.push(propertyKey)

        const storageKey        = '$' + propertyKey

        Object.defineProperty(target, propertyKey, {
            // generate a new Function where the storageKey will be encoded directly into source code?
            get     : function (this : EventEmitter) : any {
                if (this[ storageKey ] !== undefined) return this[ storageKey ]

                const newEventInstance : EventInstance<Payload> = new eventCls()

                newEventInstance.emitter    = this

                return this[ storageKey ] = newEventInstance
            }
        })
    }
}

//---------------------------------------------------------------------------------------------------------------------
export class EventEmitter extends Mixin(
    [],
    (base : AnyConstructor) => {

    class EventEmitter extends base {
        eventNames  : string[]

        initEvents () {
            for (let i = 0; i < this.eventNames.length; i++) {
                this[ '$' + this.eventNames[ i ] ]    = undefined
            }
        }
    }

    return EventEmitter
}){}


//---------------------------------------------------------------------------------------------------------------------
class Event<Payload> {
    // Type-only
    Payload     : any

    emitter     : EventInstance<Payload>    = undefined

    payload     : this[ 'Payload' ]         = undefined

    constructor (config : Partial<Event<Payload>>) {
        Object.assign(this, config)
    }
}


//---------------------------------------------------------------------------------------------------------------------
// export type EventT<Payload, EventClass extends EventInstance<Payload> = EventInstance<Payload>> = ((arg : Payload) => void) & EventInstance<Payload>


//---------------------------------------------------------------------------------------------------------------------
export class ManagedArray<Element> extends Mixin(
    [ EventEmitter, Array ],
    <Element>(base : AnyConstructor<EventEmitter & Array<Element>, typeof EventEmitter & typeof Array>) => {

    class ManagedArray extends base {
        Element                 : Element

        slice : (start? : number, end? : number) => this[ 'Element' ][]

        @event()
        newElement              : EventInstance<{ pos : number }>


        push (...args : this[ 'Element' ][]) : number {
            const res = super.push(...args)

            this.newElement.trigger({ pos : this.length })

            return res
        }
    }

    return ManagedArray
}){}

export interface ManagedArray<Element> {
    Element : Element
}

const arr = new ManagedArray<boolean>()

arr.slice

const aa = arr.slice()

// aa.push(11)
//
// arr.push(11)

const newElementObservingDisposer = arr.newElement.on((data, event) => {})
