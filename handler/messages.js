const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const logging = require("../lib/logging");
const { readFileSync, writeFileSync, unlinkSync } = require("fs");
const logger = require("pino");
const { join } = require("path");
const { tmpdir } = require("os");
const Crypto = require("crypto");
const ff = require("fluent-ffmpeg");
const webp = require("node-webpmux");

const users = JSON.parse(
  readFileSync(join(__dirname, "../database/users.json"))
);
const filters = JSON.parse(
  readFileSync(join(__dirname, "../database/filters.json"))
);
const contacts = JSON.parse(
  readFileSync(join(__dirname, "../database/contacts.json"))
);

module.exports = async ({ reybot, msg, isGroup }) => {
  if (isGroup) {
    const userId = msg.key.participant || msg.messageStubType[0];
    const groupId = msg.key.remoteJid;
    /*// Only fromMe //*/
    if (msg.key && msg.key.fromMe) {
      /*// Messages Type Text / Conversation //*/
      if (msg.message && msg.message.conversation) {
        /*// Start Broadcast Fitur //*/
        const regexBc = new RegExp(/^\!Bc\s(.+)/i);
        if (regexBc.test(msg.message.conversation)) {
          try {
            const broadcastTxt = msg.message.conversation.replace(
              /^\!Bc\s*/i,
              ""
            );
            const metadaGroup = await reybot.groupMetadata(groupId);
            const groupParticipants = metadaGroup.participants.map(
              (part) => part.id
            );
            let sent = 0;
            const loopBroadcast = setInterval(async () => {
              if (groupParticipants.length === sent) {
                logging(
                  "success",
                  `Broadcast Successfully`,
                  `Sent to ${sent} Users`
                );
                clearInterval(loopBroadcast);
              } else {
                await reybot.sendMessage(groupParticipants[sent], {
                  text: broadcastTxt,
                });
                sent++;
                logging(
                  "error",
                  `Broadcast sent ${sent}`,
                  groupParticipants[sent - 1]
                );
              }
            }, 5000);
          } catch (err) {
            logging("error", "Failed to broadcast", err);
          } finally {
            return;
          }
        }
        /*// Clone Group //*/
        const cloneRegex = new RegExp(/^\!Clone\s(.+)/i);
        if (cloneRegex.test(msg.message.conversation)) {
          try {
            const nameGroup = msg.message.conversation.replace(
              /^\!Clone\s*/i,
              ""
            );
            const groupPict = readFileSync(
              join(__dirname, "../groupPict.jpeg")
            );
            const metadaGroup = await reybot.groupMetadata(groupId);
            const groupParticipants = metadaGroup.participants.map(
              (part) => part.id
            );
            const group = await reybot.groupCreate(
              `${nameGroup}`,
              groupParticipants
            );
            await reybot.groupSettingUpdate(group.id, "locked");
            await reybot.sendMessage(group.id, {
              caption: `*Hallo Selamat datang semua di Group ${nameGroup}*`,
              image: groupPict,
              headerType: 4,
            });
            logging("success", "Successfully Cloning Group", nameGroup);
          } catch (err) {
            logging("error", "Error Cloning group", err);
          } finally {
            return;
          }
        }
      }
      /*// Messages types Images //*/
      if (msg.message && msg.message.imageMessage) {
        /*// Broadcast With Image Message //*/
        const caption = msg.message.imageMessage.caption;
        const bcRegex = new RegExp(/^\!Bc\s(.+)/i);
        if (bcRegex.test(caption)) {
          const img = await downloadMediaMessage(msg, "buffer", {}, { logger });
          writeFileSync(join(__dirname, "../broadcast.jpeg"), img);
          const broadcastTxt = caption.replace(/^\!Bc\s*/i, "");
          const broadcastImg = readFileSync(
            join(__dirname, "../broadcast.jpeg")
          );
          try {
            const metadaGroup = await reybot.groupMetadata(groupId);
            const groupParticipants = metadaGroup.participants.map(
              (part) => part.id
            );
            let sent = 0;
            const loopBroadcast = setInterval(async () => {
              if (groupParticipants.length === sent) {
                logging(
                  "success",
                  `Broadcast Successfully`,
                  `Sent to ${sent} Users`
                );
                clearInterval(loopBroadcast);
              } else {
                await reybot.sendMessage(groupParticipants[sent], {
                  caption: broadcastTxt,
                  image: broadcastImg,
                  headerType: 4,
                });
                sent++;
                logging(
                  "error",
                  `Broadcast sent ${sent}`,
                  groupParticipants[sent - 1]
                );
              }
            }, 5000);
          } catch (err) {
            logging("error", "Error Broadcast", err);
          } finally {
            return;
          }
        }
      }
    }
    return;
  } else {
    const userId = msg.key.remoteJid;
    if (msg.key && msg.key.fromMe) {
      /*// Chat type Text
       * {*} Broadcast {*}
       */
      const msgTxt = msg.message.extendedTextMessage
        ? msg.message.extendedTextMessage.text
        : msg.message.conversation;
      if (msg.message && msgTxt) {
        /*// Start Broadcast //*/
        const bcRegex = new RegExp(/^\!Bc/i);
        if (bcRegex.test(msgTxt)) {
          const message = msgTxt.replace(/^\!Bc\s*/i, "");
          broadcast(reybot, msg, userId, message);
        }
        /*// End Broadcast //*/
        /*// Start Save Contacts //*/
        const contactRegex = new RegExp(/^\!Save/i);
        if (contactRegex.test(msgTxt)) {
          try {
            await reybot.sendMessage(
              userId,
              {
                sticker: {
                  url: join(__dirname, "../alzf1gcip.webp"),
                },
              },
              { quoted: msg }
            );
            const isContactExist = contacts.some(
              (contact) => contact === userId
            );
            if (!isContactExist) {
              contacts.push(userId);
              writeFileSync(
                join(__dirname, "../database/contacts.json"),
                JSON.stringify(contacts)
              );
              await reybot.sendMessage(userId, {
                text: "*DONE* 🤓",
              });
            } else {
              await reybot.sendMessage(userId, {
                text: "*Nomor ini sudah tersimpan* 🤨",
              });
            }
          } catch (err) {
            logging("error", "Error sendMessage", err);
          }
        }
      }
      /*// Chat type Image
       * {*} Broadcast {*}
       */
      const msgImg = msg.message.imageMessage;
      if (msg.message && msgImg) {
        /*// Start Broadcast With Image //*/
        const caption = msg.message.imageMessage.caption;
        const bcRegex = new RegExp(/^\!Bc/i);
        if (bcRegex.test(caption)) {
          try {
            const img = await downloadMediaMessage(
              msg,
              "buffer",
              {},
              { logger }
            );
            writeFileSync(join(__dirname, "../image.jpeg"), img);
          } catch (err) {
            logging("info", "Error save Image", err);
          } finally {
            const message = caption.replace(/^\!Bc\s*/i, "");
            const imgMessage = readFileSync(join(__dirname, "../image.jpeg"));
            broadcast(reybot, msg, userId, message, imgMessage);
            /*// End Broadcast With Image //*/
          }
        }
      }
    }
  }
  return;
};

