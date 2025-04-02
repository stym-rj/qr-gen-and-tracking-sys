import dbConnect from '../../lib/dbConnect';
import QrLink from '../../models/QrLink';
import ScanData from '../../models/ScanData';
import geoip from 'geoip-lite'; // Import geoip-lite
import UAParser from 'ua-parser-js'; // Import ua-parser-js

export async function getServerSideProps(context) {
    const { id } = context.params;
    const { req, res } = context;

    await dbConnect(); // Ensure DB connection is awaited here

    try {
        // Find the original link document
        const qrLink = await QrLink.findOne({ uniqueId: id }).lean(); // Use .lean() if you only read data

        if (!qrLink) {
            return { notFound: true };
        }

        // --- Capture Basic Analytics ---
        // Get IP, handling potential proxies like Vercel's x-forwarded-for
        const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.connection.remoteAddress || req.socket.remoteAddress || null;
        const userAgentString = req.headers['user-agent'] || '';
        const referer = req.headers['referer'] || '';
        const targetUrl = qrLink.targetUrl; // Get targetUrl from the looked-up document

        // --- Geolocation Lookup (using geoip-lite) ---
        let geo = {}; // Use empty object as default
        if (ip) {
            const geoData = geoip.lookup(ip);
            if (geoData) {
                geo = {
                    country: geoData.country || null,
                    region: geoData.region || null,
                    city: geoData.city || null,
                    // geoip-lite returns lat/lon in array [lat, lon]
                    latitude: geoData.ll ? geoData.ll[0] : null,
                    longitude: geoData.ll ? geoData.ll[1] : null,
                    // timezone: geoData.timezone || null, // Optional
                };
            }
        }

        // --- User Agent Parsing (using ua-parser-js) ---
        const parser = new UAParser(userAgentString);
        const uaResult = parser.getResult();
        const uaDetails = {
            browserName: uaResult.browser?.name || null,
            browserVersion: uaResult.browser?.version || null,
            osName: uaResult.os?.name || null,
            osVersion: uaResult.os?.version || null,
            deviceType: uaResult.device?.type || null, // Often null for desktops
            deviceVendor: uaResult.device?.vendor || null, // Often null/unreliable
            deviceModel: uaResult.device?.model || null, // Often null/unreliable
        };

        // --- Prepare ScanData Document ---
        const scanDataObject = new ScanData({
            qrLinkId: qrLink._id,
            uniqueId: id,
            timestamp: new Date(), // Explicitly set timestamp if not relying on default
            ipAddress: ip,
            userAgent: userAgentString, // Raw User-Agent
            referer: referer,
            targetUrl: targetUrl, // The final destination

            // Geolocation fields
            country: geo.country,
            region: geo.region,
            city: geo.city,
            latitude: geo.latitude,
            longitude: geo.longitude,
            // timezone: geo.timezone, // Optional

            // Parsed User-Agent fields
            browserName: uaDetails.browserName,
            browserVersion: uaDetails.browserVersion,
            osName: uaDetails.osName,
            osVersion: uaDetails.osVersion,
            deviceType: uaDetails.deviceType,
            deviceVendor: uaDetails.deviceVendor,
            deviceModel: uaDetails.deviceModel,
        });

        // Save analytics data asynchronously (don't wait for it before redirecting)
        scanDataObject.save().catch(err => {
            console.error("Failed to save scan data:", err);
            // Consider more robust error logging/monitoring here
        });

        // --- Perform Redirect ---
        // Prevent caching of this redirect endpoint
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        return {
            redirect: {
                destination: targetUrl, // Use the targetUrl retrieved from qrLink
                permanent: false, // Use temporary redirect (302 or 307)
            },
        };

    } catch (error) {
        console.error(`Error during redirect for ID [${id}]:`, error);
        // Optionally redirect to a generic error page instead of 404
        return {
            notFound: true, // Or redirect: { destination: '/error', permanent: false }
        };
    }
}

// Default export for the page (won't typically render due to redirect)
export default function RedirectPage() {
    return null;
}