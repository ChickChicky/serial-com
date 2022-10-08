const clk = 0,
      dat = 1;

/**
 * Turns an Array containing ints of any size into an 8-bit buffer
 * @param {*} arr the array ton convert
 * @returns {Buffer}
 */
function toBuffer(arr) {
    if (Buffer.isBuffer(arr)) return arr;
    if (arr.buffer) arr = arr.buffer;
    return Buffer.from(arr);
}

/**
 * Turns a buffer of bits in a buffer of bytes
 * @param {Buffer} arr the individual bits to group
 * @returns {Buffer} the grouped bytes
 */
function groupBytes(arr) {
    let i = 0;
    let _out = Buffer.alloc(0);
    for (let bit of arr) {
        let o = Math.floor(i/8);
        let b = i%8;
        if (_out.length<o+1) _out = Buffer.concat([_out,Buffer.alloc(1)]);
        if (bit) _out[o] = _out[o] | (2**b);
        i++;
    }
    return _out;
}

/**
 * Converts a buffer into an array of individual bits
 * @param {Buffer} buff the buffer to convert
 * @returns {Uint8Array} an array contianing the individual bits
 */
 function toBits(buff) {
    let b = Buffer.alloc(0);
    for (let byte of toBuffer(buff)) {
        b = Buffer.concat([b,Buffer.alloc(8).map(
            (_,i) => Number(!!(byte&(2**i)))
        )]);
    }
    return Uint8Array.from(b);
}


const sleep = ms => new Promise(r=>setTimeout(r,ms));

const basic = {sleep,groupBytes,toBits,toBuffer};

module.exports = {
    device() {

        let listeners = {};

        /**
         * Fires all the event's listeners
         * @param {String} evt the event name
         * @param {*} data the payload
         */
        function fireEvent(evt,data) {
            for (let listener of listeners[evt]??[]) {
                listener(data);
            }
        }

        let dev = {
            /** @type {string} */
            name: 'serial '+Math.floor(Math.random()*36**4).toString(36).padEnd(4,0),
            /** @type {MessagePort} */
            thread: null,
            /** @type {Uint8Array} */
            input: null,
            /** @type {Uint8Array} */
            output: null,
            /** @type {boolean} */
            started: false,
            /** @type {boolean} */
            state: false,
            /** @type {number} */
            baud: 100,
            /** @type {proto} */
            proto: null,
        }

        /**
         * Sets the thread to be used
         * @param {MessagePort} parent the parent port
         */
        function use_thread(parent) {
            dev.thread = parent;
        }

        /**
         * Adds a callback for the specified event
         * @param {'ready'} evt the name of the event to listen to
         * @param {function} fn the callback
         */
        function on(evt,fn) {
            listeners[evt] = (listeners[evt]??[]).concat(fn);
        }

        /**
         * Removes a callback for the specified event
         * @param {'ready'} evt the name of the event to stop litening to
         * @param {function} fn the callback function
         */
        function off(evt,fn) {
            listeners[evt] = (listeners[evt]??[]).filter(f=>f!=fn);
        }

        /**
         * Sets the name of the device
         * @param {string} name the new name
         */
        function set_name(name) {
            dev.name = name;
        }

        /**
         * Starts serial communication and fires `ready` event
         */
        function start() {
            dev.thread.on('message',(data)=>{

                if (data.type == 'init') {

                    dev.input = data.input;
                    dev.output = data.output;
                    if (data.baud) dev.baud = data.baud;

                    if (!dev.started) fireEvent('ready',{});
                    dev.started = true;

                }

            });
        }

        /**
         * Sends an array of bits
         * @param {Buffer} data a buffer containing single bits
         */
        async function send(data) {
            for (let bit of data.map(b=>Number(!!b))) {
                await sleep(1000/dev.baud);
                dev.output[dat] = bit;
                dev.output[clk] ^= 1;
                // console.log(`[${dev.name}] ${bit}`);
            }
        }

        /**
         * Receives `size` bytes
         * @param {number} size the amount of bits to receive
         * @param {number} timeout
         */
        async function receive(size,timeout=1000) {
            let _state = dev.input[clk];

            let i = 0;
            let bits = Buffer.alloc(size);
            
            let t = ! await new Promise( resolve => {

                let to = Date.now();

                while (true) {
                    let _s = dev.input[clk];
                    
                    if (_s != _state) {
                        bits[i] = dev.input[dat];
                        i++;
                        if (i == size) {
                            resolve(true);
                            break;
                        }
                        to = Date.now();
                    }

                    if (Date.now() - to > timeout) {
                        resolve(false);
                        break;
                    }

                    _state = _s;
                }

            });

            if (t) return Buffer.alloc(0);
            return bits;
        }

        /**
         * Sends an ACK signal and waits for a response
         * @param {{timeout:number=100,max_retries:number=1}} settings
         * @returns {boolean} whether the other device responded or not
         * @deprecated use `ping()` and `pong()` instead
         */
        async function ack(settings) {
            settings = Object.assign({
                timeout: 100,
                max_retries: 1
            },settings);
        }

        async function pong() {
            await receive(1,Number.MAX_VALUE);
            await send([1]);
            return;
        }

        async function ping() {
            while (true) {
                await send([1],1);
                if ((await receive(1)).length>0) return;
            }
        }

        /**
         * Retruns the baud rate
         * @param {boolean} bps
         * @returns {number} the baud rate
         */
        function baud(bps=false) {
            if (bps) return 1000/dev.baud;
            return dev.baud;
        }

        /**
         * Creates a proxy for the specified object
         * @param {{send:(serial:*,data:any,timeout?:number)=>any,receive:(serial:*,timeout?:number)=>any}} proto
         * @returns {{send:(data:any,timeout?:number)=>any,receive:(timeout?:number)=>any}}
         */
        function proxy(proto) {
            let serial = this;
            return {
                send: function(data,timeout) {
                    return proto.send(serial,data,timeout);
                },
                receive: function(timeout) {
                    return proto.receive(serial,timeout);
                }
            }
        }

        function print(...args) {
            console.log(`[${dev.name}]`,...args);
        }

        return {
            on, off,
            use_thread, set_name, baud, print,

            ack, send, receive, ping, pong, proxy,

            ...basic, clk, dat,

            start,
        }

    },

    master() {
        function print(...args) {
            console.log('[Master]',...args);
        }
        return {
            ...basic, clk, dat, print,
        }
    },

    ...basic
}