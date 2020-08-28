import { setCompactCounter } from "../../src/chrono2/atom/Node.js"
import { Box } from "../../src/chrono2/data/Box.js"
import { CalculableBox } from "../../src/chrono2/data/CalculableBox.js"
import { CalculableBoxGen } from "../../src/chrono2/data/CalculableBoxGen.js"
import { Reject } from "../../src/chrono2/Effect.js"
import { ChronoGraph } from "../../src/chrono2/graph/Graph.js"

declare const StartTest : any

setCompactCounter(1)

StartTest(t => {

    t.it('Reject before the 1st commit should nullify the values', t => {
        const box1      = new Box(10)

        const box2      = new CalculableBox({
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

        const graph     = ChronoGraph.new()

        // only adding box1 and box2, box3 is "external"
        graph.addAtoms([ box1, box2 ])

        t.is(box1.read(), 10)
        t.is(box2.read(), 11)
        t.is(externalBox3.read(), 12)

        graph.reject()

        t.is(box1.read(), null)
        t.is(box2.read(), null)
        t.is(externalBox3.read(), null)

        // repeated reject after reject - should do nothing
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

        const graph     = ChronoGraph.new()

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
            calculation : () => {
                const value1 = box1.read()

                if (value1 === null) return null

                return value1 + 1
            }
        })

        const graph     = ChronoGraph.new({ historyLimit : 0 })

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

        const graph     = ChronoGraph.new({ historyLimit : 0 })

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


    t.it('Reject should reset transaction stack', t => {
        const box0      = new Box(0)
        const box1      = new Box(10)

        let counter2    = 0
        const box2      = new CalculableBox({
            lazy        : false,
            calculation : () => {
                counter2++
                return box1.read() + 1
            }
        })

        let counter3    = 0
        const box3     = new CalculableBox({
            lazy        : false,
            calculation : () => {
                counter3++
                return box2.read() + 1
            }
        })

        const graph     = ChronoGraph.new({ historyLimit : 0 })

        graph.addAtoms([ box0, box1, box2, box3 ])

        graph.commit()

        t.isDeeply([ counter2, counter3 ], [ 1, 1 ])

        //------------------
        box1.write(20)

        graph.reject()

        //------------------
        counter2 = counter3 = 0

        box0.write(10)

        t.isDeeply([ box1.read(), box2.read(), box3.read() ], [ 10, 11, 12 ])

        t.isDeeply([ counter2, counter3 ], [ 0, 0 ])
    })


    t.it('Reject should reset transaction stack for lazy atoms', t => {
        const box0      = new Box(0)
        const box1      = new Box(10)

        let counter2    = 0
        const box2      = new CalculableBox({
            lazy        : true,
            calculation : () => {
                counter2++
                return box1.read() + 1
            }
        })

        let counter3    = 0
        const box3     = new CalculableBox({
            lazy        : true,
            calculation : () => {
                counter3++
                return box2.read() + 1
            }
        })

        const graph     = ChronoGraph.new({ historyLimit : 0 })

        graph.addAtoms([ box0, box1, box2, box3 ])

        graph.commit()

        t.isDeeply([ counter2, counter3 ], [ 0, 0 ])

        //------------------
        box1.write(20)

        graph.reject()

        //------------------
        counter2 = counter3 = 0

        box0.write(10)

        t.isDeeply([ box1.read(), box2.read(), box3.read() ], [ 10, 11, 12 ])

        t.isDeeply([ counter2, counter3 ], [ 1, 1 ])
    })


    t.it('Reject should reset transaction stack for lazy atoms #2', t => {
        const box0      = new Box(0)
        const box1      = new Box(10)

        let counter2    = 0
        const box2      = new CalculableBox({
            lazy        : true,
            calculation : () => {
                counter2++
                return box1.read() + 1
            }
        })

        let counter3    = 0
        const box3     = new CalculableBox({
            lazy        : true,
            calculation : () => {
                counter3++
                return box2.read() + 1
            }
        })

        const graph     = ChronoGraph.new({ historyLimit : 0 })

        graph.addAtoms([ box0, box1, box2, box3 ])

        t.isDeeply([ box1.read(), box2.read(), box3.read() ], [ 10, 11, 12 ])

        t.isDeeply([ counter2, counter3 ], [ 1, 1 ])

        graph.commit()

        //------------------
        box1.write(20)

        graph.reject()

        //------------------
        counter2 = counter3 = 0

        box0.write(10)

        t.isDeeply([ box1.read(), box2.read(), box3.read() ], [ 10, 11, 12 ])

        t.isDeeply([ counter2, counter3 ], [ 0, 0 ])
    })


    t.it('Should be able to reject transaction using graph api', async t => {
        const graph : ChronoGraph       = ChronoGraph.new({ historyLimit : 0 })

        const i1        = new Box(0, 'i1')
        const i2        = new Box(10, 'i2')
        const i3        = new Box(0, 'i3')

        const c1        = new CalculableBox({
            name    : 'c1',
            calculation () {
                return i1.read() + i2.read()
            }
        })

        const c2        = new CalculableBox({
            name    : 'c2',
            calculation () {
                return c1.read() + 1
            }
        })

        const c3        = new CalculableBox({
            name    : 'c3',
            calculation () {
                return c2.read() + i3.read()
            }
        })

        const nodes             = [ i1, i2, i3, c1, c2, c3 ]

        graph.addAtoms(nodes)

        // ----------------
        t.isDeeply(nodes.map(node => node.read()), [ 0, 10, 0, 10, 11, 11 ], "Correct result calculated #1")

        graph.commit()

        // ----------------
        i1.write(1)
        i2.write(1)
        i3.write(1)

        t.isDeeply(nodes.map(node => node.read()), [ 1, 1, 1, 2, 3, 4 ], "Correct result calculated #1")

        graph.reject()

        t.isDeeply(nodes.map(node => node.read()), [ 0, 10, 0, 10, 11, 11 ], "Graph state rolled back to previous commit")
    })


    t.it('Should be able to reject transaction using effect', async t => {
        const graph : ChronoGraph       = ChronoGraph.new({ historyLimit : 0 })

        const i1        = new Box(0, 'i1')
        const i2        = new Box(10, 'i2')

        const c1        = new CalculableBoxGen({
            lazy        : false,
            name : 'c1', calculation : function* () {
                const sum : number = (yield i1) + (yield i2)

                if (sum > 10) yield Reject('Too big')

                return sum
            }
        })

        graph.addAtoms([ i1, i2, c1 ])

        graph.commit()

        // ----------------
        const nodes             = [ i1, i2, c1 ]

        t.isDeeply(nodes.map(node => node.read()), [ 0, 10, 10 ], "Correct result calculated #1")

        // ----------------
        i1.write(8)
        i2.write(7)

        const result = graph.commit()

        t.like(result.rejectedWith.reason, /Too big/)

        t.isDeeply(nodes.map(node => node.read()), [ 0, 10, 10 ], "Correct result calculated #2")
    })
})
