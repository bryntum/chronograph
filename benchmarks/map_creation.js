const nestedMap = new Map()

const distinctMap1 = new Map()
const distinctMap2 = new Map()


const count = 100000


for (let i = 0; i < count; i++) {
    nestedMap.set(i, { value : i, nested : { value : i + 1 } })
}



for (let i = 0; i < count; i++) {
    distinctMap1.set(i, { value : i })
    distinctMap2.set(i, { value : i + 1 })
}
