import { Navigate, Route, Routes } from "react-router-dom";

import { AccessKeyPage } from "@/pages/access-key-page";
import { AppLayout } from "@/components/app-layout";
import { ActivityPage } from "@/pages/activity-page";
import { AppResolverPage } from "@/pages/app-resolver-page";
import { CircleHomePage } from "@/pages/circle-home-page";
import { HomePage } from "@/pages/home-page";
import { JoinedCirclePage } from "@/pages/joined-circle-page";
import { LandingPage } from "@/pages/landing-page";
import { LeaderboardPage } from "@/pages/leaderboard-page";
import { LoginPage } from "@/pages/login-page";
import { OnboardingPage } from "@/pages/onboarding-page";
import { RecommendedCirclePage } from "@/pages/recommended-circle-page";
import { RoadmapPage } from "@/pages/roadmap-page";
import { StudyCircleIntroPage } from "@/pages/study-circle-intro-page";
import { CircleStorePage } from "@/pages/circle-store-page";
import { NewNotePage } from "@/pages/new-note-page";
import { NoteDetailPage } from "@/pages/note-detail-page";
import { MentorWorkspacePage } from "@/pages/mentor-workspace-page";
import { MentorPreviewPage } from "@/pages/mentor-preview-page";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/onboarding" element={<OnboardingPage />} />
      <Route path="/access-key" element={<AccessKeyPage />} />
      <Route path="/login" element={<LoginPage />} />

      <Route path="/demo/onboarding" element={<Navigate to="/onboarding" replace />} />
      <Route path="/demo/access-key" element={<Navigate to="/access-key" replace />} />
      <Route path="/demo/login" element={<Navigate to="/login" replace />} />

      <Route path="/app" element={<AppResolverPage />} />
      <Route element={<AppLayout />}>
        <Route path="/app/home" element={<HomePage />} />
        <Route path="/app/study-circle/intro" element={<StudyCircleIntroPage />} />
        <Route path="/app/study-circle/recommended" element={<RecommendedCirclePage />} />
        <Route path="/app/study-circle/joined" element={<JoinedCirclePage />} />
        <Route path="/app/study-circle/:circleId/roadmap" element={<RoadmapPage />} />
        <Route path="/app/study-circle/:circleId/activity/:checkpointId" element={<ActivityPage />} />
        <Route path="/app/study-circle/:circleId/leaderboard" element={<LeaderboardPage />} />
        <Route path="/app/study-circle/:circleId/store" element={<CircleStorePage />} />
        <Route path="/app/study-circle/:circleId/store/new" element={<NewNotePage />} />
        <Route path="/app/study-circle/:circleId/store/:noteId" element={<NoteDetailPage />} />
        <Route path="/app/study-circle/:circleId/mentor" element={<MentorWorkspacePage />} />
        <Route path="/app/study-circle/:circleId/mentor/preview" element={<MentorPreviewPage />} />
        <Route path="/app/study-circle/:circleId" element={<CircleHomePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
