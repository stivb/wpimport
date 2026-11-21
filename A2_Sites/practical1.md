# Lab Practical 1: Web Page Editing and AI-Assisted Documentation

## Overview

In this practical, you'll make simple but meaningful edits to `site.html` and `site.css`, then document your changes in `site.md`. You'll learn how **context matters for AI** — specifically, why `site.md` is essential reading before anyone (human or AI) makes changes.

---

## Part A: Understanding the Context

### Why site.md is Critical

Before making **any** change to this site, read [site.md](./site.md) completely. Here's why:

1. **It explains the design philosophy**: The site separates concerns into HTML (structure), CSS (appearance), JavaScript (interaction), and SQL (data selection).

2. **It documents assumptions**: The page assumes certain data tables, fields, and WordPress conventions. Changes that break these assumptions break the page.

3. **It describes the flow**: Understanding how the page loads, queries, and renders helps you predict side effects of your edits.

4. **It guides AI assistants**: When you ask Copilot or another AI to help, pasting or referencing site.md ensures the AI understands your project's constraints and style before suggesting changes.

5. **It prevents rework**: Many frustrated hours come from changing code without understanding its purpose. Good documentation saves time.

**Rule 1:** Always share `site.md` context with AI before asking it to edit site.html or related files.

---

## Part B: Your Tasks

### Setup

1. If you haven't already, clone or fork the repository to your local machine.
2. Navigate to the `A2_Sites` directory.
3. Verify you have `site.html`, `site.md`, and `starter.css`.
4. Ensure git is initialized and you can commit and push changes.

### Task 1: Change the Page Title

**Goal:** Update the main heading and browser tab title to something new.

**What to do:**

1. Open `site.html` in your editor.
2. Find the `<title>` tag in the `<head>` section. It currently says `Days Out in Herts`.
3. Change it to a new title of your choice (e.g., `My Awesome Activities` or `Local Events Hub`).
4. Find the main `<h1>` heading in the `<body>`. It also says `Days Out in Herts`.
5. Change it to match your new title.

**Commit:**

```bash
git add site.html
git commit -m "Update page title to 'My Awesome Activities'"
```

Then push: `git push origin main` (or your branch name).

**Update site.md:**

1. Ask Copilot: *"I changed the page title in site.html from 'Days Out in Herts' to 'My Awesome Activities'. Please add an entry to site.md documenting this change under a new 'Change Log' section. Include the date, what was changed, and why (you can reason about why a user might want to personalize the title)."*

2. Review Copilot's suggestion, then apply it to site.md.

3. Commit: `git add site.md && git commit -m "Document title change in site.md"`

---

### Task 2: Change the Font Used in site.html

**Goal:** Modify the CSS to use a different font family for the entire page.

**What to do:**

