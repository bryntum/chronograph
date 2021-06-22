import { setCompactCounter } from "../../src/chrono2/atom/Node.js"
import { CalculableBoxGen, CalculableBoxGenUnbound } from "../../src/chrono2/data/CalculableBoxGen.js"
import { ChronoGraph } from "../../src/chrono2/graph/Graph.js"
import { delay } from "../../src/util/Helpers.js"
import { GraphGen } from "../util.js"

declare const StartTest : any

setCompactCounter(1)

const randomDelay = () => delay(Math.random() * 100)

StartTest(t => {

    const doTest = (t : any, graphGen : GraphGen) => {
        const prefix    = graphGen.sync ? 'SYNC: ' : 'GEN: '

        t.it(prefix + 'Should show the detailed information about the cyclic computation', t => {
            const iden1     = graphGen.calculableBox({
                name : 'iden1',
                calculation : eval(graphGen.calc(function* () {
                    return (yield iden2)
                }))
            })

            const iden2     = graphGen.calculableBox({
                name : 'iden2',
                calculation : eval(graphGen.calc(function* () {
                    return (yield iden1)
                }))
            })

            // ----------------
            t.throwsOk(() => iden1.read(), /iden1.*iden2/s, 'Include identifier name in the cycle info')
        })
    }

    doTest(t, GraphGen.new({ sync : true }))
    doTest(t, GraphGen.new({ sync : false }))

    t.it('Should show the detailed information about the cyclic async computation', async t => {
        const iden1     = CalculableBoxGen.new({
            name : 'iden1',
            calculation : function* () {
                yield randomDelay()

                return (yield iden2)
            }
        })

        const iden2     = CalculableBoxGen.new({
            name : 'iden2',
            calculation : function* () {
                yield randomDelay()

                return (yield iden1)
            }
        })

        //----------------

        try {
            await iden1.readAsync()

            t.fail('Should not reach this line')
        } catch (e) {
            t.like(e + '', /iden1.*iden2/s, 'Include identifier name in the cycle info')
        }
    })


    t.it('Should show the detailed information about the cyclic async computation', async t => {
        const graph1        = ChronoGraph.new({ historyLimit : 0 })

        const iden1     = CalculableBoxGenUnbound.new({
            name : 'iden1',
            calculation : function* () {
                return (yield iden2)
            }
        })

        const iden2     = CalculableBoxGenUnbound.new({
            name : 'iden2',
            calculation : function* () {
                return (yield iden1)
            }
        })

        graph1.addAtoms([ iden1, iden2 ])

        const branch        = graph1.branch({ onComputationCycle : 'throw' })

        //----------------
        try {
            await branch.checkout(iden1).read()

            t.fail('Should not reach this line')
        } catch (e) {
            t.like(e + '', /iden1.*iden2/s, 'Include identifier name in the cycle info')
        }
    })

    // t.it('Should show the detailed information about the cyclic computation, which involves edges from the past', async t => {
    //     const graph : ChronoGraph       = ChronoGraph.new()
    //
    //     const dispatcher    = CalculableBox.new({
    //         name : 'dispatcher',
    //         calculation : () => {
    //             const iden1HasProposed  = yield HasProposedValue(iden1)
    //             const iden2HasProposed  = yield HasProposedValue(iden2)
    //
    //             return 'result'
    //         }
    //     })
    //
    //     const iden1         = CalculableBox.new({
    //         name : 'iden1',
    //         calculation : () => {
    //             const disp          = yield dispatcher
    //
    //             return yield iden2
    //         }
    //     })
    //
    //     const iden2         = CalculableBox.new({
    //         name : 'iden2',
    //         calculation : () => {
    //             const disp          = yield dispatcher
    //
    //             return yield iden1
    //         }
    //     })
    //
    //     // ----------------
    //     t.throwsOk(() => graph.read(iden1), /iden1.*iden2/s, 'Include identifier name in the cycle info')
    // })

})
