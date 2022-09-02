import express from "express";
import cors from "cors";
import { MongoClient } from "mongodb";
import dotenv from "dotenv";
import dayjs from "dayjs";
import joi from "joi";
dotenv.config();

const server = express();
server.use(express.json());
server.use(cors());

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient.connect().then(() => {
  db = mongoClient.db("API-bate-papo");
});

const participantSchema = joi.object({
  name: joi.string().required(),
});
const messageSchema = joi.object({
  to: joi.string().required(),
  text: joi.string().required(),
  type: joi.string().required().only().allow("message", "private_message"),
});
server.post("/participants", async (req, res) => {
  const { name } = req.body;
  const validation = participantSchema.validate({ name });
  if (validation.error) {
    return res.sendStatus(422);
  }
  try {
    const participants = await db
      .collection("participants")
      .find({ name })
      .toArray();
    if (participants.length !== 0) {
      return res.status(409).send("Usuário já cadastrado");
    } else {
      db.collection("participants").insertOne({
        name,
        lastStatus: Date.now(),
      });
      db.collection("messages").insertOne({
        from: name,
        to: "Todos",
        text: "entra na sala...",
        type: "status",
        time: dayjs().format("HH:mm:ss"),
      });
      res.sendStatus(201);
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
    res.sendStatus(500);
  }
});
server.post("/messages", async (req, res) => {
  const { to, text, type } = req.body;
  const { user } = req.headers;
  const validation = messageSchema.validate({ to, text, type });
  if (validation.error) {
    return res.sendStatus(422);
  }
  try {
    const participants = await db
      .collection("participants")
      .find({ name: user })
      .toArray();
    if (participants.length === 0) {
      return res.status(422).send("Usuário não encontrado");
    }
    db.collection("messages").insertOne({
      from: user,
      to,
      text,
      type,
      time: dayjs().format("HH:mm:ss"),
    });
    res.sendStatus(201);
  } catch (error) {
    res.sendStatus(500);
  }
});
server.get("/messages", async (req, res) => {
  const limit = req.query.limit;
  const { user } = req.headers;
  try {
    const messages = await db.collection("messages").find().toArray();
    if (limit) {
      return res.send(messages.filter((e, index) => index < Number(limit)));
    }
    res.send(messages);
  } catch (error) {
    res.sendStatus(500);
  }
});
server.post("/status", async (req, res) => {
  const { user } = req.headers;
  try {
    const participants = db
      .collection("participants")
      .find({ name: user })
      .toArray();
    if (participants.length === 0) {
      return res.status(404).send("Usuário não encontrado");
    }
  } catch (error) {
    res.sendStatus(500);
  }
});
server.listen(5000, () => console.log("Listening on  port 5000"));
