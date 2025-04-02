import dbConnect from '../../lib/dbConnect';
import QrLink from '../../models/QrLink';
import ScanData from '../../models/ScanData';
// import geoip from 'geoip-lite'; // Remove this import
import UAParser from 'ua-parser-js';

export async function getServerSideProps(context) {
    const { id } = context.params;
    const { req, res } = context;

    await dbConnect();

    try {
        const qrLink = await QrLink.findOne({ uniqueId: id }).lean();

        if (!qrLink) {
            return { notFound: true };
        }

        // --- Capture Basic Analytics ---
        const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.connection.remoteAddress || req.socket.remoteAddress || null;
        const userAgentString = req.headers['user-agent'] || '';
        const referer = req.headers['referer'] || '';
        const targetUrl = qrLink.targetUrl;

        // --- Geolocation Lookup (using ip-api.com) --- // MODIFIED SECTION
        let geo = { // Default values
            country: null, region: null, city: null, latitude: null, longitude: null
        };
        if (ip && ip !== '::1' && ip !== '127.0.0.1') { // Don't lookup localhost/internal IPs
            try {
                // Select specific fields to reduce response size
                const fields = 'status,country,countryCode,region,regionName,city,lat,lon,isp,query';
                const geoResponse = await fetch(`http://ip-api.com/json/${ip}?fields=${fields}`);

                if (geoResponse.ok) {
                    const geoData = await geoResponse.json();
                    if (geoData.status === 'success') {
                        geo = {
                            country: geoData.countryCode || null, // Use countryCode ('US')
                            region: geoData.regionName || null, // Use regionName ('California')
                            city: geoData.city || null,       // ('Mountain View')
                            latitude: geoData.lat || null,
                            longitude: geoData.lon || null,
                            // isp: geoData.isp || null, // Optional: You could store ISP too
                        };
                    } else {
                        console.warn(`GeoIP API failed for IP ${ip}: ${geoData.message || 'Unknown API error'}`);
                    }
                } else {
                    console.warn(`GeoIP API request failed for IP ${ip}: Status ${geoResponse.status}`);
                }
            } catch (apiError) {
                console.error(`GeoIP API fetch error for IP ${ip}:`, apiError);
            }
        }
        // --- End of Geolocation Section ---

        // --- User Agent Parsing (using ua-parser-js) ---
        console.log("Type of imported UAParser:", typeof UAParser); // Add this
        console.log("Imported UAParser module:", UAParser);       // Add this
        const parser = new UAParser(userAgentString);
        const uaResult = parser.getResult();
        const uaDetails = { /* ... same as before ... */ }; // No changes needed here

        // --- Prepare ScanData Document ---
        const scanDataObject = new ScanData({
            // ... other fields ...
            targetUrl: targetUrl,

            // Geolocation fields (now from API)
            country: geo.country,
            region: geo.region,
            city: geo.city,
            latitude: geo.latitude,
            longitude: geo.longitude,

            // Parsed User-Agent fields
            // ... same as before ...
        });

        // Save analytics data asynchronously
        scanDataObject.save().catch(err => { /* ... */ });

        // --- Perform Redirect ---
        res.setHeader('Cache-Control', 'no-store, max-age=0');
        return {
            redirect: { /* ... */ },
        };

    } catch (error) {
        console.error(`Error during redirect for ID [${id}]:`, error);
        return { notFound: true };
    }
}

// Default export for the page
export default function RedirectPage() { return null; }