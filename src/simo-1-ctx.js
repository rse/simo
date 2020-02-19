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

module.exports = (api) => {
    /*  the internal Proxy context  */
    const ctx = {
        /*
         *  ==== STATE ====
         */

        /*  the target object link symbol constant  */
        TARGET: Symbol("TARGET"),

        /*  the local state for "uncover"  */
        uncovered: false,

        /*  the local state for observing  */
        observers: new Map(),

        /*  the Proxy object handlers  */
        handlers: [],

        /*  the local caches for properties, paths and proxy objects  */
        cache: {
            path:  new WeakMap(), /* maps targets to path   */
            proxy: new WeakMap(), /* maps targets to proxy  */
            prop:  new WeakMap()  /* maps targets to property descriptors  */
        },

        /*
         *  ==== METHODS ====
         */

        /*  the API methods  */
        methods: {
            /*  "target"  */
            [api.METHOD_TARGET] (proxy) {
                return proxy[ctx.TARGET]
            },

            /*  "uncover"  */
            [api.METHOD_UNCOVER] (proxy) {
                ctx.uncovered = true
                ctx.observers.clear()
                ctx.handlers = []
                ctx.cache.prop  = new WeakMap()
                ctx.cache.path  = new WeakMap()
                ctx.cache.proxy = new WeakMap()
                return proxy[ctx.TARGET]
            },

            /*  "observe"  */
            [api.METHOD_OBSERVE] (proxy, cb) {
                const id = Symbol("id")
                cb = cb.bind(proxy)
                ctx.observers.set(id, cb)
                return id
            },

            /*  "unobserve"  */
            [api.METHOD_UNOBSERVE] (proxy, id) {
                ctx.observers.delete(id)
            }
        },

        /*  helper function for concatenating a property name onto a path string  */
        concatPath: (path, property) => {
            if (path)
                path += "."
            path += property.toString()
            return path
        },

        /*  determine own property descriptor  */
        getOwnPropertyDescriptor: (target, property) => {
            /*  fetch or create property set of target  */
            let props = ctx.cache.prop.get(target)
            if (props === undefined) {
                props = new Map()
                ctx.cache.prop.set(target, props)
            }

            /*  fetch or determine property of target  */
            let prop = props.get(property)
            if (prop === undefined) {
                prop = Reflect.getOwnPropertyDescriptor(target, property)
                if (prop !== undefined)
                    props.set(property, prop)
            }
            return prop
        },

        /*  invalidate cached property  */
        invalidateCachedDescriptor: (target, property) => {
            const props = ctx.cache.prop.get(target)
            if (props)
                props.delete(property)
        },

        /*  fetch existing (or build new) covering proxy object for a target object  */
        coveringProxy: (target, parent, property, handler) => {
            /*  do nothing if we are already uncovered  */
            if (ctx.uncovered)
                return target

            /*  short-circuit primitive type value  */
            if (   target === null
                || (typeof target !== "object" && typeof target !== "function") )
                return target

            /*  short-circuit if value is a builtin without methods which mutate the value  */
            if (   target instanceof RegExp
                || target instanceof String
                || target instanceof Boolean
                || target instanceof Number
                || toString.call(target) === "[object BigInt]")
                return target

            /*  short-circuit constructors  */
            if (property === "constructor")
                return target

            /*  preserve invariants of object property access  */
            if (parent && property) {
                const descriptor = ctx.getOwnPropertyDescriptor(parent, property)
                if (descriptor && !descriptor.configurable) {
                    if (descriptor.set && !descriptor.get)
                        return undefined
                    if (descriptor.writable === false)
                        return target
                }
            }

            /*  determine and remember path to target  */
            const path = parent && property ?
                ctx.concatPath(ctx.cache.path.get(parent), property) : ""
            const pathExisting = ctx.cache.path.get(target)
            if (pathExisting !== undefined && pathExisting !== path)
                throw new Error("multiple paths to same target object detected " +
                    "(you accidentally created a graph instead of tree)")
            if (pathExisting === undefined)
                ctx.cache.path.set(target, path)

            /*  fetch existing or build new proxy  */
            let proxy = ctx.cache.proxy.get(target)
            if (proxy === undefined) {
                if (!handler) {
                    for (const entry of ctx.handlers.sort((a, b) => a.prio - b.prio)) {
                        if (entry.probe(target)) {
                            handler = entry.handler
                            break
                        }
                    }
                    if (!handler)
                        throw new Error("no handler found")
                }
                proxy = new Proxy(target, handler)
                ctx.cache.proxy.set(target, proxy)
            }
            return proxy
        },

        /*  handle a data change operation  */
        emit: (event, ...args) => {
            if (ctx.uncovered)
                return
            ctx.observers.forEach((observer) => {
                observer(event, ...args)
            })
        }
    }
    return ctx
}

