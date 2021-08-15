import pipe from "it-pipe";

// based on buildEventManager from https://whistlr.info/2020/async-generators-input/
export default class ChatProtocol {

    private queue: string[] = [];
    private resolveFn = (result) => { };
    private messageCallback = (msg) => { };

    // based on https://www.dreamincode.net/forums/topic/353343-how-to-convert-uint8array-to-uint16array-or-string/
    private ab2str(uint8buf) {
        let buf = new ArrayBuffer(uint8buf.length);
        let bufView = new Uint16Array(buf);
        let count = 0;
        for (let i = 0; i < bufView.length; i++) {
            bufView[i] = uint8buf[count++] + (uint8buf[count++] << 8);
        }
        return String.fromCharCode.apply(null, bufView);
    }

    // based on str2ab from https://gist.github.com/skratchdot/e095036fad80597f1c1a
    private str2ab(str) {
        let buf = new ArrayBuffer(str.length * 2); // 2 bytes for each char
        let bufView = new Uint16Array(buf);
        for (var i = 0, strLen = str.length; i < strLen; i++) {
            bufView[i] = str.charCodeAt(i);
        }
        return new Uint8Array(bufView.buffer, bufView.byteOffset, bufView.byteLength);
    }

    private async* queueGenerator() {
        for (; ;) {
            if (!this.queue.length) {
                await new Promise((r) => { this.resolveFn = r; });
            }
            yield this.str2ab(this.queue.shift());
        }
    }

    public sendMessage(message: string) {
        this.queue.push(message);
        this.resolveFn('');
    }

    public onMessage(messageCallback) {
        this.messageCallback = messageCallback;
    }

    public setIncomingStream(stream) {
        pipe(stream, async (source) => {
            for await (const buf of source) {
                this.messageCallback(this.ab2str(buf.slice()));
            }
        });

    }

    public setOutgoingStream(stream) {
        pipe(this.queueGenerator(), stream);
    }

}