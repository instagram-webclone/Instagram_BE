const User = require("../models/user");

// 나를 follow 하는 사람 (follower)List
exports.getfollowers = async (req, res) => {
  const { userId } = req;
  try {
    const user = await User.findById(req.params.id)
      .populate("follower", { name: 1, userId: 1 })
      .lean();
    const { follow } = await User.findById(userId, { follow: 1 });
    user.follower.forEach((follower) => {
      if (follow.includes(follower._id)) {
        follower["isFollow"] = true;
      } else {
        follower["isFollow"] = false;
      }
    });
    return res.json({ ok: true, user: user.follower });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
  }
};

// 내가 follow 하는 사람 (following)List
exports.getfollowing = async (req, res) => {
  const { userId } = req;
  try {
    const user = await User.findById(req.params.id)
      .populate("follow", { name: 1, userId: 1 })
      .lean();
    const { follow } = await User.findById(userId, { follow: 1 });
    user.follow.forEach((follower) => {
      if (follow.includes(follower._id)) {
        follower["isFollow"] = true;
      } else {
        follower["isFollow"] = false;
      }
    });
    return res.json({ ok: true, user: user.follow });
  } catch (error) {
    if (!error.statusCode) {
      error.statusCode = 500;
    }
  }
};

// 내가 상대방을 follow 하기, 취소
exports.follow = async (req, res) => {
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
  }
};
