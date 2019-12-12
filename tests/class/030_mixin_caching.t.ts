import { AnyConstructor, Base, isInstanceOf, Mixin } from "../../src/class/BetterMixin.js"

declare const StartTest : any

StartTest(t => {

    t.it('Repeating creation with the same requirements should not call mixin functions and use cache', t => {

        let count1 = 0
        let count2 = 0
        let count3 = 0

        class SomeMixin1 extends Mixin(
            [ Base ],
            <T extends AnyConstructor<Base>>(base : T) => {
                count1++

                class SomeMixin1 extends base {
                    prop1       : string    = '1'
                }

                return SomeMixin1
            }
        ){}

        class SomeMixin2 extends Mixin(
            [ Base ],
            <T extends AnyConstructor<Base>>(base : T) => {
                count2++

                class SomeMixin2 extends base {
                    prop2       : string    = '2'
                }

                return SomeMixin2
            }
        ){}

        class SomeMixin3 extends Mixin(
            [ Base ],
            <T extends AnyConstructor<Base>>(base : T) => {
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
            <T extends AnyConstructor<SomeMixin2 & SomeMixin1>>(base : T) =>

                class SomeMixin12 extends base {
                    prop12      : string   = '12'
                }
        ){}

        t.isDeeply([ count1, count2, count3 ], [ 0, 1, 0 ], 'Re-used mixin1 from cache')

        //-----------------------
        count1 = count2 = count3 = 0

        class SomeMixin123 extends Mixin(
            [ SomeMixin3, SomeMixin2, SomeMixin1 ],
            <T extends AnyConstructor<SomeMixin3 & SomeMixin2 & SomeMixin1>>(base : T) =>

                class SomeMixin123 extends base {
                    prop123     : string   = '123'
                }
        ){}

        t.isDeeply([ count1, count2, count3 ], [ 0, 0, 1 ], 'Re-used mixin2(mixin1()) from cache')

        //-----------------------
        count1 = count2 = count3 = 0

        class SomeMixin123_2 extends Mixin(
            [ SomeMixin3, SomeMixin2, SomeMixin1 ],
            <T extends AnyConstructor<SomeMixin3 & SomeMixin2 & SomeMixin1>>(base : T) =>

                class SomeMixin123_2 extends base {
                    prop123_2     : string   = '123_2'
                }
        ){}

        t.isDeeply([ count1, count2, count3 ], [ 0, 0, 0 ], 'Re-used mixin3(mixin2(mixin1())) from cache')

    })
})

