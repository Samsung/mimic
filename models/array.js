

function push(arg0) {
    var n0 = arg0.length
    for (var i2 = 0; i2 < (arguments.length-1); i2 += 1) {
        arg0[i2+n0] = arguments[i2+1]
    }
    arg0.length = n0+i2
    var n1 = arg0.length
    return i2+n0
}
