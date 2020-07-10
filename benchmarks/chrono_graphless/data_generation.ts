import { BoxAbstract, GraphGenerationResult, GraphGenerator } from "./data_generators.js"


//---------------------------------------------------------------------------------------------------------------------
export const massiveOutgoing = (graphGen : GraphGenerator<unknown>, atomNum : number = 1000) : GraphGenerationResult => {
    const source    = graphGen.box(0)

    let boxes : BoxAbstract<number>[]       = [ source ]

    const res       = { boxes, counter : 0 }

    for (let i = 0; i < atomNum; i++) {
        boxes.push(graphGen.computed(function () {
            res.counter++

            return source.READ() * this
        }, i))
    }

    return res
}


//---------------------------------------------------------------------------------------------------------------------
export const massiveIncoming = (graphGen : GraphGenerator<unknown>, atomNum : number = 1000) : GraphGenerationResult => {
    let boxes : BoxAbstract<number>[]   = []

    const res                           = { boxes, counter : 0 }

    for (let i = 0; i < atomNum; i++) {
        boxes.push(graphGen.box(1))
    }

    boxes.push(graphGen.computed(function () {
        res.counter++

        let sum = 0

        for (let i = 0; i < atomNum; i++) {
            sum += boxes[ i ].READ()
        }

        return sum
    }))

    return res
}


//---------------------------------------------------------------------------------------------------------------------
export const massiveIncomingAndOutgoing = (graphGen : GraphGenerator<unknown>, atomNum : number = 1000) : GraphGenerationResult => {
    let boxes : BoxAbstract<number>[]       = []
    const res                               = { boxes, counter : 0 }

    const source                            = graphGen.box(0)
    let outgoing : BoxAbstract<number>[]    = []

    for (let i = 0; i < atomNum; i++) {
        outgoing.push(graphGen.computed(function () {
            res.counter++

            return source.READ() * this
        }))
    }

    const final = graphGen.computed(function () {
        res.counter++

        let sum = 0

        for (let i = 0; i < outgoing.length; i++) {
            sum += outgoing[ i ].READ()
        }

        return sum
    })

    boxes.push(source, ...outgoing, final)

    return res
}



//---------------------------------------------------------------------------------------------------------------------
export const mutatingGraph = (graphGen : GraphGenerator<unknown>, atomNum : number = 1000, depCount : number = 1) : GraphGenerationResult => {
    const dispatcher : BoxAbstract<number>  = graphGen.box(0)

    let boxes : BoxAbstract<number>[]       = [ dispatcher ]

    const res                               = { boxes, counter : 0 }

    for (let i = 0; i < depCount; i++) {
        boxes.push(graphGen.box(0))
    }

    for (let i = depCount; i < atomNum; i++) {
        const box = graphGen.computed(
            function () {
                res.counter++

                let sum = 0

                for (let i = 1 + dispatcher.READ(); i <= depCount; i += 2) {
                    sum     += boxes[ this - i ].READ() % 10000
                }

                return sum
            },
            i
        )

        boxes.push(box)
    }

    return res
}
