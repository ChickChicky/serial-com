const serial = require('./serial').device();
const {toBits,groupBytes,sleep} = serial;

function _t(d) {
    if (Array.isArray(d)) return 'array';
    if (Buffer.isBuffer(d)) return 'buffer';
    if (ArrayBuffer.isView(d)) return 'view';
    return typeof d;
}

function rtype(d) {
    return {
        'number': 1, 'bigint': 1,
        'string': 2,
        'buffer': 3,
        'array':  4,
    }[_t(d)];
}

function dtype(d) {
    return {
        1: 'number',
        2: 'string',
        3: 'buffer',
        4: 'array',
    }[d];
}

async function send(serial, data) {
    let t = _t(data);
    if (t == 'string') {
        await serial.send(toBits([rtype(t)]));
        await serial.send(toBits(new Uint8Array([(data.length&0xFF000000)>>24,(data.length&0x00FF0000)>>16,(data.length&0x0000FF00)>>8,data.length&0x000000FF])));
        await serial.send(toBits(Buffer.from(data)));
    }
    if (t == 'buffer') {
        await serial.send(toBits([rtype(t)]));
        await serial.send(toBits(new Uint8Array([(data.length&0xFF000000)>>24,(data.length&0x00FF0000)>>16,(data.length&0x0000FF00)>>8,data.length&0x000000FF])));
        await serial.send(toBits(data));
    }
    if (t == 'number') {
        await serial.send(toBits([rtype(t)]));
        await serial.send(toBits(new Uint8Array([(data&0xFF000000)>>24,(data&0x00FF0000)>>16,(data&0x0000FF00)>>8,data&0x000000FF])));
    }
}

async function receive(serial) {
    let r = await serial.receive(8);
    let t = dtype(groupBytes(r).readUInt8());
    if (t == 'byte') return (await serial.receive(8)).readUint8();
    if (t == 'number') return (await serial.receive(64)).readUint64();
    if (['string','buffer','view'].includes(t)) {
        let len = groupBytes(await serial.receive(32)).readUint32BE();
        if (t == 'string') {
            return groupBytes(await serial.receive(8*len)).toString('utf-8');
        }
    }
    return Buffer.alloc(0);
}

module.exports = {send,receive};