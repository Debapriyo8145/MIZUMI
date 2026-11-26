
import Announcement from "../models/Announcement.js";

const ANNOUNCEMENT_ID = "homepage-announcement";

const DEFAULT_ANNOUNCEMENT = {
    _id: ANNOUNCEMENT_ID,
    primaryText: "WELCOME TO MIZUMI AQUATICS",
    secondaryText: "WHERE AQUATIC LIFE COMES ALIVE",
    isActive: true
};


/* =====================================================
   GET ANNOUNCEMENT
   GET /api/v1/announcement
   Public
===================================================== */

export const getAnnouncement = async (req, res) => {
    try {
        let announcement = await Announcement.findById(
            ANNOUNCEMENT_ID
        ).lean();

        // Create the default record on the first request.
        if (!announcement) {
            announcement = await Announcement.create(
                DEFAULT_ANNOUNCEMENT
            );

            announcement = announcement.toObject();
        }

        return res.status(200).json({
            success: true,
            announcement
        });

    } catch (error) {
        console.error("Get announcement error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve the announcement."
        });
    }
};


/* =====================================================
   UPDATE ANNOUNCEMENT
   PUT /api/v1/announcement
   Admin only
===================================================== */

export const updateAnnouncement = async (req, res) => {
    try {
        const {
            primaryText,
            secondaryText,
            isActive
        } = req.body;

        // Validate supplied fields.
        if (
            primaryText !== undefined &&
            (typeof primaryText !== "string" ||
                !primaryText.trim() ||
                primaryText.trim().length > 100)
        ) {
            return res.status(400).json({
                success: false,
                message: "Primary text must contain 1–100 characters."
            });
        }

        if (
            secondaryText !== undefined &&
            (typeof secondaryText !== "string" ||
                !secondaryText.trim() ||
                secondaryText.trim().length > 150)
        ) {
            return res.status(400).json({
                success: false,
                message: "Secondary text must contain 1–150 characters."
            });
        }

        if (
            isActive !== undefined &&
            typeof isActive !== "boolean"
        ) {
            return res.status(400).json({
                success: false,
                message: "isActive must be true or false."
            });
        }

        // Do not accept an empty update.
        if (
            primaryText === undefined &&
            secondaryText === undefined &&
            isActive === undefined
        ) {
            return res.status(400).json({
                success: false,
                message: "No announcement changes were provided."
            });
        }

        const updates = {};

        if (primaryText !== undefined) {
            updates.primaryText = primaryText.trim();
        }

        if (secondaryText !== undefined) {
            updates.secondaryText = secondaryText.trim();
        }

        if (isActive !== undefined) {
            updates.isActive = isActive;
        }

        const announcement = await Announcement.findByIdAndUpdate(
            ANNOUNCEMENT_ID,
            {
                $set: updates,
                $setOnInsert: {
                    _id: ANNOUNCEMENT_ID
                }
            },
            {
                new: true,
                upsert: true,
                runValidators: true,
                setDefaultsOnInsert: true
            }
        );

        return res.status(200).json({
            success: true,
            message: "Announcement updated successfully.",
            announcement
        });

    } catch (error) {
        console.error("Update announcement error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update the announcement."
        });
    }
};
