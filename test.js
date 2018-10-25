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
var jtok_keyset = require('.')

// test key-cache

// create parse structure 'ps' like that used by qb-json-tok
function str2ps (s, sep) {
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
        ret.push({src: src, koff: off, klim: i})
        off = ++i
    }
    return ret
}

test('key-cache buf.toString', function (t) {
    var cache = jtok_keyset.create()
    var ps = { src: new Buffer('xhi there"'), koff: 0, klim: 7 }
    var buf = cache.put_create(ps)
    t.same(buf.toString(), 'hi th')
    t.same(buf.toString(), 'hi th')     // call twice tests cache
    t.end()
})

test('key-cache put_create', function (t) {
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
        var cache = jtok_keyset.create()
        str2ps(input, ',').forEach (function (ps) {
            cache.put_create(ps)
        })
        return cache.to_obj()
    })
})

test('key-cache put_s', function (t) {
    t.table_assert([
        [ 'input',                                      'exp' ],
        [ 'a',                                          ['a'] ],
        [ '3s,55,3s,55,4T',                             [ '3s', '55', '4T' ] ],    // collision
        [ 'd-loading-indicator,reactlet-calendar',      [ 'd-loading-indicator', 'reactlet-calendar' ] ],    // collision
    ], function (input) {
        var cache = jtok_keyset.create()
        input.split(',').forEach (function (s) {
            cache.put_s(s)
        })
        return cache.to_obj()
    })
})

test('key-cache set', function (t) {
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
        var key_set = jtok_keyset.create()
        var hset = key_set.hset()
        str2ps(input, ',').forEach (function (ps) {
            var buf = key_set.put_create(ps)
            hset.put(buf, 1)

        })

        return [hset.length, hset.to_obj()]
    })
})

