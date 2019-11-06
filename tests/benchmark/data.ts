import { computed, observable } from "../../node_modules/mobx/lib/mobx.module.js"
import { ChronoGraph, MinimalChronoGraph } from "../../src/chrono/Graph.js"
import { CalculatedValueGen, CalculatedValueSync, Identifier } from "../../src/chrono/Identifier.js"

export type GraphGenerationResult  = { graph : ChronoGraph, boxes : Identifier[], counter : number }

export const deepGraphGen = (atomNum : number = 1000) : GraphGenerationResult => {
    const graph : ChronoGraph   = MinimalChronoGraph.new()

    let boxes       = []

    const res       = { graph, boxes, counter : 0 }

    for (let i = 0; i < atomNum; i++) {
        if (i <= 3) {
            boxes.push(graph.variableId(i, 1))
        }
        else if (i <= 10) {
            boxes.push(graph.identifierId(i, function* (YIELD) {
                res.counter++

                const input : number[] = [
                    yield boxes[0],
                    yield boxes[1],
                    yield boxes[2],
                    yield boxes[3]
                ]

                return input.reduce((sum, op) => sum + op, 0)
            }, i))
        }
        else if (i % 2 == 0) {
            boxes.push(graph.identifierId(i, function* (YIELD) {
                res.counter++

                const input : number[] = [
                    yield boxes[this - 1],
                    yield boxes[this - 2],
                    yield boxes[this - 3],
                    yield boxes[this - 4]
                ]

                return input.reduce((sum, op) => (sum + op) % 10000, 0)
            }, i))
        } else {
            boxes.push(graph.identifierId(i, function* (YIELD) {
                res.counter++

                const input : number[] = [
                    yield boxes[this - 1],
                    yield boxes[this - 2],
                    yield boxes[this - 3],
                    yield boxes[this - 4]
                ]

                return input.reduce((sum, op) => (sum - op) % 10000, 0)
            }, i))
        }
    }

    return res
}


export const deepGraphGenShared = (atomNum : number = 1000) : GraphGenerationResult => {
    const graph : ChronoGraph   = MinimalChronoGraph.new()

    let boxes       = []

    const res       = { graph, boxes, counter : 0 }

    class MyIden1 extends CalculatedValueGen {
        * calculation (YIELD) {
            res.counter++

            const input : number[] = [
                yield boxes[0],
                yield boxes[1],
                yield boxes[2],
                yield boxes[3]
            ]

            return input.reduce((sum, op) => sum + op, 0)
        }
    }

    class MyIden2 extends CalculatedValueGen {
        * calculation (this : number, YIELD) {
            res.counter++

            const input : number[] = [
                yield boxes[this - 1],
                yield boxes[this - 2],
                yield boxes[this - 3],
                yield boxes[this - 4]
            ]

            return input.reduce((sum, op) => (sum + op) % 10000, 0)
        }
    }

    class MyIden3 extends CalculatedValueGen {
        * calculation (this : number, YIELD) {
            res.counter++

            const input : number[] = [
                yield boxes[this - 1],
                yield boxes[this - 2],
                yield boxes[this - 3],
                yield boxes[this - 4]
            ]

            return input.reduce((sum, op) => (sum - op) % 10000, 0)
        }
    }


    for (let i = 0; i < atomNum; i++) {
        if (i <= 3) {
            boxes.push(graph.variableId(i, 1))
        }
        else if (i <= 10) {
            const iden1 = MyIden1.new({ name : i, context : i })

            graph.addIdentifier(iden1)

            boxes.push(iden1)
        }
        else if (i % 2 == 0) {
            const iden2 = MyIden2.new({ name : i, context : i })

            graph.addIdentifier(iden2)

            boxes.push(iden2)
        } else {
            const iden3 = MyIden3.new({ name : i, context : i })

            graph.addIdentifier(iden3)

            boxes.push(iden3)
        }
    }

    return res
}



export const deepGraphSync = (atomNum : number = 1000) : GraphGenerationResult => {
    const graph : ChronoGraph   = MinimalChronoGraph.new()

    let boxes       = []

    const res       = { graph, boxes, counter : 0 }

    for (let i = 0; i < atomNum; i++) {
        if (i <= 3) {
            boxes.push(graph.variableId(i, 1))
        }
        else if (i <= 10) {
            boxes.push(graph.addIdentifier(CalculatedValueSync.new({
                calculation : function (YIELD) {
                    res.counter++

                    const input : number[] = [
                        YIELD(boxes[0]),
                        YIELD(boxes[1]),
                        YIELD(boxes[2]),
                        YIELD(boxes[3])
                    ]

                    return input.reduce((sum, op) => sum + op, 0)
                },
                context : i
            })))
        }
        else if (i % 2 == 0) {
            boxes.push(graph.addIdentifier(CalculatedValueSync.new({
                calculation : function (YIELD) {
                    res.counter++

                    const input : number[] = [
                        YIELD(boxes[this - 1]),
                        YIELD(boxes[this - 2]),
                        YIELD(boxes[this - 3]),
                        YIELD(boxes[this - 4])
                    ]

                    return input.reduce((sum, op) => (sum + op) % 10000, 0)
                },
                context : i
            })))
        } else {
            boxes.push(graph.addIdentifier(CalculatedValueSync.new({
                calculation : function (YIELD) {
                    res.counter++

                    const input : number[] = [
                        YIELD(boxes[this - 1]),
                        YIELD(boxes[this - 2]),
                        YIELD(boxes[this - 3]),
                        YIELD(boxes[this - 4])
                    ]

                    return input.reduce((sum, op) => (sum - op) % 10000, 0)
                },
                context : i
            })))
        }
    }

    return res
}

export type MobxBox = { get : () => number, set : (v : number) => any }

export type MobxGraphGenerationResult  = { boxes : MobxBox[], counter : number }

export const mobxGraph = (atomNum : number = 1000) : MobxGraphGenerationResult => {
    let boxes       = []

    const res       = { boxes, counter : 0 }

    for (let i = 0; i < atomNum; i++) {
        if (i <= 3) {
            boxes.push(observable.box(1))
        }
        else if (i <= 10) {
            boxes.push(computed(function () {
                res.counter++

                const input = [
                    boxes[0].get(),
                    boxes[1].get(),
                    boxes[2].get(),
                    boxes[3].get(),
                ]

                return input.reduce((sum, op) => sum + op, 0)
            }, { keepAlive : true, context : i }))
        }
        else if (i % 2 == 0) {
            boxes.push(computed(function () {
                res.counter++

                const input = [
                    boxes[this - 1].get(),
                    boxes[this - 2].get(),
                    boxes[this - 3].get(),
                    boxes[this - 4].get(),
                ]

                return input.reduce((sum, op) => (sum + op) % 10000, 0)
            }, { keepAlive : true, context : i }))

        } else {
            boxes.push(computed(function () {
                res.counter++

                const input = [
                    boxes[this - 1].get(),
                    boxes[this - 2].get(),
                    boxes[this - 3].get(),
                    boxes[this - 4].get(),
                ]

                return input.reduce((sum, op) => (sum - op) % 10000, 0)
            }, { keepAlive : true, context : i }))
        }
    }

    return res
}
