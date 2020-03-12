import { CalculateProposed, CycleResolution, CycleResolutionInput, Formula, CycleDescription } from "../../src/cycle_resolver/CycleResolver.js"

declare const StartTest : any

StartTest(t => {

    const StartDate         = Symbol('StartDate')
    const EndDate           = Symbol('EndDate')
    const Duration          = Symbol('Duration')

    const startDateFormula  = Formula.new({
        output      : StartDate,
        inputs      : new Set([ Duration, EndDate ])
    })

    const endDateFormula    = Formula.new({
        output      : EndDate,
        inputs      : new Set([ Duration, StartDate ])
    })

    const durationFormula   = Formula.new({
        output      : Duration,
        inputs      : new Set([ StartDate, EndDate ])
    })


    const description       = CycleDescription.new({
        variables           : new Set([ StartDate, EndDate, Duration ]),
        formulas            : new Set([ startDateFormula, endDateFormula, durationFormula ])
    })

    const resolutionContext = CycleResolution.new({
        description                 : description,
        defaultResolutionFormulas   : new Set([ endDateFormula ])
    })

    let input : CycleResolutionInput

    t.beforeEach(t => {
        input               = CycleResolutionInput.new({ context : resolutionContext })
    })


    t.it('Should keep undefined state', t => {
        const resolution    = input.resolution

        t.isDeeply(
            resolution,
            new Map([
                [ StartDate, CalculateProposed ],
                [ EndDate, CalculateProposed ],
                [ Duration, CalculateProposed ]
            ])
        )
    })


    t.it('Should keep partial data - start', t => {
        input.addProposedValueFlag(StartDate)

        const resolution    = input.resolution

        t.isDeeply(
            resolution,
            new Map([
                [ StartDate, CalculateProposed ],
                [ EndDate, CalculateProposed ],
                [ Duration, CalculateProposed ]
            ])
        )
    })


    t.it('Should keep partial data - end', t => {
        input.addProposedValueFlag(EndDate)

        const resolution    = input.resolution

        t.isDeeply(
            resolution,
            new Map([
                [ StartDate, CalculateProposed ],
                [ EndDate, CalculateProposed ],
                [ Duration, CalculateProposed ]
            ])
        )
    })


    t.it('Should keep partial data - duration', t => {
        input.addProposedValueFlag(Duration)

        const resolution    = input.resolution

        t.isDeeply(
            resolution,
            new Map([
                [ StartDate, CalculateProposed ],
                [ EndDate, CalculateProposed ],
                [ Duration, CalculateProposed ]
            ])
        )
    })


    t.it('Should use default resolution when no input is given and previous values present', t => {
        input.addPreviousValueFlag(StartDate)
        input.addPreviousValueFlag(EndDate)
        input.addPreviousValueFlag(Duration)

        const resolution    = input.resolution

        t.isDeeply(
            resolution,
            new Map([
                [ StartDate, CalculateProposed ],
                [ EndDate, endDateFormula.formulaId ],
                [ Duration, CalculateProposed ]
            ])
        )
    })


    t.it('Should normalize end date', t => {
        input.addProposedValueFlag(StartDate)
        input.addProposedValueFlag(Duration)

        const resolution    = input.resolution

        t.isDeeply(
            resolution,
            new Map([
                [ StartDate, CalculateProposed ],
                [ EndDate, endDateFormula.formulaId ],
                [ Duration, CalculateProposed ]
            ])
        )
    })


    t.it('Should normalize start date', t => {
        input.addProposedValueFlag(EndDate)
        input.addProposedValueFlag(Duration)

        const resolution    = input.resolution

        t.isDeeply(
            resolution,
            new Map([
                [ StartDate, startDateFormula.formulaId ],
                [ EndDate, CalculateProposed ],
                [ Duration, CalculateProposed ]
            ])
        )
    })


    t.it('Should normalize duration', t => {
        input.addProposedValueFlag(StartDate)
        input.addProposedValueFlag(EndDate)

        const resolution    = input.resolution

        t.isDeeply(
            resolution,
            new Map([
                [ StartDate, CalculateProposed ],
                [ EndDate, CalculateProposed ],
                [ Duration, durationFormula.formulaId ]
            ])
        )
    })


    t.it('Should calculate end date by default', t => {
        input.addProposedValueFlag(StartDate)
        input.addProposedValueFlag(EndDate)
        input.addProposedValueFlag(Duration)

        const resolution    = input.resolution

        t.isDeeply(
            resolution,
            new Map([
                [ StartDate, CalculateProposed ],
                [ EndDate, endDateFormula.formulaId ],
                [ Duration, CalculateProposed ]
            ])
        )
    })


    t.it('Should apply keep flags - set start date, keep duration', t => {
        input.addPreviousValueFlag(StartDate)
        input.addPreviousValueFlag(EndDate)
        input.addPreviousValueFlag(Duration)

        input.addProposedValueFlag(StartDate)
        input.addKeepIfPossibleFlag(Duration)

        const resolution    = input.resolution

        t.isDeeply(
            resolution,
            new Map([
                [ StartDate, CalculateProposed ],
                [ EndDate, endDateFormula.formulaId ],
                [ Duration, CalculateProposed ]
            ])
        )
    })


    t.it('Should apply keep flags, set start date, keep end date', t => {
        input.addPreviousValueFlag(StartDate)
        input.addPreviousValueFlag(EndDate)
        input.addPreviousValueFlag(Duration)

        input.addProposedValueFlag(StartDate)
        input.addKeepIfPossibleFlag(EndDate)

        const resolution    = input.resolution

        t.isDeeply(
            resolution,
            new Map([
                [ StartDate, CalculateProposed ],
                [ EndDate, CalculateProposed ],
                [ Duration, durationFormula.formulaId ]
            ])
        )
    })


    t.it('Should apply keep flags, set end date, keep duration', t => {
        input.addPreviousValueFlag(StartDate)
        input.addPreviousValueFlag(EndDate)
        input.addPreviousValueFlag(Duration)

        input.addProposedValueFlag(EndDate)
        input.addKeepIfPossibleFlag(Duration)

        const resolution    = input.resolution

        t.isDeeply(
            resolution,
            new Map([
                [ StartDate, startDateFormula.formulaId ],
                [ EndDate, CalculateProposed ],
                [ Duration, CalculateProposed ]
            ])
        )
    })


    t.it('Should apply keep flags, set end date, keep start date', t => {
        input.addPreviousValueFlag(StartDate)
        input.addPreviousValueFlag(EndDate)
        input.addPreviousValueFlag(Duration)

        input.addProposedValueFlag(EndDate)
        input.addKeepIfPossibleFlag(StartDate)

        const resolution    = input.resolution

        t.isDeeply(
            resolution,
            new Map([
                [ StartDate, CalculateProposed ],
                [ EndDate, CalculateProposed ],
                [ Duration, durationFormula.formulaId ]
            ])
        )
    })


    t.it('Should apply keep flags, set start date, keep duration', t => {
        input.addPreviousValueFlag(StartDate)
        input.addPreviousValueFlag(EndDate)
        input.addPreviousValueFlag(Duration)

        input.addProposedValueFlag(StartDate)
        input.addKeepIfPossibleFlag(Duration)

        const resolution    = input.resolution

        t.isDeeply(
            resolution,
            new Map([
                [ StartDate, CalculateProposed ],
                [ EndDate, endDateFormula.formulaId ],
                [ Duration, CalculateProposed ]
            ])
        )
    })


    t.it('Should apply keep flags, set start date, keep end date', t => {
        input.addPreviousValueFlag(StartDate)
        input.addPreviousValueFlag(EndDate)
        input.addPreviousValueFlag(Duration)

        input.addProposedValueFlag(StartDate)
        input.addKeepIfPossibleFlag(EndDate)

        const resolution    = input.resolution

        t.isDeeply(
            resolution,
            new Map([
                [ StartDate, CalculateProposed ],
                [ EndDate, CalculateProposed ],
                [ Duration, durationFormula.formulaId ]
            ])
        )
    })



    t.it('Should automatically promote variables with previous value #1', t => {
        input.addPreviousValueFlag(StartDate)

        input.addProposedValueFlag(EndDate)

        input.addKeepIfPossibleFlag(Duration)

        const resolution    = input.resolution

        t.isDeeply(
            resolution,
            new Map([
                [ StartDate, CalculateProposed ],
                [ EndDate, CalculateProposed ],
                [ Duration, durationFormula.formulaId ]
            ])
        )
    })


    t.it('Should automatically promote variables with previous value #2', t => {
        input.addPreviousValueFlag(Duration)

        input.addProposedValueFlag(StartDate)

        input.addKeepIfPossibleFlag(EndDate)

        const resolution    = input.resolution

        t.isDeeply(
            resolution,
            new Map([
                [ StartDate, CalculateProposed ],
                [ EndDate, endDateFormula.formulaId ],
                [ Duration, CalculateProposed ]
            ])
        )
    })


    t.it('Should prefer overwriting `keepIfPossible` over overwriting `proposedValue`', t => {
        input.addPreviousValueFlag(Duration)
        input.addPreviousValueFlag(StartDate)
        input.addPreviousValueFlag(EndDate)

        input.addProposedValueFlag(EndDate)
        input.addProposedValueFlag(Duration)

        input.addKeepIfPossibleFlag(StartDate)

        const resolution    = input.resolution

        t.isDeeply(
            resolution,
            new Map([
                [ StartDate, startDateFormula.formulaId ],
                [ EndDate, CalculateProposed ],
                [ Duration, CalculateProposed ]
            ])
        )
    })

})
