import { AnyConstructor, Base, Mixin } from "./BetterMixin.js"

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
class EventMeta<Payload> extends Array<(payload : Payload, event : Event<Payload>) => any> {
    Payload     : Payload
}


//---------------------------------------------------------------------------------------------------------------------
class Listener<Payload> extends Base {
    listener    : (payload : Payload, event : Event<Payload>) => any = undefined
    scope       : any   = undefined
}


//---------------------------------------------------------------------------------------------------------------------
class EventInstance<Payload> extends EventMeta<Payload> {
    listeners   : Array<(payload : Payload, event : Event<Payload>) => any>

    emitter     : EventEmitter      = undefined

    Payload     : Payload

    on (listener : (payload : Payload, event : Event<Payload>) => any) {
        return () => this.un(listener)
    }


    un (listener : (payload : Payload, event : Event<Payload>) => any) {
        const index = this.indexOf(listener)

        this.splice(index, 1)
    }


    trigger (payload : Payload) : Event<Payload> {
        const event     = EventC<Payload>({ payload, source : this.emitter })

        this.reduce((event, listener) => listener(payload, event), event)

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

                const newEventInstance  = new EventInstance()

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
export class Event<Payload> extends Mixin(
    [ Base ],
    (base : AnyConstructor<Base, typeof Base>) => {

    class Event extends base {
        Payload     : any

        source      : EventEmitter

        payload     : this[ 'Payload' ]
    }

    return Event
}){}

export interface Event<Payload> {
    Payload : Payload
}

const EventC = <Payload>(config : Partial<Event<Payload>>) => Event.new(config) as Event<Payload>


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
