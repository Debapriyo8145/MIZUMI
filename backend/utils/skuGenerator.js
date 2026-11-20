
import SkuCounter from "../models/SkuCounter.js";

/* =========================================================
   SKU CONFIGURATION
   ========================================================= */

const SKU_CONFIG = {
    prefix: "MIZ",

    categoryCodes: {
        fish: "FSH",
        goldfish: "GLD",
        cichlid: "CIC",
        plants: "PLT",
        equipment: "EQP",
        food: "FOD",
        hardscape: "HDS"
    },

    sequenceLength: 3,
    timezone: "Asia/Kolkata"
};

/* =========================================================
   GENERATE PRODUCT NAME CODE
   ========================================================= */

function generateNameCode(productName) {
    const words = String(productName)
        .toUpperCase()
        .replace(/[^A-Z0-9\s]/g, " ")
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (!words.length) {
        throw new Error("Product name is required for SKU generation.");
    }

    // One word: first four characters.
    if (words.length === 1) {
        return words[0].slice(0, 4);
    }

    // Two words: first two characters from each.
    if (words.length === 2) {
        return words.map(word => word.slice(0, 2)).join("");
    }

    // Three or more words: initials.
    return words.map(word => word[0]).join("");
}

/* =========================================================
   GENERATE DATE CODE
   ========================================================= */

function getDateCodes() {
    const parts = new Intl.DateTimeFormat("en-GB", {
        timeZone: SKU_CONFIG.timezone,
        day: "2-digit",
        month: "2-digit",
        year: "2-digit"
    }).formatToParts(new Date());

    const values = {};

    parts.forEach(part => {
        values[part.type] = part.value;
    });

    const dateCode =
        `${values.day}${values.month}${values.year}`;

    const dateKey =
        `${values.year}${values.month}${values.day}`;

    return { dateCode, dateKey };
}

/* =========================================================
   GENERATE UNIQUE SKU
   ========================================================= */

export async function generateProductSku(name, category) {
    const nameCode = generateNameCode(name);

    const categoryCode = SKU_CONFIG.categoryCodes[
        String(category).toLowerCase()
    ];

    if (!categoryCode) {
        throw new Error(`Unsupported product category: ${category}`);
    }

    const { dateCode, dateKey } = getDateCodes();

    // Atomically increment the daily sequence.
    const counter = await SkuCounter.findOneAndUpdate(
        { dateKey },
        { $inc: { sequence: 1 } },
        {
            new: true,
            upsert: true,
            setDefaultsOnInsert: true
        }
    );

    const sequence = String(counter.sequence)
        .padStart(SKU_CONFIG.sequenceLength, "0");

    return [
        nameCode,
        categoryCode,
        dateCode,
        sequence
    ].join("-");
}
