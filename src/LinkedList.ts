/*
 * Copyright (c) 2014 Samsung Electronics Co., Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *        http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Simple linked list library.
 *
 * @author Stefan Heule <stefanheule@gmail.com>
 */

import Data = require('./Data')
import Util = require('./util/Util')
import Recorder = require('./Recorder')
import Compile = require('./Compile')

var print = Util.print
var log = Util.log
var line = Util.line

export class LinkedList {
    static make(arr: number[]) {
        var res = null
        for (var i = arr.length-1; i >= 0; i--) {
            res = new LinkedList(res, arr[i])
        }
        return res
    }
    constructor(public next: LinkedList = null, public value: number = -1) {
    }

    itemAt(idx: number) {
        var elem = this
        while (idx > 0) {
            elem = elem.next
            idx -= 1
        }
        return elem.value
    }

    getLast() {
        var elem = this
        while (elem.next != null) {
            elem = elem.next
        }
        return elem.value
    }

    addFront(val: number) {
        return new LinkedList(this, this.value)
    }

    addBack(val: number) {
        var elem = this
        while (elem.next != null) {
            elem = elem.next
        }
        elem.next = new LinkedList(this, this.value)
        return this
    }

    getSize() {
        var elem = this
        var i = 0
        while (elem.next != null) {
            elem = elem.next
            i += 1
        }
        return i
    }

    removeFirst(val: number) {
        if (this.value === val) {
            return this.next
        }
        var elem = this
        var prev = null
        while (elem != null) {
            if (elem.value === val) {
                prev.next = elem.next
                return this
            }
            prev = elem
            elem = elem.next
        }
        return this
    }

    elements(): number[] {
        var res = []
        var elem = this
        res.push(elem.value)
        while (elem.next != null) {
            elem = elem.next
            res.push(elem.value)
        }
        return res
    }

    itemAtR(idx: number) {
        if (idx === 0) {
            return this.value
        } else {
            return this.next.itemAtR(idx-1)
        }
    }

    toString() {
        return "<" + this.elements().join(",") + ">"
    }
}
