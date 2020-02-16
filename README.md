
SIMO &mdash; Simple Mutable Objects
===================================

Simple Mutable Objects with Change Tracking for JavaScript

<p/>
<img src="https://nodei.co/npm/simo.png?downloads=true&stars=true" alt=""/>

<p/>
<img src="https://david-dm.org/rse/simo.png" alt=""/>

Installation
------------

```shell
$ npm install simo
```

About
-----

SIMO is a library for JavaScript (for use in the Node and Browser
environment), providing simple mutable objects with the automatic and
detailed tracking of changes.

Example
-------

```js
const simo = require("simo")

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
```

Output:

```
{
  foo: {
    bar: {
      boolean: true,
      number: 42,
      string: 'foo',
      regexp: /foo/i,
      date: 2020-01-01T00:00:00.000Z,
      object: [Object],
      array: [Array],
      map: [Map],
      set: [Set],
      func: [Function: func]
    }
  }
}
{"foo":{"bar":{"boolean":true,"number":42,"string":"foo","regexp":{},"date":"2020-01-01T00:00:00.000Z","object":{"k1":"v1","k2":"v2"},"array":["v1","v2"],"map":{},"set":{}}}}
change [ 'foo.bar.boolean', true, false ]
change [ 'foo.bar.number', 42, 7 ]
change [ 'foo.bar.regexp', /foo/i, /bar/ ]
change [ 'foo.bar.string', 'foo', 'bar' ]
change [ 'foo.bar.date', 1577836800000, 1577836801000 ]
change [ 'foo.bar.object.k2', 'v2', 'bar' ]
change [ 'foo.bar.array.2', undefined, 'bar' ]
change [ 'foo.bar.map.k2', 'v2', 'bar' ]
change [ 'foo.bar.map.k1', 'v1', undefined ]
change [ 'foo.bar.set.3', undefined, 'v3' ]
change [ 'foo.bar.set.0', 'v1', undefined ]
change [ 'foo.bar.array.3', undefined, 'baz' ]
{
  foo: {
    bar: {
      boolean: false,
      number: 7,
      string: 'bar',
      regexp: /bar/,
      date: 2020-01-01T00:00:01.000Z,
      object: [Object],
      array: [Array],
      map: [Map],
      set: [Set],
      func: [Function: func]
    }
  }
}
{"foo":{"bar":{"boolean":false,"number":7,"string":"bar","regexp":{},"date":"2020-01-01T00:00:01.000Z","object":{"k1":"v1","k2":"bar"},"array":["v1","v2","bar","baz"],"map":{},"set":{}}}}
```

Application Programming Interface
---------------------------------

SIMO provides the following API:

- `simo.cover(object: Object): SIMO`
- `simo.target(simo: SIMO): Object`
- `simo.uncover(simo: SIMO): Object`
- `simo.observe(simo: SIMO, callback: (event: String, ...args: any[]) => void): Symbol`
- `simo.unobserve(simo: SIMO, id: Symbol): void`

Implementation Notice
---------------------

SIMO is written in ECMAScript 6 and relies on the `Proxy` and
`Reflect` APIs. There are two transpilation results: first, there is
`simo.browser.js` for Browser environments. This is a size-compressed
variant with included dependencies. Second, there is `simo.node.js` for
Node.js environments. This is a variant without compression and included
dependencies.

License
-------

Copyright (c) 2020 Dr. Ralf S. Engelschall (http://engelschall.com/)

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

