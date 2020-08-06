import { Base } from "../class/Base.js"
import { getUniqable } from "../util/Uniqable.js"
import { Atom } from "./atom/Atom.js"
import { AtomState } from "./atom/Quark.js"
import { Box } from "./data/Box.js"
import { CalculableBox } from "./data/CalculableBox.js"
import { CalculableBoxGen } from "./data/CalculableBoxGen.js"

//---------------------------------------------------------------------------------------------------------------------
export class GlobalContext extends Base {

    activeAtom          : Atom              = undefined

    // effectHandler       : EffectHandler<CalculationMode>    = undefined


    // initialize () {
    //     super.initialize(...arguments)
    //
    //     this.effectHandler = () => {
    //     }
    // }


    calculateAtoms (eff, stack : CalculableBox<unknown>[]) {
        const prevActiveAtom    = globalContext.activeAtom

        while (stack.length) {
            const atom          = stack[ stack.length - 1 ]

            if (atom.state === AtomState.UpToDate) {
                stack.pop()
                continue
            }

            globalContext.activeAtom    = atom

            let iterationResult : IteratorResult<any> = atom.isCalculationStarted() ? atom.iterationResult : atom.startCalculation(eff)

            while (iterationResult) {
                const value         = iterationResult.value

                // TODO: `if (iterationResult.done)` ??
                if (atom.isCalculationCompleted()) {
                    atom.updateValue(value)

                    stack.pop()
                    break
                }
                else if (value instanceof Box) {
                    if (value.state === AtomState.UpToDate) {
                        iterationResult = atom.continueCalculation(value.read())
                    } else {
                        // TODO
                        // @ts-ignore
                        if (!value.isCalculationStarted()) {
                            // TODO
                            // @ts-ignore
                            stack.push(value)
                            break
                        } else {
                            throw new Error('cycle')
                        }
                    }

                }
                // else if (value === SynchronousCalculationStarted) {
                //     // the fact, that we've encountered `SynchronousCalculationStarted` constant can mean 2 things:
                //     // 1) there's a cycle during synchronous computation (we throw exception in `read` method)
                //     // 2) some other computation is reading synchronous computation, that has already started
                //     //    in such case its safe to just unwind the stack
                //
                //     stack.pop()
                //     break
                // }
                else {
                    // bypass the unrecognized effect to the outer context
                    const effectResult      = eff(value)

                    if (effectResult instanceof Promise)
                        throw new Error("Effect resolved to promise in the synchronous context")

                    // // the calculation can be interrupted (`cleanupCalculation`) as a result of the effect (WriteEffect)
                    // // in such case we can not continue calculation and just exit the inner loop
                    // if (effectResult === BreakCurrentStackExecution) break

                    iterationResult         = atom.continueCalculation(effectResult)
                }
            }
        }

        globalContext.activeAtom    = prevActiveAtom
    }


    async calculateAtomsAsync (eff, stack : CalculableBox<unknown>[]) {
        const prevActiveAtom    = globalContext.activeAtom

        const uniqable          = getUniqable()

        while (stack.length) {
            const atom          = stack[ stack.length - 1 ]

            if (atom.state === AtomState.UpToDate) {
                stack.pop()
                continue
            }

            globalContext.activeAtom    = atom

            let iterationResult : IteratorResult<any> = atom.isCalculationStarted() ? atom.iterationResult : atom.startCalculation(eff)

            while (iterationResult) {
                const value         = iterationResult.value

                if (atom.isCalculationCompleted()) {
                    atom.updateValue(value)

                    stack.pop()
                    break
                }
                else if (value instanceof Box) {
                    if (value.state === AtomState.UpToDate) {
                        iterationResult = atom.continueCalculation(value.read())
                    } else {
                        if (value.uniqable2 === uniqable) {
                            throw new Error('cycle')
                        } else {
                            value.uniqable2 = uniqable

                            // TODO
                            // @ts-ignore
                            stack.push(value)
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
                else if (value instanceof Promise) {
                    // TODO
                    const boxGen : CalculableBoxGen<unknown> = atom as any

                    const startedAwaitAt        = boxGen.iterationNumber

                    const res                   = await value

                    // during the `await` the atom may advance the calculation in some other flows
                    if (boxGen.iterationNumber === startedAwaitAt) {
                        globalContext.activeAtom    = atom

                        iterationResult             = atom.continueCalculation(res)
                    } else {
                        // in such case we need to start over from the main loop
                        break
                    }
                }
                // else if (value === SynchronousCalculationStarted) {
                //     // the fact, that we've encountered `SynchronousCalculationStarted` constant can mean 2 things:
                //     // 1) there's a cycle during synchronous computation (we throw exception in `read` method)
                //     // 2) some other computation is reading synchronous computation, that has already started
                //     //    in such case its safe to just unwind the stack
                //
                //     stack.pop()
                //     break
                // }
                else {
                    // bypass the unrecognized effect to the outer context
                    const effectResult      = eff(value)

                    // if (effectResult instanceof Promise)
                    //     throw new Error("Effect resolved to promise in the synchronous context")

                    // // the calculation can be interrupted (`cleanupCalculation`) as a result of the effect (WriteEffect)
                    // // in such case we can not continue calculation and just exit the inner loop
                    // if (effectResult === BreakCurrentStackExecution) break

                    iterationResult         = atom.continueCalculation(effectResult)
                }
            }
        }

        globalContext.activeAtom    = prevActiveAtom
    }
}

export const globalContext = GlobalContext.new()
