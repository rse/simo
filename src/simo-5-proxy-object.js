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
            ctx.emit("debug", "handler: object: get", target, property, receiver)

            /*  short-circuit any-level internal target access  */
            if (property === ctx.TARGET)
                return target

            /*  short-circuit top-level methods  */
            if (   typeof property === "symbol"
                && ctx.methods[property] !== undefined
                && ctx.store.path.get(target) === "")
                return ctx.methods[property]

            /*  pass-through operation  */
            const value = Reflect.get(target, property, receiver)

            /*  on-the-fly cover the value  */
            if (typeof value === "function")
                return ctx.coveringProxy(value, target, property, handler)
            else
                return ctx.coveringProxy(value, target, property)
        },

        /*  trap property write  */
        set (target, property, value, receiver) {
            ctx.emit("debug", "handler: object: set", target, property, value, receiver)

            /*  fetch the old value  */
            let valueOld
            if (!ctx.uncovered)
                valueOld = Reflect.get(target, property, receiver)

            /*  optionally fetch target object of proxy object for new value  */
            if (value && typeof value === "object" && value[ctx.TARGET] !== undefined)
                value = value[ctx.TARGET]

            /*  pass-through operation  */
            const result = Reflect.set(target, property, value)

            /*  handle change if value has really changed  */
            if (!ctx.uncovered && !Object.is(valueOld, value))
                ctx.emit("change", ctx.concatPath(ctx.store.path.get(target), property), valueOld, value)

            return result
        },

        /*  trap property definition  */
        defineProperty (target, property, descriptor) {
            ctx.emit("debug", "handler: object: defineProperty", target, property, descriptor)

            /*  pass-through operation  */
            const result = Reflect.defineProperty(target, property, descriptor)

            /*  invalidate property descriptor cache and handle change  */
            if (!ctx.uncovered) {
                ctx.invalidateCachedDescriptor(target, property)
                ctx.emit("change", ctx.concatPath(ctx.store.path.get(target), property), undefined, descriptor.value)
            }

            return result
        },

        /*  trap property deletion  */
        deleteProperty (target, property) {
            ctx.emit("debug", "handler: object: deleteProperty", target, property)

            /*  short-circuit processing for not-existing property  */
            if (!Reflect.has(target, property))
                return true

            /*  fetch the old value  */
            let valueOld
            if (!ctx.uncovered)
                valueOld = Reflect.get(target, property)

            /*  pass-through operation  */
            const result = Reflect.deleteProperty(target, property)

            /*  invalidate property descriptor cache and handle change  */
            if (!ctx.uncovered) {
                ctx.invalidateCachedDescriptor(target, property)
                ctx.emit("change", ctx.concatPath(ctx.store.path.get(target), property), valueOld, undefined)
            }

            return result
        }
    }

    /*  hook into API  */
    ctx.handlers.push({
        name:  "object",
        prio:  99,
        probe: () => true,
        handler
    })
}

