import { Base } from "../class/Mixin.js"

const performance : { now : () => number }  = globalThis.performance || Date

//---------------------------------------------------------------------------------------------------------------------
export type RunInfo<InfoT> = {
    cyclesCount         : number,

    averageCycleTime    : number
    sigma               : number

    log                 : number[]

    info                : InfoT
}


//---------------------------------------------------------------------------------------------------------------------
const average   = (array : number[]) : number => array.reduce((acc, current) => acc + current, 0) / array.length

const unbiasedSampleVariance  = (array : number[]) : number => {
    const mean      = average(array)
    const usv       = array.reduce((acc, current) => acc + (current - mean) * (current - mean), 0)

    return usv / (array.length - 1)
}


//---------------------------------------------------------------------------------------------------------------------
const fmt           = new Intl.NumberFormat([], { maximumFractionDigits : 3, useGrouping : false })

const format        = num => fmt.format(num)

//---------------------------------------------------------------------------------------------------------------------
export class Benchmark<StateT, InfoT> extends Base {
    name                : string    = 'Noname benchmark'

    plannedMaxTime          : number    = 5000
    plannedCalibrationTime  : number    = 500

    coolDownTimeout         : number    = 10


    setup () : StateT {
        return
    }


    cycle (iteration : number, cycle : number, state : StateT) {
    }


    gatherInfo (state : StateT) : InfoT {
        return
    }


    stringifyInfo (info : InfoT) : string {
        return
    }


    async run () : Promise<RunInfo<InfoT>> {
        const state : StateT  = this.setup()

        //------------------
        const start                 = performance.now()
        let cyclesCount : number    = 0
        let elapsed : number

        while ((elapsed = performance.now() - start) < this.plannedCalibrationTime) {
            this.cycle(0, cyclesCount++, state)
        }

        const iterationsCount       = Math.ceil(this.plannedMaxTime / elapsed)

        const times                 = []

        //------------------
        for (let i = 1; i <= iterationsCount; i++) {
            if (this.coolDownTimeout > 0) await new Promise(resolve => setTimeout(resolve, this.coolDownTimeout))

            const start     = performance.now()

            for (let c = 0; c < cyclesCount; c++) {
                this.cycle(i, c, state)
            }

            times.push(performance.now() - start)
        }

        console.log(times)

        return {
            log                     : times,
            cyclesCount             : cyclesCount,

            // cycleTime = iterationTime / cyclesCount
            averageCycleTime        : average(times) / cyclesCount,
            // D[c * X] = c^2 * D[X]
            sigma                   : Math.sqrt(unbiasedSampleVariance(times) / (cyclesCount * cyclesCount)),

            info                    : this.gatherInfo(state)
        }
    }


    async measure () {
        const runInfo       = await this.run()

        console.log(`${this.name} => ${format(runInfo.averageCycleTime)} ± ${format(2 * runInfo.sigma)}ms per cycle (95% confidence), cool down = ${this.coolDownTimeout}ms`)

        if (runInfo.info) console.log(this.stringifyInfo(runInfo.info))
    }
}

