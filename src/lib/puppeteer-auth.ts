
import puppeteerExtra from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, Page } from "puppeteer-core";
import fs from "fs";

// Use 'puppeteer' (full package) for launching types
import puppeteer from "puppeteer"; 

puppeteerExtra.use(StealthPlugin());

// Use globalThis to persist session across HMR in development
declare global {
  var puppeteerSession: SessionData | null;
}

if (!globalThis.puppeteerSession) {
  globalThis.puppeteerSession = null;
}

interface SessionData {
  id: string;
  browser: Browser;
  page: Page;
  timestamp: number;
}

export interface LoginResult {
  token: string;
  uid: number;
  authPref: string;
}

/**
 * STEP 1: Initialize Session
 * - Launches Browser
 * - Navigates to Login Page
 * - Returns Capture Screenshot
 */
export async function initSession(): Promise<{ sessionId: string; screenshot: string; captchaNeeded: boolean }> {
  console.log(">> [Puppeteer] initSession v1.2 (JSON Fix Applied)");
  // Cleanup old session if expired
  if (globalThis.puppeteerSession) {
    const age = Date.now() - globalThis.puppeteerSession.timestamp;
    if (age > 10 * 60 * 1000) { // 10 mins expiry
        try { await globalThis.puppeteerSession.browser.close(); } catch(e) {}
        globalThis.puppeteerSession = null;
    }
  }

  // Force close previous if exists (Single session policy for now)
  if (globalThis.puppeteerSession) {
      try { await globalThis.puppeteerSession.browser.close(); } catch(e) {}
      globalThis.puppeteerSession = null;
  }
  
  try {
     const launchOptions: any = {
      // Show browser locally (headless: false), but hide on Render (headless: true)
      headless: !!process.env.RENDER || false, 
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu", 
        "--window-size=1280,800"
      ],
      defaultViewport: null, // Allow window resizing in headful mode
      dumpio: true, // Log browser stdout/stderr
     };
     
     if (process.env.PUPPETEER_EXECUTABLE_PATH) {
        launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
     }

     // Try managing executable path for Windows dev
     if (!process.env.RENDER && process.platform === 'win32') {
         const possiblePaths = [
             "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
             "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe"
         ];
         for (const p of possiblePaths) {
             if (fs.existsSync(p)) {
                 console.log("Found Chrome at:", p);
                 launchOptions.executablePath = p;
                 break;
             }
         }
         // If still not set, Puppeteer will use bundled Chromium
     }

     const browser = await puppeteerExtra.launch(launchOptions) as unknown as Browser;
     const page = await browser.newPage();
     
     await page.setViewport({ width: 1280, height: 800 });

     console.log(">> [Puppeteer] Navigating to CyberVidya...");
     // Increased timeout to 60s for slow backend cold starts
     await page.goto("https://kiet.cybervidya.net/", { waitUntil: "domcontentloaded", timeout: 60000 });
     
     // Inject CSS to zoom out (Fix layout issues)
     await page.addStyleTag({ content: "body { zoom: 75%; }" });

     // 3. Wait for Captcha Image to load
    console.log(">> [Puppeteer] Waiting for #captcha_image...");
    let captchaNeeded = false;
    try {
        await page.waitForSelector("#captcha_image", { timeout: 3000 });
        console.log(">> [Puppeteer] Captcha found!");
        captchaNeeded = true;
    } catch (e) {
        console.log(">> [Puppeteer] Selector '#captcha_image' NOT FOUND. Assuming NO CAPTCHA needed.");
    }

    // 4. Take Screenshot of the full page
    console.log(">> [Puppeteer] Taking screenshot...");
    const screenshotBuffer = await page.screenshot({ encoding: "base64" });

    // 5. Save Session
    const sessionId = `sess_${Date.now()}`;
    globalThis.puppeteerSession = {
        id: sessionId,
        browser,
        page,
        timestamp: Date.now()
    };
    
    console.log(">> [Puppeteer] Session initialized:", sessionId);
    
    return {
        sessionId,
        screenshot: `data:image/png;base64,${screenshotBuffer}`,
        captchaNeeded
    };

  } catch (err) {
      console.error(err);
      throw err;
  }
}

/**
 * STEP 2: Submit Credentials (Automated Mode - mostly disabled now)
 * Kept for legacy compatibility / Render deployment if needed later
 */
