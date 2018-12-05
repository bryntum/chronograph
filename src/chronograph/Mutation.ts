import {Calculable} from "../chrono/Atom.js";
import {MutationData, PureCalculation} from "../chrono/Mutation.js";
import {AnyFunction, Base, Constructable, Mixin} from "../class/Mixin.js";
import {ChronoGraphNode} from "./Node.js";


//---------------------------------------------------------------------------------------------------------------------
export const ChronoCalculation = <T extends Constructable<PureCalculation & MutationData>>(base: T) => {

    abstract class ChronoCalculation extends base {
        as: ChronoGraphNode[]

        calculation: AnyFunction

        calculate(): ChronoGraphNode[] {
            const values = this.mapInput(atom => atom.get())

            const result = Array.isArray(values) ? this.calculation.apply(this, values) : this.calculation(values)

            return this.as.map(atom => atom.set(result))
        }
    }

    return ChronoCalculation
}
export type ChronoCalculation = Mixin<typeof ChronoCalculation>
export const MinimalChronoMutationData = ChronoCalculation(PureCalculation(Calculable(MutationData(Base))))
