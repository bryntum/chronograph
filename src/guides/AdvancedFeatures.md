ChronoGraph advanced features
=============================

This guide introduces more advanced functionality of ChronoGraph. To use them we first need to examine the low-level
data representation of ChronoGraph.

Graph. Synchronous identifiers. Generator-based identifiers
------------------------

At the low level, ChronoGraph is a directed acyclic graph. The nodes of the graph are called "identifiers". The main property of the [[Identifier]] is a function, that calculates its value ([[Identifier.calculation]]).  

```ts
import { Identifier } from "../src/chrono/Identifier.js"

const identifier1 = Identifier.new({ calculation : () => 42 })
```

In the calculation function of some identifier, it is possible to reference the value of another identifier through a special construct, which is called "yielding an effect". In TypeScript syntax this means passing the identifier to the special function (so called "effect handler"), which is provided as the 1st argument of every calculation function.

```ts
import { SyncEffectHandler } from "../src/chrono/Transaction.js"

const identifier2 = Identifier.new({ 
    calculation : (Y : SyncEffectHandler) => Y(identifier1) + 5 
})
```

Important expectation is, that other than by values that results from yielding an effect, the calculation functions are supposed to be pure. 

So, the value of another identifier can be referenced as the synchronous call to the effect handler. Thus, by language design, the nesting of such construct is limited by the stack depth. ChronoGraph also adds couple of internal calls to the handler. Our measurements showed, that effective stack depth for the ChronoGraph identifiers is ~1300. 

For some applications it may be not enough. For example, in our Gantt product, we calculate the schedule of the project, which consists from many tasks. Tasks are connected with each other, using "successor/predecessors" relationships. Such task dependencies can form long chains, and we want the length of the chain to be bigger than ~1300.

Thankfully it is possible to rule out this limitation completely by using a special form of calculation function, which is based on generators:

```ts
import { ChronoIterator } from "../src/chrono/Graph.js"

const identifier3 = Identifier.new({
    *calculation  (Y : SyncEffectHandler) : ChronoIterator<number> {
        const value1 : number = yield identifier1

        return value1 + 5
    }
})
```

As you can see, in this form, "yielding an effect" is mapped to the actual JS `yield` keyword.

User can also provide a context in which to execute this function (the `this` value, see [[Identifier.context]]). Considering the purity requirement, the context should be an immutable value.

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

Again, in generator form, identifiers may reference each other in indefinitely long chains (unlimited stack depth). Also, in generator form, calculation function can also be asynchronous (by yield asynchronous effects). However, execution of the generator function has additional overhead, compared to synchronous function, so this calculation mode imposes certain performance penalty (see the [Benchmarks](_guides_benchmarks_.html) guide). 

Cyclic identifier references are not allowed. You may still find, that you need to encode a cyclic set of formulas, as an invariant about your data. In such case, reference the [Dealing with cyclic computations](_guides_cycleresolver_.html) guide. 

It is possible to mix the identifiers with different types of calculation functions freely (you can reference a value of the generator identifier in the synchronous identifier and vice-versa).

```ts
const identifier6 = Identifier.new({
    *calculation  (Y : SyncEffectHandler) : ChronoIterator<number> {
        const value1 : number = yield identifier1

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

Takeaways:

- ChronoGraph is a directed acyclic graph of identifiers, which are, in the simplest form, just calculation functions
- In those functions, its possible to reference another identifiers through the "effect yielding"
- The effect yielding can be of 2 types - synchronous and with generators
- Generator calculations has unlimited stack depth and can be asynchronous. They are a bit slower, however.
- The identifiers of different types can be freely mixed   

Scopes. Variables. Reactive contract. Equality
-----------------

The identifiers themselves represent a closed world of pure functions. To be able to interact with this world, we need to sort of "materialize" it. We do it by adding an identifier to the [[ChronoGraph]] instance. Now, we can read the value of that identifier "in the scope" or "in the context" of that `ChronoGraph` instance.

```ts
const graph = ChronoGraph.new()

graph.addIdentifier(identifier1)

const value1 = graph.read(identifier1)
```

We can also add identifiers just by supplying its function:

```ts
const identifier1 = graph.identifier(() => 42))

const value1 = graph.read(identifier1)
```

There is a special type of identifiers, that represent a user input - "variables" (see [[Variable]]). It is more lightweight than regular identifier, as it omits the calculation function. Variables can be created by supplying their initial value: 

```ts
const variable9 : Variable<number> = graph.variable(42)

const value9 = graph.read(variable9)
```

To provide a value for the variable, you can "write" to it (see [[ChronoGraph.write]]):

```ts
graph.write(variable9, 11)

const value10 = graph.read(variable9)
```

As you probably already guessed, after you wrote to some variable, reading from any dependent identifier will return updated, consistent value - that is what we call "reactive contract".

Another part of the reactive contract, is that if the value is calculated to the same value as it had previously, the identifiers, dependent on it, will not be re-calculated. This minimizes the numbers of computations needed to bring the data into the consistent state and greatly improves performance. In fact, identifiers forms a memoized set of calculations. 

```ts
const variable11 : Variable<number> = graph.variable(5)
const variable12 : Variable<number> = graph.variable(5)

