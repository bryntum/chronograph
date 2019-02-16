import {ChronoIterator} from "../../src/chrono/Atom.js";
import {Base} from "../../src/class/Mixin.js";
import {calculate, continuationOf, Entity, field} from "../../src/replica/Entity.js";
import {MinimalReplica} from "../../src/replica/Replica.js";

declare const StartTest : any

StartTest(t => {

    t.it('Self-atom calculation with additional dependency', async t => {

        class Some extends Entity(Base) {
            @field
            valueInitial    : number

            @continuationOf('valueInitial')
            @field
            valueFinal      : number

            @field
            another         : number


            @calculate('valueInitial')
            * calculateValueInitial (proposedValue : number) : ChronoIterator<number> {
                if (proposedValue !== undefined) return proposedValue

                const finalAtom = this.$.valueFinal

                return finalAtom.hasConsistentValue() ? finalAtom.getConsistentValue() : finalAtom.getProposedValue()
            }


            @calculate('valueFinal')
            * calculateValueFinal () : ChronoIterator<number> {
                const initial       = yield this.$.valueInitial

                return initial + 1
            }


            @calculate('another')
            * calculateAnother () : ChronoIterator<number> {
                return yield this.$.valueInitial
            }

        }

        const replica1          = MinimalReplica.new()

        const some              = Some.new({ valueFinal : 1 })

        replica1.addEntities([ some ])

        await replica1.propagate()

        t.is(some.valueInitial, 2, 'Correct initial value')
        t.is(some.valueFinal, 2, 'Correct final value')
        t.is(some.another, 1, 'Correct dependent value')

        await replica1.propagate()

        t.is(some.another, 2, 'Another value has been updated to the final value')
        t.is(some.valueInitial, 2, "Initial value didn't change")
        t.is(some.valueFinal, 2, "Final value didn't change")

        await replica1.propagate()

        t.is(some.another, 2, 'Another value has stabilized')
        t.is(some.valueInitial, 2, "Initial value has stabilized")
        t.is(some.valueFinal, 2, "Final value has stabilized")
    })
})
