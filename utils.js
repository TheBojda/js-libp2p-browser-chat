
// based on https://www.dreamincode.net/forums/topic/353343-how-to-convert-uint8array-to-uint16array-or-string/
export function array2str(uint8buf) {
    let buf = new ArrayBuffer(uint8buf.length);
    let bufView = new Uint16Array(buf);
    let count = 0;
    for (let i = 0; i < bufView.length; i++) {
        bufView[i] = uint8buf[count++] + (uint8buf[count++] << 8);
    }
    return String.fromCharCode.apply(null, bufView);
}

// based on str2ab from https://gist.github.com/skratchdot/e095036fad80597f1c1a
export function str2array(str) {
    let buf = new ArrayBuffer(str.length * 2); // 2 bytes for each char
    let bufView = new Uint16Array(buf);
    for (var i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return new Uint8Array(bufView.buffer, bufView.byteOffset, bufView.byteLength);
}
