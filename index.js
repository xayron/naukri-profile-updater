const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

const headlines = [
    "Full-Stack Developer with Experience in Java Microservices and Cross-Platform Mobile SDKs (Flutter, React Native) ",
    "Full-Stack Engineer Specializing in High-Performance APIs (gRPC) and Secure Mobile SDKs using C/C++ ",
    "Software Developer with a Proven Record of Scaling Backend Systems for 10M+ Users and Managing AWS Cloud Infrastructure ",
    "Full-Stack Developer | Architecting End-to-End Solutions from Cloud-Native Backends (AWS) to Hybrid Mobile Frontends ",
    "Versatile Software Engineer with Expertise in Java/Spring Boot, Flutter, and Modern CI/CD Pipelines ",
    "Full-Stack Developer Focused on API Optimization, End-to-End Security, and Infrastructure as Code (AWS CDK) "
];

async function getButton(page, buttonType, buttonText = 'Login') {
    const buttonClass = await page.evaluate((buttonType, buttonText) => {
        const buttons = document.querySelectorAll(buttonType);
        const button = Array.from(buttons).find(btn => btn.textContent.includes(buttonText));

        if (!button) return null;

        if (button.id !== undefined && button.id !== '') {
            return `id:${button.id}`;
        } else if (button.className !== undefined && button.className !== '') {
            return `class:${button.className}`;
        } else if (button.href !== undefined && button.href !== '') {
            return `href:${button.href}`;
        } else {
            return null;
        }
    }, buttonType, buttonText);

    if (!buttonClass) return null;

    if (buttonClass.includes('id')) {
        return `#${buttonClass.split(':')[1]}`;
    } else if (buttonClass.includes('class')) {
        return `.${buttonClass.split(':')[1].split(' ').join('.')}`;
    } else if (buttonClass.includes('href')) {
        return `a[href="${buttonClass.replace('href:', '')}"]`;
    }
}

