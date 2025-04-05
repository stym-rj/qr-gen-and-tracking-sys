// pages/index.js
import { useState } from 'react';
import Head from 'next/head'; // Import Head for setting page title
import styles from '../styles/Home.module.css'; // Import the CSS module

export default function HomePage() {
    const [targetUrl, setTargetUrl] = useState('');
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false); // downloading state
    const [error, setError] = useState('');

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        setError('');
        setQrCodeUrl(''); // Clear previous QR code

        try {
            const response = await fetch('/api/generate-qr', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetUrl }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to generate QR code');
            }

            setQrCodeUrl(data.qrCodeUrl);

        } catch (err) {
            console.error("Generation failed:", err); // Log the actual error
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    // --- New Download Handler Function ---
    const handleDownload = async () => {
        if (!qrCodeUrl) return;

        setIsDownloading(true);
        setError(''); // Clear previous errors

        try {
            // Fetch the image data from the S3 URL
            // Requires S3 CORS to be configured for your web app's origin
            const response = await fetch(qrCodeUrl);

            if (!response.ok) {
                throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
            }

            // Get the image data as a Blob
            const blob = await response.blob();

            // Create a temporary URL for the Blob object
            const objectUrl = URL.createObjectURL(blob);

            // Create a temporary anchor element
            const link = document.createElement('a');
            link.href = objectUrl;
            link.download = 'qrcode.png'; // Set the desired filename

            // Append to body (required for Firefox)
            document.body.appendChild(link);

            // Programmatically click the link to trigger download
            link.click();

            // Clean up: remove the link and revoke the object URL
            document.body.removeChild(link);
            URL.revokeObjectURL(objectUrl);

        } catch (err) {
            console.error("Download failed:", err);
            // Check console for CORS errors if fetch fails
            setError(`Download failed. Check console for details (CORS?). Error: ${err.message}`);
        } finally {
            setIsDownloading(false);
        }
    };
    // --- End of Download Handler ---

    return (
        <div className={styles.container}>
            <Head>
                <title>QR Code Generator</title>
                <meta name="description" content="Generate QR codes and track scans" />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <h1 className={styles.title}>Generate QR Code</h1>

            <form onSubmit={handleSubmit} className={styles.form}>
                <input
                    type="url"
                    placeholder="Enter website URL (e.g., https://example.com)"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    required
                    className={styles.input} // Apply style
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    disabled={isLoading}
                    className={styles.button} // Apply style
                >
                    {isLoading ? 'Generating...' : 'Generate QR Code'}
                </button>
            </form>

            {/* Display Error Message */}
            {error && <p className={styles.error}>Error: {error}</p>}

            {/* Display QR Code Section */}
            {qrCodeUrl && (
                <div className={styles.qrContainer}>
                    <h2>Your QR Code:</h2>
                    <img src={qrCodeUrl} alt="Generated QR Code" className={styles.qrImage} />
                    <p>Scan this code with your device!</p>

                    {/* --- Replace <a> with <button> --- */}
                    <button
                        onClick={handleDownload}
                        className={styles.downloadButton} // Reuse or adapt style
                        disabled={isDownloading}
                    >
                        {isDownloading ? 'Downloading...' : 'Download QR Code'}
                    </button>
                    {/* --- End of Button --- */}
                </div>
            )}
        </div>
    );
}