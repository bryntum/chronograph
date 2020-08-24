const count    = 1_000_000

class Bench {
    nodes      = []
}

const bench1 = window.bench1 = new Bench()


for (let i = 0; i < count; i++) {
    bench1.nodes[ i ]   = { value : i }
}

console.log("Populated")

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
