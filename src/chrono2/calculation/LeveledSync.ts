import { LeveledQueue } from "../../util/LeveledQueue2.js"
import { getUniqable } from "../../util/Uniqable.js"
import { Atom, AtomState } from "../atom/Atom.js"
import { CalculationModeGen } from "../CalculationMode.js"
import { Effect, EffectHandler } from "../Effect.js"
import { Transaction } from "../graph/Transaction.js"

//---------------------------------------------------------------------------------------------------------------------
// The `Gen` and `Sync` files are separated intentionally, to be able to get
// their diff and synchronize changes if needed

//---------------------------------------------------------------------------------------------------------------------
export const calculateLowerStackLevelsSync = function (
    onEffect : EffectHandler<CalculationModeGen>, stack : LeveledQueue<Atom>, transaction : Transaction, atom : Atom
) {
    const uniqable          = getUniqable()

    while (stack.lowestLevelIndex < atom.level) {
        const levelIndex    = stack.lowestLevelIndex

        calculateAtomsQueueLevelSync(onEffect, uniqable, stack, transaction, stack.levels[ levelIndex ], levelIndex, false)

        stack.refreshLowestLevel()
    }
}


//---------------------------------------------------------------------------------------------------------------------
export const calculateAtomsQueueSync = function (
    onEffect : EffectHandler<CalculationModeGen>, stack : LeveledQueue<Atom>, transaction : Transaction, levelOverride : Atom[], levelOverrideIndex : number = -1
) {
    // globalContext.enterBatch()
    const uniqable          = getUniqable()

    while (!transaction || !transaction.rejectedWith) {
        const levelIndex    = stack.lowestLevelIndex

        if (levelOverrideIndex !== -1) {
            if (levelIndex < levelOverrideIndex) {
                calculateAtomsQueueLevelSync(onEffect, uniqable, stack, transaction, stack.levels[ levelIndex ], levelIndex, false)

                stack.refreshLowestLevel()
            } else if (levelIndex >= levelOverrideIndex) {
                calculateAtomsQueueLevelSync(onEffect, uniqable, stack, transaction, levelOverride, levelOverrideIndex, true)

                stack.refreshLowestLevel()

                if (levelOverride.length === 0) break
            }
        } else {
            calculateAtomsQueueLevelSync(onEffect, uniqable, stack, transaction, stack.levels[ levelIndex ], levelIndex, false)

            stack.refreshLowestLevel()

            if (stack.size === 0) break
        }
    }

    // globalContext.leaveBatch()
}


