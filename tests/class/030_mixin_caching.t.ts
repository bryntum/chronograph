import { Base } from "../../src/class/Base.js"
import { AnyConstructor, ClassUnion, Mixin, ZeroBaseClass } from "../../src/class/Mixin.js"

declare const StartTest : any

StartTest(t => {

    t.it('Repeating creation with the same requirements should not call mixin functions and use cache', t => {
        let count1 = 0
        let count2 = 0
        let count3 = 0

        class SomeMixin1 extends Mixin(
            [ Base ],
            (base : ClassUnion<typeof Base>) => {
                count1++

                class SomeMixin1 extends base {
                    prop1       : string    = '1'
                }

                return SomeMixin1
            }
        ){}

        class SomeMixin2 extends Mixin(
            [ Base ],
            (base : ClassUnion<typeof Base>) => {
                count2++

                class SomeMixin2 extends base {
                    prop2       : string    = '2'
                }

                return SomeMixin2
            }
        ){}

        class SomeMixin3 extends Mixin(
            [ Base ],
            (base : ClassUnion<typeof Base>) => {
                count3++

                class SomeMixin3 extends base {
                    prop3       : string    = '3'
                }

                return SomeMixin3
            }
        ){}

        t.isDeeply([ count1, count2, count3 ], [ 1, 1, 1 ], 'Mixin functions called once')

        //-----------------------
        count1 = count2 = count3 = 0

        class SomeMixin12 extends Mixin(
            [ SomeMixin2, SomeMixin1 ],
            (base : ClassUnion<typeof SomeMixin2, typeof SomeMixin1>) =>

                class SomeMixin12 extends base {
                    prop12      : string   = '12'
                }
        ){}

        t.isDeeply([ count1, count2, count3 ], [ 0, 1, 0 ], 'Re-used mixin1 from cache')

        //-----------------------
        count1 = count2 = count3 = 0

        class SomeMixin123 extends Mixin(
            [ SomeMixin3, SomeMixin2, SomeMixin1 ],
            (base : ClassUnion<typeof SomeMixin2, typeof SomeMixin1, typeof SomeMixin3>) =>

                class SomeMixin123 extends base {
                    prop123     : string   = '123'
                }
        ){}

        t.isDeeply([ count1, count2, count3 ], [ 0, 0, 1 ], 'Re-used mixin2(mixin1()) from cache')

        //-----------------------
        count1 = count2 = count3 = 0

        class SomeMixin123_2 extends Mixin(
            [ SomeMixin3, SomeMixin2, SomeMixin1 ],
            (base : ClassUnion<typeof SomeMixin2, typeof SomeMixin1, typeof SomeMixin3>) =>

                class SomeMixin123_2 extends base {
                    prop123_2     : string   = '123_2'
                }
        ){}

        t.isDeeply([ count1, count2, count3 ], [ 0, 0, 0 ], 'Re-used mixin3(mixin2(mixin1())) from cache')
    })


    t.it('Repeating creation with different base class should call mixin functions', t => {
        let count1 = 0
        let count2 = 0

        class SomeMixin1 extends Mixin(
            [],
            (base : ClassUnion<AnyConstructor>) => {
                count1++

                class SomeMixin1 extends base {
                    prop1       : string    = '1'
                }

                return SomeMixin1
            }
        ){}

        class SomeMixin2 extends Mixin(
            [],
            (base : ClassUnion<AnyConstructor>) => {
                count2++

                class SomeMixin2 extends base {
                    prop2       : string    = '2'
                }

                return SomeMixin2
            }
        ){}

        t.isDeeply([ count1, count2 ], [ 1, 1 ], 'Mixin functions called once')

        //-----------------------
        count1 = count2 = 0

        class SomeMixin12 extends Mixin(
            [ SomeMixin2, SomeMixin1 ],
            (base : ClassUnion<typeof SomeMixin2, typeof SomeMixin1>) =>

                class SomeMixin12 extends base {
                    prop12      : string   = '12'
                }
        ){}

        t.isDeeply([ count1, count2 ], [ 0, 1 ], 'Re-used mixin1 from cache')

        //-----------------------
        count1 = count2 = 0

        class SomeMixin12_2 extends Mixin(
            [ SomeMixin2, SomeMixin1 ],
            (base : ClassUnion<typeof SomeMixin2, typeof SomeMixin1>) =>

                class SomeMixin12_2 extends base {
                    prop12_2      : string   = '12_2'
                }
        ){}

        t.isDeeply([ count1, count2 ], [ 0, 0 ], 'Re-used mixin2(mixin1) from cache')

        //-----------------------
        count1 = count2 = 0

        class SomeMixin12_3 extends Mixin(
            [ SomeMixin2, SomeMixin1, Base ],
            (base : ClassUnion<typeof SomeMixin2, typeof SomeMixin1, typeof Base>) =>

                class SomeMixin12_3 extends base {
                    prop12_3      : string   = '12_3'
                }
        ){}

        t.isDeeply([ count1, count2 ], [ 1, 1 ], 'Called the mixin functions again for different base class')

        //-----------------------
        count1 = count2 = 0

        class SomeMixin12_4 extends Mixin(
            [ SomeMixin2, SomeMixin1, Base ],
            (base : ClassUnion<typeof SomeMixin2, typeof SomeMixin1, typeof Base>) =>

                class SomeMixin12_4 extends base {
                    prop12_4      : string   = '12_4'
                }
        ){}

        t.isDeeply([ count1, count2 ], [ 0, 0 ], 'Re-used mixin2(mixin1(Base)) from cache')
    })


    t.it('Should be possible to use `derive` over the non-mixin class, inheriting from mixin class', t => {
        //region setup
        let count1 = 0
        let count2 = 0
        let count3 = 0

        class SomeMixin1 extends Mixin(
            [],
            (base : ClassUnion<AnyConstructor>) => {
                count1++

                class SomeMixin1 extends base {
                    prop1       : string    = '1'
                }

                return SomeMixin1
            }
        ){}

        class SomeMixin2 extends Mixin(
            [ SomeMixin1 ],
            (base : ClassUnion<typeof SomeMixin1>) => {
                count2++

                class SomeMixin2 extends base {
                    prop2       : string    = '2'
                }

                return SomeMixin2
            }
        ){}

        class SomeMixin3 extends Mixin(
            [ SomeMixin1, SomeMixin2 ],
            (base : ClassUnion<typeof SomeMixin1, typeof SomeMixin2>) => {
                count3++

                class SomeMixin3 extends base {
                    prop3       : string    = '3'
                }

                return SomeMixin3
            }
        ){}

        t.isDeeply([ count1, count2, count3 ], [ 1, 1, 1 ], 'Mixin functions called once')
        //endregion

        count1 = count2 = count3 = 0

        class Custom1 extends SomeMixin2.derive(ZeroBaseClass) {
            custom1     : string = 'custom1'
        }

        t.isDeeply([ count1, count2, count3 ], [ 0, 0, 0 ], 'Re-used mixin classes')

        class Custom2 extends Custom1 {
            custom2     : string = 'custom2'
        }

        class Custom3 extends SomeMixin3.derive(Custom2) {
            custom3     : string = 'custom3'
        }

        const custom3 = new Custom3()

        t.is(custom3.custom1, 'custom1')
        t.is(custom3.custom2, 'custom2')
        t.is(custom3.custom3, 'custom3')
        t.is(custom3.prop1, '1')
        t.is(custom3.prop2, '2')
        t.is(custom3.prop3, '3')

        t.isDeeply([ count1, count2, count3 ], [ 0, 0, 1 ], 'Only applied the SomeMixin3')
    })


    t.it('Should be possible to use `derive` over the non-mixin class, inheriting from mixin class #2', t => {
        //region setup
        let count1 = 0
        let count2 = 0
        let count3 = 0
        let count4 = 0

        class SomeMixin1 extends Mixin(
            [],
            (base : ClassUnion<AnyConstructor>) => {
                count1++

                class SomeMixin1 extends base {
                    prop1       : string    = '1'
                }

                return SomeMixin1
            }
        ){}

        class SomeMixin2 extends Mixin(
            [ SomeMixin1 ],
            (base : ClassUnion<typeof SomeMixin1>) => {
                count2++

                class SomeMixin2 extends base {
                    prop2       : string    = '2'
                }

                return SomeMixin2
            }
        ){}

        class SomeMixin3 extends Mixin(
            [ SomeMixin1, SomeMixin2 ],
            (base : ClassUnion<typeof SomeMixin1, typeof SomeMixin2>) => {
                count3++

                class SomeMixin3 extends base {
                    prop3       : string    = '3'
                }

                return SomeMixin3
            }
        ){}

        class SomeMixin4 extends Mixin(
            [ SomeMixin3, SomeMixin2 ],
            (base : ClassUnion<typeof SomeMixin3, typeof SomeMixin2>) => {
                count4++

                class SomeMixin4 extends base {
                    prop4       : string    = '4'
                }

                return SomeMixin4
            }
        ){}

        t.isDeeply([ count1, count2, count3, count4 ], [ 1, 1, 1, 1 ], 'Mixin functions called once')
        //endregion

        count1 = count2 = count3 = count4 = 0

        class Custom1 extends SomeMixin2.derive(ZeroBaseClass) {
            custom1     : string = 'custom1'
        }

        t.isDeeply([ count1, count2, count3, count4 ], [ 0, 0, 0, 0 ], 'Re-used mixin classes')

        class Custom2 extends Custom1 {
            custom2     : string = 'custom2'
        }

        class Custom3 extends SomeMixin4.derive(Custom2) {
            custom3     : string = 'custom3'
        }

        const custom3 = new Custom3()

        t.is(custom3.custom1, 'custom1')
        t.is(custom3.custom2, 'custom2')
        t.is(custom3.custom3, 'custom3')
        t.is(custom3.prop1, '1')
        t.is(custom3.prop2, '2')
        t.is(custom3.prop3, '3')
        t.is(custom3.prop4, '4')

        t.isDeeply([ count1, count2, count3, count4 ], [ 0, 0, 1, 1 ], 'Only applied the SomeMixin3 & SomeMixin4')
    })
})

