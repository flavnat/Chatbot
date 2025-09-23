const express = require("express");
const passport = require("passport");
const { UserSession } = require("../models");
const logger = require("../utils/logger");

const router = express.Router();

// Google OAuth login
router.get(
    "/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google OAuth callback
router.get(
    "/google/callback",
    passport.authenticate("google", { failureRedirect: "/login" }),
    async (req, res) => {
        try {
            // Create session key
            const sessionKey = require("crypto")
                .randomBytes(32)
                .toString("hex");

            const userSession = new UserSession({
                userId: req.user._id,
                sessionKey,
            });

            await userSession.save();

            logger.info("User logged in", {
                userId: req.user._id,
                email: req.user.email,
            });

            // Redirect to frontend with session key
            res.redirect(
                `${
                    process.env.FRONTEND_URL || "http://localhost:5173"
                }/auth/callback?sessionKey=${sessionKey}`
            );
        } catch (error) {
            logger.error("Auth callback error", error);
            res.redirect("/login?error=auth_failed");
        }
    }
);

// Logout
router.post("/logout", async (req, res) => {
    try {
        if (req.session) {
            await req.session.destroy();
        }
        res.json({ success: true, message: "Logged out" });
    } catch (error) {
        logger.error("Logout error", error);
        res.status(500).json({ success: false, error: "Logout failed" });
    }
});

// Get current user
router.get("/me", async (req, res) => {
    try {
        const sessionKey = req.headers["x-session-key"];

        if (!sessionKey) {
            return res
                .status(401)
                .json({ success: false, error: "No session key" });
        }

        const userSession = await UserSession.findOne({
            sessionKey,
            isActive: true,
        }).populate("userId");

        if (!userSession) {
            return res
                .status(401)
                .json({ success: false, error: "Invalid session" });
        }

        res.json({
            success: true,
            user: {
                id: userSession.userId._id,
                email: userSession.userId.email,
                name: userSession.userId.name,
                picture: userSession.userId.picture,
                monthlyUsage: userSession.userId.monthlyUsage,
            },
        });
    } catch (error) {
        logger.error("Get me error", error);
        res.status(500).json({ success: false, error: "Failed to get user" });
    }
});

module.exports = router;
