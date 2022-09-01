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

server.post("/participants", (req, res) => {
  const { name } = req.body;
  //{name: name, lastStatus: Date.now()}
});
server.get("/participants", (req, res) => {
  //retornar lista de participantes
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
