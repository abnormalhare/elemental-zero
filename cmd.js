/////// IMPORTS ////////
const fs = require("fs/promises");
const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

/////// GLOBAL VARIABLES ///////
// stores all operators
var operators = {};
// stores all elements
var elements = {};
// stores player inventories, number of suggestions, and votes on polls
var player = {invs: {}, numSugs: {}, votes: {}};
// list of possible suggestions
var suggestList = {};
// list of votable suggestions
var voteList = {};
// list of reports
var reportList = {};

/////// CLASSES ///////

// parents is a array of [machine, elem1, elem2, ...]
class Element {
  constructor(parents) {
    this.parents = parents;
  }
}

class Operator {
  constructor(parents, reqLength) {
    this.parents = parents;
    this.reqLength = reqLength;
  }
}

/////// EXPORTS ///////

module.exports = {
  // main command processor and saver
  cmd: async (cmd, inter) => {
    await cmd_check(cmd, inter);
  },
  button: async (inter) => {
    await button_check(inter);
  },
  start: async () => {
    console.log("Starting!");
    load();
  },
  combine: async(inter) => {
    await combine(inter);
  },
  save: async() => {
    await save();
  }
};

async function cmd_check(cmd, inter) {
  switch (cmd) {
    case "inv":     await inv(inter); break;
    case "ping":    await ping(inter); break;
    case "list":    await list(inter); break;
    case "suggest": await suggest(inter); break;
    case "report":  await report(inter); break;
    case "hint":    await hint(inter); break;
    default: throw `You forgot about /${cmd}, idiot!`
  }
}

async function button_check(inter) {
  switch (inter.customId.split(":")[0]) {
    case "upvote":   await determineVote(inter, true);  break;
    case "downvote": await determineVote(inter, false); break;
    case "complete": await completeReport(inter);       break;
    case "remove":   await removeReport(inter);         break;
    case "left":     await invChangePage(inter, false); break;
    case "right":    await invChangePage(inter, true);  break;
    default: throw `You forgot about /${cmd}, idiot!`
  }
}

/////// SAVE/LOAD ///////

async function save() {
  const data = {
    elements: elements,
    operators: operators,
    player: player,
    suggestList: suggestList,
    voteList: voteList,
    reportList: reportList,
  }
  const save = JSON.stringify(data);
  await fs.writeFile("./save.json", save);
}

async function load() {
  try {
    const data = await fs.readFile("./save.json", "utf-8");
    const dataObj = JSON.parse(data);
  
    elements = dataObj.elements;
    operators = dataObj.operators;
    player = dataObj.player;
    suggestList = dataObj.suggestList;
    voteList = dataObj.voteList;
    reportList = dataObj.reportList;
  } catch (e) {
    elements.Air = new Element([]);
    elements.Earth = new Element([]);
    elements.Fire = new Element([]);
    elements.Water = new Element([]);
    operators['+'] = new Operator([], 2);
  }
}

/////// SLASH CMD FUNCS ///////

// ping
async function ping(inter) {
  await inter.reply("Pong!");
  return;
}

async function getInvPage(user, invPage) {
  const page = invPage * 20;
  
  let count = page;
  let end = page + 20;
  let description = "**Elements**\n";

  const eKeys = Object.keys(player.invs[user].elements);
  const oKeys = Object.keys(player.invs[user].operators);

  for (let i = count; i < end; i++) {
    if (i >= eKeys.length || count >= end) break;
    description += `${eKeys[i]}\n`
    count++;
  }

  if (count >= end) return description;

  description += "\n**Operators**\n";
  count -= eKeys.length;
  end -= eKeys.length;

  for (let i = count; i < end; i++) {
    if (i >= oKeys.length || count >= end) break;
    description += `\`${oKeys[i]}\`\n`
    count++;
  }

  return description;
}

// Show player's inv
async function inv(inter) {
  
  if (!player.invs[inter.user.id]) await setPlayerInv(inter.user.id);

  const description = await getInvPage(inter.user.id, 0);

  const invEmbed = {
    color: 0x00AA00,
    title: `${inter.user.username}'s Inventory`,
    description: description,
    footer: {text: `Page 1`}
  }

  const uid = `${inter.user.id}/${inter.user.username}/${0}/${Math.random()}`;

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`left:${uid}`)
        .setEmoji({ name: "⬅️" })
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`right:${uid}`)
        .setEmoji({ name: "➡️" })
        .setStyle(ButtonStyle.Primary))

  await inter.reply({embeds: [invEmbed], components: [row]});
}