1. Open `starter.css` in your editor.
2. Look for the `body` or `main` selector. It likely has a `font-family` property.
3. Change the font to something different. Options:
   - `"Courier New", monospace` (a fixed-width font)
   - `"Georgia", serif` (a serif font)
   - `"Trebuchet MS", sans-serif` (a clean sans-serif)
   - Any Google Font you like (you'd need to add a `@import` rule at the top of the CSS)
4. Save and test: open `site.html` in a browser and verify the font looks right.

**Commit:**

```bash
git add starter.css
git commit -m "Change page font to Georgia serif"
```

Push: `git push origin main`

**Update site.md:**

Ask Copilot: *"I changed the font in starter.css. Please add this change to the Change Log section in site.md. Explain that CSS controls appearance, as described in the site's design philosophy, and note which file was changed and what the new font is."*

Apply and commit as before.

---

### Task 3: Change the Background Color of site.html

**Goal:** Modify the CSS to give the page a different background color.

**What to do:**

1. Open `starter.css`.
2. Find the `body` selector or the main content area (look for `main`).
3. Add or modify a `background-color` property. Try something like:
   - `background-color: #f0f8ff;` (Alice blue)
   - `background-color: #fffacd;` (Light yellow)
   - `background-color: #e0f0d8;` (Light green)
4. Save and test in your browser.

**Commit:**

```bash
git add starter.css
git commit -m "Add light blue background color to page"
```

Push.

**Update site.md:**

Ask Copilot: *"I added a background color to the page. Please add this to the Change Log in site.md. This is a CSS-only change and does not affect the data structure or JavaScript interaction. Note that background color is a pure styling choice."*

Apply and commit.

---

### Task 4: Exclude an Arbitrary Source Site from the Page

**Goal:** Use the curation system to hide posts from one site (e.g., `site1`).

**What to do:**

1. Open `curation.sql` (if it exists) or examine the site.html script for the `curation.sql` loading behavior. Look at site.md under "What curation changes."
2. If `curation.sql` exists, add a line to mark all posts from one site as not public:
   ```sql
   UPDATE posts SET isPublic = 0 WHERE site_id = 'site1';
   ```
3. Save and test: open site.html in your browser. Posts from `site1` should no longer appear, but the filter buttons should still show (with 0 posts for that site).
4. Alternatively, if curation isn't yet set up, modify `site.html`'s `buildQuery()` function to add a condition like:
   ```js
   clauses.push('p.site_id != ?');
   params.push('site1');
   ```

**Commit:**

```bash
git add curation.sql  # or site.html if you edited JavaScript
git commit -m "Exclude site1 posts from the displayed feed via curation"
```

Push.

**Update site.md:**

Ask Copilot: *"I've excluded posts from 'site1' from the feed. Please add this to the Change Log in site.md. Explain where the exclusion happens (curation layer or JavaScript filter) and note that this is an editorial decision that affects what content is shown but does not change the underlying data structure."*

Apply and commit.

---

### Task 5: Make Links from the Card to the Original WordPress Post

**Goal:** Turn the post card into a clickable link that opens the original post in a new tab or window.

**What to do:**

1. Open `site.html`.
2. Find the `renderPosts()` function (search for "function renderPosts").
3. Look at the line where the card `<article>` is created. The post data includes a `link` property pointing to the original WordPress URL.
4. Wrap the card content in an `<a>` tag, or add an explicit "Read more" link:
   ```html
   <a href="${Loader.escapeHtml(post.link)}" target="_blank" rel="noopener noreferrer">
     <!-- card content here -->
   </a>
   ```
   OR add this near the bottom of the card:
   ```html
   <a href="${Loader.escapeHtml(post.link)}" target="_blank" rel="noopener noreferrer">Read full post on ${Loader.escapeHtml(post.site_title)}</a>
   ```
5. Save, test in your browser. Click a card or the "Read full post" link; it should open the original post.

**Commit:**

```bash
git add site.html
git commit -m "Add clickable link from post card to original WordPress post"
```

Push.

**Update site.md:**

Ask Copilot: *"I modified site.html to make post cards link to the original WordPress posts. Please add this to the Change Log in site.md. Explain that the `link` field was already in the query result, and that adding the link improves usability by letting visitors read the full post without losing context. Note that this is a JavaScript rendering change."*

Apply and commit.

---

### Task 6: Add a "Return to Page" Link on the Status Line

**Goal:** Add a simple link or indicator to the status message so visitors can understand the page's purpose at a glance.

**What to do:**

1. Open `site.html`.
2. Find the `<div class="status-line" id="status-line">Loading...</div>` in the HTML body.
3. When the page finishes loading, its JavaScript updates this status to show a message like "Showing X posts" or "Curation applied."
4. Add a small info text or icon that appears in the status line. For example:
   ```html
   <div class="status-line" id="status-line">
     <span>Loading...</span>
     <a href="#" title="Learn how this page works">ℹ️</a>
   </div>
   ```
5. Or, modify the JavaScript that sets the status line text to append helpful information:
   ```js
   statusLineEl.textContent = `Showing ${postCount} posts from ${siteCount} source(s). `;
   ```

**Commit:**

```bash
git add site.html
git commit -m "Add informational status text to help visitors understand the page"
```

Push.

**Update site.md:**

Ask Copilot: *"I enhanced the status line to show more information about the page's content and purpose. Please add this to the Change Log in site.md. This is a JavaScript and HTML change that improves the visitor experience without changing the data model."*

Apply and commit.

---

### Task 7: Change the Subtitle or Description

**Goal:** Update the page's explanatory text to reflect your site's purpose.

**What to do:**

1. Open `site.html`.
2. Find the `<div class="subtitle">` element. It currently says *"Free and family-friendly things to do outdoors around Hertfordshire, plus a few local fitness options."*
3. Change it to describe your version of the site (e.g., *"Your guide to amazing events and activities in your area"* or *"Curated local recommendations, all in one place"*).
4. Save and test.

**Commit:**

```bash
git add site.html
git commit -m "Update subtitle to describe the site's purpose"
```

Push.

**Update site.md:**

Ask Copilot: *"I updated the site's subtitle to better reflect its purpose. Please add this to the Change Log in site.md. Explain that the subtitle is part of the HTML structure and communicates the site's value to visitors."*

Apply and commit.

---

## Part C: Reviewing Your Work

### Checklist

After completing the tasks, verify:

- [ ] You made at least 7 commits (one per task, plus one for each site.md update).
- [ ] Each commit has a clear, descriptive message.
- [ ] All commits have been pushed to GitHub.
- [ ] site.md now has a "Change Log" section documenting every change.
- [ ] site.html still loads and displays correctly in your browser.
- [ ] The original data and functionality are intact (you only changed presentation or non-critical behavior).

### Reflection Questions

Answer these in a short text file or as comments in your repository:

1. **Context and AI:** Why is it important to share `site.md` with an AI assistant before asking it to modify `site.html`? What information did `site.md` provide that helped you understand the page?

2. **Separation of Concerns:** How did the site's separation of HTML, CSS, JavaScript, and SQL help you make changes without breaking the page? Can you think of a change that *would* break the page?

3. **Documentation:** How did updating `site.md` after each change help you (and might help others) understand what was modified and why?

4. **Git Workflow:** What did each commit message tell you about the change? Could someone else understand what you did just by reading your commit log?

---

## Part D: Optional Challenges

If you've completed all tasks and have time, try one of these:

### Challenge A: Add a Custom Color Theme Toggle

Add a button or dropdown that lets visitors switch between light and dark themes. Store the choice in `localStorage` so it persists.

**Hint:** Modify `starter.css` to include a `:root` CSS variable like `--bg-color: white;`, then toggle its value with JavaScript.

### Challenge B: Display Only Recent Posts

Add a filter to show only posts from the last 7, 14, or 30 days. Modify `buildQuery()` to add a date condition.

**Hint:** JavaScript dates can be compared; SQL `date()` functions can help too.

### Challenge C: Search by Title

Add a text input box that filters posts by title keyword. This is similar to the category filter but searches text instead of exact matches.

**Hint:** Use SQL `LIKE` operator: `WHERE p.title LIKE ?` with parameter `'%' + searchTerm + '%'`.

### Challenge D: Show a Post Count by Site

Add a badge to each site filter button showing how many posts are from that site. The current code already has the info; you just need to query and display it.

---

## Submission

Commit and push all your changes. Submit the URL of your GitHub repository to your instructor.

Include:
- All 7 (or more) completed tasks.
- Updated `site.md` with a Change Log.
- Answers to the Reflection Questions.
- (Optional) Evidence of Challenge attempts.

---

## Summary

By completing this practical, you have:

✅ Learned why documentation is essential before making changes.  
✅ Practiced using version control to track your edits.  
✅ Collaborated with an AI assistant to keep your documentation up to date.  
✅ Separated presentation (CSS, HTML) from behavior (JavaScript) and data (SQL).  
✅ Made meaningful, observable changes to a real web page.

Great work! You now understand how small, well-documented changes build a maintainable project.
