import { AnyConstructor, Base, isInstanceOf, Mixin } from "../../src/class/BetterMixin.js"

declare const StartTest : any

//---------------------------------------------------------------------------------------------------------------------
export class SomeMixin1 extends Mixin(
    [ Base ],
    <T extends AnyConstructor<Base>>(base : T) =>

        class SomeMixin1 extends base {
            prop1       : string    = '1'

            method1 (p1 : boolean) : string {
                return this.prop1
            }
        }
){}


//---------------------------------------------------------------------------------------------------------------------
export class SomeMixin2 extends Mixin(
    [ Base ],
    <T extends AnyConstructor<Base>>(base : T) =>

        class SomeMixin2 extends base {
            prop2       : string    = '2'

            method2 (p2 : boolean) : string {
                return this.prop2
            }
        }
){}


//---------------------------------------------------------------------------------------------------------------------
export class SomeMixin3 extends Mixin(
    [ Base ],
    <T extends AnyConstructor<Base>>(base : T) =>

        class SomeMixin3 extends base {
            prop3       : string    = '3'

            method3 (p3 : boolean) : string {
                return this.prop3
            }
        }
){}


//---------------------------------------------------------------------------------------------------------------------
export class SomeMixin12 extends Mixin(
    [ SomeMixin1, SomeMixin2 ],
    <T extends AnyConstructor<SomeMixin1 & SomeMixin2>>(base : T) =>

        class SomeMixin12 extends base {
            prop12       : string   = '12'

            method12 (p12 : boolean) : string {
                this.prop1
                this.prop2

                // this.zxc

                return this.prop12
            }
        }
){}

//---------------------------------------------------------------------------------------------------------------------
export class SomeMixin23 extends Mixin(
    [ SomeMixin2, SomeMixin3 ],
    <T extends AnyConstructor<SomeMixin2 & SomeMixin3>>(base : T) =>

        class SomeMixin23 extends base {
            prop23       : string   = '23'

            method23 (p23 : boolean) : string {
                this.prop2
                this.prop3

                // this.zxc

                return this.prop23
            }
        }
){}

//---------------------------------------------------------------------------------------------------------------------
export class SomeMixin13 extends Mixin(
    [ SomeMixin1, SomeMixin3 ],
    <T extends AnyConstructor<SomeMixin1 & SomeMixin3>>(base : T) =>

        class SomeMixin13 extends base {
            prop13      : string    = '13'

            // prop1       : boolean

            method13 (p13 : boolean) : string {
                this.prop1
                this.prop3

                // this.zxc

                return this.prop13
            }
        }
){}


//---------------------------------------------------------------------------------------------------------------------
export class SomeMixin123_1 extends Mixin(
    [ SomeMixin12, SomeMixin3 ],
    <T extends AnyConstructor<SomeMixin12 & SomeMixin3>>(base : T) =>

        class SomeMixin123_ extends base {
            prop123_1     : string    = '123_1'
        }
){}


//---------------------------------------------------------------------------------------------------------------------
export class SomeMixin123_2 extends Mixin(
    [ SomeMixin13, SomeMixin2 ],
    <T extends AnyConstructor<SomeMixin13 & SomeMixin2>>(base : T) => base
){}


export class SomeMixin123_3 extends SomeMixin3.mix(SomeMixin2.mix(SomeMixin1.mix(Base))) {
    method123_3 () {
        this.prop1
        // this.zxc
    }
}


StartTest(t => {

    t.it('Basic case should work', t => {
        const instance = SomeMixin1.new()

        t.ok(instance instanceof SomeMixin1, "Correct instanceof call")
        t.notOk(instance instanceof SomeMixin2, "Correct instanceof call")

        t.ok(isInstanceOf(instance, SomeMixin1), "Correct isInstanceOf call")
        t.notOk(isInstanceOf(instance, SomeMixin2), "Correct isInstanceOf call")
    })


    t.it('`instanceof` and `isInstanceOf` should support transitive requirements #1', t => {
        const instance  = SomeMixin13.new()

        t.ok(instance instanceof SomeMixin1, "Correct instanceof call")
        t.ok(instance instanceof SomeMixin3, "Correct instanceof call")
        t.ok(instance instanceof SomeMixin13, "Correct instanceof call")

        t.ok(isInstanceOf(instance, SomeMixin1), "Correct isInstanceOf call")
        t.ok(isInstanceOf(instance, SomeMixin3), "Correct isInstanceOf call")
        t.ok(isInstanceOf(instance, SomeMixin13), "Correct isInstanceOf call")
    })


    t.it('`instanceof` and `isInstanceOf` should support transitive requirements #2', t => {
        const instance  = SomeMixin123_1.new()

        t.ok(instance instanceof SomeMixin1, "Correct instanceof call")
        t.ok(instance instanceof SomeMixin2, "Correct instanceof call")
        t.ok(instance instanceof SomeMixin3, "Correct instanceof call")

        t.ok(isInstanceOf(instance, SomeMixin1), "Correct isInstanceOf call")
        t.ok(isInstanceOf(instance, SomeMixin2), "Correct isInstanceOf call")
        t.ok(isInstanceOf(instance, SomeMixin3), "Correct isInstanceOf call")
    })


    t.it('Instantiation should support transitive requirements', t => {
        const instance  = SomeMixin13.new()

        t.is(instance.prop1, '1')
        t.is(instance.prop3, '3')
        t.is(instance.prop13, '13')
    })


    t.it('Manual mixin application should work', t => {
        const instance  = SomeMixin123_3.new()

        t.is(instance.prop1, '1')
        t.is(instance.prop2, '2')
        t.is(instance.prop3, '3')

        t.ok(instance instanceof SomeMixin1, "Correct instanceof call")
        t.ok(instance instanceof SomeMixin2, "Correct instanceof call")
        t.ok(instance instanceof SomeMixin3, "Correct instanceof call")

        t.ok(isInstanceOf(instance, SomeMixin1), "Correct isInstanceOf call")
        t.ok(isInstanceOf(instance, SomeMixin2), "Correct isInstanceOf call")
        t.ok(isInstanceOf(instance, SomeMixin3), "Correct isInstanceOf call")
    })


    t.it('`isInstanceOf` should typecast correctly', t => {
        // this section contains no assertions and is supposed to just compile w/o errors
        // TODO perform proper TS compilation to detect & assert valid compilation errors

        const temp : any = null

        if (isInstanceOf(temp, SomeMixin1)) {
            temp.prop1

            // uncomment to verify that unknown properties generates compilation error
            // temp.prop2
            // temp.zxc
        }

        if (isInstanceOf(temp, SomeMixin2)) {
            temp.prop2

            // uncomment to verify that unknown properties generates compilation error
            // temp.zxc
            // temp.prop3
        }

        if (isInstanceOf(temp, SomeMixin123_1)) {
            temp.prop1
            temp.prop2
            temp.prop3

            // uncomment to verify that unknown properties generates compilation error
            // temp.zxc
        }



        if (temp instanceof SomeMixin1) {
            temp.prop1

            // uncomment to verify that unknown properties generates compilation error
            // temp.prop2
            // temp.zxc
        }

        if (temp instanceof SomeMixin2) {
            temp.prop2

            // uncomment to verify that unknown properties generates compilation error
            // temp.zxc
            // temp.prop3
        }

        if (temp instanceof SomeMixin123_1) {
            temp.prop1
            temp.prop2
            temp.prop3

            // uncomment to verify that unknown properties generates compilation error
            // temp.zxc
        }

    })

})