const broadcast = async (reybot, msg, userId, message, imgMessage) => {
  let sent = 1;
  const dataUsers = users.filter((user) => !contacts.includes(user));
  const filteredUsers = dataUsers.filter((user) => !filters.includes(user));
  if (filteredUsers.length <= 0) {
    try {
      await reybot.sendMessage(
        userId,
        { text: "*Database Users 0*" },
        { quoted: msg }
      );
    } catch (err) {
      logging("error", "Error sendMessage", err);
    }
  } else {
    try {
      await reybot.sendMessage(
        userId,
        {
          text: `*Broadcast start*\n\n*Target: ${filteredUsers.length} users*`,
        },
        { quoted: msg }
      );
    } catch (err) {
      logging("error", "Error sendMessage", err);
    } finally {
      const loopBroadcast = setInterval(async () => {
        if (!imgMessage) {
          try {
            await reybot.sendMessage(filteredUsers[0], {
              text: `${message}`,
            });
            logging("success", `Broadcast sent ${sent}`, filteredUsers[0]);
          } catch (err) {
            logging("error", `Brodcast Gagal ${sent}`, err);
          }
        } else {
          try {
            await reybot.sendMessage(filteredUsers[0], {
              caption: message,
              image: imgMessage,
              headerType: 4,
            });
            logging("success", `Broadcast sent ${sent}`, filteredUsers[0]);
          } catch (err) {
            logging("error", `Broadcast Gagal ${sent}`, err);
          }
        }
        if (0 === filteredUsers.length - 1) {
          try {
            await reybot.sendMessage(userId, {
              text: `*BROADCAST SUCCESSFUL*\n${sent} Messages sent`,
            });
          } catch (err) {
            logging("error", "Error sendMessage", err);
          }
          clearInterval(loopBroadcast);
        }
        filteredUsers.splice(0, 1);
        writeFileSync(
          join(__dirname, "../database/users.json"),
          JSON.stringify(filteredUsers)
        );
        sent++;
      }, 5000);
    }
  }
};

async function imageToWebp(media) {
  const tmpFileOut = join(
    tmpdir(),
    `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`
  );
  const tmpFileIn = join(
    tmpdir(),
    `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.jpg`
  );

  writeFileSync(tmpFileIn, media);

  await new Promise((resolve, reject) => {
    ff(tmpFileIn)
      .on("error", reject)
      .on("end", () => resolve(true))
      .addOutputOptions([
        "-vcodec",
        "libwebp",
        "-vf",
        "scale='min(320,iw)':min'(320,ih)':force_original_aspect_ratio=decrease,fps=15, pad=320:320:-1:-1:color=white@0.0, split [a][b]; [a] palettegen=reserve_transparent=on:transparency_color=ffffff [p]; [b][p] paletteuse",
      ])
      .toFormat("webp")
      .save(tmpFileOut);
  });

  const buff = readFileSync(tmpFileOut);
  unlinkSync(tmpFileOut);
  unlinkSync(tmpFileIn);
  return buff;
}

async function writeExifImg(media, metadata) {
  let wMedia = await imageToWebp(media);
  const tmpFileIn = join(
    "./",
    `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`
  );
  const tmpFileOut = join(
    "./",
    `${Crypto.randomBytes(6).readUIntLE(0, 6).toString(36)}.webp`
  );
  writeFileSync(tmpFileIn, wMedia);

  if (metadata.packname || metadata.author) {
    const img = new webp.Image();
    const json = {
      "sticker-pack-id": `https://github.com/DikaArdnt/Hisoka-Morou`,
      "sticker-pack-name": metadata.packname,
      "sticker-pack-publisher": metadata.author,
      emojis: metadata.categories ? metadata.categories : [""],
    };
    const exifAttr = Buffer.from([
      0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
      0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
    ]);
    const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
    const exif = Buffer.concat([exifAttr, jsonBuff]);
    exif.writeUIntLE(jsonBuff.length, 14, 4);
    await img.load(tmpFileIn);
    unlinkSync(tmpFileIn);
    img.exif = exif;
    await img.save(tmpFileOut);
    return tmpFileOut;
  }
}
