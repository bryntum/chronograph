Dealing with cyclic computations in ChronoGraph
================================

Introduction
------------

Computation cycle occurs when identifiers starts referencing each other in cycle. For example:

```
const graph     = ChronoGraph.new()

const iden1     = graph.identifier(Y => Y(iden2) + 1)
const iden2     = graph.identifier(Y => Y(iden1) + 1)
``` 

The calculations from this example contradicts to each other, and calculation will never stop. This case is not solvable and ChronoGraph will just throw an exception.

However, sometimes, when calculations are not contradicting, cycle describes the invariant between the mutually depending identifiers. For example:
 
```
const iden1     = graph.identifier(Y => 10 - Y(iden2))
const iden2     = graph.identifier(Y => 10 - Y(iden1))
``` 

These calculations describe the invariant: `iden1 + iden2 === 10`. 

Lets say we want to accept user input on both `iden1` and `iden2` and additionally enforce this invariant. This a typical scenario in data processing applications, when application allows user to edit any of the variables, and all other variables adapt to the user input (or the whole operation is canceled, if some other invariant is broken).

Additionally, we want to calculate every identifier only once. 

ChronoGraph suggest a uniformed approach to dealing with such cycles, that, when used in a disciplined way, solves the problem and keeps the code clean. It is still an evolving area, so we very welcome feedback on it.


Problem formulation 
-----------------

Lets formulate our requirements on the simplified example from our Gantt implementation. 

In the Gantt chart, every task has start date (`S`), end date (`E`) and duration (`D`). The invariant between these 3 identifiers is expressed by the formula:

    E = S + D

We would like to make all three identifiers to accept user input, and the identifiers without the user input to adapt, according to the invariant.

This formula `E = S + D` will be a default cycle resolution - it should be used if there's no user input to any of the identifiers, or, if there's 
user input for all of them.

If we were writing calculation functions for these identifiers, we could start with something like: 

    E = S + D
    S = E - D
    D = E - S 
   
As you can see, this set of formulas is cyclic but not contradicting.

If user writes to the `S` and `D`, we want to only update the `E`. In the same way, if user writes to `S` and `E` we want to only update `D`.

However, if user writes only to `S`, we can update either `E` or `D`. Both choices are valid, since they don't violate the invariant, but the result is different. So we will need to provide some additional information for the writes, to manage the cycle resolution. We'll see what that means soon.


Cycle description
-----------------

First we need to describe this cycle in an abstract way (not tied to actual identifiers). We start by creating a [[Variable]] for each symbol in the equations. It is a `Symbol` in code too:

```ts
const StartVar           = Symbol('Start')
const EndVar             = Symbol('End')
const DurationVar        = Symbol('Duration')
```

Then, we describe every formula we have in the cyclic set. [[Formula]] just specifies its input variables and output variable, it does not contain actual calculation.

```ts
const startFormula       = Formula.new({
    output      : StartVar, 
    inputs      : new Set([ DurationVar, EndVar ])
})

const endFormula         = Formula.new({
    output      : EndVar,
    inputs      : new Set([ DurationVar, StartVar ])
})

const durationFormula   = Formula.new({
    output      : DurationVar,
    inputs      : new Set([ StartVar, EndVar ])
})
```

Then, we combine variables and formulas in the abstract cycle description:

```ts
const cycleDescription = CycleDescription.new({
    variables           : new Set([ StartVar, EndVar, DurationVar ]),
    formulas            : new Set([ startFormula, endFormula, durationFormula ])
})
```

And finally, we create a specific resolution, by adding default resolution formulas. Default formulas specifies how the calculation should be performed, if there's no user input
for any variable (or there's input for all of them). Also, default formulas are preferred, if several formulas can be chosen to continue the resolution.

In our simplified example, there's a single default formula: `E = S + D`, which is encoded as `endDateFormula` constant.

```ts
const cycleResolution = CycleResolution.new({
    description                 : cycleDescription,
    defaultResolutionFormulas   : new Set([ endFormula ])
})
```

As you can see, the same cycle can be resolved differently with different default formulas set. 


Cycle resolution input
-----------------

Cycle resolution is represented with [[CycleResolutionValue]] type, which maps every variable of the cycle to a formula, that should be used to calculate it. Mapping is performed by the [[formulaId]] property. 

There's a special formula id constant [[CalculateProposed]] which indicates, that this variable should not use any formula and should use the user input value, or if there's none, its previous value.

It is assumed that formula can only be "activated" if all of its input variables has some value. It can be either a value from the previous iteration, a value provided by user, or an output value of some other formula. See [[VariableInputState]] and [[CycleResolutionInput]]. Then, a formula can not be activated, if it targets a variable, that has user input (we should not overwrite user input). Also, default formulas are preferred to regular ones, if several formulas can be chosen.

Resolution is performed with the [[CycleResolution.resolve]] method, based on the information we have about the input data for the cycle variables. The results are memoized, so repeating resolution for the same input will be instantaneous.

For example, if we try to resolve the no user input scenario - a default resolution formulas should be returned:

```ts
const input : CycleResolutionInput  = CycleResolutionInput.new({ context : cycleResolution })

const resolution = cycleResolution.resolve(input)

resolution.get(StartVar) === CalculateProposed
resolution.get(EndVar) === endFormula.formulaId
resolution.get(DurationVar) === CalculateProposed
```

And if we resolve input for `S` and `E` - the `D` variable should be calculated using `durationFormula`:

```ts
const input : CycleResolutionInput  = CycleResolutionInput.new({ context : cycleResolution })

input.addProposedValueFlag(StartVar)
input.addProposedValueFlag(EndVar)

const resolution = cycleResolution.resolve(input)

resolution.get(StartVar) === CalculateProposed
resolution.get(EndVar) === CalculateProposed
resolution.get(DurationVar) === durationFormula.formulaId
```

Cycle dispatcher
----------------

Now we can use the abstract representation from above in the actual ChronoGraph identifiers.

We add an additional identifier, that will drive the resolution process, called - cycle dispatcher. This identifier represent the cycle as a whole and manage other identifiers of the cycle.









## COPYRIGHT AND LICENSE

MIT License

Copyright (c) 2018-2020 Bryntum, Nickolay Platonov
