import os
import time
from playwright.sync_api import sync_playwright

SCREENSHOT_DIR = os.path.join(os.path.dirname(__file__), "screenshots")
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def run_qa():
    with sync_playwright() as p:
        browser = p.chromium.launch(
            executable_path=r"C:\Program Files\Google\Chrome\Application\chrome.exe",
            headless=True
        )
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()

        print("1. Loading http://localhost:8000 ...")
        page.goto("http://localhost:8000")
        page.wait_for_selector("#idleStateContainer")
        time.sleep(1)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "qa_1_idle.png"))
        print("Captured qa_1_idle.png")

        print("2. Clicking 'Try sample study (src.jpg)' ...")
        page.click("#btnHeroSample")

        print("Waiting for active study container...")
        page.wait_for_selector("#activeStateContainer:not(.hidden)", timeout=35000)
        time.sleep(2)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "qa_2_clinical_report.png"))
        print("Captured qa_2_clinical_report.png")

        print("3. Navigating to 'Waveform studio' tab ...")
        page.click('[data-tab="tab-waveforms"]')
        time.sleep(2)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "qa_3_waveforms.png"))
        print("Captured qa_3_waveforms.png")

        print("4. Navigating to 'Spectral & sleep analytics' tab ...")
        page.click('[data-tab="tab-spectral"]')
        time.sleep(1.5)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "qa_4_spectral.png"))
        print("Captured qa_4_spectral.png")

        print("5. Navigating to 'Reference audit' tab ...")
        page.click('[data-tab="tab-compare"]')
        time.sleep(1.5)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "qa_5_reference_audit.png"))
        print("Captured qa_5_reference_audit.png")

        print("6. Testing Edit modal ...")
        page.click('[data-tab="tab-findings"]')
        time.sleep(1)
        page.click("#btnEditFindings")
        time.sleep(1)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "qa_6_edit_modal.png"))
        print("Captured qa_6_edit_modal.png")
        page.click("#btnCancelEdit")
        time.sleep(0.5)

        print("7. Testing Dark View toggle ...")
        page.click("#themeToggleBtn")
        time.sleep(1)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "qa_7_dark_report.png"))
        print("Captured qa_7_dark_report.png")

        page.click('[data-tab="tab-waveforms"]')
        time.sleep(1.5)
        page.screenshot(path=os.path.join(SCREENSHOT_DIR, "qa_8_dark_waveforms.png"))
        print("Captured qa_8_dark_waveforms.png")

        browser.close()
        print("All visual QA screenshots captured successfully!")

if __name__ == "__main__":
    run_qa()
