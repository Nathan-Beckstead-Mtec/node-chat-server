const net = require("net");
const crypt = require("crypto");

let usernames = {};
let active = {};
	//key: uuid, val: client-socket-thing

const server = net.createServer(client => {
	//handle new connection
	const uuid = crypt.webcrypto.randomUUID();
	client.uuid = uuid;
	const pub = uuid.substring(0, 8)
	usernames[client.uuid] = pub;
	client.write("Welcome to the chat, " + pub + "!\n type /join when you want to join the chat room\n>");

	client.on("data", (chunk) => {
		let data = chunk.toString().trim();

		if (data.startsWith("/")) {
			//command
			let command = data.toLowerCase().split(" ");
			//startswith("/")  \implies  command[0] exists
			switch (command[0]) {
				case "/join":
					if (active[client.uuid] === undefined) {
						active[client.uuid] = client;
						broadcast("Server: " + usernames[client.uuid] + " has joined!\n>")
					}else{
						client.write("You already joined.\n>");
					}
					break;
					
				case "/leave":
					leave();
					break;

				case "/help":
					const commands = [
						["Commands:"],
						["/help", "this"],
						["/join", "connects to the chat room"],
						["/leave", "leaves the chat room"]
					];
					const usage = commands.map(curr => curr.join(" - ")).join("\n\t") + "\n>";
					client.write(usage);
					break;

				default:
					client.write("Command not found: " + command[0] + ". Type /help for help.\n>");
					break;
			}
		}else{
			let message = usernames[client.uuid] + ": " + data + "\n>";
			broadcast(message, client.uuid);
		}
	});

	client.on("close", leave);

	function leave(){
		if (active[client.uuid] !== undefined) {
			delete active[client.uuid];
			broadcast("Server: " + usernames[client.uuid] + " has left.\n>");
		}
	}

}).listen(3000);

function broadcast(str, notuuid = null){
	// console.log(str);
	process.stdout.write(str);
	for( const uuid in active){
		if(uuid !== notuuid){
			active[uuid].write(str, "utf-8", (err) => {
				if (err) {
					console.error("Error sending to " + uuid + " (" + usernames[uuid] + ")");
					console.group("msg:");
					console.error(str);
					console.groupEnd("msg:");
					console.error(err);
				}
			});
		}
	}
}