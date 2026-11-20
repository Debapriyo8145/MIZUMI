
import express from "express";

import { protectCustomer } from "../middleware/customerAuthMiddleware.js";

import {
    getMyAddresses,
    addMyAddress,
    updateMyAddress,
    setDefaultAddress,
    deleteMyAddress
} from "../controllers/customerAddressController.js";

const router = express.Router();

// Every address operation requires customer authentication.
router.use(protectCustomer);

router.get("/", getMyAddresses);

router.post("/", addMyAddress);

router.patch("/:addressId", updateMyAddress);

router.patch("/:addressId/default", setDefaultAddress);

router.delete("/:addressId", deleteMyAddress);

export default router;
