/*
**  SIMO -- Simple Mutable Objects with Change Tracking
**  Copyright (c) 2020 Dr. Ralf S. Engelschall <rse@engelschall.com>
**
**  Permission is hereby granted, free of charge, to any person obtaining
**  a copy of this software and associated documentation files (the
**  "Software"), to deal in the Software without restriction, including
**  without limitation the rights to use, copy, modify, merge, publish,
**  distribute, sublicense, and/or sell copies of the Software, and to
**  permit persons to whom the Software is furnished to do so, subject to
**  the following conditions:
**
**  The above copyright notice and this permission notice shall be included
**  in all copies or substantial portions of the Software.
**
**  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
**  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
**  MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
**  IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
**  CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
**  TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
**  SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/

module.exports = (ctx) => {
    /*  define Proxy handler for Objects  */
    const handler = {
        /*  trap property read  */
        get (target, property, receiver) {
            ctx.emit("debug", "handler: map: get", target, property, receiver)

            /*  short-circuit any-level internal target access  */
            if (property === ctx.TARGET)
                return target

            /*  short-circuit top-level methods  */
            if (   typeof property === "symbol"
                && ctx.methods[property] !== undefined
                && ctx.cache.path.get(target) === "")
                return ctx.methods[property]

            /*  support iteration  */
            if (property === Symbol.iterator) {
                return () => {
                    const iter = target[Symbol.iterator]()
                    return {
                        next: () => {
                            const result = iter.next()
                            if (!result.done)
                                result.value[1] = ctx.coveringProxy(result.value[1], target, result.value[0])
                            return result
                        }
                    }
                }
            }

            /*  get the value of the underlying Map/WeakMap object  */
            const value = Reflect.get(target, property, receiver)

            /*  on-the-fly cover the value  */
            if (typeof value === "function")
                return ctx.coveringProxy(value, target, property, handler)
            else
                return ctx.coveringProxy(value, target, property)
        },

        /*  trap property write  */
        set (target, property, value, receiver) {
            ctx.emit("debug", "handler: map: set", target, property, value, receiver)

            /*  fetch the old value  */
            const valueOld = target[property]

            /*  optionally fetch target object of proxy object for new value  */
            if (value && typeof value === "object" && value[ctx.TARGET] !== undefined)
                value = value[ctx.TARGET]

            /*  pass-through operation  */
            const result = Reflect.set(target, property, value)

            /*  handle change if value has really changed  */
            if (!ctx.uncovered && !Object.is(valueOld, value))
                ctx.emit("change", ctx.concatPath(ctx.cache.path.get(target), property), valueOld, value)

            return result
        },

        /*  trap method application  */
        apply (target, thisArg, argumentsList) {
            ctx.emit("debug", "handler: map: apply", target, target.name, thisArg, argumentsList)

            /*  determine underlying Map/WeakMap object  */
            const map = thisArg[ctx.TARGET]

            /*  dispatch method and wrap mutating ones  */
            let result
            const changes = []
            if (target.name === "get") {
                result = Reflect.apply(target, map, argumentsList)
                result = ctx.coveringProxy(result, thisArg, argumentsList[0])
            }
            else if (target.name === "entries") {
                const iter = map[Symbol.iterator]()
                result = {
                    [Symbol.iterator]: function () { return this },
                    next: () => {
                        const result = iter.next()
                        if (!result.done)
                            result.value[1] = ctx.coveringProxy(result.value[1], target, result.value[0])
                        return result
                    }
                }
            }
            else if (target.name === "values") {
                const iter = map[Symbol.iterator]()
                result = {
                    [Symbol.iterator]: function () { return this },
                    next: () => {
                        const result = iter.next()
                        if (!result.done)
                            result.value = ctx.coveringProxy(result.value[1], target, result.value[0])
                        return result
                    }
                }
            }
            else if (target.name === "forEach") {
                const [ cb, that ] = argumentsList
                map.forEach((value, property, map) => {
                    value = ctx.coveringProxy(value, target, property)
                    cb.call(that, value, property, map)
                }, that)
            }
            else if (target.name === "set") {
                const valueOld = map.get(argumentsList[0])
                result = Reflect.apply(target, map, argumentsList)
                if (!Object.is(valueOld, map.get(argumentsList[0])))
                    changes.push({ property: argumentsList[0], valueOld, value: argumentsList[1] })
            }
            else if (target.name === "delete") {
                const valueWas = map.has(argumentsList[0])
                const valueOld = map.get(argumentsList[0])
                result = Reflect.apply(target, map, argumentsList)
                if (valueWas && !map.has(argumentsList[0]))
                    changes.push({ property: argumentsList[0], valueOld, value: undefined })
            }
            else if (target.name === "clear") {
                for (const [ property, valueOld ] of map.entries())
                    changes.push({ property, valueOld, value: undefined })
                result = Reflect.apply(target, map, argumentsList)
            }
            else
                result = Reflect.apply(target, map, argumentsList)

            /*  handle changes  */
            changes.forEach((entry) => {
                let path = ctx.cache.path.get(target)
                path = path.slice(0, Math.max(path.lastIndexOf("."), 0))
                ctx.emit("change", ctx.concatPath(path, entry.property), entry.valueOld, entry.value)
            })

            /*  return result of method application  */
            return result
        }
    }

    /*  hook into API  */
    ctx.handlers.push({
        name:  "map",
        prio:  2,
        probe: (value) => (value instanceof Map || value instanceof WeakMap),
        handler
    })
}

