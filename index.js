import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
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
  name: joi.string().required().trim(),
});
const messageSchema = joi.object({
  to: joi.string().required().trim(),
  text: joi.string().required().trim(),
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
    res.sendStatus(500);
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
  const validationUser = participantSchema.validate({ name: user });
  const validation = messageSchema.validate({ to, text, type });
  if (validation.error || validationUser.error) {
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
  const validationUser = participantSchema.validate({ name: user });
  if (validationUser.error) {
    return res.sendStatus(422);
  }
  try {
    const messages = await db.collection("messages").find().toArray();
    if (limit) {
      return res.send(
        messages
          .filter((e, index) => index < limit)
          .filter(
            (e) =>
              e.to === "Todos" ||
              e.type === "message" ||
              e.type === "status" ||
              (e.type === "private_message" &&
                (e.to === user || e.from === user))
          )
      );
    }
    res.send(
      messages.filter(
        (e) =>
          e.to === "Todos" ||
          e.type === "message" ||
          e.type === "status" ||
          (e.type === "private_message" && (e.to === user || e.from === user))
      )
    );
  } catch (error) {
    res.sendStatus(500);
  }
});
server.post("/status", async (req, res) => {
  const { user } = req.headers;
  try {
    const participants = await db
      .collection("participants")
      .find({ name: user })
      .toArray();
    if (participants.length === 0) {
      return res.status(404).send("Usuário não encontrado");
    }
    db.collection("participants").updateOne(
      { name: user },
      { $set: { lastStatus: Date.now() } }
    );
    setInterval(excludePartipant, 15000);
    res.sendStatus(200);
  } catch (error) {
    res.sendStatus(500);
  }
});
async function excludePartipant() {
  try {
    const participants = await db.collection("participants").find().toArray();
    for (let i = 0; i < participants.length; i++) {
      const { name, lastStatus } = participants[i];
      if ((Date.now() - lastStatus) / 1000 > 10) {
        db.collection("messages").insertOne({
          from: name,
          to: "Todos",
          text: "sai da sala...",
          type: "status",
          time: dayjs().format("HH:mm:ss"),
        });
        db.collection("participants").deleteOne({ name });
      }
    }
  } catch (error) {
    console.log(error.message);
    res.sendStatus(500);
  }
}
server.delete("/messages/:ID_DA_MENSAGEM", async (req, res) => {
  const { user } = req.headers;
  const { ID_DA_MENSAGEM } = req.params;
  try {
    const message = await db
      .collection("messages")
      .findOne({ _id: new ObjectId(ID_DA_MENSAGEM) });
    if (message.from !== user) {
      return res.sendStatus(401);
    }
    db.collection("messages").deleteOne({ _id: new ObjectId(ID_DA_MENSAGEM) });
    res.sendStatus(200);
  } catch (error) {
    res.sendStatus(404);
  }
});
server.put("/messages/:ID_DA_MENSAGEM", async (req, res) => {
  const { to, text, type } = req.body;
  const { user } = req.headers;
  const { ID_DA_MENSAGEM } = req.params;
  const validation = messageSchema.validate({ to, text, type });
  try {
    const participants = await db
      .collection("participants")
      .find({ name: user })
      .toArray();
    if (participants.length === 0 || validation.error) {
      return res.sendStatus(422);
    }
    const message = await db
      .collection("messages")
      .findOne({ _id: new ObjectId(ID_DA_MENSAGEM) });
    if (message.from !== user) {
      return res.sendStatus(401);
    }
    db.collection("messages").updateOne(
      {
        _id: new ObjectId(ID_DA_MENSAGEM),
      },
      { $set: { to, text, type } }
    );
    res.sendStatus(200);
  } catch (error) {
    res.sendStatus(404);
  }
});
server.listen(5000, () => console.log("Listening on  port 5000"));
