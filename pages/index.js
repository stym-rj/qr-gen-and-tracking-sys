import { useState } from 'react';

export default function HomePage() {
    const [targetUrl, setTargetUrl] = useState('');
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsLoading(true);
        setError('');
        setQrCodeUrl('');

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
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <h1>Generate QR Code</h1>
            <form onSubmit={handleSubmit}>
                <input
                    type="url"
                    placeholder="Enter website URL"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    required
                    disabled={isLoading}
                />
                <button type="submit" disabled={isLoading}>
                    {isLoading ? 'Generating...' : 'Generate'}
                </button>
            </form>

            {error && <p style={{ color: 'red' }}>Error: {error}</p>}

            {qrCodeUrl && (
                <div>
                    <h2>Your QR Code:</h2>
                    <img src={qrCodeUrl} alt="Generated QR Code" />
                    <p>Scan this code!</p>
                </div>
            )}
        </div>
    );
}