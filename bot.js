// Cites:
// [1] Discord bot tutorial by Renemari Padillo
// https://medium.com/davao-js/2019-tutorial-creating-your-first-simple-discord-bot-47fc836a170b
// 
// [2] Discord.js guide
// https://discordjs.guide/popular-topics/miscellaneous-examples.html#play-music-from-youtube
//
// [3] Discord music bot tutorial
// https://gabrieltanner.org/blog/dicord-music-bot




// [1]
// Run dotenv
require('dotenv').config();

const Discord = require('discord.js');
const prefix = "!QM_";
const ytdl = require('ytdl-core');		// [3] for playing youtube songs

const client = new Discord.Client();
const queue = new Map();

client.on('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});



// [2], [3]
client.on('message', async message => {
	// if the bot itself sends a message, ignore its potential commands
	if (message.author.bot)
		return;
	// skip any wrong command calls (ie, not following the bot's prefix from config.json
	if (!message.content.startsWith(prefix))
		return;
	
	// idk where to put this error catcher. let's try here!
	process.on('unhandledRejection', error => console.error('Uncaught Promise Rejection', error));
	
	// This will be the queue for the songs to play
	const serverQueue = queue.get(message.guild.id);
	
	
	if (message.content ===`${prefix}about`){
		message.reply("Salutations!\n" + 
		"_**The Quartermaster**_ is a Discord bot developed by the members of IREX!\n" +
		"Its purpose is to assist in logistical and administrative tasks, as well as fulfill other features that the IREX community may desire to have.\n"
		+ "Also, it's a neat opportunity for the programming nerds to put their js and json skills in a real life application! :^)");
	}
	else if (message.content ===`${prefix}help`){
		return message.channel.send("-------- List of Commands --------\n" + 
		"**updated: June 2, 2020**\n" + 
		"!QM_about        gives a general description of The Quartermaster\n" + 
		"!QM_help         gives a list of commands available\n" + 
		"!QM_play <url>   plays the song of the YouTube url\n" + 
		"!QM_skip         skips the song currently playing\n" + 
		"!QM_stop         stops the song currently playing\n"+
		"!QM_summon       summons The Quartermaster to the caller's voice channel"
		);
	}
	
	// the following function calls are defined after this function
	else if (message.content.startsWith(`${prefix}play`)) {		// e.g. !QM play <YouTube url>
		execute(message, serverQueue);
		return;
	}
	else if (message.content.startsWith(`${prefix}skip`)) {
		skip(message, serverQueue);
		return;
	}
	else if (message.content.startsWith(`${prefix}stop`)) {
		stop(message, serverQueue);
		return;
	}
	else if (message.content === `${prefix}summon`){
		const voiceChannel = message.member.voice.channel;
		if (!message.member.voice.channel)
			return message.channel.send("[ERROR]Get in my voice channel first to summon me.");
		try {
			var connection = await voiceChannel.join();
		} catch (err) {
			console.log(err);
			return message.channel.send(err);
		}
	}
	// TODO
	/*
	else if (message.content === `${prefix}disconnect`){
		const voiceChannel = message.member.voice.channel;
		if (!message.member.voice.channel)
			return message.channel.send("[ERROR]Get in my voice channel first to disconnect.");
		try {
			var connection = await voiceChannel.join();
		} catch (err) {
			console.log(err);
			return message.channel.send(err);
		}
	}
	*/
	else {
		message.channel.send("Invalid command, bucko.");
	}
});



// [3]
async function execute(message, serverQueue) {
	// splits the message into arguments, with the space as the delimiter.
	// args will be useful for finding the song info, or other relevant info, as we'll see later on
	const args = message.content.split(" ");
	
	const voiceChannel = message.member.voice.channel;
	if (!voiceChannel)
		return message.channel.send("[ERROR] Get in a voice channel to hear me sing, you muppet.");
	const permissions = voiceChannel.permissionsFor(message.client.user);
	if (!permissions.has("CONNECT") || !permissions.has("SPEAK")) {
		return message.channel.send("[ERROR] You scoundrel, you didn't give me permission to join and speak in your channel! Open up!");
	}
	
	// takes the second word from the message to get the song info.
	// we use the ytdl library to get process args[1] to get the title *and* video url
	const songInfo = await ytdl.getInfo(args[1]);
	const song = {
		title: songInfo.videoDetails.title,		// 
		url: songInfo.videoDetails.video_url
	};
	
	// if serverQueue doesn't exist, make a queueConstruct to set it up the first time
	if (!serverQueue) {
		const queueContruct = {
			textChannel: message.channel,
			voiceChannel: voiceChannel,
			connection: null,
			songs: [],
			volume: 5,
			playing: true
		};

		queue.set(message.guild.id, queueContruct);
		queueContruct.songs.push(song);
		
		try {
			var connection = await voiceChannel.join();
			queueContruct.connection = connection;
			play(message.guild, queueContruct.songs[0]);
		} catch (err) {
			console.log(err);
			queue.delete(message.guild.id);
			return message.channel.send(err);
		}
	}
	else {
		serverQueue.songs.push(song);
		return message.channel.send(`[NOTICE] Added to the queue: ${song.title}.`);
	}
}



// [3]
function skip(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send(
      "[ERROR]Get in my voice channel first to stop the music."
    );
  if (!serverQueue)
    return message.channel.send("[NOTICE] Song queue finished/empty - no more songs to skip.");
  serverQueue.connection.dispatcher.end();
}



// [3]
function stop(message, serverQueue) {
  if (!message.member.voice.channel)
    return message.channel.send("[ERROR] Get in my voice channel first to stop the music.");
  serverQueue.songs = [];
  serverQueue.connection.dispatcher.end();
}



//[3]
function play(guild, song) {
	const serverQueue = queue.get(guild.id);
	if (!song) {
		serverQueue.voiceChannel.leave();
		queue.delete(guild.id);
		return;
	}
	
	const dispatcher = serverQueue.connection
	.play(ytdl(song.url))
    .on("finish", () => {
		serverQueue.songs.shift();
		play(guild, serverQueue.songs[0]);
	})
	.on("error", error => console.error(error));
	
	dispatcher.setVolumeLogarithmic(serverQueue.volume / 5);
	serverQueue.textChannel.send(`Commence playing: **${song.title}**`);
}




client.login(process.env.DISCORD_TOKEN);