import React from 'react'; // Optional

export default function ErrorPage() {
    return (
        <div>
            <h1>Error</h1>
            <p>An unexpected error occurred.</p>
            {/* If this should be the global error page, rename the file to _error.js */}
        </div>
    );
}