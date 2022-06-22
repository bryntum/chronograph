ChronoGraph advanced features
=============================

This guide introduces more advanced functionality of ChronoGraph. To use it, we first need to examine the low-level
data representation of ChronoGraph.

Graph. Synchronous identifiers. Generator-based identifiers
------------------------

At the low level, ChronoGraph is a directed acyclic graph. The nodes of the graph are called "identifiers". The main property of the [[Identifier|identifier]] is its [[Identifier.calculation|calculation]] function  

```ts
import { Identifier } from "../src/chrono/Identifier.js"

const identifier1 = Identifier.new({ calculation : () => 42 })
```

Inside the calculation function of some identifier, it is possible to reference the value of another identifier through a special construct, which is called "yielding an effect". In TypeScript syntax this means passing the identifier to the special function (so called "effect handler"), which is provided as the 1st argument of every calculation function.

```ts
import { SyncEffectHandler } from "../src/chrono/Transaction.js"

const identifier2 = Identifier.new({ 
    calculation : (Y : SyncEffectHandler) => Y(identifier1) + 5 
})
```

Important expectation is, that other than by values, that results from yielding an effect, the calculation functions are supposed to be pure. 

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

User can also provide a [[Identifier.context|context]] in which to execute this function (the `this` value). Considering the purity requirement, the calculation function should only reference the immutable data from the context.

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

Again, in generator form, identifiers may reference each other in indefinitely long chains (unlimited stack depth). Also, in generator form, calculation function can also be asynchronous (by yielding a `Promise`, which will be awaited in the outer context). However, the execution of the generator function has additional overhead, compared to synchronous function, (see the [[BenchmarksGuide|Benchmarks]] guide). 

Cyclic identifier references are not allowed. You may still find, that you need to encode a cyclic set of formulas, as an invariant about your data. In such case, reference the [[CycleResolverGuide|Dealing with cyclic computations]] guide. 

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

- ChronoGraph is a directed acyclic graph of [[Identifier|identifiers]], which are, in the simplest form, just [[Identifier.calculation|calculation]] functions
- In those functions, its possible to reference another identifiers through the "effect yielding"
- The effect yielding can be of 2 types - synchronous and with generators
- Generator calculations has unlimited stack depth and can be asynchronous. They are a bit slower, however.
- The identifiers of different types can be freely mixed   

Scopes. Variables. Reactive contract. Equality
-----------------

The identifiers themselves represent a closed world of pure functions. To be able to interact with this world, we need to sort of "materialize" it. We do it by adding an identifier to the [[ChronoGraph]] instance. Now, we can [[ChronoGraph.read|read]] the value of that identifier "in the scope" or "in the context" of that `ChronoGraph` instance.

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

There is a special type of identifiers, that represent a user input - [[Variable|variables]]. It is more lightweight than regular identifier, as it omits the calculation function. Variables can be created by supplying their initial value: 

```ts
const variable9 : Variable<number> = graph.variable(42)

const value9 = graph.read(variable9)
```

To provide a value for the variable, you can [[ChronoGraph.write|write]] to it:

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

One more property of the identifiers is, how they "understand" or implement equality for their data. By default, the equality check is performed with the `===` operator, one can provide a custom implementation using the [[Identifier.equality|equality]] property. 

```ts
const identifier10 = Identifier.new({
    equality : (v1 : Date, v2 : Date) => v1.getTime() === v2.getTime(),
    
    calculation (Y : SyncEffectHandler) : Date {
        return new Date(2020, 1, 1)
    },
}) as Identifier<Date>
```


Takeaways:
- [[ChronoGraph.read|Reading]]/[[ChronoGraph.write|writing]] from/to the identifiers is only possible inside of certain "scope" ([[ChronoGraph]] instance)
- There's a special lightweight kind of identifiers - [[Variable|variables]], that represents user input.
- The data in the scope conforms to the "reactive contract", which means that reads from the identifiers will return consistent values with regard to previous writes.
- If identifier is computed to the "same" value (the notion of "sameness" can be configured with the [[Identifier.equality|equality]] property), dependent identifiers are not re-calculated, minimizing the number of computations. By default, the equality is implemented with `===` operator.


Mixed identifier. ProposedOrPrevious effect
-----------------------

In a "classic" reactive system, variables and computed values are the only primitives. However, we found, that it is common for the identifiers to behave differently, based on some other data. For example, in some mode, an identifier may represent only user input ("variable"), but when some external value changes, it may need to ignore the user input and instead be calculated, based on other identifiers.

This is of course can be solved by simply having an extra identifier for the input. However, when pretty much all the identifiers need to have this behavior, this means doubling the number of identifiers. In Bryntum Gantt, for the project with 10k tasks and 5k dependencies we have roughly 500k of identifiers, doubling all of them would mean the number would be 1M, which is a significant pressure on browser.

Instead, we introduce a special [[Effect|effect]] for the user input - [[ProposedOrPrevious]]. Yielding this effect returns either a user input for the identifier being calculated, or, if there's no input, its previous value. 

