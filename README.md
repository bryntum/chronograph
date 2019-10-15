ChronoGraph
===========

Chronograph is an open-source, generic, reactive computational engine, implemented in TypeScript and developed by [Bryntum]. It powers the business logic of [Bryntum Gantt](https://www.bryntum.com/examples/gantt/).

The reactive computations became a popular trend recently (popularized by React and Vue) and there's plenty of existing libraries for this purpose. However, Chronograph introduces some novel and unique features:

- Chronograph provides built-in undo/redo support, data branching and cancelable transactions. 
- Chronogrpah supports indefinitely deep data dependencies (when using generators functions).

For more formal introduction to Chronograph please refer to XXX.


Getting started
---------------

A simple Chronograph example will look like:

```ts
class Author extends Entity(Base) {
    @field()
    firstName       : string

    @field()
    lastName        : string

    @field()
    fullName        : string


    @calculate('fullName')
    * calculateFullName () : CalculationIterator<string> {
        return (yield this.$.firstName) + ' ' + (yield this.$.lastName)
    }
}

const author = Author.new({ firstName : 'Mark', lastName : 'Twain' })

author.propagate()

console.log(author.fullName) // "Mark Twain"
    
```

Here we define an `Author` class, in which the properties `firstName`, `lastName` and `fullName` are managed by Chronograph and called "fields". The `firstName` and `lastName` fields are "user input" fields and the `fullName` is calculated based on their values. 

The "reactive" contract is, that whenever the value of `firstName` or `lastName` changes, the value of `fullName` is updated automatically. The update, however, only happens after the `propagate` method is called. This allows to batch several data changes into a single transaction.
 

## COPYRIGHT AND LICENSE

MIT License

Copyright (c) 2018-2019 Bryntum


[Bryntum]: https://bryntum.com
