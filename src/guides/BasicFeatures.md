ChronoGraph basic features
==========================

Entity/Relation. Reactivity.
---------------------------


The most convenient view on the ChronoGraph's data is a small built-in Entity/Relation framework, which is mapped to the ES6 classes.

In this framework, the data is organized as a set of entities, each having a set of fields. Entities are mapped to ES6 classes and fields - to its decorated properties.  

```ts
class Person extends Entity.mix(Base) {
    @field()
    firstName       : string

    @field()
    lastName        : string

    @field()
    fullName        : string

    @calculate('fullName')
    calculateFullName () : string {
        return this.firstName + ' ' + this.lastName
    }
}

const person            = Person.new({ firstName : 'Mark', lastName : 'Twain' })

const replica           = Replica.new()

replica.addEntity(person)

console.log(person.fullName) // "Mark Twain"
```

Here, we've defined a `Person` class, as an [[Entity]] [[Mixin|mixin]], applied to the [[Base]] class.

The `Person` class has 3 fields - `firstName`, `lastName` and `fullName`, distinct from other properties with the [[field|@field()]] decorator.

One more decorator [[calculate|@calculate()]] specifies, that the value of the field `fullName` is calculated in the method `calculateFullName`, based on the values of `firstName` and `lastName`.

The `Person` class can be instantiated as any other class. For the type-safety purposes, it uses its own, static constructor method [[Base.new|new]], provided by the [[Base]] class. This constructor accepts a single object, corresponding to the class properties and will issue a compilation error, if you provide a non-existent property to it. Using the [[Base]] class and its type-safe static constructor is optional, any JS class can be used instead. 

All data is stored in the [[Replica|replica]], which is initially empty. You can populate it with data using the [[Replica.addEntity]] call. Once the entity "enters" the replica, the reactivity contract starts holding. It is that, whenever the value of `firstName` or `lastName` changes, the value of `fullName` is updated automatically.

This simple idea relieves the programmer of burden of updating the outdated data - all data automatically becomes "fresh" and consistent, according to the specified calculation rules.  


Purity. Immutability
--------------------

However, an important expectation is that computation functions should be pure. This is important consideration to keep in mind, coming from the imperative programming world.

The pure computation means, that, given the same set of input values, it should always return the same result and should not produce side effects (should not modify any state).

The purity property:

- Allows us to make effective data updates. If none of the "firstName" or "lastName" changes, the "fullName" calculation will not be started. If both have changed, it will run once. 

- Also means, that computation can be restarted at any time (even if another computation is in progress)

Additionally, the computation functions should return immutable data (should not re-use objects but instead return a new copy every call, similar to `Array#concat()`)

As a result, we avoid a massive class of bugs, which are common in the "wild" turing-complete imperative code.

These requirements are not enforced by ChronoGraph and you can ignore them, however you should know what you are doing in this case. 
 

## Adding and removing entities 

A replica can be populated with entities using [[Replica.addEntity|addEntity]] method and should be freed from them using [[Replica.removeEntity|removeEntity]]. The reactivity contract becomes active only after entity has "entered" the replica. In the same way, once the entity is removed from the replica, reactivity contract ends.   

```ts
const person            = Person.new({ firstName : 'Mark', lastName : 'Twain' })

person.fullName === undefined // not in replica yet

const replica           = Replica.new()

replica.addEntity(person)

person.fullName === 'Mark Twain' // entity in replica

...

replica.removeEntity(person)
```

## Reading and writing data. Calculated data.

To read from or write to a field, use regular property accessors:

```ts
person.firstName    = 'Moby'
person.lastName     = 'Dick'

person.fullName === 'Moby Dick'
```

For every field, there are also generated getter and setter methods:

```ts
person.setFirstName('Elon')
person.setLastName('Musk')

person.getFullName() === 'Elon Musk'
```

Note, that if some field is calculated in a method, it will ignore the writes to it. So the field can either represent a user input (be writeable)
or a calculated value (only readable). 

In the same time, when modelling complex data domains, it might be desirable to actually support both modes for the field. This happens when
we have a set of inter-dependent fields and changing any of them, should update the others according to the business logic. This scenario
will lead to computation cycles and requires careful and disciplined approach. 
Please refer to the [[AdvancedFeaturesGuide|Advanced features]] guide for more details. 

## Cancelable transactions

At any point, if something went wrong, its possible to [[Replica.reject|reject]] the current transaction. Transaction borders are marked with the [[Replica.commit|commit]] call. The end of the previous transaction immediately starts the next one. Transaction rejection resets the whole replica state to the preceding commit.

```ts
person.firstName    = 'Elon'
person.lastName     = 'Musk'

replica.commit()

person.fullName === 'Elon Musk'

person.firstName    = 'Mark'
person.lastName     = 'Twain'

replica.reject()

person.firstName === 'Elon'
person.lastName === 'Musk'
person.fullName === 'Elon Musk'
```

