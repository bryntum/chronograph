import {MinimalRWAtom} from "../../src/chrono/Atom.js";

declare const StartTest : any

StartTest(t => {

    t.it('Minimal atom (outside of graph)', t => {
        const atom1     = MinimalRWAtom.new()

        t.is(atom1.hasValue(), false, 'No value initially provided')
        t.is(atom1.get(), undefined, 'No value initially provided')

        atom1.set(0)

        t.is(atom1.hasValue(), true, 'Can set value')
        t.is(atom1.get(), 0, 'Can set value')
    })


    // t.it('Minimal mutation (outside of graph)', t => {
    //     const atom1     = MinimalRWAtom.new({ value : 0 })
    //     const atom2     = MinimalRWAtom.new({ value : 1 })
    //
    //     const result    = MinimalRWAtom.new()
    //
    //     const mutation  = MinimalPureCalculation.new({
    //         input       : [ atom1, atom2 ],
    //         as          : [ result ],
    //
    //         calculation : (v1, v2) => v1 + v2
    //     })
    //
    //     mutation.calculate()
    //
    //     t.is(result.get(), 1, "Correct result calculated")
    // })


})
