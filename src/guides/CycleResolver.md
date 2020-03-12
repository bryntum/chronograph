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

ChronoGraph suggest a uniformed approach to dealing with such cycles, that, when used in a disciplined way, solves the problem and keeps the code clean.


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


Cycle description
-----------------

First we need to describe this cycle in an abstract way (not tied to actual identifiers). We start by creating a [[Variable]] for each symbol in the equations. It is a `Symbol` in code too:

```ts
const StartVar           = Symbol('Start')
const EndVar             = Symbol('End')
const DurationVar        = Symbol('Duration')
```

For a full code, please refer to the `tests/replica/030_cycle_dispatcher_example.t.ts` file in the ChronoGraph package.

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

The same cycle can be resolved differently with different default formulas set. 


Cycle resolution input
-----------------

Cycle resolution is represented with [[CycleResolutionValue]] type, which maps every variable of the cycle to a formula, that should be used to calculate it. Mapping is performed by the [[formulaId]] property. 

There's a special formula id constant [[CalculateProposed]] which indicates, that this variable should not use any formula and should use the user input value, or if there's none, its previous value.

It is assumed that formula can only be "activated" if all of its input variables has some value. It can be either a value from the previous iteration, a value provided by user, or an output value of some other formula. See [[VariableInputState]] and [[CycleResolutionInput]]. Then, a formula can not be activated, if it targets a variable, that has user input (we should not overwrite user input). Also, default formulas are preferred to regular ones, if several formulas can be chosen.

Resolution is performed with the [[CycleResolution.resolve]] method, based on the information we have about the input data for the cycle variables. The results are memoized, so repeating resolution for the same input will be instantaneous.

For example, if we try to resolve the no user input scenario - a default resolution formulas should be returned (assumed there are previous value for all variables):

```ts
const input : CycleResolutionInput  = CycleResolutionInput.new({ context : cycleResolution })
input.addPreviousValueFlag(StartVar)
input.addPreviousValueFlag(EndVar)
input.addPreviousValueFlag(DurationVar)

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

We add an additional identifier, that will drive the resolution process, called - cycle dispatcher. This identifier represents the cycle as a whole and manage other identifiers of the cycle, by providing them with information about what formula they should use to calculate themselves.

It is best to inherit the dispatcher class from the [[CycleResolutionInputChrono]] which provides a convenience method [[collectInfo]]. 

```ts
class CycleDispatcher extends CycleResolutionInputChrono {
    ...
}
```

We then need the equality function, 2 dispatchers are equal if they have the same cycle resolution:

```ts
const dispatcherEq     = (v1 : CycleDispatcher, v2 : CycleDispatcher) : boolean => {
    const resolution1       = v1.resolution
    const resolution2       = v2.resolution

    return resolution1.get(StartVar) === resolution2.get(StartVar)
        && resolution1.get(EndVar) === resolution2.get(EndVar)
        && resolution1.get(DurationVar) === resolution2.get(DurationVar)
}
``` 

Dispatcher collects the information about the user input:

```ts
@calculate('dispatcher')
calculateDispatcher (Y : SyncEffectHandler) : CycleDispatcher {
    const proposedOrPrevious        = Y(ProposedOrPrevious)
    const cycleDispatcher           = CycleDispatcher.new({ 
        context : cycleResolution 
    })

    cycleDispatcher.collectInfo(Y, this.$.start, StartVar)
    cycleDispatcher.collectInfo(Y, this.$.end, EndVar)
    cycleDispatcher.collectInfo(Y, this.$.duration, DurationVar)
    // ...
    return cycleDispatcher
}
```

Although dispatcher does not use its proposed value, it still "yields" it. The proposed value for dispatcher is always the same - its a dispatcher with the default resolution:

```ts
const defaultDispatcher = CycleDispatcher.new({ context : cycleResolution })

defaultDispatcher.addPreviousValueFlag(StartVar)
defaultDispatcher.addPreviousValueFlag(EndVar)
defaultDispatcher.addPreviousValueFlag(DurationVar)
```

This is because we need to always reset the dispatcher to the default resolution, since this is a correct information flow in the absence of user input.

Based on that information, dispatcher provides cycle resolution to individual identifiers. For example, the calculation of `start` field will look like:

```ts
@calculate('start')
calculateStart (Y) : number {
    const dispatch : CycleDispatcher = this.dispatcher

    const instruction : FormulaId = dispatch.resolution.get(StartVar)

    if (instruction === startFormula.formulaId) {
        const endValue : number         = this.end
        const durationValue : number    = this.duration

        if (isNotNumber(endValue) || isNotNumber(durationValue)) return null

        return endValue - durationValue
    }
    else if (instruction === CalculateProposed) {
        return Y(ProposedOrPrevious)
    }
}
```



Conclusion
----------------

For the sake of brevity and due to the experimental status of this feature, we have omitted some code. The full code is available in the `tests/replica/030_cycle_dispatcher_example.t.ts` file of the ChronoGraph package.

Dealing with computation cycles is still an evolving area in ChronoGraph and we very much welcome feedback on it.


## COPYRIGHT AND LICENSE

MIT License

Copyright (c) 2018-2020 Bryntum, Nickolay Platonov
