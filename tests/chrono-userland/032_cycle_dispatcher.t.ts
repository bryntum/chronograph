import { ProposedOrCurrent } from "../../src/chrono/Effect.js"
import { ChronoGraph, MinimalChronoGraph } from "../../src/chrono/Graph.js"
import { CalculatedValueGen, CalculatedValueSync, Identifier, Variable } from "../../src/chrono/Identifier.js"
import { Quark } from "../../src/chrono/Quark.js"
import { SyncEffectHandler, Transaction } from "../../src/chrono/Transaction.js"
import { CalculationIterator, CalculationSync } from "../../src/primitives/Calculation.js"
import { defineProperty } from "../../src/util/Helpers.js"

declare const StartTest : any

type DispatcherValue        = Map<FieldType, CalculationInstruction>


const isNotNumber = (value : any) => Number(value) !== value

const dispatcherValueEq     = (v1 : DispatcherValue, v2 : DispatcherValue) : boolean => {
    return v1.get(FieldType.Start) === v2.get(FieldType.Start)
        && v1.get(FieldType.End) === v2.get(FieldType.End)
        && v1.get(FieldType.Duration) === v2.get(FieldType.Duration)
}

enum CalculationInstruction {
    CalculateWithProposedOrCurrentValue     = 'CalculateWithProposedOrCurrentValue',
    CalculateWithoutProposedOrCurrentValue  = 'CalculateWithoutProposedOrCurrentValue'
}

enum FieldType {
    Start   = 'Start',
    End     = 'End',
    Duration = 'Duration'
}

enum Instruction {
    KeepDuration    = 'KeepDuration',
    KeepStart       = 'KeepStart',
    KeepEnd         = 'KeepEnd'
}

enum Direction {
    Forward         = 'Forward',
    Backward        = 'Backward'
}

type DispatcherLogEntry = {
    fieldType           : FieldType

    hasProposedValue    : boolean,
    hasPreviousValue    : boolean,

    instruction         : Instruction
}


class DispatcherIdentifier extends CalculatedValueSync {
    ValueT      : DispatcherValue

    quarkClass  : typeof DispatcherQuark  = DispatcherQuark


    equality (v1 : DispatcherValue, v2 : DispatcherValue) : boolean {
        return dispatcherValueEq(v1, v2)
    }


    calculation (YIELD : SyncEffectHandler) : DispatcherValue {
        return YIELD(ProposedOrCurrent)
    }


    log (transaction : Transaction, entry : DispatcherLogEntry) {
        const quark         = transaction.acquireQuark(this)

        quark.logEntries.set(entry.fieldType, entry)
    }
}


class DispatcherQuark extends Quark(CalculationSync(Set)) {
    logEntries          : Map<FieldType, DispatcherLogEntry>   = new Map()


    set proposedValue (value) {
    }


    get proposedValue () : DispatcherValue {
        const logEntries    = this.logEntries

        const startEntry    = logEntries.get(FieldType.Start)
        const endEntry      = logEntries.get(FieldType.End)
        const durationEntry = logEntries.get(FieldType.Duration)

        let startInstruction : CalculationInstruction   = CalculationInstruction.CalculateWithoutProposedOrCurrentValue
        let endInstruction : CalculationInstruction     = CalculationInstruction.CalculateWithoutProposedOrCurrentValue
        let durationInstruction : CalculationInstruction = CalculationInstruction.CalculateWithoutProposedOrCurrentValue

        if (startEntry) {
            if (startEntry.hasProposedValue) startInstruction = CalculationInstruction.CalculateWithProposedOrCurrentValue
            if (startEntry.instruction === Instruction.KeepDuration)
                durationInstruction = CalculationInstruction.CalculateWithProposedOrCurrentValue
            else if (startEntry.instruction === Instruction.KeepEnd)
                endInstruction      = CalculationInstruction.CalculateWithProposedOrCurrentValue
        }

        if (endEntry) {
            if (endEntry.hasProposedValue) endInstruction = CalculationInstruction.CalculateWithProposedOrCurrentValue
            if (endEntry.instruction === Instruction.KeepDuration)
                durationInstruction = CalculationInstruction.CalculateWithProposedOrCurrentValue
            else if (endEntry.instruction === Instruction.KeepStart)
                startInstruction    = CalculationInstruction.CalculateWithProposedOrCurrentValue
        }

        if (durationEntry) {
            if (durationEntry.hasProposedValue) durationInstruction = CalculationInstruction.CalculateWithProposedOrCurrentValue
            if (durationEntry.instruction === Instruction.KeepStart)
                startInstruction    = CalculationInstruction.CalculateWithProposedOrCurrentValue
            else if (durationEntry.instruction === Instruction.KeepEnd)
                endInstruction      = CalculationInstruction.CalculateWithProposedOrCurrentValue
        }

        return defineProperty(this, 'proposedValue', new Map([
            [ FieldType.Start, startInstruction ],
            [ FieldType.End, endInstruction ],
            [ FieldType.Duration, durationInstruction ]
        ]))
    }
}


