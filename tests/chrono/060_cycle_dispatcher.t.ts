import { CalculationMode, CycleDispatcher } from "../../src/chrono/CycleDispatcher.js"

declare const StartTest : any

StartTest(t => {

    const StartDate  = Symbol('StartDate')
    const EndDate    = Symbol('EndDate')
    const Duration   = Symbol('EndDate')

    class StartEndDurationDispatcher extends CycleDispatcher<symbol> {}

    let dispatcher : StartEndDurationDispatcher

    t.beforeEach(t => {

        dispatcher        = StartEndDurationDispatcher.new({
            numberOfEquations   : 1,

            variables           : new Set([ StartDate, EndDate, Duration ]),

            defaultResolution   :             new Map([
                [ StartDate, CalculationMode.CalculateProposed ],
                [ EndDate, CalculationMode.CalculatePure ],
                [ Duration, CalculationMode.CalculateProposed ]
            ])
        })
    })


    t.it('Should keep undefined state', async t => {
        const resolution    = dispatcher.getCycleResolution()

        t.isDeeply(
            resolution,
            new Map([
                [ StartDate, CalculationMode.CalculateProposed ],
                [ EndDate, CalculationMode.CalculateProposed ],
                [ Duration, CalculationMode.CalculateProposed ]
            ])
        )
    })


    t.it('Should keep partial data - start', async t => {
        dispatcher.addProposedValueFlag(StartDate)

        const resolution    = dispatcher.getCycleResolution()

        t.isDeeply(
            resolution,
            new Map([
                [ StartDate, CalculationMode.CalculateProposed ],
                [ EndDate, CalculationMode.CalculateProposed ],
                [ Duration, CalculationMode.CalculateProposed ]
            ])
        )
    })


    t.it('Should keep partial data - end', async t => {
        dispatcher.addProposedValueFlag(EndDate)

        const resolution    = dispatcher.getCycleResolution()

        t.isDeeply(
            resolution,
            new Map([
                [ StartDate, CalculationMode.CalculateProposed ],
                [ EndDate, CalculationMode.CalculateProposed ],
                [ Duration, CalculationMode.CalculateProposed ]
            ])
        )
    })


    t.it('Should keep partial data - duration', async t => {
        dispatcher.addProposedValueFlag(Duration)

        const resolution    = dispatcher.getCycleResolution()

        t.isDeeply(
            resolution,
            new Map([
                [ StartDate, CalculationMode.CalculateProposed ],
                [ EndDate, CalculationMode.CalculateProposed ],
                [ Duration, CalculationMode.CalculateProposed ]
            ])
        )
    })


    t.it('Should use default resolution when no input is given and previous values present', async t => {
        dispatcher.addPreviousValueFlag(StartDate)
        dispatcher.addPreviousValueFlag(EndDate)
        dispatcher.addPreviousValueFlag(Duration)

        const resolution    = dispatcher.getCycleResolution()

        t.isDeeply(
            resolution,
            new Map([
                [ StartDate, CalculationMode.CalculateProposed ],
                [ EndDate, CalculationMode.CalculatePure ],
                [ Duration, CalculationMode.CalculateProposed ]
            ])
        )
    })


    t.it('Should normalize end date', async t => {
        dispatcher.addProposedValueFlag(StartDate)
        dispatcher.addProposedValueFlag(Duration)

        const resolution    = dispatcher.getCycleResolution()

        t.isDeeply(
            resolution,
            new Map([
                [ StartDate, CalculationMode.CalculateProposed ],
                [ EndDate, CalculationMode.CalculatePure ],
                [ Duration, CalculationMode.CalculateProposed ]
            ])
        )
    })


    t.it('Should normalize start date', async t => {
        dispatcher.addProposedValueFlag(EndDate)
        dispatcher.addProposedValueFlag(Duration)

        const resolution    = dispatcher.getCycleResolution()

        t.isDeeply(
            resolution,
            new Map([
                [ StartDate, CalculationMode.CalculatePure ],
                [ EndDate, CalculationMode.CalculateProposed ],
                [ Duration, CalculationMode.CalculateProposed ]
            ])
        )
    })


    t.it('Should normalize duration', async t => {
        dispatcher.addProposedValueFlag(StartDate)
        dispatcher.addProposedValueFlag(EndDate)

        const resolution    = dispatcher.getCycleResolution()

        t.isDeeply(
            resolution,
            new Map([
                [ StartDate, CalculationMode.CalculateProposed ],
                [ EndDate, CalculationMode.CalculateProposed ],
                [ Duration, CalculationMode.CalculatePure ]
            ])
        )
    })


    t.it('Should calculate end date by default', async t => {
        dispatcher.addProposedValueFlag(StartDate)
        dispatcher.addProposedValueFlag(EndDate)
        dispatcher.addProposedValueFlag(Duration)

        const resolution    = dispatcher.getCycleResolution()

        t.isDeeply(
            resolution,
            new Map([
                [ StartDate, CalculationMode.CalculateProposed ],
                [ EndDate, CalculationMode.CalculatePure ],
                [ Duration, CalculationMode.CalculateProposed ]
            ])
        )
    })


    t.it('Should apply keep flags - set start date, keep duration', async t => {
        dispatcher.addPreviousValueFlag(StartDate)
        dispatcher.addPreviousValueFlag(EndDate)
        dispatcher.addPreviousValueFlag(Duration)

        dispatcher.addProposedValueFlag(StartDate)
        dispatcher.addKeepIfPossibleFlag(Duration)

        const resolution    = dispatcher.getCycleResolution()

        t.isDeeply(
            resolution,
            new Map([
                [ StartDate, CalculationMode.CalculateProposed ],
                [ EndDate, CalculationMode.CalculatePure ],
                [ Duration, CalculationMode.CalculateProposed ]
            ])
        )
    })


    t.it('Should apply keep flags, set start date, keep end date', async t => {
        dispatcher.addPreviousValueFlag(StartDate)
        dispatcher.addPreviousValueFlag(EndDate)
        dispatcher.addPreviousValueFlag(Duration)

        dispatcher.addProposedValueFlag(StartDate)
        dispatcher.addKeepIfPossibleFlag(EndDate)

        const resolution    = dispatcher.getCycleResolution()

        t.isDeeply(
            resolution,
            new Map([
                [ StartDate, CalculationMode.CalculateProposed ],
                [ EndDate, CalculationMode.CalculateProposed ],
                [ Duration, CalculationMode.CalculatePure ]
            ])
        )
    })


    t.it('Should apply keep flags in order, set start date, keep duration, keep end date', async t => {
        dispatcher.addPreviousValueFlag(StartDate)
        dispatcher.addPreviousValueFlag(EndDate)
        dispatcher.addPreviousValueFlag(Duration)

        dispatcher.addProposedValueFlag(StartDate)

        dispatcher.addKeepIfPossibleFlag(Duration)
        dispatcher.addKeepIfPossibleFlag(EndDate)

        const resolution    = dispatcher.getCycleResolution()

        t.isDeeply(
            resolution,
            new Map([
                [ StartDate, CalculationMode.CalculateProposed ],
                [ EndDate, CalculationMode.CalculatePure ],
                [ Duration, CalculationMode.CalculateProposed ]
            ])
        )
    })


    t.it('Should automatically promote variables with previous value', async t => {
        dispatcher.addPreviousValueFlag(StartDate)

        dispatcher.addProposedValueFlag(EndDate)

        dispatcher.addKeepIfPossibleFlag(Duration)

        const resolution    = dispatcher.getCycleResolution()

        t.isDeeply(
            resolution,
            new Map([
                [ StartDate, CalculationMode.CalculateProposed ],
                [ EndDate, CalculationMode.CalculateProposed ],
                [ Duration, CalculationMode.CalculatePure ]
            ])
        )
    })


})
