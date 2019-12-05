import { CalculateProposed, CycleDispatcherWithFormula, Formula, GraphDescription } from "../../src/chrono/CycleDispatcherWithFormula.js"

declare const StartTest : any

StartTest(t => {

    const StartDateVar          = Symbol('StartDate')
    const EndDateVar            = Symbol('EndDate')
    const DurationVar           = Symbol('Duration')
    const EffortVar             = Symbol('EffortVar')
    const UnitsVar              = Symbol('UnitsVar')

    const startDateFormula  = Formula.new({
        output      : StartDateVar,
        inputs      : new Set([ DurationVar, EndDateVar ])
    })

    const endDateFormula    = Formula.new({
        output      : EndDateVar,
        inputs      : new Set([ DurationVar, StartDateVar ])
    })

    const durationFormula   = Formula.new({
        output      : DurationVar,
        inputs      : new Set([ StartDateVar, EndDateVar ])
    })

    const effortFormula  = Formula.new({
        output      : EffortVar,
        inputs      : new Set([ StartDateVar, EndDateVar, UnitsVar ])
    })

    const unitsFormula  = Formula.new({
        output      : UnitsVar,
        inputs      : new Set([ StartDateVar, EndDateVar, EffortVar ])
    })

    const endDateByEffortFormula  = Formula.new({
        output      : EndDateVar,
        inputs      : new Set([ StartDateVar, EffortVar, UnitsVar ])
    })

    const startDateByEffortFormula  = Formula.new({
        output      : StartDateVar,
        inputs      : new Set([ EndDateVar, EffortVar, UnitsVar ])
    })

    const fixedEffortDescription = GraphDescription.new({
        variables           : new Set([ StartDateVar, EndDateVar, DurationVar, EffortVar, UnitsVar ]),
        formulas            : new Set([
            endDateByEffortFormula,
            durationFormula,
            effortFormula,
            unitsFormula,
            startDateByEffortFormula,
            startDateFormula,
            endDateFormula
        ])
    })


    let dispatcher : CycleDispatcherWithFormula

    t.beforeEach(t => {

        dispatcher        = CycleDispatcherWithFormula.new({
            description                 : fixedEffortDescription,
            defaultResolutionFormulas   : new Set([ endDateFormula, endDateByEffortFormula, effortFormula ])
        })
    })


    t.it('Should update end date and effort - set units', t => {
        dispatcher.addPreviousValueFlag(StartDateVar)
        dispatcher.addPreviousValueFlag(EndDateVar)
        dispatcher.addPreviousValueFlag(DurationVar)
        dispatcher.addPreviousValueFlag(EffortVar)
        dispatcher.addPreviousValueFlag(UnitsVar)

        dispatcher.addProposedValueFlag(UnitsVar)

        const resolution    = dispatcher.resolution

        t.isDeeply(
            resolution,
            new Map([
                [ StartDateVar, CalculateProposed ],
                [ EndDateVar, endDateFormula.formulaId ],
                [ DurationVar, CalculateProposed ],
                [ EffortVar, effortFormula.formulaId ],
                [ UnitsVar, CalculateProposed ]
            ])
        )
    })

})
