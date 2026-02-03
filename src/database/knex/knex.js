const path = require("path");
const knex = require("knex");

// knex config to set up sqlite database
const sqlite_db = knex({
  client: "sqlite3",
  connection: {
    filename: path.resolve(__dirname, "../sqlite/abbey-road.db")
  },
  useNullAsDefault: true
});

// exporting knex config

module.exports={
	sqlite_db: sqlite_db
}

