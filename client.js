const net = require("net");

const client = net.createConnection({port: 3000}, () => {
    // console.log("connected");
});


client.setEncoding("utf-8");

client.on("data", data => {
    process.stdout.write(data);
})


process.stdin.setEncoding("utf-8");
process.stdin.on("data", raw => {
    const data = raw.trim();
    client.write(data, (err) => {
        if (err) console.error("Error: " + err);
    });
})