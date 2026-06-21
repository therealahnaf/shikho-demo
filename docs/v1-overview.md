# StudyCircle V1

## Simplified Demo Requirements

## 1. Product Goal

StudyCircle is a social learning feature inside Shikho where students studying the same course can complete challenges together, compare progress, share notes, and compete to become the weekly Mentor.

The V1 demo should show one complete and understandable learning loop:

1. Join a circle
2. View the current challenge
3. Complete learning activities
4. Move forward on the roadmap
5. Gain leaderboard points
6. Share notes
7. Become Mentor of the Week
8. Create the next weekly roadmap

The prototype should be clickable, functional, and have persistent state.

---

# 2. V1 Feature List

## 2.1 StudyCircle Onboarding

The student can:

* Open StudyCircle from the Shikho home screen
* See a short explanation of StudyCircle
* View a recommended circle
* Join the recommended circle
* Enter the Circle Home

---

## 2.2 Circle Home

The Circle Home should display:

* Circle name
* Current monthly mission
* Today’s quest
* Weekly roadmap preview
* Circle streak
* Leaderboard preview
* Current Mentor
* Recent learning activity

The main action should be:

**Continue Roadmap**

---

## 2.3 Monthly Circle Mission

The circle has one shared monthly challenge.

Example:

> Complete 300 quiz questions as a circle

The student can see:

* Current progress
* Target
* Percentage completed
* Time remaining
* Their contribution

---

## 2.4 Daily Circle Quest

The circle receives one smaller daily challenge.

Examples:

* Complete 20 quiz questions together
* Review Chapter 1
* Complete three lessons as a group
* Get 15 correct answers

The student can see:

* Quest name
* Progress
* Completion status
* Time remaining

---

## 2.5 Weekly Roadmap

The circle has a visual weekly learning roadmap.

Example checkpoints:

1. Review Chapter 1
2. Watch Lesson 1
3. Complete Practice Quiz
4. Review Mistakes
5. Complete Weekly Challenge

Each student appears on the roadmap using an avatar.

The roadmap should show:

* Current student position
* Other members’ positions
* Completed checkpoints
* Current checkpoint
* Remaining checkpoints

The student moves forward after completing a learning activity.

---

## 2.6 Circle Leaderboard

The leaderboard ranks students inside the circle.

Students receive points for:

* Completing lessons
* Completing quizzes
* Finishing roadmap checkpoints
* Contributing to daily quests
* Sharing useful notes

The leaderboard displays:

* Rank
* Student name
* Avatar
* Weekly points
* Current Mentor indicator

The leaderboard resets every week.

---

## 2.7 Mentor of the Week

The student in first place at the end of the week becomes Mentor of the Week.

The Mentor can:

* Choose the topics for the next weekly roadmap
* Select roadmap activities
* Arrange the roadmap order
* Publish the roadmap
* Highlight one note from the Circle Store

The Mentor role lasts for one week.

For the demo, the Mentor should choose from predefined topics and activities.

---

## 2.8 Circle Store

The Circle Store is where students share study notes with circle members.

Students can:

* View shared notes
* Add a text note
* Upload an image note
* Select a chapter
* Mark a note as helpful
* See who uploaded the note

The Store should have simple chapter filters.

Example categories:

* Chapter 1
* Chapter 2
* Formulas
* Revision Notes
* Important Questions

---

## 2.9 Circle Streak

The Circle Streak shows how many days the circle has completed its daily quest.

Example:

> 7-day Circle Streak

The streak increases when the daily quest is completed.

For the demo, the streak can update through a simulated learning activity.

---

## 2.10 Learning Activity Feed

The activity feed is created automatically from student actions.

Example events:

* Rafi completed the Chapter 1 quiz.
* Nabila moved to first place.
* The circle completed today’s quest.
* Samia uploaded a new note.
* Fahim reached Roadmap Stage 4.
* Arif became Mentor of the Week.
* The circle reached a seven-day streak.

Students cannot create posts or comments.

---

## 2.11 Persistent State

The following information must remain after page refresh or reopening the prototype:

* Circle membership
* Monthly mission progress
* Daily quest progress
* Roadmap position
* Leaderboard points
* Current Mentor
* Circle streak
* Uploaded notes
* Helpful reactions
* Activity-feed events

---

# 3. Simplified Onboarding Process

## Step 1: Shikho Home

The student sees a StudyCircle card.

Example:

