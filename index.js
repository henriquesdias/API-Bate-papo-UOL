import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
dotenv.config();

const server = express();
server.use(express.json());
server.use(cors());
const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;
mongoClient.connect().then(() => {
  db = mongoClient.db("API-bate-papo");
});

server.post("/participants", async (req, res) => {
  const { name } = req.body;
  if (name === "") {
    return res.sendStatus(422);
  }
  try {
    const participants = await db
      .collection("participants")
      .find({ name: name })
      .toArray();
    if (participants.length !== 0) {
      return res.status(409).send("Usuário já cadastrado");
    } else {
      db.collection("participants").insertOne({
        name: name,
        lastStatus: Date.now(),
      });
      return res.sendStatus(201);
    }
  } catch (error) {
    console.log(error);
  }
});
server.get("/participants", async (req, res) => {
  try {
    const participants = await db.collection("participants").find().toArray();
    res.send(participants);
  } catch (error) {
    console.log(error);
  }
});
server.post("/messages", (req, res) => {
  const { to, text, type } = req.body;
  const { user } = req.headers;
});
server.get("/messages", (req, res) => {
  const limit = req.query.limit;
  const { user } = req.headers;
});
server.post("/status", (req, res) => {
  const { user } = req.headers;
});
server.listen(5000, () => console.log("Listening on  port 5000"));
