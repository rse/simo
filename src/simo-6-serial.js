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

const simoUtil = require("./simo-0-util")

module.exports = {
    /*  serialize target object into external format  */
    serialize (target, encoding = "json") {
        const ref = new WeakMap()
        const simplify = (target, path) => {
            let result
            if (typeof target !== "object" && typeof target !== "function")
                result = target.valueOf()
            else {
                if (ref.has(target))
                    result = { $t: "Ref", $d: [ ref.get(target) ] }
                else {
                    ref.set(target, path)
                    if (typeof target === "object") {
                        if (target instanceof RegExp)
                            result = { $t: "RegExp", $d: [ target.source, target.flags ] }
                        else if (target instanceof Date)
                            result = { $t: "Date", $d: [ target.valueOf() ] }
                        else if (target instanceof Map)
                            result = { $t: "Map", $d: Array.from(target.entries()).map((entry) => {
                                entry[1] = simplify(entry[1], simoUtil.concatPath(path, entry[0]))
                                return entry
                            }) }
                        else if (target instanceof Set) {
                            let i = 0
                            result = { $t: "Set", $d: Array.from(target.values()).map((val) =>
                                simplify(val, simoUtil.concatPath(path, i++))
                            ) }
                        }
                        else if (target instanceof Array) {
                            let i = 0
                            result = target.map((val) => simplify(val, simoUtil.concatPath(path, i++)))
                        }
                        else {
                            /*  store an Object in "entries" form to preserve ordering  */
                            result = { $t: "Object", $d: Array.from(Object.entries.call(null, target))
                                .sort((a, b) => b[0].localeCompare(a[0]))
                                .map((entry) => {
                                    entry[1] = simplify(entry[1], simoUtil.concatPath(path, entry[0]))
                                    return entry
                                })
                            }
                        }
                    }
                    else if (typeof target === "function") {
                        result = {
                            $t: "Function",
                            $d: [ target.toString(),
                                Array.from(Object.entries.call(null, target))
                                    .sort((a, b) => b[0].localeCompare(a[0]))
                                    .map((entry) => {
                                        entry[1] = simplify(entry[1], simoUtil.concatPath(path, entry[0]))
                                        return entry
                                    })
                            ]
                        }
                    }
                }
            }
            return result
        }
        const obj = simplify(target, "")
        const blob = JSON.stringify(obj)
        return blob
    },

    /*  unserialize target object from external format  */
    unserialize (api, blob, encoding = "json") {
        const obj = JSON.parse(blob)
        const ref = new Map()
        const unsimplify = (target, path) => {
            let result
            if (typeof target === "object") {
                if (typeof target.$t === "string" && typeof target.$d === "object" && target.$d instanceof Array) {
                    if (target.$t === "Ref") {
                        result = ref.get(target.$d[0])
                        if (result === undefined)
                            throw new Error("invalid object reference")
                    }
                    else if (target.$t === "RegExp")
                        result = new RegExp(target.$d[0], target.$d[1])
                    else if (target.$t === "Date")
                        result = new Date(target.$d[0])
                    else if (target.$t === "Map")
                        result = new Map(target.$d.map((entry) => {
                            entry[1] = unsimplify(entry[1], simoUtil.concatPath(path, entry[0]))
                            return entry
                        }))
                    else if (target.$t === "Set") {
                        let i = 0
                        result = new Set(target.$d.map((val) => unsimplify(val, simoUtil.concatPath(path, i++))))
                    }
                    else if (target.$t === "Object") {
                        result = {}
                        target.$d.forEach((entry) => {
                            result[entry[0]] = unsimplify(entry[1], simoUtil.concatPath(path, entry[0]))
                        })
                    }
                    else if (target.$t === "Function") {
                        /* eslint no-eval: off */
                        eval(`result = ${target.$d[0]}`)
                        target.$d[1].forEach((entry) => {
                            result[entry[0]] = unsimplify(entry[1], simoUtil.concatPath(path, entry[0]))
                        })
                    }
                    else
                        throw new Error("unexpected structured object")
                }
                else if (target instanceof Array) {
                    let i = 0
                    result = target.map((val) => unsimplify(val), simoUtil.concatPath(path, i++))
                }
                else
                    throw new Error("unexpected plain object")
                if (!ref.has(path))
                    ref.set(path, result)
            }
            else
                result = target.valueOf()
            return result
        }
        const target = unsimplify(obj, "")
        return api.cover(target)
    }
}

