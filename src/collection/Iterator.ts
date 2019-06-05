export function* uniqueOnly<Element> (iterator : IterableIterator<Element>) {
    const seen      = new Set<Element>()

    for (const el of iterator) {
        if (!seen.has(el)) {
            seen.add(el)

            yield el
        }
    }
}


export function* reverse<Element> (iterator : IterableIterator<Element>) {
    const all       = Array.from(iterator)

    for (let i = all.length - 1; i >= 0; i--) yield all[ i ]
}


export function* takeWhile<Element> (iterator : IterableIterator<Element>, func : (el : Element) => boolean) {

    for (const el of iterator) {
        if (func(el))
            yield el
        else
            return
    }
}


export function* takeUntilIncluding<Element> (iterator : IterableIterator<Element>, func : (el : Element) => boolean) {

    for (const el of iterator) {
        yield el

        if (func(el)) return
    }
}


export function* takeUntilExcluding<Element> (iterator : IterableIterator<Element>, func : (el : Element) => boolean) {

    for (const el of iterator) {
        if (func(el)) return

        yield el
    }
}



export function* concat<Element> (...iterators : IterableIterator<Element>[]) {
    for (let i = 0; i < iterators.length; i++) yield* iterators[ i ]
}


