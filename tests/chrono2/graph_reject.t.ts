import { setCompactCounter } from "../../src/chrono2/atom/Node.js"
import { Box } from "../../src/chrono2/data/Box.js"
import { CalculableBox } from "../../src/chrono2/data/CalculableBox.js"
import { ChronoGraph } from "../../src/chrono2/graph/Graph.js"

declare const StartTest : any

setCompactCounter(1)

StartTest(t => {

    t.it('Reject before the 1st commit should nullify the values', t => {
        const box1      = new Box(10)

        const box2     = new CalculableBox({
            calculation : () => {
                const value1 = box1.read()

                if (value1 === null) return null

                return value1 + 1
            }
        })

        const externalBox3     = new CalculableBox({
            calculation : () => {
                const value2 = box2.read()

                if (value2 === null) return null

                return value2 + 1
            }
        })

        const graph     = new ChronoGraph()

        // only adding box1 and box2, box3 is "external"
        graph.addAtoms([ box1, box2 ])

        t.is(box1.read(), 10)
        t.is(box2.read(), 11)
        t.is(externalBox3.read(), 12)

        graph.reject()

        t.is(box1.read(), null)
        t.is(box2.read(), null)
        t.is(externalBox3.read(), null)
    })


    t.it('Reject immediately after commit should do nothing', t => {
        const box1      = new Box(10)

        const box2     = new CalculableBox({
            calculation : () => box1.read() + 1
        })

        const externalBox3     = new CalculableBox({
            calculation : () => box2.read() + 1
        })

        const graph     = new ChronoGraph()

        // only adding box1 and box2, box3 is "external"
        graph.addAtoms([ box1, box2 ])

        t.is(box1.read(), 10)
        t.is(box2.read(), 11)
        t.is(externalBox3.read(), 12)

        graph.commit()

        graph.reject()

        t.is(box1.read(), 10)
        t.is(box2.read(), 11)
        t.is(externalBox3.read(), 12)
    })


    t.it('Reject should reset the state to the previous commit', t => {
        const box1      = new Box(10)

        const box2     = new CalculableBox({
            calculation : () => box1.read() + 1
        })

        const graph     = new ChronoGraph()

        graph.addAtoms([ box1, box2 ])

        t.is(box1.read(), 10)
        t.is(box2.read(), 11)

        graph.commit()

        box1.write(20)

        t.is(box1.read(), 20)
        t.is(box2.read(), 21)

        graph.reject()

        t.is(box1.read(), 10)
        t.is(box2.read(), 11)

        box1.write(20)

        t.is(box1.read(), 20)
        t.is(box2.read(), 21)

        graph.reject()

        t.is(box1.read(), 10)
        t.is(box2.read(), 11)
    })


    t.it('Reject should reset the state to the previous commit and synchronize external atoms', t => {
        const box1      = new Box(10)

        const box2     = new CalculableBox({
            calculation : () => box1.read() + 1
        })

        const externalBox3     = new CalculableBox({
            calculation : () => box2.read() + 1
        })

        const graph     = new ChronoGraph()

        graph.addAtoms([ box1, box2 ])

        t.is(box1.read(), 10)
        t.is(box2.read(), 11)
        t.is(externalBox3.read(), 12)

        graph.commit()

        box1.write(20)

        t.is(box1.read(), 20)
        t.is(box2.read(), 21)
        t.is(externalBox3.read(), 22)

        graph.reject()

        t.is(box1.read(), 10)
        t.is(box2.read(), 11)
        t.is(externalBox3.read(), 12)

        box1.write(20)

        t.is(box1.read(), 20)
        t.is(box2.read(), 21)
        t.is(externalBox3.read(), 22)

        graph.reject()

        t.is(box1.read(), 10)
        t.is(box2.read(), 11)
        t.is(externalBox3.read(), 12)
    })


    // t.it('Should be able to reject transaction using graph api', async t => {
    //     const graph : ChronoGraph       = ChronoGraph.new()
    //
    //     const i1        = graph.variableNamed('i1', 0)
    //     const i2        = graph.variableNamed('i2', 10)
    //     const i3        = graph.variableNamed('i3', 0)
    //
    //     const c1        = graph.identifierNamed('c1', function* () {
    //         return (yield i1) + (yield i2)
    //     })
    //
    //     const c2        = graph.identifierNamed('c2', function* () {
    //         return (yield c1) + 1
    //     })
    //
    //     const c3        = graph.identifierNamed('c3', function* () {
    //         return (yield c2) + (yield i3)
    //     })
    //
    //     graph.commit()
    //
    //     // ----------------
    //     const nodes             = [ i1, i2, i3, c1, c2, c3 ]
    //
    //     t.isDeeply(nodes.map(node => graph.read(node)), [ 0, 10, 0, 10, 11, 11 ], "Correct result calculated #1")
    //
    //     // ----------------
    //     graph.write(i1, 1)
    //     graph.write(i2, 1)
    //     graph.write(i3, 1)
    //
    //     t.isDeeply(nodes.map(node => graph.read(node)), [ 1, 1, 1, 2, 3, 4 ], "Correct result calculated #1")
    //
    //     graph.reject()
    //
    //     t.isDeeply(nodes.map(node => graph.read(node)), [ 0, 10, 0, 10, 11, 11 ], "Graph state rolled back to previous commit")
    // })
    //
    // t.it('Should be able to reject transaction using effect', async t => {
    //     const graph : ChronoGraph       = ChronoGraph.new()
    //
    //     const i1        = graph.variableNamed('i1', 0)
    //     const i2        = graph.variableNamed('i2', 10)
    //
    //     const c1        = graph.identifierNamed('c1', function* () {
    //         const sum : number = (yield i1) + (yield i2)
    //
    //         if (sum > 10) yield Reject('Too big')
    //
    //         return sum
    //     })
    //
    //     graph.commit()
    //
    //     // ----------------
    //     const nodes             = [ i1, i2, c1 ]
    //
    //     t.isDeeply(nodes.map(node => graph.read(node)), [ 0, 10, 10 ], "Correct result calculated #1")
    //
    //     // ----------------
    //     graph.write(i1, 8)
    //     graph.write(i2, 7)
    //
    //     const result = graph.commit()
    //
    //     t.like(result.rejectedWith.reason, /Too big/)
    //
    //     t.isDeeply(nodes.map(node => graph.read(node)), [ 0, 10, 10 ], "Correct result calculated #1")
    // })

})
