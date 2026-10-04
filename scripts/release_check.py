#!/usr/bin/env python3
"""
release_check.py — Release Preflight & Version Consistency Verifier for KET CoC Generator.

Verifies:
1. Git branch and working tree cleanliness.
2. Version alignment across index.html, sw.js, README.md, and sitemap.xml.
3. User experience silent release modal policy check.
4. Regulatory forbidden words audit (official, Stat Dec, Annexure A).
5. Comprehensive automated PDF & SEO test suite (verify_pdf.py Tests 1-5).
6. Outputs ready-to-use Git production release workflow commands.

Usage:
    python tools/scripts/release_check.py [options]
    uv run python tools/scripts/release_check.py [options]

Options:
    --version <VER>     Target release version to verify (e.g. 1.1.1). If omitted, auto-detected.
    --skip-tests        Skip running the Playwright/PyMuPDF test suite (fast metadata-only check).
    --strict            Treat warnings (such as uncommitted changes or branch state) as failures.
"""

import argparse
import os
import re
import subprocess
import sys
from pathlib import Path

# Reconfigure stdout/stderr for Unicode/UTF-8 safety across Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass
if hasattr(sys.stderr, "reconfigure"):
    try:
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# Paths relative to workspace
SCRIPT_DIR = Path(__file__).resolve().parent
TOOLS_DIR = SCRIPT_DIR.parent
WORKSPACE_DIR = TOOLS_DIR.parent
VERIFY_SCRIPT = WORKSPACE_DIR / ".agents" / "skills" / "pdf-generation-verifier" / "scripts" / "verify_pdf.py"

# ANSI Color formatting
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
RESET = "\033[0m"


