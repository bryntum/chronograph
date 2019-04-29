import { ChronoIterator } from "../../src/chrono/Atom.js";
import { Base } from "../../src/class/Mixin.js";
import { calculate, Entity, field } from "../../src/replica/Entity.js";
import { MinimalReplica } from "../../src/replica/Replica.js";
import { Schema } from "../../src/schema/Schema.js";

declare const StartTest : any

StartTest(t => {

    const SomeSchema        = Schema.new()
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


    t.it('All entity atoms should be removed from the graph `need recalculations` atoms collections', t => {
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
    });


    // we probably don't need this section, since stable atoms are internal state
    t.it('All entity atoms should be removed from the graph `stable` atoms collections', t => {
        const replica2 = MinimalReplica.new({ schema : SomeSchema });

        const p1 = Person.new({ firstName : 'Ivan', lastName : 'Navi' });

        replica2.addEntity(p1);

        p1.forEachFieldAtom(a => replica2.markStable(a));

        replica2.removeEntity(p1);

        let allStable = false;

        p1.forEachFieldAtom(a => allStable = allStable || replica2.isAtomStable(a));

        t.notOk(allStable, 'None entity atoms are marked stable after entity removal from a replica');
    });

});
