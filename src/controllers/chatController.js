const mongoose = require("mongoose");

const Chat = require("../models/chat");

exports.getChatList = async (req, res, next) => {
  const { userId } = req;
  try {
    const chatList = await Chat.aggregate([
      {
        $match: {
          $expr: { $in: [new mongoose.Types.ObjectId(userId), "$participant"] },
        },
      },
      {
        $project: {
          roomId: 1,
          user: {
            $filter: {
              input: "$participant",
              // as: "participants",
              cond: {
                $ne: ["$$this", new mongoose.Types.ObjectId(userId)],
              },
            },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          let: { user: "$user" },
          pipeline: [
            { $match: { $expr: { $in: ["$_id", "$$user"] } } },
            { $project: { userId: 1, profileImage: 1 } },
          ],
          as: "user",
        },
      },
    ]);
    return res.status(200).json({ ok: true, chatList });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

exports.makeChatRoom = async (req, res, next) => {
  const {
    userId,
    params: { roomId },
    body: { participant },
  } = req;
  try {
    const users = participant.map((user) => user._id);
    users.push(userId);
    await Chat.create({
      roomId: roomId,
      participant: users,
      chats: [],
    });
    return res.status(201).json({
      ok: true,
      message: `Chat room create success. RoomId: ${roomId}`,
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

exports.getChatData = async (req, res, next) => {
  const { roomId } = req.params;
  try {
    const chatData = await Chat.findOne(
      { roomId: roomId },
      { _id: 0, roomId: 1, chats: 1 }
    )
      .populate("chats.user", { _id: 0, userId: 1, profileImage: 1 })
      .lean();
    chatData.chats.forEach((el) => delete el["_id"]);
    return res.status(200).json({ ok: true, chatData: chatData.chats });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};
