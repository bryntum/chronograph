Dealing with cyclic computations in ChronoGraph
================================

Dealing with computation cycles. Cycle dispatcher. Cycle resolver.
----------------------

Computation cycle occurs when identifiers starts referencing each other in cycle. 

The best way to deal with such situation is to avoid it.

However, computation cycles are natural way of describing invariants between the mutually depending identifiers, so sometimes its not possible to avoid them. 

ChronoGraph suggest a uniform approach to dealing with cycles, which, with disciplined usage, achieves the goal and keeps the code clean. It is still an evolving area, so we are very welcoming the feedback on it.

Below we examine a simplified example from our Gantt implementation. 

In the Gantt chart, every task has start date (`S`), end date (`E`) and duration (`D`). A natural invariant of these 3 identifiers is expressed with formula:

    E = S + D
    
We want all three identifiers to accept user input. And we want the remaining ones to adapt to that input, keeping the invariant. So, for example, if user writes to `E` and `S` we want to calculate `D`. If user writes to `S` and `D`, we want to calculate `E`, etc.
    
If we would be writing the calculation functions for these identifiers, we could start with something like: 

    E = S + D
    S = E - D
    D = E - S 
   
As you can immediately see, this set of formulas is cyclic. 

Additionally, what if user writes only to a single identifier, lets say `S`? In respond, we can either recalculate `E` and keep `D` (move the task on the timeline), or recalculate `D` and keep `E` (resize the task). Both choices are valid since they don't violate the invariant, however their semantic and result are very different. 

Because of the above, when writing to any of identifiers of the cycle, we may need to provide an additional flag, specifying the resolution option.



    
// The cycle appears because of the requirement to accept user input for all 3 identifiers, meaning //sometimes they should behave as variables and sometimes - as calculated values.





## COPYRIGHT AND LICENSE

MIT License

Copyright (c) 2018-2020 Bryntum, Nickolay Platonov
