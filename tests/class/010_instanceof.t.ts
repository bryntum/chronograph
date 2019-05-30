import { instanceOf } from "../../src/class/InstanceOf.js"
import { AnyConstructor, Base, Mixin } from "../../src/class/Mixin.js"

declare const StartTest : any

//---------------------------------------------------------------------------------------------------------------------
export const SomeMixin = instanceOf(<T extends AnyConstructor<object>>(base : T) =>

class SomeMixin extends base {
})

export type SomeMixin = Mixin<typeof SomeMixin>


//---------------------------------------------------------------------------------------------------------------------
export const SomeMixin2 = instanceOf(<T extends AnyConstructor<object>>(base : T) =>

class SomeMixin2 extends base {
})

export type SomeMixin2 = Mixin<typeof SomeMixin2>


StartTest(t => {

    t.it('Should be able to use `instanceof` on mixin function', t => {

        class MinimalSomeMixin extends SomeMixin2(SomeMixin(Base)) {
        }

        t.ok(MinimalSomeMixin.new() instanceof SomeMixin, "Correct instanceof call")
        t.ok(MinimalSomeMixin.new() instanceof SomeMixin2, "Correct instanceof call")
    })
})

