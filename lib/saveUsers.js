const { readFileSync, writeFileSync } = require("fs");
const { join } = require("path");

const logging = require("./logging");

const users = JSON.parse(
  readFileSync(join(__dirname, "../database/users.json"))
);
const filters = JSON.parse(
  readFileSync(join(__dirname, "../database/filters.json"))
);
const contacts = JSON.parse(
  readFileSync(join(__dirname, "../database/contacts.json"))
);

module.exports = ({ userId }) => {
  if (!userId || !userId.endsWith("@s.whatsapp.net")) return;
  const isExistUser = users.some((user) => user === userId);
  const isExistFilter = filters.some((filter) => filter === userId);
  const isExistContact = contacts.some((contact) => contact === userId);
  if (isExistUser || isExistFilter || isExistContact) return;
  try {
    users.push(userId);
    writeFileSync(
      join(__dirname, "../database/users.json"),
      JSON.stringify(users)
    );
  } catch (err) {
    logging("error", "Error Save Users", err);
  } finally {
    logging("primary", "New Users", userId.split("@")[0]);
  }
};
