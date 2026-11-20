
import mongoose from "mongoose";

const skuCounterSchema = new mongoose.Schema({
    dateKey: {
        type: String,
        required: true,
        unique: true
    },
    sequence: {
        type: Number,
        required: true,
        default: 0
    }
}, {
    timestamps: true
});

const SkuCounter = mongoose.model("SkuCounter", skuCounterSchema);

export default SkuCounter;