async function invChangePage(inter, direction) {
  const balDir = direction ? 1 : -1;
  const uid = inter.customId.split(":")[1];
  const userId = uid.split("/")[0];
  const user = uid.split("/")[1];
  let page = parseInt(uid.split("/")[2]) + balDir;
  const key = uid.split("/")[3];

  if (page < 0) page = 0;

  let description = await getInvPage(userId, page);
  if (description == "**Elements**\n\n**Operators**\n") {
      page -= 1;
      description = await getInvPage(userId, page);
  }

  const invEmbed = {
    color: 0x00AA00,
    title: `${user}'s Inventory`,
    description: description,
    footer: {text: `Page ${page + 1}`}
  }

  const newuid = `${userId}/${user}/${page}/${key}`;

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`left:${newuid}`)
        .setEmoji({ name: "⬅️" })
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`right:${newuid}`)
        .setEmoji({ name: "➡️" })
        .setStyle(ButtonStyle.Primary))

  await inter.update({embeds: [invEmbed], components: [row]});
}

async function getRandomElement(user) {
    const eLen = Object.keys(elements).length;
    const rand = (eLen + Object.keys(operators).length - 1) * Math.random() << 0;
    const eKeys = Object.keys(elements);
    const oKeys = Object.keys(operators);
    if (rand >= eLen) {
        let name = oKeys[rand - eLen];
        return [name, operators[name]];
    } else {
        let name = eKeys[rand];
        return [name, elements[name]];
    }
}

async function hint(inter) {
    const playerInvE = player.invs[inter.user.id].elements;
    const playerInvOp = player.invs[inter.user.id].operators;
    let elementName = inter.options.getString('element') ?? null;
    let element;
    
    if (!elements[elementName] && !operators[elementName] && elementName != null) {
        await inter.reply({ content: `${elementName} doesn't exist!`, ephemeral: true });
        return;
    }
    
    if (!elementName) {
       	while(!elementName || playerInvE[elementName] || playerInvOp[elementName]) {
            let ret = []
        	ret = await getRandomElement(inter.user.id);
            elementName = ret[0];
            element = ret[1];
        }
    } else {
        element = elements[elementName];
    }
    
    let description = "";
    for (const i of element.parents) {
        let machine = i[0];
        let visParents = i.slice(1, i.length - 1);
        if (visParents.length > 1) {
            visParents = visParents.join(" + ");
        } else {
            visParents = i[1]
        }
        let invisParent;
        if (i.length > 2) {
        	invisParent = "+ " + "?".repeat(i[i.length - 1].length);
        } else {
            invisParent = "";
        }
        description += `\`${machine}\`: ${visParents} ${invisParent}\n`;
    }
    
    const hintEmbed = {
        title: `Hints for ${elementName}`,
        description: description
    }
    
    await inter.reply({ embeds: [hintEmbed] })
}

// report a bug
async function report(inter) {
  const title = inter.options.getString('title');
  const description = inter.options.getString('description');
  const bugChannel = inter.guild.channels.cache.get(process.env.bugReportId);

  const uid = `${inter.user.id}-${title}-${Math.random()}`;
  
  const bugEmbed = {
    color: 0xAA0000,
    title: title,
    author: {
      name: `@${inter.user.username}`,
    },
    description: description,
  }

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`complete:${uid}`)
        .setEmoji({ name: "🟢" })
        .setLabel("Complete")
        .setStyle(ButtonStyle.Success))
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`remove:${uid}`)
        .setEmoji({ name: "⛔" })
        .setLabel("Remove")
        .setStyle(ButtonStyle.Danger))

  reportList[uid] = {title: title, description: description, user: inter.user.username};
      
  await inter.reply({ content: "Thank you for your report!", ephemeral: true });
  await bugChannel.send({ embeds: [bugEmbed], components: [row]});
}

async function completeReport(inter) {
  const uid = inter.customId.split(":")[1];
  const bug = reportList[uid];
    
  if (parseInt(inter.user.id) != 501430174227759105n) return;

  const bugEmbed = {
    color: 0x00FF00,
    title: bug.title,
    author: {
      name: bug.user,
    },
    description: bug.description,
  }

  delete reportList[uid];
  await inter.update({ embeds: [bugEmbed], components: [] })
}

