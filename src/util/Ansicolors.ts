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

// colorize output

import Util = require('./Util')

var use_color = true

export function set_use_color(val: boolean) {
    use_color = val
}

export function green(s: string) {
    return xterm(2)(s);
}
export function red(s: string) {
    return xterm(1)(s);
}
export function xterm(n: number): (s: string) => string {
    return (s: string) => {
        if (!use_color) return s
        return '\033[38;5;'+n+'m' + s + '\033[0m'
    }
}
export function lightgrey(s: string) {
    return xterm(240)(s);
}
export function Gray(s: string) {
    Util.print(xterm(242)(s))
}
export function Green(s: string) {
    Util.print(xterm(2)(s))
}
export function Red(s: string) {
    Util.print(xterm(1)(s))
}