const identifier13 = graph.identifier(Y => Y(variable11) + Y(variable12))

const identifier14 = graph.identifier(Y => Y(identifier13) + 10)

const value14 = graph.read(identifier14)

graph.write(variable11, 3)
graph.write(variable12, 7)

// won't trigger the identifier14's calculation
const value15 = graph.read(identifier14)
```

One more property of the identifiers is, how they "understand" or implement equality for their data. By default, the equality check is performed with the `===` operator, one can provide a custom implementation using the [[Identifier.equality]] property. 

```ts
const identifier10 = Identifier.new({
    equality : (v1 : Date, v2 : Date) => v1.getTime() === v2.getTime(),
    
    calculation (Y : SyncEffectHandler) : Date {
        return new Date(2020, 1, 1)
    },
}) as Identifier<Date>
```


Takeaways:
- Reading/writing from/to the identifiers is only possible inside of certain "scope" ([[ChronoGraph]] instance)
- There's a special lightweight kind of identifiers - "variables", that represents user input.
- The data in the scope conforms to the "reactive contract", which means that reads from the identifiers will return consistent values with regard to previous writes.
- If identifier is computed to the "same" value (the notion of "sameness" can be configured with the [[Identifier.equality]] property), dependent identifiers are not re-calculated, minimizing the number of computations. By default, the equality is implemented with `===` operator.


Mixed identifier. ProposedOrPrevious effect
-----------------------

In a "classic" reactive system, variables and computed values are the only primitives. However, we found, that it is common for the identifiers to behave differently, based on some other data. For example, in some mode, an identifier may represent only user input ("variable"), but when some external value changes, it may need to ignore the user input and instead be calculated, based on other identifiers.

This is of course can be solved by simply having an extra identifier for the input. However, when pretty much all the identifiers need to have this behavior, this means doubling the number of identifiers. In Bryntum Gantt, for the project with 10k tasks and 5k dependencies we have roughly 500k of identifiers, doubling all of them would mean the number would be 1M, which is a significant pressure on browser.

Instead, we introduce a special [[Effect]] for the user input `ProposedOrPrevious`. Yielding this effect returns either a user input for this identifier, or, if there's no input, its previous value. 

If an identifier does not yield this effect, it becomes a purely computed value. If it does, and returns its value unmodified, it becomes a variable. It can also yield this effect, but return some processed value, based on extra data. This can be seen as validating user input:

```ts
const graph4 = ChronoGraph.new()

const max           = graph4.variable(100)

const identifier15  = graph4.identifier(function *calculation () : CalculationIterator<number> {
    const proposedValue : number    = yield ProposedOrPrevious

    const maxValue : number         = yield max

    return proposedValue <= maxValue ? proposedValue : maxValue
})

graph4.write(identifier15, 18)

const value15_1 = graph4.read(identifier15) // 18

graph4.write(identifier15, 180)

const value15_2 = graph4.read(identifier15) // 100

graph4.write(max, 50)

const value15_3 = graph4.read(identifier15) // 50
```      

One thing to consider, is that if an identifier yields a `ProposedOrPrevious` effect and its computed value does not match the value of this effect, it will be re-calculated (computation function called) again on the next read. This is because the value of its `yield ProposedOrPrevious` input changes.

See also the [Dealing with the computation cycles](_guides_cycleresolver_.html) guide.

There's a number 

Takeaways:

- The user input in ChronoGraph is actually represented with the special effect, `ProposedOrPrevious`
- Identifier can yield this effect or choose to not do that, based on the values of external data. This may change the identifier's behavior from purely computed value to variable, with "validated" value in the middle.


Other effects
-------------



Field. Entity. Schema. Replica
-------------------------------

The identifiers graph from above is a low-level interface for the ChronoGraph. We found, that for modelling a complex data domain, its much easier to reason about such graph, when its organized into "entities". We naturally chose to represent entities with TypeScript classes:

```ts
class Author extends Entity(Object) {
    @field()
    firstName       : string

    @field()
    lastName        : string

    @field()
    fullName        : string


    @calculate('fullName')
    calculateFullName (Y : SyncEffectHandler) : string {
        return Y(this.$.firstName) + ' ' + Y(this.$.lastName)
    }
}

const replica1          = MinimalReplica.new()

const markTwain         = new Author()

replica1.addEntity(markTwain)

markTwain.firstName     = 'Mark'
markTwain.lastName      = 'Twain'

