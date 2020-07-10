import { BoxAbstract, GraphGenerationResult, GraphGenerator, GraphlessBenchmark } from "./data_generators.js"


//---------------------------------------------------------------------------------------------------------------------
export class MassiveOutgoingBenchmark extends GraphlessBenchmark {
    atomNum         : number                        = 1000

    graphGen        : GraphGenerator<unknown>       = undefined

    async setup () {
        const source    = this.graphGen.box(0)

        let boxes : BoxAbstract<number>[]       = [ source ]

        const res       = { boxes, counter : 0 }

        for (let i = 0; i < this.atomNum; i++) {
            boxes.push(this.graphGen.computed(function () {
                res.counter++

                return source.READ() * this
            }, i))
        }

        return res
    }


    cycle (iteration : number, cycle : number, setup : GraphGenerationResult) {
        const { boxes } = setup

        boxes[ 0 ].WRITE(iteration + cycle)

        for (let k = 0; k < boxes.length; k++) boxes[ k ].READ()
    }
}