async function removeReport(inter) {
  const uid = inter.customId.split(":")[1];
  const bugChannel = inter.guild.channels.cache.get(process.env.bugReportId);
  const bugEmbed = bugChannel.messages.cache.get(inter.message.id)
  
  if (parseInt(inter.user.id) != 501430174227759105n) return;

  bugEmbed.delete();
  delete reportList[uid];
  await inter.reply({ content: "Report removed.", ephemeral: true });
}

// suggest an element or operator
async function suggest(inter) {
  const subcommand = inter.options.getSubcommand();
  if (subcommand === "element") await suggestElement(inter);
  else if (subcommand === "machine") await suggestOperator(inter);
  return;
}

// suggest an element
async function suggestElement(inter) {
  const element = capitalize(inter.options.getString("element"));

  if (player.numSugs[inter.user.id] > 10) {
    await inter.reply("You have already suggested 10 times!");
    return;
  }

  let msg = ""
  
  try {
    for (const [k, s] of Object.entries(suggestList)) {
      if (k == inter.user.id) {
        msg = `Suggested: **${s[1].join("** + **")}** = **${element}** as an element.`;
        vote(inter, "element", element, s[0], s[1]);
        delete suggestList[s];
      }
    };
  } catch (err) {
    await inter.reply("This suggestion didn't work. Ping CreateSource!")
    console.log(err);
    return;
  }
  if (msg == "") msg = "You haven't typed anything yet!";
  await inter.reply(msg);
  return;
}

// Suggest an Operator
async function suggestOperator(inter) {
  const operator = inter.options.getString("machine");
  const reqlength = inter.options.getInteger("reqlength")

  if (reqlength < 1 || reqlength > 30) {
    await inter.reply("`reqlength` must be between 1 and 30.")
    return;
  }
    
  if (operators[operator]) {
      reqlength = operators[operator].reqlength;
  }

  if (player.numSugs[inter.user.id] > 10) {
    await inter.reply("You have already suggested 10 times!");
    return;
  }

  let msg = ""
  try {
      for (const [k, s] of Object.entries(suggestList)) {
      if (k == inter.user.id) {
        msg = `Suggested: **${s[1].join("** + **")}** = **${operator}** as a machine.`;
        vote(inter, "operator", operator, s[0], s[1], reqlength);
        delete suggestList[s];
      }
    };
  } catch (err) {
    await inter.reply("This suggestion didn't work. Ping CreateSource!")
    console.log(err);
    return;
  }
  
  if (msg == "") msg = "You haven't typed anything yet!";
  await inter.reply(msg);
  return;
}

// vote 
async function vote(inter, type, suggested, operator, elements, reqlength=0) {
  const votingChannel = inter.guild.channels.cache.get(process.env.voteChannelId)
  
  let playerNumSuggested = 1;
  if (player.numSugs[inter.user.id]) {
    playerNumSuggested = player.numSugs[inter.user.id] + 1;
  }
  player.numSugs[inter.user.id] = playerNumSuggested;

  let uidRand = Math.random();
  const uid = `${inter.user.id}-${playerNumSuggested}-${uidRand}`;

  let votingEmbed;
  if (type == "element") {
    votingEmbed = {
      title: `${capitalize(type)}`,
      description: `**Machine:** \`${operator}\`\n**Combination:** ${elements.join(' + ')}\n**Result:** ${suggested}\n\nSuggested by <@${inter.user.id}>`,
      footer: {text: "Current Vote: 0"}
    };
  } else if (type == "operator") {
    votingEmbed = {
      title: `${capitalize(type)}`,
      description: `**Machine:** \`${operator}\`\n**Combination:** ${elements.join(' + ')}\n**Result:** \`${suggested}\`\n**Required Element #:** ${reqlength}\n\nSuggested by <@${inter.user.id}>`,
      footer: {text: "Current Vote: 0"}
    };
  }

  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId(`upvote:${uid}`)
        .setEmoji({ name: "⬆️" })
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`downvote:${uid}`)
        .setEmoji({ name: "⬇️" })
        .setStyle(ButtonStyle.Primary))

  voteList[uid] = {votes: 0, operator: operator, parents: elements, suggested: suggested, type: type, user: inter.user.id, reqlength: reqlength};

  votingChannel.send({ embeds: [votingEmbed], components: [row] });
}

/////// BUTTON FUNCS ///////

