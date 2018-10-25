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


function Buf (src, off, lim, hash, col) {
    var len = lim - off
    var nsrc = new Uint8Array(len)
    for (var i = 0; i < len; i++) { nsrc[i] = src[off + i] }

    this.src = nsrc
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
    },
}

var PS_VAL_FNS = {

}

function hash (src, off, lim) {
    for (var i = off, h = 0; i < lim; i++) {
        h = 0x7FFFFFFF & ((h * 33) ^ src[i])    // xor by berstein
    }
    return h
}

function src_equal (src1, src2, off, lim) {
    var len = src1.length
    if (lim - off !== len) {
        return false
    }
    for (var i=0; i<len; i++) {
        if (src1[i] !== src2[off + i]) {
            return false
        }
    }
    return true
}

var PS_KEY_FNS = {
    hash_fn: function (args) {
        var ps = args[0]
        return hash(ps.src, ps.koff + 1, ps.klim - 1)
    },
    equal_fn: function (key, args) {
        var ps = args[0]
        return src_equal(key.src, ps.src, ps.koff + 1, ps.klim -1)
    },
    create_fn: function (hash, col, prev, args) {
        if (prev) {
            return prev
        }
        var ps = args[0]
        return new Buf(ps.src, ps.koff + 1, ps.klim -1, hash, col)
    },
    str2args_fn: function (s) {
        var b = new Buffer('"' + s + '"')
        return [{ src: b, koff: 0, klim: b.length }]
    },
}

module.exports = {
    create: function () {
        return hmap.set(PS_KEY_FNS)
    },
}