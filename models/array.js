
function push(arg0) {
  var n0 = arg0.length
  for (var i = 0; i < (arguments.length-1); i += 1) {
    arg0[n0+i] = arguments[i+1]
  }
  arg0.length = n0+i
  var n1 = arg0.length
  return n1
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
    var n1 = arg0[0] /*@ \label{li:non-empty-start} @*/
    for (var i = 0; i < (n0-1); i += 1) {
      var n2 = (i+1) in arg0
      if (n2) {
        var n3 = arg0[i+1]
        arg0[i] = n3
      } else {
        delete arg0[i]
      }
    }
    delete arg0[i]
    arg0.length = i
    return n1 /*@ \label{li:non-empty-end} @*/
  } else {
    arg0.length = 0
  }
}

function every(arg0, arg1, arg2) {
  var n0 = arg0.length
  var n3 = true
  for (var i = 0; i < n0; i += 1) {
    var n1 = i in arg0
    if (n1) {
      var n2 = arg0[i]
      n3 = arg1.call(arg2, n2, i, arg0)
      if (!n3) {
        break
      }
    }
  }
  return n3
}

function some(arg0, arg1, arg2) {
  var n0 = arg0.length
  var n3 = false
  for (var i = 0; i < n0; i += 1) {
    var n1 = i in arg0
    if (n1) {
      var n2 = arg0[i]
      n3 = arg1.call(arg2, n2, i, arg0)
      if (n3) {
        break
      }
    }
  }
  return n3
}

function indexOf(arg0, arg1) {
  var result = -1
  var n0 = arg0.length
  for (var i = 0; i < n0; i += 1) {
    var n1 = arg0[i]
    if (n1==arg1) {
      result = i
      break
    }
  }
  return result
}

function lastIndexOf(arg0, arg1) {
  var n0 = arg0.length
  for (var i = 0; i < n0; i += 1) {
    var n1 = arg0[(n0-i)-1]
    if (n1==arg1) {
      break
    }
  }
  return (n0-i)-1
}

function forEach(arg0, arg1, arg2) {
  var n0 = arg0.length
  for (var i = 0; i < n0; i += 1) {
    var n1 = i in arg0
    if (n1) {
      var n2 = arg0[i]
      var n3 = arg1.call(arg2, n2, i, arg0)
    }
  }
}

function reduce(arg0, arg1, arg2) {
  var result = arg2
  var n0 = arg0.length
  for (var i = 0; i < n0; i += 1) {
    var n1 = i in arg0
    if (n1) {
      var n2 = arg0[i]
      var n3 = arg1.call(undefined, result, n2, i, arg0)
      result = n3
    }
  }
  return result
}
