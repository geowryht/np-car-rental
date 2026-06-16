
import { db } from '../config/firebase.js';
import AppError from '../utils/AppError.js';
import { destroyImage } from '../services/cloudinaryAdmin.js';

export const getProfile = async (req, res, next) => {
    try {
        const doc = await db.collection("users").doc(req.user.uid).get();
        if (!doc.exists) throw new AppError("User not found", 404);
        const { password, ...data } = doc.data();
        const hasContact = !!data.contactNumber;
        const hasAddress = !!data.address?.region;
        res.json({ id: doc.id, ...data, profileComplete: hasContact && hasAddress });
    }
    catch (err) {
        next(err);
    }
};

export const updateProfile = async (req, res, next) => {
    try {
        const { fullName, contactNumber, address } = req.body;
        const updates = {};
        if (fullName) updates.fullName = fullName;
        if (contactNumber) updates.contactNumber = contactNumber;
        if (address) updates.address = address;

        await db.collection("users").doc(req.user.uid).update(updates);
        res.json({ message: "Profile updated" });
    }
    catch (err) {
        next(err);
    }
};

export const becomeHost = async (req, res, next) => {
    try{
        const { name, contactNumber, address, validId, selfieWithId, imageRecordIds } = req.body;

        if (
            !name?.firstName ||
            !name?.middleName ||
            !name?.lastName ||
            !contactNumber ||
            !address?.region ||
            !address?.province ||
            !address?.cityMunicipality ||
            !address?.barangay ||
            !address?.streetAddress ||
            !address?.zipCode ||
            !validId?.idType ||
            !validId?.idNumber ||
            !validId?.imageUrl ||
            !selfieWithId?.imageUrl
        ) {
            throw new AppError("Please complete all required host application fields", 400);
        }

        const existing = await db.collection("users").doc(req.user.uid).get();
        const currentStatus = existing.data()?.hostInfo?.status;
        if (currentStatus === "pending") {
            throw new AppError("You already have a pending host application", 400);
        }
        if (existing.data()?.role === "host") {
            throw new AppError("You are already a host", 400);
        }

        if (!imageRecordIds?.validId || !imageRecordIds?.selfieWithId) {
            throw new AppError("Missing uploaded document records", 400);
        }

        const imageRecordConfig = [
            { key: "validId", id: imageRecordIds.validId, imageUrl: validId.imageUrl },
            { key: "selfieWithId", id: imageRecordIds.selfieWithId, imageUrl: selfieWithId.imageUrl },
        ];
        const imageRecordRefs = imageRecordConfig.map((record) => db.collection("imageRecords").doc(record.id));
        const imageRecordDocs = await db.getAll(...imageRecordRefs);

        imageRecordDocs.forEach((recordDoc, index) => {
            const expected = imageRecordConfig[index];
            if (!recordDoc.exists) {
                throw new AppError("Uploaded document record not found", 400);
            }

            const record = recordDoc.data();
            if (
                record.userId !== req.user.uid ||
                record.imageType !== expected.key ||
                record.status !== "temporary" ||
                record.imageUrl !== expected.imageUrl
            ) {
                throw new AppError("Uploaded document record is invalid", 400);
            }
        });

        const submittedAt = new Date();
        const batch = db.batch();
        batch.update(db.collection("users").doc(req.user.uid), {
            hostInfo: {
                name: {
                    prefix: name.prefix || "",
                    firstName: name.firstName,
                    middleName: name.middleName,
                    lastName: name.lastName,
                },
                contactNumber,
                address: {
                    region: address.region,
                    province: address.province,
                    cityMunicipality: address.cityMunicipality,
                    barangay: address.barangay,
                    streetAddress: address.streetAddress,
                    unitFloorBuilding: address.unitFloorBuilding || "",
                    zipCode: address.zipCode,
                },
                validId: {
                    idType: validId.idType,
                    idNumber: validId.idNumber,
                    fileName: validId.fileName || "",
                    imageUrl: validId.imageUrl,
                },
                selfieWithId: {
                    fileName: selfieWithId.fileName || "",
                    imageUrl: selfieWithId.imageUrl,
                },
                imageRecordIds: {
                    validId: imageRecordIds.validId,
                    selfieWithId: imageRecordIds.selfieWithId,
                },
                status: "pending",
                submittedAt,
            },
        });
        imageRecordRefs.forEach((recordRef) => {
            batch.update(recordRef, { status: "confirmed", confirmedAt: submittedAt });
        });
        await batch.commit();

        res.json({message: "Host application submitted"});
    }
    catch(err){
        next(err);
    }
};

export const updateProfilePhoto = async (req, res, next) => {
    try {
        const { type, imageUrl, publicId } = req.body;
        if (!type || !["avatar", "cover"].includes(type)) {
            throw new AppError("Invalid photo type", 400);
        }
        if (!imageUrl || !publicId) {
            throw new AppError("Missing imageUrl or publicId", 400);
        }

        const doc = await db.collection("users").doc(req.user.uid).get();
        if (!doc.exists) throw new AppError("User not found", 404);

        const oldPublicId = type === "avatar" ? doc.data().photoPublicId : doc.data().coverPublicId;
        if (oldPublicId) {
            try { await destroyImage(oldPublicId); } catch { }
        }

        const updates = type === "avatar"
            ? { photoURL: imageUrl, photoPublicId: publicId }
            : { coverURL: imageUrl, coverPublicId: publicId };

        await db.collection("users").doc(req.user.uid).update(updates);
        res.json({ message: "Photo updated", ...updates });
    } catch (err) {
        next(err);
    }
};