async function editVoteEmbed(inter, type, operator, parents, result, reqlength, user, voteCount) {
  let newEmbed;
  if (type == "element") {
    newEmbed = {
      title: `${capitalize(type)}`,
      description: `**Machine:** \`${operator}\`\n**Combination:** ${parents.join(' + ')}\n**Result:** ${result}\n\nSuggested by <@${user}>`,
      footer: {text: `Current Vote: ${voteCount}`}
    };
  } else if (type == "operator") {
    newEmbed = {
      title: `${capitalize(type)}`,
      description: `**Machine:** \`${operator}\`\n**Combination:** ${parents.join(' + ')}\n**Result:** \`${result}\`\n**Required Element #:** ${reqlength}\n\nSuggested by <@${user}>`,
      footer: {text: `Current Vote: ${voteCount}`}
    };
  }

  await inter.update({ embeds: [newEmbed] });
}

const VOTE_LIMIT = 2;

async function determineVote(inter, upvote) {
  const votingChannel = inter.guild.channels.cache.get(process.env.voteChannelId)
  const votingEmbed = votingChannel.messages.cache.get(inter.message.id)
  const uid = inter.customId.split(":")[1];
  const object = voteList[uid];
  const vote = upvote ? 1 : -1

  if (!object) {
    await inter.reply({ content: "There was an error...", ephemeral: true });
    return;
  }

  let voteCount = object.votes;

  if (!player.votes[uid]) player.votes[uid] = {};

  let currVote = player.votes[uid][inter.user.id];
  
  if (currVote == vote) {
    await inter.reply({ content: "You already voted that!", ephemeral: true });
    return;
  } else if (currVote == -vote) {
    voteCount += vote;
  }
  player.votes[uid][inter.user.id] = vote;
  
  voteCount += vote;
  voteList[uid] = {votes: voteCount, operator: object.operator, parents: object.parents, suggested: object.suggested, user: object.user, type: object.type, reqlength: object.reqlength};

  await editVoteEmbed(inter, object.type, object.operator, object.parents, object.suggested, object.reqlength, object.user, voteCount)
  
  if (!upvote && inter.user.id == object.user) {
    player.numSugs[object.user]--;
    await deleteEmbed(votingEmbed);
    delete voteList[uid];
    return;
  }

  
  const name = capitalize(object.suggested.toLowerCase());
  if (voteCount >= VOTE_LIMIT) {
    let newsMsg = "";
    if (object.type === "element") {
      if (elements[name]) {
        let currList = elements[name].parents;
        elements[name] = new Element([...currList, [object.operator, ...object.parents]]);
        newsMsg = "**New Element Combo:**";
      } else {
        elements[name] = new Element([[object.operator, ...object.parents]]);
        player.invs[object.user].elements[name] = elements.name;
        newsMsg = "**New Element:**";
      }
    } else if (object.type === "operator") {
      if (operators[name]) {
        let currList = operators[name].parents;
        operators[name] = new Operator([...currList, [object.operator, ...object.parents]], object.reqlength);
        newsMsg = "**New Operator Combo:**";
      } else {
        operators[name] = new Operator([[object.operator, ...object.parents]], object.reqlength);
        player.invs[object.user].operators[name] = operators.name;
        newsMsg = "**New Operator:**";
      }
    } else {
      throw "Uh oh, something *bad* happened...";
    }

    await inter.guild.channels.cache.get(process.env.newsChannelId).send(`${newsMsg} ${name} (By <@${object.user}>)`);
    delete player.votes[uid];
    delete voteList[uid];
    await deleteEmbed(votingEmbed);
    player.numSugs[object.user]--;
  } else if (voteCount <= -VOTE_LIMIT) {
    delete player.votes[uid];
    delete voteList[uid];
    await deleteEmbed(votingEmbed);
    await inter.guild.channels.cache.get(process.env.newsChannelId).send(`A vote by <@${object.user}> was rejected.`);
    player.numSugs[object.user]--;
  }
}

/////// COMBINATION ///////

const ELEMENT_DOESNT_EXIST = 0;
const ELEMENT_OBTAINED = 1;
const ELEMENT_UNOBTAINED = 2;
const OPERATOR_UNOBTAINED = 3;
var currentOperator = "";

