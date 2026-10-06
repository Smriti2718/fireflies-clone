"""Hand-written sample meetings for a usable first run.

Each meeting lists its transcript as (speaker, text) pairs; timestamps are derived from
speaking pace in seed.py. Chapters and action items reference transcript lines by index
so they always point at the right moment.
"""

PEOPLE = {
    "Priya Sharma": "priya@acmeflow.io",
    "Daniel Kim": "daniel@acmeflow.io",
    "Maya Rodriguez": "maya@acmeflow.io",
    "Arjun Mehta": "arjun@acmeflow.io",
    "Sofia Chen": "sofia@acmeflow.io",
    "Liam O'Brien": "liam@acmeflow.io",
    "Ethan Walker": "ethan@acmeflow.io",
    "Nisha Patel": "nisha@acmeflow.io",
    "Olivia Park": "olivia@acmeflow.io",
    "Marcus Lee": "marcus@acmeflow.io",
    "Jordan Blake": "jordan@acmeflow.io",
    "Hannah Weiss": "hannah.weiss@northwind-logistics.com",
    "Tom Becker": "tom.becker@northwind-logistics.com",
}

MEETINGS = [
    {
        "title": "Q4 Product Roadmap Planning",
        "days_ago": 1, "hour": 10, "minute": 0, "platform": "Google Meet",
        "participants": ["Priya Sharma", "Daniel Kim", "Maya Rodriguez", "Arjun Mehta"],
        "transcript": [
            ("Priya Sharma", "Hi everyone, thanks for joining. The goal today is to lock the Q4 roadmap so engineering can start sprint planning next week."),
            ("Daniel Kim", "Sounds good. Before we start, I want to flag that we're carrying about two sprints of tech debt from the billing migration."),
            ("Priya Sharma", "Noted. Let's start with the candidates. We have three big bets: the new onboarding flow, the analytics dashboard, and the Slack integration."),
            ("Maya Rodriguez", "From the design side, onboarding is the most ready. We have high fidelity mocks and we tested them with eight customers last month."),
            ("Arjun Mehta", "The data backs that up. Thirty-eight percent of new signups drop off before they create their first workspace. That's our biggest funnel leak."),
            ("Priya Sharma", "Thirty-eight percent is huge. What did the drop-off look like by step?"),
            ("Arjun Mehta", "Most of it happens at the invite teammates step. People don't want to invite anyone before they've seen value."),
            ("Maya Rodriguez", "Which is exactly what the new flow fixes. We moved invites to after the first project is created, and we added a sample project so the workspace never looks empty."),
            ("Daniel Kim", "Engineering-wise, onboarding is maybe three weeks for two engineers. Most of it is frontend. The sample project needs a small backend seeding service."),
            ("Priya Sharma", "Great. What about the analytics dashboard?"),
            ("Daniel Kim", "That one's bigger. We'd need to move event data into the warehouse first. I'd say six to eight weeks, and it depends on the data pipeline work Arjun's team is doing."),
            ("Arjun Mehta", "The pipeline should be ready by mid November. If we start dashboard work before that, we'll be building against mock data."),
            ("Priya Sharma", "So realistically the dashboard ships at the very end of the quarter, if at all."),
            ("Daniel Kim", "Right. I'd rather commit to a beta of the dashboard for five design partners than promise general availability."),
            ("Priya Sharma", "I like that. And the Slack integration?"),
            ("Maya Rodriguez", "Customers keep asking for it. It came up in eleven of the last twenty sales calls according to the CRM notes."),
            ("Daniel Kim", "Slack is about four weeks. The tricky part is permissions and the app review process, which can take two weeks on Slack's side."),
            ("Priya Sharma", "Okay, so here's my proposal. Onboarding first, starting next sprint. Slack integration second. Analytics dashboard as a design partner beta at the end of the quarter."),
            ("Arjun Mehta", "Agreed. I'd add that we should instrument the new onboarding flow from day one so we can measure the impact on activation."),
            ("Priya Sharma", "Good call. Arjun, can you define the activation metrics and the event tracking plan before the sprint starts?"),
            ("Arjun Mehta", "Yes, I'll have the tracking plan ready by Friday."),
            ("Daniel Kim", "What about the tech debt? I don't want to lose another quarter on it."),
            ("Priya Sharma", "Let's reserve twenty percent of each sprint for tech debt. Daniel, can you put together a prioritized list so we tackle the riskiest items first?"),
            ("Daniel Kim", "I'll do that. I'll share it in the engineering channel by Wednesday."),
            ("Maya Rodriguez", "One more thing. For Slack, I'd love to run a quick design sprint with two customers before we write any code."),
            ("Priya Sharma", "Makes sense. Maya, I'll leave it to you to schedule those sessions. Let's aim for the first week of November."),
            ("Maya Rodriguez", "I'll reach out to the customers this week and send calendar invites."),
            ("Priya Sharma", "Perfect. I'll write up the roadmap doc and share it with leadership on Thursday. Thanks everyone, this was really productive."),
        ],
        "overview": (
            "The team finalized the Q4 roadmap. Onboarding v2 goes first: data shows 38% of new signups drop off, "
            "mostly at the invite-teammates step, and the redesigned flow (invites after first project, sample "
            "project) is design-ready and roughly three weeks of work. The Slack integration follows (about four "
            "weeks, plus up to two weeks of Slack app review) after a short design sprint with customers. The "
            "analytics dashboard is scoped down to a design-partner beta at quarter end because it depends on the "
            "warehouse pipeline landing in mid-November. Twenty percent of every sprint is reserved for tech debt."
        ),
        "keywords": ["Q4 Roadmap", "Onboarding Flow", "Activation", "Slack Integration", "Analytics Dashboard", "Tech Debt", "Data Pipeline"],
        "chapters": [
            (0, "Kickoff & tech debt context", "Priya sets the goal of locking the Q4 roadmap; Daniel flags two sprints of billing-migration tech debt."),
            (3, "Onboarding funnel data", "Arjun shows 38% of signups drop at the invite step; Maya's redesign moves invites later and adds a sample project."),
            (10, "Analytics dashboard scope", "Dashboard depends on the mid-November data pipeline; the team agrees on a design-partner beta instead of GA."),
            (15, "Slack integration", "Requested in 11 of 20 sales calls; ~4 weeks of build plus Slack app review."),
            (17, "Final priorities & owners", "Order agreed: onboarding, Slack, dashboard beta; 20% of each sprint reserved for tech debt."),
        ],
        "actions": [
            (20, "Define activation metrics and the event tracking plan for the new onboarding flow", "Arjun Mehta", False, 3),
            (23, "Share a prioritized tech-debt list in the engineering channel", "Daniel Kim", True, 1),
            (26, "Schedule Slack integration design sessions with two customers", "Maya Rodriguez", False, 7),
            (27, "Write the Q4 roadmap doc and share it with leadership", "Priya Sharma", False, 2),
        ],
    },
    {
        "title": "Weekly Engineering Standup",
        "days_ago": 2, "hour": 9, "minute": 30, "platform": "Zoom",
        "participants": ["Daniel Kim", "Sofia Chen", "Liam O'Brien", "Priya Sharma"],
        "transcript": [
            ("Daniel Kim", "Morning all. Let's go around quickly. Sofia, do you want to start?"),
            ("Sofia Chen", "Sure. I finished the webhook retry logic yesterday. Failed deliveries now retry with exponential backoff up to six times, and we log every attempt."),
            ("Sofia Chen", "Today I'm writing integration tests for it. No blockers, but I'd like a review from someone who knows the queue worker."),
            ("Liam O'Brien", "I can review that. I rewrote half of the queue worker last quarter, so I know where the bodies are buried."),
            ("Daniel Kim", "Thanks Liam. What's on your plate?"),
            ("Liam O'Brien", "I'm still on the search performance issue. P95 latency on the meetings search endpoint is around two point four seconds, which is way too slow."),
            ("Liam O'Brien", "I found the culprit. We're doing a full table scan on the transcript table because the query uses a leading wildcard."),
            ("Priya Sharma", "Is that what customers have been complaining about? Support mentioned search feels sluggish for large workspaces."),
            ("Liam O'Brien", "Almost certainly. The fix is to move to a proper full text index. I'm prototyping it with SQLite FTS in staging and the early numbers look like under two hundred milliseconds."),
            ("Daniel Kim", "That's a big win. How long until it's production ready?"),
            ("Liam O'Brien", "I need to write the migration and backfill the index for existing transcripts. Probably Thursday if nothing weird shows up."),
            ("Daniel Kim", "Okay. Please make sure the backfill runs in batches so we don't lock the database during business hours."),
            ("Liam O'Brien", "Yep, I'll batch it and run it overnight."),
            ("Daniel Kim", "On my side, I'm finishing the incident review for last Tuesday's outage. Root cause was an expired TLS certificate on the internal media service."),
            ("Priya Sharma", "How do we stop that from happening again?"),
            ("Daniel Kim", "We're adding certificate expiry monitoring with alerts thirty days out, and moving that service to automatic renewal. I'll publish the postmortem by end of day."),
            ("Sofia Chen", "Should we also add the cert check to the on-call runbook?"),
            ("Daniel Kim", "Good idea. Sofia, can you add a section to the runbook covering certificate checks?"),
            ("Sofia Chen", "Sure, I'll add it today after the tests."),
            ("Priya Sharma", "One request from product. The onboarding work starts next sprint, so if anyone has capacity Friday, it would help to pair with Maya on the component inventory."),
            ("Liam O'Brien", "I can do Friday afternoon once the search migration is out."),
            ("Daniel Kim", "Great. That's everything. Thanks all, let's keep the channel updated if anything slips."),
        ],
        "overview": (
            "Sofia shipped webhook retries with exponential backoff and is writing integration tests; Liam will review. "
            "Liam traced slow meeting search (P95 ~2.4s) to a full table scan from leading-wildcard queries and is "
            "prototyping an FTS index (<200ms in staging), targeting Thursday with an overnight batched backfill. "
            "Daniel is closing the postmortem for last week's outage caused by an expired TLS certificate; fixes are "
            "expiry alerts 30 days out and automatic renewal. Liam will pair with Maya on onboarding on Friday."
        ),
        "keywords": ["Webhook Retries", "Search Latency", "Full Text Index", "TLS Certificate", "Postmortem", "Runbook"],
        "chapters": [
            (0, "Webhook retry logic", "Exponential backoff with six retries is done; integration tests in progress."),
            (5, "Search performance", "Leading-wildcard queries cause full scans; FTS prototype brings latency under 200ms."),
            (13, "Outage postmortem", "Expired TLS cert on the media service; adding expiry monitoring and auto-renewal."),
            (19, "Onboarding support", "Liam volunteers to pair with Maya on the component inventory Friday."),
        ],
        "actions": [
            (3, "Review Sofia's webhook retry PR", "Liam O'Brien", True, 0),
            (10, "Ship FTS migration and batched overnight backfill for transcript search", "Liam O'Brien", False, 2),
            (15, "Publish the TLS outage postmortem", "Daniel Kim", True, 0),
            (17, "Add a certificate-check section to the on-call runbook", "Sofia Chen", False, 1),
        ],
    },
    {
        "title": "Northwind Logistics — Discovery Call",
        "days_ago": 4, "hour": 15, "minute": 0, "platform": "Zoom",
        "participants": ["Jordan Blake", "Hannah Weiss", "Tom Becker", "Priya Sharma"],
        "transcript": [
            ("Jordan Blake", "Hannah, Tom, thanks for making the time. To start, could you tell us a bit about how your team runs meetings today?"),
            ("Hannah Weiss", "Sure. I run operations for our North America region. We have about one hundred and twenty people across dispatch, customer success, and carrier relations."),
            ("Hannah Weiss", "We're on calls all day. Carrier check-ins, customer escalations, weekly business reviews. And honestly, a lot of what's agreed on those calls just disappears."),
            ("Jordan Blake", "When you say disappears, what does that look like in practice?"),
            ("Hannah Weiss", "Someone promises a customer a revised delivery window, nobody writes it down, and two days later the customer calls back angry. It happened three times last month with one of our biggest accounts."),
            ("Priya Sharma", "That's really helpful context. Are people taking notes manually today?"),
            ("Hannah Weiss", "Some do, most don't. And the notes that exist are in personal notebooks or random docs, so nobody else can find them."),
            ("Jordan Blake", "Tom, from the IT side, what does your stack look like?"),
            ("Tom Becker", "We're mostly on Microsoft Teams internally, but carriers often send Zoom links. Calendar is Outlook. CRM is Salesforce."),
            ("Tom Becker", "My main concerns are security and data residency. We have customers in Canada and some of them have contracts that require data to stay in North America."),
            ("Jordan Blake", "Totally understood. We support regional data storage and we're SOC 2 Type II certified. I can send you our security package after the call."),
            ("Tom Becker", "Please do. I'll also need to know how recording consent works, because some provinces have two-party consent rules."),
            ("Priya Sharma", "Our assistant announces itself when it joins, and admins can configure a consent message. We can walk you through the settings in a follow-up."),
            ("Hannah Weiss", "The other thing I really want is action items pushed into Salesforce automatically, attached to the right account. That would be the killer feature for my team."),
            ("Priya Sharma", "That's exactly the workflow our CRM sync is built for. Action items get attached to the matching account based on attendee email domains."),
            ("Hannah Weiss", "That would solve the disappearing promises problem."),
            ("Jordan Blake", "What would a successful pilot look like for you?"),
            ("Hannah Weiss", "If my customer success team of fifteen used it for a month and we had zero missed commitments with our top ten accounts, I'd be sold."),
            ("Jordan Blake", "That's a very clear success criteria. What's your timeline for a decision?"),
            ("Hannah Weiss", "Our budget cycle closes at the end of November, so we'd want to finish a pilot before then."),
            ("Jordan Blake", "Great. Here's what I suggest. I'll send the security package and a pilot proposal by Thursday, and we'll schedule a technical deep dive with Tom next week."),
            ("Tom Becker", "Works for me. Please include the Teams integration details and the data residency documentation."),
            ("Priya Sharma", "I'll also share our product roadmap for the Salesforce sync so you can see what's coming."),
            ("Hannah Weiss", "Perfect. Thanks both, this was a great conversation."),
        ],
        "overview": (
            "Hannah (VP Operations, Northwind Logistics, ~120 people) described commitments made on carrier and "
            "customer calls getting lost, causing three escalations with a top account last month. Tom (IT) uses "
            "Teams, Outlook and Salesforce, and needs North American data residency and clear recording-consent "
            "controls. Automatic Salesforce sync of action items is the must-have feature. Success for a pilot: "
            "15-person CS team, one month, zero missed commitments with top-10 accounts. Decision deadline is the "
            "end-of-November budget close."
        ),
        "keywords": ["Discovery Call", "Salesforce Sync", "Data Residency", "Recording Consent", "Pilot", "Microsoft Teams"],
        "chapters": [
            (0, "Current meeting workflow", "Ops team of ~120 loses commitments made on calls; three escalations last month."),
            (7, "IT stack & security", "Teams, Outlook, Salesforce; Canadian data residency and two-party consent concerns."),
            (13, "Must-have: CRM sync", "Action items auto-attached to Salesforce accounts would solve the core pain."),
            (16, "Pilot criteria & next steps", "One-month pilot with 15 CS reps; decision before the November budget close."),
        ],
        "actions": [
            (20, "Send security package and pilot proposal to Northwind", "Jordan Blake", False, 2),
            (20, "Schedule technical deep dive with Tom for next week", "Jordan Blake", False, 6),
            (21, "Include Teams integration details and data residency documentation", "Jordan Blake", False, 2),
            (22, "Share Salesforce sync roadmap with Northwind", "Priya Sharma", True, 0),
        ],
    },
    {
        "title": "Design Review: Onboarding Flow v2",
        "days_ago": 6, "hour": 14, "minute": 0, "platform": "Google Meet",
        "participants": ["Maya Rodriguez", "Priya Sharma", "Ethan Walker"],
        "transcript": [
            ("Maya Rodriguez", "Okay, I'm sharing my screen. This is the latest version of onboarding v2. I'll walk through the four steps and then we can discuss."),
            ("Maya Rodriguez", "Step one is the welcome screen. We ask just one question: what's your role. That lets us personalize the sample project."),
            ("Ethan Walker", "Do we really need the role question? Every extra field costs us conversion."),
            ("Maya Rodriguez", "In testing, people actually liked it. Six of eight participants said the personalized sample made the product click faster."),
            ("Priya Sharma", "Let's keep it, but make it skippable. Ethan, would that address your concern?"),
            ("Ethan Walker", "Yeah, skippable works."),
            ("Maya Rodriguez", "Step two creates the workspace with a sample project already in it. The empty state problem is gone."),
            ("Ethan Walker", "I like this a lot. One thing though, the sample project has twelve tasks. That feels overwhelming. Could we cut it to five?"),
            ("Maya Rodriguez", "Fair point. I'll reduce it to five tasks and make sure each one teaches a single feature."),
            ("Maya Rodriguez", "Step three is creating your first real project, and step four is the invite screen, which we moved to the end."),
            ("Priya Sharma", "On the invite screen, the copy says invite your team to get started. But they've already started at this point. That's confusing."),
            ("Maya Rodriguez", "Good catch. Something like bring your team in, or work better together?"),
            ("Priya Sharma", "Let's A/B test two variants. Ethan, can you set up the experiment once the flow is built?"),
            ("Ethan Walker", "Sure, I'll set it up in the experimentation framework. We'll need about two weeks of traffic for significance."),
            ("Ethan Walker", "Also, accessibility. The progress indicator only uses color to show the current step. We need a text label for screen readers."),
            ("Maya Rodriguez", "Agreed, I'll add step labels and run the whole flow through the contrast checker."),
            ("Priya Sharma", "What about mobile? A lot of our signups come from phones after clicking an invite email."),
            ("Maya Rodriguez", "The flow is responsive, but I haven't designed a dedicated mobile layout for the sample project view. I'll mock that up this week."),
            ("Priya Sharma", "Great. So the decisions are: keep the role question but make it skippable, cut the sample project to five tasks, test the invite copy, fix accessibility, and add a mobile layout."),
            ("Ethan Walker", "Sounds right. When can engineering get final specs?"),
            ("Maya Rodriguez", "I'll hand off final specs by next Tuesday."),
        ],
        "overview": (
            "Maya walked through the four-step onboarding v2 (role question, workspace with sample project, first "
            "project, invites last). Decisions: keep the role question but make it skippable; cut the sample project "
            "from twelve to five tasks, each teaching one feature; A/B test the invite-screen copy; add text labels "
            "to the progress indicator for accessibility; and design a dedicated mobile layout for the sample "
            "project view. Final specs go to engineering next Tuesday."
        ),
        "keywords": ["Onboarding v2", "Sample Project", "Invite Screen", "A/B Test", "Accessibility", "Mobile Layout"],
        "chapters": [
            (0, "Welcome & role question", "Role question personalizes the sample project; it stays but becomes skippable."),
            (6, "Sample project", "Empty state solved; sample trimmed from 12 to 5 tasks."),
            (9, "Invite screen copy", "Current copy is confusing; two variants will be A/B tested."),
            (14, "Accessibility & mobile", "Progress indicator needs text labels; mobile layout for sample project needed."),
            (18, "Decisions & handoff", "Recap of decisions; specs to engineering next Tuesday."),
        ],
        "actions": [
            (8, "Reduce sample project to five tasks, one feature each", "Maya Rodriguez", True, 0),
            (13, "Set up A/B experiment for invite-screen copy", "Ethan Walker", False, 10),
            (15, "Add step labels to progress indicator and run contrast checks", "Maya Rodriguez", False, 3),
            (17, "Mock up mobile layout for the sample project view", "Maya Rodriguez", False, 4),
            (20, "Hand off final onboarding specs to engineering", "Maya Rodriguez", False, 5),
        ],
    },
    {
        "title": "Hiring Sync: Senior Backend Engineer",
        "days_ago": 8, "hour": 11, "minute": 30, "platform": "Microsoft Teams",
        "participants": ["Nisha Patel", "Daniel Kim", "Sofia Chen"],
        "transcript": [
            ("Nisha Patel", "Thanks for joining. We have three candidates in the final stage for the senior backend role, and I'd like a decision on next steps today."),
            ("Nisha Patel", "Let's start with Rahul. Daniel, you did the system design round."),
            ("Daniel Kim", "Rahul was strong. He designed a rate limiter with a token bucket, talked through Redis failure modes without prompting, and asked great clarifying questions."),
            ("Sofia Chen", "I had him for the coding round. Clean code, good tests, but he was a bit slow. He finished the second problem with only two minutes left."),
            ("Daniel Kim", "Speed in an interview isn't a big concern for me. I care more that he thinks about edge cases, and he clearly does."),
            ("Nisha Patel", "Got it. Next is Elena."),
            ("Sofia Chen", "Elena was the fastest coder of the three. She solved both problems with time to spare and refactored her first solution unprompted."),
            ("Daniel Kim", "Her system design was weaker though. She jumped straight into the database schema without clarifying requirements, and she didn't consider scaling the read path."),
            ("Nisha Patel", "Is that a dealbreaker for a senior role?"),
            ("Daniel Kim", "Not necessarily, but I'd want a second design conversation to see if it was nerves or a real gap."),
            ("Nisha Patel", "And the third candidate, Marco?"),
            ("Sofia Chen", "Marco was solid on both rounds but didn't stand out. He also mentioned he's expecting a competing offer by the end of next week."),
            ("Daniel Kim", "I'd be okay hiring Marco, but I'm more excited about Rahul."),
            ("Nisha Patel", "So it sounds like we move forward with an offer for Rahul, a follow-up design conversation for Elena, and we keep Marco warm. Does everyone agree?"),
            ("Sofia Chen", "Agreed."),
            ("Daniel Kim", "Agreed. Nisha, can you check the salary band with finance before we extend the offer? He mentioned expectations at the top of our range."),
            ("Nisha Patel", "I'll talk to finance today and prepare the offer letter by Thursday."),
            ("Daniel Kim", "I'll run the follow-up design session with Elena. Can you schedule it for early next week?"),
            ("Nisha Patel", "Yes, I'll send her some times. I'll also update Marco so he knows we're still interested."),
            ("Sofia Chen", "One process note. Our coding round feedback form doesn't have a field for test quality. Can we add one?"),
            ("Nisha Patel", "Good idea, I'll update the scorecard template this week."),
        ],
        "overview": (
            "The panel reviewed three finalists for Senior Backend Engineer. Rahul impressed in system design "
            "(token-bucket rate limiter, Redis failure modes) and wrote clean, well-tested code, if slowly — the team "
            "will extend him an offer. Elena was the fastest coder but rushed system design without clarifying "
            "requirements; she gets a second design conversation. Marco was solid but unremarkable and has a "
            "competing offer due next week, so he'll be kept warm. Nisha will add a test-quality field to the "
            "coding scorecard."
        ),
        "keywords": ["Hiring", "Senior Backend Engineer", "System Design", "Coding Round", "Offer", "Scorecard"],
        "chapters": [
            (1, "Candidate: Rahul", "Strong system design and thoughtful code; slightly slow."),
            (5, "Candidate: Elena", "Fastest coder; weaker system design — needs a follow-up conversation."),
            (10, "Candidate: Marco", "Solid but not standout; competing offer expected next week."),
            (13, "Decision & process", "Offer to Rahul, follow-up for Elena, keep Marco warm; scorecard update."),
        ],
        "actions": [
            (16, "Confirm salary band with finance and prepare Rahul's offer letter", "Nisha Patel", False, 2),
            (17, "Run follow-up system design session with Elena", "Daniel Kim", False, 6),
            (18, "Update Marco that the team is still interested", "Nisha Patel", True, 0),
            (20, "Add a test-quality field to the coding round scorecard", "Nisha Patel", False, 5),
        ],
    },
    {
        "title": "Fall Launch Campaign Retro",
        "days_ago": 12, "hour": 16, "minute": 0, "platform": "Zoom",
        "participants": ["Olivia Park", "Marcus Lee", "Priya Sharma"],
        "transcript": [
            ("Olivia Park", "Welcome to the fall launch retro. Let's do what went well, what didn't, and what we change next time. Marcus, can you start with the numbers?"),
            ("Marcus Lee", "Sure. The launch drove eighteen thousand site visits in the first week, which is about forty percent above our target."),
            ("Marcus Lee", "Signups were two thousand one hundred, so roughly an eleven percent conversion from visit to signup. The launch video alone got sixty thousand views."),
            ("Priya Sharma", "That's fantastic. What drove most of the traffic?"),
            ("Marcus Lee", "The newsletter and the founder's LinkedIn post. Paid social was disappointing. We spent eight thousand dollars and it drove less than ten percent of signups."),
            ("Olivia Park", "So the cost per signup on paid social was way higher than organic."),
            ("Marcus Lee", "About four times higher. I'd recommend we cut paid social for the next launch and put that budget into a customer webinar."),
            ("Olivia Park", "What didn't go well from the product side, Priya?"),
            ("Priya Sharma", "The biggest issue was that the launch landing page went live before the feature flag was turned on for everyone. For about two hours, people clicked through and couldn't find the feature."),
            ("Olivia Park", "Ouch. How did that happen?"),
            ("Priya Sharma", "Marketing and engineering had different launch times in their calendars. One was in Pacific time and one was in UTC."),
            ("Marcus Lee", "We need a single launch checklist that everyone signs off on, with times in one time zone."),
            ("Olivia Park", "Agreed. I'll create a shared launch checklist template and we'll use it for every launch going forward."),
            ("Priya Sharma", "I'd also like a go/no-go meeting thirty minutes before launch with one person from each team."),
            ("Olivia Park", "Love it. Let's add that to the checklist."),
            ("Marcus Lee", "One more thing. Sales didn't get the launch messaging until the day of. They should get it at least a week earlier so they can prep."),
            ("Olivia Park", "Good point. Marcus, can you own the sales enablement timeline for the next launch?"),
            ("Marcus Lee", "Yes, I'll draft an enablement timeline and share it with the sales leads."),
            ("Olivia Park", "Great. To summarize: organic channels worked, paid social didn't, and we need a shared checklist, a go/no-go meeting, and earlier sales enablement. Thanks both!"),
        ],
        "overview": (
            "The fall launch beat its traffic target by ~40% (18k visits in week one, 2,100 signups, ~11% conversion, "
            "60k video views), driven mainly by the newsletter and the founder's LinkedIn post. Paid social "
            "underperformed at roughly 4x the cost per signup of organic, so its budget moves to a customer webinar. "
            "The main failure: the landing page went live two hours before the feature flag because teams used "
            "different time zones. Fixes: a shared launch checklist in one time zone, a go/no-go meeting 30 minutes "
            "before launch, and sales enablement at least a week ahead."
        ),
        "keywords": ["Launch Retro", "Signups", "Paid Social", "Launch Checklist", "Go/No-Go", "Sales Enablement"],
        "chapters": [
            (1, "Launch results", "18k visits (+40% vs target), 2,100 signups, 60k video views."),
            (4, "Channel performance", "Organic (newsletter, LinkedIn) won; paid social cost ~4x per signup."),
            (8, "What went wrong", "Landing page went live before the feature flag due to a time-zone mismatch."),
            (11, "Process changes", "Shared checklist, go/no-go meeting, earlier sales enablement."),
        ],
        "actions": [
            (6, "Reallocate paid social budget to a customer webinar for next launch", "Marcus Lee", False, 14),
            (12, "Create a shared launch checklist template (single time zone)", "Olivia Park", True, 0),
            (14, "Add a go/no-go meeting 30 minutes before launch to the checklist", "Olivia Park", True, 0),
            (17, "Draft sales enablement timeline and share with sales leads", "Marcus Lee", False, 7),
        ],
    },
]
