const { readFileSync, writeFileSync } = require("fs");
const { join } = require("path");

const logging = require("./logging");

const filters = JSON.parse(
  readFileSync(join(__dirname, "../database/filters.json"))
);

module.exports = ({ userId }) => {
  if (!userId || !userId.endsWith("@s.whatsapp.net")) return;
  const isExistFilter = filters.some((filter) => filter === userId);
  if (isExistFilter) return;
  try {
    filters.push(userId);
    writeFileSync(
      join(__dirname, "../database/filters.json"),
      JSON.stringify(filters)
    );
  } catch (err) {
    logging("error", "Failed save user in Filters.json", err);
  } finally {
    logging("primary", "New Filters", userId);
  }
};
