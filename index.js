// discord bs
const fs = require("node:fs");
const path = require("node:path");
require('dotenv').config({ path: path.resolve(__dirname, '.../.env') })
const {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  Collection,
} = require("discord.js");

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  partials: [Partials.Channel],
});

const cmdfile = require("./cmd");

const express = require("express");
const app = express();
const port = 12345;

app.get("/", (req, res) => res.send("Hello World!"));

app.listen(port, () =>
  console.log(`Example app listening at http://localhost:${port}`),
);

client.commands = new Collection();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter((file) => file.endsWith(".js"));
for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  if ("data" in command && "execute" in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(
      `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
    );
  }
}

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
  cmdfile.start();
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (interaction.isButton()) {
    console.log(`${interaction.user.username}, ${interaction.customId}`);
    cmdfile.button(interaction);
    await cmdfile.save();
    return;
  }

  if (!interaction.isChatInputCommand()) return;
  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  console.log(`${interaction.user.username}, ${interaction.commandName}`);
  let cmd = await command.execute(interaction);
  await cmdfile.cmd(cmd, interaction);
  await cmdfile.save();
});

client.on("messageCreate", async (interaction) => {
  await cmdfile.save();
    
  if (interaction.author.bot) return;
  if (!interaction.channel.name.includes("play")) return;
  
  await cmdfile.combine(interaction);
});

client.login(process.env.TOKEN);
