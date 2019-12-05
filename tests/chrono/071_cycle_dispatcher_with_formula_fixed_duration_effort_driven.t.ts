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

    const fixedDurationEffortDrivenDescription = GraphDescription.new({
        variables           : new Set([ StartDateVar, EndDateVar, DurationVar, EffortVar, UnitsVar ]),
        formulas            : new Set([
            startDateFormula,
            endDateFormula,
            durationFormula,
            unitsFormula,
            effortFormula
        ])
    })


    let dispatcher : CycleDispatcherWithFormula

    t.beforeEach(t => {

        dispatcher        = CycleDispatcherWithFormula.new({
            description                 : fixedDurationEffortDrivenDescription,
            // fixed duration, effort-driven
            defaultResolutionFormulas   : new Set([ endDateFormula, unitsFormula ])
        })
    })


    t.it('Should apply keep flags - set start date, keep duration', t => {
        dispatcher.addPreviousValueFlag(StartDateVar)
        dispatcher.addPreviousValueFlag(EndDateVar)
        dispatcher.addPreviousValueFlag(DurationVar)
        dispatcher.addPreviousValueFlag(EffortVar)
        dispatcher.addPreviousValueFlag(UnitsVar)

        dispatcher.addProposedValueFlag(EffortVar)

        const resolution    = dispatcher.resolution

        t.isDeeply(
            resolution,
            new Map([
                [ StartDateVar, CalculateProposed ],
                [ EndDateVar, endDateFormula.formulaId ],
                [ DurationVar, CalculateProposed ],
                [ EffortVar, CalculateProposed ],
                [ UnitsVar, unitsFormula.formulaId ]
            ])
        )
    })


    t.it('Should apply keep flags - set start date, keep duration', t => {
        dispatcher.addPreviousValueFlag(StartDateVar)
        dispatcher.addPreviousValueFlag(EndDateVar)
        dispatcher.addPreviousValueFlag(DurationVar)
        dispatcher.addPreviousValueFlag(EffortVar)
        dispatcher.addPreviousValueFlag(UnitsVar)

        dispatcher.addProposedValueFlag(EffortVar)

        const resolution    = dispatcher.resolution

        t.isDeeply(
            resolution,
            new Map([
                [ StartDateVar, CalculateProposed ],
                [ EndDateVar, endDateFormula.formulaId ],
                [ DurationVar, CalculateProposed ],
                [ EffortVar, CalculateProposed ],
                [ UnitsVar, unitsFormula.formulaId ]
            ])
        )
    })

})
