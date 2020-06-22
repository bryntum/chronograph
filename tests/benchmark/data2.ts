import { computed, observable } from "../../node_modules/mobx/lib/mobx.module.js"
import { Box } from "../../src/chrono2/data/Box.js"
import { CalculableBox } from "../../src/chrono2/data/CalculableBox.js"
import { Chrono2GenerationResult, MobxGraphGenerationResult } from "./data.js"


//---------------------------------------------------------------------------------------------------------------------
export const mobxMassiveOutgoing = (atomNum : number = 1000) : MobxGraphGenerationResult => {
    const source    = observable.box(0)

    let boxes       = [ source ]

    const res       = { boxes, counter : 0 }

    for (let i = 0; i < atomNum; i++) {
        boxes.push(computed(function () {
            res.counter++

            return source.get() * this
        }, { keepAlive : true, context : i }))
    }

    return res
}


export const chrono2MassiveOutgoing = (atomNum : number = 1000) : Chrono2GenerationResult => {
    const source    = new Box(0)

    let boxes       = [ source ]

    const res       = { boxes, counter : 0 }

    for (let i = 0; i < atomNum; i++) {
        boxes.push(new CalculableBox({
            context : i,
            calculation : function () {
                res.counter++

                return source.read() * this
            }
        }))
    }

    return res
}

//---------------------------------------------------------------------------------------------------------------------
export const mobxMassiveIncoming = (atomNum : number = 1000) : MobxGraphGenerationResult => {
    let boxes       = []

    const res       = { boxes, counter : 0 }

    for (let i = 0; i < atomNum; i++) {
        boxes.push(observable.box(1))
    }

    boxes.push(computed(function () {
        res.counter++

        let sum = 0

        for (let i = 0; i < atomNum; i++) {
            sum += boxes[ 0 ].get()
        }

        return sum
    }, { keepAlive : true }))

    return res
}


export const chrono2MassiveIncoming = (atomNum : number = 1000) : Chrono2GenerationResult => {
    let boxes       = []

    const res       = { boxes, counter : 0 }

    for (let i = 0; i < atomNum; i++) {
        boxes.push(new Box(1))
    }

    boxes.push(new CalculableBox({
        calculation : function () {
            res.counter++

            let sum = 0

            for (let i = 0; i < atomNum; i++) {
                sum += boxes[ 0 ].read()
            }

            return sum
        }
    }))

    return res
}


//---------------------------------------------------------------------------------------------------------------------
export const mobxMassiveIncomingAndOutgoing = (atomNum : number = 1000) : MobxGraphGenerationResult => {
    let boxes       = []
    const res       = { boxes, counter : 0 }

    const source    = observable.box(0)
    let outgoing    = []

    for (let i = 0; i < atomNum; i++) {
        outgoing.push(computed(function () {
            res.counter++

            return source.get() * this
        }, { keepAlive : true, context : i }))
    }

    const final = computed(function () {
        res.counter++

        let sum = 0

        for (let i = 0; i < outgoing.length; i++) {
            sum += outgoing[ i ].get()
        }

        return sum
    }, { keepAlive : true })

    boxes.push(source, ...outgoing, final)

    return res
}


export const chrono2MassiveIncomingAndOutgoing = (atomNum : number = 1000) : Chrono2GenerationResult => {
    let boxes       = []
    const res       = { boxes, counter : 0 }

    const source    = new Box(0)
    let outgoing    = []

    for (let i = 0; i < atomNum; i++) {
        outgoing.push(new CalculableBox({
            context : i,
            calculation : function () {
                res.counter++

                return source.read() * this
            }
        }))
    }

    const final = new CalculableBox({
        calculation : function () {
            res.counter++

            let sum = 0

            for (let i = 0; i < outgoing.length; i++) {
                sum += outgoing[ i ].read()
            }

            return sum
        }
    })

    boxes.push(source, ...outgoing, final)

    return res
}



//---------------------------------------------------------------------------------------------------------------------
export const mobxMutatingGraph = (atomNum : number = 1000, depCount : number = 1) : MobxGraphGenerationResult => {
    const dispatcher = observable.box(0)

    let boxes       = [ dispatcher ]

    const res       = { boxes, counter : 0 }

    for (let i = 0; i < depCount; i++) {
        boxes.push(observable.box(0))
    }

    for (let i = depCount; i < atomNum; i++) {
        const box = computed(function () {
            res.counter++

            let sum = 0

            for (let i = 1 + dispatcher.get(); i <= depCount; i += 2) {
                sum     += boxes[this - i].get() % 10000
            }

            return sum
        }, {
            context : i, keepAlive : true
        })

        boxes.push(box)
    }

    return res
}


export const chrono2MutatingGraph = (atomNum : number = 1000, depCount : number = 1) : Chrono2GenerationResult => {
    const dispatcher = new Box(0)

    let boxes       = [ dispatcher ]

    const res       = { boxes, counter : 0 }

    for (let i = 0; i < depCount; i++) {
        boxes.push(new Box(0))
    }

    for (let i = depCount; i < atomNum; i++) {
        const box = new CalculableBox({
            calculation : function () {
                res.counter++

                let sum = 0

                for (let i = 1 + dispatcher.read(); i <= depCount; i += 2) {
                    sum     += boxes[this - i].read() % 10000
                }

                return sum
            },
            context : i
        })

        boxes.push(box)
    }

    return res
}

