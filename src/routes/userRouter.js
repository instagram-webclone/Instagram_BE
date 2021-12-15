const express = require("express");

const { getUserData } = require("../controllers/userController");
const { isAuth } = require("../middlewares/authMiddleware");
const {
  getfollowers,
  getfollowing,
  follow,
  hashtagFollow,
  deleteFollower,
} = require("../controllers/followController");

const router = express.Router();

router.get("/:id", isAuth, getUserData);

router.get("/followers/:id", isAuth, getfollowers);
router.get("/following/:id", isAuth, getfollowing);
router.put("/follow/:id", isAuth, follow);
router.put("/hashFollow/:hashtag", isAuth, hashtagFollow);
router.put("/follower/deleteFollow/:id", isAuth, deleteFollower);

module.exports = router;
