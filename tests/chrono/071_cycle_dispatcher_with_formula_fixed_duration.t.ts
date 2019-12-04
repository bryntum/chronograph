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


    const fixedDurationDescription = GraphDescription.new({
        variables           : new Set([ StartDateVar, EndDateVar, DurationVar, EffortVar, UnitsVar ]),
        formulas            : new Set([
            startDateFormula,
            endDateFormula,
            durationFormula,
            unitsFormula,
            effortFormula,
        ])
    })


    let dispatcher : CycleDispatcherWithFormula

    t.beforeEach(t => {

        dispatcher        = CycleDispatcherWithFormula.new({
            description                 : fixedDurationDescription,
            // fixed duration, non effort-driven
            defaultResolutionFormulas   : new Set([ endDateFormula, effortFormula ])
        })
    })


    t.it('Should keep undefined state', t => {
        const resolution    = dispatcher.resolution

        t.isDeeply(
            resolution,
            new Map([
                [ StartDateVar, CalculateProposed ],
                [ EndDateVar, CalculateProposed ],
                [ DurationVar, CalculateProposed ],
                [ EffortVar, CalculateProposed ],
                [ UnitsVar, CalculateProposed ]
            ])
        )
    })


    t.it('Should keep partial data - start', t => {
        dispatcher.addProposedValueFlag(StartDateVar)

        const resolution    = dispatcher.resolution

        t.isDeeply(
            resolution,
            new Map([
                [ StartDateVar, CalculateProposed ],
                [ EndDateVar, CalculateProposed ],
                [ DurationVar, CalculateProposed ],
                [ EffortVar, CalculateProposed ],
                [ UnitsVar, CalculateProposed ]
            ])
        )
    })


    t.it('Should keep partial data - end', t => {
        dispatcher.addProposedValueFlag(EndDateVar)

        const resolution    = dispatcher.resolution

        t.isDeeply(
            resolution,
            new Map([
                [ StartDateVar, CalculateProposed ],
                [ EndDateVar, CalculateProposed ],
                [ DurationVar, CalculateProposed ],
                [ EffortVar, CalculateProposed ],
                [ UnitsVar, CalculateProposed ]
            ])
        )
    })


    t.it('Should keep partial data - duration', t => {
        dispatcher.addProposedValueFlag(DurationVar)

        const resolution    = dispatcher.resolution

        t.isDeeply(
            resolution,
            new Map([
                [ StartDateVar, CalculateProposed ],
                [ EndDateVar, CalculateProposed ],
                [ DurationVar, CalculateProposed ],
                [ EffortVar, CalculateProposed ],
                [ UnitsVar, CalculateProposed ]
            ])
        )
    })


    t.it('Should keep partial data - effort', t => {
        dispatcher.addProposedValueFlag(EffortVar)

        const resolution    = dispatcher.resolution

        t.isDeeply(
            resolution,
            new Map([
                [ StartDateVar, CalculateProposed ],
                [ EndDateVar, CalculateProposed ],
                [ DurationVar, CalculateProposed ],
                [ EffortVar, CalculateProposed ],
                [ UnitsVar, CalculateProposed ]
            ])
        )
    })


    t.it('Should keep partial data - units', t => {
        dispatcher.addProposedValueFlag(UnitsVar)

        const resolution    = dispatcher.resolution

        t.isDeeply(
            resolution,
            new Map([
                [ StartDateVar, CalculateProposed ],
                [ EndDateVar, CalculateProposed ],
                [ DurationVar, CalculateProposed ],
                [ EffortVar, CalculateProposed ],
                [ UnitsVar, CalculateProposed ]
            ])
        )
    })


    t.it('Should use default resolution when no input is given and previous values present', t => {
        dispatcher.addPreviousValueFlag(StartDateVar)
        dispatcher.addPreviousValueFlag(EndDateVar)
        dispatcher.addPreviousValueFlag(DurationVar)
        dispatcher.addPreviousValueFlag(EffortVar)
        dispatcher.addPreviousValueFlag(UnitsVar)

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


    t.it('Should normalize end date', t => {
        dispatcher.addProposedValueFlag(StartDateVar)
        dispatcher.addProposedValueFlag(DurationVar)

        const resolution    = dispatcher.resolution

        t.isDeeply(
            resolution,
            new Map([
                [ StartDateVar, CalculateProposed ],
                [ EndDateVar, endDateFormula.formulaId ],
                [ DurationVar, CalculateProposed ],
                [ EffortVar, CalculateProposed ],
                [ UnitsVar, CalculateProposed ]
            ])
        )
    })


    t.it('Should normalize end date and effort', t => {
        dispatcher.addProposedValueFlag(StartDateVar)
        dispatcher.addProposedValueFlag(DurationVar)
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


    t.it('Should normalize start date', t => {
        dispatcher.addProposedValueFlag(EndDateVar)
        dispatcher.addProposedValueFlag(DurationVar)

        const resolution    = dispatcher.resolution

        t.isDeeply(
            resolution,
            new Map([
                [ StartDateVar, startDateFormula.formulaId ],
                [ EndDateVar, CalculateProposed ],
                [ DurationVar, CalculateProposed ],
                [ EffortVar, CalculateProposed ],
                [ UnitsVar, CalculateProposed ]
            ])
        )
    })


    t.it('Should normalize start date and effort', t => {
        dispatcher.addProposedValueFlag(EndDateVar)
        dispatcher.addProposedValueFlag(DurationVar)
        dispatcher.addProposedValueFlag(UnitsVar)

        const resolution    = dispatcher.resolution

        t.isDeeply(
            resolution,
            new Map([
                [ StartDateVar, startDateFormula.formulaId ],
                [ EndDateVar, CalculateProposed ],
                [ DurationVar, CalculateProposed ],
                [ EffortVar, effortFormula.formulaId ],
                [ UnitsVar, CalculateProposed ]
            ])
        )
    })


    t.it('Should normalize duration', t => {
        dispatcher.addProposedValueFlag(StartDateVar)
        dispatcher.addProposedValueFlag(EndDateVar)

        const resolution    = dispatcher.resolution

        t.isDeeply(
            resolution,
            new Map([
                [ StartDateVar, CalculateProposed ],
                [ EndDateVar, CalculateProposed ],
                [ DurationVar, durationFormula.formulaId ],
                [ EffortVar, CalculateProposed ],
                [ UnitsVar, CalculateProposed ]
            ])
        )
    })


    t.it('Should normalize duration and effort', t => {
        dispatcher.addProposedValueFlag(StartDateVar)
        dispatcher.addProposedValueFlag(EndDateVar)
        dispatcher.addProposedValueFlag(UnitsVar)

        const resolution    = dispatcher.resolution

        t.isDeeply(
            resolution,
            new Map([
                [ StartDateVar, CalculateProposed ],
                [ EndDateVar, CalculateProposed ],
                [ DurationVar, durationFormula.formulaId ],
                [ EffortVar, effortFormula.formulaId ],
                [ UnitsVar, CalculateProposed ]
            ])
        )
    })


    t.it("Should calculate end date and effort when there's input on all variables", t => {
        dispatcher.addProposedValueFlag(StartDateVar)
        dispatcher.addProposedValueFlag(EndDateVar)
        dispatcher.addProposedValueFlag(DurationVar)
        dispatcher.addProposedValueFlag(EffortVar)
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


    t.it('Should apply keep flags - set start date, keep duration', t => {
        dispatcher.addPreviousValueFlag(StartDateVar)
        dispatcher.addPreviousValueFlag(EndDateVar)
        dispatcher.addPreviousValueFlag(DurationVar)
        dispatcher.addPreviousValueFlag(EffortVar)
        dispatcher.addPreviousValueFlag(UnitsVar)

        dispatcher.addProposedValueFlag(StartDateVar)
        dispatcher.addKeepIfPossibleFlag(DurationVar)

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


    t.it('Should update units - set start date, keep duration, set effort', t => {
        dispatcher.addPreviousValueFlag(StartDateVar)
        dispatcher.addPreviousValueFlag(EndDateVar)
        dispatcher.addPreviousValueFlag(DurationVar)
        dispatcher.addPreviousValueFlag(EffortVar)
        dispatcher.addPreviousValueFlag(UnitsVar)

        dispatcher.addProposedValueFlag(StartDateVar)
        dispatcher.addKeepIfPossibleFlag(DurationVar)
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


    t.it('Should apply keep flags, set start date, keep end date, keep effort', t => {
        dispatcher.addPreviousValueFlag(StartDateVar)
        dispatcher.addPreviousValueFlag(EndDateVar)
        dispatcher.addPreviousValueFlag(DurationVar)
        dispatcher.addPreviousValueFlag(EffortVar)
        dispatcher.addPreviousValueFlag(UnitsVar)

        dispatcher.addProposedValueFlag(StartDateVar)
        dispatcher.addKeepIfPossibleFlag(EndDateVar)
        dispatcher.addKeepIfPossibleFlag(EffortVar)

        const resolution    = dispatcher.resolution

        t.isDeeply(
            resolution,
            new Map([
                [ StartDateVar, CalculateProposed ],
                [ EndDateVar, CalculateProposed ],
                [ DurationVar, durationFormula.formulaId ],
                [ EffortVar, CalculateProposed ],
                [ UnitsVar, unitsFormula.formulaId ]
            ])
        )
    })


    t.it('Should apply keep flags, set end date, keep duration', t => {
        dispatcher.addPreviousValueFlag(StartDateVar)
        dispatcher.addPreviousValueFlag(EndDateVar)
        dispatcher.addPreviousValueFlag(DurationVar)
        dispatcher.addPreviousValueFlag(EffortVar)
        dispatcher.addPreviousValueFlag(UnitsVar)

        dispatcher.addProposedValueFlag(EndDateVar)
        dispatcher.addKeepIfPossibleFlag(DurationVar)
        dispatcher.addProposedValueFlag(UnitsVar)

        const resolution    = dispatcher.resolution

        t.isDeeply(
            resolution,
            new Map([
                [ StartDateVar, startDateFormula.formulaId ],
                [ EndDateVar, CalculateProposed ],
                [ DurationVar, CalculateProposed ],
                [ EffortVar, effortFormula.formulaId ],
                [ UnitsVar, CalculateProposed ]
            ])
        )
    })


    t.it('Should automatically promote variables with previous value #1', t => {
        dispatcher.addPreviousValueFlag(StartDateVar)
        dispatcher.addPreviousValueFlag(EffortVar)

        dispatcher.addProposedValueFlag(EndDateVar)

        dispatcher.addKeepIfPossibleFlag(DurationVar)
        dispatcher.addKeepIfPossibleFlag(UnitsVar)

        const resolution    = dispatcher.resolution

        t.isDeeply(
            resolution,
            new Map([
                [ StartDateVar, CalculateProposed ],
                [ EndDateVar, CalculateProposed ],
                [ DurationVar, durationFormula.formulaId ],
                [ EffortVar, CalculateProposed ],
                [ UnitsVar, unitsFormula.formulaId ]
            ])
        )
    })


    t.it('Should automatically promote variables with previous value #2', t => {
        dispatcher.addPreviousValueFlag(DurationVar)
        dispatcher.addPreviousValueFlag(UnitsVar)

        dispatcher.addProposedValueFlag(StartDateVar)

        dispatcher.addKeepIfPossibleFlag(EndDateVar)
        dispatcher.addKeepIfPossibleFlag(EffortVar)

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
