// pages/index.js
import { useState } from 'react';
import Head from 'next/head'; // Import Head for setting page title
import styles from '../styles/Home.module.css'; // Import the CSS module

export default function HomePage() {
    const [targetUrl, setTargetUrl] = useState('');
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
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
                <div className={styles.qrContainer}> {/* Apply style */}
                    <h2>Your QR Code:</h2>
                    <img
                        src={qrCodeUrl}
                        alt="Generated QR Code"
                        className={styles.qrImage} // Apply style
                    />
                    <p>Scan this code with your device!</p>
                </div>
            )}
        </div>
    );
}