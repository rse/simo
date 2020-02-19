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

/*  the API functionality  */
const simoContext     = require("./simo-1-ctx")
const simoProxyOpaque = require("./simo-2-proxy-opaque")
const simoProxyMap    = require("./simo-3-proxy-map")
const simoProxySet    = require("./simo-4-proxy-set")
const simoProxyObject = require("./simo-5-proxy-object")

/*  the API  */
const api = {
    /*  the API method symbols  */
    METHOD_TARGET:    Symbol("target"),
    METHOD_UNCOVER:   Symbol("uncover"),
    METHOD_OBSERVE:   Symbol("observe"),
    METHOD_UNOBSERVE: Symbol("unobserve"),

    /*  API function: cover an object for observing changes  */
    cover (object) {
        /*  instanciate the Proxy context  */
        const ctx = simoContext(api, object)
        simoProxyOpaque(ctx)
        simoProxyMap(ctx)
        simoProxySet(ctx)
        simoProxyObject(ctx)

        /*  remember root target object  */
        ctx.root = object

        /*  create a covering root Proxy object  */
        return ctx.coveringProxy(object)
    },

    /*  additional API function entry points for "beaming"
        into the context (ctx) of the proxy object  */
    target:    (proxy, ...args) => proxy[api.METHOD_TARGET](proxy, ...args),
    uncover:   (proxy, ...args) => proxy[api.METHOD_UNCOVER](proxy, ...args),
    observe:   (proxy, ...args) => proxy[api.METHOD_OBSERVE](proxy, ...args),
    unobserve: (proxy, ...args) => proxy[api.METHOD_UNOBSERVE](proxy, ...args),

    /*  sanity check run-time environment  */
    sanity: () => {
        if (!(   typeof Reflect === "object"
              && typeof Proxy   === "function"
              && typeof Symbol  === "function"
              && typeof Map     === "function"
              && typeof WeakMap === "function"
              && typeof Set     === "function"
              && typeof WeakSet === "function"))
            throw new Error(
                "SIMO requires at least a sane ECMAScript 2015 run-time environment " +
                "with the APIs Reflect, Proxy, Symbol, Map, WeakMap, Set and WeakSet!"
            )
    }
}

/*  export the API  */
module.exports = api

