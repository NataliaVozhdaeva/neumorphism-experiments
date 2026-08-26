import { BrowserRouter, Routes, Route } from "react-router"
import Home from "./pages/home"
import Requests from "./pages/requests"
import Help from "./pages/help"
import Profile from "./pages/profile"

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/requests" element={<Requests />} />
        <Route path="/help" element={<Help />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App