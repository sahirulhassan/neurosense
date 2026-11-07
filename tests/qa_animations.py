import os
import time
from playwright.sync_api import sync_playwright

SCREENSHOT_DIR = os.path.join(os.path.dirname(__file__), "screenshots")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def run_animation_qa():
    console_errors = []

    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            headless=True
        )
        context = browser.new_context(viewport={"width": 1440, "height": 920})
        page = context.new_page()

        page.on("console", lambda msg: console_errors.append(msg.text) if msg.type == "error" else None)
        page.on("pageerror", lambda exc: console_errors.append(str(exc)))

        print("1. Opening workstation...")
        page.goto("http://localhost:8000")
        page.wait_for_selector("#idleStateContainer")
        time.sleep(0.5)

        print("2. Triggering sample study and capturing laser scanner animation...")
        page.click("#btnHeroSample")
        # Give it 350ms so the loading overlay is open and laser beam is sweeping
        time.sleep(0.35)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "qa_anim_1_scanner.png"))
        print("Captured qa_anim_1_scanner.png")

        print("3. Waiting for analysis to complete and capturing toast...")
        page.wait_for_selector("#activeStateContainer:not(.hidden)", timeout=35000)
        time.sleep(0.5)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "qa_anim_2_toast_report.png"))
        print("Captured qa_anim_2_toast_report.png")

        print("4. Navigating to Waveform Studio and capturing mid-sweep telemetry line...")
        page.click('[data-tab="tab-waveforms"]')
        # Waveform sweep duration is 900ms. Capture at 400ms mid-flight!
        time.sleep(0.40)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "qa_anim_3_sweep_mid.png"))
        print("Captured qa_anim_3_sweep_mid.png")

        # Wait for sweep to complete
        time.sleep(0.8)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "qa_anim_4_sweep_complete.png"))
        print("Captured qa_anim_4_sweep_complete.png")

        print("5. Navigating to Spectral & Sleep Analytics and capturing animated power bars...")
        page.click('[data-tab="tab-spectral"]')
        time.sleep(0.7)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "qa_anim_5_spectral_bars.png"))
        print("Captured qa_anim_5_spectral_bars.png")

        print("6. Testing tactile Copy button feedback...")
        page.click('[data-tab="tab-findings"]')
        time.sleep(0.5)
        page.click("#btnCopyReportText")
        time.sleep(0.2)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "qa_anim_6_copy_feedback.png"))
        print("Captured qa_anim_6_copy_feedback.png")

        print("7. Testing Dark Telemetry Theme sweep...")
        page.click("#themeToggleBtn")
        time.sleep(0.3)
        page.click('[data-tab="tab-waveforms"]')
        time.sleep(0.35)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "qa_anim_7_dark_sweep.png"))
        print("Captured qa_anim_7_dark_sweep.png")

        browser.close()

    print("\n--- QA Verification Summary ---")
    if console_errors:
        print(f"Warning: {len(console_errors)} console errors detected:")
        for err in console_errors:
            print("  ", err)
    else:
        print("Zero console errors or exceptions detected!")

if __name__ == "__main__":
    run_animation_qa()