async function parseMsg(msg) {
  let parents = [];
  let parent = "";
  let allowPlus = true;

  if (msg.length > 150) return null;
  
  msg = msg.map(v => capitalize(v.toLowerCase()) );
  if (!operators[msg[0]]) {
    currentOperator = "+";
  } else {
    currentOperator = msg[0];
    msg.splice(0, 1);
  }

  for (let i = 0; i < msg.length; i++) {
    if (msg[i] != "+" || allowPlus) {
      if (!allowPlus) parent += " "
      parent += msg[i];
      allowPlus = false;
    } else {
      parents.push(parent);
      parent = "";
      allowPlus = true;
    }
  }
  if (!allowPlus) {
    parents.push(parent);
  }

  return parents;
}

async function setPlayerInv(user) {
  player.invs[user] = {
    elements: {
      'Air': elements['Air'],
      'Earth': elements['Earth'],
      'Fire': elements['Fire'],
      'Water': elements['Water'],
    },
    operators: {
      '+': operators['+'],
    }
  };
}

async function combine(inter) {
  // get the elements
  let msg = inter.content.split(" ");

  let check = false;
  for (i of msg) {
    if (operators.hasOwnProperty(capitalize(i.toLowerCase()))) check = true;
  }
  if (!check) return;

  delete suggestList[inter.author.id];

  let playerInv;
  let playerInvOp;
  try {
    playerInv = player.invs[inter.author.id].elements;
    playerInvOp = player.invs[inter.author.id].operators;
  } catch {
    setPlayerInv(inter.author.id);
    playerInv = player.invs[inter.author.id].elements;
    playerInvOp = player.invs[inter.author.id].operators;
  }
  
  parents = await parseMsg(msg);
  if (parents == null) {
    await inter.reply("Your message is too long!");
    return;
  }

  let ret = false;
  parents.forEach(p => {
    if (!elements[p]) {
      ret = p;
    }
  });
  if (ret) {
    await inter.reply(`One or more of those elements don't exist!`);
    return;
  }

  for (let e = 0; e < parents.length; e++) {
    if (!playerInv.hasOwnProperty(parents[e])) {
      await inter.reply(`You don't have **${parents[e]}**!`);
      return;
    }
  }

  if (!playerInvOp.hasOwnProperty(currentOperator)) {
    await inter.reply(`You don't have \`${currentOperator}\`!`);
    return;
  }

  if (parents.length < operators[currentOperator].reqLength) {
    await inter.reply("There are not enough elements to combine!")
    return;
  }

  let comboMsg = ELEMENT_DOESNT_EXIST;
  let created = "";
  for (const [k, e] of Object.entries(elements)) {
    if (arrIncludes(e.parents, [currentOperator, ...parents])) {
      if (playerInv.hasOwnProperty(k)) {
        comboMsg = ELEMENT_OBTAINED;
      } else {
        comboMsg = ELEMENT_UNOBTAINED;
      }
      created = k;
    }
  }
  for (const [k, o] of Object.entries(operators)) {
    if (arrIncludes(o.parents, [currentOperator, ...parents])) {
      if (playerInvOp.hasOwnProperty(k)) {
        comboMsg = ELEMENT_OBTAINED;
      } else {
        comboMsg = OPERATOR_UNOBTAINED;
      }
      created = k;
    }
  }
  switch (comboMsg) {
    case ELEMENT_DOESNT_EXIST:
      await inter.reply("This combination doesn't exist!\nType **/suggest** to suggest a result!");
      suggestList[inter.author.id] = [currentOperator, parents];
      break;
    case ELEMENT_OBTAINED:
      await inter.reply(`You made **${created}**, but already have it.`);
      break;
    case ELEMENT_UNOBTAINED:
      await inter.reply(`You made **${created}**!`);
      player.invs[inter.author.id].elements[created] = elements[created]; 
      break;
    case OPERATOR_UNOBTAINED:
      await inter.reply(`You made \`${created}\`!`);
      player.invs[inter.author.id].operators[created] = operators[created];
      break;
  }
}

function capitalize(str) {
  return str.replace( /(^|\s)([a-z])/g , function(m,p1,p2){return p1+p2.toUpperCase();});
};

function arrIncludes(aArr, bArr) {
  for (const arr of aArr) {
    if (arr.sort().toString() == bArr.sort().toString()) return true;
  }
  return false;
}

async function deleteEmbed(embed) {
  try {
    embed.delete();
  } catch {
    console.log("Delete Attempt...")
  }
}