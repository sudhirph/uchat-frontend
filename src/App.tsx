import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ChatPage } from "./pages/Chat";
import { InvitePage } from "./pages/InvitePage";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/Login";

function App() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/invite/:token" element={<InvitePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;
