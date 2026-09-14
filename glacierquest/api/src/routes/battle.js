const express = require("express");
const controller = require("../controllers/battle");
const asyncHandler = require("../middleware/asyncHandler");

const router = express.Router();

router.post("/", asyncHandler(controller.act));

module.exports = router;
