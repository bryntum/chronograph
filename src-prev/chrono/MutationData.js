import { Base } from "../class/Mixin.js";
//---------------------------------------------------------------------------------------------------------------------
export const MutationData = (base) => class MutationData extends base {
    mapInput(input, func) {
        // if (input instanceof Array) {
        return input.map(func);
        // } else {
        // // no Object.map() ? are JS designers serious?
        // let res     = {}
        //
        // for (let key in input) {
        //     res[ key ] = func(input[ key ])
        // }
        //
        // return res
        // }
    }
};
export const MinimalMutationData = MutationData(Base);
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