> **StudyCircle**
> Learn with other Class 10 Mathematics students.

Button:

**Explore StudyCircle**

---

## Step 2: Introduction

The student sees three simple benefits:

* Complete challenges together
* Race through the weekly roadmap
* Become Mentor of the Week

Button:

**Find My Circle**

---

## Step 3: Recommended Circle

The student sees one recommended circle.

Example:

> **Math Champions**
> Class 10 Mathematics
> 6 members
> Monthly Mission: Complete 300 quiz questions

Button:

**Join Circle**

---

## Step 4: Join Confirmation

The student joins the circle.

The application saves the membership.

Button:

**Enter StudyCircle**

---

## Step 5: Circle Home

The student arrives at Circle Home and sees:

* Monthly mission
* Daily quest
* Weekly roadmap
* Current leaderboard
* Next learning activity

Primary button:

**Continue Roadmap**

The student should not repeat onboarding after refreshing the page.

---

# 4. Main Demo Flow

## 4.1 Join the Circle

1. Open StudyCircle from Shikho Home.
2. View the introduction.
3. View the recommended circle.
4. Join the circle.
5. Enter Circle Home.
6. Refresh the page.
7. Confirm that membership remains.

---

## 4.2 Complete a Learning Activity

1. Open the weekly roadmap.
2. Select the current checkpoint.
3. Open a simulated lesson or quiz.
4. Complete the activity.
5. Return to StudyCircle.

After completion:

* The student moves forward on the roadmap.
* Leaderboard points increase.
* Daily quest progress increases.
* Monthly mission progress increases.
* An activity event appears.
* The updated state is saved.

---

## 4.3 Upload a Note

1. Open Circle Store.
2. Select Add Note.
3. Enter a title.
4. Select a chapter.
5. Enter text or upload an image.
6. Save the note.

After saving:

* The note appears in the Circle Store.
* The note remains after refresh.
* An activity event appears.

---

## 4.4 Mark a Note Helpful

1. Open a shared note.
2. Select Helpful.
3. Helpful count increases.
4. The reaction remains after refresh.

---

## 4.5 Become Mentor

For the prototype, the demo user can reach first place by completing enough activities.

After reaching first place:

* The student receives the Mentor badge.
* The Mentor Workspace becomes available.
* The activity feed announces the new Mentor.

The weekly reset can be simulated using a demo button.

---

## 4.6 Create the Next Roadmap

1. Mentor opens the Mentor Workspace.
2. Selects a roadmap title.
3. Selects topics from a predefined list.
4. Selects activities.
5. Reorders the checkpoints.
6. Selects one note as Mentor’s Pick.
7. Publishes the roadmap.

After publishing:

* The new roadmap appears for the circle.
* The selected note appears as Mentor’s Pick.
* An activity-feed event is created.
* The roadmap remains after refresh.

---

# 5. Simplified Functional Requirements

## FR-01: Open StudyCircle

The system must allow the student to open StudyCircle from the Shikho-style home screen.

---

## FR-02: Complete Onboarding

The student must be able to:

* View the introduction
* View the recommended circle
* Join the circle
* Enter Circle Home

---

## FR-03: Save Membership

The system must save circle membership.

The student must remain a member after refreshing or reopening the prototype.

---

## FR-04: Display Circle Home

Circle Home must display:

* Monthly mission
* Daily quest
* Weekly roadmap
* Circle streak
* Leaderboard
* Current Mentor
* Activity feed

---

## FR-05: Display Monthly Mission

The system must show:

* Mission title
* Current progress
* Target
* Percentage complete
* Student contribution

---

## FR-06: Display Daily Quest

The system must show:

* Quest title
* Current progress
* Target
* Completion status

---

## FR-07: Complete Simulated Activity

The student must be able to complete a simulated lesson or quiz.

The completion must update:

* Roadmap position
* Leaderboard points
* Daily quest progress
* Monthly mission progress
* Activity feed

---

## FR-08: Display Roadmap

The roadmap must show:

* Weekly checkpoints
* Student positions
* Completed checkpoints
* Current checkpoint
* Locked checkpoints

---

## FR-09: Move Student on Roadmap

Completing a linked activity must move the student to the next checkpoint.

---

## FR-10: Display Leaderboard

The leaderboard must show:

* Rank
* Student name
* Avatar
* Weekly points
* Mentor badge

---

## FR-11: Update Leaderboard

