import { Base } from "../class/Base.js"

const performance : { now : () => number }  = globalThis.performance || Date

//---------------------------------------------------------------------------------------------------------------------
export type RunInfo<InfoT> = {
    samples             : number[]

    cyclesCount         : number,

    deviation           : number
    averageCycleTime    : number
    marginOfError       : number
    relativeMoe         : number

    info                : InfoT
}


//---------------------------------------------------------------------------------------------------------------------
const average   = (samples : number[]) : number => samples.reduce((acc, current) => acc + current, 0) / samples.length

const unbiasedSampleVariance  = (samples : number[]) : number => {
    const mean      = average(samples)
    const usv       = samples.reduce((acc, current) => acc + (current - mean) * (current - mean), 0)

    return usv / (samples.length - 1)
}


//---------------------------------------------------------------------------------------------------------------------
/*
 * T-Distribution two-tailed critical values for 95% confidence
 * http://www.itl.nist.gov/div898/handbook/eda/section3/eda3672.htm
 */
const studentDist95 : Map<number, number> = new Map([
    [ 1, 12.706 ], [ 2, 4.303 ], [ 3, 3.182 ], [ 4, 2.776 ], [ 5, 2.571 ], [ 6, 2.447 ],
    [ 7, 2.365 ], [ 8, 2.306 ], [ 9, 2.262 ], [ 10, 2.228 ], [ 11, 2.201 ], [ 12, 2.179 ],
    [ 13, 2.16 ], [ 14, 2.145 ], [ 15, 2.131 ], [ 16, 2.12 ], [ 17, 2.11 ], [ 18, 2.101 ],
    [ 19, 2.093 ], [ 20, 2.086 ], [ 21, 2.08 ], [ 22, 2.074 ], [ 23, 2.069 ], [ 24, 2.064 ],
    [ 25, 2.06 ], [ 26, 2.056 ], [ 27, 2.052 ], [ 28, 2.048 ], [ 29, 2.045 ], [ 30, 2.042 ],
    [ Infinity, 1.96 ]
])

const getStudentCriticalValue = (size : number) : number => size <= 30 ? studentDist95.get(size) : studentDist95.get(Infinity)

// const maxRelErrDist95 : Map<number, number> = new Map([
//     [ 3, 1.41 ], [ 4, 1.69 ], [ 5, 1.87 ], [ 6, 2.00 ],
//     [ 7, 2.09 ], [ 8, 2.17 ], [ 9, 2.24 ], [ 10, 2.29 ],
//     [ 11, 2.34 ], [ 12, 2.39 ], [ 13, 2.43 ], [ 14, 2.46 ],
//     [ 15, 2.49 ], [ 16, 2.52 ], [ 17, 2.55 ], [ 18, 2.58 ],
//     [ 19, 2.60 ], [ 20, 2.62 ], [ 21, 2.64 ], [ 22, 2.66 ],
//     [ 23, 2.68 ], [ 24, 2.70 ], [ 25, 2.72 ],
//     [ Infinity, 2.72 ]
// ])


//---------------------------------------------------------------------------------------------------------------------
const fmt           = new Intl.NumberFormat([], { maximumFractionDigits : 3, useGrouping : false })

const format        = num => fmt.format(num)

//---------------------------------------------------------------------------------------------------------------------
export class Benchmark<StateT, InfoT = any> extends Base {
    name                    : string    = 'Noname benchmark'

    // planned relative margin of error
    plannedRelMoe           : number    = 0.05

    plannedMinTime          : number    = 3000
    plannedMaxTime          : number    = 7000
    plannedCalibrationTime  : number    = 500

    coolDownTimeout         : number    = 10

    // filterExceptionValues   : boolean   = false


    async setup () : Promise<StateT> {
        return
    }


