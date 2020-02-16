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

const simo = require("../src/simo")

let obj = {
    foo: {
        bar: {
            boolean:  true,
            number:   42,
            string:   "foo",
            regexp:   /foo/i,
            date:     new Date("2020-01-01T00:00:00.000Z"),
            object:   { "k1": "v1", "k2": "v2" },
            array:    [ "v1", "v2" ],
            map:      new Map([[ "k1", "v1" ], [ "k2", "v2" ]]),
            set:      new Set([ "v1", "v2" ]),
            func:     function () { this.array.push("baz") }
        }
    }
}

console.log(obj)
console.log(JSON.stringify(obj))

obj = simo.cover(obj)
simo.observe(obj, (event, ...args) => {
    if (event === "change")
        console.log(event, args)
})

obj.foo.bar.boolean = false
obj.foo.bar.number = 7
obj.foo.bar.regexp = /bar/
obj.foo.bar.string = "bar"
obj.foo.bar.date.setSeconds(1)
obj.foo.bar.object.k2 = "bar"
obj.foo.bar.array.push("bar")
obj.foo.bar.map.set("k2", "bar")
obj.foo.bar.map.delete("k1")
obj.foo.bar.set.add("v3")
obj.foo.bar.set.delete("v1")
obj.foo.bar.func()

console.log(obj)
console.log(JSON.stringify(obj))

