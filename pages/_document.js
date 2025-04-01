// pages/_document.js
import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
    static async getInitialProps(ctx) {
        const initialProps = await Document.getInitialProps(ctx);
        return { ...initialProps };
    }

    render() {
        return (
            <Html lang="en"> {/* Optional: Add lang attribute */}
                <Head>
                    {/* Add custom fonts, meta tags, links, etc. here */}
                    {/* Note: Avoid adding stylesheets here directly; use _app.js */}
                    {/* Favicon links can go here */}
                </Head>
                <body>
                    <Main /> {/* The main app content will be injected here */}
                    <NextScript /> {/* Next.js scripts */}
                </body>
            </Html>
        );
    }
}

export default MyDocument;