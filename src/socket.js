const http = require("http");
const socketIO = require("socket.io");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const Post = require("../src/models/post");
const User = require("../src/models/user");
const Notification = require("../src/models/notification");
const Chat = require("../src/models/chat");
const { connect } = require("mongoose");

module.exports = (app) => {
  const httpServer = http.createServer(app);
  const socketServer = new socketIO.Server(httpServer, {
    cors: { origin: "*" },
  });

  app.set("socketServer", socketServer);
  const chat = socketServer.of("/chat");

  const connectedUser = {};
  let connectedChat = {};

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
    let roomId;

    socket.on("disconnect", () => {
      delete connectedUser[id];
      console.log("Client disconnected ", socket.id);
    });

    socket.on("postLike", async (postId, targetId) => {
      try {
        const post = await Post.findById(postId, {
          contents: 1,
          likeUsers: 1,
          imageUrl: 1,
        });
        const isLike = post.likeUsers.includes(id);
        if (connectedUser[targetId] && isLike) {
          socket.to(connectedUser[targetId]).emit("postLike", {
            notiType: "postLike",
            post: { imageUrl: post.imageUrl, contents: post.contents },
            sendUser: { userId, profileImage },
          });
        }
        if (isLike) {
          await Notification.create({
            notiType: "postLike",
            receiveUser: targetId,
            sendUser: id,
            postId: postId,
            date: Date.now(),
          });
        }
      } catch (error) {
        console.log(error);
      }
    });

    socket.on("follow", async (targetId) => {
      try {
        const user = await User.aggregate([
          { $match: { _id: new mongoose.Types.ObjectId(id) } },
          {
            $lookup: {
              from: "users",
              let: { id: "$_id" },
              pipeline: [
                {
                  $match: { _id: new mongoose.Types.ObjectId(targetId) },
                },
                { $project: { follow: 1 } },
              ],
              as: "receiveUser",
            },
          },
          { $unwind: "$receiveUser" },
          {
            $project: {
              userId: 1,
              profileImage: 1,
              isFollowTarget: {
                $in: [new mongoose.Types.ObjectId(targetId), "$follow"],
              },
              isFollowMe: {
                $in: [new mongoose.Types.ObjectId(id), "$receiveUser.follow"],
              },
            },
          },
        ]);
        if (connectedUser[targetId] && user[0].isFollowTarget) {
          socket.to(connectedUser[targetId]).emit("follow", {
            notiType: "follow",
            sendUser: {
              userId: user[0].userId,
              profileImage: user[0].profileImage,
            },
            isFollow: user[0].isFollowMe,
          });
        }
        if (user[0].isFollowTarget) {
          await Notification.create({
            notiType: "follow",
            receiveUser: targetId,
            sendUser: id,
            date: Date.now(),
          });
        }
      } catch (error) {
        console.log(error);
      }
    });

    // socket.on("makeRoom", async (roomName, users) => {
    //   const chat = await Chat.findOne({ roomName });
    //   if (!chat) {
    //     await Chat.create({
    //       roomName: roomName,
    //       joinUser: users,
    //       chats: [],
    //     });
    //   }
    // });
    //
    // socket.on("joinRoom", async (roomName) => {
    //   // console.log(roomName);
    //   roomId = roomName;
    //   if (Object.keys(connectedChat).indexOf(String(roomName)) === -1) {
    //     connectedChat[roomName] = {};
    //   }
    //   connectedChat[roomName][id] = socket.id;
    //   console.log(connectedChat);
    //   socket.join(roomName);
    // });
    //
    // socket.on("leaveRoom", (roomName) => {
    //   console.log("Leave Room");
    //   if (Object.keys(connectedChat[roomName]).length === 1) {
    //     delete connectedChat[roomName];
    //   } else {
    //     delete connectedChat[roomName][id];
    //   }
    //   console.log(connectedChat);
    //   socket.leave(roomName);
    // });
    //
    // socket.on("newMessage", (message) => {
    //   console.log(id + ": " + message + " / " + roomId);
    //   socket.to(roomId).emit("newMessage", message, id);
    // });
  });

  chat.use(async (socket, next) => {
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

  chat.on("connection", (socket) => {
    const { id, userId, profileImage } = socket.user;
    let roomName;
    let chatData;
    console.log("Chat socket connected! ", socket.id);

    socket.on("disconnect", () => {
      console.log("Chat socket disconnected! ", socket.id);
      if (connectedChat[roomName] !== undefined) {
        delete connectedChat[roomName][id];
        if (Object.keys(connectedChat[roomName]).length === 0) {
          delete connectedChat[roomName];
        }
        socket.leave(roomName);
        console.log("Leave Room ?????? ????????? ::", connectedChat);
        // console.log(
        //   "Leave Room ?????? ?????? ????????? ::",
        //   socketServer.of("/chat").adapter.rooms
        // );
      }
    });

    socket.on("joinRoom", async (roomId) => {
      roomName = roomId.toString();
      chatData = await Chat.findOne({ roomId: roomName });
      // console.log(Object.keys(connectedChat).indexOf(String(roomName)));
      if (!connectedChat[roomName]) {
        connectedChat[roomName] = {};
      }
      connectedChat[roomName][id] = socket.id;
      socket.join(roomName);
      console.log("Join Room ?????? ????????? ::", connectedChat);
      // console.log(
      //   "Join Room ?????? ?????? ????????? ::",
      //   socketServer.of("/chat").adapter.rooms
      // );
    });

    socket.on("newMessage", async (message) => {
      console.log(userId + ": " + message);
      chatData.chats.push({
        user: id,
        message: message,
      });
      await chatData.save();
      socket
        .to(roomName)
        .emit("newMessage", { user: { userId, profileImage }, message });
      chatData.participant
        .filter((user) => user !== id.toString())
        .forEach((user) => {
          if (!connectedChat[roomName][user]) {
            socketServer
              .of("/")
              .to(connectedUser[user])
              .emit("messageAlert", `${userId}?????? ???????????? ???????????????.`);
          }
        });
    });
  });

  httpServer.listen(app.get("port"), () => {
    console.log(`??? Server listening on http://localhost:${app.get("port")}`);
  });
};
