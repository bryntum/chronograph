ChronoGraph
===========

ChronoGraph is a reactive computational engine, with the following properties:

- O(1) undo/redo
- Data branching
- Mixed computational unit (constant/calculated value)
- Cancelable transactions
- lazy/eager computations
- Unlimited stack depth
- Possibility to split the whole computation into chunks (think `requestAnimationFrame`) 
- Possibility for breadth-first computation (think network latency)

It powers the business logic of the [Bryntum Gantt](https://bryntum.com/products/gantt)

This guide describes all the ChronoGraph features, in the recommended learning order.

Identifiers
------------

ChronoGraph represents itself by a directed acyclic graph. The nodes of the graph are called "identifiers". The main property of the identifier is a function, that calculates its value.  

```ts
import { Identifier } from "../src/chrono/Identifier.js"

const identifierConstant = Identifier.new({ calculation : () => 42 })
```

It is possible to reference to the value of another identifier through a special construct, which is called "yielding an effect". In TypeScript syntax its just passing the identifier to the function, that is provided as the 1st argument of every calculation function.

```ts
import { SyncEffectHandler } from "../src/chrono/Transaction.js"

const identifier2 = Identifier.new({ calculation : (Y : SyncEffectHandler) => Y(identifier1) + 5 })
```

Important expectation is, that other than by values that results from yielding an effect, the calculation functions are supposed to be pure. This is important consideration to keep in mind, if you have a background from the imperative language. The purity allows us to avoid a massive class of bugs, which are common in the "wild" turing-complete imperative code.

As you may have noticed, the value of another identifier can be referenced as the synchronous call to the effect handler. Thus, by language design, the nesting of such construct is limited by the stack depth. ChronoGraph also adds couple of internal calls to the handler. Our measurements showed, that effective stack depth for the ChronoGraph identifiers is ~1300. 

For some applications it may be not enough. For example, in our Gantt product, we calculate the schedule of the project, which consists from many tasks. Tasks are connected with each other, using "successor/predecessors" relationships. Such task dependencies can form long chains, and we want the length of the chain to be bigger than ~1300.

Thankfully it is possible to rule out this limitation completely by using a special form of the calculation function, which is based on generators:

```ts
import { ChronoIterator } from "../src/chrono/Graph.js"

const identifier3 = Identifier.new({
    *calculation  (Y : SyncEffectHandler) : ChronoIterator<number> {
        const value1 : number = yield identifier1

        return value1 + 5
    }
})
```

User can also provide a context in which to execute this function. Considering the purity requirement, the context should be an immutable value.

```ts
const context = { identifier1, identifier2 }

const identifier4 = Identifier.new({
    calculation  (Y : SyncEffectHandler) : number {
        const value1 : number = Y(this.identifier1)

        return value1 + 5
    },
    context
})

const identifier5 = Identifier.new({
    *calculation  (Y : SyncEffectHandler) : ChronoIterator<number> {
        const value2 : number = yield this.identifier2

        return value2 + 5
    },
    context
})

```

Again, in generator form, identifiers may reference each other in indefinitely long chains (unlimited stack depth). Also, in generator form, calculation function can also be asynchronous (by yield asynchronous effects). However, stack still exists in the "externalized" form, so this calculation mode imposes certain performance penalty (see the Benchmarks section). 

Cyclic references are not allowed in any form. You may still find, that you need to encode a cyclic set formulas, as an invariant about your data. In such case, reference the [Dealing with computation cycles]() guide. 

It is possible to mix the identifiers with different types of calculation functions freely (you can get a value of the generator identifier in the synchronous identifier).

```ts
const identifier6 = Identifier.new({
    *calculation  (Y : SyncEffectHandler) : ChronoIterator<number> {
        const value1 : number = Y(identifier1)

        return value1 + 5
    },
})

const identifier7 = Identifier.new({
    calculation  (Y : SyncEffectHandler) : number {
        const value6 : number = Y(identifier6)

        return value6 + 5
    },
})
```

Takes over:
    - ChronoGraph is represented with identifiers, with calculation functions
    - Its possible to reference another identifiers through the "effect yielding"
    - The effect yielding can be of 2 forms - synchronous and with generators
    - Generator calculations has unlimited stack depth and can be asynchronous. They are a bit slower, however.
    - The identifiers of different types still can freely mixed   

Scopes. Variables
-----------------

The identifiers themselves represent a closed world of pure functions. To be able to interact with this world, we need to sort of "materialize" it. We do it by adding an identifier to the `ChronoGraph` instance. Now, we can read the value of that identifier "in the scope" of that `ChronoGraph` instance.

```ts
const graph = MinimalChronoGraph.new()

graph.addIdentifier(identifier1)

const value1 = graph.read(identifier1)
```

We can also add identifiers just by supplying its function:

```ts
const identifier1 = graph.identifier(() => 42))

const value1 = graph.read(identifier1)
```

There is a special type of identifiers, that represent a user input - "variables". Variables can be created by supplying their initial value: 

```ts
const variable9 : Variable<number> = graph.variable(42)

const value9 = graph.read(variable9)
```

To provide a value for the variable, you can "write" to it:

```ts
graph.write(variable9, 11)

const value10 = graph.read(variable9)
```

As you probably already guessed, after you wrote to some variable, reading from any dependent identifier will return updated, consistent value - that is what we call "reactive contract".


Equality
--------

Another property of the identifiers is, how they "understand" or implement equality for their data. By default, the equality check is performed with the `===` operator, one can provide a custom implementation using the `equality` property. 


Data branching
----------------------
 


Benchmarks
==========

Dealing with computation cycles
===============================



## COPYRIGHT AND LICENSE

MIT License

Copyright (c) 2018-2019 Bryntum
