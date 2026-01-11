import { Routes, Route } from "react-router-dom";
import Calendar from "./components/Calendar";
import Journal from "./components/Journal";
import LandingPage from "./components/LandingPage";
import Insights from "./components/Insights";

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/calendar" element={<Calendar />} />
      <Route path="/journal" element={<Journal />} />
      <Route path="/insights" element={<Insights />} />
    </Routes>
  );
}

export default App;
