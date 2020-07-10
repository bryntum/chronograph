import { BoxAbstract, GraphGenerationResult, GraphGenerator, GraphlessBenchmark } from "./data_generators.js"


//---------------------------------------------------------------------------------------------------------------------
export class MassiveIncomingBenchmark extends GraphlessBenchmark {
    atomNum         : number                        = 1000

    graphGen        : GraphGenerator<unknown>       = undefined

    async setup () {
        let boxes : BoxAbstract<number>[]   = []

        const res                           = { boxes, counter : 0 }

        for (let i = 0; i < this.atomNum; i++) {
            boxes.push(this.graphGen.box(1))
        }

        boxes.push(this.graphGen.computed(function () {
            res.counter++

            let sum = 0

            for (let i = 0; i < this.atomNum; i++) {
                sum += boxes[ i ].READ()
            }

            return sum
        }))

        return res
    }


    cycle (iteration : number, cycle : number, setup : GraphGenerationResult) {
        const { boxes } = setup

        boxes[ 0 ].WRITE(iteration + cycle)

        for (let k = 0; k < boxes.length; k++) boxes[ k ].READ()
    }
}

