
// colorize output

export function green(s: string) {
    return xterm(2)(s);
}
export function red(s: string) {
    return xterm(1)(s);
}
export function xterm(n: number): (s: string) => string {
    return (s: string) => {
        return '\033[38;5;'+n+'m' + s + '\033[0m'
    }
}