StartTest(t => {
    let graph           : ChronoGraph

    let preDispatcher   : DispatcherIdentifier
    let postDispatcher  : Identifier

    let start           : Identifier
    let end             : Identifier
    let duration        : Identifier

    let direction       : Variable

    const read = () => [ graph.read(start), graph.read(end), graph.read(duration) ]

    t.beforeEach(t => {
        graph               = MinimalChronoGraph.new()

        direction           = graph.addIdentifier(Variable.new({
            name    : 'direction'
        }), Direction.Forward)


        preDispatcher          = graph.addIdentifier(DispatcherIdentifier.new({
            name    : 'preDispatcher'
        }))

        postDispatcher = graph.addIdentifier(CalculatedValueGen.new({
            name    : 'postDispatcher',

            equality : dispatcherValueEq,

            * calculation (YIELD : SyncEffectHandler) : CalculationIterator<DispatcherValue> {
                const preDispatch : DispatcherValue     = yield preDispatcher
                const directionValue : Direction        = yield direction

                const postDispatch                      = new Map(preDispatch)

                let withProposedCounter : number        = 0

                if (preDispatch.get(FieldType.Start) === CalculationInstruction.CalculateWithProposedOrCurrentValue) withProposedCounter++
                if (preDispatch.get(FieldType.End) === CalculationInstruction.CalculateWithProposedOrCurrentValue) withProposedCounter++
                if (preDispatch.get(FieldType.Duration) === CalculationInstruction.CalculateWithProposedOrCurrentValue) withProposedCounter++

                if (withProposedCounter === 3) {
                    if (directionValue === Direction.Forward)
                        postDispatch.set(FieldType.End, CalculationInstruction.CalculateWithoutProposedOrCurrentValue)
                    else
                        postDispatch.set(FieldType.Start, CalculationInstruction.CalculateWithoutProposedOrCurrentValue)
                }
                else if (withProposedCounter <= 1) {
                    postDispatch.set(FieldType.Start, CalculationInstruction.CalculateWithProposedOrCurrentValue)
                    postDispatch.set(FieldType.End, CalculationInstruction.CalculateWithProposedOrCurrentValue)
                    postDispatch.set(FieldType.Duration, CalculationInstruction.CalculateWithProposedOrCurrentValue)
                }

                return postDispatch
            }
        }))

        start               = graph.addIdentifier(CalculatedValueGen.new({
            name    : 'start',
            * calculation (YIELD : SyncEffectHandler) : CalculationIterator<number> {
                const dispatch : DispatcherValue = yield postDispatcher

                const instruction : CalculationInstruction = dispatch.get(FieldType.Start)

                // possible several ways to calculate
                if (instruction === CalculationInstruction.CalculateWithoutProposedOrCurrentValue) {
                    // this branch does not use "proposed" value, instead, it calculates the value,
                    // based solely on other atoms values
                    const endValue : number         = yield end
                    const durationValue : number    = yield duration

                    if (isNotNumber(endValue) || isNotNumber(durationValue)) return null

                    return endValue - durationValue
                }
                else if (instruction === CalculationInstruction.CalculateWithProposedOrCurrentValue) {
                    // this branch should "adopt" the "proposed" value, possibly validating it
                    // based on other atoms values
                    // this branch indicates user has provided some input for this atom, so one need to
                    // take that into account
                    const proposed : number = yield ProposedOrCurrent

                    // some validation here

                    return proposed
                }
            },

            write (transaction : Transaction, proposedValue : any, keepDuration : boolean) {
                CalculatedValueGen.prototype.write.call(this, transaction, proposedValue)

                preDispatcher.log(transaction, {
                    fieldType               : FieldType.Start,
                    hasProposedValue        : true,
                    hasPreviousValue        : graph.hasIdentifier(start),
                    instruction             : keepDuration !== undefined ? (keepDuration ? Instruction.KeepDuration : Instruction.KeepEnd) : null
                })
            }
        }))

        end             = graph.addIdentifier(CalculatedValueGen.new({
            name    : 'end',
            * calculation (YIELD : SyncEffectHandler) : CalculationIterator<number> {
                const dispatch : DispatcherValue = yield postDispatcher

                const instruction : CalculationInstruction = dispatch.get(FieldType.End)

                if (instruction === CalculationInstruction.CalculateWithoutProposedOrCurrentValue) {
                    const startValue : number       = yield start
                    const durationValue : number    = yield duration

                    if (isNotNumber(startValue) || isNotNumber(durationValue)) return null

                    return startValue + durationValue
                }
                else if (instruction === CalculationInstruction.CalculateWithProposedOrCurrentValue) {
                    return yield ProposedOrCurrent
                }
            },

            write (transaction : Transaction, proposedValue : any, keepDuration : boolean) {
                CalculatedValueGen.prototype.write.call(this, graph, proposedValue)

                preDispatcher.log(transaction, {
                    fieldType               : FieldType.End,
                    hasProposedValue        : true,
                    hasPreviousValue        : graph.hasIdentifier(end),
                    instruction             : keepDuration !== undefined ? (keepDuration ? Instruction.KeepDuration : Instruction.KeepStart) : null
                })
            }
        }))

        duration        = graph.addIdentifier(CalculatedValueGen.new({
            name    : 'duration',
            * calculation (YIELD : SyncEffectHandler) : CalculationIterator<number> {
                const dispatch : DispatcherValue = yield postDispatcher

                const instruction : CalculationInstruction = dispatch.get(FieldType.Duration)

                if (instruction === CalculationInstruction.CalculateWithoutProposedOrCurrentValue) {
                    const startValue : number       = yield start
                    const endValue : number         = yield end

                    if (isNotNumber(startValue) || isNotNumber(endValue)) return null

                    return endValue - startValue
                }
                else if (instruction === CalculationInstruction.CalculateWithProposedOrCurrentValue) {
                    return yield ProposedOrCurrent
                }
            },

            write (transaction : Transaction, proposedValue : any, keepStart : boolean) {
                CalculatedValueGen.prototype.write.call(this, graph, proposedValue)

                preDispatcher.log(transaction, {
                    fieldType               : FieldType.Duration,
                    hasProposedValue        : true,
                    hasPreviousValue        : graph.hasIdentifier(duration),
                    instruction             : keepStart !== undefined ? (keepStart ? Instruction.KeepStart : Instruction.KeepEnd) : null
                })
            }
        }))
    })


    t.it('Should keep all-null state', async t => {
        graph.propagate()

        t.isDeeply(read(), [ null, null, null ], 'Initial propagation is ok')
    })


    t.it('Should keep partial data - start', async t => {
        graph.write(start, 10)

        graph.propagate()

        t.isDeeply(read(), [ 10, null, null ], 'Initial propagation is ok')
    })


    t.it('Should keep partial data - end', async t => {
        graph.write(end, 10)

        graph.propagate()

        t.isDeeply(read(), [ null, 10, null ], 'Initial propagation is ok')
    })


    t.it('Should keep partial data - duration', async t => {
        graph.write(duration, 10)

        graph.propagate()

        t.isDeeply(read(), [ null, null, 10 ], 'Initial propagation is ok')
    })


    t.it('Should normalize end date', async t => {
        graph.write(start, 10)
        graph.write(duration, 5)

        graph.propagate()

        t.isDeeply(read(), [ 10, 15, 5 ], 'Initial propagation is ok')
    })


    t.it('Should normalize duration', async t => {
        graph.write(start, 10)
        graph.write(end, 15)

        graph.propagate()

        t.isDeeply(read(), [ 10, 15, 5 ], 'Initial propagation is ok')
    })


    t.it('Should normalize start', async t => {
        graph.write(end, 15)
        graph.write(duration, 5)

        graph.propagate()

        t.isDeeply(read(), [ 10, 15, 5 ], 'Initial propagation is ok')
    })


    t.it('Should normalize end date by default', async t => {
        graph.write(start, 10)
        graph.write(end, 18)
        graph.write(duration, 5)

        graph.propagate()

        t.isDeeply(read(), [ 10, 15, 5 ], 'Initial propagation is ok')
    })


    t.it('Should rebuild edges dynamically', async t => {
        graph.write(start, 10)
        graph.write(duration, 5)

        graph.propagate()

        t.isDeeply(read(), [ 10, 15, 5 ], 'Initial propagation is ok')

        //-----------------------
        graph.write(duration, 1, false)

        graph.propagate()

        t.isDeeply(read(), [ 14, 15, 1 ], 'Edges rebuilt correctly')

        //-----------------------
        graph.write(duration, 3, true)

        graph.propagate()

        t.isDeeply(read(), [ 14, 17, 3 ], 'Edges rebuilt correctly')

        //-----------------------
        graph.write(start, 5, true)

        graph.propagate()

        t.isDeeply(read(), [ 5, 8, 3 ], 'Edges rebuilt correctly')
    })
})
