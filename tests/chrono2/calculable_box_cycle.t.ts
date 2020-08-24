import { GraphGen } from "../util.js"

declare const StartTest : any

StartTest(t => {

    const doTest = (t : any, graphGen : GraphGen) => {
        const prefix    = graphGen.sync ? 'SYNC: ' : 'GEN: '

        t.it(prefix + 'Should show the detailed information about the cyclic computation', async t => {
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


    // t.it('Should show the detailed information about the cyclic computation, which involves edges from the past', async t => {
    //     const graph : ChronoGraph       = ChronoGraph.new()
    //
    //     const dispatcher    = new CalculableBox({
    //         name : 'dispatcher',
    //         calculation : () => {
    //             const iden1HasProposed  = yield HasProposedValue(iden1)
    //             const iden2HasProposed  = yield HasProposedValue(iden2)
    //
    //             return 'result'
    //         }
    //     })
    //
    //     const iden1         = new CalculableBox({
    //         name : 'iden1',
    //         calculation : () => {
    //             const disp          = yield dispatcher
    //
    //             return yield iden2
    //         }
    //     })
    //
    //     const iden2         = new CalculableBox({
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
