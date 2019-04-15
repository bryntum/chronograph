import { Schema } from "../../src/schema/Schema.js";
import { Entity, field, calculate } from "../../src/replica/Entity.js";
import { Base } from "../../src/class/Mixin.js";
import { ChronoIterator } from "../../src/chrono/Atom.js";
import { MinimalReplica } from "../../src/replica/Replica.js";

declare const StartTest : any

StartTest(t => {

    t.it('All entity atoms should be removed from the graph primary/secondary atoms collections upon entity removal from replica', t => {

        const SomeSchema        = Schema.new({ name : 'Cool data schema' })

        const entity            = SomeSchema.getEntityDecorator()

        @entity
        class Person extends Entity(Base) {
            @field()
            id              : string

            @field()
            firstName       : string

            @field()
            lastName        : string

            @field()
            fullName        : string


            @calculate('fullName')
            * calculateFullName (proposed : string) : ChronoIterator<string> {
                return (yield this.$.firstName) + ' ' + (yield this.$.lastName)
            }
        }

        t.diag('Need recalculation atoms collection check');

        const replica1 = MinimalReplica.new({ schema : SomeSchema })

        const p1 = Person.new({ firstName : 'Ivan', lastName : 'Navi' });

        replica1.addEntity(p1);

        let allNeedRecalc = true;
        p1.forEachFieldAtom(a => allNeedRecalc = allNeedRecalc && replica1.isAtomNeedRecalculation(a));

        t.ok(allNeedRecalc, 'All entity atoms need recalculation initially');

        replica1.removeEntity(p1);

        allNeedRecalc = false;

        p1.forEachFieldAtom(a => allNeedRecalc = allNeedRecalc || replica1.isAtomNeedRecalculation(a));

        t.notOk(allNeedRecalc, 'None entity atoms need recalculation after entity removal from a replica');

        t.diag('Stable atoms collection check')

        const replica2 = MinimalReplica.new({ schema : SomeSchema });

        replica2.addEntity(p1);

        p1.forEachFieldAtom(a => replica2.markStable(a));

        replica2.removeEntity(p1);

        let allStable = false;

        p1.forEachFieldAtom(a => allStable = allStable || replica2.isAtomStable(a));

        t.notOk(allStable, 'None entity atoms are marked stable after entity removal from a replica');
    });
});
