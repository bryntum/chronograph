import { computed, observable } from "../../node_modules/mobx/lib/mobx.module.js"
import { ChronoGraph } from "../../src/chrono/Graph.js"
import { CalculatedValueGen, CalculatedValueSync, Identifier } from "../../src/chrono/Identifier.js"
import { Box } from "../../src/chrono2/data/Box.js"
import { CalculableBox } from "../../src/chrono2/data/CalculableBox.js"
import { Base } from "../../src/class/Base.js"
import { AnyConstructor, ClassUnion, Mixin, MixinAny } from "../../src/class/Mixin.js"
import { Entity, field } from "../../src/replica/Entity.js"
import { Replica } from "../../src/replica/Replica.js"

//---------------------------------------------------------------------------------------------------------------------
export type GraphGenerationResult  = { graph : ChronoGraph, boxes : Identifier[], counter : number }


//---------------------------------------------------------------------------------------------------------------------
export const deepGraphGen = (atomNum : number = 1000) : GraphGenerationResult => {
    const graph : ChronoGraph   = ChronoGraph.new()

    let boxes       = []

    const res       = { graph, boxes, counter : 0 }

    for (let i = 0; i < atomNum; i++) {
        if (i <= 3) {
            boxes.push(graph.variableNamed(i, 1))
        }
        else if (i <= 10) {
            boxes.push(graph.identifierNamed(i, function* (YIELD) {
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
            boxes.push(graph.identifierNamed(i, function* (YIELD) {
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
            boxes.push(graph.identifierNamed(i, function* (YIELD) {
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


//---------------------------------------------------------------------------------------------------------------------
export const deepGraphGenShared = (atomNum : number = 1000) : GraphGenerationResult => {
    const graph : ChronoGraph   = ChronoGraph.new()

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
            boxes.push(graph.variableNamed(i, 1))
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


//---------------------------------------------------------------------------------------------------------------------
export const deepGraphSync = (atomNum : number = 1000) : GraphGenerationResult => {
    const graph : ChronoGraph   = ChronoGraph.new()

    let boxes       = []

    const res       = { graph, boxes, counter : 0 }

    for (let i = 0; i < atomNum; i++) {
        if (i <= 3) {
            boxes.push(graph.variableNamed(i, 1))
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


//---------------------------------------------------------------------------------------------------------------------
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


//---------------------------------------------------------------------------------------------------------------------
export type Chrono2GenerationResult  = { boxes : CalculableBox<number>[], counter : number }

export const chrono2Graph = (atomNum : number = 1000) : Chrono2GenerationResult => {
    let boxes       = []

    const res       = { boxes, counter : 0 }

    for (let i = 0; i < atomNum; i++) {
        if (i <= 3) {
            const box = new Box()

            box.write(1)

            boxes.push(box)
        }
        else if (i <= 10) {
            const box = new CalculableBox({
                calculation : function () {
                    res.counter++

                    const input = [
                        boxes[0].read(),
                        boxes[1].read(),
                        boxes[2].read(),
                        boxes[3].read(),
                    ]

                    return input.reduce((sum, op) => sum + op, 0)
                },
                context : i
            })

            boxes.push(box)
        }
        else if (i % 2 == 0) {
            const box = new CalculableBox({
                calculation : function () {
                    res.counter++

                    const input = [
                        boxes[this - 1].read(),
                        boxes[this - 2].read(),
                        boxes[this - 3].read(),
                        boxes[this - 4].read(),
                    ]

                    return input.reduce((sum, op) => (sum + op) % 10000, 0)
                },
                context : i
            })

            boxes.push(box)
        } else {
            const box = new CalculableBox({
                calculation : function () {
                    res.counter++

                    const input = [
                        boxes[this - 1].read(),
                        boxes[this - 2].read(),
                        boxes[this - 3].read(),
                        boxes[this - 4].read(),
                    ]

                    return input.reduce((sum, op) => (sum - op) % 10000, 0)
                },
                context : i
            })

            boxes.push(box)
        }
    }

    return res
}



//---------------------------------------------------------------------------------------------------------------------
export type ReplicaGenerationResult  = { replica : Replica, entities : Entity[] }


//---------------------------------------------------------------------------------------------------------------------
export class Mixin1 extends Mixin(
    [ Entity ], (base : AnyConstructor<Entity, typeof Entity>) => {

    class Mixin1 extends base {
        @field()
        field11         : string        = 'string'

        @field()
        field12         : number        = 0

        @field()
        field13         : boolean       = false

        @field()
        field14         : any[]         = []

        @field()
        field15         : object        = {}
    }

    return Mixin1
}){}

//---------------------------------------------------------------------------------------------------------------------
export class Mixin2 extends Mixin(
    [ Entity ], (base : AnyConstructor<Entity, typeof Entity>) => {

    class Mixin2 extends base {
        @field()
        field21         : string        = 'string'

        @field()
        field22         : number        = 0

        @field()
        field23         : boolean       = false

        @field()
        field24         : any[]         = []

        @field()
        field25         : object        = {}
    }

    return Mixin2
}){}

//---------------------------------------------------------------------------------------------------------------------
export class Mixin3 extends Mixin(
    [ Entity ], (base : AnyConstructor<Entity, typeof Entity>) => {

    class Mixin3 extends base {
        @field()
        field31         : string        = 'string'

        @field()
        field32         : number        = 0

        @field()
        field33         : boolean       = false

        @field()
        field34         : any[]         = []

        @field()
        field35         : object        = {}
    }

    return Mixin3
}){}


//---------------------------------------------------------------------------------------------------------------------
export class Mixin4 extends Mixin(
    [ Entity ], (base : AnyConstructor<Entity, typeof Entity>) => {

    class Mixin4 extends base {
        @field()
        field41         : string        = 'string'

        @field()
        field42         : number        = 0

        @field()
        field43         : boolean       = false

        @field()
        field44         : any[]         = []

        @field()
        field45         : object        = {}
    }

    return Mixin4
}){}

//---------------------------------------------------------------------------------------------------------------------
export class Mixin5 extends Mixin(
    [ Entity ], (base : ClassUnion<typeof Entity>) => {

    class Mixin5 extends base {
        @field()
        field51         : string        = 'string'

        @field()
        field52         : number        = 0

        @field()
        field53         : boolean       = false

        @field()
        field54         : any[]         = []

        @field()
        field55         : object        = {}
    }

    return Mixin5
}){}

class TestEntity5 extends MixinAny(
    [ Mixin5, Mixin4, Mixin3, Mixin2, Mixin1, Entity, Base ],
    (base : AnyConstructor<Mixin5 & Mixin4 & Mixin3 & Mixin2 & Mixin1 & Entity & Base, typeof Mixin5 & typeof Mixin4 & typeof Mixin3 & typeof Mixin2 & typeof Mixin1 & typeof Entity & typeof Base>) => base
){}


class TestEntity1 extends Mixin(
    [ Mixin1, Entity, Base ],
    (base : AnyConstructor<Mixin1 & Entity & Base, typeof Mixin1 & typeof Entity & typeof Base>) => base
) {}


//---------------------------------------------------------------------------------------------------------------------
export const replicaGen = (entitiesNum : number = 1000) : ReplicaGenerationResult => {
    const replica : Replica     = Replica.new()

    let entities : Entity[]      = []

    const res       = { replica, entities }

    for (let i = 0; i < entitiesNum; i++) {
        const instance  = TestEntity5.new()

        entities.push(instance)
        replica.addEntity(instance)
    }

    // console.profile('adding')
    //
    // // const map = new Map()
    //
    // for (let i = 0; i < entitiesNum; i++) {
    //     const instance  = entities[ i ]
    //
    //     replica.addEntity(instance)
    //
    //     // instance.$entity.forEachField((field, name) => {
    //     //     map.set(instance.$[ name ], instance)
    //     // })
    // }
    // // // console.log("Map size: ", map.size)
    // //
    // // // console.log("Entries size: ", replica.activeTransaction.entries.size)
    //
    // console.profileEnd('adding')


    return res
}


//---------------------------------------------------------------------------------------------------------------------
// in this graph the first 4 identifiers are static variables and all others are the sum of them
// changing the box[ 0 ] will trigger recalculation of all boxes > 3
// but the quarks for boxes 1, 2, 3 will be shadowing
// repeating the set for box 0 will produce a lot of shadowing quarks (but should not leak memory anyway)

export const mostlyShadowingGraph = (atomNum : number = 1000) : GraphGenerationResult => {
    const graph : ChronoGraph           = ChronoGraph.new()

    const boxes : Identifier[]          = []
    const res : GraphGenerationResult   = { graph, boxes, counter : 0 }

    const staticIdentsCount             = 4

    class MyIden1 extends CalculatedValueGen {
        * calculation (YIELD) {
            let sum     = 0

            for (let i = 0; i < staticIdentsCount; i++) sum += yield boxes[ i ]

            return sum
        }
    }


    for (let i = 0; i < atomNum; i++) {
        if (i < staticIdentsCount) {
            boxes.push(graph.variableNamed(i, 1))
        }
        else {
            const iden  = MyIden1.new({ name : i, context : i })

            boxes.push(graph.addIdentifier(iden))
        }
    }

    return res
}
