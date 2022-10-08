const { Worker } = require('worker_threads');
const serial = require('./serial').master();
const {print,clk,dat} = serial;

const baudRate = 80; // only 10 bytes per seconds max :(

print(`Baud rate: ${baudRate}`);

// device A setup
let device_a = {
    io: new Uint8Array(new SharedArrayBuffer(2)),
    worker: new Worker('./device_a.js')
}

// device B setup
let device_b = {
    io: new Uint8Array(new SharedArrayBuffer(2)),
    worker: new Worker('./device_b.js')
}

// starts the devices
device_a.worker.postMessage({
    type: 'init',
    input: device_b.io,
    output: device_a.io,
    baud: baudRate
});
device_b.worker.postMessage({
    type: 'init',
    input: device_a.io,
    output: device_b.io,
    baud: baudRate
});