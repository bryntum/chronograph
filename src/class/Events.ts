import { AnyConstructor, Base, Mixin, MixinAny } from "./BetterMixin.js"

//---------------------------------------------------------------------------------------------------------------------
class EventMeta<Payload> extends Array<(payload : Payload, event : Event<Payload>) => any> {
    Payload     : Payload
}


//---------------------------------------------------------------------------------------------------------------------
class EventInstance<Payload> extends EventMeta<Payload> {
    Payload     : Payload

    on (listener : (payload : Payload, event : Event<Payload>) => any) {
        this.push(listener)

        return () => {}
    }


    un (listener : (payload : Payload, event : Event<Payload>) => any) {

    }


    trigger (payload : Payload) : Event<Payload> {
        const event     = EventC<Payload>({ payload })

        this.reduce((event, listener) => listener(payload, event), event)

        return event
    }
}



//---------------------------------------------------------------------------------------------------------------------
// export type EventDecorator<T> = <T extends AnyConstructor> (fieldConfig? : Partial<InstanceType<T>>, fieldCls? : T) => PropertyDecorator

export const event = <T extends EventMeta<Payload>, Payload>(eventConfig? : Partial<T>, eventCls : typeof EventInstance = EventInstance) : PropertyDecorator => {

    return function (target : EventEmitter, propertyKey : string) : void {
        // const hooks     = []
        //
        // target[ propertyKey ] = function (this : EventEmitter, data) {
        //     const hooks     = this.getHooks(propertyKey)
        //
        //     for (let i = 0; i < hooks.length; i++) hooks[ i ].call(this, data)
        // }
        //
        // target[ propertyKey ].hook = function (listener) {
        //     hooks.push(listener)
        //
        //     return function () {
        //         const index = hooks.indexOf(listener)
        //
        //         hooks.splice(index, 1)
        //     }
        // }
    }
}

//---------------------------------------------------------------------------------------------------------------------
export class EventEmitter extends Mixin(
    [],
    (base : AnyConstructor) => {

    class EventEmitter extends base {
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

const EventC = <Payload>(...args) => Event.new(...args) as Event<Payload>


//---------------------------------------------------------------------------------------------------------------------
export type EventT<Payload, EventClass extends EventInstance<Payload> = EventInstance<Payload>> = ((arg : Payload) => void) & EventInstance<Payload>


//---------------------------------------------------------------------------------------------------------------------
export class ManagedArray<Element> extends Mixin(
    [ EventEmitter, Array ],
    <Element>(base : AnyConstructor<EventEmitter & Array<Element>, typeof EventEmitter & typeof Array>) => {

    class ManagedArray extends base {
        Element                 : Element

        slice : (start? : number, end? : number) => this[ 'Element' ][]

        @event()
        newElement              : EventT<{ pos : number }>


        push (...args : this[ 'Element' ][]) : number {
            const res = super.push(...args)

            this.newElement.trigger({ pos : this.length })

            return res
        }
    }

    return ManagedArray
}){}

//@ts-ignore
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