Completing a learning activity must increase the student’s points and update their ranking.

---

## FR-12: Assign Mentor

The first-ranked student must be shown as Mentor of the Week.

For the demo, the weekly result may be triggered using a simulation control.

---

## FR-13: Open Mentor Workspace

Only the current Mentor must be able to open the Mentor Workspace.

---

## FR-14: Create Roadmap

The Mentor must be able to:

* Select a roadmap title
* Select topics
* Select activities
* Reorder activities
* Publish the roadmap

---

## FR-15: Save Published Roadmap

The published roadmap must appear in Circle Home and remain after refresh.

---

## FR-16: View Circle Store

The student must be able to browse notes shared by circle members.

---

## FR-17: Add Note

The student must be able to add:

* A title
* A chapter
* Text content or an image

The saved note must appear in the Circle Store.

---

## FR-18: Mark Note Helpful

The student must be able to mark a note as helpful.

The helpful count must update and persist.

---

## FR-19: Display Circle Streak

The system must show the current Circle Streak.

Completing the daily quest must increase the streak in the demo.

---

## FR-20: Generate Activity Events

The system must automatically add activity-feed events after:

* Lesson completion
* Quiz completion
* Roadmap progress
* Daily quest completion
* Note upload
* Leaderboard movement
* Mentor selection
* Roadmap publication

---

## FR-21: Persist Demo State

All important prototype actions must remain after refresh.

This includes:

* Membership
* Progress
* Scores
* Roadmap
* Mentor status
* Notes
* Helpful reactions
* Activity feed
* Streak

---

# 6. Required Prototype Screens

The V1 demo only needs the following screens:

1. Shikho Home
2. StudyCircle Introduction
3. Recommended Circle
4. Circle Home
5. Weekly Roadmap
6. Circle Leaderboard
7. Circle Store
8. Add Note
9. Activity Completion Screen
10. Mentor Workspace

The Circle Home may combine the mission, quest, streak, roadmap preview, leaderboard preview, and activity feed.

---

# 7. Suggested Demo Data

## Circle

**Math Champions**

Class 10 Mathematics

Members:

* Rafi
* Nabila
* Samia
* Fahim
* Arif
* Demo Student

## Monthly Mission

Complete 300 quiz questions as a circle.

Current progress:

185 of 300

## Daily Quest

Answer 25 quiz questions today.

Current progress:

17 of 25

## Weekly Roadmap

1. Review Chapter 1
2. Watch Algebra Lesson
3. Complete Practice Quiz
4. Review Mistakes
5. Complete Weekly Challenge

## Circle Streak

7 days

## Example Store Notes

* Algebra Formula Sheet
* Chapter 1 Summary
* Common Quiz Mistakes
* Important Exam Questions

---

# 8. Demo Acceptance Criteria

The prototype is complete when a reviewer can:

1. Open StudyCircle from the Shikho Home.
2. Complete the onboarding flow.
3. Join the recommended circle.
4. Refresh and remain inside the circle.
5. View the monthly mission and daily quest.
6. Complete a simulated learning activity.
7. See mission and quest progress update.
8. See the student move on the roadmap.
9. See leaderboard points update.
10. See an activity event appear.
11. Open the Circle Store.
12. Add a note.
13. Refresh and see the note still available.
14. Mark a note helpful.
15. Reach first place in the leaderboard.
16. Become Mentor of the Week.
17. Open the Mentor Workspace.
18. Create and publish the next roadmap.
19. Refresh and see the published roadmap preserved.

---

# 9. Excluded From the Demo

The following are not required:

* Administration dashboard
* Teacher dashboard
* Parent dashboard
* Content review workflow
* Resource approval workflow
* Reporting workflow
* Complex eligibility checks
* Automated circle matching
* Multiple courses
* Multiple circles
* Open chat
* Private messaging
* Notifications
* Real-time updates
* Real Shikho lesson integration
* Production authentication
* Advanced privacy controls
* Weekly background jobs
* Automatic leaderboard resets
* Full file moderation
* Voice sessions
* 1v1 quiz battles

These can be represented through simple demo data or simulated controls where necessary.

---

# 10. V1 Summary

The V1 demo should focus on five core experiences:

1. Join a StudyCircle
2. Complete learning challenges
3. Progress through a weekly roadmap
4. Compete for Mentor of the Week
5. Share notes through the Circle Store

Everything else should support these five experiences without adding unnecessary complexity.
