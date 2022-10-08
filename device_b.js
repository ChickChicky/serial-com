const {
    parentPort: parent,
} = require('worker_threads');

const serial = require('./serial').device();
const {print} = serial;

const proto = require('./proto');

async function main() {
    serial.set_name('Device B');
    let {send,receive} = serial.proxy(proto);

    print('Received',await receive());
}

serial.use_thread(parent);
serial.on('ready',main);

serial.start();