import dbConnect from '../../lib/dbConnect';
import QrLink from '../../models/QrLink';
import ScanData from '../../models/ScanData';
import UAParser from 'ua-parser-js'; // For User Agent Parsing

export async function getServerSideProps(context) {
    const { id } = context.params; // Get uniqueId from URL parameter
    const { req, res } = context; // Get request and response objects

    console.log(`[${new Date().toISOString()}] Redirect request received for ID: ${id}`);

    try {
        // Ensure DB connection is ready (might connect on first call)
        await dbConnect();
        console.log(`[${id}] Database connected.`);

        // Find the original link document using the unique ID
        // Removed .lean() for testing the undefined destination issue
        const qrLink = await QrLink.findOne({ uniqueId: id });
        console.log(`[${id}] Found qrLink document: ${qrLink ? 'Yes' : 'No'}`);

        // --- Critical Check: If link data or targetUrl doesn't exist, return 404 ---
        if (!qrLink || !qrLink.targetUrl) {
            console.error(`[${id}] QrLink not found or targetUrl missing. qrLink: ${qrLink}`);
            return { notFound: true };
        }

        // Assign targetUrl variable *after* confirming qrLink and qrLink.targetUrl exist
        const targetUrl = qrLink.targetUrl;
        console.log(`[${id}] Assigned targetUrl: ${targetUrl}`);

        // --- Capture Basic Analytics ---
        const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.connection.remoteAddress || req.socket.remoteAddress || null;
        const userAgentString = req.headers['user-agent'] || '';
        const referer = req.headers['referer'] || '';
        console.log(`[${id}] Captured basics: IP=${ip}, UA=${userAgentString ? 'Present' : 'Missing'}, Referer=${referer || 'None'}`);

        // --- Geolocation Lookup (using ip-api.com API) ---
        let geo = { // Default values
            country: null, region: null, city: null, latitude: null, longitude: null
        };
        if (ip && ip !== '::1' && ip !== '127.0.0.1') { // Don't lookup localhost/internal IPs
            console.log(`[${id}] Performing GeoIP lookup for IP: ${ip}`);
            try {
                const fields = 'status,countryCode,regionName,city,lat,lon,query'; // Request specific fields
                const geoResponse = await fetch(`http://ip-api.com/json/${ip}?fields=${fields}`);
                const responseTime = geoResponse.headers.get('x-response-time') || '?'; // Example, header may vary or not exist
                console.log(`[${id}] GeoIP API status: ${geoResponse.status}, Time: ${responseTime}ms`);

                if (geoResponse.ok) {
                    const geoData = await geoResponse.json();
                    if (geoData.status === 'success') {
                        geo = {
                            country: geoData.countryCode || null,
                            region: geoData.regionName || null,
                            city: geoData.city || null,
                            latitude: geoData.lat || null,
                            longitude: geoData.lon || null,
                        };
                        console.log(`[${id}] GeoIP API success:`, geo);
                    } else {
                        console.warn(`[${id}] GeoIP API failed for IP ${ip}: ${geoData.message || 'Unknown API error'}`);
                    }
                } else {
                    console.warn(`[${id}] GeoIP API request failed for IP ${ip}: Status ${geoResponse.status}`);
                }
            } catch (apiError) {
                console.error(`[${id}] GeoIP API fetch error for IP ${ip}:`, apiError);
                // Continue execution even if GeoIP API fails
            }
        } else {
            console.log(`[${id}] Skipping GeoIP lookup for IP: ${ip}`);
        }

        // --- User Agent Parsing (using ua-parser-js) ---
        console.log(`[${id}] Parsing User Agent...`);
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
        console.log(`[${id}] Parsed UA details:`, uaDetails);

        // --- Prepare ScanData Document ---
        const scanDataObject = new ScanData({
            qrLinkId: qrLink._id, // Use the ObjectId from the found document
            uniqueId: id,
            timestamp: new Date(),
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

            // Parsed User-Agent fields
            browserName: uaDetails.browserName,
            browserVersion: uaDetails.browserVersion,
            osName: uaDetails.osName,
            osVersion: uaDetails.osVersion,
            deviceType: uaDetails.deviceType,
            deviceVendor: uaDetails.deviceVendor,
            deviceModel: uaDetails.deviceModel,
        });

        // --- Save Scan Data Asynchronously ---
        console.log(`[${id}] Initiating async save for ScanData...`);
        scanDataObject.save().then(() => {
            console.log(`[${id}] Async ScanData save successful.`);
        }).catch(err => {
            console.error(`[${id}] Async ScanData save failed:`, err);
            // Consider more robust error logging/monitoring here
        });

        // --- Perform Redirect ---
        // Prevent caching of this redirect endpoint
        res.setHeader('Cache-Control', 'no-store, max-age=0');

        // +++ FINAL CHECK LOGS for undefined destination error +++
        console.log(`[${id}] FINAL CHECK - qrLink._id: ${qrLink?._id}`);
        console.log(`[${id}] FINAL CHECK - qrLink.targetUrl from DB object: ${qrLink?.targetUrl}`);
        console.log(`[${id}] FINAL CHECK - targetUrl variable type: ${typeof targetUrl}`);
        console.log(`[${id}] FINAL CHECK - targetUrl variable value: ${targetUrl}`);
        // +++++++++++++++++++++++++++++++++++++++++++++++++++++++

        console.log(`[${id}] Returning redirect object to: ${targetUrl}`);
        return {
            redirect: {
                destination: targetUrl, // Should now be guaranteed to be a string if code reached here
                permanent: false, // Use temporary redirect (302 or 307)
            },
        };

    } catch (error) {
        // Catch any unexpected errors during the process
        console.error(`[${id}] CATCH BLOCK - Error during redirect processing:`, error);
        // Return 404 to avoid exposing internal error details via redirect loop potential
        return {
            notFound: true,
        };
    }
}

// Default export for the page component (won't typically render due to redirect)
export default function RedirectPage() {
    return null;
}