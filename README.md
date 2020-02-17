ChronoGraph
===========

Chronograph is an open-source reactive computational engine, implemented in TypeScript and developed by [Bryntum](https://www.bryntum.com/). It powers the business logic of the [Bryntum Gantt](https://www.bryntum.com/examples/gantt/).

It has the following properties: 

- Cancelable transactions
- O(1) undo/redo
- lazy/eager, sync/async computations
- Data branching
- Computations prioritization
- Mixed computational unit (constant/calculated value)
- Unlimited stack depth
- A disciplined approach to the cyclic computations
- Entity/Relation framework

And these ones are very feasible:

- Possibility to split the whole computation into chunks (think `requestAnimationFrame`) 
- Possibility for breadth-first computation (think network latency)
- Mapping to SQL
- Mapping to GraphQL

Reactive computations has become a popular trend recently, popularized by the React, Vue and Angular triade . However, all of the latter are user interface frameworks. ChronoGraph, in contrast, focuses on reactive computations, describing some big generic data graphs (for example Gantt project plans). It also includes the small Entity/Relation framework, which maps to regular ES6 classes.  


Documentation
=============

You should be able to quickly pick up the base concept of reactivity from the [Basic features](./BasicFeatures.md) guide.

To find out about the remaining (and most interesting) features of ChronoGraph, continue to the [Advanced features](./AdvancedFeatures.md) guide.


## COPYRIGHT AND LICENSE

MIT License

Copyright (c) 2018-2020 Bryntum, Nickolay Platonov
