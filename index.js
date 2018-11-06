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

// used with ps argument to indicate store of key or value
var KEY = 0x1
var VAL = 0x2

function err (msg) { throw Error(msg) }

// xtra allows custom properties to be initialized in Buf objects [ name, value, name, value, ... ]
// e.g.  hmap.put_create(ps, KEY, [ 'weight', 0, 'id', -1 ])
function Buf (src, off, lim, hash, col, xtra) {
    var len = lim - off
    var nsrc = new Uint8Array(len)
    for (var i = 0; i < len; i++) { nsrc[i] = src[off + i] }

    this.src = nsrc
    this.hash = hash
    this.col = col
    this.str = null
    if (xtra) {
        for (i =0; i < xtra.length; i+=2) {
            this[xtra[i]] = this[xtra[i+1]]
        }
    }
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

var PS_FNS = {
    hash_fn: function (pc_args) {
        var ps = pc_args[0]
        switch (pc_args[1]) {
            case KEY: return hash(ps.src, ps.koff + 1, ps.klim - 1)
            case VAL: return hash(ps.src, ps.voff + 1, ps.vlim - 1)
            default: err('missing argument: key-or-val')
        }
    },
    equal_fn: function (prev, pc_args) {
        var ps = pc_args[0]
        switch (pc_args[1]) {
            case KEY: return src_equal(prev.src, ps.src, ps.koff + 1, ps.klim - 1)
            case VAL: return src_equal(prev.src, ps.src, ps.voff + 1, ps.vlim - 1)
            // default arg is checked in hash_fn prior to equal()
        }
    },
    create_fn: function (hash, col, prev, pc_args) {
        if (prev) {
            return prev
        }
        var ps = pc_args[0]
        var keyval = pc_args[1]
        var xtra = pc_args[2]
        switch (keyval) {
            case KEY: return new Buf(ps.src, ps.koff + 1, ps.klim -1, hash, col, xtra)
            case VAL: return new Buf(ps.src, ps.voff + 1, ps.vlim -1, hash, col, xtra)
            // default arg is checked in hash_fn prior to create()
        }
    },
    str2args_fn: function (s) {
        var b = new Buffer('"' + s + '"')
        return [{ src: b, voff: 0, vlim: b.length }, VAL]
    },
}

// create parse structure 'ps' like that used by qb-json-tok (for testing)
function str2ps (s, sep, k_or_v) {
    // add quotes to string items (like in JSON)
    var parts = s.split(sep)
    var src = new Buffer('"' + parts.join('"' + sep + '"') + '"')
    var sep_code = sep.charCodeAt(0)
    var lim = src.length
    var off = 0
    var i = 0
    var ret = []
    while (i < lim) {
        while (i < lim && src[i] !== sep_code) { i++ }
        switch (k_or_v) {
            case KEY: ret.push({src: src, koff: off, klim: i}); break
            case VAL: ret.push({src: src, voff: off, vlim: i}); break
            default: err('missing key/val argument')
        }

        off = ++i
    }
    return ret
}

module.exports = {
    KEY: 0x1,
    VAL: 0x2,
    create: function () {
        return hmap.set(PS_FNS)
    },
    str2ps: str2ps,
}