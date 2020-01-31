ChronoGraph
===========

Chronograph is an open-source, generic, reactive computational engine, implemented in TypeScript and developed by [Bryntum]. It powers the business logic of [Bryntum Gantt](https://www.bryntum.com/examples/gantt/).

The reactive computations became a popular trend recently (popularized by React and Vue) and there's plenty of existing libraries for this purpose. However, Chronograph introduces some novel and unique features:

- Chronograph provides built-in undo/redo support, data branching and cancelable transactions. 
- Chronogrpah supports indefinitely deep data dependencies (when using generators functions).
- Chronogrpah supports asynchronous computations (when using generators functions).
- Chronogrpah supports mixed computations - computed values that accepts user input. 

For more formal introduction to Chronograph please refer to XXX.

Feature tour
------------


## Hello world

A "hello world" example for Chronograph will look like:

```ts
class Author extends Entity(Base) {
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

const replica           = MinimalReplica.new()

const author            = Author.new({ firstName : 'Mark', lastName : 'Twain' })

replica.addEntity(markTwain)

console.log(author.fullName) // "Mark Twain"
    
```

Here we define an `Author` class, as en `Entity` [mixin](https://www.bryntum.com/blog/the-mixin-pattern-in-typescript-all-you-need-to-know/), applied to the [Base](http://link_to_docs) class. The `Base` class provides a static method [new]((http://link_to_docs) which is analogous to class constructor. 
 
The `firstName`, `lastName` and `fullName` properties of the `Author` class are managed by Chronograph and called "fields". They are marked with decorator [field](http://link_to_docs). The `firstName` and `lastName` fields are regular "user input" fields and the `fullName` is a calculated field, based on their values. 

The "reactive" contract is, that whenever the value of `firstName` or `lastName` changes, the value of `fullName` is updated automatically. The update, however, only happens after the `propagate` method is called. This allows to batch several data changes into a single transaction.
 

## Reading and writing data

To read or write a field, you normally use regular property accessors:

```ts
author.firstName    = 'Moby'
author.lastName     = 'Dick'

author.propagate()

author.firstName == 'Moby'
author.fullName == 'Moby Dick'
```

For every field, there's also a generated pair of getter and setter method, with camel-cased names corresponding to field name, prefixed with `set` and `get`. Getters are equivalent to the `get` accessors seen above and setters adds a call to `propagate` (and returns a result from it).

You can override the standard write behavior by using [custom writers](http://link_to_docs).


## Undo/redo

To enable the undo/redo functionality, you need to opt-in, by specifying a value bigger than 0 for the [historyLimit](http://link_to_docs)` config, during replica creation. The config specifies how many "transactions" can be undo-ed.    

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

## Data branching


## COPYRIGHT AND LICENSE

MIT License

Copyright (c) 2018-2019 Bryntum


[Bryntum]: https://bryntum.com
