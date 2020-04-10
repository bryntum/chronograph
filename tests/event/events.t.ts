import { AnyConstructor, Mixin } from "../../src/class/BetterMixin.js"
import { Event, event, EventEmitter } from "../../src/event/Events.js"

declare const StartTest : any

//---------------------------------------------------------------------------------------------------------------------
export class ManagedArray<Element> extends Mixin(
    [ EventEmitter, Array ],
    <Element>(base : AnyConstructor<EventEmitter & Array<Element>, typeof EventEmitter & typeof Array>) => {

    class ManagedArray extends base {
        Element                 : Element

        slice : (start? : number, end? : number) => this[ 'Element' ][]

        @event()
        spliceEvent             : Event<[ this, number, number, this[ 'Element' ][] ]>


        push (...args : this[ 'Element' ][]) : number {
            this.spliceEvent.trigger(this, this.length, 0, args)

            return super.push(...args)
        }


        pop () : this[ 'Element' ] {
            if (this.length > 0) this.spliceEvent.trigger(this, this.length - 1, 1, [])

            return super.pop()
        }
    }

    return ManagedArray
}){}

export interface ManagedArray<Element> {
    Element : Element
}


StartTest(t => {

    t.it('Listening to events should work', t => {
        const arr = new ManagedArray<number>()

        let counter = 0

        const disposer = arr.spliceEvent.on((array, pos, howManyToRemove, newElements) => {
            counter++

            t.isStrict(array, arr)
            t.isStrict(pos, 0)
            t.isStrict(howManyToRemove, 0)
            t.isDeeply(newElements, [ 11 ])
        })

        arr.push(11)

        t.is(counter, 1)

        disposer()

        arr.push(12)

        t.is(counter, 1)
    })
})
