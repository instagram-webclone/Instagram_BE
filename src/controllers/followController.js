const mongoose = require("mongoose");

const User = require("../models/user");
const Post = require("../models/post");
const Hashtags = require("../models/hashtagFollow");

// 나를 follow 하는 사람 (follower)List
exports.getfollowers = async (req, res, next) => {
  const { userId } = req;
  try {
    const users = await User.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
      { $project: { userId: 1, follower: 1 } },
      {
        $lookup: {
          from: "users",
          let: { follower: "$follower" },
          pipeline: [
            { $match: { $expr: { $in: ["$_id", "$$follower"] } } },
            {
              $lookup: {
                from: "users",
                let: { id: "$_id" },
                pipeline: [
                  { $match: { _id: new mongoose.Types.ObjectId(userId) } },
                  { $project: { userId: 1 } },
                ],
                as: "user",
              },
            },
            { $unwind: "$user" },
            {
              $project: {
                name: 1,
                userId: 1,
                profileImage: 1,
                isFollow: { $in: ["$user._id", "$follower"] },
              },
            },
          ],
          as: "follower",
        },
      },
    ]);
    // const user = await User.findById(req.params.id)
    //   .populate("follower", { name: 1, userId: 1, profileImage: 1 })
    //   .lean();
    // const { follow } = await User.findById(userId, { follow: 1 });
    // user.follower.forEach((follower) => {
    //   if (follow.includes(follower._id)) {
    //     follower["isFollow"] = true;
    //   } else {
    //     follower["isFollow"] = false;
    //   }
    // });
    return res.json({
      ok: true,
      user: users[0].follower,
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

// 내가 follow 하는 사람 (following)List
exports.getfollowing = async (req, res, next) => {
  const { userId } = req;
  try {
    const user = await User.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(req.params.id) } },
      { $project: { userId: 1, follow: 1, hashtagFollow: 1 } },
      {
        $lookup: {
          from: "users",
          let: { follow: "$follow" },
          pipeline: [
            { $match: { $expr: { $in: ["$_id", "$$follow"] } } },
            {
              $lookup: {
                from: "users",
                let: { id: "$_id" },
                pipeline: [
                  { $match: { _id: new mongoose.Types.ObjectId(userId) } },
                  { $project: { userId: 1 } },
                ],
                as: "user",
              },
            },
            { $unwind: "$user" },
            {
              $project: {
                name: 1,
                userId: 1,
                profileImage: 1,
                isFollow: { $in: ["$user._id", "$follower"] },
              },
            },
          ],
          as: "follow",
        },
      },
      {
        $lookup: {
          from: "hashtagfollows",
          let: { hashtagFollow: "$hashtagFollow" },
          pipeline: [
            { $match: { $expr: { $in: ["$_id", "$$hashtagFollow"] } } },
            {
              $lookup: {
                from: "posts",
                let: { hashtag: "$hashtag" },
                pipeline: [
                  { $match: { $expr: { $in: ["$$hashtag", "$hashtags"] } } },
                  { $project: { hashtags: 1, imageUrl: 1 } },
                ],
                as: "posts",
              },
            },
            {
              $project: {
                hashtag: 1,
                isFollow: {
                  $in: [new mongoose.Types.ObjectId(userId), "$followUsers"],
                },
                posts: 1,
              },
            },
            { $addFields: { postCount: { $size: "$posts" } } },
            {
              $addFields: {
                imageUrl: { $arrayElemAt: ["$posts.imageUrl", 0] },
              },
            },
            { $project: { posts: 0 } },
          ],
          as: "hashtagFollow",
        },
      },
    ]);
    // const user = await User.findById(req.params.id)
    //   .populate("follow", {
    //     name: 1,
    //     userId: 1,
    //     profileImage: 1,
    //     hashtagFollow: 1,
    //   })
    //   .populate("hashtagFollow", { hashtag: 1, postCount: 1, imageUrl: 1 })
    //   .lean();
    // const { follow } = await User.findById(userId, { follow: 1 });
    // user.follow.forEach((follower) => {
    //   if (follow.includes(follower._id)) {
    //     follower["isFollow"] = true;
    //   } else {
    //     follower["isFollow"] = false;
    //   }
    // });
    return res.json({
      ok: true,
      user: user[0].follow,
      hashtagFollow: user[0].hashtagFollow,
    });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

// 내가 상대방을 follow 하기, 취소
exports.follow = async (req, res, next) => {
  try {
    const myId = await User.findById(req.userId);
    const user = await User.findById(req.params.id);
    if (
      !user.follower.includes(req.userId) &&
      !myId.follow.includes(req.params.id)
    ) {
      myId.follow.push(req.params.id);
      await myId.save();
      user.follower.push(req.userId);
      await user.save();
    } else {
      myId.follow.pull(req.params.id);
      await myId.save();
      user.follower.pull(req.userId);
      await user.save();
    }
    return res.json({ ok: true });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

exports.hashtagFollow = async (req, res, next) => {
  const {
    userId,
    params: { hashtag },
  } = req;
  try {
    const hashData = await Hashtags.findOne({ hashtag: hashtag });
    const user = await User.findById(userId);
    // Follow
    if (!hashData) {
      const newHashtag = await Hashtags.create({
        hashtag: hashtag,
        followUsers: [userId],
      });
      user.hashtagFollow.push(newHashtag._id);
      await user.save();
      return res.status(201).json({
        ok: true,
        message: "Create hashtag follow",
        followHashtag: newHashtag,
      });
    }
    // Unfollow
    if (hashData.followUsers.includes(userId)) {
      hashData.followUsers.pull(userId);
      user.hashtagFollow.pull(hashData._id);
      await Promise.all([hashData.save(), user.save()]);
      if (hashData.followUsers.length === 0) {
        await Hashtags.deleteOne({ _id: hashData._id });
      }
      return res.status(200).json({ ok: true, message: "Hashtag unfollow" });
    }
    // Follow
    hashData.followUsers.push(userId);
    user.hashtagFollow.push(hashData._id);
    await Promise.all([hashData.save(), user.save()]);
    return res.status(200).json({ ok: true, message: "Hashtag follow" });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

exports.deleteFollower = async (req, res) => {
  try {
    const myId = await User.findById(req.userId);
    const user = await User.findById(req.params.id);
    if (myId.follower.includes(req.params.id)) {
      myId.follower.pull(req.params.id);
      await myId.save();
      user.follow.pull(req.userId);
      await user.save();
    }
    return res.json({ ok: true });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
  }
};
