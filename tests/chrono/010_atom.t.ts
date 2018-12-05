import {MinimalRWAtom} from "../../src/chrono/Atom.js";
import {MinimalPureCalculation} from "../../src/chrono/Mutation.js";
import {ChronoGraphSnapshot, MinimalChronoGraphSnapshot} from "../../src/chronograph/Graph.js";
import {ChronoGraphNode, MinimalChronoGraphNode, MinimalChronoMutationNode} from "../../src/chronograph/Node.js";

declare const StartTest : any

StartTest(t => {

    t.it('Minimal mutation (outside of graph)', t => {
        const atom1     = MinimalRWAtom.new({ value : 0 })
        const atom2     = MinimalRWAtom.new({ value : 1 })

        const result    = MinimalRWAtom.new()

        const mutation  = MinimalPureCalculation.new({
            input       : [ atom1, atom2 ],
            as          : [ result ],

            calculation : (v1, v2) => v1 + v2
        })

        mutation.calculate()

        t.is(result.get(), 1, "Correct result calculated")
    })

})
