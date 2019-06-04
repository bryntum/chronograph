export function* uniqueOnly<Element> (iterator : IterableIterator<Element>) {
    const seen      = new Set<Element>()

    for (const el of iterator) {
        if (!seen.has(el)) {
            seen.add(el)

            yield el
        }
    }
}


