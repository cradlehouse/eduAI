<!-- Research brief, 2026-09-12. Basis for docs/NAVIGATION.md. -->

# Navigation IA for a role-based education + media app — research brief

## 0. Framing

The founder's instinct ("the user is what it is") matches the dominant pattern in the products surveyed. None of Canvas, Google Classroom, GitHub, Vercel, Stripe, Linear, Frame.io, Notion or Slack uses a role toggle. They all do one of two things: (a) show the same navigation to everyone and add items the user's permissions unlock (Canvas Admin link, GitHub org Settings tab, Stripe team roles), or (b) offer an explicit, bordered, temporary "act as / view as" mode with a single exit button (Canvas Student View, Canvas Act as User). The one counterexample — Google Classroom's homepage "Teaching / Enrolled / Admin" view toggle — is a filter over the class list on the home page only; it does not change the app's chrome and does not exist inside a class.

NN/g's framing is the right starting point: "IA informs UI"; decide the hierarchy first, then pick navigation components, because "making navigation component choices based on looks alone can force you to change an ideal IA" ([NN/g, IA vs Navigation](https://www.nngroup.com/articles/ia-vs-navigation/)). Your IA is already fixed and strictly hierarchical: org → cohort → project → (bible, storyboard/cuts, takes, compare, timeline, export). That is a four-level tree, which is exactly the case where the sources below converge on: fixed global nav + contextual local nav + breadcrumbs.

## 1. Established patterns