If an identifier does not yield this effect, it becomes a purely computed value. If it does, and returns its value unmodified, it becomes a variable. It can also yield this effect, but return some processed value, based on extra data. This can be seen as validating user input:

```ts
const graph4 = ChronoGraph.new()

const max           = graph4.variable(100)

const identifier15  = graph4.identifier((Y) : number => {
    const proposedValue : number    = Y(ProposedOrPrevious)

    const maxValue : number         = Y(max)

    return proposedValue <= maxValue ? proposedValue : maxValue
})

graph4.write(identifier15, 18)

const value15_1 = graph4.read(identifier15) // 18

graph4.write(identifier15, 180)

const value15_2 = graph4.read(identifier15) // 100

graph4.write(max, 50)

const value15_3 = graph4.read(identifier15) // 50
```      

One thing to consider, is that if an identifier yields a [[ProposedOrPrevious]] effect and its computed value does not match the value of this effect, it will be re-calculated again on the next read (or during next commit if its a strict identifier). This is because the value of its `ProposedOrPrevious` input changes.

See also the [[CycleResolverGuide|Dealing with cyclic computations in ChronoGraph]] guide.

Takeaways:

- The user input in ChronoGraph is actually represented with the special [[Effect|effect]], [[ProposedOrPrevious]]
- [[Identifier]] can yield this effect or choose to not do that, based on the values of external data. This may change the identifier's behavior from purely computed value to variable, with "validated" value in the middle.


Other effects
-------------

In addition to the `ProposedOrPrevious` effect there's a number of other effects, for example [[Reject]].

The other effects are still somewhat experimental, so they are not documented intentionally. Please refer to `chrono/Effect.ts` file for info.


Entity/Relation framework
-------------------------

The identifiers graph from above is a low-level interface for the ChronoGraph. In the [[BasicFeaturesGuide|Basic features]] guide we've already introduced a more convenient view on it, as on set of [[Entity|entities]] with [[Field|fields]]. We naturally chose to represent entities with TypeScript classes and fields - with their properties.

