// based on str2ab from https://gist.github.com/skratchdot/e095036fad80597f1c1a
function str2ab(str) {
    let buf = new ArrayBuffer(str.length * 2); // 2 bytes for each char
    let bufView = new Uint16Array(buf);
    for (var i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return new Uint8Array(bufView.buffer, bufView.byteOffset, bufView.byteLength);
}

// based on https://www.dreamincode.net/forums/topic/353343-how-to-convert-uint8array-to-uint16array-or-string/
function ab2str(uint8buf) {
    let buf = new ArrayBuffer(uint8buf.length);
    let bufView = new Uint16Array(buf);
    let count = 0;
    for (let i = 0; i < bufView.length; i++) {
        bufView[i] = uint8buf[count++] + (uint8buf[count++] << 8);
    }
    return String.fromCharCode.apply(null, bufView);
}

// based on buildEventManager from https://whistlr.info/2020/async-generators-input/
export function buildChatProtocol(messageCallback) {
    let resolve = () => { };
    const queue = [];

    async function* generator() {
        for (; ;) {
            if (!queue.length) {
                await new Promise((r) => resolve = r);
            }
            yield str2ab(queue.shift());
        }
    }

    return {
        pushMessage: (message) => {
            queue.push(message);
            if (queue.length === 1) {
                resolve();
            }
        },
        streamSource: generator(),
        streamProcessor: async (source) => {
            for await (const buf of source) {
                messageCallback(ab2str(buf.slice()));
            }
        }
    }
}