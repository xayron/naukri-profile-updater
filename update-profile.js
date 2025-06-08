import puppeteer from 'puppeteer';
import 'dotenv/config';

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

        console.log("button: ", button);

        console.log("button.id: ", button.id, button.id !== undefined, button.id !== '');
        console.log("button.className: ", button.className, button.className !== undefined, button.className !== '');
        console.log("button.href: ", button.href, button.href !== undefined, button.href !== '');

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

    if (buttonClass.includes('id')) {
        return `#${buttonClass.split(':')[1]}`;
    } else if (buttonClass.includes('class')) {
        return `.${buttonClass.split(':')[1].split(' ').join('.')}`;
    } else if (buttonClass.includes('href')) {
        return `a[href="${buttonClass.replace('href:', '')}"]`;
    }
}

async function browseNaukri(email, password) {
    const browser = await puppeteer.launch({
        headless: false,
        defaultViewport: null
    });

    const page = await browser.newPage();
    try {
        //Load page
        await page.goto('https://www.naukri.com', { waitUntil: 'load' });
    
        //Click away privacy policy button if it exists
        try {
            const privacyPolicyButtonClass = await getButton(page, 'span', 'Got it');
            await page.click(privacyPolicyButtonClass);
        } catch (error) {
            console.log("Error: ", error);
        }
    
        //Set a delay to ensure human behaviour
        await new Promise(r => setTimeout(r, 500));
    
        //Get and click login button
        try {
            const loginButtonClass = await getButton(page, 'a');
            await page.click(loginButtonClass);
        } catch (error) {
            console.log("Error: ", error);
        }
    
        //Fill login details
        await page.type('[placeholder="Enter your active Email ID / Username"]', email);
        await page.type('[placeholder="Enter your password"]', password);
    
        //Set a delay to ensure human behaviour
        await new Promise(r => setTimeout(r, 500));
    
        //Get the next login button
        try {
            const loginButtonClass = await getButton(page, 'button');
            await new Promise(r => setTimeout(r, 500)); //Add a delay to ensure the side panel is loaded
            await page.click(loginButtonClass);
        } catch (error) {
            console.log("Error: ", error);
        }
    
        //Wait for navigation to complete
        await page.waitForNavigation({ waitUntil: 'load' });
        await new Promise(r => setTimeout(r, 1000));
    
        //Click on view profile button
        try {
            await page.click('aria/View profile[role="link"]');
        } catch (error) {
            console.log("Error: ", error);
        }
    
        //Wait for navigation to complete
        await page.waitForNavigation({ waitUntil: 'load' });
        await new Promise(r => setTimeout(r, 1000));
    
        //Try to find and click edit button
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
                            return editElement; // This gets returned by map
                        }
                        return null;
                    })
                    .find(el => el !== null);
    
                return editButton.className;
            });
    
            //Click on edit button when found
            await page.click(`[class="${editButtonClass}"]`);
    
            //Wait for edit form to load
            await new Promise(r => setTimeout(r, 500));
    
            //Find and replace text in textarea for resume headline
            await page.evaluate((newText) => {
                const textarea = document.querySelector('textarea');
                textarea.value = newText; // Replaces all existing text
            }, headlines[Math.floor(Math.random() * headlines.length)]);
    
            //Set a delay to ensure human behaviour
            await new Promise(r => setTimeout(r, 1000));
    
            //Find and click save button
            await page.evaluate(() => {
                const saveButton = Array.from(document.querySelectorAll('button')).find(btn =>
                    btn.textContent.trim() === 'Save'
                );
    
                saveButton.click();
            });
        } catch (error) {
            console.log("Error: ", error);
        }
    } catch (error) {
        console.log("Error: ", error);
    } finally {
        await page.close();
        await browser.close();
    }
}

browseNaukri(process.env.NAUKRI_EMAIL, process.env.NAUKRI_PASSWORD);