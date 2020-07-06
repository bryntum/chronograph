const arr1   = []
const arr2   = []

const MIN_SMI = -Math.pow(2, 10)
const NON_MIN_SMI = -Math.pow(2, 30) - 100

const MIN_SAFE_INTEGER = Number.MIN_SAFE_INTEGER
const size  = 10000

//----------------------
console.time("arr1")
for (let i = 0; i < size; i++) {
    arr1.push(MIN_SMI)
}

let sum1 = 0

for (let i = 0; i < size; i++) {
    if (arr1[ i ] !== 0) sum1++
}

console.timeEnd("arr1")


//----------------------
console.time("arr2")
for (let i = 0; i < size; i++) {
    arr2.push(NON_MIN_SMI)
}

let sum2 = 0

for (let i = 0; i < size; i++) {
    if (arr2[ i ] !== 0) sum2++
}
console.timeEnd("arr2")
