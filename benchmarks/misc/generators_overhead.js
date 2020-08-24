const regularHelper     = function (a) { return a * 2 }
const generatorHelper   = function * (a) { return a * 2 }

const regularFunc       = function (a) { return a + regularHelper(a) }
const generatorFunc     = function * (a) { return a + (yield* generatorHelper(a)) }

const N                 = 1000

//----------------------------------
let res                 = 0

for (let i = 0; i < N; i++) {
    res                 += regularFunc(0)
}

//----------------------------------
let res                 = 0

for (let i = 0; i < N; i++) {
    res                 += generatorFunc(0).next().value
}
