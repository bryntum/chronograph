import {ChronoIterator} from "../../src/chrono/Atom.js";
import {Base} from "../../src/class/Mixin.js";
import {calculate, Entity, field} from "../../src/replica/Entity.js";
import {reference} from "../../src/replica/Reference.js";
import {MinimalReplica} from "../../src/replica/Replica.js";

declare const StartTest : any

StartTest(t => {

    t.it('Self-atom calculation with additional dependency', async t => {

        class Some extends Entity(Base) {
            @field
            version         : number    = 1

            @field
            value           : string


            * calculateSelf () : ChronoIterator<this> {
                yield this.$.value

                return this
            }
        }

        class Another extends Entity(Base) {
            @reference()
            some            : Some

            @field
            result          : string


            @calculate('result')
            * calculateResult () : ChronoIterator<string> {
                const some      = yield this.$.some

                return some.value.toUpperCase()
            }
        }


        const replica1          = MinimalReplica.new()

        const some              = Some.new({ value : 'Mark' })
        const another           = Another.new({ some : some })

        replica1.addEntities([ some, another ])

        await replica1.propagate()

        t.is(another.result, 'MARK', 'Correct result calculated')

        some.value              = 'Twain'

        await replica1.propagate()

        t.is(another.result, 'TWAIN', 'Correct result calculated')
    })
})
