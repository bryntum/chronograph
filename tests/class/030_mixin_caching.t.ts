import { Base } from "../../src/class/Base.js"
import { AnyConstructor, ClassUnion, Mixin } from "../../src/class/Mixin.js"

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

})

