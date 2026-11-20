
import Customer from "../models/Customer.js";

const ADDRESS_LIMIT = 2;

const allowedLabels = ["Home", "Work", "Other"];

const allowedFields = [
    "label",
    "addressLine1",
    "addressLine2",
    "city",
    "state",
    "postalCode",
    "country"
];

const cleanAddressData = (body) => {
    const data = {};

    for (const field of allowedFields) {
        if (body[field] !== undefined) {
            data[field] = String(body[field]).trim();
        }
    }

    return data;
};

const validateAddress = (address) => {
    if (
        !address.addressLine1 ||
        !address.city ||
        !address.state ||
        !address.postalCode
    ) {
        return "Address line, city, state and postal code are required.";
    }

    if (address.addressLine1.length > 150) {
        return "Address line 1 cannot exceed 150 characters.";
    }

    if ((address.addressLine2 || "").length > 150) {
        return "Address line 2 cannot exceed 150 characters.";
    }

    if (address.city.length > 80 || address.state.length > 80) {
        return "City and state cannot exceed 80 characters.";
    }

    if (address.postalCode.length > 12) {
        return "Postal code cannot exceed 12 characters.";
    }

    if (
        address.label !== undefined &&
        !allowedLabels.includes(address.label)
    ) {
        return "Address label must be Home, Work or Other.";
    }

    return null;
};

const getCustomer = (customerId) => {
    return Customer.findOne({
        _id: customerId,
        accountStatus: "active"
    });
};


// GET ALL SAVED ADDRESSES
export const getMyAddresses = async (req, res) => {
    try {
        const customer = await getCustomer(req.customer._id);

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer account not found."
            });
        }

        return res.status(200).json({
            success: true,
            addresses: customer.addresses
        });

    } catch (error) {
        console.error("Get customer addresses error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to retrieve saved addresses."
        });
    }
};


// ADD NEW ADDRESS
export const addMyAddress = async (req, res) => {
    try {
        const customer = await getCustomer(req.customer._id);

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer account not found."
            });
        }

        if (customer.addresses.length >= ADDRESS_LIMIT) {
            return res.status(400).json({
                success: false,
                message: "You can save a maximum of two addresses."
            });
        }

        const addressData = cleanAddressData(req.body);

        const validationError = validateAddress(addressData);

        if (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError
            });
        }

        const makeDefault =
            customer.addresses.length === 0 ||
            req.body.isDefault === true;

        if (makeDefault) {
            customer.addresses.forEach(address => {
                address.isDefault = false;
            });
        }

        customer.addresses.push({
            ...addressData,
            country: addressData.country || "India",
            label: addressData.label || "Home",
            addressLine2: addressData.addressLine2 || "",
            isDefault: makeDefault
        });

        await customer.save();

        return res.status(201).json({
            success: true,
            message: "Delivery address added successfully.",
            addresses: customer.addresses
        });

    } catch (error) {
        console.error("Add customer address error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to add delivery address."
        });
    }
};


// UPDATE EXISTING ADDRESS
export const updateMyAddress = async (req, res) => {
    try {
        const customer = await getCustomer(req.customer._id);

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer account not found."
            });
        }

        const address = customer.addresses.id(req.params.addressId);

        if (!address) {
            return res.status(404).json({
                success: false,
                message: "Address not found."
            });
        }

        const updates = cleanAddressData(req.body);

        const updatedData = {
            ...address.toObject(),
            ...updates
        };

        const validationError = validateAddress(updatedData);

        if (validationError) {
            return res.status(400).json({
                success: false,
                message: validationError
            });
        }

        if (req.body.isDefault === true) {
            customer.addresses.forEach(item => {
                item.isDefault = false;
            });

            address.isDefault = true;
        }

        for (const [field, value] of Object.entries(updates)) {
            address[field] = value;
        }

        await customer.save();

        return res.status(200).json({
            success: true,
            message: "Delivery address updated successfully.",
            addresses: customer.addresses
        });

    } catch (error) {
        console.error("Update customer address error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update delivery address."
        });
    }
};


// SET DEFAULT ADDRESS
export const setDefaultAddress = async (req, res) => {
    try {
        const customer = await getCustomer(req.customer._id);

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer account not found."
            });
        }

        const address = customer.addresses.id(req.params.addressId);

        if (!address) {
            return res.status(404).json({
                success: false,
                message: "Address not found."
            });
        }

        customer.addresses.forEach(item => {
            item.isDefault = item._id.equals(address._id);
        });

        await customer.save();

        return res.status(200).json({
            success: true,
            message: "Default delivery address updated.",
            addresses: customer.addresses
        });

    } catch (error) {
        console.error("Set default address error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to update default address."
        });
    }
};


// DELETE ADDRESS
export const deleteMyAddress = async (req, res) => {
    try {
        const customer = await getCustomer(req.customer._id);

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer account not found."
            });
        }

        const address = customer.addresses.id(req.params.addressId);

        if (!address) {
            return res.status(404).json({
                success: false,
                message: "Address not found."
            });
        }

        const wasDefault = address.isDefault;

        address.deleteOne();

        if (wasDefault && customer.addresses.length > 0) {
            customer.addresses[0].isDefault = true;
        }

        await customer.save();

        return res.status(200).json({
            success: true,
            message: "Delivery address deleted successfully.",
            addresses: customer.addresses
        });

    } catch (error) {
        console.error("Delete customer address error:", error);

        return res.status(500).json({
            success: false,
            message: "Unable to delete delivery address."
        });
    }
};
