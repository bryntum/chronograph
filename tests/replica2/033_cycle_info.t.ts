import { Base } from "../../src/class/Base.js"
import { calculate, Entity, field } from "../../src/replica/Entity.js"
import { Replica } from "../../src/replica/Replica.js"

declare const StartTest : any

StartTest(t => {

    t.it('Should show the detailed information about the cyclic computation', async t => {
        class Some extends Entity.mix(Base) {
            @field()
            iden1           : string

            @field()
            iden2           : string

            @calculate('iden1')
            * calculateIden1 () {
                return yield this.$.iden2
            }

            @calculate('iden2')
            * calculateIden2 () {
                return yield this.$.iden1
            }
        }

        const replica : Replica       = Replica.new({ autoCommit : false })

        const some = Some.new()

        replica.addEntity(some)

        // replica.read(some.$.iden1)

        // ----------------
        t.throwsOk(() => replica.read(some.$.iden1), /iden1.*iden2/s, 'Include identifier name in the cycle info')
    })
})