    async tearDown (state : StateT) {
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


    async calibrate (plannedCalibrationTime : number, state : StateT) : Promise<{ cyclesCount : number, elapsed : number }> {
        let cyclesCount : number    = 0
        let elapsed : number

        const start                 = performance.now()

        const isAsync               = this.cycle.constructor.name === 'AsyncFunction'

        while ((elapsed = performance.now() - start) < plannedCalibrationTime) {
            if (isAsync) {
                await this.cycle(0, cyclesCount++, state)
            }
            else {
                this.cycle(0, cyclesCount++, state)
            }
        }

        return { cyclesCount, elapsed }
    }


    getRunInfo (samples : number[], cyclesCount : number, state : StateT) : RunInfo<InfoT> {
        // note, that in the `samples` we have samples for iterations time, not cycles
        // cycleTime = iterationTime / cyclesCount
        const averageCycleTime      = average(samples) / cyclesCount

        // D[c * X] = c^2 * D[X]
        const deviation             = Math.sqrt(unbiasedSampleVariance(samples) / (cyclesCount * cyclesCount))

        const marginOfError         = deviation / Math.sqrt(samples.length) * getStudentCriticalValue(samples.length)

        return {
            samples,
            cyclesCount,
            averageCycleTime,
            deviation,
            marginOfError,
            relativeMoe             : marginOfError / averageCycleTime,
            info                    : this.gatherInfo(state)
        }
    }


    getRelativeMoe (samples : number[], cyclesCount : number) : number {
        if (samples.length <= 1) return Infinity

        const averageCycleTime      = average(samples) / cyclesCount
        const deviation             = Math.sqrt(unbiasedSampleVariance(samples) / (cyclesCount * cyclesCount))

        return deviation / Math.sqrt(samples.length) * getStudentCriticalValue(samples.length) / averageCycleTime
    }


    async runTillMaxTime (maxTime : number = this.plannedMaxTime) : Promise<RunInfo<InfoT>> {
        const state : StateT  = await this.setup()

        const { cyclesCount } = await this.calibrate(this.plannedCalibrationTime, state)

        return this.runWhile(true, state, cyclesCount, (samples, i, elapsed) => i < 2 || elapsed < maxTime)
    }


    async runTillRelativeMoe (relMoe : number = this.plannedRelMoe) : Promise<RunInfo<InfoT>> {
        const state : StateT  = await this.setup()

        const { cyclesCount } = await this.calibrate(this.plannedCalibrationTime, state)

        return this.runWhile(
            true, state, cyclesCount,
            (samples, i, elapsed) => this.getRelativeMoe(samples, cyclesCount) > relMoe || elapsed < this.plannedMinTime
        )
    }


    async runFixed (cyclesCount : number, iterationsCount : number) : Promise<RunInfo<InfoT>> {
        const state : StateT  = await this.setup()

        return this.runWhile(false, state, cyclesCount, (samples, i, elapsed) => i < iterationsCount)
    }


    async runWhile (calibrationDone : boolean, state : StateT, cyclesCount : number, condition : (samples : number[], iteration : number, elapsed : number) => boolean) : Promise<RunInfo<InfoT>> {
        // console.profile(this.name)

        const samples               = []

        let globalStart             = performance.now()

        let i                       = calibrationDone ? 1 : 0

        const isAsync               = this.cycle.constructor.name === 'AsyncFunction'

        while (condition(samples, i, performance.now() - globalStart)) {
            if (this.coolDownTimeout > 0) await new Promise(resolve => setTimeout(resolve, this.coolDownTimeout))

            const start     = performance.now()

            for (let c = 0; c < cyclesCount; c++) {
                if (isAsync) {
                    await this.cycle(i, c, state)
                } else {
                    this.cycle(i, c, state)
                }
            }

            samples.push(performance.now() - start)

            i++
        }

        // console.profileEnd(this.name)
        //globalThis.BENCH_STATE = state

        const result    = this.getRunInfo(samples, cyclesCount, state)

        await this.tearDown(state)

        return result
    }


    report (runInfo : RunInfo<InfoT>) {
        // console.log(`${this.name} => ${format(runInfo.averageCycleTime)} ± ${format(runInfo.marginOfError)}ms per cycle (95% confidence), cool down = ${this.coolDownTimeout}ms`)
        //
        // if (runInfo.info) console.log(this.stringifyInfo(runInfo.info))

        console.log(`${this.name}: ${format(runInfo.averageCycleTime)}ms ±${format(runInfo.marginOfError)}`)
    }


    async clearGarbage () {
        if (globalThis.gc) {
            globalThis.gc()
            await new Promise(resolve => setTimeout(resolve, 50))
            globalThis.gc()
            await new Promise(resolve => setTimeout(resolve, 100))
            globalThis.gc()
            await new Promise(resolve => setTimeout(resolve, 50))
        }
    }


    async measureTillRelativeMoe () : Promise<RunInfo<InfoT>> {
        this.clearGarbage()

        const runInfo       = await this.runTillRelativeMoe()

        this.report(runInfo)

        return runInfo
    }


    async measureFixed (cyclesCount : number, iterationsCount : number) : Promise<RunInfo<InfoT>> {
        this.clearGarbage()

        const runInfo       = await this.runFixed(cyclesCount, iterationsCount)

        this.report(runInfo)

        return runInfo
    }


    async measureTillMaxTime () : Promise<RunInfo<InfoT>> {
        this.clearGarbage()

        const runInfo       = await this.runTillMaxTime()

        this.report(runInfo)

        return runInfo
    }
}

export const BenchmarkC = <StateT, InfoT = any>(config : Partial<Benchmark<StateT, InfoT>>) : Benchmark<StateT, InfoT> =>
    Benchmark.new(config) as Benchmark<StateT, InfoT>
