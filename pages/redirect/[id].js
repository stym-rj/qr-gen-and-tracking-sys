import dbConnect from '../../lib/dbConnect';
import QrLink from '../../models/QrLink';
import ScanData from '../../models/ScanData';
import { getIronSession } from "iron-session"; // Example for getting session data if needed

// Define session options if you use iron-session or similar
// const sessionOptions = { ... };

// This function runs on the server for every request to this page
export async function getServerSideProps(context) {
    const { id } = context.params; // Get the uniqueId from the URL path
    const { req, res } = context;

    await dbConnect();

    try {
        const qrLink = await QrLink.findOne({ uniqueId: id }).lean(); // Use lean() for performance if you don't need mongoose methods

        if (!qrLink) {
            return { notFound: true }; // Return a 404 page if ID is invalid
        }

        // --- Capture Analytics ---
        const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.socket.remoteAddress;
        const userAgent = req.headers['user-agent'] || '';
        const referer = req.headers['referer'] || ''; // Note: Referer can be unreliable/spoofed/missing

        // Optional: Get user info if logged in (example using iron-session)
        // const session = await getIronSession(req, res, sessionOptions);
        // const userId = session.user?.id;

        const scanData = new ScanData({
            qrLinkId: qrLink._id, // Link to the original QrLink document
            uniqueId: id,
            ipAddress: ip,
            userAgent: userAgent,
            referer: referer,
            // Add userId if applicable
            // Add location data here if you implement IP lookup
        });

        // Save analytics data asynchronously (don't wait for it to complete before redirecting)
        scanData.save().catch(err => {
            console.error("Failed to save scan data:", err);
            // Handle logging/monitoring for save failures
        });

        // --- Perform Redirect ---
        res.setHeader('Cache-Control', 'no-store, max-age=0'); // Ensure this endpoint isn't cached by browsers/proxies
        return {
            redirect: {
                destination: qrLink.targetUrl,
                permanent: false, // Use 302 Found or 307 Temporary Redirect
            },
        };

    } catch (error) {
        console.error("Redirection error:", error);
        // Optionally redirect to a generic error page
        return {
            redirect: {
                destination: '/error', // Create an error page
                permanent: false,
            },
        };
    }
}

// This page component will likely never render because getServerSideProps always redirects
// But Next.js requires a default export for pages
export default function RedirectPage() {
    return null; // Or a loading indicator, though it shouldn't be visible long
}