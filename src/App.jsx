import { BrowserRouter, Routes, Route } from 'react-router';
import { AuthProvider } from './context/authContext';
import Home from './pages/home';
import Requests from './pages/requests';
import Help from './pages/help';
import Profile from './pages/profile';
import PublicProfile from './pages/publicProfile';
import Templates from './pages/templates';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/requests' element={<Requests />} />
          <Route path='/help' element={<Help />} />
          <Route path='/profile' element={<Profile />} />
          <Route path='/profile/:id' element={<PublicProfile />} />
          <Route path='/templates' element={<Templates />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
