const refs = [];

[...new Array(10000)].forEach((value, index) => {
    const ref = { value : Math.random() * 1e10, intKey : index }

    refs.push(ref)
})

refs.sort((a, b) => a.value - b.value)


const obj   = Object.create(null)
const set   = new Set()


let ref

for (let i = 0; i < 50000; i++) {
    ref     = refs[ i % 10000 ]

    obj[ ref.intKey ] = ref
}

for (let i = 0; i < 50000; i++) {
    ref     = refs[ i % 10000 ]

    set.add(ref)
}