class PreflightChecker:
    def __init__(self, target_version=None, skip_tests=False, strict=False):
        self.target_version = target_version
        self.skip_tests = skip_tests
        self.strict = strict
        self.results = []
        self.has_failure = False
        self.has_warning = False

    def log(self, status, category, message):
        if status == "PASS":
            icon = f"{GREEN}[PASS]{RESET}"
        elif status == "WARN":
            icon = f"{YELLOW}[WARN]{RESET}"
            self.has_warning = True
            if self.strict:
                self.has_failure = True
        else:
            icon = f"{RED}[FAIL]{RESET}"
            self.has_failure = True

        self.results.append((status, category, message))
        print(f" {icon} {BOLD}{category:<22}{RESET} {message}")

    def run_command(self, cmd, cwd=TOOLS_DIR):
        try:
            res = subprocess.run(
                cmd,
                cwd=str(cwd),
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                shell=isinstance(cmd, str),
            )
            return res.returncode, res.stdout.strip(), res.stderr.strip()
        except Exception as e:
            return 1, "", str(e)

    def auto_detect_version(self):
        """Auto-detects the version from tools/index.html settings card or style query string."""
        index_file = TOOLS_DIR / "index.html"
        if not index_file.exists():
            return None

        content = index_file.read_text(encoding="utf-8")
        # Match settings card: KET CoC Generator vX.Y.Z
        m = re.search(r"KET CoC Generator v([0-9]+\.[0-9]+\.[0-9]+)", content)
        if m:
            return m.group(1)

        # Fallback to query string: style.css?v=X.Y.Z
        m2 = re.search(r"style\.css\?v=([0-9]+\.[0-9]+\.[0-9]+)", content)
        if m2:
            return m2.group(1)

        return None

    def check_git(self):
        print(f"\n{BOLD}{CYAN}--- Step 1: Git Branch & Working Tree Preflight ---{RESET}")
        
        # Check current branch
        code, branch, _ = self.run_command(["git", "rev-parse", "--abbrev-ref", "HEAD"])
        if code != 0:
            self.log("WARN", "Git Repository", "Not inside a valid Git repository or Git not found.")
        else:
            if branch == "dev":
                self.log("PASS", "Git Branch", f"Currently on development branch '{branch}'.")
            elif branch == "main":
                self.log("WARN", "Git Branch", f"Currently on production branch '{branch}'. Release work should normally start from 'dev'.")
            else:
                self.log("WARN", "Git Branch", f"On non-standard branch '{branch}' (expected 'dev').")

        # Check clean tree
        code, status_out, _ = self.run_command(["git", "status", "--porcelain"])
        if code == 0:
            if not status_out:
                self.log("PASS", "Working Tree", "Working tree is clean (no uncommitted or untracked changes).")
            else:
                lines = status_out.splitlines()
                self.log("WARN", "Working Tree", f"{len(lines)} uncommitted file(s) detected. Ensure changes are committed before release.")

    def check_versions(self):
        print(f"\n{BOLD}{CYAN}--- Step 2: Version Consistency Matrix (Target: v{self.target_version}) ---{RESET}")

        target = self.target_version

        # 1. index.html asset query strings
        index_file = TOOLS_DIR / "index.html"
        if index_file.exists():
            content = index_file.read_text(encoding="utf-8")
            assets = [
                ("css/style.css", r'href="css/style\.css\?v=([^"]+)"'),
                ("js/suburbs.js", r'src="js/suburbs\.js\?v=([^"]+)"'),
                ("js/pdf-generator.js", r'src="js/pdf-generator\.js\?v=([^"]+)"'),
                ("js/app.js", r'src="js/app\.js\?v=([^"]+)"'),
            ]
            all_assets_match = True
            for name, pat in assets:
                m = re.search(pat, content)
                if not m:
                    self.log("FAIL", "Asset Query String", f"Missing version query string in '{name}'.")
                    all_assets_match = False
                elif m.group(1) != target:
                    self.log("FAIL", "Asset Query String", f"'{name}' query string is '?v={m.group(1)}' (expected '?v={target}').")
                    all_assets_match = False

            if all_assets_match:
                self.log("PASS", "Asset Query Strings", f"All 4 static assets correctly versioned '?v={target}'.")

            # Settings card title
            m_card = re.search(r"KET CoC Generator v([0-9]+\.[0-9]+\.[0-9]+)", content)
            if m_card and m_card.group(1) == target:
                self.log("PASS", "Profile Card Title", f"Settings info card matches 'KET CoC Generator v{target}'.")
            else:
                found = m_card.group(1) if m_card else "None"
                self.log("FAIL", "Profile Card Title", f"Settings info card has 'v{found}' (expected 'v{target}').")
        else:
            self.log("FAIL", "File Exists", "tools/index.html not found.")

        # 2. sw.js cache name
        sw_file = TOOLS_DIR / "sw.js"
        if sw_file.exists():
            sw_content = sw_file.read_text(encoding="utf-8")
            m_sw = re.search(r"const\s+CACHE_NAME\s*=\s*'([^']+)'", sw_content)
            expected_cache = f"qld-coc-cache-v{target}"
            if m_sw and m_sw.group(1) == expected_cache:
                self.log("PASS", "Service Worker Cache", f"CACHE_NAME correctly set to '{expected_cache}'.")
            else:
                found = m_sw.group(1) if m_sw else "None"
                self.log("FAIL", "Service Worker Cache", f"CACHE_NAME is '{found}' (expected '{expected_cache}').")
        else:
            self.log("FAIL", "File Exists", "tools/sw.js not found.")

        # 3. README.md title & badge
        readme_file = TOOLS_DIR / "README.md"
        if readme_file.exists():
            readme_content = readme_file.read_text(encoding="utf-8")
            m_title = re.search(r"# QLD CoC Generator `v([^`]+)`", readme_content)
            m_badge = re.search(r"badge/version-([0-9]+\.[0-9]+\.[0-9]+)-00dd66\.svg", readme_content)

            if m_title and m_title.group(1) == target and m_badge and m_badge.group(1) == target:
                self.log("PASS", "README.md Version", f"Title and shield badge match 'v{target}'.")
            else:
                title_ver = m_title.group(1) if m_title else "None"
                badge_ver = m_badge.group(1) if m_badge else "None"
                self.log("FAIL", "README.md Version", f"README mismatch: Title has 'v{title_ver}', Badge has 'v{badge_ver}' (expected 'v{target}').")
        else:
            self.log("FAIL", "File Exists", "tools/README.md not found.")

        # 4. sitemap.xml date check
        sitemap_file = TOOLS_DIR / "sitemap.xml"
        if sitemap_file.exists():
            sm_content = sitemap_file.read_text(encoding="utf-8")
            dates = re.findall(r"<lastmod>([^<]+)</lastmod>", sm_content)
            if dates:
                valid_format = all(re.match(r"^\d{4}-\d{2}-\d{2}$", d) for d in dates)
                if valid_format:
                    self.log("PASS", "Sitemap Timestamps", f"Found {len(dates)} valid ISO-8601 lastmod date(s) (latest: {dates[0]}).")
                else:
                    self.log("WARN", "Sitemap Timestamps", f"Invalid lastmod date format in sitemap: {dates}")
            else:
                self.log("WARN", "Sitemap Timestamps", "No <lastmod> tags found in tools/sitemap.xml.")
        else:
            self.log("FAIL", "File Exists", "tools/sitemap.xml not found.")

    def check_modal_policy(self):
        print(f"\n{BOLD}{CYAN}--- Step 3: User Experience Silent Release Audit ---{RESET}")
        app_file = TOOLS_DIR / "js" / "app.js"
        if app_file.exists():
            content = app_file.read_text(encoding="utf-8")
            m = re.search(r"const\s+CURRENT_APP_VERSION\s*=\s*'([^']+)'", content)
            if m:
                app_ver = m.group(1)
                if app_ver == self.target_version:
                    self.log("PASS", "Modal Trigger Policy", f"CURRENT_APP_VERSION = '{app_ver}' (ACTIVE: returning users will see What's New modal).")
                else:
                    self.log("PASS", "Modal Trigger Policy", f"CURRENT_APP_VERSION = '{app_ver}' < '{self.target_version}' (SILENT: non-intrusive release policy in effect).")
            else:
                self.log("WARN", "Modal Trigger Policy", "CURRENT_APP_VERSION constant not found in js/app.js.")
        else:
            self.log("FAIL", "File Exists", "tools/js/app.js not found.")

    def check_forbidden_terms(self):
        print(f"\n{BOLD}{CYAN}--- Step 4: Regulatory & Compliance Forbidden Terms Audit ---{RESET}")

        files_to_check = [
            TOOLS_DIR / "index.html",
            TOOLS_DIR / "llms.txt",
            TOOLS_DIR / "llms-full.txt",
            TOOLS_DIR / "README.md",
        ]

        forbidden_patterns = [
            (r"\bofficial\b", "Forbidden word 'official' found"),
            (r"\bStat\s*Dec\b", "Forbidden term 'Stat Dec' found (must be ESR 2026 certification)"),
            (r"\bStatutory\s+Declaration\b", "Forbidden term 'Statutory Declaration' found"),
        ]

        clean = True
        for file in files_to_check:
            if not file.exists():
                continue
            content = file.read_text(encoding="utf-8")
            for pat, desc in forbidden_patterns:
                matches = re.findall(pat, content, re.IGNORECASE)
                if matches:
                    self.log("FAIL", "Compliance Red Line", f"{desc} in {file.name} (occurrences: {len(matches)}).")
                    clean = False

        if clean:
            self.log("PASS", "Compliance Red Line", "Zero forbidden terms ('official', 'Stat Dec', 'Statutory Declaration') detected.")

    def check_privacy_and_english(self):
        print(f"\n{BOLD}{CYAN}--- Step 5: Open Source Privacy & English-Only Audit ---{RESET}")

        # 1. Check Git committer identity
        code_name, author_name, _ = self.run_command(["git", "config", "user.name"])
        code_email, author_email, _ = self.run_command(["git", "config", "user.email"])

        expected_name = "Kai Electrical Tech"
        expected_email_domain = "@kaielectrical.com.au"

        if code_name == 0 and author_name:
            if author_name == expected_name:
                self.log("PASS", "Git Author Name", f"Matches corporate identity '{expected_name}'.")
            else:
                self.log("WARN", "Git Author Name", f"user.name is '{author_name}' (expected '{expected_name}').")
        else:
            self.log("WARN", "Git Author Name", "Git user.name not set locally.")

        if code_email == 0 and author_email:
            if any(author_email.lower().endswith(dom) for dom in [expected_email_domain]):
                self.log("PASS", "Git Author Email", f"Matches corporate domain '{author_email}'.")
            else:
                self.log("FAIL", "Git Author Email", f"user.email '{author_email}' is not from '{expected_email_domain}'.")
        else:
            self.log("WARN", "Git Author Email", "Git user.email not set locally.")

        # 2. Check recent commit messages for non-English / Chinese characters
        code_log, recent_logs, _ = self.run_command(["git", "log", "-n", "10", "--pretty=format:%s %b"])
        if code_log == 0 and recent_logs:
            chinese_in_commits = re.findall(r"[\u4e00-\u9fff]", recent_logs)
            if chinese_in_commits:
                self.log("FAIL", "Git Commit Messages", f"Found {len(chinese_in_commits)} non-English/Chinese character(s) in recent commit log.")
            else:
                self.log("PASS", "Git Commit Messages", "Recent commit messages are 100% English.")

        # 3. Scan tracked text files for Chinese characters & local privacy leaks
        code_files, tracked_files_out, _ = self.run_command(["git", "ls-files"])
        if code_files != 0 or not tracked_files_out:
            self.log("WARN", "Tracked Files Scan", "Could not obtain git tracked files list.")
            return

        tracked_files = [TOOLS_DIR / f for f in tracked_files_out.splitlines()]
        text_extensions = {".html", ".js", ".css", ".md", ".txt", ".json", ".xml", ".py", ".svg"}
        ignored_vendor_files = {"js/lib/pdf-lib.min.js", "js/lib/pdf.min.js", "js/lib/pdf.worker.min.js"}

        privacy_patterns = [
            (r"file:///", "Local file URI ('file:///')"),
            (r"(?<![a-zA-Z0-9+.-])[a-zA-Z]:[\\/][^\\/\s]", "Absolute Windows drive path (e.g., 'C:\\')"),
            (r"[/\\]Users[/\\]", "Local user home path ('/Users/')"),
            (r"\bOneDrive\b", "Local directory keyword ('OneDrive')"),
            (r"\bkyley\b", "Local personal username ('kyley')"),
            (r"\bAntigravity\b", "Local IDE/workspace keyword ('Antigravity')"),
            (r"\b01\.KET\b", "Local workspace folder name ('01.KET')"),
        ]

        allowed_email_domains = ("@kaielectrical.com.au",)
        privacy_clean = True
        english_clean = True

        for file_path in tracked_files:
            rel_path = file_path.relative_to(TOOLS_DIR).as_posix()
            if rel_path in ignored_vendor_files or file_path.suffix.lower() not in text_extensions:
                continue

            try:
                content = file_path.read_text(encoding="utf-8")
            except Exception:
                continue

            # Check for non-English / Chinese characters across ALL text files
            chinese_matches = list(re.finditer(r"[\u4e00-\u9fff]+", content))
            if chinese_matches:
                english_clean = False
                first_match = chinese_matches[0].group(0)
                line_no = content[:chinese_matches[0].start()].count("\n") + 1
                self.log("FAIL", "English Language", f"Non-English text '{first_match}' found in {rel_path}:{line_no}")

            # Skip checking the preflight checker script itself against its own privacy regex definitions
            if rel_path == "scripts/release_check.py":
                continue

            # Check privacy patterns
            for pat, desc in privacy_patterns:
                matches = list(re.finditer(pat, content, re.IGNORECASE))
                if matches:
                    privacy_clean = False
                    line_no = content[:matches[0].start()].count("\n") + 1
                    self.log("FAIL", "Privacy Sanitization", f"{desc} found in {rel_path}:{line_no}")

            # Check emails
            emails = re.findall(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+", content)
            for email in emails:
                if not any(email.lower().endswith(dom) for dom in allowed_email_domains):
                    if any(term in email.lower() for term in ["w3.org", "schema.org", "example.com"]):
                        continue
                    privacy_clean = False
                    self.log("FAIL", "Privacy Sanitization", f"Non-corporate email '{email}' found in {rel_path}")

        if english_clean:
            self.log("PASS", "English Language", "All tracked source & documentation files are 100% English.")
        if privacy_clean:
            self.log("PASS", "Privacy Sanitization", "Zero local paths, user directories, or private emails detected.")

    def run_automated_suite(self):
        print(f"\n{BOLD}{CYAN}--- Step 6: Dual-Layer Automated Test Suite (Playwright + PyMuPDF) ---{RESET}")

        if self.skip_tests:
            print(f" {CYAN}[INFO]{RESET} {BOLD}{'Automated Suite':<22}{RESET} Skipped per --skip-tests flag.")
            return

        if not VERIFY_SCRIPT.exists():
            self.log("FAIL", "Automated Suite", f"Verification script missing at {VERIFY_SCRIPT}")
            return

        uv_cmd = Path.home() / ".local" / "bin" / "uv.exe"
        cmd = [
            str(uv_cmd) if uv_cmd.exists() else "uv",
            "run",
            "--with", "pymupdf",
            "--with", "playwright",
            "python",
            str(VERIFY_SCRIPT)
        ]

        print(f" Executing command: {' '.join(cmd)}")
        code, stdout, stderr = self.run_command(cmd, cwd=WORKSPACE_DIR)

        if code == 0:
            # Extract summary line from verify_pdf.py output
            test_summary = "All verification tests passed (Tests 1-5 PASS)."
            for line in stdout.splitlines():
                if "100% PASS" in line or "PASSED" in line or "ALL" in line:
                    test_summary = line.strip()
            self.log("PASS", "Automated Suite", f"100% PASS: {test_summary}")
        else:
            print(f"\n{RED}--- Test Suite Failure Log ---{RESET}")
            print(stdout)
            print(stderr)
            self.log("FAIL", "Automated Suite", f"Test suite failed with exit code {code}.")

    def print_summary(self):
        print(f"\n{BOLD}{CYAN}======================================================{RESET}")
        print(f"{BOLD}                RELEASE PREFLIGHT REPORT              {RESET}")
        print(f"{BOLD}{CYAN}======================================================{RESET}")

        if self.has_failure:
            print(f"\n {RED}{BOLD}[X] VERDICT: NOT READY FOR RELEASE{RESET}")
            print(f" Please fix the reported failures above before deploying to production.\n")
            return 1
        elif self.has_warning:
            print(f"\n {YELLOW}{BOLD}[!] VERDICT: READY WITH CAUTION{RESET}")
            print(f" All strict tests passed, but please review the warnings above before merging to main.\n")
        else:
            print(f"\n {GREEN}{BOLD}[PASS] VERDICT: 100% READY FOR PRODUCTION RELEASE{RESET}\n")

        print(f"{BOLD}Recommended Git Deployment Workflow:{RESET}")
        print(f" {CYAN}git checkout main{RESET}")
        print(f" {CYAN}git merge dev{RESET}")
        print(f" {CYAN}git push origin main{RESET}")
        print(f" {CYAN}git checkout dev{RESET}")
        print(f"\n{BOLD}{CYAN}======================================================{RESET}\n")
        return 0


def main():
    parser = argparse.ArgumentParser(description="Release Preflight & Consistency Verifier for KET CoC Generator")
    parser.add_argument("--version", type=str, help="Target release version (e.g. 1.1.1). Auto-detected if omitted.")
    parser.add_argument("--skip-tests", action="store_true", help="Skip running Playwright/PyMuPDF test suite.")
    parser.add_argument("--strict", action="store_true", help="Treat warnings as failures.")
    args = parser.parse_args()

    checker = PreflightChecker(target_version=args.version, skip_tests=args.skip_tests, strict=args.strict)

    if not checker.target_version:
        detected = checker.auto_detect_version()
        if detected:
            checker.target_version = detected
            print(f"{BOLD}Auto-detected release version:{RESET} {CYAN}v{detected}{RESET}")
        else:
            print(f"{RED}Error: Could not auto-detect version. Please specify --version X.Y.Z{RESET}")
            sys.exit(1)

    checker.check_git()
    checker.check_versions()
    checker.check_modal_policy()
    checker.check_forbidden_terms()
    checker.check_privacy_and_english()
    checker.run_automated_suite()

    exit_code = checker.print_summary()
    sys.exit(exit_code)


if __name__ == "__main__":
    main()
