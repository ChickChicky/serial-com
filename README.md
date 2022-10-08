# Serial Communication Test

I just wanted to try to make a simple serial communication project.
There are two workers that represent two devices and they share some memory to communicate together.
Since I could not find any builtin way to create an array of individual bits, I use Buffer and Uint8Array, but only write 1 or 0's.

Each device has two "*wires*" per input/ouput line, a clock signal (`clk`) and a data value (`dat`).
When the `clk` signal switches state, that means a new bit is ready on the `dat` wire.

I also made a protocol to send stuff more easily, it gives two functions to send and receive simple data types such as `string`, `number`, `buffer` (I am working on arrays, and possibly dictionnaries).

However, this is really limited and can only run up to 80 bits/s or 10 bytes/s, which is pretty slow.
