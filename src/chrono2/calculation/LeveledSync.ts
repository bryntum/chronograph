import { LeveledQueue } from "../../util/LeveledQueue.js"
import { getUniqable } from "../../util/Uniqable.js"
import { Atom } from "../atom/Atom.js"
import { AtomState } from "../atom/Quark.js"
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
    const prevActiveAtom            = globalContext.activeAtom
    const startedAtLowestLevelIndex = stack.getLowestLevelIndex()
    const modifyStack               = !isOverride

    while (level.length && stack.lowestLevelIndex === startedAtLowestLevelIndex) {
        const atom          = level[ level.length - 1 ]

        if (atom.state === AtomState.UpToDate) {
            level.pop()
            stack.length--
            continue
        }

        globalContext.activeAtom    = atom

        let iterationResult : IteratorResult<any> = atom.isCalculationStarted() ? atom.iterationResult : atom.startCalculation(onEffect)

        while (iterationResult) {
            const value         = iterationResult.value

            if (atom.isCalculationCompleted()) {
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

                // bypass the unrecognized effect to the outer context
                const res                   = onEffect(value)

                // TODO
                // possibly `iterationNumber` should be a global revision tracking counter
                // we increment it for any action, including calculation reset
                // then, this condition would mean "yes, we've yielded an effect
                // and the state of atom did not change during handler processing"
                // currently this equality does not take into account the possibility
                // that `startedYieldAt` is a value from previous calculation
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
