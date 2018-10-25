// Software License Agreement (ISC License)
//
// Copyright (c) 2018, Matthew Voss
//
// Permission to use, copy, modify, and/or distribute this software for
// any purpose with or without fee is hereby granted, provided that the
// above copyright notice and this permission notice appear in all copies.
//
// THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
// WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
// MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
// ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
// WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
// ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
// OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

// define a set that works directly off of qb-json-tok parse objects (ps), creating new buffer objects ("Buf")
// only when not found in the set.

var hmap = require('qb-hmap')

function err (msg) { throw Error(msg) }

function key_hash (args) {
    var ps = args[0]
    var src = ps.src
    var lim = ps.klim - 1                       // ignore quotes
    var h = 0
    for (var i = ps.koff + 1; i<lim; i++) {
        h = 0x7FFFFFFF & ((h * 33) ^ src[i])    // xor by berstein
    }
    return h
}

function key_equal (key, args) {
    var ps = args[0]
    var len = ps.klim - ps.koff - 2             // ignore quotes

    len >= 0 || err('no key')

    var ksrc = key.src
    if (ksrc.length !== len) { return false }

    var psrc = ps.src
    var poff = ps.koff + 1
    for (var i = 0; i < len; i++) {
        if (ksrc[i] !== psrc[i + poff]) {
            return false
        }
    }
    return true
}

function key_create (hash, col, prev, args) {
    if (prev) {
        return prev
    }
    var ps = args[0]
    var poff = ps.koff + 1              // ignore quotes
    var psrc = ps.src
    var len = ps.klim - ps.koff - 2     // ignore quotes
    len >= 0 || err('no key')
    var src = new Uint8Array(len)
    for (var i = 0; i < len; i++) {
        src[i] = psrc[i + poff]
    }
    return new Buf(src, hash, col)
}

function str2args (s) {
    var b = new Buffer('"' + s + '"')
    return [ { src: b, koff: 0, klim: b.length } ]
}

function Buf (src, hash, col) {
    this.src = src
    this.hash = hash
    this.col = col
    this.str = null
}
Buf.prototype = {
    constructor: Buf,
    to_obj: function () {
        if (this.str === null) {
            this.str = new Buffer(this.src).toString()
        }
        return this.str
    },
    toString: function () {
        return this.to_obj()
    }
}

module.exports = {
    create: function () {
        return hmap.set({
            hash_fn: key_hash,
            equal_fn: key_equal,
            create_fn: key_create,
            str2args_fn: str2args
        })
    }
}