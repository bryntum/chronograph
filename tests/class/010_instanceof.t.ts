import { instanceOf, isInstanceOf } from "../../src/class/InstanceOf.js"
import { AnyConstructor, Base, Mixin } from "../../src/class/Mixin.js"

declare const StartTest : any

//---------------------------------------------------------------------------------------------------------------------
export const SomeMixin = instanceOf(<T extends AnyConstructor<object>>(base : T) =>

class SomeMixin extends base {
    prop        : string
})

export type SomeMixin = Mixin<typeof SomeMixin>


//---------------------------------------------------------------------------------------------------------------------
export const SomeMixin2 = instanceOf(<T extends AnyConstructor<object>>(base : T) =>

class SomeMixin2 extends base {
    prop2       : string
})

export type SomeMixin2 = Mixin<typeof SomeMixin2>

//---------------------------------------------------------------------------------------------------------------------
export const SomeMixin3 = instanceOf(<T extends AnyConstructor<SomeMixin2>>(base : T) =>

class SomeMixin3 extends base {
    prop3       : string
})

export type SomeMixin3 = Mixin<typeof SomeMixin3>


StartTest(t => {

    t.it('Should be able to use `instanceof` on mixin function', t => {

        class MinimalSomeMixin extends SomeMixin2(SomeMixin(Base)) {
        }

        const instance  = MinimalSomeMixin.new()

        t.ok(instance instanceof SomeMixin, "Correct instanceof call")
        t.ok(instance instanceof SomeMixin2, "Correct instanceof call")

        t.ok(isInstanceOf(instance, SomeMixin), "Correct isInstanceOf call")
        t.ok(isInstanceOf(instance, SomeMixin2), "Correct isInstanceOf call")

        // compilation-only test:
        const temp : any = instance

        if (isInstanceOf(temp, SomeMixin2)) {
            temp.prop2

            // uncomment to verify that unknown properties generates compilation error
            // temp.zxc
        }

        if (isInstanceOf(temp, SomeMixin3)) {
            temp.prop2
            temp.prop3

            // uncomment to verify that unknown properties generates compilation error
            // temp.zxc
        }

    })
})

