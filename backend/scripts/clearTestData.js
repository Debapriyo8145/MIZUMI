
import "dotenv/config";
import mongoose from "mongoose";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import connectDB from "../config/db.js";
import Customer from "../models/Customer.js";
import Order from "../models/Order.js";

const rl = readline.createInterface({ input, output });

async function clearTestData() {
    try {
        await connectDB();

        const databaseName = mongoose.connection.name;

        console.log("\n========== MIZUMI TEST DATA CLEANUP ==========");
        console.log(`Database: ${databaseName}`);

        // Safety check: only allow the development database.
        if (databaseName !== "test") {
            throw new Error(
                "Safety stop: Database name is not 'test'. No data was deleted."
            );
        }

        const customerCount = await Customer.countDocuments();
        const orderCount = await Order.countDocuments();

        console.log("\nRecords found:");
        console.log(`Customer accounts: ${customerCount}`);
        console.log(`Orders (including guest orders): ${orderCount}`);

        if (customerCount === 0 && orderCount === 0) {
            console.log("\nNothing to delete.");
            return;
        }

        console.log("\nWARNING: This action is permanent.");
        console.log("Products and admin accounts will NOT be deleted.");

        const confirmation = await rl.question(
            '\nType DELETE TEST DATA to continue: '
        );

        if (confirmation !== "DELETE TEST DATA") {
            console.log("\nCancelled. No records were deleted.");
            return;
        }

        const deletedOrders = await Order.deleteMany({});
        const deletedCustomers = await Customer.deleteMany({});

        console.log("\n========== CLEANUP COMPLETE ==========");
        console.log(`Orders deleted: ${deletedOrders.deletedCount}`);
        console.log(`Customers deleted: ${deletedCustomers.deletedCount}`);

        console.log("\nProducts and admin accounts were preserved.");

    } catch (error) {
        console.error("\nCleanup failed:", error.message);
        process.exitCode = 1;
    } finally {
        rl.close();
        await mongoose.disconnect();
    }
}

clearTestData();
