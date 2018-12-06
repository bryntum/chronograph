import {Base, Constructable, Mixin} from "../class/Mixin.js";
import {Atom, Readable, Writable} from "./Atom.js";


//---------------------------------------------------------------------------------------------------------------------
export type Input<V>            =  { [s : string] : V } | V[]
export type Output<V>           =  V[]


/*

All we need from Input type is basically `map` function, so it can be a functor over any type

This should allow arbitrary JSON graph as input

*/


export type InputReference<V>   = () => Input<V>
export type OutputReference<V>  = () => Output<V>


//---------------------------------------------------------------------------------------------------------------------
export const MutationData = <T extends Constructable<Base>>(base : T) =>

class MutationData extends base {
    input           : Input<Atom & Readable>

    output          : Output<Atom & Writable>


    mapInput<V> (input : Input<V>, func : (atom : V) => any) {

        if (input instanceof Array) {
            return input.map(func)
        } else {
            // no Object.map() ? are JS designers serious?
            let res     = {}

            for (let key in input) {
                res[ key ] = func(input[ key ])
            }

            return res
        }
    }
}

export type MutationData = Mixin<typeof MutationData>


export const MinimalMutationData = MutationData(Base)



// //---------------------------------------------------------------------------------------------------------------------
// export const PureCalculation = <T extends Constructable<Calculable & MutationData>>(base : T) => {
//
//     abstract class PureCalculation extends base {
//
//         calculation         : AnyFunction1<ChronoValue>
//
//         calculate () : (Atom & Writable)[] {
//             const input     = this.mapInput(atom => atom.get())
//
//             const result    = Array.isArray(input) ? this.calculation.apply(this, input) : this.calculation(input)
//
//             return this.as.map(atom => atom.set(result))
//         }
//     }
//
//     return PureCalculation
// }
//
// export type PureCalculation = Mixin<typeof PureCalculation>
//
//
// export const MinimalPureCalculation = PureCalculation(Calculable(MutationData(Base)))