exports.handler = async (event) => {
    let browser = null;
    const fs = require('fs').promises;
    const screenshots = [];
    
    // Helper function to take and store screenshot
    async function takeDebugScreenshot(page, step) {
        try {
            const screenshotPath = `/tmp/debug-${step}.png`;
            await page.screenshot({ path: screenshotPath, fullPage: true });
            const screenshot = await fs.readFile(screenshotPath, { encoding: 'base64' });
            screenshots.push({
                step: step,
                screenshot: `data:image/png;base64,${screenshot}`
            });
            console.log(`📸 Screenshot taken for step: ${step}`);
        } catch (error) {
            console.log(`❌ Failed to take screenshot for ${step}:`, error.message);
        }
    }
    
    try {
        console.log('🚀 Starting Naukri automation...');
        
        browser = await puppeteer.launch({
            args: chromium.args,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        });

        console.log('✅ Browser launched successfully');
        const page = await browser.newPage();
        
        // Get credentials from environment variables
        const email = process.env.NAUKRI_EMAIL;
        const password = process.env.NAUKRI_PASSWORD;
        
        if (!email || !password) {
            throw new Error('Email and password must be set as environment variables');
        }

        console.log('🌐 Loading Naukri homepage...');
        // Load page
        await page.goto('https://www.naukri.com', { waitUntil: 'networkidle2', timeout: 60000 });
        console.log('✅ Homepage loaded, current URL:', page.url());
        await takeDebugScreenshot(page, 'homepage');

        // Click away privacy policy button if it exists
        console.log('🔍 Checking for privacy policy popup...');
        try {
            const privacyPolicyButtonClass = await getButton(page, 'span', 'Got it');
            if (privacyPolicyButtonClass) {
                console.log('👆 Found privacy policy button, clicking...');
                await page.click(privacyPolicyButtonClass);
                console.log('✅ Privacy policy dismissed');
            } else {
                console.log('ℹ️ No privacy policy popup found');
            }
        } catch (error) {
            console.log("⚠️ Privacy policy handling error:", error.message);
        }

        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('🔍 Looking for login button...');
        // Get and click login button
        try {
            const loginButtonClass = await getButton(page, 'a');
            if (loginButtonClass) {
                console.log('👆 Found login button:', loginButtonClass);
                await page.click(loginButtonClass);
                console.log('✅ Login button clicked');
                await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
                console.log('✅ Navigation completed, current URL:', page.url());
                await takeDebugScreenshot(page, 'login-form');
            } else {
                console.log('❌ Login button not found');
                await takeDebugScreenshot(page, 'no-login-button');
            }
        } catch (error) {
            console.log("⚠️ Login button error:", error.message);
            await takeDebugScreenshot(page, 'login-button-error');
        }

        console.log('📝 Filling login credentials...');
        // Fill login details
        try {
            console.log('🔍 Waiting for email field...');
            await page.waitForSelector('[placeholder="Enter your active Email ID / Username"]', { 
                timeout: 30000,
                visible: true 
            });
            console.log('✅ Email field found');
            
            await page.type('[placeholder="Enter your active Email ID / Username"]', email);
            console.log('✅ Email entered');
            
            console.log('🔍 Looking for password field...');
            await page.type('[placeholder="Enter your password"]', password);
            console.log('✅ Password entered');
            
            await takeDebugScreenshot(page, 'credentials-filled');
        } catch (error) {
            console.log('❌ Error filling credentials:', error.message);
            await takeDebugScreenshot(page, 'credential-error');
            throw error;
        }

        await page.waitForTimeout(1000);

        // Click login submit button
        try {
            const loginButtonClass = await getButton(page, 'button');
            if (loginButtonClass) {
                await page.click(loginButtonClass);
            }
        } catch (error) {
            console.log("Login submit button not found");
        }

        // Wait for navigation to complete
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForTimeout(2000);

        // Click on view profile button
        try {
            await page.click('aria/View profile[role="link"]');
        } catch (error) {
            console.log("View profile button not found");
        }

        // Wait for navigation to complete
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
        await page.waitForTimeout(2000);

        // Try to find and click edit button
        try {
            const editButtonClass = await page.evaluate(() => {
                const editButton = Array.from(document.querySelectorAll('span'))
                    .filter(span => span.textContent.startsWith('Resume headline'))
                    .map(element => {
                        const childNodes = Array.from(element.parentElement.childNodes);
                        const editElement = childNodes.find(childNode =>
                            childNode.className && childNode.className.includes('edit')
                        );

                        if (childNodes.length == 2 && editElement) {
                            return editElement;
                        }
                        return null;
                    })
                    .find(el => el !== null);

                return editButton ? editButton.className : null;
            });

            if (editButtonClass) {
                await page.click(`[class="${editButtonClass}"]`);
                await page.waitForTimeout(1000);

                // Find and replace text in textarea for resume headline
                await page.evaluate((newText) => {
                    const textarea = document.querySelector('textarea');
                    if (textarea) {
                        textarea.value = newText;
                    }
                }, headlines[Math.floor(Math.random() * headlines.length)]);

                await page.waitForTimeout(1000);

                // Find and click save button
                await page.evaluate(() => {
                    const saveButton = Array.from(document.querySelectorAll('button')).find(btn =>
                        btn.textContent.trim() === 'Save'
                    );

                    if (saveButton) {
                        saveButton.click();
                    }
                });
            }
        } catch (error) {
            console.log("Error updating resume headline:", error);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Naukri automation completed successfully',
                timestamp: new Date().toISOString(),
                screenshots: screenshots // Include all debug screenshots
            })
        };

    } catch (error) {
        console.error('💥 Error in Naukri automation:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Error in automation',
                error: error.message,
                screenshots: screenshots // Include screenshots even on error
            })
        };
    } finally {
        if (browser) {
            console.log('🔒 Closing browser...');
            await browser.close();
            console.log('✅ Browser closed');
        }
    }
};