console.log(markTwain.fullName) // Mark Twain
```

Here we use the `Entity` mixin, to turn any base class into entity. Then we use `@field()` decorator to mark some properties as "fields" - which are a special kind of ChronoGraph identifiers. We also use the `@calculate(fieldName)` decorator to mark a method of the class as the calculation function for the field, specified in the decorator. The context of calculation (value of `this`) is the class instance.

To reference the identifier, that represent a field of certain entity instance, we use the following notation: `this.$.fieldName`.

We introduce a new kind of data scope, that keeps entities information, called "replica". Once we instantiate some entity, we need to add it to the replica. That will create identifiers for every field in the entity and also additional identifier, representing the entity as whole. 

Field properties creates auto-generated get/set accessors, which are tied to the `read/write` methods of the graph. For the outside world, entities behave very similar to regular TypeScript classes, however, important consideration to keep in mind, is, again, purity. Even that field calculation function has class instance as its `this` value, it should not refer anything other than `this.$` property, which is simply an immutable object collection of all fields of this entity. It should not modify any external state, or perform other effects. 

Takeaways:

- Modeling complex data domains is easier, when data graph is represented with the entities - "records" of the individual "fields", which are represented with plain TypeScript classes
- Fields of entities are regular TypeScript class properties with `@field()` decorator. They creates corresponding identifiers in the new type of the data scope, called "replica". One can assign a calculation function for the field using the `@calculate(fieldName)` decorator for class method
- Fields creates get/set accessors, which are tied to the read/write methods of the replica 


Reference. Reference bucket
----------------------

Entities often need to reference each other. For example, in addition to the `Author` entity from the previous example, we may introduce a `Book` entity, that will have `writtenBy` field with the `Author` type, containing a corresponding `Author` instance.

```ts
class Book extends Entity(Object) {
    @field()
    writtenBy       : Author
}

const tomSoyer          = new Book
    
tomSoyer.writtenBy      = markTwain
```

This is a simplest form of reference to another entity. To make it a bit smarter and to answer a question - "what are the books written by Mark Twain", we can use special types of identifiers - references and reference buckets.

```ts
class Author2 extends Entity(Object) {
    @bucket()
    books           : Set<Book2>
}

class Book2 extends Entity(Object) {
    @reference2<Author2>({ bucket : 'books' })
    writtenBy       : Author2
}

const replica2          = MinimalReplica.new()

const markTwain2        = new Author2()

const tomSawyer2        = new Book()
const huckleberryFinn2  = new Book()

replica2.addEntities([ markTwain2, tomSawyer2, huckleberryFinn2 ])

tomSawyer2.writtenBy        = markTwain2
huckleberryFinn2.writtenBy  = markTwain2

markTwain2.books // new Set([ tomSawyer2, huckleberryFinn2 ])
```

Takeaways:

- References between the entities can be established with the special kind of fields - "reference" and "reference bucket", with `@reference<Entity>({ bucket : bucketName})` and `@bucket()` decorators.
- Buckets are the `Set` collections with all entities, referencing the entity of the bucket  



Mixins
------

We found, that when modelling a complex data domain, its much easier to reason about each requirement in isolation, independently from other business logic. We would like to be able to add/remove features, without breaking existing ones.

This can be achieved by using mixins, instead of regular class inheritance.

Using mixins however, is orthogonal to the ChronoGraph itself - you can choose any other class organization.

Mixins - requirements.

Every feature - a mixin with own requirements (already "consumed" mixins).




Data branching. Undo/redo
--------------


You can derive a new scope from the existing one. The data in these 2 scope will be unrelated. 

```ts
const graph2 = ChronoGraph.new()

const variable13 : Variable<number> = graph2.variable(5)

const branch2 = graph2.branch()

branch2.write(variable13, 10)

const value13_1 = graph2.read(variable13)  // 5
const value13_2 = branch2.read(variable13) // 10
```

This is a very useful feature to answer a "what-if" questions about the data. For example, in our Gantt, dependencies between tasks can not form cycles. So we need to find out, if adding a dependency creates a cycle, w/o actually adding a dependency (to show the prohibitive indicator in the UI). This is implemented by deriving a new branch and adding a dependency into it.

Data branching is cheap, there's no overhead for computations in the branches.

It is also possible to opt-in to keep in the memory the recent state of the data graph. One can switch between the states using the `undo/redo` methods. The memory "depth" is configured with the `historyLimit` configuration option.

```ts
const graph3 = ChronoGraph.new({ historyLimit : 5 })

const variable14 : Variable<number> = graph2.variable(5)

const value14_1 = graph2.read(variable14)  // 5

graph3.write(variable14, 10)

const value14_2 = graph2.read(variable14)  // 10

graph2.undo()

const value14_3 = graph2.read(variable14)  // 5

graph2.redo()

const value14_4 = graph2.read(variable14)  // 10
```

Takeaways:
- It is possible to derive an unrelated branch from the current data scope. This is cheap, and can answer "what if" questions about the data.
- Its possible to opt-in for the undo/redo feature 


## Data branching

You can also create a separate branch, pretty much like in git. Data changes in the branch won't affect the ancestor, branch exists separately.

```ts
const replica           = MinimalReplica.new()

author.firstName    = 'Moby'

replica.propagate()

author.firstName == 'Moby'

replica.undo()

author.fullName == 'Mark'

replica.redo()

author.fullName == 'Moby'
```



Debug mode
==========




## COPYRIGHT AND LICENSE

MIT License

Copyright (c) 2018-2020 Bryntum, Nickolay Platonov
