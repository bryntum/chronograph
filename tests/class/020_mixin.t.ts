import { Base } from "../../src/class/Base.js"
import { AnyConstructor, ClassUnion, isInstanceOf, Mixin } from "../../src/class/Mixin.js"

declare const StartTest : any

//---------------------------------------------------------------------------------------------------------------------
export class SomeMixin1 extends Mixin(
    [ Base ],
    (base : ClassUnion<typeof Base>) =>

        class SomeMixin1 extends base {
            prop1       : string    = '1'

            method1 (p1 : boolean) : string {
                return this.prop1
            }

            static s1 : number = 1
        }
){}

SomeMixin1.s1
SomeMixin1.new

//---------------------------------------------------------------------------------------------------------------------
export class SomeMixin2 extends Mixin(
    [ Base ],
    (base : ClassUnion<typeof Base>) =>

        class SomeMixin2 extends base {
            prop2       : string    = '2'

            method2 (p2 : boolean) : string {
                return this.prop2
            }

            static s2 : number = 1
        }
){}

SomeMixin2.s2
SomeMixin2.new


//---------------------------------------------------------------------------------------------------------------------
export class SomeMixin3 extends Mixin(
    [ Base ],
    (base : ClassUnion<typeof Base>) =>

        class SomeMixin3 extends base {
            prop3       : string    = '3'

            method3 (p3 : boolean) : string {
                return this.prop3
            }

            static s3 : number = 1
        }
){}

SomeMixin3.s3
SomeMixin3.new


//---------------------------------------------------------------------------------------------------------------------
export class SomeMixin12 extends Mixin(
    [ SomeMixin1, SomeMixin2 ],
    (base : ClassUnion<typeof SomeMixin1, typeof SomeMixin2>) =>

        class SomeMixin12 extends base {
            prop12       : string   = '12'

            method12 (p12 : boolean) : string {
                this.prop1
                this.prop2

                // this.zxc

                return this.prop12
            }

            static s12 : number = 1
        }
){}

SomeMixin12.s1
SomeMixin12.s2
SomeMixin12.s12
SomeMixin12.new


//---------------------------------------------------------------------------------------------------------------------
export class SomeMixin23 extends Mixin(
    [ SomeMixin2, SomeMixin3 ],
    (base : ClassUnion<typeof SomeMixin2, typeof SomeMixin3>) =>

        class SomeMixin23 extends base {
            prop23       : string   = '23'

            method23 (p23 : boolean) : string {
                this.prop2
                this.prop3

                // this.zxc

                return this.prop23
            }

            static s23 : number = 1
        }
){}

SomeMixin23.s2
SomeMixin23.s3
SomeMixin23.s23
SomeMixin23.new


//---------------------------------------------------------------------------------------------------------------------
export class SomeMixin13 extends Mixin(
    [ SomeMixin1, SomeMixin3 ],
    (base : ClassUnion<typeof SomeMixin1, typeof SomeMixin3>) =>

        class SomeMixin13 extends base {
            prop13      : string    = '13'

            // prop1       : boolean

            method13 (p13 : boolean) : string {
                this.prop1
                this.prop3

                // this.zxc

                return this.prop13
            }

            static s13 : number = 1
        }
){}

SomeMixin13.s1
SomeMixin13.s3
SomeMixin13.s13
SomeMixin13.new


//---------------------------------------------------------------------------------------------------------------------
export class SomeMixin123_1 extends Mixin(
    [ SomeMixin12, SomeMixin3 ],
    (base : ClassUnion<typeof SomeMixin12, typeof SomeMixin3>) =>

        class SomeMixin123_1 extends base {
            prop123_1     : string    = '123_1'
        }
){}

SomeMixin123_1.s1
SomeMixin123_1.s2
SomeMixin123_1.s3
SomeMixin123_1.new

//---------------------------------------------------------------------------------------------------------------------
export class SomeMixin123_2 extends Mixin(
    [ SomeMixin13, SomeMixin2 ],
    (base : ClassUnion<typeof SomeMixin13, typeof SomeMixin2>) => base
){}

SomeMixin123_2.s1
SomeMixin123_2.s2
SomeMixin123_2.s3
SomeMixin123_2.new


export class SomeMixin123_3 extends SomeMixin3.mix(SomeMixin2.mix(SomeMixin1.mix(Base))) {
    method123_3 () {
        this.prop1
        // this.zxc
    }
}

SomeMixin123_3.s1
SomeMixin123_3.s2
SomeMixin123_3.s3
SomeMixin123_3.new


//---------------------------------------------------------------------------------------------------------------------
export class SomeMixin123_4 extends SomeMixin3.derive(Base) {
    method123_4 () {
        this.prop3
        // this.zxc
    }
}

