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


    const fixedEffortDescription = CycleDescription.new({
        variables           : new Set([ StartDateVar, EndDateVar, DurationVar, EffortVar, UnitsVar ]),
        formulas            : new Set([
            endDateByEffortFormula,
            durationFormula,
            unitsFormula,
            effortFormula,
            startDateByEffortFormula,
            startDateFormula,
            endDateFormula
        ])
    })


    const fixedEffortResolutionContext = CycleResolution.new({
        description                 : fixedEffortDescription,
        // fixed effort
        defaultResolutionFormulas   : new Set([ endDateByEffortFormula, durationFormula ])
    })


    let input : CycleResolutionInput

    t.beforeEach(t => {
        input               = CycleResolutionInput.new({ context : fixedEffortResolutionContext })
    })


    t.it('Should keep undefined state', t => {
        const resolution    = input.resolution

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
        input.addProposedValueFlag(StartDateVar)

        const resolution    = input.resolution

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
        input.addProposedValueFlag(EndDateVar)

        const resolution    = input.resolution

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
        input.addProposedValueFlag(DurationVar)

        const resolution    = input.resolution

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
        input.addProposedValueFlag(EffortVar)

        const resolution    = input.resolution

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
        input.addProposedValueFlag(UnitsVar)

        const resolution    = input.resolution

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


    t.it('Should use default resolution when no input is given and all previous values present', t => {
        input.addPreviousValueFlag(StartDateVar)
        input.addPreviousValueFlag(EndDateVar)
        input.addPreviousValueFlag(DurationVar)
        input.addPreviousValueFlag(EffortVar)
        input.addPreviousValueFlag(UnitsVar)

        const resolution    = input.resolution

        t.isDeeply(
            resolution,
            new Map([
                [ StartDateVar, CalculateProposed ],
                [ EndDateVar, endDateByEffortFormula.formulaId ],
                [ DurationVar, durationFormula.formulaId ],
                [ EffortVar, CalculateProposed ],
                [ UnitsVar, CalculateProposed ]
            ])
        )
    })


    t.it('Should use default resolution when all variables has proposed value', t => {
        input.addProposedValueFlag(StartDateVar)
        input.addProposedValueFlag(EndDateVar)
        input.addProposedValueFlag(DurationVar)
        input.addProposedValueFlag(EffortVar)
        input.addProposedValueFlag(UnitsVar)

        const resolution    = input.resolution

        t.isDeeply(
            resolution,
            new Map([
                [ StartDateVar, CalculateProposed ],
                [ EndDateVar, endDateByEffortFormula.formulaId ],
                [ DurationVar, durationFormula.formulaId ],
                [ EffortVar, CalculateProposed ],
                [ UnitsVar, CalculateProposed ]
            ])
        )
    })


    t.it('Should normalize end date', t => {
        input.addProposedValueFlag(StartDateVar)
        input.addProposedValueFlag(DurationVar)

        const resolution    = input.resolution

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
        input.addProposedValueFlag(StartDateVar)
        input.addProposedValueFlag(DurationVar)
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


    t.it('Should normalize start date', t => {
        input.addProposedValueFlag(EndDateVar)
        input.addProposedValueFlag(DurationVar)

        const resolution    = input.resolution

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
        input.addProposedValueFlag(EndDateVar)
        input.addProposedValueFlag(DurationVar)
        input.addProposedValueFlag(UnitsVar)

        const resolution    = input.resolution

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
        input.addProposedValueFlag(StartDateVar)
        input.addProposedValueFlag(EndDateVar)

        const resolution    = input.resolution

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
        input.addProposedValueFlag(StartDateVar)
        input.addProposedValueFlag(EndDateVar)
        input.addProposedValueFlag(UnitsVar)

        const resolution    = input.resolution

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
        input.addProposedValueFlag(StartDateVar)
        input.addProposedValueFlag(EndDateVar)
        input.addProposedValueFlag(DurationVar)
        input.addProposedValueFlag(EffortVar)
        input.addProposedValueFlag(UnitsVar)

        input.addKeepIfPossibleFlag(EffortVar)
        input.addKeepIfPossibleFlag(EndDateVar)

        const resolution    = input.resolution

        t.isDeeply(
            resolution,
            new Map([
                [ StartDateVar, CalculateProposed ],
                [ EndDateVar, endDateByEffortFormula.formulaId ],
                [ DurationVar, durationFormula.formulaId ],
                [ EffortVar, CalculateProposed ],
                [ UnitsVar, CalculateProposed ]
            ])
        )
    })


    t.it('Should apply keep flags - set start date, keep duration', t => {
        input.addPreviousValueFlag(StartDateVar)
        input.addPreviousValueFlag(EndDateVar)
        input.addPreviousValueFlag(DurationVar)
        input.addPreviousValueFlag(EffortVar)
        input.addPreviousValueFlag(UnitsVar)

        input.addProposedValueFlag(StartDateVar)
        input.addKeepIfPossibleFlag(DurationVar)

        const resolution    = input.resolution

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


    t.it('Should update units - set start date, keep duration, set effort', t => {
        input.addPreviousValueFlag(StartDateVar)
        input.addPreviousValueFlag(EndDateVar)
        input.addPreviousValueFlag(DurationVar)
        input.addPreviousValueFlag(EffortVar)
        input.addPreviousValueFlag(UnitsVar)

        input.addProposedValueFlag(StartDateVar)
        input.addKeepIfPossibleFlag(DurationVar)
        input.addProposedValueFlag(EffortVar)

        const resolution    = input.resolution

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


    t.it('Should update effort - set start date, keep duration, set units', t => {
        input.addPreviousValueFlag(StartDateVar)
        input.addPreviousValueFlag(EndDateVar)
        input.addPreviousValueFlag(DurationVar)
        input.addPreviousValueFlag(EffortVar)
        input.addPreviousValueFlag(UnitsVar)

        input.addProposedValueFlag(StartDateVar)
        input.addKeepIfPossibleFlag(DurationVar)
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


    t.it('Should update end date and duration - set effort', t => {
        input.addPreviousValueFlag(StartDateVar)
        input.addPreviousValueFlag(EndDateVar)
        input.addPreviousValueFlag(DurationVar)
        input.addPreviousValueFlag(EffortVar)
        input.addPreviousValueFlag(UnitsVar)

        input.addProposedValueFlag(EffortVar)

        const resolution    = input.resolution

        t.isDeeply(
            resolution,
            new Map([
                [ StartDateVar, CalculateProposed ],
                [ EndDateVar, endDateByEffortFormula.formulaId ],
                [ DurationVar, durationFormula.formulaId ],
                [ EffortVar, CalculateProposed ],
                [ UnitsVar, CalculateProposed ]
            ])
        )
    })


    t.it('Should update end date and duration - set units', t => {
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
                [ EndDateVar, endDateByEffortFormula.formulaId ],
                [ DurationVar, durationFormula.formulaId ],
                [ EffortVar, CalculateProposed ],
                [ UnitsVar, CalculateProposed ]
            ])
        )
    })



    t.it('Should apply keep flags, set start date, keep end date, keep effort', t => {
        input.addPreviousValueFlag(StartDateVar)
        input.addPreviousValueFlag(EndDateVar)
        input.addPreviousValueFlag(DurationVar)
        input.addPreviousValueFlag(EffortVar)
        input.addPreviousValueFlag(UnitsVar)

        input.addProposedValueFlag(StartDateVar)
        input.addKeepIfPossibleFlag(EndDateVar)
        input.addKeepIfPossibleFlag(EffortVar)

        const resolution    = input.resolution

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
        input.addPreviousValueFlag(StartDateVar)
        input.addPreviousValueFlag(EndDateVar)
        input.addPreviousValueFlag(DurationVar)
        input.addPreviousValueFlag(EffortVar)
        input.addPreviousValueFlag(UnitsVar)

        input.addProposedValueFlag(EndDateVar)
        input.addKeepIfPossibleFlag(DurationVar)
        input.addProposedValueFlag(UnitsVar)

        const resolution    = input.resolution

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
        input.addPreviousValueFlag(StartDateVar)
        input.addPreviousValueFlag(EffortVar)

        input.addProposedValueFlag(EndDateVar)

        input.addKeepIfPossibleFlag(DurationVar)
        input.addKeepIfPossibleFlag(UnitsVar)

        const resolution    = input.resolution

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
        input.addPreviousValueFlag(DurationVar)
        input.addPreviousValueFlag(UnitsVar)

        input.addProposedValueFlag(StartDateVar)

        input.addKeepIfPossibleFlag(EndDateVar)
        input.addKeepIfPossibleFlag(EffortVar)

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
