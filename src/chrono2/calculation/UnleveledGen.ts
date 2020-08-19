import { getUniqable } from "../../util/Uniqable.js"
import { Atom, AtomState } from "../atom/Atom.js"
import { CalculationModeGen } from "../CalculationMode.js"
import { Effect, EffectHandler } from "../Effect.js"
import { globalContext } from "../GlobalContext.js"

//---------------------------------------------------------------------------------------------------------------------
// The `Gen` and `Sync` files are separated intentionally, to be able to get
// their diff and synchronize changes if needed


//---------------------------------------------------------------------------------------------------------------------
export const calculateAtomsGen = function* (
    onEffect : EffectHandler<CalculationModeGen>, level : Atom[]
) {
    const uniqable                  = getUniqable()
    const prevActiveAtom            = globalContext.activeAtom

    while (level.length) {
        const atom          = level[ level.length - 1 ]

        if (atom.state === AtomState.UpToDate) {
            level.pop()
            continue
        }

        globalContext.activeAtom    = atom

        let iterationResult : IteratorResult<any> = atom.isCalculationStarted() ? atom.iterationResult : atom.startCalculation(onEffect)

        while (iterationResult) {
            const value         = iterationResult.value

            if (iterationResult.done) {
                atom.updateValue(value)

                level.pop()
                break
            }
            else if (value instanceof Atom) {
                if (value.state === AtomState.UpToDate) {
                    iterationResult = atom.continueCalculation(value.read())
                } else {
                    if (value.uniqable2 === uniqable) {
                        throw new Error('cycle')
                    } else {
                        value.uniqable2 = uniqable

                        level.push(value)
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
                const res                   = yield value

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
