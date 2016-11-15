![DASH](dash.png?raw=true)

[![NPM](https://nodei.co/npm/dashlang.png?downloads=true)](https://npmjs.org/package/dashlang)

[![NPM](https://nodei.co/npm-dl/dashlang.png?months=6&height=3)](https://nodei.co/npm/dashlang/)

Are you a functional elitist? Are you a lazy coder? Do you just _love_ esolangs? If so, then DASH is for you.

DASH is a general-purpose functional programming language influenced by countless other programming languages, especially Haskell, Lisp, and Javascript. Although meant to be a practical language, DASH does contain some... golfy... syntax structures.

For installation/docs, visit the [wiki](https://github.com/molarmanful/DASH/wiki).

#Features
- Mostly functional, with some side effects
- Lazily evaluated
- Implements a zero-indexed version of de Bruijn indices
- Mainly prefix-based
- Float support for up to 1000-digit precision
- Simple package system
- Easy installation via Node.js and NPM

#Examples
"Hello, world!":
```
"Hello, world!"
```

Fibonacci sequence (overflows really quickly):
```
while[
  1
  @[
    get 1 #0
    oN + get 0 #0 get 1 #0
  ]
][oN 1; oN 1]
```

FizzBuzz:
```
(join "
") (map @
  [
    and % #0 3 % #0 5
      ? #0
      ? con [
          % #0 3
            ? ""
            ? "fizz"
        ] [
          % #0 5
            ? ""
            ? "buzz"
        ]
  ]
) rng 1 101
```

Quine (run with `--noexpr` flag):
```
f\ @(ol "f\ ";ol src f;ol ";f0");f0
```

∞ x ∞ Matrix:
```
rpt rpt 1
```

Truth Machine (enter nothing for falsy and anything for truthy):
```
t\ @[
  #0
    ? t ol 1
    ? 0
];
t rl ()
```