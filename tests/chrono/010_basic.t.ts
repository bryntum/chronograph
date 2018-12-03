import {MinimalRWAtom} from "../../src/chrono/Atom.js";
import {MinimalMutation} from "../../src/chrono/Mutation.js";

declare const StartTest : any

StartTest(t => {

    const Atom1     = MinimalRWAtom.new({ value : 0 })
    const Atom2     = MinimalRWAtom.new({ value : 1 })

    const Result    = MinimalRWAtom.new()

    const mutation  = MinimalMutation.new({
        input       : [ Atom1, Atom2 ],
        as          : [ Result ],

        calculation : (v1, v2) => v1 + v2
    })

    mutation.runCalculation()

    t.is(Result.get(), 1, "Correct result calculated")




})
