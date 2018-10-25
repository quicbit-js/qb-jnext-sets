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

var test = require('test-kit').tape()
var jn_set = require('.')
var KEY = jn_set.KEY
var VAL = jn_set.VAL

// test key-cache

function err (msg) { throw Error(msg) }
// create parse structure 'ps' like that used by qb-json-tok
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

test('buf.toString', function (t) {
    var cache = jn_set.create()
    var ps = { src: new Buffer('"hi there"'), koff: 0, klim: 7 }
    var buf = cache.put_create(ps, KEY)
    t.same(buf.toString(), 'hi th')
    t.same(buf.toString(), 'hi th')     // call twice tests cache
    t.end()
})

test('put_create KEY', function (t) {
    t.table_assert([
        [ 'input',                                 'exp' ],
        [ 'a',                                     [ 'a' ] ],
        [ 'a,b,c',                                 [ 'a', 'b', 'c' ] ],
        [ 'a,b,c,a',                               [ 'a', 'b', 'c' ] ],
        [ '55,b,3s',                               [ '55', 'b', '3s' ] ],     // collision
        [ '3s,55,3s,55,4T',                        [ '3s', '55', '4T' ] ],    // collision
        [ '3s,55,3s,55',                           [ '3s', '55' ] ],          // collision
        [ 'd-loading-indicator,reactlet-calendar', [ 'd-loading-indicator', 'reactlet-calendar' ] ],
    ], function (input) {
        var cache = jn_set.create()
        str2ps(input, ',', KEY).forEach (function (ps) {
            cache.put_create(ps, KEY)
        })
        return cache.to_obj()
    })
})

test('put_create VAL', function (t) {
    t.table_assert([
        [ 'input',                                 'exp' ],
        [ 'a',                                     [ 'a' ] ],
        [ 'a,b,c',                                 [ 'a', 'b', 'c' ] ],
        [ 'a,b,c,a',                               [ 'a', 'b', 'c' ] ],
        [ '55,b,3s',                               [ '55', 'b', '3s' ] ],     // collision
        [ '3s,55,3s,55,4T',                        [ '3s', '55', '4T' ] ],    // collision
        [ '3s,55,3s,55',                           [ '3s', '55' ] ],          // collision
        [ 'd-loading-indicator,reactlet-calendar', [ 'd-loading-indicator', 'reactlet-calendar' ] ],
    ], function (input) {
        var cache = jn_set.create()
        str2ps(input, ',', VAL).forEach (function (ps) {
            cache.put_create(ps, VAL)
        })
        return cache.to_obj()
    })
})


test('put_s', function (t) {
    t.table_assert([
        [ 'input',                                      'exp' ],
        [ 'a',                                          ['a'] ],
        [ '3s,55,3s,55,4T',                             [ '3s', '55', '4T' ] ],    // collision
        [ 'd-loading-indicator,reactlet-calendar',      [ 'd-loading-indicator', 'reactlet-calendar' ] ],    // collision
    ], function (input) {
        var set1 = jn_set.create()
        input.split(',').forEach (function (s) {
            set1.put_s(s)
        })
        return set1.to_obj()
    })
})

test('new set', function (t) {
    t.table_assert([
        [ 'input',                                 'exp' ],
        [ 'a',                                     [ 1, ['a'] ] ],
        [ 'a,b,c',                                 [ 3, ['a', 'b', 'c'] ] ],
        [ 'a,a',                                   [ 1, ['a'] ] ],
        [ 'a,b,c,a',                               [ 3, ['a', 'b', 'c'] ] ],
        [ '55,b,3s',                               [ 3, ['55', 'b', '3s'] ] ],
        [ '55,3s,55',                              [ 2, ['55', '3s'] ] ],
        [ '3s,55,3s,55,4T',                        [ 3, ['3s', '55', '4T'] ] ],
        [ 'd-loading-indicator,reactlet-calendar', [ 2, ['d-loading-indicator', 'reactlet-calendar'] ] ],
    ], function (input) {
        var set1 = jn_set.create()
        var hset = set1.hset()
        str2ps(input, ',', KEY).forEach (function (ps) {
            var buf = set1.put_create(ps, KEY)
            hset.put(buf, 1)
        })

        return [hset.length, hset.to_obj()]
    })
})

test('errors', function (t) {
    var set1 = jn_set.create()
    var ps = str2ps('abc', ',', KEY)[0]
    t.throws(function () {set1.put_create(ps)}, /missing argument/)
    t.end()
})