import mongoose from 'mongoose';

const ScanDataSchema = new mongoose.Schema({
    qrLinkId: { type: mongoose.Schema.Types.ObjectId, ref: 'QrLink', index: true },
    uniqueId: { type: String, required: true, index: true },
    timestamp: { type: Date, default: Date.now, index: true },
    ipAddress: { type: String },
    userAgent: { type: String }, // Keep the raw string
    referer: { type: String },

    // --- New Fields ---
    targetUrl: { type: String }, // The final destination URL

    // Geolocation (from IP) - Can be null if lookup fails
    country: { type: String, index: true }, // e.g., 'US'
    region: { type: String },               // e.g., 'CA' (State/Region)
    city: { type: String },                 // e.g., 'Mountain View'
    latitude: { type: Number },             // Approximate Latitude
    longitude: { type: Number },            // Approximate Longitude
    // timezone: { type: String },          // Optional: e.g., 'America/Los_Angeles' from geoip-lite

    // User Agent Details (parsed) - Can be null/undefined
    browserName: { type: String, index: true }, // e.g., 'Chrome'
    browserVersion: { type: String },         // e.g., '105.0.0.0'
    osName: { type: String },                // e.g., 'Windows', 'iOS'
    osVersion: { type: String },             // e.g., '10', '15.1'
    deviceType: { type: String },            // e.g., 'mobile', 'tablet', 'desktop'
    deviceVendor: { type: String },          // e.g., 'Apple', 'Samsung' (Less reliable)
    deviceModel: { type: String },           // e.g., 'iPhone', 'SM-G998U' (Less reliable)
});

export default mongoose.models.ScanData || mongoose.model('ScanData', ScanDataSchema);