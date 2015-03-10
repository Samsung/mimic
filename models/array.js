
// loopIndex: 3
function push(arg0) {
    var n0 = arg0.length
    for (var i2 = 0; i2 < (arguments.length-1); i2 += 1) {
        arg0[i2+n0] = arguments[i2+1]
    }
    arg0.length = n0+i2
    var n1 = arg0.length
    return i2+n0
}

function pop(arg0) {
    var n0 = arg0.length
    if (n0) {
        var n1 = arg0[n0-1]
        arg0.length = n0-1
        delete arg0[n0-1]
        return n1
    } else {
        arg0.length = 0
    }
}

function shift(arg0) {
    var n0 = arg0.length
    if (n0) {
        var n1 = arg0[0]
        var n2 = arguments[3]
        for (var i6 = 0; i6 < (n0-1); i6 += 1) {
            n2 = arg0[i6+1]
            arg0[i6] = n2
        }
        delete arg0[i6]
        arg0.length = i6
        return n1
    } else {
        arg0.length = 0
    }
}

function every(arg0, arg1, arg2) {
  var n0 = arg0.length
  var n1
  var n2 = true
  for (var i0 = 0; i0 < n0; i0 += 1) {
    n1 = arg0[i0]
    n2 = arg1.call(arg2, n1, i0, arg0)
    if (!n2) {
      break
    }
  }
  return n2
}

function some(arg0, arg1, arg2) {
  var n0 = arg0.length
  var n1
  var n2 = false
  for (var i0 = 0; i0 < n0; i0 += 1) {
    n1 = arg0[i0]
    n2 = arg1.call(arg2, n1, i0, arg0)
    if (n2) {
      break
    }
  }
  return n2
}

// loopIndex: 1
function indexOf() {

}

function forEach(arg0, arg1) {
    var n0 = arg0.length
    var n1
    var n2 = n1
    for (var i7 = 0; i7 < n0; i7 += 1) {
        n1 = arg0[i7]
        n2 = arg1.apply(undefined, [ n1, i7, arg0 ])
    }
}

function reduce(arg0, arg1, arg2) {
  var n0 = arg0.length
  var n1
  var n2 = arg2
  for (var i0 = 0; i0 < n0; i0 += 1) {
    n1 = arg0[i0]
    n2 = arg1.call(undefined, n2, n1, i0, arg0)
  }
  return n2
}