SomeMixin123_4.s3
SomeMixin123_4.new


//---------------------------------------------------------------------------------------------------------------------
export class M1 extends Mixin(
    [],
    (base : AnyConstructor) =>

    class M1 extends base {
        prop1       : string    = '1'
    }
){}

//---------------------------------------------------------------------------------------------------------------------
export class M2 extends Mixin(
    [ M1 ],
    (base : AnyConstructor<M1, typeof M1>) =>

    class M2 extends base {
        prop2       : string    = '2'
    }
){}

//---------------------------------------------------------------------------------------------------------------------
export class M3 extends Mixin(
    [ M2 ],
    (base : AnyConstructor<M2, typeof M2>) =>

    class M3 extends base {
        prop3       : string    = '3'

        method3 () {
            this.prop1
            this.prop2
            this.prop3
        }
    }
){}


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

        t.is(instance.prop1, '1')
        t.is(instance.prop2, '2')
        t.is(instance.prop3, '3')
        t.is(instance.prop12, '12')
        t.is(instance.prop123_1, '123_1')
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


    t.it('Should be able to derive from the subclass of the base class', t => {
        class MyClass extends Base {
            myProp      : string    = 'myProp'
        }


        class MyClassMixed extends SomeMixin1.derive(MyClass) {
        }

        const instance  = MyClassMixed.new({ prop1 : '1', myProp : '1' })

        t.is(instance.method1(true), '1')
    })


    t.it('Should choose the super-most base class from requirements ', t => {
        class MyClass extends Base {
            myProp      : string    = 'myProp'
        }

        class SomeMixin1 extends Mixin(
            [ Base ],
            (base : ClassUnion<typeof Base>) =>

            class SomeMixin1 extends base {
                prop1       : string    = '1'
            }
        ){}

        class SomeMixin2 extends Mixin(
            [ SomeMixin1, MyClass ],
            (base : ClassUnion<typeof SomeMixin1 & typeof MyClass>) =>

            class SomeMixin2 extends base {
                prop2       : string    = '2'
            }
        ){}

        //-------------------------------------------------------------------------------
        // in this mixin, the SomeMixin1 requirement first sets the base class to Base
        // but later the SomeMixin2, "upgrades" it to MyClass
        class SomeMixin3 extends Mixin(
            [ SomeMixin1, SomeMixin2 ],
            (base : ClassUnion<typeof SomeMixin1 & typeof SomeMixin2>) =>

            class SomeMixin3 extends base {
                prop3       : string    = '3'
            }
        ){}

        //@ts-ignore
        t.is(SomeMixin3.$.baseClass, MyClass)

        const instance  = SomeMixin3.new()

        t.is(instance.myProp, 'myProp')
        t.is(instance.prop1, '1')
        t.is(instance.prop2, '2')
        t.is(instance.prop3, '3')

        //-------------------------------------------------------------------------------
        // in this mixin, we have `Base` as base class,
        // but the SomeMixin2, "upgrades" it to MyClass
        class SomeMixin4 extends Mixin(
            [ SomeMixin1, SomeMixin2, Base ],
            (base : ClassUnion<typeof SomeMixin1 & typeof SomeMixin2>) =>

            class SomeMixin4 extends base {
                prop4       : string    = '4'
            }
        ){}

        //@ts-ignore
        t.is(SomeMixin4.$.baseClass, MyClass)

        const instance4  = SomeMixin4.new()

        t.is(instance4.myProp, 'myProp')
        t.is(instance4.prop1, '1')
        t.is(instance4.prop2, '2')
        t.is(instance4.prop4, '4')

    })


    t.it('Should throw when trying to construct a mixin from contradicting base classes ', t => {
        class MyClass {
            myProp      : string    = 'myProp'
        }

        class SomeMixin1 extends Mixin(
            [ Base ],
            (base : ClassUnion<typeof Base>) =>

            class SomeMixin1 extends base {
                prop1       : string    = '1'
            }
        ){}

        class SomeMixin2 extends Mixin(
            [ MyClass ],
            (base : ClassUnion<typeof MyClass>) =>

            class SomeMixin2 extends base {
                prop2       : string    = '2'
            }
        ){}

        t.throwsOk(() => {
            class SomeMixin3 extends Mixin(
                [ SomeMixin1, SomeMixin2 ],
                (base : ClassUnion<typeof SomeMixin1 & typeof SomeMixin2>) =>

                class SomeMixin3 extends base {
                    prop3       : string    = '3'
                }
            ){}
        }, /Base class mismatch/)
    })
})



