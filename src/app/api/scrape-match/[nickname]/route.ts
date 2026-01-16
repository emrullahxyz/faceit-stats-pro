import { NextRequest, NextResponse } from "next/server";
import puppeteer from "puppeteer";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ nickname: string }> }
) {
    let browser = null;

    try {
        const { nickname } = await params;
        const faceitUrl = `https://www.faceit.com/en/players/${nickname}`;

        console.log(`[Scrape] Starting browser for ${nickname}...`);

        // Launch headless browser
        browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--disable-gpu',
                '--window-size=1920,1080'
            ]
        });

        const page = await browser.newPage();

        // Set a realistic user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

        // Set viewport
        await page.setViewport({ width: 1920, height: 1080 });

        console.log(`[Scrape] Navigating to ${faceitUrl}...`);

        // Navigate to player page
        await page.goto(faceitUrl, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Wait for page to fully load
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log(`[Scrape] Looking for Matchroom button...`);

        // Try to find Matchroom button/link
        const matchroomData = await page.evaluate(() => {
            // Look for any element with "Matchroom" text
            const allElements = document.querySelectorAll('*');
            for (const el of allElements) {
                const text = el.textContent?.trim();
                if (text === 'Matchroom' || text === 'Match Room') {
                    // Found matchroom button - look for parent link
                    const link = el.closest('a');
                    if (link && link.href) {
                        return {
                            found: true,
                            href: link.href,
                            text: text
                        };
                    }
                    // Check parent elements for link
                    let parent = el.parentElement;
                    while (parent) {
                        if (parent.tagName === 'A' && (parent as HTMLAnchorElement).href) {
                            return {
                                found: true,
                                href: (parent as HTMLAnchorElement).href,
                                text: text
                            };
                        }
                        parent = parent.parentElement;
                    }
                    return {
                        found: true,
                        href: null,
                        text: text,
                        className: el.className
                    };
                }
            }

            // Also look for links containing /room/
            const roomLinks = document.querySelectorAll('a[href*="/room/"]');
            if (roomLinks.length > 0) {
                return {
                    found: true,
                    href: (roomLinks[0] as HTMLAnchorElement).href,
                    text: 'Room link found'
                };
            }

            // Check for any button that might navigate to match
            const buttons = document.querySelectorAll('button, [role="button"]');
            for (const btn of buttons) {
                if (btn.textContent?.includes('Matchroom') || btn.textContent?.includes('Match Room')) {
                    return {
                        found: true,
                        href: null,
                        text: btn.textContent?.trim(),
                        isButton: true
                    };
                }
            }

            return { found: false };
        });

        console.log(`[Scrape] Matchroom data:`, matchroomData);

        if (matchroomData.found && matchroomData.href) {
            // Extract match ID from href
            const matchIdMatch = matchroomData.href.match(/room\/(1-[a-f0-9-]+)/i);
            if (matchIdMatch) {
                await browser.close();
                return NextResponse.json({
                    inMatch: true,
                    matchId: matchIdMatch[1],
                    matchRoomUrl: matchroomData.href
                });
            }
        }

        // If Matchroom button found but no direct link, try clicking
        if (matchroomData.found && !matchroomData.href) {
            console.log(`[Scrape] Trying to click Matchroom button...`);

            try {
                // Click elements containing Matchroom text
                await page.evaluate(() => {
                    const allElements = document.querySelectorAll('*');
                    for (const el of allElements) {
                        if (el.textContent?.trim() === 'Matchroom') {
                            (el as HTMLElement).click();
                            break;
                        }
                    }
                });

                // Wait for navigation
                await new Promise(resolve => setTimeout(resolve, 3000));

                // Check current URL for match room
                const currentUrl = page.url();
                const matchIdMatch = currentUrl.match(/room\/(1-[a-f0-9-]+)/i);

                if (matchIdMatch) {
                    await browser.close();
                    return NextResponse.json({
                        inMatch: true,
                        matchId: matchIdMatch[1],
                        matchRoomUrl: currentUrl
                    });
                }
            } catch (clickError) {
                console.log(`[Scrape] Click failed:`, clickError);
            }
        }

        await browser.close();
        return NextResponse.json({
            inMatch: false,
            message: "No active match found",
            debug: matchroomData
        });

    } catch (error) {
        console.error("[Scrape] Error:", error);
        if (browser) {
            try {
                await browser.close();
            } catch { }
        }
        return NextResponse.json({
            inMatch: false,
            error: String(error)
        });
    }
}
