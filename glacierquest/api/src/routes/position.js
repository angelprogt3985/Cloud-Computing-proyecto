const express = require("express");
const controller = require("../controllers/position");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.get("/", asyncHandler(controller.list));
router.post("/", asyncHandler(controller.upsert));

module.exports = router;
