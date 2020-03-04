import { CalculateProposed, CycleResolution, CycleResolutionInput, Formula, CycleDescription } from "../../src/cycle_resolver/CycleResolver.js"

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

    const fixedUnitsDescription = CycleDescription.new({
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


    const fixedUnitsResolutionContext = CycleResolution.new({
        description                 : fixedUnitsDescription,
        defaultResolutionFormulas   : new Set([ endDateFormula, endDateByEffortFormula, effortFormula ])
    })


    let input : CycleResolutionInput

    t.beforeEach(t => {
        input               = CycleResolutionInput.new({ context : fixedUnitsResolutionContext })
    })


    t.it('Should update end date and effort - set units', t => {
        input.addPreviousValueFlag(StartDateVar)
        input.addPreviousValueFlag(EndDateVar)
        input.addPreviousValueFlag(DurationVar)
        input.addPreviousValueFlag(EffortVar)
        input.addPreviousValueFlag(UnitsVar)

        input.addProposedValueFlag(UnitsVar)

        const resolution    = input.resolution

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
