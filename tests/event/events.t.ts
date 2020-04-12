import { AnyConstructor, Mixin } from "../../src/class/Mixin.js"
import { Event } from "../../src/event/Event.js"
import { Hook } from "../../src/event/Hook.js"

declare const StartTest : any

//---------------------------------------------------------------------------------------------------------------------
export class ManagedArray<Element> extends Mixin(
    [ Array ],
    <Element>(base : AnyConstructor<Array<Element>, typeof Array>) => {

    class ManagedArray extends base {
        Element                 : Element

        slice : (start? : number, end? : number) => this[ 'Element' ][]

        // `spliceEvent` start
        $spliceEvent    : Event<[ this, number, number, this[ 'Element' ][] ]>  = undefined
        get spliceEvent () : Event<[ this, number, number, this[ 'Element' ][] ]> {
            if (this.$spliceEvent !== undefined) return this.$spliceEvent

            return this.$spliceEvent    = new Event()
        }
        // `spliceEvent` end

        // `spliceHook` start
        $spliceHook    : Hook<[ this, number, number, this[ 'Element' ][] ]>  = undefined
        get spliceHook () : Hook<[ this, number, number, this[ 'Element' ][] ]> {
            if (this.$spliceHook !== undefined) return this.$spliceHook

            return this.$spliceHook    = new Hook()
        }
        // `spliceHook` end

        push (...args : this[ 'Element' ][]) : number {
            this.spliceEvent.trigger(this, this.length, 0, args)
            this.spliceHook.trigger(this, this.length, 0, args)

            return super.push(...args)
        }


        pop () : this[ 'Element' ] {
            if (this.length > 0) {
                this.spliceEvent.trigger(this, this.length - 1, 1, [])
                this.spliceHook.trigger(this, this.length - 1, 1, [])
            }

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


    t.it('Should ignore duplicated listeners', t => {
        const arr = new ManagedArray<number>()

        let counter = 0

        const listener = (array, pos, howManyToRemove, newElements) => {
            counter++

            t.isStrict(array, arr)
            t.isStrict(pos, 0)
            t.isStrict(howManyToRemove, 0)
            t.isDeeply(newElements, [ 11 ])
        }

        arr.spliceEvent.on(listener)
        arr.spliceEvent.on(listener)
        arr.spliceEvent.on(listener)

        arr.push(11)

        t.is(counter, 1)
    })

})
