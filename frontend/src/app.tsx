import { Navigate, Route, Routes } from "react-router-dom";

import { AccessKeyPage } from "@/pages/access-key-page";
import { AppPage } from "@/pages/app-page";
import { LandingPage } from "@/pages/landing-page";
import { LoginPage } from "@/pages/login-page";
import { OnboardingPage } from "@/pages/onboarding-page";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/demo/onboarding" element={<OnboardingPage />} />
      <Route path="/demo/access-key" element={<AccessKeyPage />} />
      <Route path="/demo/login" element={<LoginPage />} />
      <Route path="/app" element={<AppPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

