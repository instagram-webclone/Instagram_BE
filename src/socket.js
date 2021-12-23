const http = require("http");
const socketIO = require("socket.io");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const moment = require("./moment");

const Post = require("../src/models/post");
const User = require("../src/models/user");
const Notification = require("../src/models/notification");

module.exports = (app) => {
  const httpServer = http.createServer(app);
  const socketServer = new socketIO.Server(httpServer, {
    cors: { origin: "*" },
  });

  const connectedUser = {};
  socketServer.use(async (socket, next) => {
    const token = socket.handshake.headers.authorization;
    if (token !== "null") {
      const { userId: id } = await jwt.verify(token, process.env.JWT_KEY);
      const user = await User.findById(id, {
        userId: 1,
        profileImage: 1,
      }).lean();
      socket.user = {
        id: user._id,
        userId: user.userId,
        profileImage: user.profileImage,
      };
      next();
    }
  });

  socketServer.on("connection", (socket) => {
    const { id, userId, profileImage } = socket.user;
    connectedUser[id] = socket.id;
    console.log("Client connected " + socket.id);
    console.log(connectedUser);
    socket.on("disconnect", () => {
      delete connectedUser[id];
      console.log("Client disconnected ", socket.id);
    });
    socket.on("postLike", async (postId, targetId) => {
      try {
        const post = await Post.findById(postId, { imageUrl: 1 }).lean();
        if (connectedUser[targetId]) {
          socket.to(connectedUser[targetId]).emit("postLike", {
            notiType: "postLike",
            post: [post],
            sendUser: { userId, profileImage },
            date: Date.now(),
          });
        }
        await Notification.create({
          notiType: "postLike",
          receiveUser: targetId,
          sendUser: id,
          postId: postId,
          date: Date.now(),
        });
      } catch (error) {
        console.log(error);
      }
    });
    socket.on("follow", async (targetId) => {
      try {
        const user = await User.aggregate([
          { $match: { _id: new mongoose.Types.ObjectId(id) } },
          {
            $project: {
              userId: 1,
              profileImage: 1,
              isFollow: {
                $in: [new mongoose.Types.ObjectId(targetId), "$follower"],
              },
            },
          },
        ]);
        if (connectedUser[targetId]) {
          socket.to(connectedUser[targetId]).emit("follow", {
            notiType: "follow",
            user: user[0],
            date: Date.now(),
          });
        }
        await Notification.create({
          notiType: "follow",
          receiveUser: targetId,
          sendUser: id,
          date: Date.now(),
        });
      } catch (error) {
        console.log(error);
      }
    });
  });

  httpServer.listen(app.get("port"), () => {
    console.log(`✅ Server listening on http://localhost:${app.get("port")}`);
  });
};
