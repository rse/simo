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
            ctx.emit("debug", "handler: opaque: get", target, property, receiver)

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

        /*  trap method application  */
        apply (target, thisArg, argumentsList) {
            ctx.emit("debug", "handler: opaque: apply", target, thisArg, argumentsList)

            /*  step down context to value of target object  */
            const valueOld = thisArg[ctx.TARGET].valueOf()

            /*  pass-through operation
                Notice: we assume that thisArg is like a "primitive
                type" where we do not handle the changes implicitly
                through proxies  */
            const result = Reflect.apply(target, thisArg[ctx.TARGET], argumentsList)

            /*  handle change explicitly if value was changed  */
            if (!Object.is(valueOld, thisArg[ctx.TARGET].valueOf())) {
                let path = ctx.store.path.get(target)
                path = path.slice(0, Math.max(path.lastIndexOf("."), 0))
                ctx.emit("change", path, valueOld, thisArg[ctx.TARGET].valueOf())
            }

            /*  return result of method application  */
            return result
        }
    }

    /*  hook into API  */
    ctx.handlers.push({
        name:  "opaque",
        prio:  1,
        probe: (value) => (value instanceof Date),
        handler
    })
}

