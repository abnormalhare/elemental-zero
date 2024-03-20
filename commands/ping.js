const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Should return pong'),
  async execute() { return "ping" },
};