Transaction rejection will also "cancel" the [[Replica.addEntity|addEntity]]/[[Replica.removeEntity|removeEntity]]` calls.


## Undo/redo

It is possible to revert a replica to the previous state, using the [[Replica.undo|undo]] call. Similarly, if no changes has been made to the reverted state, its possible to [[Replica.redo|redo]] back to the initial state.

To enable the undo/redo functionality, you need to opt-in, by specifying a bigger than 0 value for the [[Replica.historyLimit|historyLimit]] config, during replica creation. It specifies how many transactions can be reverted. 

```ts
const replica       = Replica.new({ historyLimit : 10 })

const person        = Person.new()

replica.addEntity(person)

person.firstName    = 'Elon'
person.lastName     = 'Musk'

replica.commit()

person.fullName === 'Elon Musk'

person.firstName    = 'Mark'
person.lastName     = 'Twain'

replica.commit()

person.fullName === 'Mark Twain'

replica.undo()

person.firstName === 'Elon'
person.lastName === 'Musk'
person.fullName === 'Elon Musk'

replica.redo()

person.firstName === 'Mark'
person.lastName === 'Twain'
person.fullName === 'Mark Twain'
```

## Equality

ChronoGrah optimizes the computations, based on the assumption of the purity of computation functions. If none of the inputs of some field computation has changed - there's no need to re-compute it.

The "has not changed" fact is checked using the equality check. It can be overriden by providing a [[Field.equality|equality]] config option to the [[field]]. By default equality is checked with `===` operator. 

For example, if we don't care about the case of the letters:

```ts
const ignoreCaseCompare = (a : string, b : string) : boolean => a.toUpperCase() === b.toUpperCase()

class Person extends Entity.mix(Base) {
    @field({ equality : ignoreCaseCompare })
    firstName       : string

    @field({ equality : ignoreCaseCompare })
    lastName        : string

    @field({ equality : ignoreCaseCompare })
    fullName        : string

    @calculate('fullName')
    calculateFullName () : string {
        return this.firstName + ' ' + this.lastName
    }
}
```

Make sure you've overridden this config property for composite data (data which is represented by JS objects and arrays).


## Reference and reference buckets

Entities often need to reference each other. Reference and reference buckets forms the Relation part of the ChronoGraph's Entity/Relation framework.  

For example, lets check the `Book` entity, that has the `writtenBy` reference field (decorated with [[reference]]) with the `Person` type, containing a reference to its author.

```ts
class Book extends Entity.mix(Base) {
    @reference()
    writtenBy       : Person
}

const author        = Person.new({ firstName : 'Mark', lastName : 'Twain' })
const book          = Book.new({ writtenBy : author })

replica.addEntities([ author, book ])
```

This is a simplest form of a reference to another entity. To make it a bit smarter and to answer a question - "what are the books written by Mark Twain", we can use another types of fields - reference buckets, that uses [[bucket]] decorator. 

Buckets are unordered `Set` collections with all entities, referencing the entity of the bucket:

```ts
class Author extends Person {
    @bucket()
    books           : Set<Book>
}

class Book extends Entity.mix(Base) {
    @reference({ bucket : 'books' })
    writtenBy       : Author
}

const markTwain         = Author.new({ firstName : 'Mark', lastName : 'Twain' })
const tomSawyer         = Book.new({ writtenBy : markTwain })

const replica           = Replica.new()

replica.addEntities([ markTwain, tomSawyer ])

markTwain.books // new Set([ tomSawyer ])
```

The reactivity contract for buckets is preserved:

```ts
const huckleberryFinn   = Book.new({ writtenBy : markTwain })

replica.addEntities([ huckleberryFinn ])

markTwain.books // new Set([ tomSawyer, huckleberryFinn ])

tomSawyer.writtenBy     = null

markTwain.books // new Set([ huckleberryFinn ])

```

Takeaways:

- References between the entities can be established with the special kind of fields - [[reference]] and [[bucket]], with corresponding decorators.
- References are property of the [[Entity]] type (or any type that has included this mixin)  
- Buckets are unordered `Set` collections with all entities, referencing the entity of the bucket  


## Lazy and strict computations

The computations for some fields may be expensive and not actually needed in every transaction. We would like to compute such fields only at the time when their value is actually needed.

We will call such fields - "lazy" and all the other - "strict". The lazyness of the field is defined with its [[Field.lazy|lazy]] config:

```ts
class SomeClass extends Entity.mix(Base) {
    @field()
    someProperty            : number

    @field({ lazy : true })
    expensiveToCompute      : number

    @calculate('expensiveToCompute')
    calculateExpensiveToCompute () : number {
        return this.someProperty + 1
    }
}

const instance = SomeClass.new()

instance.someProperty = 10 // does not trigger computation of `expensiveToCompute`

replica.commit() // does not trigger computation of `expensiveToCompute`

instance.expensiveToCompute // computation happens on-demand 
```

Potentially changed strict fields, that haven't been read, are computed in the "commit" call.

By default all fields are strict.


## Further reading

ChronoGraph provides a lot more functionality. It supports sync/async computations, data branching, mixed computational unit and more. Continue reading to the [[AdvancedFeaturesGuide|Advanced features]] guide.


## COPYRIGHT AND LICENSE

MIT License

Copyright (c) 2018-2020 Bryntum, Nickolay Platonov
