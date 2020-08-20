import { LeveledQueue } from "../../util/LeveledQueue.js"
import { getUniqable } from "../../util/Uniqable.js"
import { Atom, AtomState } from "../atom/Atom.js"
import { CalculationModeGen } from "../CalculationMode.js"
import { Effect, EffectHandler } from "../Effect.js"
import { globalContext } from "../GlobalContext.js"

//---------------------------------------------------------------------------------------------------------------------
// The `Gen` and `Sync` files are separated intentionally, to be able to get
// their diff and synchronize changes if needed


//---------------------------------------------------------------------------------------------------------------------
export const calculateAtomsQueueSync = function (
    onEffect : EffectHandler<CalculationModeGen>, stack : LeveledQueue<Atom>, levelOverride : Atom[], levelOverrideIndex : number = -1
) {
    const uniqable          = getUniqable()

    while (stack.length) {
        const levelIndex      = stack.getLowestLevelIndex()
        // stop the loop if we've been given a "level override" and we've calculated beyond it
        if (levelOverrideIndex !== -1 && levelIndex > levelOverrideIndex) break

        const level           = levelOverrideIndex === levelIndex ? levelOverride : stack.levels[ levelIndex ]

        calculateAtomsQueueLevelSync(onEffect, uniqable, stack, level, levelIndex, levelOverrideIndex !== -1)
    }
}


export const calculateAtomsQueueLevelSync = function (
    onEffect    : EffectHandler<CalculationModeGen>,
    uniqable    : number,
    stack       : LeveledQueue<Atom>,
    level       : Atom[],
    levelIndex  : number,
    isOverride  : boolean
) {
    let prevActiveAtom              = globalContext.activeAtom
    const startedAtLowestLevelIndex = stack.getLowestLevelIndex()
    const modifyStack               = !isOverride

    while (level.length && stack.lowestLevelIndex === startedAtLowestLevelIndex) {
        const atom          = level[ level.length - 1 ]
        const state         = atom.state

        if (state === AtomState.CheckingDeps) {
            atom.state      = AtomState.UpToDate
            level.pop()
            modifyStack && stack.length--
            continue
        }

        if (state === AtomState.UpToDate) {
            level.pop()
            modifyStack && stack.length--
            continue
        }

        if (atom.shouldCheckDependencies()) {
            atom.state      = AtomState.CheckingDeps

            const incoming  = atom.immutable.getIncomingDeep()

            if (incoming) {
                for (let i = 0; i < incoming.length; i++) {
                    const dependencyAtom    = incoming[ i ].owner

                    if (dependencyAtom.state !== AtomState.UpToDate) {
                        // TODO should take level into account
                        level.push(dependencyAtom)
                        modifyStack && stack.length++
                    }
                }

                // this looks a bit strange but it is exactly what we want:
                // 1. If there were none non-up-to-date deps - means the atom should be considered
                // up-to-date, and next cycle iteration will do that (switching from `CheckingDeps` to `UpToDate`)
                // 2. If there were some non-up-to-date deps - we continue to next iteration to actualize them
                continue
            }
        }

        globalContext.activeAtom    = atom

        let iterationResult : IteratorResult<any> = atom.isCalculationStarted() ? atom.iterationResult : atom.startCalculation(onEffect)

        while (iterationResult) {
            const value         = iterationResult.value

            if (iterationResult.done) {
                // there have been write to atom or its dependency
                if (atom.state !== AtomState.Calculating) {
                    // start over w/o stack modification
                    atom.resetCalculation()
                    break
                }

                atom.updateValue(value)

                level.pop()
                modifyStack && stack.length--
                break
            }
            else if (value instanceof Atom) {
                const requestedLevel = value.level

                if (requestedLevel > atom.level) throw new Error("Atom can not read from the higher-level atom")

                if (value.state === AtomState.UpToDate) {
                    iterationResult = atom.continueCalculation(value.read())
                } else {
                    if (value.uniqable2 === uniqable) {
                        throw new Error('cycle')
                    } else {
                        value.uniqable2 = uniqable

                        if (requestedLevel === levelIndex) {
                            level.push(value)
                            modifyStack && stack.length++
                        } else {
                            stack.push(value)
                        }
                        break
                    }

                    // // TODO
                    // // @ts-ignore
                    // if (!value.isCalculationStarted()) {
                    //     // TODO
                    //     // @ts-ignore
                    //     stack.push(value)
                    //     break
                    // } else {
                    //     throw new Error('cycle')
                    // }
                }
            }
            else if (value instanceof Effect) {

            }
            else {
                const startedYieldAt        = atom.iterationNumber

                globalContext.activeAtom    = prevActiveAtom

                // bypass the unrecognized effect to the outer context
                const res                   = onEffect(value)

                prevActiveAtom              = globalContext.activeAtom

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
                    globalContext.activeAtom    = atom

                    iterationResult             = atom.continueCalculation(res)
                } else {
                    // in such case we need to start over from the main loop
                    break
                }
            }
        }
    }

    globalContext.activeAtom    = prevActiveAtom
}
