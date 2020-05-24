[//]: # (The canonical source of this file is '/docs_src/README.md')
[//]: # (Do not edit the /README.md directly)

ChronoGraph
===========

Chronograph is an open-source reactive computational engine, implemented in TypeScript and developed by [Bryntum](https://www.bryntum.com/). It powers the business logic of the [Bryntum Gantt](https://www.bryntum.com/examples/gantt/advanced).

ChronoGraph has the following features: 

- Cancelable transactions
- O(1) undo/redo
- lazy/eager, sync/async computations
- Data branching
- Mixed computational unit (user input/calculated value)
- Unlimited stack depth
- Disciplined approach to cyclic computations
- Entity/Relation framework

And the following features are very feasible:

- Possibility to split the whole computation into chunks (think `requestAnimationFrame`) 
- Possibility for breadth-first computation (think network latency)
- Mapping to SQL
- Mapping to GraphQL

Reactive computations has become a popular trend recently, popularized by the React, Vue and Angular triade. However, all of the latter are user interface frameworks. 

ChronoGraph, in contrast, focuses on reactive computations, describing some generic data graphs (for example Gantt project plans). It is designed to handle extremely large graphs - up to several hundred thousands of "atoms". It also includes the small Entity/Relation framework, which maps to regular ES6 classes.



Documentation
=============

You should be able to quickly pick up the base concept of reactivity from the [Basic features](https://bryntum.github.io/chronograph/docs/modules/_src_guides_basicfeatures_.html#basicfeaturesguide) guide.

To find out about the remaining (and most interesting) features of ChronoGraph, continue to the [Advanced features](https://bryntum.github.io/chronograph/docs/modules/_src_guides_advancedfeatures_.html#advancedfeaturesguide) guide.

Guides contains extensive references to the [API docs](https://bryntum.github.io/chronograph/docs/)

The API surface is currently intentionally small and some features are not documented. Please [reach out](https://discordapp.com/channels/681424024445780014/681424024449974316) if you need something specific.


Benchmarks
==========

ChronoGraph aims to have excellent performance. To reason about it objectively, we wrote a benchmark suite.
More details in the [Benchmarks](https://bryntum.github.io/chronograph/docs/modules/_src_guides_benchmarks_.html#benchmarksguide) guide.

Connect
=======

We welcome all feedback. Please tell us what works well in ChronoGraph, what causes troubles and what other features you would like to see in it.

[Issues tracker](https://github.com/bryntum/chronograph/issues)

Post at the [forum](https://bryntum.com/forum/viewforum.php?f=53)

Discord [live chat](https://discordapp.com/channels/681424024445780014/681424024449974316)


COPYRIGHT AND LICENSE
=================

MIT License

Copyright (c) 2018-2020 Bryntum, Nickolay Platonov
