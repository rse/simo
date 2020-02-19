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

module.exports = {
    /*  serialize target object into external format  */
    serialize (ctx, target, encoding = "json") {
        const simplify = (target) => {
            let result
            if (typeof target === "object") {
                if (target instanceof RegExp)
                    result = { $t: "RegExp", $d: [ target.source, target.flags ] }
                else if (target instanceof Date)
                    result = { $t: "Date", $d: [ target.valueOf() ] }
                else if (target instanceof Map)
                    result = { $t: "Map", $d: Array.from(target.entries()).map((entry) => {
                        entry[1] = simplify(entry[1])
                        return entry
                    }) }
                else if (target instanceof Set)
                    result = { $t: "Set", $d: Array.from(target.values()).map((val) => simplify(val)) }
                else if (target instanceof Array)
                    result = target.map((val) => simplify(val))
                else
                    result = Object.fromEntries(Array.from(Object.entries.call(null, target)).map((entry) => {
                        entry[1] = simplify(entry[1])
                        return entry
                    }))
            }
            else if (typeof target === "function") {
                result = {
                    $t: "Function",
                    $d: [ target.toString(), Array.from(Object.entries.call(null, target)).map((entry) => {
                        entry[1] = simplify(entry[1])
                        return entry
                    }) ]
                }
            }
            else
                result = target.valueOf()
            return result
        }
        const obj = simplify(target)
        const blob = JSON.stringify(obj)
        return blob
    },

    /*  unserialize target object from external format  */
    unserialize (api, blob, encoding = "json") {
        const obj = JSON.parse(blob)
        const unsimplify = (target) => {
            let result
            if (typeof target === "object") {
                if (typeof target.$t === "string" && typeof target.$d === "object" && target.$d instanceof Array) {
                    if (target.$t === "RegExp")
                        result = new RegExp(target.$d[0], target.$d[1])
                    else if (target.$t === "Date")
                        result = new Date(target.$d[0])
                    else if (target.$t === "Map")
                        result = new Map(target.$d.map((entry) => {
                            entry[1] = unsimplify(entry[1])
                            return entry
                        }))
                    else if (target.$t === "Set")
                        result = new Set(target.$d.map((val) => unsimplify(val)))
                    else if (target.$t === "Function") {
                        /* eslint no-eval: off */
                        eval(`result = ${target.$d[0]}`)
                        Object.assign(result, Object.fromEntries(Array.from(Object.entries.call(null, target.$d[1])).map((entry) => {
                            entry[1] = unsimplify(entry[1])
                            return entry
                        })))
                    }
                }
                else if (target instanceof Array)
                    result = target.map((val) => unsimplify(val))
                else
                    result = Object.fromEntries(Array.from(Object.entries.call(null, target)).map((entry) => {
                        entry[1] = unsimplify(entry[1])
                        return entry
                    }))
            }
            else
                result = target.valueOf()
            return result
        }
        const target = unsimplify(obj)
        return api.cover(target)
    }
}

