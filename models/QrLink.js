import mongoose from 'mongoose';

const QrLinkSchema = new mongoose.Schema({
    uniqueId: { type: String, required: true, unique: true, index: true },
    targetUrl: { type: String, required: true },
    qrCodeS3Url: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    // Optional: Add userId if you implement user accounts
});

export default mongoose.models.QrLink || mongoose.model('QrLink', QrLinkSchema);