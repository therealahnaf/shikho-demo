import { Navigate, Route, Routes } from "react-router-dom";

import { AccessKeyPage } from "@/pages/access-key-page";
import { AppResolverPage } from "@/pages/app-resolver-page";
import { CircleHomePage } from "@/pages/circle-home-page";
import { HomePage } from "@/pages/home-page";
import { JoinedCirclePage } from "@/pages/joined-circle-page";
import { LandingPage } from "@/pages/landing-page";
import { LoginPage } from "@/pages/login-page";
import { OnboardingPage } from "@/pages/onboarding-page";
import { RecommendedCirclePage } from "@/pages/recommended-circle-page";
import { StudyCircleIntroPage } from "@/pages/study-circle-intro-page";

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
      <Route path="/app/home" element={<HomePage />} />
      <Route path="/app/study-circle/intro" element={<StudyCircleIntroPage />} />
      <Route path="/app/study-circle/recommended" element={<RecommendedCirclePage />} />
      <Route path="/app/study-circle/joined" element={<JoinedCirclePage />} />
      <Route path="/app/study-circle/:circleId" element={<CircleHomePage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

