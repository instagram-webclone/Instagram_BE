const User = require("../models/user");
const Post = require("../models/post");
const HashtagFollow = require("../models/hashtagFollow");
const mongoose = require("mongoose");

exports.search = async (req, res, next) => {
  const { keyword } = req.query;
  try {
    if (!keyword) {
      return res.status(400).json({ message: "Keyword is not exist" });
    }
    // 해시태그 검색
    if (keyword[0] === "#") {
      const hashtagKeyword = keyword.replace(" ", "").split("#")[1];
      const post = await Post.find(
        {
          hashtags: {
            $elemMatch: { $regex: new RegExp(hashtagKeyword, "i") },
          },
        },
        { hashtags: 1 }
      );
      const hashArray = [];
      post.forEach((el) => {
        el.hashtags.forEach((tag) => {
          if (new RegExp(hashtagKeyword, "i").test(tag)) {
            hashArray.push(tag);
          }
        });
      });
      const hashtags = hashArray.reduce((acc, cur) => {
        if (!acc[cur]) {
          acc[cur] = 0;
        }
        acc[cur] += 1;
        return acc;
      }, {});
      const array = [];
      for (let hashtag in hashtags) {
        array.push({ tagName: hashtag, postCount: hashtags[hashtag] });
      }
      return res.status(200).json({ ok: true, result: array });
    }
    // 유저 검색
    const userKeyword = keyword.replace(" ", "");
    const user = await User.find(
      {
        userId: {
          $regex: new RegExp(userKeyword, "i"),
        },
      },
      { userId: 1, name: 1, profileImage: 1 }
    );
    return res.status(200).json({ ok: true, user });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};

exports.getHashtagSearchResult = async (req, res, next) => {
  const {
    userId,
    params: { keyword },
  } = req;
  try {
    const post = await HashtagFollow.findOne({ hashtag: keyword });
    let hashtag;

    if (post) {
      hashtag = await HashtagFollow.aggregate([
        { $match: { hashtag: keyword } },
        {
          $project: {
            _id: 0,
            hashtag: 1,
            isFollow: {
              $in: [new mongoose.Types.ObjectId(userId), "$followUsers"],
            },
          },
        },
        {
          $lookup: {
            from: "posts",
            pipeline: [{ $match: { $expr: { $in: [keyword, "$hashtags"] } } }],
            as: "posts",
          },
        },
        { $addFields: { postCount: { $size: "$posts" } } },
        { $project: { posts: 0 } },
      ]);
    } else {
      const posts = await Post.find({
        hashtags: { $elemMatch: { $regex: new RegExp(keyword, "i") } },
      }).lean();
      hashtag = [
        {
          hashtag: keyword,
          isFollow: false,
          postCount: posts.length,
        },
      ];
    }

    const posts = await Post.aggregate([
      {
        $match: {
          hashtags: { $elemMatch: { $regex: new RegExp(keyword, "i") } },
        },
      },
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
      { $project: { imageUrl: 1, likeCount: 1, commentCount: 1 } },
    ]);

    if (!posts) {
      return res.status(400).json({ message: "Cannot find posts" });
    }

    return res
      .status(200)
      .json({ ok: true, searchHashtag: hashtag[0], posts: posts });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
    next(error);
  }
};