To turn some JS class into entity, one need to mix the [[Entity]] [[Mixin|mixin]] into it. And to turn a property into a field - decorate it with 
[[field|@field()] decorator. 

To specify the calculation function for the identifier of some field - write it as a method of the entity class and decorate with [[calculate]] (this mapped method will be set as the [[Identifier.calculation|calculation]] config of the corresponding identifier).

Under the hood, its an a bit enhanced version of the same graph, which can be instantiated with [[Replica]] constructor.  

```ts
class Author extends Entity.mix(Object) {
    @field()
    firstName       : string

    @field()
    lastName        : string

    @field()
    fullName        : string


    @calculate('fullName')
    calculateFullName (Y : SyncEffectHandler) : string {
        return this.firstName + ' ' + this.lastName
    }
}

const replica   = Replica.new()
```

The identifiers for all fields are collected into the [[Entity.$]] property.

```ts
const markTwain         = new Author()

markTwain.$.firstName
markTwain.$.lastName
```

The [[Identifier.context|context]] config of all field identifiers is set to the entity instance itself. 

Field properties also creates auto-generated get/set accessors, which are tied to the [[Replica.read|read]]/[[Replica.write|write]] methods of the replica. 

For the outside world, entities behave very similar to regular TypeScript classes, however, important consideration to keep in mind, is, again, purity. Even that field calculation function has class instance as its `this` value, it should only refer the immutable data from it. The `this.$` property is immutable, so it can be accessed safely. Calculation function should not modify any external state, or perform other effects. 

Takeaways:

- Modeling complex data domains is easier, when data graph is represented as the set of [[Entity|entities]] with [[Field|fields]], which are mapped to plain TypeScript classes
- Fields of entities are regular TypeScript class properties with [[field|@field()]] decorator. They creates corresponding identifiers in the new type of the data scope, called [[Replica|replica]]. One can assign a calculation function for the field using the [[calculate]] decorator for class method.


Data branching.
--------------

We can finally approach the most interesting feature of ChronoGraph - data branching. 

You can derive a new ChronoGraph data scope from the existing one. The data in these 2 scopes will be identical at the beginning, but will diverge, as user performs writes. 

```ts
const graph2 = ChronoGraph.new()

const variable13 : Variable<number> = graph2.variable(5)

const branch2 = graph2.branch()

branch2.write(variable13, 10)

const value13_1 = graph2.read(variable13)  // 5
const value13_2 = branch2.read(variable13) // 10
```

This is a very useful feature to answer a "what-if" questions about the data. For example, in our Gantt product, dependencies between tasks can not form cycles. So, before adding a dependency, we need to find out whether it creates a cycle.

More over we need get this information in advance, w/o actually adding a dependency (to show the prohibitive indicator in the UI and disallow the user action). This is implemented by deriving a new branch and adding a dependency into it. Then, reading a single identifier from that branch will either succeed (no cycle) or throw an exception (cycle).

Data branching is cheap, there's no overhead for computations in the branches.

Branching works for replica too of course, with one nuance. It is that in calculation functions, you need to reference the input identifiers, by explicit yielding of identifier, instead of using field accessor:

```ts
class Author extends Entity.mix(Object) {

    @calculate('fullName')
    calculateFullName (Y : SyncEffectHandler) : string {
        return Y(this.$.firstName) + ' ' + Y(this.$.lastName)
    }
}
```

This is because ChronoGraph need to know in context of which branch the calculation is performed. And this context is encoded in the effect handler (`Y`), but field accessors are always bound to the graph, they have been added to with [[Replica.addEntity|addEntity]]. This may improve in the future.


Mixins
------

We found, that when modelling a complex data domain, its much easier to reason about each requirement in isolation, independently from other business logic. We would like to be able to add/remove features, without breaking existing ones.

This can be achieved by writing every feature as a mixin. Mixins is a well-known pattern in the imperative programming, which, in this context,
means a combination of class inheritance and lambda function. Lambda functions composes well, so do mixins. This solves a well-known problem of re-using functionality across the whole inheritance diagram.

This pattern encourages every mixin to describe a very granular addition of logic, over already defined set of mixins (requirements that are assumed to be already maintained). This allows to model the requirements precisely, one by one. Naturally, the number of classes on the diagram increases (it took roughly 30 mixins, for example, to model the requirements of the Gantt chart), but modern tooling (TypeScript's typechecker), allows us to keep the things under control, and prevent "feature leak" - well known effect, when the logic of some feature is spread across many source files.

For example, we can define a `Person` as something that can concatenate its `firstName` and `lastName`, derived as ChronoGraph [[Entity]], from the base class [[Base]].  

```ts
class Person extends Mixin(
    [ Entity, Base ], 
    (base : ClassUnion<typeof Entity, typeof Base>) => {

    class Person extends base
        @field()
        firstName       : string
        @field()
        lastName        : string
        @field()
        fullName        : string
    
        @calculate('fullName')
        calculateFullName (Y : SyncEffectHandler) : string {
            return this.firstName + ' ' + this.lastName
        }
    }

    return Person
}){}
```

Then we can define an `Employee`, as a `Person` with `salary`.  

```ts
class Employee extends Mixin(
    [ Person ], 
    (base : ClassUnion<typeof Person>) => {

    class Employee extends base
        @field()
        salary          : number
    
        @calculate('salary')
        calculateSalary (Y : SyncEffectHandler) : number {
            return Y(ProposedOrPrevious)
        }
    }

    return Employee
}){}
``` 

Trying to access `salary` field from the `Person` mixin itself will issue a compilation error - features are isolated and TypeScript prevents feature leaks.

Then, lets say contract has a clause, that employee can take free days, w/o being paid for them. Then we can define a feature, that describes how the salary changes if `Employee` took some free days during the month. 

Note:
- If employee did not take any free days, this feature delegates the previous behavior. The notion of "previous behavior" is what allows mixins to compose well.
- `ExcludeFreeDaysFromSalary` can be applied to any class that has generic `Employee` mixin. It "does not know" anything about other features/requirements.    

```ts
class ExcludeFreeDaysFromSalary extends Mixin(
    [ Employee ], 
    (base : ClassUnion<typeof Employee>) => {

    class ExcludeFreeDaysFromSalary extends base
        @field()
        freeDays            : FreeDay[] // whatever that means
    
        @calculate('salary')
        calculateSalary (Y : SyncEffectHandler) : number {
            let salary = super.calculateSalary(Y)

            if (this.freeDays.length > 0) {
                salary  -= () => ...    
            }

            return salary
        }
    }

    return ExcludeFreeDaysFromSalary
}){}
``` 

Another business requirement could be - if employee completes some plan, s/he gets a bonus.

```ts
class BonusForGoodWork extends Mixin(
    [ Employee ], 
    (base : ClassUnion<typeof Employee>) => {

    class BonusForGoodWork extends base
        @field()
        wokrPlan            : number
        @field()
        workDone            : number
    
        @calculate('salary')
        calculateSalary (Y : SyncEffectHandler) : number {
            let salary = super.calculateSalary(Y)

            if (this.workDone > this.workPlan) {
                salary  += () => ...    
            }

            return salary
        }
    }

    return BonusForGoodWork
}){}
```

Again, `BonusForGoodWork` is isolated from the other features.

Finally we compose everything together:

```ts
// automatic
class EmployeeAccordingToContract extends Mixin(
    [ Employee, ExcludeFreeDaysFromSalary, BonusForGoodWork ], 
    (base : ClassUnion<typeof Employee, typeof ExcludeFreeDaysFromSalary, typeof BonusForGoodWork>) => {

    class EmployeeAccordingToContract extends base
    }

    return EmployeeAccordingToContract
}){}

// manual
const EmployeeAccordingToContract = 
    ExcludeFreeDaysFromSalary.mix(
    BonusForGoodWork.mix(
    Employee.mix(
    Person.mix(
        Base
    ))))
```

See the [[Mixin]] helper for more details about the mixins implementation. 

Using mixins, of course, is orthogonal to the ChronoGraph itself - you can choose any class organization.


## COPYRIGHT AND LICENSE

MIT License

Copyright (c) 2018-2020 Bryntum, Nickolay Platonov
