const {
    parentPort: parent,
} = require('worker_threads');

const serial = require('./serial').device();
const {print} = serial;

const proto = require('./proto');

async function main() {
    serial.set_name('Device A');
    let {send,receive} = serial.proxy(proto);

    print('Sending message');
    await send('Hello, world !');
}

serial.use_thread(parent);
serial.on('ready',main);

serial.start();