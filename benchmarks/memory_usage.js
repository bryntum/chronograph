const count    = 100000

class BenchMapByReference {
    nodes       = new Map()
}
class BenchMapByInteger {
    nodes       = new Map()
}

const mapByRefs = window.mapByRefs = new BenchMapByReference()
const mapByInts = window.mapByInts = new BenchMapByInteger()

;[ ...memory ].forEach((_, index) => {
    const value     = { a : Math.random() * 1e10 }
    const ref       = { intKey : index }

    mapByRefs.map.set(ref, value)

    // memory[ index ] = ref
    // mapByInts.map.set(index, ref)
})

console.log("Populated both maps")

// let sum1 = 0
// let sum2 = 0
//
// let ref
//
// for (let i = 0; i < 50000; i++) {
//     ref     = refs[ i % 10000 ]
//
//     sum1    += mapByInts.get(ref.intKey)
// }
//
// for (let i = 0; i < 50000; i++) {
//     ref     = refs[ i % 10000 ]
//
//     sum2    += mapByRefs.get(ref)
// }
