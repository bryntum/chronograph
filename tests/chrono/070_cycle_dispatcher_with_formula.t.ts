import { CalculateProposed, CycleDispatcherWithFormula, Formula, GraphDescription } from "../../src/chrono/CycleDispatcherWithFormula.js"

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


    const description       = GraphDescription.new({
        variables           : new Set([ StartDate, EndDate, Duration ]),
        formulas            : new Set([ startDateFormula, endDateFormula, durationFormula ])
    })


    let dispatcher : CycleDispatcherWithFormula

    t.beforeEach(t => {

        dispatcher        = CycleDispatcherWithFormula.new({
            description,
            defaultResolutionFormulas : new Set([ endDateFormula ])
        })
    })


    t.it('Should keep undefined state', t => {
        const resolution    = dispatcher.resolution

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
        dispatcher.addProposedValueFlag(StartDate)

        const resolution    = dispatcher.resolution

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
        dispatcher.addProposedValueFlag(EndDate)

        const resolution    = dispatcher.resolution

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
        dispatcher.addProposedValueFlag(Duration)

        const resolution    = dispatcher.resolution

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
        dispatcher.addPreviousValueFlag(StartDate)
        dispatcher.addPreviousValueFlag(EndDate)
        dispatcher.addPreviousValueFlag(Duration)

        const resolution    = dispatcher.resolution

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
        dispatcher.addProposedValueFlag(StartDate)
        dispatcher.addProposedValueFlag(Duration)

        const resolution    = dispatcher.resolution

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
        dispatcher.addProposedValueFlag(EndDate)
        dispatcher.addProposedValueFlag(Duration)

        const resolution    = dispatcher.resolution

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
        dispatcher.addProposedValueFlag(StartDate)
        dispatcher.addProposedValueFlag(EndDate)

        const resolution    = dispatcher.resolution

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
        dispatcher.addProposedValueFlag(StartDate)
        dispatcher.addProposedValueFlag(EndDate)
        dispatcher.addProposedValueFlag(Duration)

        const resolution    = dispatcher.resolution

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
        dispatcher.addPreviousValueFlag(StartDate)
        dispatcher.addPreviousValueFlag(EndDate)
        dispatcher.addPreviousValueFlag(Duration)

        dispatcher.addProposedValueFlag(StartDate)
        dispatcher.addKeepIfPossibleFlag(Duration)

        const resolution    = dispatcher.resolution

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
        dispatcher.addPreviousValueFlag(StartDate)
        dispatcher.addPreviousValueFlag(EndDate)
        dispatcher.addPreviousValueFlag(Duration)

        dispatcher.addProposedValueFlag(StartDate)
        dispatcher.addKeepIfPossibleFlag(EndDate)

        const resolution    = dispatcher.resolution

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
        dispatcher.addPreviousValueFlag(StartDate)
        dispatcher.addPreviousValueFlag(EndDate)
        dispatcher.addPreviousValueFlag(Duration)

        dispatcher.addProposedValueFlag(EndDate)
        dispatcher.addKeepIfPossibleFlag(Duration)

        const resolution    = dispatcher.resolution

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
        dispatcher.addPreviousValueFlag(StartDate)
        dispatcher.addPreviousValueFlag(EndDate)
        dispatcher.addPreviousValueFlag(Duration)

        dispatcher.addProposedValueFlag(EndDate)
        dispatcher.addKeepIfPossibleFlag(StartDate)

        const resolution    = dispatcher.resolution

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
        dispatcher.addPreviousValueFlag(StartDate)
        dispatcher.addPreviousValueFlag(EndDate)
        dispatcher.addPreviousValueFlag(Duration)

        dispatcher.addProposedValueFlag(StartDate)
        dispatcher.addKeepIfPossibleFlag(Duration)

        const resolution    = dispatcher.resolution

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
        dispatcher.addPreviousValueFlag(StartDate)
        dispatcher.addPreviousValueFlag(EndDate)
        dispatcher.addPreviousValueFlag(Duration)

        dispatcher.addProposedValueFlag(StartDate)
        dispatcher.addKeepIfPossibleFlag(EndDate)

        const resolution    = dispatcher.resolution

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
        dispatcher.addPreviousValueFlag(StartDate)

        dispatcher.addProposedValueFlag(EndDate)

        dispatcher.addKeepIfPossibleFlag(Duration)

        const resolution    = dispatcher.resolution

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
        dispatcher.addPreviousValueFlag(Duration)

        dispatcher.addProposedValueFlag(StartDate)

        dispatcher.addKeepIfPossibleFlag(EndDate)

        const resolution    = dispatcher.resolution

        t.isDeeply(
            resolution,
            new Map([
                [ StartDate, CalculateProposed ],
                [ EndDate, endDateFormula.formulaId ],
                [ Duration, CalculateProposed ]
            ])
        )
    })

})
