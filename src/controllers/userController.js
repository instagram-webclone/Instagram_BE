const mongoose = require("mongoose");

const User = require("../models/user");
const Post = require("../models/post");
const Notification = require("../models/notification");
const Chat = require("../models/chat");

exports.getUserData = async (req, res, next) => {
  const {
    userId,
    params: { id },
  } = req;
  try {
    // 사용자 검색
    const owner = await User.findOne({ userId: id }, { _id: 1 });
    const user = await User.aggregate([
      { $match: { userId: id } },
      {
        $lookup: {
          from: "posts",
          let: { id: "$_id" },
          pipeline: [
            {
              $match: { $expr: { $eq: ["$writer", "$$id"] } },
            },
          ],
          as: "posts",
        },
      },
      {
        $project: {
          name: 1,
          userId: 1,
          introdution: 1,
          website: 1,
          profileImage: 1,
          totalPost: { $size: "$posts" },
          totalFollow: { $size: "$follow" },
          totalFollower: { $size: "$follower" },
          isFollow: {
            $in: [new mongoose.Types.ObjectId(userId), "$follower"],
          },
        },
      },
    ]);
    const post = await Post.aggregate([
      { $match: { writer: owner._id } },
      {
        $project: {
          imageUrl: 1,
          createdAt: 1,
          // commentCount: { $size: "$comments" },
          likeCount: { $size: "$likeUsers" },
        },
      },
      {
        $lookup: {
          from: "comments",
          let: { id: "$_id" },
          pipeline: [{ $match: { $expr: { $eq: ["$postId", "$$id"] } } }],
          as: "comments",
        },
      },
      { $addFields: { commentCount: { $size: "$comments" } } },
      { $project: { comments: 0 } },
      { $sort: { createdAt: -1 } },
    ]);
    // 로그인한 사용자와 req.params.id가 일치할 경우
    if (userId === owner._id.toString()) {
      const myData = await User.aggregate([
        { $match: { userId: id } },
        { $project: { savedPost: 1 } },
        {
          $lookup: {
            from: "posts",
            let: { savedPost: "$savedPost" },
            pipeline: [
              { $match: { $expr: { $in: ["$_id", "$$savedPost"] } } },
              { $project: { imageUrl: 1, likeCount: 1 } },
              {
                $lookup: {
                  from: "comments",
                  let: { id: "$_id" },
                  pipeline: [
                    { $match: { $expr: { $eq: ["$postId", "$$id"] } } },
                    { $project: { _id: 1 } },
                  ],
                  as: "comments",
                },
              },
              { $addFields: { commentCount: { $size: "$comments" } } },
              { $project: { comments: 0 } },
            ],
            as: "savedPost",
          },
        },
      ]);
      return res
        .status(200)
        .json({ ok: true, user, post, savedPost: myData[0].savedPost });
    } else {
      return res.status(200).json({ ok: true, user, post });
    }
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

exports.getNotification = async (req, res, next) => {
  const { userId } = req;
  try {
    const notification = await Notification.aggregate([
      { $match: { receiveUser: new mongoose.Types.ObjectId(userId) } },
      {
        $lookup: {
          from: "users",
          let: { sendUser: "$sendUser" },
          pipeline: [
            { $match: { $expr: { $eq: ["$$sendUser", "$_id"] } } },
            {
              $project: {
                userId: 1,
                profileImage: 1,
              },
            },
          ],
          as: "sendUser",
        },
      },
      { $unwind: "$sendUser" },
      {
        $lookup: {
          from: "posts",
          let: { postId: "$postId" },
          pipeline: [
            { $match: { $expr: { $eq: ["$$postId", "$_id"] } } },
            { $project: { imageUrl: 1 } },
          ],
          as: "post",
        },
      },
      {
        $lookup: {
          from: "users",
          let: { receiveUser: "$receiveUser" },
          pipeline: [{ $match: { $expr: { $eq: ["$$receiveUser", "$_id"] } } }],
          as: "receiveUser",
        },
      },
      { $unwind: "$receiveUser" },
      {
        $addFields: {
          isFollow: { $in: ["$sendUser._id", "$receiveUser.follow"] },
        },
      },
      { $project: { _id: 0, receiveUser: 0, postId: 0, __v: 0 } },
    ]);
    return res.json({ ok: true, notification: notification });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};
