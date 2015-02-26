

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