export async function submitCredentials(sessionId: string, user: string, pass: string, captchaArg: string): Promise<LoginResult> {
    if (!globalThis.puppeteerSession || globalThis.puppeteerSession.id !== sessionId) {
        throw new Error("Session invalid or expired. Please Try Again.");
    }
    
    const { page } = globalThis.puppeteerSession;
    console.log(">> [SubmitCredentials] Attempting to fill form...");
    
    try {
        // 1. Fill Username
        // Try common selectors
        const userSel = await page.waitForSelector('input[name="username"], input[id="username"], input[type="text"]', { timeout: 3000 }).catch(()=>null);
        if (userSel) {
            await userSel.click({ clickCount: 3 }); // Select all
            await userSel.type(user);
        } else {
            throw new Error("Could not find Username field");
        }

        // 2. Fill Password
        const passSel = await page.waitForSelector('input[type="password"]', { timeout: 1000 }).catch(()=>null);
        if (passSel) {
            await passSel.click({ clickCount: 3 });
            await passSel.type(pass);
        } else {
             throw new Error("Could not find Password field");
        }

        // 3. Fill Captcha
        // Usually near the image
        const captchaSel = await page.waitForSelector('input[name="captcha"], #captcha_input, input[placeholder*="text"], input[maxlength="5"]', { timeout: 1000 }).catch(()=>null); 
        // Note: Generic "text" input might have been grabbed by username, so we should be careful. 
        // Usually captcha is the updated one or distinct.
        if (captchaSel) {
            await captchaSel.click({ clickCount: 3 });
            await captchaSel.type(captchaArg);
        } else {
             // Fallback: Type in the LAST text input?
             console.log(">> [SubmitCredentials] Captcha field uncertain, trying strict selectors...");
        }

        // 4. Submit
        const btn = await page.waitForSelector('button[type="submit"], input[type="submit"], #login_submit', { timeout: 1000 }).catch(()=>null);
        if (btn) {
            await btn.click();
        } else {
             await page.keyboard.press('Enter');
        }
        
        console.log(">> [SubmitCredentials] Form submitted. Waiting for navigation/token...");
        
        // 5. Wait for network idle or Token appearance
        // We can reuse checkSession logic by polling it
        
        // Wait a bit for page load
        await new Promise(r => setTimeout(r, 2000));
        
        const result = await checkSession(sessionId);
        if (!result) {
            throw new Error("Login failed. Please check credentials/captcha.");
        }
        
        return result;

    } catch (e: any) {
        console.error(">> [SubmitCredentials] Error:", e);
        throw new Error(e.message || "Failed to submit credentials");
    }
}


/**
 * STEP 3: Check Session (For Manual Login)
 * - Checks if the user has logged in manually in the popped-up window
 */
