import { OnCycleAction, WalkContext, WalkStep } from "../graph/Walkable.js"
import { isAtomicValue, typeOf } from "./Helper.js"


export const IsElement = Symbol('IsElement')


//---------------------------------------------------------------------------------------------------------------------
export class WalkJsonContext extends WalkContext<any, string | symbol> {

    onCycle (node : any, stack : WalkStep<any, string | symbol>[]) : OnCycleAction {
        return OnCycleAction.Resume
    }


    forEachNext (node : any, func : (label : string | symbol, node : any) => any) {

        if (isAtomicValue(node)) {

        } else {
            const type      = typeOf(node)

            if (type === 'Object') {
                for (let property in node)
                    if (node.hasOwnProperty(property)) func(property, node[ property ])
            }
            else if (type === 'Map') {
                node.forEach((value, key) => func(key, value))
            }
            else if (type === 'Set') {
                node.forEach(value => func(IsElement, value))
            }
            else if (type === 'Array') {
                for (let i = 0; i < node.length; i++) func(String(i), node[ i ])
            }
            else if (type === 'RegExp') {

            }
            else if (type === 'Date') {

            }
            else if (type === 'Set') {

            }
        }
    }
}

export type CompareObjectsArguments = {

}

export const compareObjects = (obj1, obj2, args? : CompareObjectsArguments) : boolean => {

}
