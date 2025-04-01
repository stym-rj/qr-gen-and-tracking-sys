import mongoose from 'mongoose';

const ScanDataSchema = new mongoose.Schema({
    qrLinkId: { type: mongoose.Schema.Types.ObjectId, ref: 'QrLink', index: true }, // Reference to the QrLink
    uniqueId: { type: String, required: true, index: true }, // Denormalized for easier querying if needed
    timestamp: { type: Date, default: Date.now, index: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    // Optional: Add fields for derived data like country, city (requires IP lookup)
    referer: { type: String }, // Where the request came from (might be unreliable)
});

export default mongoose.models.ScanData || mongoose.model('ScanData', ScanDataSchema);