export async function checkSession(sessionId: string): Promise<LoginResult | null> {
    if (!globalThis.puppeteerSession || globalThis.puppeteerSession.id !== sessionId) {
        throw new Error("Session invalid or expired");
    }

    const { page } = globalThis.puppeteerSession;

    try {
        // DEBUG: Log current URL and Title
        const url = page.url();
        const title = await page.title();
        console.log(`>> [CheckSession] Checking page: "${title}" (${url})`);

        // Check Local Storage AND Session Storage for tokens
        const storageData = await page.evaluate(() => {
            // Helper to search all storage
            const findToken = (storage: Storage) => {
                const keys = Object.keys(storage);
                for (const k of keys) {
                    const val = storage.getItem(k);
                    if (!val) continue;
                    
                    const keyLower = k.toLowerCase();
                    const valLower = val.toLowerCase();

                    // explicitly ignore known non-token keys
                    if (keyLower.includes("pref") || keyLower.includes("device") || keyLower.includes("version")) continue;
                    if (valLower.includes("globaleducation")) continue; // This is a prefix, not a token

                    // 1. Strict match
                    if (keyLower === "token" || keyLower === "accesstoken") return val;

                    // 2. Fuzzy match (must be long to be a JWT)
                    if ((keyLower.includes("token") || keyLower.includes("auth")) && val.length > 50) {
                         return val;
                    }
                }
                return null;
            };

            const lsToken = findToken(localStorage);
            const ssToken = findToken(sessionStorage);
            
            // Log keys for debug
            console.log(">> [CheckSession] LS Keys:", Object.keys(localStorage));
            console.log(">> [CheckSession] SS Keys:", Object.keys(sessionStorage));

            let token = lsToken || ssToken;
            
            // Fix: Remove surrounding quotes if present (e.g. if stored as JSON string)
            if (token && token.startsWith('"') && token.endsWith('"')) {
                token = token.slice(1, -1);
            }

            let uid = localStorage.getItem("uid") || sessionStorage.getItem("uid") || localStorage.getItem("studentId") || sessionStorage.getItem("studentId") || "0";
            
            // Fix: If UID is missing, try to DECODE the JWT token to find it
            // The token is "header.payload.signature"
            if ((!uid || uid === "0") && token && token.includes('.')) {
                try {
                    const parts = token.slice(1, -1).split('.'); // Remove quotes then split
                    if (parts.length === 3) {
                         const payload = JSON.parse(atob(parts[1]));
                         // Usually 'sub' or 'id' holds the UID
                         const possibleUid = payload.sub || payload.id || payload.userId || payload.user_id;
                         if (possibleUid) {
                             uid = String(possibleUid);
                             // Also store back to local storage for future use logic
                             localStorage.setItem('uid', uid);
                         }
                    }
                } catch (e) {
                     // console.log("JWT Decode failed", e);
                }
            }

            let authPref = localStorage.getItem("authPref") || "GlobalEducation ";
            if (authPref.trim() === "Bearer") {
                authPref = "GlobalEducation ";
            }

            return { token, uid, authPref };
        });
        
        console.log(">> [CheckSession] Extracted Storage Data:", storageData);

        // If we have token but no UID, use the browser to fetch it securely
        if (storageData.token && (!storageData.uid || storageData.uid == '0')) {
             console.log(">> [CheckSession] Token found but UID missing. Fetching profile via Browser...");
             try {
                 const profileUid = await page.evaluate(async (token, authPref) => {
                     try {
                         console.log("Starting browser fetch for profile...");
                         // Use relative URL to ensure cookies are sent
                         const res = await fetch("/api/admin/user/my-profile", {
                             headers: {
                                 "Authorization": `${authPref}${token}`,
                                 "Accept": "application/json"
                             }
                         });
                         console.log("Browser fetch status:", res.status);
                         const text = await res.text();
                         try {
                             const json = JSON.parse(text);
                             console.log("Browser fetch json:", JSON.stringify(json));
                             const data = json.data || json;
                             return data?.id || data?.userId || data?.user_id;
                         } catch (e) {
                             console.log("Browser fetch JSON parse error. Raw text:", text);
                             return null;
                         }
                     } catch (e: any) { 
                         console.log("Browser fetch error:", e.toString());
                         return null; 
                     }
                 }, storageData.token, storageData.authPref);
                 
                 if (profileUid) {
                     console.log(">> [CheckSession] Recovered UID from browser fetch:", profileUid);
                     storageData.uid = profileUid;
                 } else {
                     console.log(">> [CheckSession] Failed to recover UID from browser fetch (null returned).");
                 }
             } catch (e) {
                 console.error(">> [CheckSession] Browser profile fetch failed:", e);
             }
        }

        if (storageData.token) {
            // Success! Close browser automatically
            // ...
            console.log(">> [CheckSession] Token found in Storage! Closing browser...");
            // Update the global session's page reference just in case we need to reuse it? No, we close it.
            
            // Wait 2 seconds to ensure any async fetches inside evaluate have time to log/finish if needed
            // (Though evaluate await should have handled it, the delay helps with stability)
            await new Promise(r => setTimeout(r, 2000));

            await globalThis.puppeteerSession.browser.close().catch(() => {});
            globalThis.puppeteerSession = null;

            return {
                token: storageData.token,
                uid: Number(storageData.uid),
                authPref: storageData.authPref
            };
        }
        
        // Check Cookies
        const cookies = await page.cookies();
        console.log(">> [CheckSession] Cookies Found:", cookies.map(c => c.name));
        
        const authCookie = cookies.find(c => 
            c.name.includes(".AspNetCore.Cookies") || 
            c.name.includes("Session") || 
            c.name.toLowerCase().includes("token")
        );

        if (authCookie) {
             console.log(`>> [CheckSession] Auth Cookie found (${authCookie.name})! Closing browser.`);
             
             await globalThis.puppeteerSession.browser.close().catch(() => {});
             globalThis.puppeteerSession = null;

             return {
                token: authCookie.value,
                uid: 0, 
                authPref: "Bearer "
            };
        }

        return null;
    } catch (err) {
        console.error("Check Session Error:", err);
        return null; // Not logged in yet
    }
}

/**
 * STEP 4: Interact with Active Session (Remote Click)
 * - User clicks on screenshot -> We click on Puppeteer page
 */
export async function handleInteraction(sessionId: string, action: 'click', x: number, y: number): Promise<{ screenshot: string }> {
    if (!globalThis.puppeteerSession || globalThis.puppeteerSession.id !== sessionId) {
        throw new Error("Session invalid or expired");
    }
    const { page } = globalThis.puppeteerSession;

    console.log(`>> [Interaction] Click at (${x}, ${y})`);
    
    // 1. Perform Click
    // We assume x, y are scaled to the viewport (1280x800)
    try {
        await page.mouse.click(x, y);
    } catch (e) {
        console.error("Click failed", e);
    }

    // 2. Wait for UI update (increased for dynamic captcha image reloading)
    await new Promise(r => setTimeout(r, 800));

    // 3. Take new screenshot
    const screenshotBuffer = await page.screenshot({ encoding: "base64" });

    return {
        screenshot: `data:image/png;base64,${screenshotBuffer}`
    };
}