**Global vs local navigation.** NN/g defines global navigation as the set that "remains consistent across the entire site" and local navigation as "contextual to the user's current location — showing sibling pages within the current category." Two rules matter for you: local nav "should not be more salient than the global navigation" or users mistake it for the whole site; and "both horizontal and vertical local navigation struggle to accommodate deep IA structures," so for deeper pages "breadcrumbs become more practical than multi-layered local navigation" ([NN/g, Local vs Global Navigation](https://www.nngroup.com/articles/local-navigation/)). Translation: don't try to render org → cohort → project → tool as a four-level tree in one sidebar.

**Left sidebar: when it should change contents.** NN/g's vertical-nav article argues for the left rail on the grounds of scalability and scanning ("users look at the left half of the screen 80% of the time") and warns against duplicating the same items in a rail and a hamburger ([NN/g, Vertical Navigation](https://www.nngroup.com/articles/vertical-nav/)). It does not itself say whether a sidebar should swap contents by context; the design systems do. IBM Carbon's UI Shell is explicit: the header is "the highest level of navigation"; the left panel is "an optional panel that is used for a product's navigation"… "contains secondary navigation"; use it "if there are more than five secondary navigation items, or if you expect a user to switch between secondary items frequently"; and "the left panel does not support three tiers of navigation" ([Carbon UI Shell left panel](https://carbondesignsystem.com/components/UI-shell-left-panel/usage/)). Shopify's app-nav guidance caps primary items at seven ("item seven and above are truncated into a View more button"), keeps main navigation out of the page header, uses tabs for secondary nav where "clicking a tab should only change the content below it, not above," and requires that "merchants should be able to return to the previous page without using the browser button" via breadcrumbs or a back button on detail pages ([Shopify app navigation](https://shopify.dev/docs/apps/design/navigation)). Atlassian's current navigation system is split into top-nav items (product-wide: switcher, search, create, notifications, profile) and side-nav items (contextual to the current product/space) ([Atlassian navigation system](https://atlassian.design/components/navigation-system/)); the old side-navigation component is deprecated in favour of it. So the consensus: **header = global and fixed; sidebar = the current container's sections, changing when the container changes; never more than two tiers in the sidebar.**

**Breadcrumbs.** NN/g: breadcrumbs "show a list of links representing the current page and its ancestors," must reflect hierarchy not browsing history, start at the home/root, end with the current page unlinked, and on polyhierarchical sites show "a single canonical pathway" ([NN/g, Breadcrumbs](https://www.nngroup.com/articles/breadcrumbs/)). GOV.UK: use them "to help users understand and move between the multiple levels," not for flat sites or linear journeys, "not where other navigation elements (like sidebars) already provide sufficient support," placed at the top of the page before `<main>` ([GOV.UK breadcrumbs](https://design-system.service.gov.uk/components/breadcrumbs/)). NN/g's universal-navigation guidance adds the "way back up" rule for subsites: put the link to the parent "close to a left-placed logo," keep it "easily discoverable" but not competing with the subsite's own nav ([NN/g, Universal Navigation](https://www.nngroup.com/articles/universal-navigation/)).

**Hub-and-spoke / list→detail.** NN/g describes the "homepage-as-navigation-hub" pattern: a hub page lists the options; to go elsewhere "users have to first go back to the hub." It suits task-oriented products where users "rarely accomplish more than one task during a single session" ([NN/g, Mobile Navigation Patterns](https://www.nngroup.com/articles/mobile-navigation-patterns/)). Every exemplar below is hub-and-spoke at the container level (Courses list → course; Classes → class; org → repo; team → project; workspace → project) with tabs/sidebar inside the spoke.

**Cascading menus.** NN/g's cascading-menus article was not retrievable (404 at time of writing); the applicable rule from the vertical-nav and local-nav pieces is the same: avoid deep hover cascades for a 4-level IA; use hub pages + breadcrumbs instead.

**Duplicates.** NN/g: "Only show what's needed. Nothing more." Each extra link "increases the interaction cost," and users "must remember whether they have seen the link before." Redundancy is tolerable only for "a few of the highest-priority links," and redundant links should be "far apart… if they can be seen together within the same view" you have too much ([NN/g, Duplicate Links](https://www.nngroup.com/articles/duplicate-links/)). Applied to roles: an instructor should not see "My projects" and "Cohort projects" and "All projects" as three sidebar entries.

## 2. Exemplars

**Canvas LMS.** Global Navigation is a fixed left rail: Account, Dashboard, Courses, Groups, Calendar, Inbox, History, Help, and "depending on your role… additional links" — an Admin link for account admins ([Canvas Basics Guide, Global Navigation](https://community.instructure.com/t5/Canvas-Basics-Guide/How-do-I-use-the-Global-Navigation-Menu/ta-p/618767); confirmed via [Penn](https://infocanvas.upenn.edu/students/navigating-canvas/) and [SFSU](https://athelp.sfsu.edu/hc/en-us/articles/18435027728019-Canvas-user-interface-and-navigation)). Entering a course adds a second, inner left column — Course Navigation — with Home, Announcements, Assignments, Modules, People, Grades, … Settings always last. Instructors see disabled/unpublished items with a crossed-eye icon: "instructors can see the item, but students cannot"; "Instructors always have access to all tools even if they are hidden from student view" ([Canvas, Manage Course Navigation links](https://community.instructure.com/en/kb/articles/660741-how-do-i-manage-course-navigation-links); [GMU summary](https://its.gmu.edu/knowledge-base/canvas-course-navigation-menu/)). Same menu, more items, visibly marked — not a different menu. Teacher-as-student is **Student View**: entered from Settings or the glasses icon on most course pages; "the pink border around your screen will indicate if you are in student view"; the "Leave Student View button is located in the far bottom right corner, inside the magenta bar," plus Reset Student ([Canvas Instructor Guide](https://community.instructure.com/t5/Instructor-Guide/How-do-I-view-a-course-as-a-test-student-using-Student-View/ta-p/1122); [Yale](https://help.canvas.yale.edu/a/914678-viewing-what-students-see-in-your-course); [Pitt](https://teaching.pitt.edu/resources/how-to-use-the-student-view-to-preview-your-canvas-course/)). Admins additionally have **Act as User** (masquerade): "log in as the user without a password… audit logs will show that you performed the tasks while acting as that user," exited via "Stop Acting as User" ([Canvas Admin Guide](https://community.instructure.com/t5/Admin-Guide/How-do-I-act-as-another-user-in-an-account/ta-p/161); [API masquerading](https://developerdocs.instructure.com/services/canvas/basics/file.masquerading)). Note: the Canvas community pages are JS-rendered and only partly fetchable; details above are cross-checked against university help pages.

**Google Classroom.** Home = Classes (card hub). Home has a top-right view toggle "Teaching / Enrolled / Admin" that filters the class list and modules (Recently Due vs Due Soon) — the closest thing to a role switcher in the set, and it is scoped to the homepage ([Classroom homepage](https://support.google.com/edu/classroom/answer/17231999?hl=en)). Inside a class, top tabs: teacher gets Stream, Classwork, People, Grades ([teacher class page](https://support.google.com/edu/classroom/answer/9582854?hl=en)); student gets Stream, Classwork, People — same tabs minus Grades ([student guide](https://support.google.com/edu/classroom/answer/9582544)). Back out via Menu → Home. Teacher views a student's work through the hierarchy, not a mode: "click the class → People → the student's name" lands on a per-student work list with status filters; "click the work → View Details" opens the submission ([View all your students' work](https://support.google.com/edu/classroom/answer/9157286?hl=en)). Classroom has no "view as student" feature; teachers ask for it repeatedly and are told to enrol a second account ([Classroom community thread](https://support.google.com/edu/classroom/thread/37574094?hl=en)).

**GitHub.** 2023 redesign: a fixed top bar with global menu (dashboard, Issues, PRs, repos, teams), search/command palette, and "crucial links like issues, pull requests, and notifications… always just one click away in the upper-right"; breadcrumbs "reflecting GitHub's information architecture" (owner / repo / path) sit in the header ([GitHub blog](https://github.blog/news-insights/product-news/exploring-github-with-the-redesigned-navigation-now-in-public-beta/); [changelog](https://github.blog/changelog/2023-10-17-redesigned-navigation-now-available-to-all-users/)). Org and repo each expose a horizontal tab row (org: Repositories, Projects, Packages, Teams, People, Settings; repo: Code, Issues, Pull requests, …, Settings). Role handling is additive: "Only organization owners and billing managers can see… the full set of account settings," and if the Settings tab isn't visible "select the dropdown menu" ([Accessing org settings](https://docs.github.com/en/organizations/collaborating-with-groups-in-organizations/accessing-your-organizations-settings)).

**Vercel.** Header carries a scope selector "at the top left of the dashboard's navigation bar" (account/team → project), rendered as a breadcrumb-like chain with avatars ([Projects overview](https://vercel.com/docs/projects)). The Feb-2026 redesign moved section tabs into a sidebar with "consistent links across team and project levels" and "projects as filters so you can switch between team and project versions of the same page in one click" ([changelog: new navigation](https://vercel.com/changelog/new-dashboard-navigation-available); [rollout](https://vercel.com/changelog/dashboard-navigation-redesign-rollout)). This is the cleanest statement of the principle: sidebar labels stay the same; the header scope decides what they show.

**Stripe.** Single account-scoped left sidebar: a primary section (Home, Balances, Transactions, Customers, Product catalog), a Shortcuts section of pinned/recent pages, a Products section, and "More" for everything else; settings split Personal / Account / Product; team roles limit what members can do, not the menu structure ([Stripe Dashboard docs](https://docs.stripe.com/dashboard/basics)). Detail pages (a customer, a payment) use an in-page back/breadcrumb, not a sidebar change. Stripe is the model for a *flat* entity set — less applicable to a 4-level tree than Vercel or GitHub, but the "Shortcuts/recents" section is worth borrowing.

**Linear.** Hierarchy: workspace → teams → cycles/projects → issues ([Concepts](https://linear.app/docs/conceptual-model)). Sidebar: personal items (Inbox, My issues), a Workspace section, then one collapsible block per joined team with sub-pages Triage, Issues, Cycles, Projects, Views; teams you browse but haven't joined "show up in your sidebar under a temporary *Exploring* section"; favourites pin views to the sidebar ([Teams](https://linear.app/docs/teams)). A project page is a spoke with its own tab set; you leave via the sidebar or breadcrumb header. Linear shows how to make a two-tier sidebar (container → sections) work without a scope switcher: every team you belong to is simply listed.

**Frame.io V4.** Account → Workspace → Project → folders/assets. Home lists "your Workspaces and the projects that you are a member of"; each workspace has a landing page; the left sidebar lists workspaces; "workspace breadcrumbs help you stay grounded as you move between projects"; Cmd-K search spans everything ([Workspace overview](https://help.frame.io/en/articles/9101001-workspace-overview); [V4 workspaces post](https://blog.frame.io/2024/04/30/frame-io-v4-beta-feature-easy-asset-findability-workspaces/)). Closest analogue to your media entities; it is hub-and-spoke with breadcrumbs, and no role mode — permissions simply hide restricted folders.

**Notion / Slack (optional).** Notion: one sidebar with Favourites / Teamspaces / Shared / Private sections, infinite nesting, and the top bar showing the current page's path ([Notion sidebar](https://www.notion.com/help/navigate-with-the-sidebar)). Slack: a narrow global rail (Home, DMs, Activity, Later, More) plus a workspace-scoped channel list with custom sections ([Slack custom sections](https://slack.com/help/articles/360043207674-Organize-your-sidebar-with-custom-sections)). Both confirm: global rail fixed, second column scoped to the selected container.

## 3. Role handling — the cross-cutting findings

1. **Additive menus, not alternate menus.** Canvas adds "Admin"; GitHub adds "Settings"; Classroom adds "Grades"; Stripe/Linear gate actions by permission. Nobody swaps the sidebar per role.
2. **Visibility markers instead of hiding.** Canvas's crossed-eye icon lets an instructor see the student's menu and their own at once. That solves "what does the student see?" without a mode for the common case.
3. **Entering someone else's work is navigation, not a mode.** Classroom: Class → People → student → work. Vercel: team → project. Frame.io: workspace → project. The instructor lands in the same project UI the student uses, with more affordances (comment/grade/settings).
4. **"View as" is a separate, bordered, escapable mode** — used only when the goal is to *verify the student experience*, not to do work. Canvas is the only exemplar with it; it uses a full-screen coloured border, a persistent bottom bar, one exit button, and audit logging for the admin variant.
5. **Where exemplars disagree:** Classroom's homepage Teaching/Enrolled/Admin toggle vs everyone else's "no toggle." The reconciliation is that Classroom's toggle only filters a list for people who are teachers *and* students of different classes; it never changes app chrome. Vercel keeps sidebar labels identical across scopes (team vs project), whereas GitHub and Linear give org/team and repo/project *different* tab sets. For your app the entity levels have genuinely different sections, so follow GitHub/Linear on contents but Vercel on placement (scope in the header).

## 4. Recommendation — outline IA

**Landing per role** (Canvas Dashboard / Classroom Classes / Frame.io Home):
- Student → Home showing their 1–2 project cards + due items. One project → auto-open it (hub-and-spoke exception when there is one spoke).
- Instructor → Home showing their cohorts as cards, each expanding to projects; "Needs review" module.
- Admin → same Home as instructor for cohorts they teach, plus an "Organisation" card/section. No separate admin app.

**Global header (fixed on every page)** — GitHub/Vercel/Atlassian top nav:
`[Logo/Home] [Scope breadcrumb: Org › Cohort › Project]   [Search ⌘K] [+ New] [Inbox/Activity] [Avatar → Profile, Org settings (admin only), Sign out]`
The breadcrumb *is* the scope switcher: each segment is a dropdown listing siblings (Vercel scope selector; NN/g "single canonical pathway"). Org segment hidden when the user belongs to one org.

**Left sidebar = sections of the current scope only** (Carbon: two tiers max; Vercel: consistent labels; Canvas: Settings last):
- Org scope (admin only reaches it): Overview · Cohorts · People · Settings.
- Cohort scope: Overview · Projects · Students · Schedule · Settings (Settings visible only to instructor/admin — additive, GitHub style).
- Project scope: Bible · Storyboard/Cuts · Takes · Compare · Timeline · Export · Members · Settings. Same list for every role; items the student cannot access carry a Canvas-style visibility marker for instructors rather than a separate menu.
- Above the section list, a compact "Recent / Pinned" group (Stripe Shortcuts, Linear favourites) so an instructor bouncing between students' projects doesn't re-traverse the hub each time.

**Entering a student's project and returning** (Classroom People → student; Frame.io breadcrumbs):
Cohort › Students › [student] shows their projects; or Cohort › Projects lists all. Clicking opens the identical project UI. The header breadcrumb reads `Org › Cohort › Project` with the project segment dropdown listing the cohort's other projects, so an instructor can move between students' projects without going back up. Return = click the Cohort segment (NN/g universal navigation: the way up sits at top-left, next to the logo). No banner is needed because the instructor is acting *as themselves* with their own permissions — the URL, breadcrumb and their avatar say who and where they are.

**"View as student" (optional, later)** — Canvas Student View only: a project-level action under Settings/⋯ that re-renders with student permissions, a full-width coloured border, a bottom bar with "Leave student view," and logging if an admin uses it. Never a global toggle.

**Breadcrumb format:** `Org › Cohort › Project › Section`, first segment linked, last segment unlinked (NN/g), top of page before main (GOV.UK). Mobile: collapse to parent only.

**Anti-patterns to avoid, per the sources:** three-tier sidebars (Carbon); the same project reachable from three sidebar entries (NN/g duplicate links); primary nav in the page header (Shopify); local nav more prominent than the global bar (NN/g); a role switcher that changes chrome (no exemplar does it).

## Sources

- https://www.nngroup.com/articles/ia-vs-navigation/
- https://www.nngroup.com/articles/local-navigation/
- https://www.nngroup.com/articles/vertical-nav/
- https://www.nngroup.com/articles/breadcrumbs/
- https://www.nngroup.com/articles/universal-navigation/
- https://www.nngroup.com/articles/mobile-navigation-patterns/
- https://www.nngroup.com/articles/duplicate-links/
- https://carbondesignsystem.com/components/UI-shell-left-panel/usage/
- https://shopify.dev/docs/apps/design/navigation
- https://atlassian.design/components/navigation-system/
- https://design-system.service.gov.uk/components/breadcrumbs/
- https://community.instructure.com/t5/Canvas-Basics-Guide/How-do-I-use-the-Global-Navigation-Menu/ta-p/618767
- https://community.instructure.com/t5/Instructor-Guide/How-do-I-view-a-course-as-a-test-student-using-Student-View/ta-p/1122
- https://community.instructure.com/en/kb/articles/660741-how-do-i-manage-course-navigation-links
- https://community.instructure.com/t5/Admin-Guide/How-do-I-act-as-another-user-in-an-account/ta-p/161
- https://developerdocs.instructure.com/services/canvas/basics/file.masquerading
- https://help.canvas.yale.edu/a/914678-viewing-what-students-see-in-your-course
- https://teaching.pitt.edu/resources/how-to-use-the-student-view-to-preview-your-canvas-course/
- https://its.gmu.edu/knowledge-base/canvas-course-navigation-menu/
- https://infocanvas.upenn.edu/students/navigating-canvas/
- https://support.google.com/edu/classroom/answer/17231999?hl=en
- https://support.google.com/edu/classroom/answer/9582854?hl=en
- https://support.google.com/edu/classroom/answer/9582544
- https://support.google.com/edu/classroom/answer/9157286?hl=en
- https://support.google.com/edu/classroom/thread/37574094?hl=en
- https://github.blog/news-insights/product-news/exploring-github-with-the-redesigned-navigation-now-in-public-beta/
- https://github.blog/changelog/2023-10-17-redesigned-navigation-now-available-to-all-users/
- https://docs.github.com/en/organizations/collaborating-with-groups-in-organizations/accessing-your-organizations-settings
- https://vercel.com/docs/projects
- https://vercel.com/changelog/new-dashboard-navigation-available
- https://vercel.com/changelog/dashboard-navigation-redesign-rollout
- https://docs.stripe.com/dashboard/basics
- https://linear.app/docs/conceptual-model
- https://linear.app/docs/teams
- https://help.frame.io/en/articles/9101001-workspace-overview
- https://blog.frame.io/2024/04/30/frame-io-v4-beta-feature-easy-asset-findability-workspaces/
- https://www.notion.com/help/navigate-with-the-sidebar
- https://slack.com/help/articles/360043207674-Organize-your-sidebar-with-custom-sections

Research gaps: NN/g's cascading-menus article and Material 3's navigation-drawer guidelines page were not retrievable (404 / client-rendered), and the Canvas community pages render client-side, so Canvas claims are backed by the official page URLs plus university help-centre mirrors.
