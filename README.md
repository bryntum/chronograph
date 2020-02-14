ChronoGraph
===========

ChronoGraph is a reactive computational engine, written in the TypeScript, with the following properties already implemented:

- Entity/Relation framework
- Cancelable transactions
- O(1) undo/redo
- Computations prioritization
- Data branching
- Mixed computational unit (constant/calculated value)
- lazy/eager, sync/async computations
- Unlimited stack depth
- A disciplined approach to the cyclic computations

And the following very feasible:

- Possibility to split the whole computation into chunks (think `requestAnimationFrame`) 
- Possibility for breadth-first computation (think network latency)
- Mapping to SQL
- Mapping to GraphQL

It powers the business logic of the [Bryntum Gantt](https://www.bryntum.com/examples/gantt/advanced/)

Reactive computations became a popular trend recently, popularized by the React, Vue and Angular triade . However, all of the latter are the user interface frameworks. ChronoGraph, in contrast, focuses on the reactive computations, describing some big generic data graphs (for example Gantt project plans). It also includes the small Entity/Relation framework, which is mapped to regular ES6 classes.  

You should be able to quickly pick up the base concept of reactivity from the [Basic features](./BasicFeatures.md) guide.

To find out about the remaining (and most interesting) ChronoGraph's features, continue to the [Advanced features](./AdvancedFeatures.md) guide.


## COPYRIGHT AND LICENSE

MIT License

Copyright (c) 2018-2020 Nickolay Platonov
