import { instanceOf, isInstanceOf, mixin } from "../../src/class/InstanceOf.js"
import { AnyConstructor, Base, Mixin } from "../../src/class/Mixin.js"

declare const StartTest : any

//---------------------------------------------------------------------------------------------------------------------
export class SomeMixin1 extends Mixin([ Base ], <T extends AnyConstructor<Base>>(base : T) =>

class SomeMixin1 extends base {
    prop        : string
}){}

// export type SomeMixin1 = Mixin<typeof SomeMixin1>


//---------------------------------------------------------------------------------------------------------------------
export class SomeMixin2 extends Mixin([ SomeMixin1 ], <T extends AnyConstructor<SomeMixin1>>(base : T) =>

class SomeMixin2 extends base {
    prop2       : string
}){}

// export type SomeMixin2 = Mixin<typeof SomeMixin2>


//---------------------------------------------------------------------------------------------------------------------
export class SomeMixin3 extends Mixin([ SomeMixin2 ], <T extends AnyConstructor<SomeMixin2>>(base : T) =>

class SomeMixin3 extends base {
    prop3       : string
}){}

// export type SomeMixin3 = Mixin<typeof SomeMixin3>


StartTest(t => {

    t.it('Should be able to use `new` on mixin function', t => {

        const instance  = SomeMixin3.new()

        t.ok(instance instanceof SomeMixin1, "Correct instanceof call")
        t.ok(instance instanceof SomeMixin2, "Correct instanceof call")
        t.ok(instance instanceof SomeMixin3, "Correct instanceof call")

        t.ok(isInstanceOf(instance, SomeMixin1), "Correct isInstanceOf call")
        t.ok(isInstanceOf(instance, SomeMixin2), "Correct isInstanceOf call")
        t.ok(isInstanceOf(instance, SomeMixin3), "Correct isInstanceOf call")

        // compilation-only test:
        const temp : any = instance

        // if (isInstanceOf(temp, SomeMixin1)) {
        //     temp.prop
        //
        //     // uncomment to verify that unknown properties generates compilation error
        //     // temp.prop2
        //     // temp.zxc
        // }
        //
        // if (isInstanceOf(temp, SomeMixin2)) {
        //     temp.prop
        //     temp.prop2
        //
        //     // uncomment to verify that unknown properties generates compilation error
        //     // temp.zxc
        //     // temp.prop3
        // }
        //
        // if (isInstanceOf(temp, SomeMixin3)) {
        //     temp.prop
        //     temp.prop2
        //     temp.prop3
        //
        //     // uncomment to verify that unknown properties generates compilation error
        //     // temp.zxc
        // }

    })
})

