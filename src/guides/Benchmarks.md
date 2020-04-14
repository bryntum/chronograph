ChronoGraph benchmarks
======================

ChronoGraph aims to have excellent performance. To reason about it objectively, we wrote a benchmark suite.

To run it, clone the repository, then run the following command in the package directory:

```plaintext
> npm i
> npx tsc
> node -r esm ./tests/benchmark/suite.js --expose-gc
```

We currently benchmark the following:

- `Deep graph changes - generators`<br>
  A graph with 1000 nodes, every node except few initial ones depends on 4 preceding nodes. Nodes uses generators functions. 
  A change is performed in one of the initial nodes, which affects the whole graph.
- `Deep graph changes - synchronous`<br>
  A graph with 1000 nodes, every node except few initial ones depends on 4 preceding nodes. Nodes uses synchronous functions.
  A change is performed in one of the initial nodes, which affects the whole graph.
- `Deep graph changes - Mobx`<br>
  A graph with 1000 nodes, every node except few initial ones depends on 4 preceding nodes. Nodes uses synchronous functions.
  A change is performed in one of the initial nodes, which affects the whole graph. We forcefully read from all nodes,
  because it seems the `keepAlive` option (which is an analog of strict identifier in ChronoGraph) in Mobx does not work.
  
  The numbers are not in ChronoGraph favor, yet. We'll be working on improving the results. 
  Consider that Mobx is at version 5 and ChronoGraph at 1. Mobx also does not support the immutability (undo/redo, data branching), 
  unlimited stack depth and asynchronous calculations.
- `Deep graph changes - generators big`<br>
  A graph with 100000 nodes, every node except few initial ones depends on 4 preceding nodes. Nodes uses generator functions.
  A change is performed in one of the initial nodes, which affects the whole graph.
  Mobx does not support the dependency chains of this length, so no comparable number.
- `Deep graph changes - generators big, shared identifiers`<br>
  A graph with 100000 nodes, every node except few initial ones depends on 4 preceding nodes. Nodes uses generator functions.
  A change is performed in one of the initial nodes, which affects the whole graph.
  Nodes with the same calculation functions uses shared "meta" instance. This optimization is already implemented in the [[Replica]] layer.
- `Shallow graph changes - generators`<br>
  A graph with 1000 nodes, every node except few initial ones depends on 4 preceding nodes. Nodes uses generator functions.
  A change is performed in one of the initial nodes, which affects only few initial nodes.
- `Shallow graph changes - synchronous`<br>
  A graph with 1000 nodes, every node except few initial ones depends on 4 preceding nodes. Nodes uses synchronous functions.
  A change is performed in one of the initial nodes, which affects only few initial nodes.
- `Shallow graph changes - Mobx`<br>
  A graph with 1000 nodes, every node except few initial ones depends on 4 preceding nodes. Nodes uses synchronous functions.
  A change is performed in one of the initial nodes, which affects only few initial nodes.
- `Shallow graph changes - generators big`<br>
  A graph with 100000 nodes, every node except few initial ones depends on 4 preceding nodes. Nodes uses synchronous functions.
  A change is performed in one of the initial nodes, which affects only few initial nodes.
- `Graph population 100k - generators`<br>
  Instantiation of graph with 100000 identifiers, using generator functions.
- `Graph population 100k - generators`<br>
  Instantiation of graph with 100000 identifiers, using synchronous functions.
- `Graph population 100k - Mobx`<br>
  Instantiation of graph with 100000 identifiers, using synchronous functions.
- `Replica population 125k`<br>
  Instantiation of replica with 5000 entities, each with 25 fields (125000) identifiers, using synchronous functions.

Some reference numbers (results will be different on your machine):

```plaintext
Deep graph changes - generators: 2.692ms ±0.009
Deep graph changes - synchronous: 2.588ms ±0.068
Deep graph changes - Mobx: 1.46ms ±0.034
Deep graph changes - generators big: 455.75ms ±5.82
Deep graph changes - generators big, shared identifiers: 343.545ms ±8.687
Shallow graph changes - generators: 1.919ms ±0.009
Shallow graph changes - synchronous: 2.086ms ±0.019
Shallow graph changes - Mobx: 0.441ms ±0.021
Shallow graph changes - generators big: 245.464ms ±6.417
Graph population 100k - generators: 154.15ms ±4.198
Graph population 100k - synchronous: 147.143ms ±4.751
Graph population 100k - Mobx: 188.278ms ±7.598
Replica population 125k: 229.583ms ±9.558
```


## COPYRIGHT AND LICENSE

MIT License

Copyright (c) 2018-2020 Bryntum, Nickolay Platonov
