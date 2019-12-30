import { AnyConstructor, Base, Mixin } from "./Mixin.js"

//---------------------------------------------------------------------------------------------------------------------
// export const Hook = <T extends AnyConstructor<Function>>(base : T) =>

class Hook extends Function {
    hook<D, E extends EventClassC> (listener : (arg : D, event : E) => any) {
    }
}

// export type Hook = Mixin<typeof Hook>
//
// class HookC extends Hook(Function) {}


//---------------------------------------------------------------------------------------------------------------------
// export type EventDecorator<T> = <T extends AnyConstructor> (fieldConfig? : Partial<InstanceType<T>>, fieldCls? : T) => PropertyDecorator

//---------------------------------------------------------------------------------------------------------------------
export const EventClass = <T extends AnyConstructor<Base>>(base : T) =>

class EventClass extends base {
    source      : Hookable
}

export type EventClass = Mixin<typeof EventClass>

export class EventClassC extends EventClass(Base) {}



export const event = <T extends EventClassC>(eventConfig? : Partial<T>, fieldCls? : AnyConstructor<T> /*= typeof EventClassC*/) : PropertyDecorator => {

    return function (target : Hookable, propertyKey : string) : void {
        const hooks     = []

        target[ propertyKey ] = function (this : Hookable, data) {
            const hooks     = this.getHooks(propertyKey)

            for (let i = 0; i < hooks.length; i++) hooks[ i ].call(this, data)
        }

        target[ propertyKey ].hook = function (listener) {
            hooks.push(listener)

            return function () {
                const index = hooks.indexOf(listener)

                hooks.splice(index, 1)
            }
        }
    }
}



//---------------------------------------------------------------------------------------------------------------------
export const Hookable = <T extends AnyConstructor<object>>(base : T) =>

class Hookable extends base {
    // hooks           : Hook[]

    // hook<D, E extends EventClassC> (event : Event<D, E>, listener : (arg : D, event : E) => any) {
    //     this[ ]
    // }
}

export type Hookable = Mixin<typeof Hookable>






// const fieldCls : AnyConstructor = EventClassC


export type Event<Data, EventClass extends EventClassC = EventClassC> = ((arg : Data) => void) & Hook


//---------------------------------------------------------------------------------------------------------------------
export const ManagedArray = <T extends AnyConstructor<Hookable & Array<any>>>(base : T) => {

    class ManagedArray extends base {

        @event({}, EventClassC)
        newElement              : Event<{ pos : number }, EventClass>


        push (...args : any[]) : number {
            const res = super.push(...args)

            const processingResult : this[ 'newElement' ].DATA = this.newElement.trigger({ pos : this.length })

            return res
        }
    }

    return ManagedArray

}

export type ManagedArray = Mixin<typeof ManagedArray>

const MArray = ManagedArray(Hookable(Array))


const arr = new MArray()

const newElementObservingDisposer = arr.newElement.hook((data, event) => {})
