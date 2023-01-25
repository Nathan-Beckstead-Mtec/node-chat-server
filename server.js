const net = require("net");
const crypt = require("crypto");
const fs = require("fs");

let usernames = {};
let active = {};
//key: uuid, val: client-socket-thing
let op = [];
const password = "1234";
const max_guesses = 3;

const server = net.createServer(client => {
	//handle new connection
	const uuid = crypt.webcrypto.randomUUID();
	client.uuid = uuid;
	client.kicked = false;
	client.guesses = 0;

	const pub = uuid.substring(0, 8);
	usernames[client.uuid] = pub;
	client.write("Welcome to the chat, " + pub + "!\n\ttype /join when you want to join the chat room.\n\tor type /help for a list of commands.\n>");

	client.on("data", (chunk) => {
		let data = chunk.toString().trim();

		if (data.startsWith("/")) {
			//command
			let command = data.split(" ");
			command[0] = command[0].toLowerCase();

			//startswith("/")  \implies  command[0] exists
			switch (command[0]) {
				case "/name":
					if (command.length < 2){
						client.write("Usage: /name new_username");
						break;
					}
					if (command[1] === usernames[client.uuid]){
						client.write("You are already named " + command[1] + ".\n>");
						break;
					}
					if (username_inuse(command[1])){
						client.write("Username " + command[1] + " is already in use.\n>");
						break;
					}
					broadcast("Server: " + usernames[client.uuid] + " has changed their name to " + command[1] + ".\n>", client.uuid);
					usernames[client.uuid] = command[1];
					client.write("Hello, " + usernames[client.uuid] + "!\n>");
					break;

				case "/join":
					if (active[client.uuid] !== undefined) {
						client.write("You already joined.\n>");
						break;
					}
					if (client.kicked){
						client.write("You have been kicked, you cannot rejoin.\n>");
						break;
					}
					if(username_inuse(usernames[client.uuid])){
						client.write("Cannot join because username " + command[1] + " is already in use.\nRename yourself using /name then try again.\n>");
						break;
					}
					active[client.uuid] = client;
					broadcast("Server: " + usernames[client.uuid] + " has joined!\n>")
					break;
				
				case "/kick":
					if (command.length < 3){
						client.write("Usage: /kick password username\n>");
						break;
					}
					if (command[1] !== password){
						client.write("Incorrect password.\n>");
						client.guesses++;
						if(client.guesses >= max_guesses) {
							client.kick_me();
						}
						break;
					}
					client.guesses = 0;
					if (command[2] === usernames[client.uuid]){
						client.write("Cannot kick yourself.\n>");
						break;
					}
					let result = kick(command[2]);
					result = result ? "Kick succsessfull" : "Username not found";
					client.write(result + "\n>");
					break;

				case "/list":
					let output = "Current Users: \n\t" + Object.keys(active).map(uuid => usernames[uuid]).join("\n\t") + "\n>";
					client.write(output);
					break;

				case "/leave":
					leave();
					break;

				case "/help":
					const commands = [
						["Commands:"],
						["/help", "this"],
						["/name new_name", "change your username"],
						["/join", "connects to the chat room"],
						["/list", "lists all active users"],
						["/kick password username", "kicks a user"],
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
			if(active[uuid] !== undefined && (!client.kicked)){
				let message = usernames[client.uuid] + ": " + data + "\n>";
				broadcast(message, client.uuid);
			}
		}
	});

	client.on("close", () => {
		leave();
		delete usernames[client.uuid];
	});

	function leave(){
		if (active[client.uuid] !== undefined) {
			delete active[client.uuid];
			broadcast("Server: " + usernames[client.uuid] + " has left.\n>");
		}
	}
	
	client.kick_me = () => {
		//called by kick(username)
		client.kicked = true;
		delete active[client.uuid];
		client.write("You have been kicked\n");
		broadcast("Server: " + usernames[client.uuid] + " has been kicked.\n>");
	}

}).listen({port: 3000} , ()=> {
	console.log("listening on port 3000");
	log("Server started\n>");
});

function broadcast(str, notuuid = null){
	// console.log(str);
	process.stdout.write(str);

	log(str);

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





function log(str){
	const data = str.slice(0,-1);  //ew code stink to cut the ">"

	fs.appendFile("./log.txt",data, (err) => {
		if (err) {
			console.group("could not write to log:");
				console.log(data);
			console.group("could not write to log:");
			console.error(data);
		}
	});

}







function find_uuid(username){
	for (const uuid in active){
		console.log("checking if (" + usernames[uuid] + ") === (" + username + ")");
		if(usernames[uuid] === username){
			
			return uuid;
		}
	}
	return false;
}


function kick(name){
	const uuid = find_uuid(name);
	console.log(uuid);
	if (uuid === false){
		return false;
	}
	active[uuid].kick_me();
	return true;
}

function username_inuse(str){
	// console.log(str);
	// console.group("names:");
	// 	console.log(usernames);
	// console.groupEnd("names:");

	for (const uuid in active){
		if(usernames[uuid] === str){
			return true;
		}
	}
	return false;
}