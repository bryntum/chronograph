import { WalkJsonContext } from "../../src/util/WalkJson.js"

declare const StartTest : any


StartTest(t => {

    t.it('Should be able to walk on the JSON objects', t => {
        const walkPath      = []

        WalkJsonContext.new({
            onNode : (node : any, from : any, label : string | symbol) => {
                walkPath.push(node)
            }
        }).startFrom([ { a : 1 } ])

        t.isDeeply(walkPath, [ { a : 1 }, 1 ], 'Correct walk path')
    })
})

