
// Use puppeteer-extra with stealth plugin to bypass Recaptcha
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

interface LoginResult {
  token: string;
  uid: number;
  authPref: string;
}

export async function loginWithPuppeteer(user: string = "", pass: string = ""): Promise<LoginResult | null> {
  let browser = null;
  try {
    console.log('[Puppeteer] Launching STEALTH browser (HEADFUL) for MANUAL LOGIN...');
    browser = await puppeteer.launch({
      headless: false, // Show browser so user can manually login
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--start-maximized'],
    });

    const page = await browser.newPage();
    
    // Set viewport to desktop size (large)
    await page.setViewport({ width: 1920, height: 1080 });

    // Intercept network responses to find the token
    let interceptedToken: string | null = null;
    let interceptedUid: number | null = null;
    let interceptedAuthPref: string | null = null;

    page.on('response', async (response) => {
        const url = response.url();
        const status = response.status();
        
        if (url.includes('/api/auth/login') || url.includes('/api/auth/encrypt/login')) {
            console.log('[Puppeteer] Intercepted login response:', url, 'Status:', status);
            try {
                 const text = await response.text();
                 const json = JSON.parse(text);
                 const data = json.data || json; 
                 if (data.token && data.id) {
                     interceptedToken = data.token;
                     interceptedUid = data.id;
                     interceptedAuthPref = data.auth_pref || "GlobalEducation ";
                     console.log('[Puppeteer] CAPTURED TOKEN FROM NETWORK! Login Successful.');
                 }
            } catch (e) {
                console.log('[Puppeteer] Failed to parse response:', e);
            }
        }
    });

    console.log('[Puppeteer] Navigating to login page...');
    await page.goto('https://kiet.cybervidya.net/login', {
      waitUntil: 'networkidle2',
      timeout: 60000,
    });

    // Fix Visibility for user convenience
    await page.evaluate(() => {
        (document.body.style as any).zoom = '75%';
        document.body.style.overflow = 'auto';
    });

    console.log('\n\n=============================================================');
    console.log('            WAITING FOR MANUAL USER LOGIN                    ');
    console.log('Please enter your credentials and solve Recaptcha in the browser.');
    console.log('Script will auto-close when it detects successful login.');
    console.log('=============================================================\n\n');

    // Wait loop: Poll for token every second for up to 300 seconds (5 minutes)
    const maxRetries = 300; 
    for (let i = 0; i < maxRetries; i++) {
        
        // 1. Check Network Interception
        if (interceptedToken && interceptedUid) {
             return {
                token: interceptedToken,
                uid: Number(interceptedUid),
                authPref: interceptedAuthPref || "GlobalEducation "
            };
        }

        // 2. Check Local Storage (Fallback)
        const localStorageData = await page.evaluate(() => {
            return {
                token: localStorage.getItem('token'),
                uid: localStorage.getItem('id'), // Note: sometimes it's 'uid', sometimes 'id' depending on app ver
                authPref: localStorage.getItem('auth_pref')
            };
        });

        if (localStorageData.token) {
             return {
                token: localStorageData.token,
                uid: parseInt(localStorageData.uid || '0', 10),
                authPref: localStorageData.authPref || "GlobalEducation "
            };
        }

        // Wait 1 second
        await new Promise(r => setTimeout(r, 1000));
        if (i % 10 === 0) process.stdout.write('.'); // heartbeat
    }

    console.error('[Puppeteer] Timeout: Login not detected within 5 minutes.');
    return null;

  } catch (err) {
    console.error('[Puppeteer] Error:', err);
    return null;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