export const calculateAtomsQueueLevelSync = function (
    onEffect    : EffectHandler<CalculationModeGen>,
    uniqable    : number,
    stack       : LeveledQueue<Atom>,
    transaction : Transaction,
    level       : Atom[],
    levelIndex  : number,
    isOverride  : boolean
) {
    const graph                     = transaction.graph

    graph.enterBatch()

    let prevActiveAtom              = graph.activeAtom
    const startedAtLowestLevelIndex = stack.lowestLevelIndex
    const modifyStack               = !isOverride

    const enableProgressNotifications   = transaction ? transaction.graph.enableProgressNotifications : false
    let counter : number                = 0

    while (level.length && stack.lowestLevelIndex === startedAtLowestLevelIndex && (!transaction || !transaction.rejectedWith)) {
        if (false) {
            const now               = Date.now()
            const elapsed           = now - transaction.propagationStartDate

            if (elapsed > transaction.startProgressNotificationsAfterMs) {
                const lastProgressNotificationDate      = transaction.lastProgressNotificationDate

                if (!lastProgressNotificationDate || (now - lastProgressNotificationDate) > transaction.emitProgressNotificationsEveryMs) {
                    transaction.lastProgressNotificationDate   = now

                    transaction.graph.onPropagationProgressNotification({
                        total       : transaction.plannedTotalIdentifiersToCalculate,
                        remaining   : stack.size,
                        phase       : 'propagating'
                    })

                    // yield delay(0)
                }
            }
        }

        const atom          = level[ level.length - 1 ]
        const state         = atom.state

        if (state === AtomState.CheckingDeps) {
            atom.state      = AtomState.UpToDate
            level.pop()
            modifyStack && stack.size--
            continue
        }

        if (state === AtomState.UpToDate || atom.immutable.isTombstone || !atom.graph) {
            level.pop()
            modifyStack && stack.size--
            continue
        }

        if (state !== AtomState.Calculating && atom.shouldCheckDependencies()) {
            atom.state      = AtomState.CheckingDeps

            const incoming  = atom.immutable.getIncomingDeep()

            if (incoming) {
                for (let i = 0; i < incoming.length; i++) {
                    const dependencyAtom    = atom.graph.resolve(incoming[ i ].owner)

                    if (dependencyAtom.state !== AtomState.UpToDate) {
                        // TODO should take level into account
                        level.push(dependencyAtom)
                        modifyStack && stack.size++
                    }
                }

                // this looks a bit strange but it is exactly what we want:
                // 1. If there were none non-up-to-date deps - means the atom should be considered
                // up-to-date, and next cycle iteration will do that (switching from `CheckingDeps` to `UpToDate`)
                // 2. If there were some non-up-to-date deps - we continue to next iteration to actualize them
                continue
            }
        }

        graph.activeAtom    = atom

        let iterationResult : IteratorResult<any> = atom.isCalculationStarted() ? atom.iterationResult : atom.startCalculation(onEffect)

        while (iterationResult) {
            const value         = iterationResult.value

            if (iterationResult.done) {
                // there have been write to atom or its dependency
                if (atom.state !== AtomState.Calculating) {
                    // start over w/o stack modification
                    atom.resetCalculation(true)
                    break
                }

                atom.updateValue(value)

                level.pop()
                modifyStack && stack.size--
                break
            }
            else if (value instanceof Atom) {
                const requestedAtom     = atom.graph ? value.checkoutSelfFromActiveGraph(atom.graph) : value

                const requestedLevel = requestedAtom.level

                if (requestedLevel > atom.level) throw new Error("Atom can not read from the higher-level atom")

                if (requestedAtom.state === AtomState.UpToDate) {
                    iterationResult = atom.continueCalculation(requestedAtom.read(graph))
                } else {
                    requestedAtom.immutableForWrite().addOutgoing(atom.immutable, false)

                    // the requested atom is still checking dependencies - that probably means it has been requested
                    // by its dependency itself. Might be a cycle, or, perhaps, the graph layout has changed
                    // in any case, we just force the requested atom to start the calculation in the next loop iteration
                    if (requestedAtom.state === AtomState.CheckingDeps) {
                        requestedAtom.state = AtomState.Stale
                    }

                    if (requestedAtom.isCalculationStarted() && !requestedAtom.cyclicReadIsBlockedOnPromise()) {
                        atom.onCyclicReadDetected()

                        if (transaction && transaction.rejectedWith) break
                    } else {
                        // requestedAtom.uniqable2 = uniqable

                        if (requestedLevel === levelIndex) {
                            level.push(requestedAtom)
                            modifyStack && stack.size++
                        } else {
                            stack.in(requestedAtom)
                        }
                        break
                    }
                }
            }
            else if ((value instanceof Effect) && value.internal) {
                iterationResult             = atom.continueCalculation(onEffect(value))
            }
            else {
                const startedYieldAt        = atom.iterationNumber

                graph.activeAtom    = prevActiveAtom

                graph.leaveBatch()

                // bypass the unrecognized effect to the outer context
                const res                   = onEffect(value)

                graph.enterBatch()

                prevActiveAtom              = graph.activeAtom

                // TODO
                // possibly `iterationNumber` should be a global revision tracking counter
                // we increment it for any action, including calculation reset
                // then, this condition would mean "yes, we've yielded an effect
                // and the state of atom did not change during handler processing"
                // currently this equality does not take into account the possibility
                // that `startedYieldAt` is a value from previous calculation
                // UPDATE: should just use `revision` I guess
                // TODO: needs a test case
                if (atom.iterationNumber === startedYieldAt) {
                    graph.activeAtom    = atom

                    iterationResult             = atom.continueCalculation(res)
                } else {
                    // in such case we need to start over from the main loop
                    break
                }
            }
        }
    }

    graph.activeAtom    = prevActiveAtom

    graph.leaveBatch()
}
