const mapByRefs = new Map()
const mapByInts = new Map()

const refs = [];

[...new Array(10000)].forEach((value, index) => {
    const ref = { value : Math.random() * 1e10, intKey : index }

    refs.push(ref)

    mapByRefs.set(ref, ref.value)
    mapByInts.set(index, ref.value)
})


let sum1 = 0
let sum2 = 0

let ref

for (let i = 0; i < 50000; i++) {
    ref     = refs[ i % 10000 ]

    sum1    += mapByInts.get(ref.intKey)
}

for (let i = 0; i < 50000; i++) {
    ref     = refs[ i % 10000 ]

    sum2    += mapByRefs.get(ref)
}
